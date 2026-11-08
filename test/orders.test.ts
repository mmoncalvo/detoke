import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Order } from '../shared/orders.js';
import type { ClientToServerEvents, JoinResult, ServerToClientEvents } from '../shared/realtime.js';
import { initDb } from '../server/db.js';
import { Business, Product, User } from '../server/models/index.js';
import { signToken } from '../server/middleware/requireAuth.js';
import { closeRealtime, initRealtime } from '../server/services/realtime.js';
import { app, auth, createCategories, register, request } from './helpers.js';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let categories: Awaited<ReturnType<typeof createCategories>>;
let seller: Awaited<ReturnType<typeof register>>;
let pizza: Product;
let fugazza: Product;
let server: Server;
let url: string;

const orderBody = (extra: object = {}) => ({
  businessId: seller.business.id,
  items: [{ productId: pizza.id, quantity: 2 }, { productId: fugazza.id, quantity: 1 }],
  fulfillment: 'pickup',
  paymentMethod: 'cash',
  customerName: 'Juana Cliente',
  customerPhone: '11 5555 0000',
  ...extra,
});

const placeOrder = async (extra: object = {}) => {
  const res = await request(app).post('/api/orders').send(orderBody(extra));
  expect(res.status).toBe(201);
  return res.body.data as { order: Order; url: string };
};

const socket = (token?: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const client: ClientSocket = connect(url, { auth: token ? { token } : {}, transports: ['websocket'], forceNew: true });
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });

