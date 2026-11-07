import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { sequelize, User, Product, Category } from './models/index.js';
import apiRoutes from './routes/api.js';
import { authenticate } from './middleware/auth.js';

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use('/data', express.static(path.join(process.cwd(), 'data')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

// API routes
app.use('/api', apiRoutes);

// Start server
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    await sequelize.sync();
    console.log('Database synced');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
