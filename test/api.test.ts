import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import sharp from 'sharp';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { defaultHours, emptyHours, normalizeWhatsapp, openStatus, slugify } from '../shared/business.js';
import { initDb } from '../server/db.js';
import { rateLimit } from '../server/middleware/rateLimit.js';
import { requireOwnSession, signToken } from '../server/middleware/requireAuth.js';
import { AuditLog, Business, ContactMessage, ImpersonationLog, User } from '../server/models/index.js';
import { app, auth, createCategories, register, request } from './helpers.js';

let categories: Awaited<ReturnType<typeof createCategories>>;
const png = () => sharp({ create: { width: 40, height: 40, channels: 3, background: '#c33' } }).png().toBuffer();

const createProduct = async (token: string, name = 'Pizza grande', extra: object = {}) => {
  const res = await request(app).post('/api/products').set(auth(token)).send({ name, price: 14500, ...extra });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string; images: string[]; slug: string };
};

beforeAll(async () => {
  await initDb({ reset: true });
  categories = await createCategories();
});

describe('health', () => {
  it('uses the standard response format', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ success: true, data: { status: 'ok', db: 'connected' } });
  });

  it('returns 404 with a Spanish error for unknown routes', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'No encontrado' });
  });
});

describe('auth', () => {
  it('creates the user and the business, with a normalized whatsapp and a slug', async () => {
    const { token, user, business } = await register(categories.pizzas.id, 'Lo de Ñoño & Cía');
    expect(token).toBeTruthy();
    expect(user).not.toHaveProperty('passwordHash');
    expect(business.slug).toBe('lo-de-nono-cia');
    expect(business.whatsapp).toBe('5491123456789');
  });

  it('makes slugs unique', async () => {
    const first = await register(categories.pizzas.id, 'Pizza Hermanos');
    const second = await register(categories.pizzas.id, 'Pizza Hermanos');
    expect(first.business.slug).toBe('pizza-hermanos');
    expect(second.business.slug).toBe('pizza-hermanos-2');
  });

  it('logs in by email, ignoring case, and returns the business', async () => {
    const { user, business } = await register(categories.pizzas.id);
    const login = await request(app).post('/api/auth/login').send({ email: user.email.toUpperCase(), password: 'secreta123' });
    expect(login.status).toBe(200);
    expect(login.body.data.business.id).toBe(business.id);

    const me = await request(app).get('/api/auth/me').set(auth(login.body.data.token));
    expect(me.body.data.user.email).toBe(user.email);
    expect(me.body.data.user).not.toHaveProperty('passwordHash');
    expect(me.body.data.business.category.slug).toBe('pizzeria');
  });

  it('rejects bad credentials, repeated emails, invalid data and missing tokens', async () => {
    const { user } = await register(categories.pizzas.id);

    const bad = await request(app).post('/api/auth/login').send({ email: user.email, password: 'incorrecta' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('El email o la contraseña no son correctos');

    const repeated = await request(app).post('/api/auth/register').send({
      name: 'Otra', email: user.email, password: 'secreta123', business: { name: 'Otro', businessCategoryId: categories.pizzas.id, whatsapp: '1123456789' },
    });
    expect(repeated.status).toBe(409);

    const invalid = await request(app).post('/api/auth/register').send({
      name: 'Otra', email: 'no-es-email', password: 'corta', business: { name: 'Otro', businessCategoryId: categories.pizzas.id, whatsapp: '12' },
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Ingresá un email válido');

    const noCategory = await request(app).post('/api/auth/register').send({
      name: 'Otra', email: 'otra@detoke.test', password: 'secreta123', business: { name: 'Otro', businessCategoryId: 'nada', whatsapp: '1123456789' },
    });
    expect(noCategory.status).toBe(400);

    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth('malo'))).status).toBe(401);
  });
});

describe('my business', () => {
  it('updates sections and validates them', async () => {
    const { token } = await register(categories.pizzas.id);

    const ok = await request(app).put('/api/businesses/me').set(auth(token)).send({
      tagline: 'La mejor', website: 'detoke.test', instagram: '@lamejor', deliveryOptions: ['delivery'], paymentMethods: ['cash', 'mercadopago'], deliveryFee: '1500', hours: defaultHours(),
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data.website).toBe('https://detoke.test');
    expect(ok.body.data.instagram).toBe('lamejor');
    expect(ok.body.data.deliveryFee).toBe(1500);

    const noPayment = await request(app).put('/api/businesses/me').set(auth(token)).send({ paymentMethods: [] });
    expect(noPayment.body.error).toBe('Elegí al menos un medio de pago');

    const hours = { ...defaultHours(), monday: { open: true, ranges: [] } };
    expect((await request(app).put('/api/businesses/me').set(auth(token)).send({ hours })).status).toBe(400);

    expect((await request(app).put('/api/businesses/me').send({ tagline: 'x' })).status).toBe(401);
  });

  it('accepts images, resizes them and rejects anything else', async () => {
    const { token } = await register(categories.pizzas.id);

    const logo = await request(app).post('/api/businesses/me/logo').set(auth(token)).attach('image', await png(), 'logo.png');
    expect(logo.status).toBe(200);
    expect(logo.body.data.logo).toMatch(/^\/data\/uploads\/logo-.*\.webp$/);

    const gallery = await request(app).post('/api/businesses/me/gallery').set(auth(token)).attach('images', await png(), 'a.png');
    expect(gallery.body.data.gallery).toHaveLength(1);
    const removed = await request(app).delete('/api/businesses/me/gallery').set(auth(token)).send({ image: gallery.body.data.gallery[0] });
    expect(removed.body.data.gallery).toHaveLength(0);

    const text = await request(app).post('/api/businesses/me/logo').set(auth(token)).attach('image', Buffer.from('hola'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(text.status).toBe(400);
    expect(text.body.error).toBe('Solo se aceptan imágenes JPG, PNG o WEBP');

    const fake = await request(app).post('/api/businesses/me/logo').set(auth(token)).attach('image', Buffer.from('hola'), { filename: 'a.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
    expect(fake.body.error).toBe('No pudimos leer la imagen, probá con otra');
  });
});

describe('products', () => {
  it('creates, edits and deletes an own product', async () => {
    const { token, business } = await register(categories.pizzas.id);
    const product = await createProduct(token, 'Pizza grande', { productCategoryId: categories.food.id, compareAtPrice: 16000 });
    expect(product.slug).toContain('pizza-grande');

    const edited = await request(app).put(`/api/products/${product.id}`).set(auth(token)).send({ name: 'Pizza familiar', isAvailable: false });
    expect(edited.status).toBe(200);
    expect(edited.body.data.name).toBe('Pizza familiar');

    const publicList = await request(app).get('/api/products').query({ businessId: business.id });
    expect(publicList.body.data).toHaveLength(0);
    const mine = await request(app).get('/api/products/mine').set(auth(token));
    expect(mine.body.data).toHaveLength(1);

    expect((await request(app).delete(`/api/products/${product.id}`).set(auth(token))).status).toBe(200);
    expect((await request(app).get(`/api/products/${product.id}`)).status).toBe(404);
  });

  it('keeps images when editing without sending them, and uploads new ones', async () => {
    const { token } = await register(categories.pizzas.id);
    const upload = await request(app).post('/api/products/images').set(auth(token)).attach('image', await png(), 'a.png');
    expect(upload.status).toBe(201);

    const product = await createProduct(token, 'Con foto', { images: [upload.body.data.path] });
    await request(app).put(`/api/products/${product.id}`).set(auth(token)).send({ name: 'Otro nombre' });

    const res = await request(app).get(`/api/products/${product.id}`);
    expect(res.body.data.images).toEqual([upload.body.data.path]);
  });

  it('returns 403 on another business product', async () => {
    const owner = await register(categories.pizzas.id);
    const other = await register(categories.pizzas.id);
    const product = await createProduct(owner.token);

    const edit = await request(app).put(`/api/products/${product.id}`).set(auth(other.token)).send({ name: 'Robado' });
    expect(edit.status).toBe(403);
    expect((await request(app).delete(`/api/products/${product.id}`).set(auth(other.token))).status).toBe(403);
    expect((await request(app).get(`/api/products/${product.id}`)).status).toBe(200);
  });

  it('validates price and category', async () => {
    const { token } = await register(categories.pizzas.id);
    const free = await request(app).post('/api/products').set(auth(token)).send({ name: 'Gratis', price: 0 });
    expect(free.body.error).toBe('El precio debe ser mayor a cero');
    expect((await request(app).post('/api/products').set(auth(token)).send({ name: 'Sin rubro', price: 10, productCategoryId: 'nada' })).status).toBe(400);
  });

  it('filters the public list by category and search, without accents', async () => {
    const { token, business } = await register(categories.pizzas.id);
    await createProduct(token, 'Fainá de la casa', { productCategoryId: categories.food.id });
    await createProduct(token, 'Empanada');

    const byCategory = await request(app).get('/api/products').query({ businessId: business.id, category: 'platos' });
    expect(byCategory.body.data).toHaveLength(1);
    expect(byCategory.body.data[0].business.slug).toBe(business.slug);

    const bySearch = await request(app).get('/api/products').query({ businessId: business.id, search: 'FAINA' });
    expect(bySearch.body.data).toHaveLength(1);
  });
});

describe('businesses', () => {
  let open: { business: { id: string; slug: string } };
  let closed: { business: { id: string; slug: string } };

  beforeAll(async () => {
    open = await register(categories.bakery.id, 'Panadería Siempre Abierta');
    closed = await register(categories.bakery.id, 'Panadería Cerrada');
    const always = Object.fromEntries(Object.keys(emptyHours()).map((day) => [day, { open: true, ranges: [{ from: '00:00', to: '23:59' }] }]));
    await Business.update({ hours: always, deliveryOptions: ['delivery', 'pickup'] }, { where: { id: open.business.id } });
    await createProduct((await register(categories.bakery.id, 'Con producto')).token, 'Bizcochos');
  });

  const slugs = (res: { body: { data: { slug: string }[] } }) => res.body.data.map((b) => b.slug);

  it('filters by category, search, open now and delivery', async () => {
    const byCategory = await request(app).get('/api/businesses').query({ category: 'panaderia' });
    expect(slugs(byCategory)).toEqual(expect.arrayContaining([open.business.slug, closed.business.slug]));
    expect(byCategory.body.data.every((b: { category: { slug: string } }) => b.category.slug === 'panaderia')).toBe(true);

    expect(slugs(await request(app).get('/api/businesses').query({ search: 'panaderia cerrada' }))).toEqual([closed.business.slug]);

    const openNow = slugs(await request(app).get('/api/businesses').query({ category: 'panaderia', open: 'true' }));
    expect(openNow).toContain(open.business.slug);
    expect(openNow).not.toContain(closed.business.slug);

    const delivery = slugs(await request(app).get('/api/businesses').query({ category: 'panaderia', delivery: 'true' }));
    expect(delivery).toEqual([open.business.slug]);
  });

  it('shows a business with its products and hides inactive ones', async () => {
    const { token, business } = await register(categories.pizzas.id, 'Con Carta');
    await createProduct(token, 'Fugazzeta');

    const res = await request(app).get(`/api/businesses/${business.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data).not.toHaveProperty('owner');

    await Business.update({ isActive: false }, { where: { id: business.id } });
    expect((await request(app).get(`/api/businesses/${business.slug}`)).status).toBe(404);
    expect(slugs(await request(app).get('/api/businesses'))).not.toContain(business.slug);
  });

  it('counts businesses per category', async () => {
    const res = await request(app).get('/api/business-categories');
    const bakery = res.body.data.find((c: { slug: string }) => c.slug === 'panaderia');
    expect(bakery.businessCount).toBeGreaterThanOrEqual(3);
  });
});

describe('search', () => {
  it('finds businesses, products and categories without accents', async () => {
    const { token } = await register(categories.bakery.id, 'Pan de Doña Rosa');
    await createProduct(token, 'Pan de campo');

    const res = await request(app).get('/api/search').query({ q: 'PANADERIA' });
    expect(res.body.data.map((r: { type: string }) => r.type)).toContain('category');

    const types = (await request(app).get('/api/search').query({ q: 'pan de' })).body.data.map((r: { type: string }) => r.type);
    expect(types).toEqual(expect.arrayContaining(['business', 'product']));
  });

  it('returns an empty list without a term', async () => {
    expect((await request(app).get('/api/search')).body).toEqual({ success: true, data: [] });
  });
});

describe('contact', () => {
  const message = { name: 'Ana', email: 'ANA@detoke.test', reason: 'general', message: 'Hola, quería hacer una consulta.', consent: true };

  it('publishes the contact channels', async () => {
    const res = await request(app).get('/api/contact/info');
    expect(res.body.data).toHaveProperty('email');
    expect(res.body.data).toHaveProperty('hours');
  });

  it('stores a valid message with its request data', async () => {
    const res = await request(app).post('/api/contact').set('User-Agent', 'prueba').send({ ...message, reason: 'join', businessName: 'Lo de Ana', phone: '11 2345 6789' });
    expect(res.status).toBe(201);
    const saved = await ContactMessage.findOne({ where: { email: 'ana@detoke.test' } });
    expect(saved).toMatchObject({ reason: 'join', businessName: 'Lo de Ana', status: 'new', userAgent: 'prueba' });
    expect(saved?.ip).toBeTruthy();
  });

  it('links the message to the session user', async () => {
    const { token, user } = await register(categories.pizzas.id);
    await request(app).post('/api/contact').set(auth(token)).send({ ...message, email: 'conlogin@detoke.test' });
    expect((await ContactMessage.findOne({ where: { email: 'conlogin@detoke.test' } }))?.userId).toBe(user.id);
  });

  it('validates the fields', async () => {
    const send = (extra: object) => request(app).post('/api/contact').send({ ...message, ...extra });
    expect((await send({ message: 'Hola' })).body.error).toBe('Contanos un poco más, al menos 10 caracteres');
    expect((await send({ reason: 'nada' })).body.error).toBe('Elegí un motivo');
    expect((await send({ consent: false })).body.error).toBe('Necesitamos tu aceptación para responderte');
    expect((await send({ email: 'no' })).status).toBe(400);
    expect((await send({ phone: 'abc' })).status).toBe(400);
  });

  it('silently drops messages that fill in the honeypot', async () => {
    const res = await request(app).post('/api/contact').send({ ...message, email: 'bot@detoke.test', company: 'ACME' });
    expect(res.status).toBe(201);
    expect(await ContactMessage.count({ where: { email: 'bot@detoke.test' } })).toBe(0);
  });

  it('limits requests per IP', () => {
    const limit = rateLimit({ windowMs: 1000, max: 2, message: 'Basta' });
    const req = { ip: '1.1.1.1' } as Request;
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as unknown as Response;
    const next = vi.fn();
    for (let i = 0; i < 3; i += 1) limit(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'Basta' });
  });

  it('lets only admins read and update messages', async () => {
    const { token } = await register(categories.pizzas.id);
    expect((await request(app).get('/api/contact')).status).toBe(401);
    expect((await request(app).get('/api/contact').set(auth(token))).status).toBe(403);

    const admin = await User.create({ email: 'admin@detoke.test', name: 'Admin', passwordHash: await bcrypt.hash('secreta123', 4), role: 'admin' });
    const adminToken = signToken(admin);
    const list = await request(app).get('/api/contact').query({ status: 'new', limit: 1 }).set(auth(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.total).toBeGreaterThan(1);

    const { id } = list.body.data.items[0];
    expect((await request(app).patch(`/api/contact/${id}`).set(auth(token)).send({ status: 'read' })).status).toBe(403);
    expect((await request(app).patch(`/api/contact/${id}`).set(auth(adminToken)).send({ status: 'nada' })).status).toBe(400);
    const updated = await request(app).patch(`/api/contact/${id}`).set(auth(adminToken)).send({ status: 'read' });
    expect(updated.body.data.status).toBe('read');
  });
});

describe('admin', () => {
  let adminToken: string;
  let seller: Awaited<ReturnType<typeof register>>;

  beforeAll(async () => {
    const admin = await User.create({ email: 'jefa@detoke.test', name: 'Jefa', passwordHash: await bcrypt.hash('secreta123', 4), role: 'admin' });
    adminToken = signToken(admin);
    seller = await register(categories.bakery.id, 'Panadería del Admin');
  });

  it('lists accounts with filters only for admins', async () => {
    expect((await request(app).get('/api/admin/users')).status).toBe(401);
    expect((await request(app).get('/api/admin/users').set(auth(seller.token))).status).toBe(403);

    const res = await request(app).get('/api/admin/users').query({ search: 'panaderia del admin' }).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    const [account] = res.body.data.items;
    expect(account.business.slug).toBe(seller.business.slug);
    expect(account.user).not.toHaveProperty('passwordHash');
    expect(account.profile.complete).toBe(false);

    const byCategory = await request(app).get('/api/admin/users').query({ category: 'pizzeria', limit: 2 }).set(auth(adminToken));
    expect(byCategory.body.data.items).toHaveLength(2);
    expect(byCategory.body.data.items.every((a: { business: { category: { slug: string } } }) => a.business.category.slug === 'pizzeria')).toBe(true);
    expect(byCategory.body.data.pages).toBeGreaterThan(1);

    const all = await request(app).get('/api/admin/users').query({ limit: 100 }).set(auth(adminToken));
    expect(all.body.data.items.some((a: { user: { role: string } }) => a.user.role === 'admin')).toBe(false);
  });

  it('acts on behalf of a seller, audits writes and stops', async () => {
    const start = await request(app).post(`/api/admin/impersonate/${seller.user.id}`).set(auth(adminToken));
    expect(start.status).toBe(201);
    expect(start.body.data.business.id).toBe(seller.business.id);
    const token = start.body.data.token as string;

    const me = await request(app).get('/api/auth/me').set(auth(token));
    expect(me.body.data.user.id).toBe(seller.user.id);
    expect(me.body.data.impersonatedBy.email).toBe('jefa@detoke.test');

    const edit = await request(app).put('/api/businesses/me').set(auth(token)).send({ tagline: 'Editado por la admin' });
    expect(edit.body.data.tagline).toBe('Editado por la admin');
    const log = await ImpersonationLog.findOne({ where: { targetUserId: seller.user.id } });
    // The audit entry is written after the response goes out: wait for it instead of guessing how long it takes.
    await vi.waitFor(async () => expect(await AuditLog.count({ where: { impersonationLogId: log!.id, method: 'PUT' } })).toBe(1), { timeout: 2000, interval: 20 });

    expect((await request(app).get('/api/admin/users').set(auth(token))).status).toBe(403);
    expect((await request(app).post(`/api/admin/impersonate/${seller.user.id}`).set(auth(token))).status).toBe(403);

    expect((await request(app).post('/api/admin/impersonate/stop').set(auth(token))).status).toBe(200);
    await log!.reload();
    expect(log!.endedAt).not.toBeNull();

    expect((await request(app).get('/api/auth/me').set(auth(seller.token))).body.data.impersonatedBy).toBeNull();
    expect((await request(app).post('/api/admin/impersonate/stop').set(auth(seller.token))).status).toBe(400);
  });

  it('does not act on behalf of admins, unknown users, or for sellers', async () => {
    const other = await User.create({ email: 'otra-admin@detoke.test', name: 'Otra', passwordHash: 'x', role: 'admin' });
    expect((await request(app).post(`/api/admin/impersonate/${other.id}`).set(auth(adminToken))).status).toBe(400);
    expect((await request(app).post('/api/admin/impersonate/nadie').set(auth(adminToken))).status).toBe(404);
    expect((await request(app).post(`/api/admin/impersonate/${seller.user.id}`).set(auth(seller.token))).status).toBe(403);
  });

  it('blocks account security changes while acting as someone', () => {
    const next = vi.fn();
    requireOwnSession({ impersonation: { admin: {}, logId: 'x' } } as unknown as Request, {} as Response, next);
    expect(next.mock.calls[0][0].status).toBe(403);
    requireOwnSession({} as Request, {} as Response, next);
    expect(next.mock.calls[1]).toEqual([]);
  });
});

describe('shared rules', () => {
  // 2026-11-09 is a Monday. Montevideo is UTC-3.
  const at = (time: string, day = '09') => new Date(`2026-11-${day}T${time}:00-03:00`);

  it('handles split shifts, closed days and overnight ranges', () => {
    const hours = {
      ...emptyHours(),
      monday: { open: true, ranges: [{ from: '09:00', to: '13:00' }, { from: '17:00', to: '21:00' }] },
      friday: { open: true, ranges: [{ from: '20:00', to: '02:00' }] },
    };

    expect(openStatus(hours, at('10:00'))).toEqual({ isOpen: true, label: 'Abierto hasta las 13:00' });
    expect(openStatus(hours, at('14:00'))).toEqual({ isOpen: false, label: 'Abre hoy a las 17:00' });
    expect(openStatus(hours, at('22:00')).label).toBe('Abre el viernes a las 20:00');
    expect(openStatus(hours, at('23:00', '13')).isOpen).toBe(true);
    expect(openStatus(hours, at('01:00', '14'))).toEqual({ isOpen: true, label: 'Abierto hasta las 02:00' });
    expect(openStatus(emptyHours()).label).toBe('Sin horarios cargados');
  });

  it('normalizes text', () => {
    expect(slugify('Fiambrería & Quesería')).toBe('fiambreria-queseria');
    expect(normalizeWhatsapp('+54 9 11 2345-6789')).toBe('5491123456789');
    expect(normalizeWhatsapp('11 2345 6789')).toBe('5491123456789');
  });
});
