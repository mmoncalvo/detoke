// Sample data: `seed()` drops and recreates every table; `refreshDemo()` reloads only the demo accounts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { initDb } from '../db.js';
import { Business, BusinessCategory, ContactMessage, Order, Product, ProductCategory, User } from '../models/index.js';
import { newPublicCode } from './orders.js';
import type { OrderStatus } from '../../shared/orders.js';

const seedDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'seed');
const readSeed = (name: string) => JSON.parse(fs.readFileSync(path.join(seedDir, name), 'utf8'));

export const DEMO_PASSWORD = 'detoke1234';

/**
 * Business sets that can be loaded. Categories and sample messages are shared; only the businesses change.
 * - demo: invented businesses in Montevideo and nearby cities.
 * - dolores: real businesses of Dolores (Soriano), built from public Google Places data by `npm run places:dolores`.
 */
export const SEED_SETS = { demo: 'businesses.json', dolores: 'dolores/businesses.json' } as const;
export type SeedSet = keyof typeof SEED_SETS;
export const isSeedSet = (value: unknown): value is SeedSet => typeof value === 'string' && value in SEED_SETS;
const readBusinesses = (set: SeedSet): SeedBusiness[] => readSeed(SEED_SETS[set]);
export const ADMIN_EMAIL = 'admin@detoke.test';

interface SeedBusiness {
  owner: { name: string; email: string };
  category: string;
  products: (Record<string, unknown> & { category: string })[];
  [field: string]: unknown;
}

const CUSTOMERS = ['Lucía Fernández', 'Martín Pereira', 'Sofía Rodríguez', 'Tomás Silva', 'Valentina Sosa', 'Joaquín Méndez'];
/** Status, how many minutes ago, delivery or pickup. */
const SAMPLE_ORDERS: [OrderStatus, number, 'delivery' | 'pickup'][] = [
  ['pending', 4, 'pickup'],
  ['confirmed', 25, 'delivery'],
  ['confirmed', 50, 'pickup'],
  ['completed', 60 * 26, 'delivery'],
  ['cancelled', 60 * 30, 'pickup'],
];
const PATHS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['pending'],
  confirmed: ['pending', 'confirmed'],
  completed: ['pending', 'confirmed', 'completed'],
  cancelled: ['pending', 'cancelled'],
};
/** A few orders in different statuses for the first sample businesses (only those without orders). */
export async function seedOrders(set: SeedSet = 'demo', limit = 8) {
  const businesses = await Business.findAll({ where: { slug: readBusinesses(set).map((b) => b.slug as string) }, include: [Product], order: [['name', 'ASC']], limit });
  let created = 0;
  for (const [index, business] of businesses.entries()) {
    if (await Order.count({ where: { businessId: business.id } })) continue;
    const products = (business.products ?? []).filter((p) => p.isAvailable);
    for (const [n, [status, minutesAgo, wanted]] of SAMPLE_ORDERS.entries()) {
      const fulfillment = business.deliveryOptions.includes(wanted) ? wanted : business.deliveryOptions[0];
      const picked = products.slice(n, n + 2 + (n % 2));
      if (picked.length === 0) continue;
      const items = picked.map((p, i) => ({ productId: p.id, name: p.name, unitPrice: p.price, quantity: 1 + ((n + i) % 3), subtotal: p.price * (1 + ((n + i) % 3)), image: p.images[0] ?? null }));
      const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
      const deliveryFee = fulfillment === 'delivery' ? business.deliveryFee ?? 0 : 0;
      const createdAt = new Date(Date.now() - minutesAgo * 60_000);
      const path = PATHS[status];
      await Order.create({
        publicCode: newPublicCode(),
        number: n + 1,
        businessId: business.id,
        items,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        fulfillment,
        deliveryAddress: fulfillment === 'delivery' ? `${['Bulevar Artigas', 'Chucarro', 'Libertad', 'Avenida Brasil'][n % 4]} ${1200 + n * 37}` : null,
        paymentMethod: business.paymentMethods[n % business.paymentMethods.length],
        customerName: CUSTOMERS[(index + n) % CUSTOMERS.length],
        customerPhone: null,
        notes: n === 0 ? 'Si pueden, sin cebolla. Gracias.' : null,
        status,
        statusHistory: path.map((s, i) => ({
          status: s,
          at: new Date(createdAt.getTime() + i * 8 * 60_000).toISOString(),
          by: i === 0 ? 'customer' : 'business',
          ...(s === 'cancelled' && { reason: 'Nos quedamos sin stock de uno de los productos.' }),
        })),
        // Sequelize keeps a given createdAt; silent keeps the given updatedAt too.
        createdAt,
        updatedAt: createdAt,
      }, { silent: true });
      created += 1;
    }
  }
  return created;
}

