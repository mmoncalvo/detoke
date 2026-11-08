// Geocoding proxy: Georef (Argentine cities) and Photon (OpenStreetMap search and reverse).
// Cached, throttled per upstream host, with a timeout and an identifying User-Agent.
import { fold } from '../../shared/business.js';
import type { AddressOption, CityOption } from '../../shared/geo.js';
import { config } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';

const GEOREF = 'https://apis.datos.gob.ar/georef/api';
const PHOTON = 'https://photon.komoot.io';
const COUNTRIES = new Set(['Argentina', 'Uruguay']);
const CABA = 'Ciudad Autónoma de Buenos Aires';
const CABA_CITY = 'Ciudad de Buenos Aires';

const TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 1000;

const unavailable = () => new HttpError(502, 'No pudimos consultar el mapa. Podés completar los datos a mano.');

// ------------------------------------------------------------------ cache
const cache = new Map<string, { value: unknown; expiresAt: number }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await load();
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return value;
}

export const clearGeoCache = () => cache.clear();

// ------------------------------------------------------------------ upstream calls
// At most one request per second to each service, as their usage policies ask.
const queues = new Map<string, Promise<void>>();

function throttle(host: string) {
  const gap = config.isTest ? 0 : 1000;
  const previous = queues.get(host) ?? Promise.resolve();
  const turn = previous.then(() => new Promise<void>((resolve) => setTimeout(resolve, gap)));
  queues.set(host, turn);
  return previous;
}

async function getJson<T>(url: string): Promise<T> {
  await throttle(new URL(url).host);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': `Detoke/1.0 (${config.contact.email ?? config.appUrl})`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[geo] ${new URL(url).host} failed:`, (err as Error).message);
    throw unavailable();
  } finally {
    clearTimeout(timer);
  }
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;
const cityName = (name: string | undefined, province: string | undefined) => (name === CABA || (!name && province === CABA) ? CABA_CITY : name);

// ------------------------------------------------------------------ cities
interface GeorefLocality {
  nombre: string;
  provincia: { nombre: string };
  centroide: { lat: number; lon: number };
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

/** Argentine localities from Georef plus Uruguayan cities from Photon, best matches first. */
export function searchCities(query: string): Promise<CityOption[]> {
  const term = query.trim();
  return cached(`cities:${fold(term)}`, async () => {
    const [georef, photon] = await Promise.allSettled([
      getJson<{ localidades: GeorefLocality[] }>(`${GEOREF}/localidades?${new URLSearchParams({ nombre: term, max: '12', campos: 'nombre,provincia.nombre,centroide' })}`),
      getJson<{ features: PhotonFeature[] }>(`${PHOTON}/api/?${new URLSearchParams({ q: term, limit: '15', layer: 'city', lat: '-34.7', lon: '-57' })}`),
    ]);
    if (georef.status === 'rejected' && photon.status === 'rejected') throw unavailable();

    const options: CityOption[] = [];
    if (georef.status === 'fulfilled') {
      for (const l of georef.value.localidades ?? []) {
        // Georef lists the barrios of Buenos Aires as localities of their own.
        const isBarrio = l.provincia.nombre === CABA && !/buenos aires/i.test(l.nombre);
        const city = isBarrio ? CABA_CITY : cityName(l.nombre, l.provincia.nombre) ?? l.nombre;
        options.push({
          id: '', label: '', city, province: l.provincia.nombre, country: 'Argentina', neighborhood: isBarrio ? l.nombre : null,
          latitude: round(l.centroide.lat), longitude: round(l.centroide.lon),
        });
      }
    }
    if (photon.status === 'fulfilled') {
      for (const { properties: p, geometry } of photon.value.features ?? []) {
        if (!p.country || !COUNTRIES.has(p.country) || p.country === 'Argentina' || !p.name) continue;
        options.push({
          id: '', label: '', city: p.name, province: p.state ?? '', country: p.country, neighborhood: null,
          latitude: round(geometry.coordinates[1]), longitude: round(geometry.coordinates[0]),
        });
      }
    }

    const folded = fold(term);
    const seen = new Set<string>();
    return options
      .map((o) => ({ ...o, id: [o.neighborhood, o.city, o.province, o.country].join('|'), label: [o.neighborhood ?? o.city, o.neighborhood ? o.city : o.province, o.country === 'Argentina' ? null : o.country].filter(Boolean).join(', ') }))
      .filter((o) => (seen.has(o.id) ? false : !!seen.add(o.id)))
      // Names that start with the query first; among them, the shorter (closer) ones.
      .sort((a, b) => {
        const nameA = fold(a.neighborhood ?? a.city);
        const nameB = fold(b.neighborhood ?? b.city);
        return Number(!nameA.startsWith(folded)) - Number(!nameB.startsWith(folded)) || nameA.length - nameB.length;
      })
      .slice(0, 8);
  });
}

// ------------------------------------------------------------------ addresses
function toAddress({ properties: p, geometry }: PhotonFeature, typedNumber?: string): AddressOption | null {
  const street = p.street ?? (p.type === 'street' ? p.name : undefined);
  if (!street) return null;
  const number = p.housenumber ?? typedNumber;
  const address = number ? `${street} ${number}` : street;
  const city = cityName(p.city, p.state) ?? p.county ?? null;
  const neighborhood = p.district ?? p.locality ?? null;
  return {
    id: `${geometry.coordinates.join(',')}|${address}`,
    label: [address, neighborhood, city].filter(Boolean).join(', '),
    address,
    neighborhood,
    city,
    province: p.state ?? null,
    postalCode: p.postcode ?? null,
    country: p.country ?? null,
    latitude: round(geometry.coordinates[1]),
    longitude: round(geometry.coordinates[0]),
  };
}

/** Street addresses near a point (the selected city), from OpenStreetMap. */
export function searchAddresses(query: string, near: { latitude: number; longitude: number } | null): Promise<AddressOption[]> {
  const term = query.trim();
  const key = `addresses:${fold(term)}:${near ? `${near.latitude.toFixed(2)},${near.longitude.toFixed(2)}` : ''}`;
  return cached(key, async () => {
    const params = new URLSearchParams({ q: term, limit: '8' });
    if (near) {
      const d = 0.3;
      params.set('bbox', [near.longitude - d, near.latitude - d, near.longitude + d, near.latitude + d].map(round).join(','));
      params.set('lat', String(near.latitude));
      params.set('lon', String(near.longitude));
    }
    const { features } = await getJson<{ features: PhotonFeature[] }>(`${PHOTON}/api/?${params}`);
    const typedNumber = term.match(/\b\d{1,5}\b/)?.[0];
    const seen = new Set<string>();
    return (features ?? [])
      .filter((f) => !f.properties.country || COUNTRIES.has(f.properties.country))
      .map((f) => toAddress(f, typedNumber))
      .filter((a): a is AddressOption => !!a && !seen.has(a.label) && !!seen.add(a.label))
      .slice(0, 6);
  });
}

/** The address at a point, or null when there is nothing there. */
export function reverseGeocode(latitude: number, longitude: number): Promise<AddressOption | null> {
  return cached(`reverse:${latitude.toFixed(5)},${longitude.toFixed(5)}`, async () => {
    const { features } = await getJson<{ features: PhotonFeature[] }>(`${PHOTON}/reverse?${new URLSearchParams({ lat: String(latitude), lon: String(longitude), limit: '1' })}`);
    const found = features?.[0] ? toAddress(features[0]) : null;
    return found ? { ...found, latitude: round(latitude), longitude: round(longitude) } : null;
  });
}
