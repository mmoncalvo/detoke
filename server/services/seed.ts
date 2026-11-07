// Sample data. Drops and recreates every table.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { initDb } from '../db.js';
import { Business, BusinessCategory, Product, ProductCategory, User } from '../models/index.js';

const seedDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'seed');
const readSeed = (name: string) => JSON.parse(fs.readFileSync(path.join(seedDir, name), 'utf8'));

export const DEMO_PASSWORD = 'detoke1234';
export const ADMIN_EMAIL = 'admin@detoke.test';

interface SeedBusiness {
  owner: { name: string; email: string };
  category: string;
  products: (Record<string, unknown> & { category: string })[];
  [field: string]: unknown;
}

export async function seed() {
  await initDb({ reset: true });

  const businessCategories = await BusinessCategory.bulkCreate(readSeed('business-categories.json').map((c: object, position: number) => ({ ...c, position })));
  const productCategories = await ProductCategory.bulkCreate(readSeed('product-categories.json').map((c: object, position: number) => ({ ...c, position })));
  const businessCategoryIds = new Map(businessCategories.map((c) => [c.slug, c.id]));
  const productCategoryIds = new Map(productCategories.map((c) => [c.slug, c.id]));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.create({ email: ADMIN_EMAIL, name: 'Administración Detoke', role: 'admin', passwordHash });

  const businesses: SeedBusiness[] = readSeed('businesses.json');
  let productCount = 0;
  for (const { owner, category, products, ...data } of businesses) {
    const user = await User.create({ ...owner, passwordHash });
    const business = await Business.create({ ...data, ownerId: user.id, businessCategoryId: businessCategoryIds.get(category) });
    await Product.bulkCreate(products.map(({ category: productCategory, ...product }) => ({
      ...product,
      businessId: business.id,
      productCategoryId: productCategoryIds.get(productCategory),
    })));
    productCount += products.length;
  }

  return { businesses: businesses.length, products: productCount, accounts: businesses.map((b) => `${b.owner.email} (${b.name})`) };
}
