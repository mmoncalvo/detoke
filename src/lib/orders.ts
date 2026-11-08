import { formatPrice } from '@/lib/format';
import { STATUS_TONES, type Order, type OrderStatus } from '@shared/orders';

const relative = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
const dateTime = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "hace 5 minutos", "ayer"... */
export function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 60) return 'recién';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  return relative.format(Math.round(seconds / 86400), 'day');
}

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const statusVariant = (status: OrderStatus) => STATUS_TONES[status];

export const itemsSummary = (order: Pick<Order, 'items'>) => order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');
export const itemCount = (order: { items: { quantity: number }[] }) => order.items.reduce((sum, i) => sum + i.quantity, 0);

/** Short WhatsApp message: the order lives at its link. */
export function orderMessage(businessName: string, order: { number: number; total: number; items: { quantity: number }[] }, url: string) {
  const count = itemCount(order);
  return [
    `¡Hola ${businessName}! Te hice un pedido por Detoke.`,
    `*Pedido #${order.number}* · ${count} ${count === 1 ? 'producto' : 'productos'} · Total ${formatPrice(order.total)}`,
    '',
    `Mirá el detalle y confirmalo acá: ${url}`,
  ].join('\n');
}
