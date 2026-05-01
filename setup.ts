import { sequelize } from './server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDir = path.join(__dirname, 'seed');

const runSeed = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });

    const users = JSON.parse(fs.readFileSync(path.join(seedDir, 'users.json'), 'utf8'));
    const products = JSON.parse(fs.readFileSync(path.join(seedDir, 'products.json'), 'utf8'));
    const categories = JSON.parse(fs.readFileSync(path.join(seedDir, 'categories.json'), 'utf8'));

    // Here you would insert into DB, simplified for example
    console.log('Seeding completed:', { users: users.length, products: products.length, categories: categories.length });
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

runSeed();
