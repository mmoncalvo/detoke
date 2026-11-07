import express from 'express';
import { Sequelize, Op } from 'sequelize';
import { User, Product, Category } from '../models/index.js';
import authRouter from './auth.js';
import usuariosRouter from './users.js';
import productosRouter from './products.js';
import categoriasRouter from './categories.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/usuarios', usuariosRouter);
router.use('/productos', productosRouter);
router.use('/categorias', categoriasRouter);

// Buscador Global
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Buscando con término:', q);
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, data: [] });
    }

    const searchTerm = `%${q}%`;

    const [users, products, categories] = await Promise.all([
      User.findAll({
        where: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('businessName')), 'LIKE', `%${q.toLowerCase()}%`),
        attributes: ['id', 'businessName', 'slug', 'logo'],
        limit: 5
      }),
      Product.findAll({
        where: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('title')), 'LIKE', `%${q.toLowerCase()}%`),
        attributes: ['id', 'title', 'price', 'images'],
        include: [{ model: User, attributes: ['slug'] }],
        limit: 5
      }),
      Category.findAll({
        where: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), 'LIKE', `%${q.toLowerCase()}%`),
        attributes: ['id', 'name', 'icon'],
        limit: 5
      })
    ]);

    const results = [
      ...users.map((u: any) => ({ id: u.id, type: 'negocio', title: u.businessName, slug: u.slug, logo: u.logo, icon: '🏪', subtitle: 'Negocio' })),
      ...products.map((p: any) => ({ id: p.id, type: 'producto', title: p.title, slug: p.User?.slug, images: p.images, price: p.price, icon: '📦', subtitle: 'Producto' })),
      ...categories.map((c: any) => ({ id: c.id, type: 'categoria', title: c.name, icon: c.icon, subtitle: 'Categoría' }))
    ];

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error en buscador global:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
