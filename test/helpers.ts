import request from 'supertest';
import { createApp } from '../server/app.js';
import { BusinessCategory, ProductCategory } from '../server/models/index.js';

export const app = createApp();
export const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
export { request };

let counter = 0;

export async function createCategories() {
  const pizzas = await BusinessCategory.create({ name: 'Pizzería', slug: 'pizzeria', icon: 'pizza' });
  const bakery = await BusinessCategory.create({ name: 'Panadería', slug: 'panaderia', icon: 'croissant' });
  const food = await ProductCategory.create({ name: 'Platos', slug: 'platos' });
  return { pizzas, bakery, food };
}

/** Registers a seller with a business and returns the session. */
export async function register(businessCategoryId: string, name = `Negocio ${++counter}`) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Ana Pérez',
    email: `ana${++counter}@detoke.test`,
    password: 'secreta123',
    business: { name, businessCategoryId, whatsapp: '11 2345 6789' },
  });
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return res.body.data as { token: string; user: { id: string; email: string }; business: { id: string; slug: string; whatsapp: string } };
}
