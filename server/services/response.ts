import type { Response } from 'express';

/** Standard { success: true, data } response. */
export function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}
