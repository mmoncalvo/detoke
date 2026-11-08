import crypto from 'node:crypto';
import type { Order as OrderDTO } from '../../shared/orders.js';
import { Business, Order } from '../models/index.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** 12 URL-safe characters without look-alikes: about 70 bits, not guessable. */
export function newPublicCode() {
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs order creations one after another in this process. SQLite allows a single writer,
 * so simultaneous orders would fail with SQLITE_BUSY; it also lets a repeated request see
 * the order the previous one just created.
 */
export function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export const ORDER_BUSINESS_ATTRIBUTES = ['id', 'name', 'slug', 'logo', 'whatsapp', 'address'];

export const orderJson = (order: Order) => order.toJSON() as OrderDTO;

export const withBusiness = (id: string) => Order.findByPk(id, { include: [{ model: Business, attributes: ORDER_BUSINESS_ATTRIBUTES }] });
