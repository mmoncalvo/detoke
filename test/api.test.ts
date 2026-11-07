import { beforeAll, describe, expect, it } from 'vitest';
import { initDb } from '../server/db.js';
import { Category, Product, User } from '../server/models/index.js';
import { app, auth, request } from './helpers.js';

const register = async (username: string) => {
  const res = await request(app).post('/api/auth/register').send({
    username,
    password: 'secreta123',
    businessName: `Negocio de ${username}`,
    whatsapp: '59899123456',
  });
  expect(res.status).toBe(201);
  return res.body.data as { token: string; user: { id: string } };
};

const createProduct = async (token: string, title = 'Pizza grande') => {
  const res = await request(app).post('/api/products').set(auth(token)).send({ title, price: 350, isAvailable: true });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; title: string; images: string };
};

beforeAll(async () => {
  await initDb({ reset: true });
});

describe('health', () => {
  it('uses the standard response format', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', db: 'connected' } });
  });

  it('returns 404 with a Spanish error for unknown routes', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'No encontrado' });
  });
});

describe('auth', () => {
  it('registers, logs in and returns the user without the password', async () => {
    const { token, user } = await register('ana');
    expect(token).toBeTruthy();
    expect(user).not.toHaveProperty('password');

    const login = await request(app).post('/api/auth/login').send({ username: 'ana', password: 'secreta123' });
    expect(login.status).toBe(200);
    expect(login.body.data.user).not.toHaveProperty('password');

    const me = await request(app).get('/api/auth/me').set(auth(login.body.data.token));
    expect(me.status).toBe(200);
    expect(me.body.data.username).toBe('ana');
    expect(me.body.data).not.toHaveProperty('password');
  });

  it('rejects bad credentials, duplicate users, invalid data and missing tokens', async () => {
    const bad = await request(app).post('/api/auth/login').send({ username: 'ana', password: 'incorrecta' });
    expect(bad.status).toBe(401);
    expect(bad.body).toEqual({ success: false, error: 'Credenciales inválidas' });

    const repeated = await request(app).post('/api/auth/register').send({ username: 'ana', password: 'secreta123', businessName: 'Otro', whatsapp: '59899123456' });
    expect(repeated.status).toBe(400);

    const invalid = await request(app).post('/api/auth/login').send({ username: 'a' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Datos inválidos');

    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth('malo'))).status).toBe(401);
  });
});

describe('products', () => {
  it('creates, edits and deletes an own product', async () => {
    const { token } = await register('beto');
    const product = await createProduct(token);

    const edited = await request(app).put(`/api/products/${product.id}`).set(auth(token)).send({ title: 'Pizza familiar', price: 500 });
    expect(edited.status).toBe(200);
    expect(edited.body.data.title).toBe('Pizza familiar');

    const removed = await request(app).delete(`/api/products/${product.id}`).set(auth(token));
    expect(removed.status).toBe(200);
    expect(removed.body.success).toBe(true);

    expect((await request(app).get(`/api/products/${product.id}`)).status).toBe(404);
  });

  it('keeps images when editing without sending them', async () => {
    const { token } = await register('nico');
    const product = await createProduct(token);
    await Product.update({ images: JSON.stringify(['/data/images/a.jpg']) }, { where: { id: product.id } });

    await request(app).put(`/api/products/${product.id}`).set(auth(token)).send({ title: 'Otro título' });

    const res = await request(app).get(`/api/products/${product.id}`);
    expect(res.body.data.images).toBe(JSON.stringify(['/data/images/a.jpg']));
  });

  it('uploads an image to an own product', async () => {
    const { token } = await register('flor');
    const product = await createProduct(token);

    const res = await request(app)
      .post(`/api/products/${product.id}/upload-image`)
      .set(auth(token))
      .attach('image', Buffer.from('imagen'), 'foto.jpg');
    expect(res.status).toBe(200);
    expect(res.body.data.images[0]).toMatch(/^\/data\/uploads\/image-.*\.jpg$/);

    const wrongField = await request(app)
      .post(`/api/products/${product.id}/upload-image`)
      .set(auth(token))
      .attach('otro', Buffer.from('imagen'), 'foto.jpg');
    expect(wrongField.status).toBe(400);
  });

  it('returns 403 on another user\'s product', async () => {
    const owner = await register('carla');
    const other = await register('dani');
    const product = await createProduct(owner.token);

    const edit = await request(app).put(`/api/products/${product.id}`).set(auth(other.token)).send({ title: 'Robado' });
    expect(edit.status).toBe(403);
    expect(edit.body).toEqual({ success: false, error: 'No autorizado' });

    expect((await request(app).delete(`/api/products/${product.id}`).set(auth(other.token))).status).toBe(403);
    expect((await request(app).get(`/api/products/${product.id}`)).status).toBe(200);
  });

  it('includes User and Category under those keys in the list', async () => {
    const { token, user } = await register('elsa');
    const category = await Category.create({ name: 'Pizzas', icon: '🍕' });
    await request(app).post('/api/products').set(auth(token)).send({ title: 'Muzzarella', price: 300, categoryId: category.id, isAvailable: true });

    const res = await request(app).get('/api/products').query({ userId: user.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].User.businessName).toBe('Negocio de elsa');
    expect(res.body.data[0].Category.name).toBe('Pizzas');
  });
});

