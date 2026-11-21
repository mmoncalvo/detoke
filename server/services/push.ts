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

/** Sends to each subscription; the ones the browser dropped (404/410) are deleted. */
async function send(subscriptions: PushSubscription[], payload: PushPayload) {
  if (!subscriptions.length) return;
  const { publicKey, privateKey } = await vapidKeys();
  const body = JSON.stringify(payload);
  await Promise.all(subscriptions.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
        vapidDetails: { subject: subject(), publicKey, privateKey },
        TTL: 60 * 60 * 24,
        urgency: 'high',
      });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await s.destroy();
      else console.error('[push] Could not send a notification:', status ?? err);
    }
  }));
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
