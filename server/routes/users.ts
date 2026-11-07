import { Router, type Request } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentUser, requireAuth } from '../middleware/requireAuth.js';
import { Category, Product, User } from '../models/index.js';
import { ok } from '../services/response.js';
import { upload, uploadPath } from '../services/upload.js';

export const userRoutes = Router();

const LIST_ATTRIBUTES = ['id', 'slug', 'businessName', 'description', 'logo', 'imagenPortada', 'whatsapp', 'address', 'latitud', 'longitud', 'estaVerificado', 'horario', 'galeria'];
const PROFILE_ATTRIBUTES = [...LIST_ATTRIBUTES, 'sitioWeb'];

const userUpdateSchema = z.object({
  businessName: z.string().min(3).optional(),
  description: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  horario: z.string().optional(), // JSON
  galeria: z.string().optional(), // JSON
  sitioWeb: z.string().url().optional(),
});

/** Empresa activa con sus productos disponibles. */
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

/** Solo el dueño del perfil o un admin. */
async function findEditableUser(req: Request) {
  const me = currentUser(req);
  if (me.id !== req.params.id && me.role !== 'admin') throw new HttpError(403, 'No autorizado');
  const user = await User.findByPk(req.params.id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  return user;
}

/** Normaliza un campo JSON guardado como texto. */
function normalizeJson(value: string, error: string) {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    throw new HttpError(400, error);
  }
}

// Público: listar empresas activas
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

// Público: obtener empresa por slug
userRoutes.get('/slug/:slug', asyncHandler(async (req, res) => {
  ok(res, await findBusiness({ slug: req.params.slug }));
}));

// Público: obtener empresa por id
userRoutes.get('/:id', asyncHandler(async (req, res) => {
  ok(res, await findBusiness({ id: req.params.id }));
}));

// Protegido: actualizar perfil de la empresa
userRoutes.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const user = await findEditableUser(req);
  const data = userUpdateSchema.parse(req.body);

  if (data.horario) data.horario = normalizeJson(data.horario, 'Formato de horario inválido');
  if (data.galeria) data.galeria = normalizeJson(data.galeria, 'Formato de galería inválido');

  await user.update(data);

  ok(res, await User.findByPk(req.params.id, { attributes: PROFILE_ATTRIBUTES }));
}));

// Público: productos de una empresa
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

// Protegido: subir imagen de portada
userRoutes.post('/:id/upload-cover', requireAuth, upload.single('cover'), asyncHandler(async (req, res) => {
  const user = await findEditableUser(req);
  if (!req.file) throw new HttpError(400, 'Falta la imagen');

  const imagenPortada = uploadPath(req.file);
  await user.update({ imagenPortada });

  ok(res, { imagenPortada });
}));

// Protegido: agregar imágenes a la galería
userRoutes.post('/:id/upload-gallery', requireAuth, upload.array('gallery', 10), asyncHandler(async (req, res) => {
  const user = await findEditableUser(req);

  const files = (req.files ?? []) as Express.Multer.File[];
  const galeria = [...JSON.parse(user.galeria || '[]'), ...files.map(uploadPath)];
  await user.update({ galeria: JSON.stringify(galeria) });

  ok(res, { galeria });
}));
