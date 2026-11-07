import express from 'express';
import { Category } from '../models/index.js';

const router = express.Router();

// Público: Listar categorías activas
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
