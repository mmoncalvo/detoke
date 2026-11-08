import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema, passwordChangeSchema, profileSchema, registerSchema } from '../../shared/schemas.js';
import { config } from '../config.js';
import { sequelize } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentUser, requireAuth, signToken } from '../middleware/requireAuth.js';
import { Business, BusinessCategory, User } from '../models/index.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { ok } from '../services/response.js';
import { saveImage, upload } from '../services/upload.js';
import { uniqueSlug } from '../services/slug.js';

export const authRoutes = Router();

export const userData = (user: User) => ({ id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl ?? null });
export const businessOf = (user: User) => Business.findOne({ where: { ownerId: user.id }, include: [BusinessCategory] });

authRoutes.post('/register', asyncHandler(async (req, res) => {
  const { business: businessData, password, ...account } = registerSchema.parse(req.body);

  if (await User.findOne({ where: { email: account.email } })) throw new HttpError(409, 'Ya hay una cuenta con ese email');
  if (!(await BusinessCategory.findByPk(businessData.businessCategoryId))) throw new HttpError(400, 'Elegí un rubro de la lista');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await sequelize.transaction(async (transaction) => {
    const created = await User.create({ ...account, passwordHash }, { transaction });
    const slug = await uniqueSlug(Business, businessData.name, transaction);
    await Business.create({ ...businessData, slug, ownerId: created.id }, { transaction });
    return created;
  });

  ok(res, { token: signToken(user), user: userData(user), business: await businessOf(user) }, 201);
}));

authRoutes.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.unscoped().findOne({ where: { email } });
  if (user && !user.passwordHash && user.googleId) throw new HttpError(401, 'Esta cuenta usa Google para ingresar');
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'El email o la contraseña no son correctos');

  ok(res, { token: signToken(user), user: userData(user), business: await businessOf(user) });
}));

authRoutes.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const actor = req.impersonation?.admin;
  ok(res, {
    user: userData(user),
    business: await businessOf(user),
    impersonatedBy: actor ? { id: actor.id, name: actor.name, email: actor.email } : null,
  });
}));

/** Whether the session user has a password and a linked Google account (the account page needs it). */
authRoutes.get('/me/security', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.unscoped().findByPk(currentUser(req).id, { attributes: ['passwordHash', 'googleId'] });
  ok(res, { hasPassword: !!user?.passwordHash, hasGoogle: !!user?.googleId });
}));

authRoutes.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  const user = currentUser(req);
  if (data.email !== user.email) {
    // Changing the email changes how the account signs in: only its owner can do it.
    if (req.impersonation) throw new HttpError(403, 'El email lo puede cambiar solo el dueño de la cuenta');
    if (await User.findOne({ where: { email: data.email } })) throw new HttpError(409, 'Ya hay una cuenta con ese email');
  }
  await user.update(data);
  ok(res, userData(user));
}));

const passwordLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: config.passwordRateLimit, message: 'Hiciste muchos intentos seguidos, probá de nuevo en unos minutos' });

authRoutes.post('/me/password', passwordLimit, requireAuth, asyncHandler(async (req, res) => {
  if (req.impersonation) throw new HttpError(403, 'La contraseña la puede cambiar solo el dueño de la cuenta');
  const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
  const user = await User.unscoped().findByPk(currentUser(req).id);
  if (!user) throw new HttpError(404, 'No encontramos la cuenta');
  if (user.passwordHash) {
    // 400 and not 401: a wrong password must not end the session.
    if (!currentPassword) throw new HttpError(400, 'Completá tu contraseña actual');
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new HttpError(400, 'La contraseña actual no es correcta');
  }
  await user.update({ passwordHash: await bcrypt.hash(newPassword, 10) });
  ok(res, { hasPassword: true });
}));

authRoutes.post('/me/avatar', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  const user = currentUser(req);
  await user.update({ avatarUrl: await saveImage(req.file, 'avatar') });
  ok(res, userData(user));
}));

authRoutes.delete('/me/avatar', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req);
  await user.update({ avatarUrl: null });
  ok(res, userData(user));
}));
