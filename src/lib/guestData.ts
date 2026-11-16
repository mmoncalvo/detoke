// What a visitor kept in this browser before signing in, set aside so it comes back when they sign out.
import { CUSTOMER_KEY } from './customer.js';
import { RECENT_ORDERS_KEY } from './recentOrders.js';

export const CART_KEY = 'detoke.cart';
export const GUEST_DATA_KEY = 'detoke.guestData';
const GUEST_KEYS = [CART_KEY, RECENT_ORDERS_KEY, CUSTOMER_KEY];

/** Copies the visitor's cart, orders and checkout details aside. The account still gets them as before. */
export function saveGuestData() {
  try {
    const saved = Object.fromEntries(GUEST_KEYS.map((key) => [key, localStorage.getItem(key)]));
    localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(saved));
  } catch {
    /* storage not available */
  }
}

/** Returns the copy set aside at sign-in and forgets it, or null if there is none. */
export function takeGuestData(): Record<string, string | null> | null {
  try {
    const raw = localStorage.getItem(GUEST_DATA_KEY);
    localStorage.removeItem(GUEST_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
