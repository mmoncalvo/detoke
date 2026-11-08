import { FINAL_STATUSES, type Order, type OrderStatus } from '@shared/orders';

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

export const statusVariant = (status: OrderStatus) =>
  status === 'pending' ? 'warning' : status === 'completed' ? 'success' : FINAL_STATUSES.includes(status) ? 'danger' : 'accent';

export const itemsSummary = (order: Pick<Order, 'items'>) => order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');
export const itemCount = (order: Pick<Order, 'items'>) => order.items.reduce((sum, i) => sum + i.quantity, 0);
