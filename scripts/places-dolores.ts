// npm run places:dolores — builds the "dolores" business set from public Google Places data.
//
//   npm run places:dolores            searches Google Places (needs GOOGLE_PLACES_API_KEY), saves the raw
//                                     results and photos, and writes server/data/seed/dolores/businesses.json
//   npm run places:dolores -- --offline   rebuilds businesses.json from the saved results, without the API
//   npm run places:dolores -- --complete dolores-businesses.json
//                                     takes businesses already in the seed format (collected elsewhere) and fills
//                                     what is missing: catalog, logo, generic photos and hours. `_source` is kept
//                                     apart in sources.json
//   npm run places:dolores -- --from dolores-negocios.csv
//                                     imports a list collected by hand or with a browser (CSV or JSON, one row
//                                     per business, Spanish column names: see importRows), downloads its photos
//                                     and saves it as the raw results
//
// Then load it with `npm run db:seed -- dolores`.
//
// What comes from Google: name, address, location, phone, opening hours, website, delivery/takeout,
// card payments and photos. What is made up: the catalog (copied from the demo businesses of the same
// category), the logo (an initial on the category color) and the WhatsApp number (the demo one, so test
// orders never reach the real business).
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DAYS, slugify, type BusinessHours, type DeliveryOption, type PaymentMethod } from '../shared/business.js';

const SEED_DIR = 'server/data/seed';
const OUT_DIR = path.join(SEED_DIR, 'dolores');
const RAW_FILE = path.join(OUT_DIR, 'places.json');
const OUT_FILE = path.join(OUT_DIR, 'businesses.json');
const PHOTO_DIR = 'data/images/dolores';
const LOGO_DIR = 'public/seed/logos/dolores';
const DEMO_WHATSAPP = '59899760994';
const PHOTOS_PER_PLACE = 4;

/** Dolores, Soriano: the town and its outskirts. */
const AREA = { low: { latitude: -33.565, longitude: -58.26 }, high: { latitude: -33.5, longitude: -58.175 } };

/** Text searches per platform category (Places answers in Spanish, restricted to AREA). */
const QUERIES: Record<string, string[]> = {
  pizzeria: ['pizzería'],
  rotiseria: ['rotisería', 'comidas para llevar', 'empanadas'],
  restaurante: ['restaurante', 'parrilla', 'hamburguesería', 'chivitería'],
  panaderia: ['panadería', 'confitería'],
  almacen: ['almacén', 'autoservicio'],
  supermercado: ['supermercado'],
  kiosco: ['kiosco', 'maxikiosco'],
  carniceria: ['carnicería'],
  verduleria: ['verdulería', 'frutería'],
  'fiambreria-y-queseria': ['fiambrería', 'quesería'],
  dietetica: ['dietética', 'tienda naturista'],
  heladeria: ['heladería'],
  bebidas: ['bebidas', 'licorería', 'distribuidora de bebidas'],
  'bazar-y-limpieza': ['bazar', 'artículos de limpieza'],
};

/** Google types that decide the category on their own, whatever search found the place. */
const TYPE_CATEGORY: Record<string, string> = {
  pizza_restaurant: 'pizzeria',
  bakery: 'panaderia',
  supermarket: 'supermercado',
  convenience_store: 'kiosco',
  butcher_shop: 'carniceria',
  ice_cream_shop: 'heladeria',
  liquor_store: 'bebidas',
};

/** Places whose main type is one of these are not shops for the platform. */
const EXCLUDED_TYPES = new Set([
  'pharmacy', 'drugstore', 'gas_station', 'lodging', 'hotel', 'motel', 'bank', 'atm', 'hospital', 'doctor', 'school',
  'gym', 'car_repair', 'car_dealer', 'hardware_store', 'clothing_store', 'shoe_store', 'electronics_store', 'furniture_store',
  'veterinary_care', 'pet_store', 'church', 'park', 'tourist_attraction', 'local_government_office', 'beauty_salon',
  'hair_care', 'insurance_agency', 'real_estate_agency', 'post_office', 'bus_station', 'night_club', 'event_venue',
]);

const FIELDS = [
  'places.id', 'places.displayName', 'places.primaryType', 'places.primaryTypeDisplayName', 'places.types',
  'places.formattedAddress', 'places.addressComponents', 'places.location', 'places.businessStatus',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber', 'places.websiteUri', 'places.googleMapsUri',
  'places.regularOpeningHours', 'places.rating', 'places.userRatingCount', 'places.editorialSummary',
  'places.delivery', 'places.takeout', 'places.dineIn', 'places.paymentOptions', 'places.photos', 'nextPageToken',
].join(',');

