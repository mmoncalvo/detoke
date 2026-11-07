import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema, registerSchema } from '../../shared/schemas.js';
import { sequelize } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentUser, requireAuth, signToken } from '../middleware/requireAuth.js';
import { Business, BusinessCategory, User } from '../models/index.js';
import { ok } from '../services/response.js';
import { uniqueSlug } from '../services/slug.js';

export const authRoutes = Router();

const userData = (user: User) => ({ id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role });
const businessOf = (user: User) => Business.findOne({ where: { ownerId: user.id }, include: [BusinessCategory] });

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
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'El email o la contraseña no son correctos');

  ok(res, { token: signToken(user), user: userData(user), business: await businessOf(user) });
}));

authRoutes.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req);
  ok(res, { user: userData(user), business: await businessOf(user) });
}));
