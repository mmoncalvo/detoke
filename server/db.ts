import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { Sequelize } from 'sequelize-typescript';
import { config } from './config.js';
import { models } from './models/index.js';

const db = config.database;
if (db.dialect === 'sqlite') fs.mkdirSync(path.dirname(db.storage), { recursive: true });

export const isPostgres = db.dialect === 'postgres';

// No underscored: the existing database uses Users/Products/Categories tables and camelCase columns.
export const sequelize =
  db.dialect === 'postgres'
    ? new Sequelize(db.url, { dialect: 'postgres', logging: false, models })
    : new Sequelize({ dialect: 'sqlite', storage: db.storage, logging: false, models });

/**
 * Creates missing tables. Postgres also adjusts columns (alter); SQLite does not,
 * because alter recreates tables and breaks foreign keys.
 */
export async function initDb(opts: { reset?: boolean } = {}) {
  await sequelize.authenticate();
  if (opts.reset) return void (await sequelize.sync({ force: true }));
  await sequelize.sync(isPostgres ? { alter: true } : {});
}
