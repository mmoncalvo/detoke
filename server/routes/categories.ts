import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Category } from '../models/index.js';
import { ok } from '../services/response.js';

export const categoryRoutes = Router();

// Público: listar categorías activas
categoryRoutes.get('/', asyncHandler(async (_req, res) => {
  const categories = await Category.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
  ok(res, categories);
}));
