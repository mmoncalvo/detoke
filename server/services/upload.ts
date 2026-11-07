import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';

fs.mkdirSync(config.uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });

/** Public path of an uploaded file. */
export const uploadPath = (file: Express.Multer.File) => '/data/uploads/' + file.filename;