interface Place {
  id: string;
  displayName?: { text: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  types?: string[];
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
  location?: { latitude: number; longitude: number };
  businessStatus?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { periods?: { open: Point; close?: Point }[] };
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: { text: string };
  delivery?: boolean;
  takeout?: boolean;
  dineIn?: boolean;
  paymentOptions?: { acceptsCreditCards?: boolean; acceptsDebitCards?: boolean; acceptsCashOnly?: boolean };
  photos?: { name: string; authorAttributions?: { displayName: string }[] }[];
}
interface Point { day: number; hour: number; minute: number }
/** A place with the category it was assigned to and the photos saved for it. */
interface FoundPlace { category: string; query: string; place: Place; photos: string[]; instagram?: string | null; facebook?: string | null }

// ------------------------------------------------------------------ Google Places

async function searchText(apiKey: string, textQuery: string) {
  const places: Place[] = [];
  let pageToken: string | undefined;
  do {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({ textQuery: `${textQuery} en Dolores, Soriano`, languageCode: 'es', regionCode: 'UY', pageSize: 20, locationRestriction: { rectangle: AREA }, ...(pageToken && { pageToken }) }),
    });
    if (!response.ok) throw new Error(`Places ${response.status}: ${await response.text()}`);
    const body = (await response.json()) as { places?: Place[]; nextPageToken?: string };
    places.push(...(body.places ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return places;
}

async function downloadPhoto(apiKey: string, photoName: string, file: string) {
  if (fs.existsSync(file)) return;
  const response = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1400&key=${apiKey}`);
  if (!response.ok) throw new Error(`Photo ${response.status} for ${photoName}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true }).toFile(file);
}

async function fetchPlaces(apiKey: string) {
  const found = new Map<string, FoundPlace>();
  for (const [category, queries] of Object.entries(QUERIES)) {
    for (const query of queries) {
      const places = await searchText(apiKey, query);
      let added = 0;
      for (const place of places) {
        if (found.has(place.id) || place.businessStatus === 'CLOSED_PERMANENTLY') continue;
        if (place.primaryType && EXCLUDED_TYPES.has(place.primaryType)) continue;
        const assigned = (place.primaryType && TYPE_CATEGORY[place.primaryType]) || category;
        found.set(place.id, { category: assigned, query, place, photos: [] });
        added += 1;
      }
      console.log(`${query}: ${places.length} results, ${added} new`);
    }
  }

  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const slugs = new Set<string>();
  for (const item of found.values()) {
    const slug = uniqueSlug(slugs, item.place.displayName?.text ?? 'negocio');
    for (const [index, photo] of (item.place.photos ?? []).slice(0, PHOTOS_PER_PLACE).entries()) {
      const file = `dolores/${slug}-${index + 1}.jpg`;
      try {
        await downloadPhoto(apiKey, photo.name, path.join('data/images', file));
        item.photos.push(file);
      } catch (error) {
        console.warn(`  ${slug}: ${(error as Error).message}`);
      }
    }
  }
  return [...found.values()];
}

// ------------------------------------------------------------------ conversion

function uniqueSlug(taken: Set<string>, name: string) {
  const base = slugify(name) || 'negocio';
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}

