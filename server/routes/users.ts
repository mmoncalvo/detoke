import { Router, type Request } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentUser, requireAuth } from '../middleware/requireAuth.js';
import { Category, Product, User } from '../models/index.js';
import { ok } from '../services/response.js';
import { upload, uploadPath } from '../services/upload.js';

export const userRoutes = Router();

const LIST_ATTRIBUTES = ['id', 'slug', 'businessName', 'description', 'logo', 'coverImage', 'whatsapp', 'address', 'latitude', 'longitude', 'isVerified', 'hours', 'gallery'];
const PROFILE_ATTRIBUTES = [...LIST_ATTRIBUTES, 'website'];

const userUpdateSchema = z.object({
  businessName: z.string().min(3).optional(),
  description: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  hours: z.string().optional(), // JSON
  gallery: z.string().optional(), // JSON
  website: z.string().url().optional(),
});

/** Active business with its available products. */
async function findBusiness(where: WhereOptions) {
  const user = await User.findOne({
    where: { ...where, isActive: true },
    attributes: PROFILE_ATTRIBUTES,
    include: [{
      model: Product,
      where: { isAvailable: true },
      include: [{ model: Category, attributes: ['id', 'name', 'icon'] }],
      required: false,
    }],
  });
  if (!user) throw new HttpError(404, 'Empresa no encontrada');
  return user;
}

/** Only the profile owner or an admin. */
async function findEditableUser(req: Request) {
  const me = currentUser(req);
  if (me.id !== req.params.id && me.role !== 'admin') throw new HttpError(403, 'No autorizado');
  const user = await User.findByPk(req.params.id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  return user;
}

/** Normalizes a JSON field stored as text. */
function normalizeJson(value: string, error: string) {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    throw new HttpError(400, error);
  }
}

// Public: list active businesses
userRoutes.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;
  const where: Record<string | symbol, unknown> = { isActive: true };
  if (search) where.businessName = { [Op.like]: `%${search}%` };

  const users = await User.findAll({
    where: where as WhereOptions,
    attributes: LIST_ATTRIBUTES,
    include: [{ model: Product, attributes: ['id'], where: { isAvailable: true }, required: false }],
    order: [['businessName', 'ASC']],
  });

  ok(res, users);
}));

// Public: get a business by slug
userRoutes.get('/slug/:slug', asyncHandler(async (req, res) => {
  ok(res, await findBusiness({ slug: req.params.slug }));
}));

// Public: get a business by id
userRoutes.get('/:id', asyncHandler(async (req, res) => {
  ok(res, await findBusiness({ id: req.params.id }));
}));

// Protected: update the business profile
userRoutes.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const user = await findEditableUser(req);
  const data = userUpdateSchema.parse(req.body);

  if (data.hours) data.hours = normalizeJson(data.hours, 'Formato de horario inválido');
  if (data.gallery) data.gallery = normalizeJson(data.gallery, 'Formato de galería inválido');

  await user.update(data);

  ok(res, await User.findByPk(req.params.id, { attributes: PROFILE_ATTRIBUTES }));
}));

// Public: products of a business
userRoutes.get('/:id/products', asyncHandler(async (req, res) => {
  const { categoryId } = req.query;
  const where: Record<string, unknown> = { userId: req.params.id, isAvailable: true };
  if (categoryId) where.categoryId = categoryId;

  const products = await Product.findAll({
    where: where as WhereOptions,
    include: [{ model: Category, attributes: ['id', 'name', 'icon'] }],
    order: [['createdAt', 'DESC']],
  });

  ok(res, products);
}));

// Protected: upload the cover image
userRoutes.post('/:id/upload-cover', requireAuth, upload.single('cover'), asyncHandler(async (req, res) => {
  const user = await findEditableUser(req);
  if (!req.file) throw new HttpError(400, 'Falta la imagen');

  const coverImage = uploadPath(req.file);
  await user.update({ coverImage });

  ok(res, { coverImage });
}));

// Protected: add images to the gallery
userRoutes.post('/:id/upload-gallery', requireAuth, upload.array('gallery', 10), asyncHandler(async (req, res) => {
  const user = await findEditableUser(req);

  const files = (req.files ?? []) as Express.Multer.File[];
  const gallery = [...JSON.parse(user.gallery || '[]'), ...files.map(uploadPath)];
  await user.update({ gallery: JSON.stringify(gallery) });

  ok(res, { gallery });
}));
