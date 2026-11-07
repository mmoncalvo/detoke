import { Router, type Request } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentUser, requireAuth } from '../middleware/requireAuth.js';
import { Category, Product, User } from '../models/index.js';
import { ok } from '../services/response.js';
import { upload, uploadPath } from '../services/upload.js';

export const productRoutes = Router();

const productSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.preprocess((val) => parseFloat(val as string), z.number().positive()),
  categoryId: z.string().optional(),
  images: z.array(z.string()).optional(),
  whatsapp: z.string().optional(),
  isAvailable: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
});

/** El producto del id, si es de quien hace el pedido. */
async function findOwnProduct(req: Request) {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new HttpError(404, 'Producto no encontrado');
  if (product.userId !== currentUser(req).id) throw new HttpError(403, 'No autorizado');
  return product;
}

// Público: listar productos con filtros
productRoutes.get('/', asyncHandler(async (req, res) => {
  const { categoryId, userId, search } = req.query;
  const where: Record<string | symbol, unknown> = { isAvailable: true };

  if (categoryId) where.categoryId = categoryId;
  if (userId) where.userId = userId;
  if (search) where.title = { [Op.like]: `%${search}%` };

  const products = await Product.findAll({
    where: where as WhereOptions,
    include: [
      { model: User, attributes: ['id', 'businessName', 'slug', 'whatsapp', 'logo'] },
      { model: Category, attributes: ['id', 'name', 'icon'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  ok(res, products);
}));

// Público: obtener producto por id
productRoutes.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    include: [
      { model: User, attributes: ['id', 'businessName', 'slug', 'whatsapp', 'logo', 'description'] },
      { model: Category, attributes: ['id', 'name', 'icon'] },
    ],
  });
  if (!product) throw new HttpError(404, 'Producto no encontrado');

  ok(res, product);
}));

// Protegido: subir imagen del producto
productRoutes.post('/:id/upload-image', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  const product = await findOwnProduct(req);
  if (!req.file) throw new HttpError(400, 'Falta la imagen');

  const images = [...JSON.parse(product.images || '[]'), uploadPath(req.file)];
  await product.update({ images: JSON.stringify(images) });

  ok(res, { images });
}));

// Protegido: crear producto con imagen
productRoutes.post('/', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  const data = productSchema.parse(req.body);

  const product = await Product.create({
    ...data,
    userId: currentUser(req).id,
    images: JSON.stringify(req.file ? [uploadPath(req.file)] : []),
  });

  ok(res, product, 201);
}));

// Protegido: actualizar producto (solo dueño)
productRoutes.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const product = await findOwnProduct(req);
  const data = productSchema.partial().parse(req.body);

  await product.update({ ...data, images: data.images ? JSON.stringify(data.images) : undefined });

  ok(res, product);
}));

// Protegido: eliminar producto (solo dueño)
productRoutes.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const product = await findOwnProduct(req);
  await product.destroy();

  ok(res, { message: 'Producto eliminado' });
}));