const time = (p: Point) => `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
/** Google numbers days from Sunday (0); the platform from Monday. */
const dayKey = (googleDay: number) => DAYS[(googleDay + 6) % 7];

function toHours(place: Place): BusinessHours | null {
  const periods = place.regularOpeningHours?.periods;
  if (!periods?.length) return null;
  const hours = Object.fromEntries(DAYS.map((day) => [day, { open: false, ranges: [] as { from: string; to: string }[] }])) as BusinessHours;
  // A single period without close means open 24 hours every day.
  if (periods.length === 1 && !periods[0].close) {
    for (const day of DAYS) hours[day] = { open: true, ranges: [{ from: '00:00', to: '23:59' }] };
    return hours;
  }
  for (const { open, close } of periods) {
    const day = hours[dayKey(open.day)];
    day.open = true;
    const to = close ? time(close) : '23:59';
    day.ranges.push({ from: time(open), to: to === '00:00' ? '23:59' : to });
  }
  for (const day of DAYS) hours[day].ranges.sort((a, b) => a.from.localeCompare(b.from));
  return hours;
}

const component = (place: Place, type: string) => place.addressComponents?.find((c) => c.types.includes(type))?.longText ?? null;

function toAddress(place: Place) {
  const street = component(place, 'route');
  const number = component(place, 'street_number');
  if (street) return number ? `${street} ${number}` : street;
  // Without components, the first part of the formatted address ("Asencio 1234, 75100 Dolores, ...").
  const first = place.formattedAddress?.split(',')[0]?.trim();
  return first && !/dolores|soriano|uruguay/i.test(first) ? first : null;
}

/** Instagram and Facebook pages listed as "website" go to their own fields. */
function toLinks(uri: string | undefined) {
  if (!uri) return { website: null, instagram: null, facebook: null };
  const instagram = uri.match(/instagram\.com\/([A-Za-z0-9._]+)/)?.[1];
  if (instagram) return { website: null, instagram, facebook: null };
  if (/facebook\.com\//.test(uri)) return { website: null, instagram: null, facebook: uri };
  return { website: uri, instagram: null, facebook: null };
}

function toPayments(place: Place): PaymentMethod[] {
  const options = place.paymentOptions;
  if (options?.acceptsCashOnly) return ['cash'];
  const methods: PaymentMethod[] = ['cash'];
  if (options?.acceptsDebitCards) methods.push('debit');
  if (options?.acceptsCreditCards) methods.push('credit');
  return methods;
}

function toDelivery(place: Place): DeliveryOption[] {
  const options: DeliveryOption[] = [];
  if (place.delivery) options.push('delivery');
  if (place.takeout !== false) options.push('pickup');
  return options.length ? options : ['pickup'];
}

const CATEGORY_COLORS: Record<string, string> = {
  pizzeria: '#B5402A', rotiseria: '#A35A1F', restaurante: '#7A2E3A', panaderia: '#9A6A2F', almacen: '#3E6B47',
  supermercado: '#1F5C7A', kiosco: '#7A3E8C', carniceria: '#8C2323', verduleria: '#4C7A24', 'fiambreria-y-queseria': '#8A5A2B',
  dietetica: '#5F7A3A', heladeria: '#C0567A', bebidas: '#5A2E6B', 'bazar-y-limpieza': '#2E6B8C', otros: '#555555',
};

function writeLogo(slug: string, name: string, category: string) {
  const initial = (name.replace(/^(el|la|los|las|super|supermercado|panader[ií]a|carnicer[ií]a|pizzer[ií]a)\s+/i, '').match(/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/)?.[0] ?? '?').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="${CATEGORY_COLORS[category] ?? '#555555'}"/><path d="M0 0h256v44H0z" fill="#fff" opacity=".14"/><path d="M0 44a32 22 0 0 0 64 0a32 22 0 0 0 64 0a32 22 0 0 0 64 0a32 22 0 0 0 64 0z" fill="#fff" opacity=".14"/><text x="128" y="178" font-family="Georgia,'Times New Roman',serif" font-size="112" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text></svg>`;
  fs.writeFileSync(path.join(LOGO_DIR, `${slug}.svg`), svg);
  return `/seed/logos/dolores/${slug}.svg`;
}

type SeedProduct = { name: string; slug: string; category: string; [field: string]: unknown };
type DemoBusiness = { category: string; coverImage: string; gallery: string[]; products: SeedProduct[] };

const ICE_CREAM: SeedProduct[] = [
  { name: 'Helado 1/4 kg', description: 'Hasta 2 gustos.', price: 220 },
  { name: 'Helado 1/2 kg', description: 'Hasta 3 gustos.', price: 400 },
  { name: 'Helado 1 kg', description: 'Hasta 4 gustos.', price: 720 },
  { name: 'Cucurucho', description: 'Una bocha, el gusto que quieras.', price: 120 },
  { name: 'Torta helada', description: 'Para 8 porciones. Consultá los gustos del día.', price: 890 },
].map((p) => ({ ...p, slug: slugify(p.name), images: [], category: 'helados', featured: p.price >= 400, isAvailable: true, stock: null }));

