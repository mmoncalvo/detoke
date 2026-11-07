// Datos de ejemplo. Borra y recrea todas las tablas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { initDb } from '../db.js';
import { Category, Product, User } from '../models/index.js';

const seedDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'seed');
const readSeed = (name: string) => JSON.parse(fs.readFileSync(path.join(seedDir, name), 'utf8'));

export async function seed() {
  await initDb({ reset: true });

  const categories = readSeed('categories.json');
  const users = readSeed('users.json');
  const products = readSeed('products.json');

  for (const category of categories) await Category.create(category);
  for (const user of users) {
    await User.create({ ...user, password: await bcrypt.hash(user.password, 10) });
  }
  for (const product of products) await Product.create(product);

  return { users: users.length, products: products.length, categories: categories.length };
}
