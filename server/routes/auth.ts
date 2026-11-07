import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentUser, requireAuth, signToken } from '../middleware/requireAuth.js';
import { User } from '../models/index.js';
import { ok } from '../services/response.js';

export const authRoutes = Router();

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  businessName: z.string().min(2),
  whatsapp: z.string().min(10),
  fullName: z.string().optional(),
  email: z.string().email().optional(),
});

/** Token y datos del usuario, sin la contraseña. */
function session(user: User) {
  const { password: _password, ...data } = user.toJSON();
  return { token: signToken(user), user: data };
}

authRoutes.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) throw new HttpError(401, 'Credenciales inválidas');

  ok(res, session(user));
}));

authRoutes.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const existing = await User.findOne({ where: { username: data.username } });
  if (existing) throw new HttpError(400, 'El usuario ya existe');

  const user = await User.create({ ...data, password: await bcrypt.hash(data.password, 10) });
  ok(res, session(user), 201);
}));

authRoutes.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findByPk(currentUser(req).id, { attributes: { exclude: ['password'] } });
  ok(res, user);
}));