/** Catalog for a category: the demo products of that category, rotated so neighbors don't look identical. */
function catalogFor(category: string, demo: DemoBusiness[], index: number): SeedProduct[] {
  if (category === 'heladeria') return ICE_CREAM;
  const pool = category === 'bazar-y-limpieza'
    ? demo.flatMap((b) => b.products).filter((p) => p.category === 'limpieza-y-perfumeria')
    : demo.filter((b) => b.category === category).flatMap((b) => b.products);
  const unique = [...new Map(pool.map((p) => [p.name, p])).values()];
  if (unique.length <= 12) return unique;
  const start = (index * 5) % unique.length;
  return [...unique.slice(start), ...unique.slice(0, start)].slice(0, 12);
}

const SUMMARY: Record<string, string> = {
  pizzeria: 'Pizzas, fainá y más para llevar o comer en el local.',
  rotiseria: 'Comidas caseras para llevar.',
  restaurante: 'Platos para comer en el local o llevar.',
  panaderia: 'Pan del día, bizcochos y pastelería.',
  almacen: 'Almacén de barrio con lo de todos los días.',
  supermercado: 'Supermercado con almacén, bebidas, limpieza y más.',
  kiosco: 'Golosinas, bebidas y lo que te falte.',
  carniceria: 'Cortes de carne vacuna, cerdo, pollo y embutidos.',
  verduleria: 'Frutas y verduras frescas.',
  'fiambreria-y-queseria': 'Fiambres y quesos por peso.',
  dietetica: 'Productos naturales, a granel y sin TACC.',
  heladeria: 'Helados artesanales por peso y para llevar.',
  bebidas: 'Bebidas con y sin alcohol.',
  'bazar-y-limpieza': 'Artículos de bazar y limpieza.',
};

function build(found: FoundPlace[]) {
  const demo: DemoBusiness[] = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'businesses.json'), 'utf8'));
  fs.rmSync(LOGO_DIR, { recursive: true, force: true });
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  const slugs = new Set<string>();
  const perCategory = new Map<string, number>();
  const sorted = [...found].sort((a, b) => a.category.localeCompare(b.category) || (b.place.userRatingCount ?? 0) - (a.place.userRatingCount ?? 0));

  return sorted.map(({ category, place, photos, ...links }) => {
    const name = place.displayName?.text ?? 'Negocio';
    const slug = uniqueSlug(slugs, name);
    const index = perCategory.get(category) ?? 0;
    perCategory.set(category, index + 1);
    const demoCover = demo.filter((b) => b.category === category)[index % Math.max(1, demo.filter((b) => b.category === category).length)]?.coverImage ?? null;
    const products = catalogFor(category, demo, index).map((p) => ({ ...p, slug: `${slugify(p.name)}-${slug}` }));
    const rating = place.rating && place.userRatingCount ? `${place.rating.toFixed(1).replace('.', ',')} ★ en Google (${place.userRatingCount} opiniones)` : null;
    return {
      owner: { name: `Equipo de ${name}`, email: `${slug}@dolores.detoke.test` },
      category,
      name,
      slug,
      tagline: place.primaryTypeDisplayName?.text ? `${place.primaryTypeDisplayName.text} en Dolores` : 'En Dolores, Soriano',
      description: [place.editorialSummary?.text ?? SUMMARY[category], rating].filter(Boolean).join(' '),
      logo: writeLogo(slug, name, category),
      coverImage: photos[0] ?? demoCover,
      gallery: photos.slice(1),
      whatsapp: DEMO_WHATSAPP,
      phone: place.nationalPhoneNumber ?? null,
      email: null,
      ...toLinks(place.websiteUri),
      ...(links.instagram && { instagram: links.instagram }),
      ...(links.facebook && { facebook: links.facebook }),
      address: toAddress(place),
      neighborhood: null,
      city: 'Dolores',
      province: 'Soriano',
      postalCode: component(place, 'postal_code') ?? '75100',
      latitude: place.location ? Number(place.location.latitude.toFixed(7)) : null,
      longitude: place.location ? Number(place.location.longitude.toFixed(7)) : null,
      hours: toHours(place) ?? Object.fromEntries(DAYS.map((day) => [day, { open: false, ranges: [] }])),
      deliveryOptions: toDelivery(place),
      deliveryFee: place.delivery ? 60 : 0,
      minimumOrder: null,
      deliveryRadiusKm: place.delivery ? 3 : null,
      paymentMethods: toPayments(place),
      isVerified: false,
      isActive: true,
      products,
    };
  });
}

// ------------------------------------------------------------------ import from a CSV or JSON list

const CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  (JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'business-categories.json'), 'utf8')) as { name: string; slug: string }[])
    .flatMap((c) => [[slugify(c.name), c.slug], [c.slug, c.slug]]),
);
const categoryOf = (value: string) => {
  const key = slugify(value);
  return CATEGORY_NAMES[key] ?? Object.entries(CATEGORY_NAMES).find(([name]) => key.startsWith(name) || name.startsWith(key))?.[1] ?? 'otros';
};

/** Minimal CSV reader: quoted fields, commas or semicolons, newlines inside quotes. */
function parseCsv(text: string) {
  const delimiter = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (char === '"') quoted = false; else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  const [header, ...body] = rows;
  const keys = header.map((h) => slugify(h).replace(/-/g, '_'));
  return body.map((cells) => Object.fromEntries(keys.map((key, i) => [key, cells[i]?.trim() ?? ''])));
}

const DAY_NAMES: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

/** "lunes: 8:00–13:00, 16:00–20:00; martes: Cerrado; ..." or "Abierto las 24 horas" → Google periods. */
function parseHours(value: unknown): Place['regularOpeningHours'] | undefined {
  if (!value) return undefined;
  const text = slugify(typeof value === 'string' ? value : Object.entries(value as object).map(([day, hours]) => `${day}: ${Array.isArray(hours) ? hours.join(', ') : hours}`).join('; '))
    .replace(/-/g, ' ');
  if (!text) return undefined;
  if (/24 horas/.test(text) && !Object.keys(DAY_NAMES).some((day) => text.includes(day))) return { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] };
  const original = typeof value === 'string' ? value : JSON.stringify(value);
  const periods: { open: Point; close?: Point }[] = [];
  // Split the original text by day names, keeping accents out of the way.
  const folded = original.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const marks = [...folded.matchAll(/(domingo|lunes|martes|miercoles|jueves|viernes|sabado)s?/g)];
  // "lunes a viernes 8–12" and "sábado y domingo: cerrado" share one schedule: collect the days until a chunk has one.
  let pending: number[] = [];
  let isRange = false;
  for (const [n, mark] of marks.entries()) {
    const day = DAY_NAMES[mark[1]];
    if (isRange && pending.length) {
      for (let d = (pending[pending.length - 1] % 7) + 1; d !== day && pending.length < 7; d = (d + 1) % 7) pending.push(d);
    }
    pending.push(day);
    const chunk = folded.slice(mark.index! + mark[0].length, marks[n + 1]?.index ?? folded.length);
    if (!/\d|cerrado|24 horas/.test(chunk)) { isRange = /^\W*(a|al|hasta)\W*$/.test(chunk); continue; }
    isRange = false;
    const days = pending;
    pending = [];
    if (/24 horas/.test(chunk)) { for (const d of days) periods.push({ open: { day: d, hour: 0, minute: 0 }, close: { day: d, hour: 23, minute: 59 } }); continue; }
    for (const range of chunk.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?\s*(?:–|-|—|a|hasta)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/g)) {
      const hour = (h: string, ampm?: string) => (Number(h) % 12) + (ampm?.startsWith('p') ? 12 : 0);
      const fromH = range[3] ? hour(range[1], range[3]) : Number(range[1]);
      const toH = range[6] ? hour(range[4], range[6]) : Number(range[4]);
      for (const d of days) {
        const closeDay = toH < fromH ? (d + 1) % 7 : d;
        periods.push({ open: { day: d, hour: fromH % 24, minute: Number(range[2] ?? 0) }, close: { day: closeDay, hour: toH % 24, minute: Number(range[5] ?? 0) } });
      }
    }
  }
  return periods.length ? { periods } : undefined;
}

const yes = (value: unknown) => value === true || /^(si|sí|yes|true|1|x)$/i.test(String(value ?? '').trim());
const list = (value: unknown) => (Array.isArray(value) ? value.map(String) : String(value ?? '').split(/[\s|,;]+/)).filter((v) => /^https?:/.test(v));
const pick = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
};

