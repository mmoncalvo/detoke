// Orders placed from this browser, so the customer can follow them without an account.
import type { Order, OrderStatus } from '../../shared/orders.js';

export const RECENT_ORDERS_KEY = 'detoke.recentOrders';
const CHANGE_EVENT = 'detoke:recent-orders';
export const MAX_RECENT_ORDERS = 20;
/** Delivered or cancelled orders leave the list after this long. */
export const KEEP_FINISHED_MS = 2 * 24 * 60 * 60 * 1000;

export interface RecentOrder {
  publicCode: string;
  number: number;
  businessId: string;
  businessName: string;
  businessSlug: string;
  businessWhatsapp: string;
  /** Public link of the order, the same one sent by WhatsApp. */
  url: string;
  total: number;
  createdAt: string;
  items: { productId: string; name: string; quantity: number }[];
  /** Last status seen, and when it changed. */
  status: OrderStatus;
  updatedAt: string;
}

/** What is kept of an order just placed. */
export function toRecentOrder(order: Order, business: { id: string; name: string; slug: string; whatsapp: string }, url: string): RecentOrder {
  return {
    publicCode: order.publicCode,
    number: order.number,
    businessId: business.id,
    businessName: business.name,
    businessSlug: business.slug,
    businessWhatsapp: business.whatsapp,
    url,
    total: order.total,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
    status: order.status,
    updatedAt: order.updatedAt,
  };
}

const FINISHED: OrderStatus[] = ['completed', 'cancelled'];

export const isActive = (order: Pick<RecentOrder, 'status'>) => !FINISHED.includes(order.status);

/** Newest first, without duplicates, at most MAX_RECENT_ORDERS. */
export function addRecentOrder(list: RecentOrder[], order: RecentOrder): RecentOrder[] {
  return [order, ...list.filter((o) => o.publicCode !== order.publicCode)].slice(0, MAX_RECENT_ORDERS);
}

/** Records the latest status the server reported. */
export function updateRecentOrder(list: RecentOrder[], code: string, status: OrderStatus, updatedAt: string): RecentOrder[] {
  return list.map((o) => (o.publicCode === code && (o.status !== status || o.updatedAt !== updatedAt) ? { ...o, status, updatedAt } : o));
}

/** Takes orders off this device's list (the orders themselves stay on the server). */
export function removeRecentOrders(list: RecentOrder[], codes: string[]): RecentOrder[] {
  return list.filter((o) => !codes.includes(o.publicCode));
}

/** Drops orders the server no longer has and finished ones older than two days. */
export function pruneRecentOrders(list: RecentOrder[], now = Date.now(), missing: string[] = []): RecentOrder[] {
  return list.filter((o) => !missing.includes(o.publicCode) && (isActive(o) || now - new Date(o.updatedAt).getTime() < KEEP_FINISHED_MS));
}

// ------------------------------------------------------------------ storage
export function readRecentOrders(): RecentOrder[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_ORDERS_KEY) ?? '[]');
    return Array.isArray(parsed) ? pruneRecentOrders(parsed) : [];
  } catch {
    return [];
  }
}

export function writeRecentOrders(change: (list: RecentOrder[]) => RecentOrder[]) {
  try {
    const before = localStorage.getItem(RECENT_ORDERS_KEY) ?? '[]';
    const next = JSON.stringify(change(readRecentOrders()));
    if (next === before) return;
    localStorage.setItem(RECENT_ORDERS_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* storage not available: the list lasts for this page only */
  }
}

/** Subscribes to changes from this tab and from other tabs. */
export function onRecentOrdersChange(listener: () => void) {
  const storage = (e: StorageEvent) => e.key === RECENT_ORDERS_KEY && listener();
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', storage);
  };
}
