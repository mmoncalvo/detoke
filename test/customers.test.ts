import bcrypt from 'bcryptjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initDb } from '../server/db.js';
import { signToken } from '../server/middleware/requireAuth.js';
import { Business, Order, Product, User } from '../server/models/index.js';
import { app, auth, createCategories, register, request } from './helpers.js';

let categories: Awaited<ReturnType<typeof createCategories>>;
let shop: Awaited<ReturnType<typeof register>>;
let pizza: Product;
let adminToken: string;

const orderBody = () => ({ businessId: shop.business.id, items: [{ productId: pizza.id, quantity: 1 }], fulfillment: 'pickup', paymentMethod: 'cash', customerName: 'Cliente' });
const customer = async (email: string) => {
  const res = await request(app).post('/api/auth/register/customer').send({ name: 'Clara Cliente', email, password: 'secreta123', phone: '099 111 222' });
  expect(res.status).toBe(201);
  return res.body.data as { token: string; user: { id: string; role: string; phone: string }; business: null };
};

beforeAll(async () => {
  await initDb({ reset: true });
  categories = await createCategories();
  shop = await register(categories.pizzas.id, 'Pizzería Clientes');
  await Business.update({ deliveryOptions: ['pickup'], paymentMethods: ['cash'] }, { where: { id: shop.business.id } });
  pizza = await Product.create({ businessId: shop.business.id, name: 'Muzza', slug: 'muzza-clientes', price: 500 });
  const admin = await User.create({ email: 'admin-clientes@detoke.test', name: 'Admin', passwordHash: await bcrypt.hash('secreta123', 4), role: 'admin' });
  adminToken = signToken(admin);
});

describe('customer accounts', () => {
  it('registers a customer without a business, who cannot use the seller panel', async () => {
    const c = await customer('clara@detoke.test');
    expect(c.user).toMatchObject({ role: 'customer', phone: '099 111 222' });
    expect(c.business).toBeNull();
    expect((await request(app).post('/api/auth/register/customer').send({ name: 'Otra', email: 'clara@detoke.test', password: 'secreta123' })).status).toBe(409);
    expect((await request(app).get('/api/orders/mine').set(auth(c.token))).status).toBe(403);
    expect((await request(app).get('/api/products/mine').set(auth(c.token))).status).toBe(403);
    expect((await request(app).get('/api/admin/users').set(auth(c.token))).status).toBe(403);
  });

  it('keeps orders placed while signed in and claims the ones made before, but not someone else\'s', async () => {
    const c = await customer('compras@detoke.test');
    const signedIn = await request(app).post('/api/orders').set(auth(c.token)).send(orderBody());
    const anonymous = await request(app).post('/api/orders').send(orderBody());
    const other = await customer('otra@detoke.test');
    const othersOrder = await request(app).post('/api/orders').set(auth(other.token)).send(orderBody());

    const claim = await request(app).post('/api/orders/claim').set(auth(c.token)).send({ codes: [anonymous.body.data.order.publicCode, othersOrder.body.data.order.publicCode] });
    expect(claim.body.data.claimed).toBe(1);
    const mine = await request(app).get('/api/orders/customer').set(auth(c.token));
    expect(mine.body.data.map((o: { publicCode: string }) => o.publicCode).sort()).toEqual([signedIn.body.data.order.publicCode, anonymous.body.data.order.publicCode].sort());
    expect(mine.body.data[0].business.name).toBe('Pizzería Clientes');
    expect((await Order.findOne({ where: { publicCode: othersOrder.body.data.order.publicCode } }))?.customerUserId).toBe(other.user.id);
  });

  it('saves the cart and returns it with today\'s products, leaving out unavailable ones', async () => {
    const c = await customer('carrito@detoke.test');
    const hidden = await Product.create({ businessId: shop.business.id, name: 'Oculta', slug: 'oculta-clientes', price: 100, isAvailable: false });
    const put = await request(app).put('/api/auth/me/cart').set(auth(c.token)).send({ items: [{ productId: pizza.id, quantity: 2 }, { productId: pizza.id, quantity: 1 }, { productId: hidden.id, quantity: 1 }] });
    expect(put.status).toBe(200);
    const cart = await request(app).get('/api/auth/me/cart').set(auth(c.token));
    expect(cart.body.data).toHaveLength(1);
    expect(cart.body.data[0]).toMatchObject({ quantity: 3, product: { id: pizza.id, business: { id: shop.business.id } } });
    expect((await request(app).put('/api/auth/me/cart').set(auth(c.token)).send({ items: [{ productId: pizza.id, quantity: 0 }] })).status).toBe(400);
  });

  it('saves the delivery address in the profile', async () => {
    const c = await customer('direccion@detoke.test');
    const res = await request(app).patch('/api/auth/me').set(auth(c.token)).send({ name: 'Clara', email: 'direccion@detoke.test', phone: '099 111 222', address: 'Bulevar Artigas 1200' });
    expect(res.body.data.address).toBe('Bulevar Artigas 1200');
  });

  it('a business owner is also a customer, but cannot order from their own business', async () => {
    const own = await request(app).post('/api/orders').set(auth(shop.token)).send(orderBody());
    expect(own.status).toBe(400);
    expect(own.body.error).toBe('No podés hacerle un pedido a tu propio negocio');
    const other = await register(categories.bakery.id, 'Panadería Compradora');
    const bought = await request(app).post('/api/orders').set(auth(other.token)).send(orderBody());
    expect(bought.status).toBe(201);
    expect((await request(app).get('/api/orders/customer').set(auth(other.token))).body.data).toHaveLength(1);
  });

  it('a customer who adds a business becomes a seller and keeps their orders', async () => {
    const c = await customer('nuevo-negocio@detoke.test');
    await request(app).post('/api/orders').set(auth(c.token)).send(orderBody());
    const created = await request(app).post('/api/businesses/me').set(auth(c.token)).send({ name: 'Nuevo Negocio', businessCategoryId: categories.bakery.id, whatsapp: '+598 99 123 456' });
    expect(created.status).toBe(201);
    expect((await User.findByPk(c.user.id))?.role).toBe('seller');
    expect((await request(app).get('/api/orders/customer').set(auth(c.token))).body.data).toHaveLength(1);
  });

  it('an admin can disable a customer account: it can no longer sign in or order', async () => {
    const c = await customer('bloqueada@detoke.test');
    expect((await request(app).patch(`/api/admin/users/${c.user.id}/status`).set(auth(adminToken)).send({ disabled: true })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: 'bloqueada@detoke.test', password: 'secreta123' })).status).toBe(403);
    expect((await request(app).get('/api/auth/me').set(auth(c.token))).status).toBe(401);
    expect((await request(app).patch(`/api/admin/users/${c.user.id}/status`).set(auth(adminToken)).send({ disabled: false })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: 'bloqueada@detoke.test', password: 'secreta123' })).status).toBe(200);

    const listed = await request(app).get('/api/admin/users').query({ type: 'customer', limit: 100 }).set(auth(adminToken));
    expect(listed.body.data.items.every((a: { business: unknown }) => a.business === null)).toBe(true);
    expect((await request(app).delete(`/api/admin/users/${c.user.id}`).set(auth(adminToken))).status).toBe(200);
    expect(await User.count({ where: { id: c.user.id } })).toBe(0);
    expect((await request(app).delete(`/api/admin/users/${shop.user.id}`).set(auth(adminToken))).status).toBe(400);
  });
});
