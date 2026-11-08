import fs from 'node:fs/promises';
import path from 'node:path';
import { Router, type Request } from 'express';
import { Op } from 'sequelize';
import { fold } from '../../shared/business.js';
import { profileChecklist } from '../../shared/profile.js';
import type { AdminAccount, Business as BusinessDTO } from '../../shared/types.js';
import { businessStatusSchema } from '../../shared/schemas.js';
import { config } from '../config.js';
import { sequelize } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentUser, requireAdmin, requireAuth, signToken } from '../middleware/requireAuth.js';
import { AdminAction, AuditLog, Business, BusinessCategory, ImpersonationLog, Order, Product, User } from '../models/index.js';
import { emitBusinessStatus } from '../services/realtime.js';
import { ok } from '../services/response.js';
import { businessOf, userData } from './auth.js';

export const adminRoutes = Router();

// Admin: accounts with their business. Filters: search, category (slug), status (active, inactive, incomplete)
adminRoutes.get('/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const term = typeof req.query.search === 'string' ? fold(req.query.search.trim()) : '';
  const { category, status } = req.query;

  const [users, products] = await Promise.all([
    User.findAll({
      where: { role: { [Op.ne]: 'admin' } },
      include: [{ model: Business, include: [BusinessCategory] }],
      order: [['createdAt', 'DESC']],
    }),
    Product.findAll({ attributes: ['businessId', 'isAvailable'] }),
  ]);
  const counts = new Map<string, number>();
  for (const p of products) if (p.isAvailable) counts.set(p.businessId, (counts.get(p.businessId) ?? 0) + 1);

  const accounts: AdminAccount[] = users.map((user) => {
    const business = user.business;
    const productCount = business ? counts.get(business.id) ?? 0 : 0;
    const steps = business ? profileChecklist(business.toJSON() as BusinessDTO, productCount) : [];
    const done = steps.filter((s) => s.done).length;
    return {
      user: { ...userData(user), createdAt: user.createdAt.toISOString() },
      business: business
        ? { id: business.id, name: business.name, slug: business.slug, logo: business.logo, isActive: business.isActive, isVerified: business.isVerified, disabledAt: business.disabledAt?.toISOString() ?? null, disabledReason: business.disabledReason, category: business.category ?? null }
        : null,
      productCount,
      profile: { done, total: steps.length, complete: steps.length > 0 && done === steps.length },
    };
  });

  const filtered = accounts.filter((a) =>
    (!term || [a.user.name, a.user.email, a.business?.name].some((text) => text && fold(text).includes(term))) &&
    (!category || a.business?.category?.slug === category) &&
    (!status || (status === 'active' && a.business?.isActive) || (status === 'inactive' && a.business && !a.business.isActive) || (status === 'incomplete' && !a.profile.complete)));

  ok(res, { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, pages: Math.max(1, Math.ceil(filtered.length / limit)) });
}));

// Impersonation token: end the session on behalf of the user
adminRoutes.post('/impersonate/stop', requireAuth, asyncHandler(async (req, res) => {
  if (!req.impersonation) throw new HttpError(400, 'No estás navegando como otro usuario');
  await ImpersonationLog.update({ endedAt: new Date() }, { where: { id: req.impersonation.logId, endedAt: null } });
  console.log(`[admin] ${req.impersonation.admin.email} stopped acting as ${currentUser(req).email}`);
  ok(res, { stopped: true });
}));

// Admin: start acting on behalf of a user
adminRoutes.post('/impersonate/:userId', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const admin = currentUser(req);
  const target = await User.findByPk(req.params.userId);
  if (!target) throw new HttpError(404, 'No encontramos esa cuenta');
  if (target.id === admin.id || target.role === 'admin') throw new HttpError(400, 'No podés navegar en nombre de una cuenta de administración');

  const log = await ImpersonationLog.create({ adminId: admin.id, targetUserId: target.id, ip: req.ip ?? null, userAgent: req.get('user-agent')?.slice(0, 512) ?? null });
  console.log(`[admin] ${admin.email} started acting as ${target.email}`);

  ok(res, {
    token: signToken(target, { actorId: admin.id, logId: log.id }),
    user: userData(target),
    business: await businessOf(target),
    impersonatedBy: { id: admin.id, name: admin.name, email: admin.email },
  }, 201);
}));

/** The business an admin acts on, refusing admins' accounts and their own. */
async function managedBusiness(req: Request) {
  const business = await Business.findByPk(req.params.id, { include: [{ model: User, attributes: ['id', 'role', 'email', 'avatarUrl'] }] });
  if (!business) throw new HttpError(404, 'No encontramos ese negocio');
  if (business.owner?.role === 'admin' || business.ownerId === currentUser(req).id) throw new HttpError(400, 'No podés hacer esto sobre una cuenta de administración');
  return business;
}

// Admin: disable a business (it disappears from the site) or enable it again
adminRoutes.patch('/businesses/:id/status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { disabled, reason } = businessStatusSchema.parse(req.body);
  const business = await managedBusiness(req);
  await business.update(disabled ? { isActive: false, disabledAt: new Date(), disabledReason: reason } : { isActive: true, disabledAt: null, disabledReason: null });
  await AdminAction.create({ adminId: currentUser(req).id, action: disabled ? 'business.disable' : 'business.enable', targetUserId: business.ownerId, targetBusinessId: business.id, details: { name: business.name, reason } });
  emitBusinessStatus(business);
  console.log(`[admin] ${currentUser(req).email} ${disabled ? 'disabled' : 'enabled'} ${business.slug}`);
  ok(res, { id: business.id, isActive: business.isActive, disabledAt: business.disabledAt, disabledReason: business.disabledReason });
}));

/** Uploaded files are deleted with the account; seed photos are shared and stay. */
async function removeUploads(paths: (string | null | undefined)[]) {
  await Promise.all(paths.filter((p): p is string => !!p && p.startsWith('/data/uploads/')).map((p) =>
    fs.unlink(path.join(config.uploadsDir, path.basename(p))).catch(() => undefined)));
}

// Admin: delete a business with its account, products, orders and uploaded images. Cannot be undone.
adminRoutes.delete('/businesses/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const business = await managedBusiness(req);
  const products = await Product.findAll({ where: { businessId: business.id }, attributes: ['images'] });
  const files = [business.logo, business.coverImage, ...business.gallery, ...products.flatMap((p) => p.images), business.owner?.avatarUrl];
  const ownerId = business.ownerId;

  await sequelize.transaction(async (transaction) => {
    await Order.destroy({ where: { businessId: business.id }, transaction });
    await Product.destroy({ where: { businessId: business.id }, transaction });
    await business.destroy({ transaction });
    // The impersonation history of this account goes with it; the deletion itself is recorded below.
    const sessions = await ImpersonationLog.findAll({ where: { targetUserId: ownerId }, attributes: ['id'], transaction });
    await AuditLog.destroy({ where: { targetUserId: ownerId }, transaction });
    await ImpersonationLog.destroy({ where: { id: sessions.map((s) => s.id) }, transaction });
    await User.destroy({ where: { id: ownerId }, transaction });
  });
  await removeUploads(files);
  await AdminAction.create({ adminId: currentUser(req).id, action: 'business.delete', targetUserId: ownerId, targetBusinessId: business.id, details: { name: business.name, slug: business.slug, email: business.owner?.email } });
  console.log(`[admin] ${currentUser(req).email} deleted ${business.slug}`);
  ok(res, { deleted: true });
}));
