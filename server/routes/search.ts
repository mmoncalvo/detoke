import { Router } from 'express';
import { Sequelize } from 'sequelize';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Category, Product, User } from '../models/index.js';
import { ok } from '../services/response.js';

export const searchRoutes = Router();

const contains = (column: string, term: string) =>
  Sequelize.where(Sequelize.fn('LOWER', Sequelize.col(column)), 'LIKE', `%${term}%`);

// Público: buscador global de negocios, productos y categorías
searchRoutes.get('/', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') return ok(res, []);

  const term = q.toLowerCase();
  const [users, products, categories] = await Promise.all([
    User.findAll({ where: contains('businessName', term), attributes: ['id', 'businessName', 'slug', 'logo'], limit: 5 }),
    Product.findAll({
      where: contains('title', term),
      attributes: ['id', 'title', 'price', 'images'],
      include: [{ model: User, attributes: ['slug'] }],
      limit: 5,
    }),
    Category.findAll({ where: contains('name', term), attributes: ['id', 'name', 'icon'], limit: 5 }),
  ]);

  ok(res, [
    ...users.map((u) => ({ id: u.id, type: 'negocio', title: u.businessName, slug: u.slug, logo: u.logo, icon: '🏪', subtitle: 'Negocio' })),
    ...products.map((p) => ({ id: p.id, type: 'producto', title: p.title, slug: p.User?.slug, images: p.images, price: p.price, icon: '📦', subtitle: 'Producto' })),
    ...categories.map((c) => ({ id: c.id, type: 'categoria', title: c.name, icon: c.icon, subtitle: 'Categoría' })),
  ]);
}));
