import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initDb } from '../server/db.js';
import { signToken } from '../server/middleware/requireAuth.js';
import { AuditLog, User } from '../server/models/index.js';
import { app, auth, createCategories, register, request } from './helpers.js';

let categories: Awaited<ReturnType<typeof createCategories>>;

beforeAll(async () => {
  await initDb({ reset: true });
  categories = await createCategories();
});

describe('account', () => {
  it('updates the profile and rejects an email already in use', async () => {
    const seller = await register(categories.pizzas.id);
    const other = await register(categories.pizzas.id);

    const res = await request(app).patch('/api/auth/me').set(auth(seller.token)).send({ name: 'Ana Gómez', email: 'ANA.NUEVA@detoke.test', phone: '11 5555 0000' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Ana Gómez', email: 'ana.nueva@detoke.test', phone: '11 5555 0000' });

    const taken = await request(app).patch('/api/auth/me').set(auth(seller.token)).send({ name: 'Ana', email: other.user.email });
    expect(taken.status).toBe(409);
    expect((await request(app).patch('/api/auth/me').set(auth(seller.token)).send({ name: '', email: 'x' })).status).toBe(400);
    expect((await request(app).patch('/api/auth/me').send({ name: 'Ana', email: 'a@b.co' })).status).toBe(401);
  });

  it('changes the password only with the current one', async () => {
    const seller = await register(categories.pizzas.id);
    const security = await request(app).get('/api/auth/me/security').set(auth(seller.token));
    expect(security.body.data).toEqual({ hasPassword: true, hasGoogle: false });

    const wrong = await request(app).post('/api/auth/me/password').set(auth(seller.token)).send({ currentPassword: 'otra-cosa', newPassword: 'nueva12345', confirmPassword: 'nueva12345' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toBe('La contraseña actual no es correcta');
    const mismatch = await request(app).post('/api/auth/me/password').set(auth(seller.token)).send({ currentPassword: 'secreta123', newPassword: 'nueva12345', confirmPassword: 'nueva99999' });
    expect(mismatch.body.error).toBe('Las contraseñas no coinciden');
    const short = await request(app).post('/api/auth/me/password').set(auth(seller.token)).send({ currentPassword: 'secreta123', newPassword: 'corta', confirmPassword: 'corta' });
    expect(short.status).toBe(400);

    const changed = await request(app).post('/api/auth/me/password').set(auth(seller.token)).send({ currentPassword: 'secreta123', newPassword: 'nueva12345', confirmPassword: 'nueva12345' });
    expect(changed.status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: seller.user.email, password: 'secreta123' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: seller.user.email, password: 'nueva12345' })).status).toBe(200);
  });

  it('lets a Google-only account create a password without a current one', async () => {
    const user = await User.create({ email: 'solo-google@gmail.com', name: 'Solo Google', googleId: 'g-123' });
    const token = signToken(user);
    expect((await request(app).get('/api/auth/me/security').set(auth(token))).body.data).toEqual({ hasPassword: false, hasGoogle: true });
    const res = await request(app).post('/api/auth/me/password').set(auth(token)).send({ newPassword: 'primera123', confirmPassword: 'primera123' });
    expect(res.status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: 'solo-google@gmail.com', password: 'primera123' })).status).toBe(200);
  });

  it('uploads and removes the profile picture', async () => {
    const seller = await register(categories.pizzas.id);
    const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#2f6b4f' } }).png().toBuffer();
    const res = await request(app).post('/api/auth/me/avatar').set(auth(seller.token)).attach('image', png, { filename: 'yo.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toMatch(/^\/data\/uploads\/avatar-.+\.webp$/);
    expect((await request(app).get('/api/auth/me').set(auth(seller.token))).body.data.user.avatarUrl).toBe(res.body.data.avatarUrl);

    const text = await request(app).post('/api/auth/me/avatar').set(auth(seller.token)).attach('image', Buffer.from('hola'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(text.status).toBe(400);

    const removed = await request(app).delete('/api/auth/me/avatar').set(auth(seller.token));
    expect(removed.body.data.avatarUrl).toBeNull();
  });

  it('lets an admin acting as the user edit the profile, but not the password or email, and audits it', async () => {
    const seller = await register(categories.bakery.id);
    const admin = await User.create({ email: 'admin-cuenta@detoke.test', name: 'Admin', passwordHash: await bcrypt.hash('secreta123', 4), role: 'admin' });
    const start = await request(app).post(`/api/admin/impersonate/${seller.user.id}`).set(auth(signToken(admin)));
    const token = start.body.data.token as string;

    expect((await request(app).patch('/api/auth/me').set(auth(token)).send({ name: 'Editado por admin', email: seller.user.email })).status).toBe(200);
    expect((await request(app).patch('/api/auth/me').set(auth(token)).send({ name: 'Otro', email: 'robada@detoke.test' })).status).toBe(403);
    const password = await request(app).post('/api/auth/me/password').set(auth(token)).send({ currentPassword: 'secreta123', newPassword: 'nueva12345', confirmPassword: 'nueva12345' });
    expect(password.status).toBe(403);

    await vi.waitFor(async () => {
      const entries = await AuditLog.findAll({ where: { targetUserId: seller.user.id } });
      // Written after each response, so they can land in any order.
      expect(entries.map((e) => [e.method, e.path, e.status]).sort()).toEqual([
        ['PATCH', '/api/auth/me', 200],
        ['PATCH', '/api/auth/me', 403],
        ['POST', '/api/auth/me/password', 403],
      ].sort());
    }, { timeout: 2000, interval: 20 });
  });
});
