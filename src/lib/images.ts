import { BASE } from '@/api';

/** Public URL of a stored image: a seed file name, an upload path or an absolute URL. */
export function imageUrl(path: string | null | undefined) {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  if (path.startsWith('/')) return `${BASE}${path}`;
  return `${BASE}/data/images/${encodeURIComponent(path)}`;
}
