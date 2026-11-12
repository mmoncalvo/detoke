// npm run photos:dolores — downloads the photos of the Dolores set into data/images/dolores (never remote URLs).
//
//   npm run photos:dolores                         product photos missing in data/images/dolores/products
//   npm run photos:dolores -- --places ~/Downloads/dolores-fotos.json
//                                                  also the real photos of each business: { "slug": ["url", ...] }
//   npm run photos:dolores -- --only "Cucurucho,Helado 1 kg" --pick 2
//                                                  re-downloads those products with another search result (0 = first)
//
// Product photos come from Pexels when PEXELS_API_KEY is set, otherwise from Openverse (Creative Commons).
// Credits go to server/data/seed/dolores/photo-credits.json. Afterwards regenerate the set:
//   npm run places:dolores -- --complete server/data/seed/dolores/input.json
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { slugify } from '../shared/business.js';

const SEED_DIR = 'server/data/seed/dolores';
const PHOTO_DIR = 'data/images/dolores';
const PRODUCT_DIR = path.join(PHOTO_DIR, 'products');
const CREDITS_FILE = path.join(SEED_DIR, 'photo-credits.json');

const arg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : undefined;
};
const only = arg('--only')?.split(',').map((name) => name.trim());
const pick = Number(arg('--pick') ?? 0);
const placesFile = arg('--places')?.replace(/^~/, os.homedir());
const pexelsKey = process.env.PEXELS_API_KEY?.trim();

type Credit = { source: string; author?: string | null; license?: string | null; page?: string | null };
const credits: Record<string, Credit> = fs.existsSync(CREDITS_FILE) ? JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8')) : {};

async function save(url: string, file: string, size: number, square = false) {
  const response = await fetch(url, { headers: { 'User-Agent': 'detoke-seed/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const image = sharp(Buffer.from(await response.arrayBuffer())).rotate();
  await (square ? image.resize(size, size, { fit: 'cover' }) : image.resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }))
    .jpeg({ quality: 76, mozjpeg: true })
    .toFile(file);
}

async function searchPexels(query: string) {
  const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=square`, { headers: { Authorization: pexelsKey! } });
  if (!response.ok) throw new Error(`Pexels ${response.status}`);
  const body = (await response.json()) as { photos: { src: { large: string }; photographer: string; url: string }[] };
  return body.photos.map((p) => ({ url: p.src.large, credit: { source: 'Pexels', author: p.photographer, license: 'Pexels License', page: p.url } }));
}

async function searchOpenverse(query: string) {
  const response = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial&page_size=8&mature=false`, { headers: { 'User-Agent': 'detoke-seed/1.0' } });
  if (!response.ok) throw new Error(`Openverse ${response.status}`);
  const body = (await response.json()) as { results: { url: string; creator: string | null; license: string; license_version: string; foreign_landing_url: string }[] };
  return body.results.map((r) => ({ url: r.url, credit: { source: 'Openverse', author: r.creator, license: `CC ${r.license.toUpperCase()} ${r.license_version}`, page: r.foreign_landing_url } }));
}

// ------------------------------------------------------------------ products
fs.mkdirSync(PRODUCT_DIR, { recursive: true });
const queries: Record<string, string> = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'product-photos.json'), 'utf8'));
let downloaded = 0;
for (const [name, query] of Object.entries(queries)) {
  const file = path.join(PRODUCT_DIR, `${slugify(name)}.jpg`);
  if (only ? !only.includes(name) : fs.existsSync(file)) continue;
  try {
    const results = pexelsKey ? await searchPexels(query) : await searchOpenverse(query);
    let saved = false;
    // Try the chosen result first and the next ones if a download fails.
    for (const result of results.slice(pick)) {
      try {
        await save(result.url, file, 800, true);
        credits[`products/${slugify(name)}.jpg`] = result.credit;
        saved = true;
        break;
      } catch {
        // next result
      }
    }
    console.log(`${saved ? 'ok  ' : 'NONE'} ${name} (${query})`);
    if (saved) downloaded += 1;
  } catch (error) {
    console.warn(`FAIL ${name}: ${(error as Error).message}`);
  }
}

// ------------------------------------------------------------------ real photos of each business
if (placesFile) {
  const places: Record<string, string[]> = JSON.parse(fs.readFileSync(placesFile, 'utf8'));
  for (const [slug, urls] of Object.entries(places)) {
    let n = 0;
    for (const url of urls.slice(0, 5)) {
      try {
        await save(url, path.join(PHOTO_DIR, `${slug}-${n + 1}.jpg`), 1200);
        credits[`${slug}-${n + 1}.jpg`] = { source: 'Google Maps / redes del negocio', page: url };
        n += 1;
      } catch (error) {
        console.warn(`FAIL ${slug}: ${(error as Error).message}`);
      }
    }
    console.log(`${slug}: ${n} photos`);
    downloaded += n;
  }
}

fs.writeFileSync(CREDITS_FILE, `${JSON.stringify(credits, null, 1)}\n`);
console.log(`${downloaded} photos downloaded. Now: npm run places:dolores -- --complete ${SEED_DIR}/input.json`);