async function downloadUrl(url: string, file: string) {
  if (fs.existsSync(file)) return;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Photo ${response.status} for ${url}`);
  await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true }).toFile(file);
}

/** Reads the list and turns each row into the same shape the Places API gives, so `build()` handles both. */
async function importRows(file: string): Promise<FoundPlace[]> {
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const raw: Record<string, unknown>[] = file.endsWith('.json') ? JSON.parse(text) : parseCsv(text);
  const rows = raw.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [slugify(key).replace(/-/g, '_'), value])));
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const slugs = new Set<string>();
  const found: FoundPlace[] = [];
  for (const [index, row] of rows.entries()) {
    const name = String(pick(row, 'nombre', 'name') ?? '').trim();
    if (!name) continue;
    const latitude = Number(String(pick(row, 'latitud', 'lat', 'latitude') ?? '').replace(',', '.'));
    const longitude = Number(String(pick(row, 'longitud', 'lng', 'lon', 'longitude') ?? '').replace(',', '.'));
    const address = String(pick(row, 'direccion', 'address') ?? '').trim();
    const rating = Number(String(pick(row, 'calificacion', 'rating') ?? '').replace(',', '.'));
    const reviews = Number(String(pick(row, 'cantidad_opiniones', 'opiniones', 'resenas', 'reviews') ?? '').replace(/\D/g, ''));
    const site = String(pick(row, 'sitio_web', 'web', 'website') ?? '').trim();
    const instagram = String(pick(row, 'instagram') ?? '').trim();
    const facebook = String(pick(row, 'facebook') ?? '').trim();
    const place: Place = {
      id: String(pick(row, 'link_google_maps', 'google_maps', 'maps') ?? `row-${index}`),
      displayName: { text: name },
      primaryTypeDisplayName: pick(row, 'tipo', 'tipo_google') ? { text: String(pick(row, 'tipo', 'tipo_google')) } : undefined,
      formattedAddress: address,
      location: Number.isFinite(latitude) && Number.isFinite(longitude) && latitude && longitude ? { latitude, longitude } : undefined,
      nationalPhoneNumber: String(pick(row, 'telefono', 'phone') ?? '').trim() || undefined,
      websiteUri: site || (instagram && (instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace(/^@/, '')}`)) || facebook || undefined,
      googleMapsUri: String(pick(row, 'link_google_maps', 'google_maps', 'maps') ?? '') || undefined,
      regularOpeningHours: parseHours(pick(row, 'horarios', 'horario', 'hours')),
      rating: rating || undefined,
      userRatingCount: reviews || undefined,
      editorialSummary: pick(row, 'descripcion', 'description') ? { text: String(pick(row, 'descripcion', 'description')) } : undefined,
      delivery: yes(pick(row, 'delivery', 'envio')),
    };
    const extra = { instagram: instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/[/@?].*$|^@/g, '') || null, facebook: facebook || null };
    const slug = uniqueSlug(slugs, name);
    const photos: string[] = [];
    for (const [n, url] of list(pick(row, 'fotos', 'photos', 'imagenes')).slice(0, PHOTOS_PER_PLACE).entries()) {
      const target = `dolores/${slug}-${n + 1}.jpg`;
      try {
        await downloadUrl(url, path.join('data/images', target));
        photos.push(target);
      } catch (error) {
        console.warn(`  ${slug}: ${(error as Error).message}`);
      }
    }
    found.push({ category: categoryOf(String(pick(row, 'rubro', 'categoria', 'category') ?? '')), query: 'import', place, photos, ...extra });
  }
  return found;
}

// ------------------------------------------------------------------ complete a list already in the seed format

/** Usual shop hours, for businesses Google has none for (to confirm with each one). */
const DEFAULT_HOURS: Record<string, { from: string; to: string }[]> = {
  pizzeria: [{ from: '19:30', to: '23:59' }],
  rotiseria: [{ from: '11:30', to: '14:30' }, { from: '19:30', to: '23:00' }],
  restaurante: [{ from: '12:00', to: '15:00' }, { from: '20:00', to: '23:59' }],
  heladeria: [{ from: '15:00', to: '23:00' }],
};
function genericHours(category: string): BusinessHours {
  const ranges = DEFAULT_HOURS[category] ?? [{ from: '08:30', to: '12:30' }, { from: '16:00', to: '20:00' }];
  return Object.fromEntries(DAYS.map((day) => [day, day === 'sunday' ? { open: false, ranges: [] } : { open: true, ranges }])) as BusinessHours;
}

/** Notes such as "(a confirmar número)" stay in sources.json, not on the public page. */
function cleanAddress(value: unknown) {
  const address = String(value ?? '').replace(/\s*\([^)]*confirmar[^)]*\)/gi, '').replace(/\s+(esquina|casi)$/i, '').trim();
  return address && !/^dolores$/i.test(address) ? address : null;
}

