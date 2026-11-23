import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => [] as { endpoint: string; payload: { title: string; body: string; url: string; tag: string } }[]);
vi.mock('web-push', async (original) => {
  const real = (await original()) as { default: Record<string, unknown> };
  return {
    default: {
      ...real.default,
      sendNotification: vi.fn(async (sub: { endpoint: string }, body: string) => {
        if (sub.endpoint.includes('gone')) throw Object.assign(new Error('gone'), { statusCode: 410 });
        if (sub.endpoint.includes('oldkey')) throw Object.assign(new Error('key mismatch'), { statusCode: 403 });
        sent.push({ endpoint: sub.endpoint, payload: JSON.parse(body) });
      }),
    },
  };
});

import { initDb } from '../server/db.js';
import { signToken } from '../server/middleware/requireAuth.js';
import { Business, Product, PushSubscription, User } from '../server/models/index.js';
import { flushPush } from '../server/services/push.js';
import { app, auth, createCategories, register, request } from './helpers.js';

let shop: Awaited<ReturnType<typeof register>>;
let pizza: Product;

const subscription = (name: string) => ({ endpoint: `https://push.example.com/${name}`, keys: { p256dh: 'BPkey', auth: 'authkey' } });
const subscribe = (name: string, extra: { orderCode?: string; token?: string } = {}) => {
  const req = request(app).post('/api/push/subscribe');
  if (extra.token) req.set(auth(extra.token));
  return req.send({ subscription: subscription(name), orderCode: extra.orderCode });
};
const placeOrder = async (token?: string) => {
  const req = request(app).post('/api/orders');
  if (token) req.set(auth(token));
  const res = await req.send({ businessId: shop.business.id, items: [{ productId: pizza.id, quantity: 2 }], fulfillment: 'pickup', paymentMethod: 'cash', customerName: 'Juana' });
  expect(res.status).toBe(201);
  await flushPush();
  return res.body.data.order as { publicCode: string; number: number };
};
const setStatus = async (code: string, status: string, reason?: string) => {
  const res = await request(app).patch(`/api/orders/${code}/status`).set(auth(shop.token)).send({ status, reason });
  expect(res.status).toBe(200);
  await flushPush();
};

beforeAll(async () => {
  await initDb({ reset: true });
  const categories = await createCategories();
  shop = await register(categories.pizzas.id, 'Pizzería Push');
  await Business.update({ deliveryOptions: ['pickup'], paymentMethods: ['cash'] }, { where: { id: shop.business.id } });
  pizza = await Product.create({ businessId: shop.business.id, name: 'Muzza', slug: 'muzza-push', price: 500 });
});

beforeEach(() => {
  sent.length = 0;
});

