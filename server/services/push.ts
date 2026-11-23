// System notifications with Web Push: they reach the browser even with Detoke closed. The keys (VAPID)
// come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, or are generated once and kept in app_settings.
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import webpush from 'web-push';
import type { Order as OrderDTO } from '../../shared/orders.js';
import { customerCancelledPush, newOrderPush, statusPush, type PushPayload } from '../../shared/push.js';
import { config } from '../config.js';
import { AppSetting, Business, Order, PushOrderFollow, PushSubscription } from '../models/index.js';

const KEYS_SETTING = 'vapidKeys';

type VapidKeys = { publicKey: string; privateKey: string };
let keys: Promise<VapidKeys> | null = null;

async function loadKeys(): Promise<VapidKeys> {
  if (config.push.publicKey && config.push.privateKey) return { publicKey: config.push.publicKey, privateKey: config.push.privateKey };
  const saved = await AppSetting.findByPk(KEYS_SETTING);
  if (saved) return JSON.parse(saved.value) as VapidKeys;
  const fresh = webpush.generateVAPIDKeys();
  // Two processes starting at once: the first one wins and the other reads its keys.
  const [row] = await AppSetting.findOrCreate({ where: { key: KEYS_SETTING }, defaults: { key: KEYS_SETTING, value: JSON.stringify(fresh) } });
  return JSON.parse(row.value) as VapidKeys;
}

export function vapidKeys() {
  keys ??= loadKeys().catch((err) => {
    keys = null;
    throw err;
  });
  return keys;
}

/** After a database reset (tests, seed) the stored keys are gone. */
export function forgetVapidKeys() {
  keys = null;
}

// The push services ask for a contact: the public https address, or an email.
const subject = () => (config.appUrl.startsWith('https://') ? config.appUrl : `mailto:${config.contact.email ?? 'hola@detoke.test'}`);

const host = (endpoint: string) => {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'unknown';
  }
};

/**
 * Sends to each subscription and returns how many the push service accepted. Subscriptions it no longer
 * knows (404/410) or that were made with another key (401/403, after a database reset) are deleted:
 * the browser makes a new one the next time Detoke opens there.
 */
export async function send(subscriptions: PushSubscription[], payload: PushPayload, label = payload.title) {
  if (!subscriptions.length) {
    if (!config.isTest) console.log(`[push] ${label}: nobody to notify`);
    return 0;
  }
  const { publicKey, privateKey } = await vapidKeys();
  const body = JSON.stringify(payload);
  const results = await Promise.all(subscriptions.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
        vapidDetails: { subject: subject(), publicKey, privateKey },
        TTL: 60 * 60 * 24,
        urgency: 'high',
      });
      return true;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status && [401, 403, 404, 410].includes(status)) {
        await PushOrderFollow.destroy({ where: { subscriptionId: s.id } });
        await s.destroy();
      }
      console.error(`[push] ${label}: ${host(s.endpoint)} refused it (${status ?? (err as Error).message})${status && [401, 403, 404, 410].includes(status) ? ', subscription removed' : ''}`);
      return false;
    }
  }));
  const sent = results.filter(Boolean).length;
  if (!config.isTest) console.log(`[push] ${label}: sent to ${sent} of ${subscriptions.length}`);
  return sent;
}

const pending = new Set<Promise<unknown>>();

/** Never lets a notification failure break the request that caused it. */
function quietly(task: Promise<unknown>) {
  const tracked = task.catch((err) => console.error('[push]', err)).finally(() => pending.delete(tracked));
  pending.add(tracked);
}

/** Waits for the notifications being sent (tests). */
export const flushPush = () => Promise.all([...pending]);

/** New order: to the browsers where the owner of the business is signed in. */
export function pushOrderCreated(order: OrderDTO) {
  quietly((async () => {
    const business = await Business.findByPk(order.businessId, { attributes: ['ownerId'] });
    if (!business) return;
    await send(await PushSubscription.findAll({ where: { userId: business.ownerId } }), newOrderPush(order));
  })());
}

/**
 * Status change: the business's changes go to the customer (their account's browsers and the ones
 * following the order by code); a cancellation by the customer goes to the business.
 */
export function pushOrderUpdated(order: OrderDTO) {
  quietly((async () => {
    const last = order.statusHistory.at(-1);
    if (last?.by === 'customer') {
      if (order.status !== 'cancelled') return;
      const business = await Business.findByPk(order.businessId, { attributes: ['ownerId'] });
      if (business) await send(await PushSubscription.findAll({ where: { userId: business.ownerId } }), customerCancelledPush(order));
      return;
    }
    const row = await Order.findByPk(order.id, { attributes: ['customerUserId'] });
    const follows = await PushOrderFollow.findAll({ where: { orderCode: order.publicCode }, attributes: ['subscriptionId'] });
    const or: WhereOptions[] = [];
    if (row?.customerUserId) or.push({ userId: row.customerUserId });
    if (follows.length) or.push({ id: follows.map((f) => f.subscriptionId) });
    if (!or.length) return;
    // The owner never gets their own changes back, even on a browser that also follows the order.
    const ownerId = (await Business.findByPk(order.businessId, { attributes: ['ownerId'] }))?.ownerId;
    const subscriptions = await PushSubscription.findAll({ where: { [Op.or]: or } });
    await send(subscriptions.filter((s) => !ownerId || s.userId !== ownerId), statusPush(order));
  })());
}

/** Deleting an account: its browsers stop receiving its notifications. */
export async function removeUserPush(userId: string, transaction?: Transaction) {
  const rows = await PushSubscription.findAll({ where: { userId }, attributes: ['id'], transaction });
  if (!rows.length) return;
  await PushOrderFollow.destroy({ where: { subscriptionId: rows.map((r) => r.id) }, transaction });
  await PushSubscription.destroy({ where: { userId }, transaction });
}
