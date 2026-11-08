import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AuditLog, Business, User } from '../models/index.js';
import { HttpError } from './errorHandler.js';

interface Impersonation {
  admin: User;
  logId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      /** Set when an admin is acting on behalf of req.user. */
      impersonation?: Impersonation;
    }
  }
}

interface TokenPayload {
  id: string;
  role: string;
  /** Admin acting on behalf of the user, and the log of that session. */
  actorId?: string;
  impersonationLogId?: string;
}

export const IMPERSONATION_HOURS = 2;

export function signToken(user: User, impersonation?: { actorId: string; logId: string }): string {
  const payload: TokenPayload = { id: user.id, role: user.role };
  if (impersonation) Object.assign(payload, { actorId: impersonation.actorId, impersonationLogId: impersonation.logId });
  return jwt.sign(payload, config.jwtSecret, { expiresIn: impersonation ? `${IMPERSONATION_HOURS}h` : '7d' });
}

/** Records every write an admin makes on behalf of someone else. */
function auditWrites(req: Request, res: Response, impersonation: Impersonation, targetUserId: string) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  res.on('finish', () => {
    AuditLog.create({
      impersonationLogId: impersonation.logId,
      adminId: impersonation.admin.id,
      targetUserId,
      method: req.method,
      path: req.originalUrl.slice(0, 255),
      status: res.statusCode,
    }).catch((err) => console.error('[admin] Could not record an audit entry:', err));
  });
}

/** Requires the Bearer token and sets req.user (and req.impersonation for admins acting as someone). */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new HttpError(401, 'Iniciá sesión para continuar');

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch {
      throw new HttpError(401, 'Tu sesión venció, iniciá sesión de nuevo');
    }

    const user = await User.findByPk(payload.id);
    if (!user) throw new HttpError(401, 'Tu sesión venció, iniciá sesión de nuevo');
    // A disabled customer is signed out: 401 ends the session in the web app.
    if (user.disabledAt && !payload.actorId) throw new HttpError(401, 'Tu cuenta fue deshabilitada por el equipo de Detoke');

    if (payload.actorId && payload.impersonationLogId) {
      const admin = await User.findByPk(payload.actorId);
      if (admin?.role !== 'admin') throw new HttpError(401, 'Tu sesión venció, iniciá sesión de nuevo');
      req.impersonation = { admin, logId: payload.impersonationLogId };
      auditWrites(req, res, req.impersonation, user.id);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Use after requireAuth on admin-only routes. An admin acting as someone else is not an admin here. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin' || req.impersonation) return next(new HttpError(403, 'No tenés permiso para ver esto'));
  next();
}

/** For account security changes (email, password, deleting the account): only the owner, never an admin acting as them. */
export function requireOwnSession(req: Request, _res: Response, next: NextFunction) {
  if (req.impersonation) return next(new HttpError(403, 'Mientras navegás como otro usuario no podés cambiar su email, su contraseña ni borrar su cuenta'));
  next();
}

/** The user of an optional Bearer token, or null. For public routes that show more to owners. */
export async function optionalUser(req: Request): Promise<User | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return await User.findByPk(id);
  } catch {
    return null;
  }
}

/** Session user on a route protected by requireAuth. */
export function currentUser(req: Request): User {
  if (!req.user) throw new HttpError(401, 'Iniciá sesión para continuar');
  return req.user;
}

/** The session user's business. */
export async function currentBusiness(req: Request): Promise<Business> {
  const user = currentUser(req);
  // Seller rights come from owning a business: a customer account gets them once it adds one.
  if (user.role === 'customer') throw new HttpError(403, 'Tu cuenta todavía no tiene un negocio: sumalo para usar el panel');
  const business = await Business.findOne({ where: { ownerId: user.id } });
  if (!business) throw new HttpError(404, 'Tu cuenta no tiene un negocio');
  return business;
}
