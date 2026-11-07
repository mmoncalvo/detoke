// Centraliza la configuración que viene del .env. Si falta algo usa un valor
// por defecto y lo avisa con el prefijo [config].
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

function read(name: string, fallback: string, opts: { requiredInProduction?: boolean } = {}): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction && opts.requiredInProduction) throw new Error(`[config] Falta ${name} en producción`);
  if (!isTest) console.warn(`[config] ${name} no está definido; uso el valor por defecto`);
  return fallback;
}

// ------------------------------------------------------------- base de datos
// Si DATABASE_URL es una URL de Postgres se usa Postgres; si no, SQLite en
// ./database.sqlite (o DATABASE_PATH), que se crea sola. Las pruebas usan una SQLite temporal.
const POSTGRES_URL = /^postgres(ql)?:\/\//i;

function database(): { dialect: 'postgres'; url: string } | { dialect: 'sqlite'; storage: string } {
  if (isTest) return { dialect: 'sqlite', storage: path.join(os.tmpdir(), `detoke-test-${process.pid}.sqlite`) };
  const url = process.env.DATABASE_URL?.trim();
  if (url && POSTGRES_URL.test(url)) return { dialect: 'postgres', url };
  if (url) console.warn('[config] DATABASE_URL no es una URL de Postgres: uso SQLite local');
  else if (isProduction) console.warn('[config] DATABASE_URL no está definido en producción: uso SQLite local');
  return { dialect: 'sqlite', storage: path.resolve(process.env.DATABASE_PATH?.trim() || 'database.sqlite') };
}

export const config = {
  isProduction,
  isTest,
  port: Number(read('PORT', '3000')),
  database: database(),
  jwtSecret: read('JWT_SECRET', 'dev-secret-cambiar', { requiredInProduction: true }),
  /** Carpeta que se publica en /data (imágenes y archivos subidos). */
  dataDir: path.resolve('data'),
  /** Carpeta de archivos subidos. Las pruebas usan una temporal. */
  uploadsDir: isTest ? path.join(os.tmpdir(), 'detoke-test-uploads') : path.resolve('data/uploads'),
  /** Orígenes que pueden llamar a la API en producción, además de la web (mismo origen). */
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost,https://localhost').split(',').map((s) => s.trim()).filter(Boolean),
};
