import { beforeAll, describe, expect, it } from 'vitest';
import { formatMoney } from '../shared/money.js';
import { Business, BusinessCategory, Order, Product, User } from '../server/models/index.js';
import { refreshDemo, seed } from '../server/services/seed.js';

describe('demo data', () => {
  beforeAll(async () => {
    await seed();
  }, 60_000);

  it('reloads only the demo accounts and keeps real ones with their business and orders', async () => {
    const category = await BusinessCategory.findOne({ where: { slug: 'pizzeria' } });
    const owner = await User.create({ email: 'real@gmail.com', name: 'Dueña real' });
    const business = await Business.create({ name: 'Negocio real', slug: 'negocio-real', ownerId: owner.id, businessCategoryId: category!.id, whatsapp: '59899000000' });
    const product = await Product.create({ businessId: business.id, name: 'Pizza real', slug: 'pizza-real', price: 500 });
    await Order.create({ publicCode: 'REALORDER001', number: 1, businessId: business.id, items: [], subtotal: 500, deliveryFee: 0, total: 500, fulfillment: 'pickup', paymentMethod: 'cash', customerName: 'Cliente', status: 'pending', statusHistory: [] });
    const tito = await Business.findOne({ where: { slug: 'lo-de-tito' } });

    const result = await refreshDemo();

    expect(result.businesses).toBe(30);
    expect(await User.count({ where: { email: 'real@gmail.com' } })).toBe(1);
    expect((await Business.findByPk(business.id))?.businessCategoryId).toBe(category!.id);
    expect(await Product.count({ where: { id: product.id } })).toBe(1);
    expect(await Order.count({ where: { businessId: business.id } })).toBe(1);
    // Demo businesses keep their id and land in Uruguay, with prices in pesos uruguayos.
    const refreshed = await Business.findOne({ where: { slug: 'lo-de-tito' } });
    expect(refreshed?.id).toBe(tito?.id);
    expect(refreshed).toMatchObject({ city: 'Montevideo', neighborhood: 'Pocitos', province: 'Montevideo' });
    const muzza = await Product.findOne({ where: { slug: 'pizza-muzzarella-lo-de-tito' } });
    expect(muzza?.price).toBeGreaterThanOrEqual(400);
    expect(muzza?.price).toBeLessThanOrEqual(700);
    expect(await Business.count()).toBe(31);
  }, 60_000);

  it('formats Uruguayan pesos without decimals for whole amounts', () => {
    expect(formatMoney(450).replace(/\s/g, ' ')).toBe('$ 450');
    expect(formatMoney(12500).replace(/\s/g, ' ')).toBe('$ 12.500');
    expect(formatMoney(99.5).replace(/\s/g, ' ')).toBe('$ 99,50');
  });
});
