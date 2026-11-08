// Orders: statuses, the transitions between them and their labels.
import type { DeliveryOption, PaymentMethod } from './business.js';

export const ORDER_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses that end the order. */
export const FINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled'];

/** Kept short on purpose: new, confirmed, delivered. Cancelling is a way out, not a step. */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case 'pending':
      // Straight to delivered too, for orders picked up on the spot.
      return ['confirmed', 'completed', 'cancelled'];
    case 'confirmed':
      return ['completed', 'cancelled'];
    default:
      return [];
  }
}

export const canTransition = (from: OrderStatus, to: OrderStatus) => nextStatuses(from).includes(to);

/** The customer reads "Recibido" where the business reads "Nuevo". */
export function statusLabel(status: OrderStatus, audience: 'customer' | 'business' = 'customer') {
  const labels: Record<OrderStatus, string> = {
    pending: audience === 'business' ? 'Nuevo' : 'Recibido',
    confirmed: 'Confirmado',
    completed: 'Entregado',
    cancelled: 'Cancelado',
  };
  return labels[status];
}

/** Color of each status, the same in every view (badge variants of the web app). */
export const STATUS_TONES: Record<OrderStatus, 'warning' | 'accent' | 'success' | 'danger'> = {
  pending: 'warning',
  confirmed: 'accent',
  completed: 'success',
  cancelled: 'danger',
};

/** Button text for the business, by the status it moves the order to. */
export function actionLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    pending: 'Nuevo',
    confirmed: 'Confirmar pedido',
    completed: 'Marcar como entregado',
    cancelled: 'Cancelar',
  };
  return labels[status];
}

/** The steps of the timeline. Cancelled is shown apart. */
export const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'completed'];

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
