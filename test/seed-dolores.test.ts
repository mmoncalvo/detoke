import { beforeAll, describe, expect, it } from 'vitest';
import { Business, Product, User } from '../server/models/index.js';
import { seed } from '../server/services/seed.js';

describe('Dolores business set', () => {
  beforeAll(async () => {
    await seed('dolores');
  }, 60_000);

  it('loads the real businesses of Dolores instead of the demo ones', async () => {
    const businesses = await Business.findAll();
    expect(businesses.length).toBe(40);
    expect(businesses.every((b) => b.city === 'Dolores' && b.province === 'Soriano')).toBe(true);
    expect(await Business.count({ where: { slug: 'lo-de-tito' } })).toBe(0);
    // Test orders go to the demo WhatsApp, never to the real business.
    expect(new Set(businesses.map((b) => b.whatsapp))).toEqual(new Set(['59899760994']));
    expect(await Product.count()).toBeGreaterThan(300);
    expect(await User.count({ where: { email: 'saday-pizzas@detoke.test' } })).toBe(1);
  }, 60_000);
});
