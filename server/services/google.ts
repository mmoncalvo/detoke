// Google sign-in: authorization code flow, server side.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const googleEnabled = () => !!(config.google.clientId && config.google.clientSecret);

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

/** Address of Google's consent screen. */
export function authorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: config.google.clientId ?? '',
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Trades the authorization code for the user's profile. The id_token comes straight
 * from Google's token endpoint over TLS, so it is decoded and its claims checked.
 */
export async function exchangeCode(code: string): Promise<GoogleProfile> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId ?? '',
      client_secret: config.google.clientSecret ?? '',
      redirect_uri: config.google.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token endpoint answered ${res.status}`);
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  const claims = idToken ? (jwt.decode(idToken) as Record<string, unknown> | null) : null;

  if (!claims || claims.aud !== config.google.clientId) throw new Error('Unexpected id_token audience');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(String(claims.iss))) throw new Error('Unexpected id_token issuer');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) throw new Error('Expired id_token');

  return {
    sub: String(claims.sub),
    email: String(claims.email ?? '').toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: String(claims.name ?? claims.email ?? ''),
    picture: typeof claims.picture === 'string' ? claims.picture : null,
  };
}

// ------------------------------------------------------------------ one-time codes
// The callback must not put the session token in a URL, so it hands the web app a
// short-lived code that is traded once for the token. One process, kept in memory.
const CODE_TTL_MS = 60_000;
const codes = new Map<string, { userId: string; expiresAt: number }>();

export function issueLoginCode(userId: string) {
  const now = Date.now();
  for (const [key, entry] of codes) if (entry.expiresAt < now) codes.delete(key);
  const code = crypto.randomBytes(24).toString('base64url');
  codes.set(code, { userId, expiresAt: now + CODE_TTL_MS });
  return code;
}

export function redeemLoginCode(code: string) {
  const entry = codes.get(code);
  codes.delete(code);
  return entry && entry.expiresAt >= Date.now() ? entry.userId : null;
}
