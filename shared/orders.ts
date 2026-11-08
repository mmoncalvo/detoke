// Orders: statuses, the transitions between them and their labels.
import type { DeliveryOption, PaymentMethod } from './business.js';

export const ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'rejected', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses that end the order. */
export const FINAL_STATUSES: OrderStatus[] = ['completed', 'rejected', 'cancelled'];
export const ACTIVE_STATUSES: OrderStatus[] = ['accepted', 'preparing', 'ready', 'out_for_delivery'];

/** Next statuses the business can move an order to. */
export function nextStatuses(status: OrderStatus, fulfillment: DeliveryOption): OrderStatus[] {
  switch (status) {
    case 'pending':
      return ['accepted', 'rejected'];
    case 'accepted':
      return ['preparing', 'cancelled'];
    case 'preparing':
      return ['ready', 'cancelled'];
    case 'ready':
      return fulfillment === 'delivery' ? ['out_for_delivery', 'cancelled'] : ['completed', 'cancelled'];
    case 'out_for_delivery':
      return ['completed', 'cancelled'];
    default:
      return [];
  }
}

export const canTransition = (from: OrderStatus, to: OrderStatus, fulfillment: DeliveryOption) => nextStatuses(from, fulfillment).includes(to);

/** What the customer sees for each status. */
export function statusLabel(status: OrderStatus, fulfillment: DeliveryOption) {
  const labels: Record<OrderStatus, string> = {
    pending: 'Recibido',
    accepted: 'Confirmado',
    preparing: 'En preparación',
    ready: fulfillment === 'delivery' ? 'Listo para enviar' : 'Listo para retirar',
    out_for_delivery: 'En camino',
    completed: 'Entregado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
  };
  return labels[status];
}

/** Button text for the business, by the status it moves the order to. */
export function actionLabel(status: OrderStatus, fulfillment: DeliveryOption) {
  const labels: Record<OrderStatus, string> = {
    pending: 'Recibido',
    accepted: 'Aceptar pedido',
    preparing: 'Empezar a preparar',
    ready: fulfillment === 'delivery' ? 'Listo para enviar' : 'Listo para retirar',
    out_for_delivery: 'Salió para entregar',
    completed: fulfillment === 'delivery' ? 'Marcar entregado' : 'Marcar retirado',
    rejected: 'Rechazar',
    cancelled: 'Cancelar pedido',
  };
  return labels[status];
}

/** The happy path, for the timeline. */
export const statusSteps = (fulfillment: DeliveryOption): OrderStatus[] =>
  fulfillment === 'delivery' ? ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'] : ['pending', 'accepted', 'preparing', 'ready', 'completed'];

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  image: string | null;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  at: string;
  by: 'customer' | 'business' | 'admin';
  reason?: string | null;
}

export interface OrderBusiness {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  whatsapp: string;
  address: string | null;
}

export interface Order {
  id: string;
  publicCode: string;
  number: number;
  businessId: string;
  business?: OrderBusiness;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  fulfillment: DeliveryOption;
  deliveryAddress: string | null;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string | null;
  notes: string | null;
  status: OrderStatus;
  statusHistory: OrderHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

/** An order as the public page gets it, plus whether the viewer can change its status. */
export interface OrderView extends Order {
  canManage: boolean;
}
