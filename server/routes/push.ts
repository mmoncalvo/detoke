import { Router, type Request } from 'express';
import jwt from 'jsonwebtoken';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '../../shared/schemas.js';
import { config } from '../config.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { optionalUser } from '../middleware/requireAuth.js';
import { Order, PushOrderFollow, PushSubscription } from '../models/index.js';
import { vapidKeys } from '../services/push.js';
import { ok } from '../services/response.js';

export const pushRoutes = Router();

const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: config.isTest ? 1000 : 60, message: 'Hiciste muchos intentos seguidos, probá de nuevo en unos minutos' });

/** Most orders a browser follows by code; the oldest ones are dropped. */
const MAX_FOLLOWS = 50;

/** The signed-in user the browser's notifications belong to. Admins and impersonation sessions get none. */
async function owner(req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    if ((jwt.verify(token, config.jwtSecret) as { actorId?: string }).actorId) return null;
  } catch {
    return null;
  }
  const user = await optionalUser(req);
  return user && user.role !== 'admin' && !user.disabledAt ? user : null;
}

// Public: the key the browser needs to subscribe.
pushRoutes.get('/key', asyncHandler(async (_req, res) => {
  ok(res, { publicKey: (await vapidKeys()).publicKey });
}));

// Public: save (or refresh) this browser's subscription. Signed in, it belongs to that account;
// without a session it only follows the order whose code it sends.
pushRoutes.post('/subscribe', limit, asyncHandler(async (req, res) => {
  const { subscription, orderCode } = pushSubscribeSchema.parse(req.body);
  const user = await owner(req);
  const values = { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userId: user?.id ?? null };
  let row = await PushSubscription.findOne({ where: { endpoint: subscription.endpoint } });
  if (row) await row.update(values);
  else row = await PushSubscription.create(values);

  if (orderCode) {
    if (!(await Order.findOne({ where: { publicCode: orderCode }, attributes: ['id'] }))) throw new HttpError(404, 'No encontramos ese pedido');
    await PushOrderFollow.findOrCreate({ where: { subscriptionId: row.id, orderCode } });
    const follows = await PushOrderFollow.findAll({ where: { subscriptionId: row.id }, order: [['createdAt', 'DESC']], offset: MAX_FOLLOWS });
    await Promise.all(follows.map((f) => f.destroy()));
  }
  ok(res, { subscribed: true });
}));

// Public: this browser stops receiving notifications (turned off, or signing out). The endpoint is its secret.
pushRoutes.post('/unsubscribe', limit, asyncHandler(async (req, res) => {
  const { endpoint } = pushUnsubscribeSchema.parse(req.body);
  const row = await PushSubscription.findOne({ where: { endpoint } });
  if (row) {
    await PushOrderFollow.destroy({ where: { subscriptionId: row.id } });
    await row.destroy();
  }
  ok(res, { subscribed: false });
}));
