// API client. Unwraps { success, data } and throws ApiError with the Spanish message.
import type { ApiResponse } from '@shared/types';

const TOKEN_KEY = 'token';
/** The admin's own session, kept aside while acting on behalf of someone else. */
const ADMIN_TOKEN_KEY = 'detoke.adminToken';
export const BASE: string = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage not available */
  }
}

export function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* storage not available */
  }
}

let onUnauthorized: (() => void) | null = null;

/** Called when a signed-in request gets a 401, for example an expired session. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const isForm = options.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
      },
      body: isForm ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.');
  }

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) throw new ApiError(res.status, 'Algo salió mal. Intentá de nuevo.');
  if (!json.success) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, json.error);
  }
  return json.data;
}