/** "+598 92 605 707" → "092 605 707"; "+598 4534 3173" → "4534 3173". */
function nationalPhone(value: unknown) {
  const phone = String(value ?? '').trim();
  if (!phone) return null;
  return phone.replace(/^\+598\s*9/, '09').replace(/^\+598\s*/, '');
}

/** A photo saved in data/images/dolores, as the seed refers to it ("dolores/<name>.jpg"), or null. */
const ownPhoto = (name: string) => (fs.existsSync(path.join(PHOTO_DIR, `${name}.jpg`)) ? `dolores/${name}.jpg` : null);

type SeedInput = { slug: string; name: string; category: string; products?: SeedProduct[]; hours?: BusinessHours | null; logo?: string | null; coverImage?: string | null; gallery?: string[]; _source?: unknown; [field: string]: unknown };

function complete(file: string) {
  const input: SeedInput[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  const demo: DemoBusiness[] = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'businesses.json'), 'utf8'));
  fs.rmSync(LOGO_DIR, { recursive: true, force: true });
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  const perCategory = new Map<string, number>();
  const sources: Record<string, unknown> = {};
  const businesses = input.map(({ _source, ...business }) => {
    const { slug, name, category } = business;
    const index = perCategory.get(category) ?? 0;
    perCategory.set(category, index + 1);
    sources[slug] = { ...(_source as object), genericHours: !business.hours };
    const sameCategory = demo.filter((b) => b.category === category);
    const products = (business.products?.length ? business.products : catalogFor(category, demo, index).map((p) => ({ ...p, slug: `${slugify(p.name)}-${slug}` })))
      .map((p) => (ownPhoto(`products/${slugify(p.name)}`) ? { ...p, images: [ownPhoto(`products/${slugify(p.name)}`)] } : p));
    const productImages = [...new Set(products.flatMap((p) => ((p as SeedProduct).images as string[] | undefined) ?? []))];
    // Real photos of the place, downloaded by `npm run photos:dolores`: the first is the cover.
    const placePhotos = [1, 2, 3, 4, 5].map((n) => ownPhoto(`${slug}-${n}`)).filter((photo): photo is string => !!photo);
    if (placePhotos.length) {
      business.coverImage = placePhotos[0];
      business.gallery = placePhotos.slice(1);
    }
    return {
      ...business,
      address: cleanAddress(business.address),
      phone: nationalPhone(business.phone),
      logo: business.logo || writeLogo(slug, name, category),
      coverImage: business.coverImage || sameCategory[index % Math.max(1, sameCategory.length)]?.coverImage || productImages[0] || null,
      gallery: business.gallery?.length ? business.gallery : productImages.slice(1, 4),
      hours: business.hours ?? genericHours(category),
      products,
    };
  });
  fs.writeFileSync(path.join(OUT_DIR, 'sources.json'), `${JSON.stringify(sources, null, 1)}\n`);
  return businesses;
}

// ------------------------------------------------------------------ main

const completeIndex = process.argv.indexOf('--complete');
if (completeIndex > 0) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const completed = complete(process.argv[completeIndex + 1]);
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(completed, null, 1)}\n`);
  console.log(`${completed.length} businesses written to ${OUT_FILE}`);
  process.exit(0);
}

const offline = process.argv.includes('--offline');
const fromIndex = process.argv.indexOf('--from');
let found: FoundPlace[];
if (fromIndex > 0) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  found = await importRows(process.argv[fromIndex + 1]);
  fs.writeFileSync(RAW_FILE, `${JSON.stringify(found, null, 1)}\n`);
} else if (offline) {
  found = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
} else {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    console.error('Missing GOOGLE_PLACES_API_KEY (in .env or the environment). Use --offline to rebuild from the saved results.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  found = await fetchPlaces(apiKey);
  fs.writeFileSync(RAW_FILE, `${JSON.stringify(found, null, 1)}\n`);
}

const businesses = build(found);
fs.writeFileSync(OUT_FILE, `${JSON.stringify(businesses, null, 1)}\n`);
const counts = new Map<string, number>();
for (const { category } of businesses) counts.set(category, (counts.get(category) ?? 0) + 1);
console.log(`${businesses.length} businesses written to ${OUT_FILE}: ${[...counts].map(([category, n]) => `${category} ${n}`).join(', ')}`);
