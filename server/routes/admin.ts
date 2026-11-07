import { Router } from 'express';
import { Op } from 'sequelize';
import { fold } from '../../shared/business.js';
import { profileChecklist } from '../../shared/profile.js';
import type { AdminAccount, Business as BusinessDTO } from '../../shared/types.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentUser, requireAdmin, requireAuth, signToken } from '../middleware/requireAuth.js';
import { Business, BusinessCategory, ImpersonationLog, Product, User } from '../models/index.js';
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
        ? { id: business.id, name: business.name, slug: business.slug, logo: business.logo, isActive: business.isActive, isVerified: business.isVerified, category: business.category ?? null }
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
