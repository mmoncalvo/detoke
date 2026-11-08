import { Router } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { canTransition, type OrderItem, type OrderStatus } from '../../shared/orders.js';
import { orderCreateSchema, orderStatusSchema } from '../../shared/schemas.js';
import { config } from '../config.js';
import { sequelize } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { currentBusiness, currentUser, optionalUser, requireAuth } from '../middleware/requireAuth.js';
import { Business, Order, Product } from '../models/index.js';
import { newPublicCode, ORDER_BUSINESS_ATTRIBUTES, orderJson, withBusiness } from '../services/orders.js';
import { emitOrderCreated, emitOrderUpdated } from '../services/realtime.js';
import { ok } from '../services/response.js';
import { formatMoney } from '../services/money.js';

export const orderRoutes = Router();

const limit = rateLimit({ windowMs: 60 * 60 * 1000, max: config.orderRateLimit, message: 'Hiciste muchos pedidos seguidos, probá de nuevo más tarde' });

// Public: place an order. Prices, availability and rules come from the database, never from the client.
orderRoutes.post('/', limit, asyncHandler(async (req, res) => {
  const data = orderCreateSchema.parse(req.body);

  const business = await Business.findOne({ where: { id: data.businessId, isActive: true } });
  if (!business) throw new HttpError(404, 'No encontramos ese negocio');
  if (!business.deliveryOptions.includes(data.fulfillment)) throw new HttpError(400, data.fulfillment === 'delivery' ? 'Este negocio no hace delivery' : 'Este negocio no tiene retiro en el local');
  if (!business.paymentMethods.includes(data.paymentMethod)) throw new HttpError(400, 'Este negocio no acepta ese medio de pago');

  const quantities = new Map<string, number>();
  for (const { productId, quantity } of data.items) quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  const products = await Product.findAll({ where: { id: [...quantities.keys()], businessId: business.id } });
  if (products.length !== quantities.size) throw new HttpError(400, 'Algún producto ya no está en el catálogo de este negocio');

  const items: OrderItem[] = products.map((p) => {
    const quantity = quantities.get(p.id)!;
    if (!p.isAvailable) throw new HttpError(400, `"${p.name}" ya no está disponible`);
    if (p.stock != null && quantity > p.stock) throw new HttpError(400, `De "${p.name}" quedan ${p.stock}`);
    return { productId: p.id, name: p.name, unitPrice: p.price, quantity, subtotal: Math.round(p.price * quantity * 100) / 100, image: p.images[0] ?? null };
  });

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const isDelivery = data.fulfillment === 'delivery';
  if (isDelivery && business.minimumOrder && subtotal < business.minimumOrder) {
    throw new HttpError(400, `El pedido mínimo para delivery es ${formatMoney(business.minimumOrder)}`);
  }
  const deliveryFee = isDelivery ? business.deliveryFee ?? 0 : 0;

  const order = await sequelize.transaction(async (transaction) => {
    const last = (await Order.max('number', { where: { businessId: business.id }, transaction })) as number | null;
    return Order.create({
      publicCode: newPublicCode(),
      number: (last ?? 0) + 1,
      businessId: business.id,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      fulfillment: data.fulfillment,
      deliveryAddress: isDelivery ? data.deliveryAddress : null,
      paymentMethod: data.paymentMethod,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      notes: data.notes,
      status: 'pending',
      statusHistory: [{ status: 'pending', at: new Date().toISOString(), by: 'customer' }],
    }, { transaction });
  });

  const saved = orderJson((await withBusiness(order.id))!);
  emitOrderCreated(saved);
  ok(res, { order: saved, url: `${config.appUrl}/pedido/${order.publicCode}` }, 201);
}));

// Protected: the orders of the session user's business, newest first. Filters: status (comma list), since (ISO date)
orderRoutes.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const business = await currentBusiness(req);
  const where: WhereOptions = { businessId: business.id };
  const statuses = typeof req.query.status === 'string' ? req.query.status.split(',').filter(Boolean) : [];
  if (statuses.length) Object.assign(where, { status: statuses });
  if (typeof req.query.since === 'string' && !Number.isNaN(Date.parse(req.query.since))) Object.assign(where, { createdAt: { [Op.gte]: new Date(req.query.since) } });

  ok(res, await Order.findAll({ where, order: [['createdAt', 'DESC']], limit: 200 }));
}));

// Public: an order by its code. The business owner (or an admin) also gets canManage.
orderRoutes.get('/public/:code', asyncHandler(async (req, res) => {
  const order = await Order.findOne({ where: { publicCode: req.params.code }, include: [{ model: Business, attributes: [...ORDER_BUSINESS_ATTRIBUTES, 'ownerId'] }] });
  if (!order) throw new HttpError(404, 'No encontramos ese pedido');

  const viewer = await optionalUser(req);
  const canManage = !!viewer && (viewer.role === 'admin' || order.business?.ownerId === viewer.id);
  const json = orderJson(order);
  if (json.business) delete (json.business as unknown as Record<string, unknown>).ownerId;
  ok(res, { ...json, canManage });
}));

// Protected: move an order to another status (owner of the business or admin)
orderRoutes.patch('/:code/status', requireAuth, asyncHandler(async (req, res) => {
  const { status, reason } = orderStatusSchema.parse(req.body);
  const user = currentUser(req);
  const order = await Order.findOne({ where: { publicCode: req.params.code }, include: [{ model: Business, attributes: ['ownerId'] }] });
  if (!order) throw new HttpError(404, 'No encontramos ese pedido');
  if (order.business?.ownerId !== user.id && user.role !== 'admin') throw new HttpError(403, 'Ese pedido no es de tu negocio');
  if (!canTransition(order.status, status as OrderStatus, order.fulfillment)) throw new HttpError(409, 'Ese cambio de estado no es posible ahora. Actualizá la página.');

  const by = req.impersonation || user.role === 'admin' ? 'admin' : 'business';
  await order.update({ status, statusHistory: [...order.statusHistory, { status, at: new Date().toISOString(), by, reason: reason ?? null }] });

  const saved = orderJson((await withBusiness(order.id))!);
  emitOrderUpdated(saved);
  ok(res, saved);
}));
