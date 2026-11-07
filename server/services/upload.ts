// Image uploads: validated, resized with sharp and stored as WebP.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { config } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Solo se aceptan imágenes JPG, PNG o WEBP'));
  },
});

const PRESETS = {
  logo: { width: 512, height: 512, fit: 'cover' },
  cover: { width: 1600, height: 900, fit: 'cover' },
  product: { width: 1000, height: 1000, fit: 'cover' },
  gallery: { width: 1600, height: 1600, fit: 'inside' },
} as const;

/** Saves the image and returns its public path. */
export async function saveImage(file: Express.Multer.File | undefined, preset: keyof typeof PRESETS) {
  if (!file) throw new HttpError(400, 'Elegí una imagen');
  const { width, height, fit } = PRESETS[preset];

  let buffer: Buffer;
  try {
    buffer = await sharp(file.buffer).rotate().resize({ width, height, fit, withoutEnlargement: fit === 'inside' }).webp({ quality: 82 }).toBuffer();
  } catch {
    throw new HttpError(400, 'No pudimos leer la imagen, probá con otra');
  }

  await fs.mkdir(config.uploadsDir, { recursive: true });
  const name = `${preset}-${crypto.randomUUID()}.webp`;
  await fs.writeFile(path.join(config.uploadsDir, name), buffer);
  return `/data/uploads/${name}`;
}
