// npm run db:demo — reloads only the sample data; real accounts, businesses and orders stay.
import { sequelize } from '../server/db.js';
import { ADMIN_EMAIL, DEMO_PASSWORD, refreshDemo } from '../server/services/seed.js';

const { businesses, products, orders, accounts } = await refreshDemo();
console.log(`Sample data reloaded: ${businesses} businesses, ${products} products, ${orders} orders.`);
console.log(`Password for every demo account: ${DEMO_PASSWORD}`);
console.log(`  ${ADMIN_EMAIL} (admin)`);
for (const account of accounts) console.log(`  ${account}`);
await sequelize.close();
