import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Business, BusinessCategory, ProductCategory } from '../models/index.js';
import { ok } from '../services/response.js';

export const businessCategoryRoutes = Router();
export const productCategoryRoutes = Router();

// Public: business categories, with how many active businesses each one has
businessCategoryRoutes.get('/', asyncHandler(async (_req, res) => {
  const [categories, businesses] = await Promise.all([
    BusinessCategory.findAll({ order: [['position', 'ASC']] }),
    Business.findAll({ where: { isActive: true }, attributes: ['businessCategoryId'] }),
  ]);
  const counts = new Map<string, number>();
  for (const { businessCategoryId: id } of businesses) counts.set(id, (counts.get(id) ?? 0) + 1);

  ok(res, categories.map((c) => ({ ...c.toJSON(), businessCount: counts.get(c.id) ?? 0 })));
}));

// Public: product categories
productCategoryRoutes.get('/', asyncHandler(async (_req, res) => {
  ok(res, await ProductCategory.findAll({ order: [['position', 'ASC']] }));
}));