/** Demo buyers, each with the sample orders placed under their name. */
const DEMO_CUSTOMERS = [
  { email: 'cliente1@detoke.test', name: 'Lucía Fernández', phone: '099 000 101', address: 'Bulevar Artigas 1200' },
  { email: 'cliente2@detoke.test', name: 'Martín Pereira', phone: '099 000 102', address: 'Chucarro 1237' },
];

export async function seedCustomers(passwordHash: string) {
  for (const data of DEMO_CUSTOMERS) {
    const existing = await User.findOne({ where: { email: data.email } });
    const user = existing ? await existing.update({ ...data, role: 'customer', passwordHash, disabledAt: null }) : await User.create({ ...data, role: 'customer', passwordHash });
    await Order.update({ customerUserId: user.id }, { where: { customerName: data.name, customerUserId: null } });
  }
  return DEMO_CUSTOMERS.map((c) => `${c.email} (cliente)`);
}

export const seedContactMessages = () => ContactMessage.bulkCreate(readSeed('contact-messages.json'));

export async function seed(set: SeedSet = 'demo') {
  await initDb({ reset: true });

  const businessCategories = await BusinessCategory.bulkCreate(readSeed('business-categories.json').map((c: object, position: number) => ({ ...c, position })));
  const productCategories = await ProductCategory.bulkCreate(readSeed('product-categories.json').map((c: object, position: number) => ({ ...c, position })));
  const businessCategoryIds = new Map(businessCategories.map((c) => [c.slug, c.id]));
  const productCategoryIds = new Map(productCategories.map((c) => [c.slug, c.id]));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.create({ email: ADMIN_EMAIL, name: 'Administración Detoke', role: 'admin', passwordHash });

  const businesses = readBusinesses(set);
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

  await seedContactMessages();
  await seedOrders(set);
  const customers = await seedCustomers(passwordHash);

  return { businesses: businesses.length, products: productCount, accounts: [...businesses.map((b) => `${b.owner.email} (${b.name})`), ...customers] };
}

/** Creates the missing categories and updates the others by slug, keeping their ids (real businesses use them). */
async function upsertCategories<M extends typeof BusinessCategory | typeof ProductCategory>(model: M, file: string) {
  const ids = new Map<string, string>();
  for (const [position, data] of (readSeed(file) as { slug: string }[]).entries()) {
    const existing = await (model as typeof BusinessCategory).findOne({ where: { slug: data.slug } });
    const row = existing ? await existing.update({ ...data, position }) : await (model as typeof BusinessCategory).create({ ...data, position });
    ids.set(row.slug, row.id);
  }
  return ids;
}

/**
 * Reloads only the sample data, without touching anything else: demo accounts and their businesses
 * are updated in place (found by email), their products and orders are recreated, and the sample
 * contact messages are replaced. Real accounts, their businesses and their orders stay as they are.
 */
export async function refreshDemo(set: SeedSet = 'demo') {
  await initDb();
  const businessCategoryIds = await upsertCategories(BusinessCategory, 'business-categories.json');
  const productCategoryIds = await upsertCategories(ProductCategory, 'product-categories.json');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await User.findOne({ where: { email: ADMIN_EMAIL } });
  if (admin) await admin.update({ role: 'admin', passwordHash });
  else await User.create({ email: ADMIN_EMAIL, name: 'Administración Detoke', role: 'admin', passwordHash });

  const businesses = readBusinesses(set);
  let productCount = 0;
  for (const { owner, category, products, ...data } of businesses) {
    const existingUser = await User.findOne({ where: { email: owner.email } });
    const user = existingUser ? await existingUser.update({ ...owner, passwordHash }) : await User.create({ ...owner, passwordHash });
    const fields = { ...data, ownerId: user.id, businessCategoryId: businessCategoryIds.get(category) };
    let business = await Business.findOne({ where: { ownerId: user.id } });
    if (business) {
      await Order.destroy({ where: { businessId: business.id } });
      await Product.destroy({ where: { businessId: business.id } });
      business = await business.update(fields);
    } else {
      business = await Business.create(fields);
    }
    await Product.bulkCreate(products.map(({ category: productCategory, ...product }) => ({
      ...product,
      businessId: business.id,
      productCategoryId: productCategoryIds.get(productCategory),
    })));
    productCount += products.length;
  }

  const messages: { email: string }[] = readSeed('contact-messages.json');
  await ContactMessage.destroy({ where: { email: messages.map((m) => m.email) } });
  await seedContactMessages();
  const orders = await seedOrders(set);
  const customers = await seedCustomers(passwordHash);

  return { businesses: businesses.length, products: productCount, orders, accounts: [...businesses.map((b) => `${b.owner.email} (${b.name})`), ...customers] };
}
