import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { MulterError } from 'multer';
import { ValidationError } from 'sequelize';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Express 4 does not catch errors from async handlers: forwards them to errorHandler. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: 'No encontrado' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ success: false, error: err.message });
  if (err instanceof ZodError) return res.status(400).json({ success: false, error: err.issues[0]?.message ?? 'Datos inválidos', details: err.issues });
  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera los 8 MB' : err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Archivo inesperado o demasiados archivos' : 'No se pudo recibir el archivo';
    return res.status(400).json({ success: false, error: message });
  }
  if (err instanceof ValidationError) return res.status(400).json({ success: false, error: 'Datos inválidos' });
  if (err instanceof SyntaxError) return res.status(400).json({ success: false, error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ success: false, error: 'Error interno' });
}
