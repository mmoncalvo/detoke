// npm run db:seed — wipes the database and loads the sample data.
import { sequelize } from '../server/db.js';
import { seed } from '../server/services/seed.js';

console.log('Sample data loaded:', await seed());
await sequelize.close();
