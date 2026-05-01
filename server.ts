import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE ? path.join(process.cwd(), process.env.DB_STORAGE) : path.join(process.cwd(), 'database.sqlite'),
  logging: false
});

let dbReady = false;

const setDbReady = (status: boolean) => { dbReady = status; };
const isDbReady = () => dbReady;

const startServer = async () => {
  const app = (await import('express')).default();
  const PORT = 3000;

  app.use((await import('morgan')).default('dev'));
  app.use((await import('express')).default.json());
  app.use((await import('cors')).default());

  // API Routes
  app.use('/api', (await import('./routes/api.js')).default);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: isDbReady() ? 'connected' : 'initializing' });
  });

  try {
    await sequelize.authenticate();
    await sequelize.sync();
    setDbReady(true);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer();

export { sequelize, isDbReady, setDbReady };
