import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { config } from '../server/config.js';
import { initDb } from '../server/db.js';
import { signToken } from '../server/middleware/requireAuth.js';
import { AdminAction, Business, Order, Product, User } from '../server/models/index.js';
import { app, auth, createCategories, register, request } from './helpers.js';

let categories: Awaited<ReturnType<typeof createCategories>>;
let adminToken: string;

beforeAll(async () => {
  await initDb({ reset: true });
  categories = await createCategories();
  const admin = await User.create({ email: 'admin-negocios@detoke.test', name: 'Admin', passwordHash: await bcrypt.hash('secreta123', 4), role: 'admin' });
  adminToken = signToken(admin);
});

/** A seller with an available product, ready to receive orders. */
async function shop(name: string) {
  const seller = await register(categories.pizzas.id, name);
  await Business.update({ deliveryOptions: ['pickup'], paymentMethods: ['cash'] }, { where: { id: seller.business.id } });
  const product = await Product.create({ businessId: seller.business.id, name: `Pizza ${name}`, slug: `pizza-${seller.business.slug}`, price: 500 });
  return { ...seller, product };
}

const order = (s: Awaited<ReturnType<typeof shop>>) => request(app).post('/api/orders').send({ businessId: s.business.id, items: [{ productId: s.product.id, quantity: 1 }], fulfillment: 'pickup', paymentMethod: 'cash', customerName: 'Cliente' });

describe('admin: disable and delete businesses', () => {
  it('disabling hides the business everywhere and refuses orders; enabling brings it back', async () => {
    const s = await shop('Pizzería Oculta');
    const disable = await request(app).patch(`/api/admin/businesses/${s.business.id}/status`).set(auth(adminToken)).send({ disabled: true, reason: 'Datos de contacto incorrectos' });
    expect(disable.status).toBe(200);
    expect(disable.body.data).toMatchObject({ isActive: false, disabledReason: 'Datos de contacto incorrectos' });

    const page = await request(app).get(`/api/businesses/${s.business.slug}`);
    expect(page.status).toBe(404);
    expect(page.body.error).toBe('Este negocio no está disponible por ahora');
    expect((await request(app).get('/api/businesses')).body.data.some((b: { id: string }) => b.id === s.business.id)).toBe(false);
    expect((await request(app).get('/api/products').query({ businessId: s.business.id })).body.data).toHaveLength(0);
    const search = await request(app).get('/api/search').query({ q: 'oculta' });
    expect(JSON.stringify(search.body.data)).not.toContain('Pizzería Oculta');
    const refused = await order(s);
    expect(refused.status).toBe(409);
    expect(refused.body.error).toMatch(/no está disponible/);

    // The owner still signs in and sees why.
    const me = await request(app).get('/api/auth/me').set(auth(s.token));
    expect(me.body.data.business).toMatchObject({ isActive: false, disabledReason: 'Datos de contacto incorrectos' });

    const enable = await request(app).patch(`/api/admin/businesses/${s.business.id}/status`).set(auth(adminToken)).send({ disabled: false });
    expect(enable.body.data).toMatchObject({ isActive: true, disabledReason: null });
    expect((await request(app).get(`/api/businesses/${s.business.slug}`)).status).toBe(200);
    expect((await order(s)).status).toBe(201);
    expect(await AdminAction.count({ where: { targetBusinessId: s.business.id } })).toBe(2);
  });

  it('deleting removes the account, business, products, orders and uploaded images', async () => {
    const s = await shop('Pizzería Borrada');
    expect((await order(s)).status).toBe(201);
    const png = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#2f6b4f' } }).png().toBuffer();
    const logo = await request(app).post('/api/businesses/me/logo').set(auth(s.token)).attach('image', png, { filename: 'logo.png', contentType: 'image/png' });
    const file = path.join(config.uploadsDir, path.basename(logo.body.data.logo));
    expect(fs.existsSync(file)).toBe(true);

    const res = await request(app).delete(`/api/admin/businesses/${s.business.id}`).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(await User.count({ where: { id: s.user.id } })).toBe(0);
    expect(await Business.count({ where: { id: s.business.id } })).toBe(0);
    expect(await Product.count({ where: { businessId: s.business.id } })).toBe(0);
    expect(await Order.count({ where: { businessId: s.business.id } })).toBe(0);
    expect(fs.existsSync(file)).toBe(false);
    expect(await AdminAction.count({ where: { targetBusinessId: s.business.id, action: 'business.delete' } })).toBe(1);
    expect((await request(app).post('/api/auth/login').send({ email: s.user.email, password: 'secreta123' })).status).toBe(401);
  });

  it('only admins can do it, and never on an admin account', async () => {
    const s = await shop('Pizzería Protegida');
    expect((await request(app).patch(`/api/admin/businesses/${s.business.id}/status`).set(auth(s.token)).send({ disabled: true })).status).toBe(403);
    expect((await request(app).delete(`/api/admin/businesses/${s.business.id}`).set(auth(s.token))).status).toBe(403);
    expect((await request(app).delete(`/api/admin/businesses/${s.business.id}`)).status).toBe(401);
    expect((await request(app).patch('/api/admin/businesses/noexiste/status').set(auth(adminToken)).send({ disabled: true })).status).toBe(404);

    const otherAdmin = await User.create({ email: 'otra-admin-negocios@detoke.test', name: 'Otra', passwordHash: 'x', role: 'admin' });
    const adminShop = await Business.create({ name: 'Negocio de admin', slug: 'negocio-de-admin', ownerId: otherAdmin.id, businessCategoryId: categories.pizzas.id, whatsapp: '59899000000' });
    expect((await request(app).patch(`/api/admin/businesses/${adminShop.id}/status`).set(auth(adminToken)).send({ disabled: true })).status).toBe(400);
    expect((await request(app).delete(`/api/admin/businesses/${adminShop.id}`).set(auth(adminToken))).status).toBe(400);
  });
});
