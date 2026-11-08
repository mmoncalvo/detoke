// Sample data. Drops and recreates every table.
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
export const ADMIN_EMAIL = 'admin@detoke.test';

interface SeedBusiness {
  owner: { name: string; email: string };
  category: string;
  products: (Record<string, unknown> & { category: string })[];
  [field: string]: unknown;
}

const CUSTOMERS = ['Lucía Fernández', 'Martín Gómez', 'Sofía Herrera', 'Tomás Ruiz', 'Valentina Díaz', 'Joaquín Romero'];
/** Status, how many minutes ago, delivery or pickup. */
const SAMPLE_ORDERS: [OrderStatus, number, 'delivery' | 'pickup'][] = [
  ['pending', 4, 'pickup'],
  ['accepted', 25, 'delivery'],
  ['preparing', 50, 'pickup'],
  ['completed', 60 * 26, 'delivery'],
  ['rejected', 60 * 30, 'pickup'],
];
const PATHS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['pending'],
  accepted: ['pending', 'accepted'],
  preparing: ['pending', 'accepted', 'preparing'],
  ready: ['pending', 'accepted', 'preparing', 'ready'],
  out_for_delivery: ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery'],
  completed: ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'],
  rejected: ['pending', 'rejected'],
  cancelled: ['pending', 'cancelled'],
};

/** A few orders in different statuses for the first sample businesses (only those without orders). */
export async function seedOrders(limit = 8) {
  const businesses = await Business.findAll({ where: { slug: readSeed('businesses.json').map((b: { slug: string }) => b.slug) }, include: [Product], order: [['name', 'ASC']], limit });
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
      const path = fulfillment === 'pickup' ? PATHS[status].filter((s) => s !== 'out_for_delivery') : PATHS[status];
      await Order.create({
        publicCode: newPublicCode(),
        number: n + 1,
        businessId: business.id,
        items,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        fulfillment,
        deliveryAddress: fulfillment === 'delivery' ? `${['Thames', 'Gurruchaga', 'Malabia', 'Armenia'][n % 4]} ${1200 + n * 37}` : null,
        paymentMethod: business.paymentMethods[n % business.paymentMethods.length],
        customerName: CUSTOMERS[(index + n) % CUSTOMERS.length],
        customerPhone: null,
        notes: n === 0 ? 'Si pueden, sin cebolla. Gracias.' : null,
        status,
        statusHistory: path.map((s, i) => ({
          status: s,
          at: new Date(createdAt.getTime() + i * 8 * 60_000).toISOString(),
          by: i === 0 ? 'customer' : 'business',
          ...(s === 'rejected' && { reason: 'Nos quedamos sin stock de uno de los productos.' }),
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

export const seedContactMessages = () => ContactMessage.bulkCreate(readSeed('contact-messages.json'));

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

  await seedContactMessages();
  await seedOrders();

  return { businesses: businesses.length, products: productCount, accounts: businesses.map((b) => `${b.owner.email} (${b.name})`) };
}
