import express from 'express';
import { Op } from 'sequelize';
import { User, Product, Category } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import path from 'path';
import multer from 'multer';
import { z } from 'zod'; // Import zod

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

// Zod schema for user profile updates
const userUpdateSchema = z.object({
  businessName: z.string().min(3).optional(),
  description: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  horario: z.string().optional(), // Expecting JSON string
  galeria: z.string().optional(), // Expecting JSON string
  sitioWeb: z.string().url().optional(),
  // Add other updatable fields as needed
}).partial(); // .partial() allows only submitting a subset of fields

// Público: Listar empresas activas
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const where: any = { isActive: true };
    
    if (search) where.businessName = { [Op.like]: `%${search}%` };
    
    const users = await User.findAll({
      where,
      attributes: ['id', 'slug', 'businessName', 'description', 'logo', 'imagenPortada', 'whatsapp', 'address', 'latitud', 'longitud', 'estaVerificado', 'horario', 'galeria'], // Include horario and galeria
      include: [{
        model: Product,
        attributes: ['id'],
        where: { isAvailable: true },
        required: false
      }],
      order: [['businessName', 'ASC']]
    });
    
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Público: Obtener empresa por slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { slug: req.params.slug, isActive: true },
      attributes: ['id', 'slug', 'businessName', 'description', 'logo', 'imagenPortada', 'whatsapp', 'address', 'latitud', 'longitud', 'estaVerificado', 'horario', 'galeria', 'sitioWeb'], // Include horario, galeria, sitioWeb
      include: [{
        model: Product,
        where: { isAvailable: true },
        include: [{ model: Category, attributes: ['id', 'name', 'icon'] }],
        required: false
      }]
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Público: Obtener empresa por ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, isActive: true },
      attributes: ['id', 'slug', 'businessName', 'description', 'logo', 'imagenPortada', 'whatsapp', 'address', 'latitud', 'longitud', 'estaVerificado', 'horario', 'galeria', 'sitioWeb'], // Include horario, galeria, sitioWeb
      include: [{
        model: Product,
        where: { isAvailable: true },
        include: [{ model: Category, attributes: ['id', 'name', 'icon'] }],
        required: false
      }]
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protegido: Actualizar perfil de usuario (empresa)
router.put('/:id', authenticate, async (req: any, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const data = userUpdateSchema.parse(req.body);

    // Handle JSON parsing for horario and galeria if they exist
    if (data.horario && typeof data.horario === 'string') {
        try {
            data.horario = JSON.stringify(JSON.parse(data.horario));
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Formato de horario inválido' });
        }
    }
    if (data.galeria && typeof data.galeria === 'string') {
        try {
            data.galeria = JSON.stringify(JSON.parse(data.galeria));
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Formato de galería inválido' });
        }
    }
    
    await user.update(data);

    // Fetch the updated user to return fresh data
    const updatedUser = await User.findByPk(req.params.id, {
      attributes: ['id', 'slug', 'businessName', 'description', 'logo', 'imagenPortada', 'whatsapp', 'address', 'latitud', 'longitud', 'estaVerificado', 'horario', 'galeria', 'sitioWeb'],
    });

    res.json({ success: true, data: updatedUser });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
});


// Protegido: Productos de una empresa
router.get('/:id/products', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const where: any = { userId: req.params.id, isAvailable: true };
    
    if (categoryId) where.categoryId = categoryId;

    const products = await Product.findAll({
      where,
      include: [{ model: Category, attributes: ['id', 'name', 'icon'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protegido: Subir imagen de portada
router.post('/:id/upload-cover', authenticate, upload.single('cover'), async (req: any, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    const imagePath = '/data/uploads/' + req.file.filename;
    await user.update({ imagenPortada: imagePath });
    res.json({ success: true, data: { imagenPortada: imagePath } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protegido: Agregar imagenes a galería
router.post('/:id/upload-gallery', authenticate, upload.array('gallery', 10), async (req: any, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    const newImages = (req.files as Express.Multer.File[]).map(f => '/data/uploads/' + f.filename);
    const currentGallery = JSON.parse(user.galeria || '[]');
    const updatedGallery = [...currentGallery, ...newImages];
    await user.update({ galeria: JSON.stringify(updatedGallery) });
    res.json({ success: true, data: { galeria: updatedGallery } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
