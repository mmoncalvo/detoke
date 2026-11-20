import { beforeAll, describe, expect, it } from 'vitest';
import { afterOpenHours, emptyHours, type BusinessHours } from '../shared/business.js';
import type { Order, OrderView } from '../shared/orders.js';
import { initDb } from '../server/db.js';
import { Business, Order as OrderModel, Product } from '../server/models/index.js';
import { app, auth, createCategories, register, request } from './helpers.js';

// Montevideo is UTC-3 all year: 09:00 local is 12:00Z.
const weekdays = (from: string, to: string): BusinessHours => {
  const hours = emptyHours();
  for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const) hours[day] = { open: true, ranges: [{ from, to }] };
  return hours;
};

describe('afterOpenHours', () => {
  it('runs straight through without a schedule', () => {
    expect(afterOpenHours(emptyHours(), new Date('2026-11-20T15:00:00Z'), 24).toISOString()).toBe('2026-11-21T15:00:00.000Z');
    expect(afterOpenHours(null, new Date('2026-11-20T15:00:00Z'), 24).toISOString()).toBe('2026-11-21T15:00:00.000Z');
  });

  it('counts only the time the business is open', () => {
    // Monday 10:00 local, open 9 to 17 on weekdays (8 h a day): 7 h Monday, 8 Tuesday, 8 Wednesday, 1 Thursday.
    expect(afterOpenHours(weekdays('09:00', '17:00'), new Date('2026-11-16T13:00:00Z'), 24).toISOString()).toBe('2026-11-19T13:00:00.000Z');
  });

  it('starts counting at opening time when the order arrives while closed, and skips the weekend', () => {
    // Friday 20:00 local: Monday, Tuesday and Wednesday at 9 to 17 add up to 24 h.
    expect(afterOpenHours(weekdays('09:00', '17:00'), new Date('2026-11-20T23:00:00Z'), 24).toISOString()).toBe('2026-11-25T20:00:00.000Z');
  });

  it('handles ranges that close after midnight and split days', () => {
    const hours = emptyHours();
    hours.saturday = { open: true, ranges: [{ from: '12:00', to: '15:00' }, { from: '20:00', to: '02:00' }] };
    // Saturday 2026-11-21 11:00 local: 3 + 6 = 9 h each Saturday, so 24 h end the third Saturday after 6 h: 20:00 + 3 h = 23:00.
    expect(afterOpenHours(hours, new Date('2026-11-21T14:00:00Z'), 24).toISOString()).toBe('2026-12-06T02:00:00.000Z');
  });
});

describe('customer cancel', () => {
  let seller: Awaited<ReturnType<typeof register>>;
  let buyerToken: string;
  let productId: string;

  const placeOrder = async (token?: string) => {
    const req = request(app).post('/api/orders');
    if (token) req.set(auth(token));
    const res = await req.send({ businessId: seller.business.id, items: [{ productId, quantity: 1 }], fulfillment: 'pickup', paymentMethod: 'cash', customerName: 'Clara', customerPhone: '099 111 222' });
    expect(res.status).toBe(201);
    return res.body.data.order as Order;
  };
  const age = (code: string, hours: number) => OrderModel.update({ createdAt: new Date(Date.now() - hours * 3_600_000) }, { where: { publicCode: code }, silent: true });

  beforeAll(async () => {
    await initDb({ reset: true });
    const categories = await createCategories();
    seller = await register(categories.pizzas.id, 'Pizzería Lenta');
    await Business.update({ deliveryOptions: ['pickup'], paymentMethods: ['cash'], hours: emptyHours() }, { where: { id: seller.business.id } });
    productId = (await Product.create({ businessId: seller.business.id, name: 'Muzzarella', slug: 'muzza-cancel', price: 500 })).id;
    const res = await request(app).post('/api/auth/register/customer').send({ name: 'Clara Cliente', email: 'clara-cancel@detoke.test', password: 'secreta123' });
    buyerToken = res.body.data.token;
  });

  it('tells only the buyer from when they can cancel', async () => {
    const order = await placeOrder(buyerToken);
    const mine = (await request(app).get(`/api/orders/public/${order.publicCode}`).set(auth(buyerToken))).body.data as OrderView;
    expect(Date.parse(mine.customerCancelFrom!) - Date.parse(order.createdAt)).toBe(24 * 3_600_000);
    expect((mine.business as unknown as Record<string, unknown>).hours).toBeUndefined();
    const anonymous = (await request(app).get(`/api/orders/public/${order.publicCode}`)).body.data as OrderView;
    expect(anonymous.customerCancelFrom).toBeNull();
    const owner = (await request(app).get(`/api/orders/public/${order.publicCode}`).set(auth(seller.token))).body.data as OrderView;
    expect(owner.customerCancelFrom).toBeNull();
  });

  it('refuses before the business had its 24 hours', async () => {
    const order = await placeOrder(buyerToken);
    await age(order.publicCode, 23);
    const res = await request(app).post(`/api/orders/customer/${order.publicCode}/cancel`).set(auth(buyerToken));
    expect(res.status).toBe(409);
  });

  it('cancels an unconfirmed order after 24 hours', async () => {
    const order = await placeOrder(buyerToken);
    await age(order.publicCode, 25);
    const res = await request(app).post(`/api/orders/customer/${order.publicCode}/cancel`).set(auth(buyerToken));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', by: 'customer' });
    expect((await request(app).post(`/api/orders/customer/${order.publicCode}/cancel`).set(auth(buyerToken))).status).toBe(409);
  });

  it('counts the business schedule, not the clock', async () => {
    // Open one hour every day: 25 hours after the order the business was open for about one of them.
    const hours = emptyHours();
    for (const day of Object.keys(hours) as (keyof BusinessHours)[]) hours[day] = { open: true, ranges: [{ from: '10:00', to: '11:00' }] };
    await Business.update({ hours }, { where: { id: seller.business.id } });
    const order = await placeOrder(buyerToken);
    await age(order.publicCode, 25);
    expect((await request(app).post(`/api/orders/customer/${order.publicCode}/cancel`).set(auth(buyerToken))).status).toBe(409);
    await Business.update({ hours: emptyHours() }, { where: { id: seller.business.id } });
  });

  it('does not cancel confirmed orders, guest orders or orders of someone else', async () => {
    const confirmed = await placeOrder(buyerToken);
    await request(app).patch(`/api/orders/${confirmed.publicCode}/status`).set(auth(seller.token)).send({ status: 'confirmed' });
    await age(confirmed.publicCode, 30);
    expect((await request(app).post(`/api/orders/customer/${confirmed.publicCode}/cancel`).set(auth(buyerToken))).status).toBe(409);

    const guest = await placeOrder();
    await age(guest.publicCode, 30);
    expect((await request(app).post(`/api/orders/customer/${guest.publicCode}/cancel`).set(auth(buyerToken))).status).toBe(404);

    const other = await placeOrder(buyerToken);
    await age(other.publicCode, 30);
    expect((await request(app).post(`/api/orders/customer/${other.publicCode}/cancel`).set(auth(seller.token))).status).toBe(404);
    expect((await request(app).post(`/api/orders/customer/${other.publicCode}/cancel`)).status).toBe(401);
  });
});
