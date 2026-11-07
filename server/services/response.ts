import type { Response } from 'express';

/** Respuesta estándar { success: true, data }. */
export function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}
