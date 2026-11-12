// npm run db:demo [demo|dolores] — reloads only the sample data; real accounts, businesses and orders stay.
import { sequelize } from '../server/db.js';
import { ADMIN_EMAIL, DEMO_PASSWORD, SEED_SETS, isSeedSet, refreshDemo } from '../server/services/seed.js';

const set = process.argv[2] ?? 'demo';
if (!isSeedSet(set)) {
  console.error(`Unknown set "${set}". Options: ${Object.keys(SEED_SETS).join(', ')}`);
  process.exit(1);
}

const { businesses, products, orders, accounts } = await refreshDemo(set);
console.log(`Sample data (${set}) reloaded: ${businesses} businesses, ${products} products, ${orders} orders.`);
console.log(`Password for every demo account: ${DEMO_PASSWORD}`);
console.log(`  ${ADMIN_EMAIL} (admin)`);
for (const account of accounts) console.log(`  ${account}`);
await sequelize.close();
