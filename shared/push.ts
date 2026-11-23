// System notifications (Web Push): what the server sends and the service worker shows.
import { statusLabel, type Order, type OrderStatus } from './orders.js';
import { formatMoney } from './money.js';

export interface PushPayload {
  title: string;
  body: string;
  /** Page opened when the notification is clicked (a path of the web app). */
  url: string;
  /** Notifications with the same tag replace each other instead of piling up. */
  tag: string;
}

// Short on purpose: a title and one line. Each status has its own tag, so every change is a new
// notification instead of replacing the previous one.

/** To the business owner when a customer places an order. */
export function newOrderPush(order: Pick<Order, 'id' | 'number' | 'total' | 'customerName'>): PushPayload {
  return {
    title: `Nuevo pedido #${order.number}`,
    body: `${order.customerName} · ${formatMoney(order.total)}`,
    url: '/dashboard/orders',
    tag: `order-${order.id}-pending`,
  };
}

/** To the business owner when the customer cancels an order. */
export function customerCancelledPush(order: Pick<Order, 'id' | 'number' | 'customerName'>): PushPayload {
  return {
    title: `Pedido #${order.number}: Cancelado`,
    body: `${order.customerName} lo canceló.`,
    url: '/dashboard/orders',
    tag: `order-${order.id}-cancelled`,
  };
}

/** To the customer when the business moves their order to another status. */
export function statusPush(order: Pick<Order, 'id' | 'number' | 'publicCode' | 'statusHistory'> & { status: OrderStatus; business?: { name: string } }): PushPayload {
  const name = order.business?.name ?? 'El negocio';
  const reason = order.statusHistory.at(-1)?.reason;
  const bodies: Record<OrderStatus, string> = {
    pending: `${name} recibió tu pedido.`,
    confirmed: `${name} confirmó tu pedido.`,
    completed: `${name} finalizó tu pedido.`,
    cancelled: reason ? `${name}: ${reason}` : `${name} canceló tu pedido.`,
  };
  return {
    title: `Pedido #${order.number}: ${statusLabel(order.status)}`,
    body: bodies[order.status],
    url: `/pedido/${order.publicCode}`,
    tag: `order-${order.id}-${order.status}`,
  };
}