describe('push notifications', () => {
  it('gives the public key, the same every time', async () => {
    const a = await request(app).get('/api/push/key');
    const b = await request(app).get('/api/push/key');
    expect(a.status).toBe(200);
    expect(a.body.data.publicKey).toMatch(/^[A-Za-z0-9_-]{80,}$/);
    expect(b.body.data.publicKey).toBe(a.body.data.publicKey);
  });

  it('tells the owner of the business about a new order', async () => {
    expect((await subscribe('owner', { token: shop.token })).status).toBe(200);
    const order = await placeOrder();
    expect(sent.map((s) => s.endpoint)).toEqual([subscription('owner').endpoint]);
    expect(sent[0].payload).toMatchObject({ title: `Nuevo pedido #${order.number}`, url: '/dashboard/orders' });
    expect(sent[0].payload.body).toMatch(/^Juana · \$\s1\.000$/);
  });

  it('tells a guest that follows the order about each status, never the owner', async () => {
    const order = await placeOrder();
    sent.length = 0;
    expect((await subscribe('guest', { orderCode: order.publicCode })).status).toBe(200);
    await setStatus(order.publicCode, 'confirmed');
    expect(sent.map((s) => s.endpoint)).toEqual([subscription('guest').endpoint]);
    expect(sent[0].payload).toMatchObject({ title: `Pedido #${order.number}: Confirmado`, url: `/pedido/${order.publicCode}` });
    await setStatus(order.publicCode, 'cancelled', 'Nos quedamos sin muzzarella');
    expect(sent[1].payload).toMatchObject({ title: `Pedido #${order.number}: Cancelado`, body: 'Pizzería Push: Nos quedamos sin muzzarella' });
    // One notification per change: each status has its own tag, so the second does not replace the first.
    expect(sent[1].payload.tag).not.toBe(sent[0].payload.tag);
  });

  it('tells a signed-in customer on their account browsers', async () => {
    const res = await request(app).post('/api/auth/register/customer').send({ name: 'Clara', email: 'clara-push@detoke.test', password: 'secreta123' });
    const token = res.body.data.token as string;
    await subscribe('clara', { token });
    const order = await placeOrder(token);
    await setStatus(order.publicCode, 'completed');
    expect(sent.map((s) => s.endpoint)).toEqual([subscription('owner').endpoint, subscription('clara').endpoint]);
  });

  it('rejects unknown orders and keeps impersonation and admin sessions out of accounts', async () => {
    expect((await subscribe('nobody', { orderCode: 'NOEXISTE1' })).status).toBe(404);
    const admin = await User.create({ name: 'Admin', email: 'admin-push@detoke.test', role: 'admin' });
    await subscribe('admin', { token: signToken(admin) });
    const owner = await User.findByPk(shop.user.id);
    await subscribe('impersonating', { token: signToken(owner!, { actorId: admin.id, logId: 'log' }) });
    expect((await PushSubscription.findOne({ where: { endpoint: subscription('admin').endpoint } }))!.userId).toBeNull();
    expect((await PushSubscription.findOne({ where: { endpoint: subscription('impersonating').endpoint } }))!.userId).toBeNull();
  });

  it('keeps the notifications preference in the account, never changed by impersonation', async () => {
    const owner = await User.findByPk(shop.user.id);
    expect(owner!.notifications).toBeNull();
    const res = await request(app).put('/api/auth/me/notifications').set(auth(shop.token)).send({ enabled: true });
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toBe(true);
    expect((await User.findByPk(shop.user.id))!.notifications).toBe(true);
    const admin = await User.findOne({ where: { email: 'admin-push@detoke.test' } });
    const impersonating = signToken(owner!, { actorId: admin!.id, logId: 'log' });
    expect((await request(app).put('/api/auth/me/notifications').set(auth(impersonating)).send({ enabled: false })).status).not.toBe(200);
    expect((await User.findByPk(shop.user.id))!.notifications).toBe(true);
    expect((await request(app).put('/api/auth/me/notifications').set(auth(shop.token)).send({ enabled: 'si' })).status).toBe(400);
  });

  it('forgets a browser on unsubscribe and when the push service says it is gone', async () => {
    await subscribe('gone', { token: shop.token });
    await placeOrder();
    expect(await PushSubscription.count({ where: { endpoint: subscription('gone').endpoint } })).toBe(0);
    expect((await request(app).post('/api/push/unsubscribe').send({ endpoint: subscription('owner').endpoint })).status).toBe(200);
    sent.length = 0;
    await placeOrder();
    expect(sent).toEqual([]);
  });

  it('drops subscriptions made with another key, and moves a renewed one with its account and orders', async () => {
    await subscribe('oldkey', { token: shop.token });
    await subscribe('owner-again', { token: shop.token });
    await placeOrder();
    expect(await PushSubscription.count({ where: { endpoint: subscription('oldkey').endpoint } })).toBe(0);
    expect(sent.map((s) => s.endpoint)).toEqual([subscription('owner-again').endpoint]);

    // The service worker renews it without a session: the account and the followed orders move over.
    const order = await placeOrder();
    await subscribe('follower', { orderCode: order.publicCode });
    const renewed = await request(app).post('/api/push/subscribe').send({ subscription: subscription('owner-renewed'), previousEndpoint: subscription('owner-again').endpoint });
    expect(renewed.status).toBe(200);
    const moved = await PushSubscription.findOne({ where: { endpoint: subscription('owner-renewed').endpoint } });
    expect(moved!.userId).toBe(shop.user.id);
    expect(await PushSubscription.count({ where: { endpoint: subscription('owner-again').endpoint } })).toBe(0);
    await request(app).post('/api/push/subscribe').send({ subscription: subscription('follower-renewed'), previousEndpoint: subscription('follower').endpoint });
    sent.length = 0;
    await setStatus(order.publicCode, 'confirmed');
    expect(sent.map((s) => s.endpoint)).toEqual([subscription('follower-renewed').endpoint]);
  });

  it('sends a test notification to one browser', async () => {
    sent.length = 0;
    const res = await request(app).post('/api/push/test').send({ endpoint: subscription('owner-renewed').endpoint });
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect((await request(app).post('/api/push/test').send({ endpoint: subscription('nobody-here').endpoint })).status).toBe(404);
    await subscribe('oldkey2');
    expect((await request(app).post('/api/push/test').send({ endpoint: subscription('oldkey2').endpoint })).status).toBe(502);
  });
});
