import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../server/config.js';
import { initDb } from '../server/db.js';
import { User } from '../server/models/index.js';
import { exchangeCode, type GoogleProfile } from '../server/services/google.js';
import { app, auth, createCategories, register, request } from './helpers.js';

vi.mock('../server/services/google.js', async (original) => ({
  ...(await original<typeof import('../server/services/google.js')>()),
  exchangeCode: vi.fn(),
}));

const profile = (extra: Partial<GoogleProfile> = {}): GoogleProfile => ({ sub: 'g-1', email: 'nueva@gmail.com', emailVerified: true, name: 'Nueva Persona', picture: 'https://example.com/a.png', ...extra });

let categories: Awaited<ReturnType<typeof createCategories>>;

/** Runs the redirect flow and returns where the browser lands. */
async function signInWithGoogle(googleProfile: GoogleProfile, as?: 'seller' | 'customer') {
  vi.mocked(exchangeCode).mockResolvedValueOnce(googleProfile);
  const start = await request(app).get('/api/auth/google/url').query(as ? { as } : {});
  const state = new URL(start.body.data.url).searchParams.get('state');
  const cookie = start.headers['set-cookie'];
  const callback = await request(app).get('/api/auth/google/callback').query({ code: 'abc', state }).set('Cookie', cookie);
  expect(callback.status).toBe(302);
  return new URL(callback.headers.location);
}

const exchange = (code: string) => request(app).post('/api/auth/google/exchange').send({ code });

beforeAll(async () => {
  await initDb({ reset: true });
  categories = await createCategories();
});

beforeEach(() => {
  config.google.clientId = 'client-id';
  config.google.clientSecret = 'client-secret';
});

describe('google sign-in', () => {
  it('is hidden without credentials', async () => {
    config.google.clientId = null;
    expect((await request(app).get('/api/auth/providers')).body.data).toEqual({ google: false });
    expect((await request(app).get('/api/auth/google/url')).status).toBe(404);
    config.google.clientId = 'client-id';
    expect((await request(app).get('/api/auth/providers')).body.data).toEqual({ google: true });
  });

  it('from "Sumá tu negocio", creates a seller without business and trades the code only once', async () => {
    const landing = await signInWithGoogle(profile(), 'seller');
    expect(landing.origin + landing.pathname).toBe(`${config.appUrl}/auth/callback`);
    const code = landing.searchParams.get('code')!;

    const session = await exchange(code);
    expect(session.status).toBe(200);
    expect(session.body.data.user).toMatchObject({ email: 'nueva@gmail.com', role: 'seller', avatarUrl: 'https://example.com/a.png' });
    expect(session.body.data.business).toBeNull();
    expect((await exchange(code)).status).toBe(400);

    const created = await request(app).post('/api/businesses/me').set(auth(session.body.data.token)).send({ name: 'Heladería Nueva', businessCategoryId: categories.bakery.id, whatsapp: '11 2345 6789' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('heladeria-nueva');
    expect((await request(app).post('/api/businesses/me').set(auth(session.body.data.token)).send({ name: 'Otra', businessCategoryId: categories.bakery.id, whatsapp: '11 2345 6789' })).status).toBe(409);
  });

  it('otherwise creates a customer', async () => {
    const landing = await signInWithGoogle(profile({ sub: 'g-cliente', email: 'cliente@gmail.com' }));
    const session = await exchange(landing.searchParams.get('code')!);
    expect(session.body.data.user).toMatchObject({ email: 'cliente@gmail.com', role: 'customer' });
  });

  it('signs in again by Google id and links existing accounts by email', async () => {
    const again = await signInWithGoogle(profile({ email: 'cambio@gmail.com' }));
    const session = await exchange(again.searchParams.get('code')!);
    expect(session.body.data.user.email).toBe('nueva@gmail.com');

    const seller = await register(categories.pizzas.id);
    const linked = await signInWithGoogle(profile({ sub: 'g-2', email: seller.user.email }));
    const linkedSession = await exchange(linked.searchParams.get('code')!);
    expect(linkedSession.body.data.user.id).toBe(seller.user.id);
    expect(linkedSession.body.data.business.id).toBe(seller.business.id);
    expect((await User.unscoped().findByPk(seller.user.id))?.googleId).toBe('g-2');

    const password = await request(app).post('/api/auth/login').send({ email: seller.user.email, password: 'secreta123' });
    expect(password.status).toBe(200);
  });

  it('tells Google-only accounts to use Google', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nueva@gmail.com', password: 'cualquiera' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Esta cuenta usa Google para ingresar');
  });

  it('rejects invalid states, unverified emails, cancellations and admins', async () => {
    const forged = jwt.sign({ nonce: 'otro' }, config.jwtSecret);
    const invalid = await request(app).get('/api/auth/google/callback').query({ code: 'abc', state: forged }).set('Cookie', 'detoke_google_state=distinto');
    expect(new URL(invalid.headers.location).searchParams.get('error')).toBe('invalid_state');

    const noCookie = await request(app).get('/api/auth/google/callback').query({ code: 'abc', state: forged });
    expect(new URL(noCookie.headers.location).searchParams.get('error')).toBe('invalid_state');

    const cancelled = await request(app).get('/api/auth/google/callback').query({ error: 'access_denied' });
    expect(new URL(cancelled.headers.location).searchParams.get('error')).toBe('cancelled');

    expect((await signInWithGoogle(profile({ sub: 'g-3', email: 'sinverificar@gmail.com', emailVerified: false }))).searchParams.get('error')).toBe('unverified');

    await User.create({ email: 'admin-google@detoke.test', name: 'Admin', role: 'admin', passwordHash: await bcrypt.hash('secreta123', 4) });
    expect((await signInWithGoogle(profile({ sub: 'g-4', email: 'admin-google@detoke.test' }))).searchParams.get('error')).toBe('admin');
    expect((await User.unscoped().findOne({ where: { email: 'admin-google@detoke.test' } }))?.googleId).toBeNull();
  });
});
