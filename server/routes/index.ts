import { Router } from 'express';
import { ok } from '../services/response.js';
import { authRoutes } from './auth.js';
import { businessRoutes } from './businesses.js';
import { businessCategoryRoutes, productCategoryRoutes } from './categories.js';
import { contactRoutes } from './contact.js';
import { productRoutes } from './products.js';
import { searchRoutes } from './search.js';

export const apiRoutes = Router();
apiRoutes.get('/health', (_req, res) => ok(res, { status: 'ok', db: 'connected' }));
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/businesses', businessRoutes);
apiRoutes.use('/products', productRoutes);
apiRoutes.use('/business-categories', businessCategoryRoutes);
apiRoutes.use('/product-categories', productCategoryRoutes);
apiRoutes.use('/search', searchRoutes);
apiRoutes.use('/contact', contactRoutes);
