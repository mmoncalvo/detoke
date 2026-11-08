// Single place that reads the .env. Missing values fall back to a default and
// are reported with the [config] prefix.
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

function read(name: string, fallback: string, opts: { requiredInProduction?: boolean } = {}): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction && opts.requiredInProduction) throw new Error(`[config] Missing ${name} in production`);
  if (!isTest) console.warn(`[config] ${name} is not set; using the default`);
  return fallback;
}

// ------------------------------------------------------------------ database
// A Postgres DATABASE_URL selects Postgres. Otherwise SQLite at ./database.sqlite (or
// DATABASE_PATH), created on demand. Production needs DATABASE_URL, or an explicit
// DATABASE_PATH to run on SQLite on purpose. Tests use a temporary SQLite file.
const POSTGRES_URL = /^postgres(ql)?:\/\//i;

type DatabaseConfig = { dialect: 'postgres'; url: string; ssl: boolean } | { dialect: 'sqlite'; storage: string };

function database(): DatabaseConfig {
  if (isTest) return { dialect: 'sqlite', storage: path.join(os.tmpdir(), `detoke-test-${process.pid}.sqlite`) };
  const url = process.env.DATABASE_URL?.trim();
  if (url && POSTGRES_URL.test(url)) return { dialect: 'postgres', url, ssl: process.env.DATABASE_SSL === 'true' };
  if (url) console.warn('[config] DATABASE_URL is not a Postgres URL: using local SQLite');
  const sqlitePath = process.env.DATABASE_PATH?.trim();
  if (isProduction && !sqlitePath) {
    throw new Error('[config] Missing DATABASE_URL in production: set the Postgres connection string (postgres://...), or DATABASE_PATH to use SQLite on purpose');
  }
  return { dialect: 'sqlite', storage: path.resolve(sqlitePath || 'database.sqlite') };
}

// Render sets RENDER_EXTERNAL_URL to the service's public address: use it when APP_URL is missing.
const appUrl = (process.env.APP_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '');
if (isProduction && appUrl.includes('localhost')) console.warn(`[config] APP_URL is ${appUrl} in production: set it to the public address, or Google sign-in will fail`);

export const config = {
  isProduction,
  isTest,
  port: Number(read('PORT', '3000')),
  database: database(),
  jwtSecret: read('JWT_SECRET', 'dev-secret-cambiar', { requiredInProduction: true }),
  /** Folder published on /data (images and uploads). */
  dataDir: path.resolve('data'),
  /** Upload folder. Tests use a temporary one. */
  uploadsDir: isTest ? path.join(os.tmpdir(), 'detoke-test-uploads') : path.resolve(process.env.UPLOADS_DIR?.trim() || 'data/uploads'),
  maxUploadBytes: 8 * 1024 * 1024,
  /** Shown on the contact page and used as the destination of the contact form. */
  contact: {
    email: process.env.CONTACT_EMAIL?.trim() || (isProduction ? null : 'hola@detoke.test'),
    whatsapp: process.env.CONTACT_WHATSAPP?.trim() || null,
    hours: process.env.CONTACT_HOURS?.trim() || 'Lunes a viernes de 9 a 18',
  },
  /** Orders per IP and hour. */
  orderRateLimit: isTest ? 10_000 : 30,
  /** Contact form sends per IP and hour. */
  contactRateLimit: isTest ? 1000 : 5,
  /** Password changes per IP and 15 minutes. */
  passwordRateLimit: isTest ? 1000 : 10,
  /** Without a host, contact messages are only stored. */
  smtp: {
    host: process.env.SMTP_HOST?.trim() || null,
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER?.trim() || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM?.trim() || 'Detoke <no-reply@detoke.test>',
  },
  /** Public address of the web app, where OAuth flows return. */
  appUrl,
  /** Google sign-in is enabled only when both id and secret are set. */
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim() || null,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || null,
    redirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() || `${appUrl}/api/auth/google/callback`,
  },
  /** Origins allowed to call the API in production, besides the same-origin web app. */
  corsOrigins: (process.env.CORS_ORIGINS ?? appUrl).split(',').map((s) => s.trim()).filter(Boolean),
};
