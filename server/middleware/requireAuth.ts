import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { Business, User } from '../models/index.js';
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
  return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
}

/** Requires the Bearer token and sets req.user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new HttpError(401, 'Iniciá sesión para continuar');

    let id: string;
    try {
      ({ id } = jwt.verify(token, config.jwtSecret) as { id: string });
    } catch {
      throw new HttpError(401, 'Tu sesión venció, iniciá sesión de nuevo');
    }

    const user = await User.findByPk(id);
    if (!user) throw new HttpError(401, 'Tu sesión venció, iniciá sesión de nuevo');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Session user on a route protected by requireAuth. */
export function currentUser(req: Request): User {
  if (!req.user) throw new HttpError(401, 'Iniciá sesión para continuar');
  return req.user;
}

/** The session user's business. */
export async function currentBusiness(req: Request): Promise<Business> {
  const business = await Business.findOne({ where: { ownerId: currentUser(req).id } });
  if (!business) throw new HttpError(404, 'Tu cuenta no tiene un negocio');
  return business;
}
