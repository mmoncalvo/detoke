import express from 'express';
import { Product, Category, User } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';
import path from 'path';
import multer from 'multer';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'data', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const productSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.preprocess((val) => parseFloat(val as string), z.number().positive()),
  categoryId: z.string().optional(),
  images: z.array(z.string()).optional(),
  whatsapp: z.string().optional(),
  isAvailable: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional())
});

// Público: Listar productos con filtros
router.get('/', async (req, res) => {
  try {
    const { categoryId, userId, search } = req.query;
    const where: any = { isAvailable: true };
    
    if (categoryId) where.categoryId = categoryId;
    if (userId) where.userId = userId;
    if (search) where.title = { [Symbol.for('like')]: `%${search}%` };
    
    const products = await Product.findAll({
      where,
      include: [
        { model: User, attributes: ['id', 'businessName', 'slug', 'whatsapp', 'logo'] },
        { model: Category, attributes: ['id', 'name', 'icon'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Público: Obtener producto por ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['id', 'businessName', 'slug', 'whatsapp', 'logo', 'description'] },
        { model: Category, attributes: ['id', 'name', 'icon'] }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protegido: Subir imagen del producto
router.post('/:id/upload-image', authenticate, upload.single('image'), async (req: any, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    
    if (product.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    
    const imagePath = '/data/uploads/' + req.file.filename;
    const currentImages = JSON.parse(product.images || '[]');
    const updatedImages = [...currentImages, imagePath];
    
    await product.update({ images: JSON.stringify(updatedImages) });
    
    res.json({ success: true, data: { images: updatedImages } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protegido: Crear producto con imagen
router.post('/', authenticate, upload.single('image'), async (req: any, res) => {
  try {
    console.log('--- REQ BODY ---');
    console.log(req.body);
    console.log('--- REQ FILE ---');
    console.log(req.file);

    const data = productSchema.parse(req.body);
    let imagePath: string | undefined;

    if (req.file) {
      imagePath = '/data/uploads/' + req.file.filename;
    }

    const product = await Product.create({
      ...data,
      userId: req.user.id,
      images: JSON.stringify(imagePath ? [imagePath] : []), 
    });

    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    console.error('--- ZOD/VALIDATION ERROR ---');
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protegido: Actualizar producto (solo dueño)
router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    if (product.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    const data = productSchema.partial().parse(req.body);
    
    await product.update({
      ...data,
      images: data.images ? JSON.stringify(data.images) : undefined
    });

    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protegido: Eliminar producto (solo dueño)
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    if (product.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    await product.destroy();
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
