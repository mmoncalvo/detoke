import { describe, expect, it } from 'vitest';
import { addRecentOrder, KEEP_FINISHED_MS, MAX_RECENT_ORDERS, pruneRecentOrders, updateRecentOrder, type RecentOrder } from '../src/lib/recentOrders.js';

const order = (code: string, extra: Partial<RecentOrder> = {}): RecentOrder => ({
  publicCode: code, number: 1, businessId: 'b', businessName: 'Negocio', businessSlug: 'negocio', businessWhatsapp: '5491100000000', url: 'http://localhost/pedido/x',
  total: 1000, createdAt: '2026-11-07T10:00:00.000Z', items: [], status: 'pending', updatedAt: '2026-11-07T10:00:00.000Z', ...extra,
});

describe('recent orders', () => {
  it('adds newest first, without duplicates and up to the limit', () => {
    let list: RecentOrder[] = [];
    for (let i = 0; i < MAX_RECENT_ORDERS + 5; i += 1) list = addRecentOrder(list, order(`c${i}`));
    expect(list).toHaveLength(MAX_RECENT_ORDERS);
    expect(list[0].publicCode).toBe(`c${MAX_RECENT_ORDERS + 4}`);
    expect(addRecentOrder(list, order('c24', { total: 5 })).filter((o) => o.publicCode === 'c24')).toHaveLength(1);
  });

  it('updates the status of one order only', () => {
    const list = updateRecentOrder([order('a'), order('b')], 'b', 'confirmed', '2026-11-07T11:00:00.000Z');
    expect(list.map((o) => o.status)).toEqual(['pending', 'confirmed']);
  });

  it('drops missing orders and finished ones older than two days', () => {
    const now = new Date('2026-11-10T10:00:00.000Z').getTime();
    const old = new Date(now - KEEP_FINISHED_MS - 1000).toISOString();
    const recent = new Date(now - 1000).toISOString();
    const list = [
      order('active-old', { status: 'confirmed', updatedAt: old }),
      order('done-old', { status: 'completed', updatedAt: old }),
      order('cancelled-recent', { status: 'cancelled', updatedAt: recent }),
      order('gone'),
    ];
    expect(pruneRecentOrders(list, now, ['gone']).map((o) => o.publicCode)).toEqual(['active-old', 'cancelled-recent']);
  });
});
