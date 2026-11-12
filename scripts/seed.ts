// npm run db:seed [demo|dolores] — wipes the database and loads a business set (demo by default).
import { sequelize } from '../server/db.js';
import { ADMIN_EMAIL, DEMO_PASSWORD, SEED_SETS, isSeedSet, seed } from '../server/services/seed.js';

const set = process.argv[2] ?? 'demo';
if (!isSeedSet(set)) {
  console.error(`Unknown set "${set}". Options: ${Object.keys(SEED_SETS).join(', ')}`);
  process.exit(1);
}

const { businesses, products, accounts } = await seed(set);
console.log(`Sample data (${set}) loaded: ${businesses} businesses, ${products} products.`);
console.log(`Password for every account: ${DEMO_PASSWORD}`);
console.log(`  ${ADMIN_EMAIL} (admin)`);
for (const account of accounts) console.log(`  ${account}`);
await sequelize.close();
