import { Router } from 'express';
import { openStatus, fold } from '../../shared/business.js';
import { businessUpdateSchema, newBusinessSchema } from '../../shared/schemas.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentBusiness, currentUser, requireAuth } from '../middleware/requireAuth.js';
import { Business, BusinessCategory, Product, ProductCategory } from '../models/index.js';
import { ok } from '../services/response.js';
import { uniqueSlug } from '../services/slug.js';
import { saveImage, upload } from '../services/upload.js';

export const businessRoutes = Router();

const MAX_GALLERY_IMAGES = 12;

const withCategory = (business: Business) => Business.findByPk(business.id, { include: [BusinessCategory] });

// Public: list active businesses. Filters: category (slug), search, open, delivery
businessRoutes.get('/', asyncHandler(async (req, res) => {
  const { category, search, open, delivery } = req.query;

  const [businesses, products] = await Promise.all([
    Business.findAll({ where: { isActive: true }, include: [BusinessCategory], order: [['name', 'ASC']] }),
    Product.findAll({ where: { isAvailable: true }, attributes: ['businessId'] }),
  ]);
  const counts = new Map<string, number>();
  for (const { businessId } of products) counts.set(businessId, (counts.get(businessId) ?? 0) + 1);

  const term = typeof search === 'string' ? fold(search.trim()) : '';
  const matches = (b: Business) =>
    (!category || b.category?.slug === category) &&
    (!term || [b.name, b.tagline, b.neighborhood, b.category?.name].some((text) => text && fold(text).includes(term))) &&
    (open !== 'true' || openStatus(b.hours).isOpen) &&
    (delivery !== 'true' || b.deliveryOptions.includes('delivery'));

  ok(res, businesses.filter(matches).map((b) => ({ ...b.toJSON(), productCount: counts.get(b.id) ?? 0 })));
}));

// Protected: the session user's business
businessRoutes.get('/me', requireAuth, asyncHandler(async (req, res) => {
  ok(res, await withCategory(await currentBusiness(req)));
}));

// Protected: create the business of an account that has none (accounts made with Google)
businessRoutes.post('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req);
  if (user.role === 'admin') throw new HttpError(403, 'Las cuentas de administración no tienen negocio');
  if (await Business.findOne({ where: { ownerId: user.id } })) throw new HttpError(409, 'Tu cuenta ya tiene un negocio');

  const data = newBusinessSchema.parse(req.body);
  if (!(await BusinessCategory.findByPk(data.businessCategoryId))) throw new HttpError(400, 'Elegí un rubro de la lista');

  const business = await Business.create({ ...data, ownerId: user.id, slug: await uniqueSlug(Business, data.name) });
  // A customer who adds a business becomes a seller (and keeps their orders).
  if (user.role === 'customer') await user.update({ role: 'seller' });
  ok(res, await withCategory(business), 201);
}));

// Protected: update the session user's business, any subset of its fields
businessRoutes.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const data = businessUpdateSchema.parse(req.body);
  if (data.businessCategoryId && !(await BusinessCategory.findByPk(data.businessCategoryId))) throw new HttpError(400, 'Elegí un rubro de la lista');

  const business = await currentBusiness(req);
  await business.update(data);
  ok(res, await withCategory(business));
}));

// Protected: replace the logo or the cover
for (const [route, field, preset] of [['logo', 'logo', 'logo'], ['cover', 'coverImage', 'cover']] as const) {
  businessRoutes.post(`/me/${route}`, requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
    const business = await currentBusiness(req);
    await business.update({ [field]: await saveImage(req.file, preset) });
    ok(res, await withCategory(business));
  }));
}

// Protected: add images to the gallery
businessRoutes.post('/me/gallery', requireAuth, upload.array('images', 6), asyncHandler(async (req, res) => {
  const business = await currentBusiness(req);
  const files = (req.files ?? []) as Express.Multer.File[];
  if (files.length === 0) throw new HttpError(400, 'Elegí una imagen');
  if (business.gallery.length + files.length > MAX_GALLERY_IMAGES) throw new HttpError(400, `La galería admite hasta ${MAX_GALLERY_IMAGES} imágenes`);

  const added = await Promise.all(files.map((file) => saveImage(file, 'gallery')));
  await business.update({ gallery: [...business.gallery, ...added] });
  ok(res, await withCategory(business));
}));

// Protected: remove an image from the gallery
businessRoutes.delete('/me/gallery', requireAuth, asyncHandler(async (req, res) => {
  const business = await currentBusiness(req);
  await business.update({ gallery: business.gallery.filter((image) => image !== req.body?.image) });
  ok(res, await withCategory(business));
}));

// Public: a business with its available products
businessRoutes.get('/:slug', asyncHandler(async (req, res) => {
  const business = await Business.findOne({
    where: { slug: req.params.slug, isActive: true },
    include: [
      BusinessCategory,
      { model: Product, where: { isAvailable: true }, required: false, include: [ProductCategory] },
    ],
    order: [[{ model: Product, as: 'products' }, 'featured', 'DESC'], [{ model: Product, as: 'products' }, 'name', 'ASC']],
  });
  if (!business) {
    // A disabled business is not shown, but it is told apart from a wrong link.
    const disabled = await Business.count({ where: { slug: req.params.slug, isActive: false } });
    throw new HttpError(404, disabled ? 'Este negocio no está disponible por ahora' : 'No encontramos ese negocio');
  }

  ok(res, business);
}));
