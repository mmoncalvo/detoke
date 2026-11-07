import { Router } from 'express';
import { fold } from '../../shared/business.js';
import type { SearchResult } from '../../shared/types.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Business, BusinessCategory, Product } from '../models/index.js';
import { ok } from '../services/response.js';

export const searchRoutes = Router();

const LIMIT = 5;

// Public: global search across businesses, products and business categories
searchRoutes.get('/', asyncHandler(async (req, res) => {
  const { q } = req.query;
  const term = typeof q === 'string' ? fold(q.trim()) : '';
  if (!term) return ok(res, []);

  const [businesses, products, categories] = await Promise.all([
    Business.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'slug', 'logo', 'neighborhood'], include: [{ model: BusinessCategory, attributes: ['name'] }] }),
    Product.findAll({
      where: { isAvailable: true },
      attributes: ['id', 'name', 'price', 'images'],
      include: [{ model: Business, attributes: ['name', 'slug'], where: { isActive: true } }],
    }),
    BusinessCategory.findAll(),
  ]);

  const matches = (text: string) => fold(text).includes(term);
  const results: SearchResult[] = [
    ...categories.filter((c) => matches(c.name)).slice(0, LIMIT).map((c): SearchResult => ({ type: 'category', id: c.id, title: c.name, subtitle: 'Rubro', slug: c.slug, icon: c.icon })),
    ...businesses.filter((b) => matches(b.name)).slice(0, LIMIT).map((b): SearchResult => ({
      type: 'business', id: b.id, title: b.name, subtitle: [b.category?.name, b.neighborhood].filter(Boolean).join(' · '), slug: b.slug, image: b.logo,
    })),
    ...products.filter((p) => matches(p.name)).slice(0, LIMIT).map((p): SearchResult => ({
      type: 'product', id: p.id, title: p.name, subtitle: p.business?.name ?? '', slug: p.business?.slug ?? '', image: p.images[0] ?? null, price: p.price,
    })),
  ];

  ok(res, results);
}));
