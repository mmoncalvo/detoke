import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { Business } from '../models/index.js';
import { businessPreviewImage, sitePreviewImage } from '../services/pageMeta.js';

export const ogRoutes = Router();

// Public: the link preview image of a business (also used for its orders)
ogRoutes.get('/business/:file', asyncHandler(async (req, res) => {
  const slug = req.params.file.replace(/\.jpg$/, '');
  const business = await Business.findOne({ where: { slug, isActive: true } });
  if (!business) throw new HttpError(404, 'No encontramos ese negocio');
  res.type('jpg').set('Cache-Control', 'public, max-age=86400').send(await businessPreviewImage(business));
}));

// Public: the preview image of pages without a business
ogRoutes.get('/site.jpg', asyncHandler(async (_req, res) => {
  res.type('jpg').set('Cache-Control', 'public, max-age=86400').send(await sitePreviewImage());
}));
