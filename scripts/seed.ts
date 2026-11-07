// npm run db:seed — wipes the database and loads the sample data.
import { sequelize } from '../server/db.js';
import { ADMIN_EMAIL, DEMO_PASSWORD, seed } from '../server/services/seed.js';

const { businesses, products, accounts } = await seed();
console.log(`Sample data loaded: ${businesses} businesses, ${products} products.`);
console.log(`Password for every account: ${DEMO_PASSWORD}`);
console.log(`  ${ADMIN_EMAIL} (admin)`);
for (const account of accounts) console.log(`  ${account}`);
await sequelize.close();
