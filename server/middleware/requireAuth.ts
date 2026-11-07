import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/index.js';
import { HttpError } from './errorHandler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function signToken(user: User): string {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
}

/** Exige el token Bearer y deja el usuario en req.user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new HttpError(401, 'No autorizado');

    let id: string;
    try {
      ({ id } = jwt.verify(token, config.jwtSecret) as { id: string });
    } catch {
      throw new HttpError(401, 'Token inválido');
    }

    const user = await User.findByPk(id);
    if (!user) throw new HttpError(401, 'Usuario no encontrado');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Usuario de la sesión en una ruta protegida por requireAuth. */
export function currentUser(req: Request): User {
  if (!req.user) throw new HttpError(401, 'No autorizado');
  return req.user;
}
