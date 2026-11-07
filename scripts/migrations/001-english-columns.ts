// Renames the Spanish columns of an existing SQLite database to English, and translates
// the stored role and hours values. Safe to run more than once. Uses DATABASE_PATH if set.
//   npx tsx scripts/migrations/001-english-columns.ts
import sqlite3 from 'sqlite3';
import { config } from '../../server/config.js';

const COLUMN_RENAMES: Record<string, Record<string, string>> = {
  Users: {
    latitud: 'latitude',
    longitud: 'longitude',
    horario: 'hours',
    galeria: 'gallery',
    imagenPortada: 'coverImage',
    estaVerificado: 'isVerified',
    sitioWeb: 'website',
  },
  Products: { destacado: 'featured' },
};

const DAYS: Record<string, string> = {
  lunes: 'monday',
  martes: 'tuesday',
  miercoles: 'wednesday',
  jueves: 'thursday',
  viernes: 'friday',
  sabado: 'saturday',
  domingo: 'sunday',
};

const TABLES = ['Users', 'Products', 'Categories'];

if (config.database.dialect !== 'sqlite') throw new Error('This migration only applies to SQLite');
const storage = config.database.storage;
const db = new sqlite3.Database(storage, sqlite3.OPEN_READWRITE);

const run = (sql: string, params: unknown[] = []) =>
  new Promise<void>((resolve, reject) => db.run(sql, params, (err) => (err ? reject(err) : resolve())));
const all = <T>(sql: string, params: unknown[] = []) =>
  new Promise<T[]>((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[]))));

const columnsOf = async (table: string) => (await all<{ name: string }>(`PRAGMA table_info(\`${table}\`)`)).map((c) => c.name);
const counts = async () => {
  const result: Record<string, number> = {};
  for (const table of TABLES) result[table] = (await all<{ n: number }>(`SELECT COUNT(*) AS n FROM \`${table}\``))[0].n;
  return result;
};

function translateHours(value: string) {
  const entries = Object.entries(JSON.parse(value) as Record<string, string>).map(([day, time]) => [
    DAYS[day] ?? day,
    time.toLowerCase() === 'cerrado' ? 'closed' : time,
  ]);
  return JSON.stringify(Object.fromEntries(entries));
}

/** RENAME COLUMN keeps the old DEFAULT, and SQLite can only change it by rebuilding the table. */
async function replaceRoleDefault() {
  const [{ sql }] = await all<{ sql: string }>(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'Users'`);
  if (!sql.includes(`DEFAULT 'vendedor'`)) return;

  const createSql = sql.replace(`DEFAULT 'vendedor'`, `DEFAULT 'seller'`).replace(/^CREATE TABLE\s+[`"]?Users[`"]?/, 'CREATE TABLE `Users_migrated`');
  if (!createSql.includes('Users_migrated')) throw new Error('Could not rewrite the Users table definition');

  const columns = (await columnsOf('Users')).map((c) => `\`${c}\``).join(', ');
  await run(createSql);
  await run(`INSERT INTO Users_migrated (${columns}) SELECT ${columns} FROM Users`);
  await run('DROP TABLE Users');
  await run('ALTER TABLE Users_migrated RENAME TO Users');
}

async function migrate() {
  // DROP TABLE Users with foreign keys on would cascade and delete every product.
  await run('PRAGMA foreign_keys = OFF');
  const [{ foreign_keys: foreignKeys }] = await all<{ foreign_keys: number }>('PRAGMA foreign_keys');
  if (foreignKeys !== 0) throw new Error('Could not disable foreign keys; aborting');

  const before = await counts();
  await run('BEGIN IMMEDIATE');
  try {
    for (const [table, renames] of Object.entries(COLUMN_RENAMES)) {
      const columns = await columnsOf(table);
      for (const [from, to] of Object.entries(renames)) {
        if (columns.includes(from)) await run(`ALTER TABLE \`${table}\` RENAME COLUMN \`${from}\` TO \`${to}\``);
      }
    }

    await replaceRoleDefault();
    await run(`UPDATE Users SET role = 'seller' WHERE role = 'vendedor'`);

    const users = await all<{ id: string; hours: string }>(`SELECT id, hours FROM Users WHERE hours IS NOT NULL AND hours <> ''`);
    for (const { id, hours } of users) {
      const translated = translateHours(hours);
      if (translated !== hours) await run('UPDATE Users SET hours = ? WHERE id = ?', [translated, id]);
    }

    const after = await counts();
    if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error(`Row counts changed: ${JSON.stringify({ before, after })}`);
    const violations = await all('PRAGMA foreign_key_check');
    if (violations.length > 0) throw new Error(`Foreign key violations: ${violations.length}`);

    await run('COMMIT');
    console.log(`Migrated ${storage}:`, after);
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

await migrate();
db.close();
