import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { reverseGeocode, searchAddresses, searchCities } from '../services/geo.js';
import { ok } from '../services/response.js';

export const geoRoutes = Router();

geoRoutes.use(rateLimit({ windowMs: 60_000, max: config.isTest ? 10_000 : 90, message: 'Hiciste muchas búsquedas seguidas, esperá un momento' }));

const latitude = z.coerce.number({ invalid_type_error: 'Ubicación inválida' }).min(-90, 'Ubicación inválida').max(90, 'Ubicación inválida');
const longitude = z.coerce.number({ invalid_type_error: 'Ubicación inválida' }).min(-180, 'Ubicación inválida').max(180, 'Ubicación inválida');

// Public: cities and localities, "Ciudad, Provincia"
geoRoutes.get('/cities', asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 80);
  ok(res, q.length < 2 ? [] : await searchCities(q));
}));

// Public: street addresses, near the selected city when lat and lng are given
geoRoutes.get('/addresses', asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 120);
  const near = req.query.lat !== undefined && req.query.lng !== undefined
    ? z.object({ latitude, longitude }).parse({ latitude: req.query.lat, longitude: req.query.lng })
    : null;
  ok(res, q.length < 3 ? [] : await searchAddresses(q, near));
}));

// Public: the address at a point of the map
geoRoutes.get('/reverse', asyncHandler(async (req, res) => {
  const point = z.object({ latitude, longitude }).parse({ latitude: req.query.lat, longitude: req.query.lng });
  ok(res, await reverseGeocode(point.latitude, point.longitude));
}));
