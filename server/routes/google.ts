import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { signToken } from '../middleware/requireAuth.js';
import { User } from '../models/index.js';
import { authorizationUrl, exchangeCode, googleEnabled, issueLoginCode, redeemLoginCode } from '../services/google.js';
import { ok } from '../services/response.js';
import { businessOf, userData } from './auth.js';

export const googleRoutes = Router();
export const providerRoutes = Router();

const STATE_COOKIE = 'detoke_google_state';
const STATE_MINUTES = 10;

// Public: which sign-in providers are configured
providerRoutes.get('/', (_req, res) => ok(res, { google: googleEnabled() }));

const readCookie = (req: Request, name: string) =>
  req.headers.cookie?.split(';').map((part) => part.trim().split('=')).find(([key]) => key === name)?.[1];

/** Sends the browser back to the web app with a result for /auth/callback. */
function finish(res: Response, params: Record<string, string>) {
  res.clearCookie(STATE_COOKIE, { path: '/api/auth/google' });
  res.redirect(`${config.appUrl}/auth/callback?${new URLSearchParams(params)}`);
}

// Public: address of Google's consent screen. The state is signed and tied to a cookie (CSRF).
// `as=seller` when it starts from "Sumá tu negocio": a new account is then a seller (with the business
// onboarding next); otherwise a new account is a customer, who can add a business later.
googleRoutes.get('/url', (req, res) => {
  if (!googleEnabled()) throw new HttpError(404, 'El ingreso con Google no está disponible');
  const nonce = crypto.randomBytes(16).toString('base64url');
  const as = req.query.as === 'seller' ? 'seller' : 'customer';
  const state = jwt.sign({ nonce, as }, config.jwtSecret, { expiresIn: `${STATE_MINUTES}m` });
  res.cookie(STATE_COOKIE, nonce, { httpOnly: true, sameSite: 'lax', secure: config.isProduction, path: '/api/auth/google', maxAge: STATE_MINUTES * 60_000 });
  ok(res, { url: authorizationUrl(state) });
});

// Google redirects here after the consent screen
googleRoutes.get('/callback', asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return finish(res, { error: error === 'access_denied' ? 'cancelled' : 'failed' });

  let as: 'seller' | 'customer' = 'customer';
  try {
    const payload = jwt.verify(String(state ?? ''), config.jwtSecret) as { nonce: string; as?: 'seller' | 'customer' };
    if (!payload.nonce || payload.nonce !== readCookie(req, STATE_COOKIE)) throw new Error('state mismatch');
    as = payload.as === 'seller' ? 'seller' : 'customer';
  } catch {
    return finish(res, { error: 'invalid_state' });
  }
  if (typeof code !== 'string' || !code) return finish(res, { error: 'failed' });

  let profile;
  try {
    profile = await exchangeCode(code);
  } catch (err) {
    console.error('[google] Could not complete the sign-in:', err);
    return finish(res, { error: 'failed' });
  }
  if (!profile.email || !profile.emailVerified) return finish(res, { error: 'unverified' });

  let user = await User.unscoped().findOne({ where: { googleId: profile.sub } })
    ?? await User.unscoped().findOne({ where: { email: profile.email } });

  // Admins sign in with their password, so a Google account can never act as one.
  if (user?.role === 'admin') return finish(res, { error: 'admin' });
  if (user?.disabledAt) return finish(res, { error: 'disabled' });

  if (user) {
    await user.update({ googleId: profile.sub, avatarUrl: user.avatarUrl ?? profile.picture });
  } else {
    user = await User.create({ email: profile.email, name: profile.name, googleId: profile.sub, avatarUrl: profile.picture, role: as, passwordHash: null });
  }

  finish(res, { code: issueLoginCode(user.id) });
}));

// Public: trade the one-time code from the callback for a session
googleRoutes.post('/exchange', asyncHandler(async (req, res) => {
  const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
  const userId = redeemLoginCode(code);
  const user = userId ? await User.findByPk(userId) : null;
  if (!user) throw new HttpError(400, 'El ingreso con Google venció, probá de nuevo');
  ok(res, { token: signToken(user), user: userData(user), business: await businessOf(user) });
}));
