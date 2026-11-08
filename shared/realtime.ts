// Socket.IO events, shared by the server and the web app.
import type { Order } from './orders.js';

export type JoinResult = { ok: true } | { ok: false; error: string };

export interface ServerToClientEvents {
  /** To business:{id} when a customer places an order. */
  'order:created': (order: Order) => void;
  /** To business:{id} and order:{code} when the status changes. */
  'order:updated': (order: Order) => void;
}

export interface ClientToServerEvents {
  /** Needs a token whose user owns the business (or an admin). */
  'business:join': (businessId: string, ack: (result: JoinResult) => void) => void;
  /** Anyone with the order's code can follow it, read only. */
  'order:join': (code: string, ack: (result: JoinResult) => void) => void;
  'order:leave': (code: string) => void;
}
