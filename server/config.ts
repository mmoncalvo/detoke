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
// A Postgres DATABASE_URL selects Postgres; otherwise SQLite at ./database.sqlite
// (or DATABASE_PATH), created on demand. Tests use a temporary SQLite file.
const POSTGRES_URL = /^postgres(ql)?:\/\//i;

function database(): { dialect: 'postgres'; url: string } | { dialect: 'sqlite'; storage: string } {
  if (isTest) return { dialect: 'sqlite', storage: path.join(os.tmpdir(), `detoke-test-${process.pid}.sqlite`) };
  const url = process.env.DATABASE_URL?.trim();
  if (url && POSTGRES_URL.test(url)) return { dialect: 'postgres', url };
  if (url) console.warn('[config] DATABASE_URL is not a Postgres URL: using local SQLite');
  else if (isProduction) console.warn('[config] DATABASE_URL is not set in production: using local SQLite');
  return { dialect: 'sqlite', storage: path.resolve(process.env.DATABASE_PATH?.trim() || 'database.sqlite') };
}

export const config = {
  isProduction,
  isTest,
  port: Number(read('PORT', '3000')),
  database: database(),
  jwtSecret: read('JWT_SECRET', 'dev-secret-cambiar', { requiredInProduction: true }),
  /** Folder published on /data (images and uploads). */
  dataDir: path.resolve('data'),
  /** Upload folder. Tests use a temporary one. */
  uploadsDir: isTest ? path.join(os.tmpdir(), 'detoke-test-uploads') : path.resolve('data/uploads'),
  /** Origins allowed to call the API in production, besides the same-origin web app. */
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost,https://localhost').split(',').map((s) => s.trim()).filter(Boolean),
};
