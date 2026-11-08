import { ChevronRight, Loader2, MessageCircle, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { statusLabel, type Order } from '@shared/orders';
import type { Product } from '@shared/types';
import { api, ApiError } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useRoom, useSocketEvent } from '@/hooks/useRealtime';
import { formatPrice, whatsappUrl } from '@/lib/format';
import { itemCount, orderMessage, statusVariant, timeAgo } from '@/lib/orders';
import { isActive, pruneRecentOrders, updateRecentOrder, writeRecentOrders, type RecentOrder } from '@/lib/recentOrders';

/** Keeps the stored status in line with the server: on mount, live, and after a reconnection. */
function useLiveStatus(order: RecentOrder) {
  const code = order.publicCode;
  const save = useCallback((o: Pick<Order, 'status' | 'updatedAt'>) => writeRecentOrders((list) => updateRecentOrder(list, code, o.status, o.updatedAt)), [code]);
  const refresh = useCallback(() => {
    api<Order>(`/orders/public/${code}`)
      .then(save)
      .catch((err) => {
        // The order no longer exists: it leaves the list.
        if (err instanceof ApiError && err.status === 404) writeRecentOrders((list) => pruneRecentOrders(list, Date.now(), [code]));
      });
  }, [code, save]);

  useEffect(refresh, [refresh]);
  useRoom('order', isActive(order) ? code : null, refresh);
  useSocketEvent('order:updated', (o) => {
    if (o.publicCode === code) save(o);
  });
}

/** Adds the items of a past order again, with today's prices and only what is still available. */
function useRepeatOrder() {
  const { add, setOpen } = useCart();
  const [repeating, setRepeating] = useState<string | null>(null);

  const repeat = async (order: RecentOrder, after?: () => void) => {
    setRepeating(order.publicCode);
    try {
      const products = await api<Product[]>(`/products?businessId=${encodeURIComponent(order.businessId)}`);
      const byId = new Map(products.map((p) => [p.id, p]));
      const missing: string[] = [];
      let added = 0;
      for (const item of order.items) {
        const product = byId.get(item.productId);
        const quantity = product ? Math.min(item.quantity, product.stock ?? item.quantity) : 0;
        if (!product?.business || quantity <= 0) {
          missing.push(item.name);
          continue;
        }
        add(product, product.business, quantity);
        added += 1;
      }
      if (!added) {
        toast.error('Ninguno de esos productos está disponible ahora');
        return;
      }
      if (missing.length) toast.warning(`No están disponibles: ${missing.join(', ')}`);
      else toast.success('Agregamos el pedido al carrito con los precios de hoy');
      after?.();
      setOpen(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRepeating(null);
    }
  };

  return { repeat, repeating };
}

function RecentOrderCard({ order, onNavigate, repeat, repeating }: { order: RecentOrder; onNavigate?: () => void; repeat: (o: RecentOrder, after?: () => void) => void; repeating: boolean }) {
  useLiveStatus(order);
  const count = itemCount(order);
  const resend = () => window.open(whatsappUrl(order.businessWhatsapp, orderMessage(order.businessName, order, order.url)), '_blank', 'noopener');

  return (
    <li className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{order.businessName}</p>
          <p className="text-xs text-muted-foreground">Pedido #{order.number} · {count} {count === 1 ? 'producto' : 'productos'} · {formatPrice(order.total)} · {timeAgo(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariant(order.status)} className="shrink-0">{statusLabel(order.status)}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2"><Link to={`/pedido/${order.publicCode}`} onClick={onNavigate}><ChevronRight /> Ver pedido</Link></Button>
        {order.status === 'pending' && <Button variant="ghost" size="sm" className="h-8 px-2" onClick={resend}><MessageCircle /> Reenviar por WhatsApp</Button>}
        <Button variant="ghost" size="sm" className="h-8 px-2" disabled={repeating} onClick={() => repeat(order)}>{repeating ? <Loader2 className="animate-spin" /> : <RotateCcw />} Repetir pedido</Button>
      </div>
    </li>
  );
}

/** List of orders placed from this browser, each with its live status. */
export function RecentOrderList({ orders, onNavigate }: { orders: RecentOrder[]; onNavigate?: () => void }) {
  const { repeat, repeating } = useRepeatOrder();
  return (
    <ul className="space-y-2">
      {orders.map((order) => <RecentOrderCard key={order.publicCode} order={order} onNavigate={onNavigate} repeat={repeat} repeating={repeating === order.publicCode} />)}
    </ul>
  );
}

/** Discreet "Pedidos en curso" block for the cart and the checkout. */
export function OrdersInProgress({ orders, onNavigate, className = '' }: { orders: RecentOrder[]; onNavigate?: () => void; className?: string }) {
  const active = orders.filter(isActive);
  if (!active.length) return null;
  return (
    <section aria-label="Pedidos en curso" className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Pedidos en curso</h2>
        <Link to="/mis-pedidos" onClick={onNavigate} className="text-xs text-muted-foreground hover:text-foreground hover:underline">Ver todos</Link>
      </div>
      <RecentOrderList orders={active} onNavigate={onNavigate} />
    </section>
  );
}
