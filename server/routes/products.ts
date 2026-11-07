import { Router, type Request } from 'express';
import { fold } from '../../shared/business.js';
import { productSchema, productUpdateSchema } from '../../shared/schemas.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { currentBusiness, requireAuth } from '../middleware/requireAuth.js';
import { Business, Product, ProductCategory } from '../models/index.js';
import { ok } from '../services/response.js';
import { uniqueSlug } from '../services/slug.js';
import { saveImage, upload } from '../services/upload.js';

export const productRoutes = Router();

const BUSINESS_SUMMARY = ['id', 'name', 'slug', 'logo', 'whatsapp', 'hours', 'deliveryOptions', 'deliveryFee', 'minimumOrder', 'paymentMethods'];

/** The product with that id, if it belongs to the requester's business. */
async function findOwnProduct(req: Request) {
  const [product, business] = await Promise.all([Product.findByPk(req.params.id), currentBusiness(req)]);
  if (!product) throw new HttpError(404, 'No encontramos ese producto');
  if (product.businessId !== business.id) throw new HttpError(403, 'Ese producto no es de tu negocio');
  return product;
}

async function assertCategory(id?: string | null) {
  if (id && !(await ProductCategory.findByPk(id))) throw new HttpError(400, 'Elegí una categoría de la lista');
}

// Public: list available products of active businesses. Filters: businessId, category (slug), search, featured
productRoutes.get('/', asyncHandler(async (req, res) => {
  const { businessId, category, search, featured } = req.query;

  const products = await Product.findAll({
    where: {
      isAvailable: true,
      ...(typeof businessId === 'string' && { businessId }),
      ...(featured === 'true' && { featured: true }),
    },
    include: [
      { model: Business, attributes: BUSINESS_SUMMARY, where: { isActive: true } },
      { model: ProductCategory, ...(typeof category === 'string' && category ? { where: { slug: category } } : {}) },
    ],
    order: [['featured', 'DESC'], ['name', 'ASC']],
  });

  const term = typeof search === 'string' ? fold(search.trim()) : '';
  ok(res, term ? products.filter((p) => fold(p.name).includes(term)) : products);
}));

// Protected: every product of the session user's business, available or not
productRoutes.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const business = await currentBusiness(req);
  ok(res, await Product.findAll({ where: { businessId: business.id }, include: [ProductCategory], order: [['name', 'ASC']] }));
}));

// Protected: upload a product image; the path then goes in the product's images
productRoutes.post('/images', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  await currentBusiness(req);
  ok(res, { path: await saveImage(req.file, 'product') }, 201);
}));

// Public: a product
productRoutes.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    where: { id: req.params.id },
    include: [{ model: Business, attributes: BUSINESS_SUMMARY }, ProductCategory],
  });
  if (!product) throw new HttpError(404, 'No encontramos ese producto');
  ok(res, product);
}));

// Protected: create a product
productRoutes.post('/', requireAuth, asyncHandler(async (req, res) => {
  const business = await currentBusiness(req);
  const data = productSchema.parse(req.body);
  await assertCategory(data.productCategoryId);

  const product = await Product.create({ ...data, businessId: business.id, slug: await uniqueSlug(Product, `${data.name}-${business.slug}`) });
  ok(res, await Product.findByPk(product.id, { include: [ProductCategory] }), 201);
}));

// Protected: update a product, any subset of its fields (owner only)
productRoutes.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const product = await findOwnProduct(req);
  const data = productUpdateSchema.parse(req.body);
  await assertCategory(data.productCategoryId);

  await product.update(data);
  ok(res, await Product.findByPk(product.id, { include: [ProductCategory] }));
}));

// Protected: delete a product (owner only)
productRoutes.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const product = await findOwnProduct(req);
  await product.destroy();
  ok(res, { id: product.id });
}));