describe('businesses', () => {
  beforeAll(async () => {
    const user = await User.create({ username: 'pizzeria', password: 'x', businessName: 'Pizzería Central', whatsapp: '59899000000', slug: 'pizzeria-central' });
    await Product.create({ title: 'Fainá', price: 80, userId: user.id });
    await User.create({ username: 'cerrado', password: 'x', businessName: 'Cerrado', whatsapp: '59899000001', slug: 'cerrado', isActive: false });
  });

  it('lists active businesses without private data', async () => {
    const res = await request(app).get('/api/users').query({ search: 'Pizzería' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe('pizzeria-central');
    expect(res.body.data[0].Products).toHaveLength(1);
    expect(res.body.data[0]).not.toHaveProperty('password');
    expect(res.body.data[0]).not.toHaveProperty('username');
  });

  it('finds by slug and hides inactive businesses', async () => {
    const res = await request(app).get('/api/users/slug/pizzeria-central');
    expect(res.status).toBe(200);
    expect(res.body.data.businessName).toBe('Pizzería Central');
    expect(res.body.data.Products[0].title).toBe('Fainá');

    expect((await request(app).get('/api/users/slug/cerrado')).status).toBe(404);
    expect((await request(app).get('/api/users/slug/no-existe')).status).toBe(404);
  });

  it('only the owner edits the profile', async () => {
    const owner = await register('gabi');
    const other = await register('hugo');

    const edit = await request(app).put(`/api/users/${owner.user.id}`).set(auth(owner.token)).send({ description: 'Hola', hours: '{"monday":"09:00-18:00"}' });
    expect(edit.status).toBe(200);
    expect(edit.body.data.description).toBe('Hola');

    const badJson = await request(app).put(`/api/users/${owner.user.id}`).set(auth(owner.token)).send({ hours: 'not json' });
    expect(badJson.status).toBe(400);
    expect(badJson.body.error).toBe('Formato de horario inválido');

    expect((await request(app).put(`/api/users/${owner.user.id}`).set(auth(other.token)).send({ description: 'x' })).status).toBe(403);
  });
});

describe('search', () => {
  it('finds businesses, products and categories case-insensitively', async () => {
    const { token } = await register('ines');
    await createProduct(token, 'Empanada Salteña');
    await Category.create({ name: 'Empanadas', icon: '🥟' });
    await User.create({ username: 'empa', password: 'x', businessName: 'Empanadas Doña Rosa', whatsapp: '59899000002', slug: 'dona-rosa' });

    const res = await request(app).get('/api/search').query({ q: 'EMPANADA' });
    expect(res.status).toBe(200);
    const types = res.body.data.map((r: { type: string }) => r.type);
    expect(types).toEqual(expect.arrayContaining(['business', 'product', 'category']));
  });

  it('returns an empty list without a term', async () => {
    const res = await request(app).get('/api/search');
    expect(res.body).toEqual({ success: true, data: [] });
  });
});
