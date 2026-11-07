import { sequelize, User, Product, Category } from './models/index.js';
import bcrypt from 'bcryptjs';
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

    // Seed categories
    for (const cat of categories) {
      await Category.create(cat);
    }

    // Seed users with hashed passwords
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await User.create({ ...user, password: hashedPassword });
    }

    // Seed products
    for (const product of products) {
      await Product.create(product);
    }

    console.log('Seeding completed:', { users: users.length, products: products.length, categories: categories.length });
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

runSeed();