const join = (client: ClientSocket, event: 'business:join' | 'order:join', id: string) => new Promise<JoinResult>((resolve) => client.emit(event, id, resolve));
const next = <E extends keyof ServerToClientEvents>(client: ClientSocket, event: E) =>
  new Promise<Order>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event}`)), 2000);
    client.once(event, ((order: Order) => { clearTimeout(timer); resolve(order); }) as never);
  });

beforeAll(async () => {
  await initDb({ reset: true });
  categories = await createCategories();
  seller = await register(categories.pizzas.id, 'Pizzería Pedidos');
  await Business.update({ deliveryOptions: ['delivery', 'pickup'], paymentMethods: ['cash', 'transfer'], deliveryFee: 1500, minimumOrder: 20000 }, { where: { id: seller.business.id } });
  pizza = await Product.create({ businessId: seller.business.id, name: 'Pizza', slug: 'pizza-pedidos', price: 10000 });
  fugazza = await Product.create({ businessId: seller.business.id, name: 'Fugazza', slug: 'fugazza-pedidos', price: 8000, stock: 3 });

  server = createServer(app);
  initRealtime(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await closeRealtime();
  await new Promise((resolve) => server.close(resolve));
});

describe('orders', () => {
  it('creates an order with prices from the database and a public link', async () => {
    const res = await request(app).post('/api/orders').send({ ...orderBody(), items: [{ productId: pizza.id, quantity: 2, price: 1 }] });
    expect(res.status).toBe(201);
    const { order, url: link } = res.body.data;
    expect(order).toMatchObject({ subtotal: 20000, deliveryFee: 0, total: 20000, status: 'pending', number: 1, customerName: 'Juana Cliente' });
    expect(order.items[0]).toMatchObject({ name: 'Pizza', unitPrice: 10000, quantity: 2, subtotal: 20000 });
    expect(order.publicCode).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(link).toMatch(new RegExp(`/pedido/${order.publicCode}$`));
    expect(order.statusHistory).toHaveLength(1);

    const second = await placeOrder();
    expect(second.order.number).toBe(2);
    expect(second.order.publicCode).not.toBe(order.publicCode);
  });

  it('applies delivery fee, minimum order, stock and the business rules', async () => {
    const delivery = await placeOrder({ fulfillment: 'delivery', deliveryAddress: 'Gorriti 4500' });
    expect(delivery.order).toMatchObject({ deliveryFee: 1500, total: 29500, deliveryAddress: 'Gorriti 4500' });

    const send = (extra: object) => request(app).post('/api/orders').send(orderBody(extra));
    expect((await send({ fulfillment: 'delivery', deliveryAddress: 'X', items: [{ productId: fugazza.id, quantity: 1 }] })).body.error).toBe('El pedido mínimo para delivery es $ 20.000');
    expect((await send({ fulfillment: 'delivery' })).body.error).toBe('Completá la dirección de entrega');
    expect((await send({ items: [{ productId: fugazza.id, quantity: 5 }] })).body.error).toBe('De "Fugazza" quedan 3');
    expect((await send({ paymentMethod: 'mercadopago' })).body.error).toBe('Este negocio no acepta ese medio de pago');

    const other = await register(categories.pizzas.id, 'Otra Pizzería');
    const foreign = await Product.create({ businessId: other.business.id, name: 'Ajena', slug: 'ajena-pedidos', price: 1 });
    expect((await send({ items: [{ productId: foreign.id, quantity: 1 }] })).body.error).toBe('Algún producto ya no está en el catálogo de este negocio');

    await pizza.update({ isAvailable: false });
    expect((await send({})).body.error).toBe('"Pizza" ya no está disponible');
    await pizza.update({ isAvailable: true });
  });

  it('shows the order publicly and lets only the owner or an admin manage it', async () => {
    const { order } = await placeOrder();
    const anonymous = await request(app).get(`/api/orders/public/${order.publicCode}`);
    expect(anonymous.body.data.canManage).toBe(false);
    expect(anonymous.body.data.business.name).toBe('Pizzería Pedidos');
    expect(anonymous.body.data.business).not.toHaveProperty('ownerId');
    expect((await request(app).get(`/api/orders/public/${order.publicCode}`).set(auth(seller.token))).body.data.canManage).toBe(true);
    expect((await request(app).get('/api/orders/public/noexiste')).status).toBe(404);

    const stranger = await register(categories.bakery.id);
    expect((await request(app).patch(`/api/orders/${order.publicCode}/status`).set(auth(stranger.token)).send({ status: 'confirmed' })).status).toBe(403);
    expect((await request(app).patch(`/api/orders/${order.publicCode}/status`).send({ status: 'confirmed' })).status).toBe(401);

    const admin = await User.create({ email: 'admin-pedidos@detoke.test', name: 'Admin', passwordHash: 'x', role: 'admin' });
    const byAdmin = await request(app).patch(`/api/orders/${order.publicCode}/status`).set(auth(signToken(admin))).send({ status: 'confirmed' });
    expect(byAdmin.body.data.statusHistory.at(-1)).toMatchObject({ status: 'confirmed', by: 'admin' });
  });

  it('follows the state machine', async () => {
    const { order } = await placeOrder();
    const move = (status: string, reason?: string) => request(app).patch(`/api/orders/${order.publicCode}/status`).set(auth(seller.token)).send({ status, reason });

    expect((await move('pending')).status).toBe(409);
    expect((await move('preparing')).body.error).toBe('Estado inválido');
    expect((await move('confirmed')).status).toBe(200);
    expect((await move('confirmed')).status).toBe(409);
    const done = await move('completed');
    expect(done.body.data.status).toBe('completed');
    expect(done.body.data.statusHistory.map((h: { status: string }) => h.status)).toEqual(['pending', 'confirmed', 'completed']);
    expect((await move('cancelled')).status).toBe(409);

    const pickedUp = await placeOrder();
    const direct = await request(app).patch(`/api/orders/${pickedUp.order.publicCode}/status`).set(auth(seller.token)).send({ status: 'completed' });
    expect(direct.body.data.status).toBe('completed');

    const another = await placeOrder();
    const cancelled = await request(app).patch(`/api/orders/${another.order.publicCode}/status`).set(auth(seller.token)).send({ status: 'cancelled', reason: 'Sin muzzarella' });
    expect(cancelled.body.data.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', reason: 'Sin muzzarella', by: 'business' });
    const noReason = await placeOrder();
    expect((await request(app).patch(`/api/orders/${noReason.order.publicCode}/status`).set(auth(seller.token)).send({ status: 'cancelled' })).status).toBe(200);
  });

  it('lists the orders of my business with filters', async () => {
    const all = await request(app).get('/api/orders/mine').set(auth(seller.token));
    expect(all.body.data.length).toBeGreaterThan(5);
    const pending = await request(app).get('/api/orders/mine').query({ status: 'pending' }).set(auth(seller.token));
    expect(pending.body.data.every((o: Order) => o.status === 'pending')).toBe(true);
    const future = await request(app).get('/api/orders/mine').query({ since: new Date(Date.now() + 60_000).toISOString() }).set(auth(seller.token));
    expect(future.body.data).toHaveLength(0);
  });
});

describe('realtime', () => {
  it('sends new orders to the business room only to its owner', async () => {
    const owner = await socket(seller.token);
    const anonymous = await socket();
    const stranger = await socket((await register(categories.bakery.id)).token);

    expect(await join(owner, 'business:join', seller.business.id)).toEqual({ ok: true });
    expect((await join(anonymous, 'business:join', seller.business.id)).ok).toBe(false);
    expect((await join(stranger, 'business:join', seller.business.id)).ok).toBe(false);

    let leaked = false;
    stranger.on('order:created', () => (leaked = true));
    const created = next(owner, 'order:created');
    const { order } = await placeOrder();
    expect((await created).publicCode).toBe(order.publicCode);
    expect(leaked).toBe(false);

    [owner, anonymous, stranger].forEach((s) => s.disconnect());
  });

  it('sends status changes to everyone following the order', async () => {
    const { order } = await placeOrder();
    const customer = await socket();
    expect(await join(customer, 'order:join', order.publicCode)).toEqual({ ok: true });
    expect((await join(customer, 'order:join', 'noexiste')).ok).toBe(false);

    const updated = next(customer, 'order:updated');
    await request(app).patch(`/api/orders/${order.publicCode}/status`).set(auth(seller.token)).send({ status: 'confirmed' });
    expect((await updated).status).toBe('confirmed');
    customer.disconnect();
  });

  it('rejects a handshake with an invalid token', async () => {
    await expect(socket('token-invalido')).rejects.toThrow('Tu sesión venció');
  });
});
