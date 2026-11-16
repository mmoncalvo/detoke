import { useEffect, useRef } from 'react';
import type { Order } from '@shared/orders';
import type { CartLine, Product, User } from '@shared/types';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useCart, type CartItem } from '@/context/CartContext';
import { readCustomer, writeCustomer, CUSTOMER_KEY, type CustomerDetails } from '@/lib/customer';
import { CART_KEY, takeGuestData } from '@/lib/guestData';
import { addRecentOrder, readRecentOrders, toRecentOrder, writeRecentOrders, RECENT_ORDERS_KEY, type RecentOrder } from '@/lib/recentOrders';

const CHECKOUT_SENT_KEY = 'detoke.checkoutSent';

/** Joins the browser's cart and the account's, by product. */
function mergeCarts(local: CartItem[], saved: { product: Product; quantity: number }[]): CartItem[] {
  const merged = new Map(local.map((item) => [item.id, { ...item }]));
  for (const { product, quantity } of saved) {
    const current = merged.get(product.id);
    // The larger amount, not the sum: the visitor's cart comes back on sign-out and may be brought in again.
    if (current) current.quantity = Math.min(99, Math.max(current.quantity, quantity));
    else if (product.business) merged.set(product.id, { id: product.id, name: product.name, price: product.price, image: product.images[0] ?? null, quantity, business: product.business });
  }
  return [...merged.values()];
}

const toLines = (items: CartItem[]): CartLine[] => items.map((item) => ({ productId: item.id, quantity: item.quantity }));

/**
 * What a visitor kept in this browser becomes theirs when they sign in or create an account:
 * the orders they placed are attached to the account, the cart is merged with the saved one, and the
 * checkout details fill the profile's blanks. From then on the cart is saved in the account.
 * Signing out clears the account's data from the browser, so a shared device does not mix accounts,
 * and gives back what the visitor had before signing in (see guestData).
 */
export function AccountSync() {
  const { user, impersonatedBy, setUser } = useAuth();
  const { items, replace } = useCart();
  const syncedFor = useRef<string | null>(null);
  const ready = useRef(false);
  const previousUser = useRef<User | null>(null);
  const buyer = user && user.role !== 'admin' && !impersonatedBy ? user : null;

  // Sign-in: bring this browser's data into the account, once per account.
  useEffect(() => {
    if (!buyer || syncedFor.current === buyer.id) return;
    syncedFor.current = buyer.id;
    ready.current = false;
    void (async () => {
      try {
        const codes = readRecentOrders().map((o) => o.publicCode);
        if (codes.length) await api('/orders/claim', { method: 'POST', body: { codes } });
        const orders = await api<Order[]>('/orders/customer');
        writeRecentOrders((list) => orders.reduceRight((acc, order) => order.business
          ? addRecentOrder(acc, toRecentOrder(order, { id: order.businessId, name: order.business.name, slug: order.business.slug, whatsapp: order.business.whatsapp }, `${window.location.origin}/pedido/${order.publicCode}`))
          : acc, list));

        const saved = await api<{ product: Product; quantity: number }[]>('/auth/me/cart');
        const merged = mergeCarts(items, saved);
        replace(merged);
        await api('/auth/me/cart', { method: 'PUT', body: { items: toLines(merged) } });

        // Checkout details fill what the profile is missing, and the profile fills the checkout.
        const local = readCustomer();
        const patch = { phone: buyer.phone || local.phone || null, address: buyer.address || local.address || null };
        if (patch.phone !== buyer.phone || patch.address !== (buyer.address ?? null)) {
          setUser(await api<User>('/auth/me', { method: 'PATCH', body: { name: buyer.name, email: buyer.email, ...patch } }));
        }
        writeCustomer({ name: local.name || buyer.name, phone: patch.phone ?? '', address: patch.address ?? '' });
      } catch {
        /* the next sign-in tries again */
        syncedFor.current = null;
      } finally {
        ready.current = true;
      }
    })();
  }, [buyer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Signed in: every change of the cart is saved in the account (shortly after, in one request).
  useEffect(() => {
    if (!buyer || !ready.current) return;
    const timer = setTimeout(() => void api('/auth/me/cart', { method: 'PUT', body: { items: toLines(items) } }).catch(() => undefined), 600);
    return () => clearTimeout(timer);
  }, [items, buyer]);

  // Sign-out: this account's cart, orders and details leave the browser, and the visitor's come back.
  useEffect(() => {
    if (previousUser.current && !user) {
      const guest = takeGuestData();
      const parse = <T,>(key: string, fallback: T): T => {
        try {
          return JSON.parse(guest?.[key] ?? 'null') ?? fallback;
        } catch {
          return fallback;
        }
      };
      replace(parse<CartItem[]>(CART_KEY, []));
      writeRecentOrders(() => parse<RecentOrder[]>(RECENT_ORDERS_KEY, []));
      for (const key of [CUSTOMER_KEY, CHECKOUT_SENT_KEY]) {
        try {
          (key === CHECKOUT_SENT_KEY ? sessionStorage : localStorage).removeItem(key);
        } catch {
          /* storage not available */
        }
      }
      const customer = parse<CustomerDetails | null>(CUSTOMER_KEY, null);
      if (customer) writeCustomer(customer);
      syncedFor.current = null;
    }
    previousUser.current = user;
  }, [user, replace]);

  return null;
}
