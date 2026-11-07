import { Router } from 'express';
import { ok } from '../services/response.js';
import { authRoutes } from './auth.js';
import { categoryRoutes } from './categories.js';
import { productRoutes } from './products.js';
import { searchRoutes } from './search.js';
import { userRoutes } from './users.js';

export const apiRoutes = Router();
apiRoutes.get('/health', (_req, res) => ok(res, { status: 'ok', db: 'connected' }));
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/products', productRoutes);
apiRoutes.use('/categories', categoryRoutes);
apiRoutes.use('/search', searchRoutes);
