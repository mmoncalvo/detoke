// npm run db:check-images — fails if the seed points to an image that does not exist.
import fs from 'node:fs';
import path from 'node:path';

// Checks every business set that exists (the Dolores one may not be generated yet).
const files = ['server/data/seed/businesses.json', 'server/data/seed/dolores/businesses.json'].filter((file) => fs.existsSync(file));
const businesses = files.flatMap((file) => JSON.parse(fs.readFileSync(file, 'utf8')));

const resolve = (image: string) => (image.startsWith('/seed/') ? path.join('public', image) : path.join('data/images', image));

const images: string[] = businesses.flatMap((b: { logo: string; coverImage: string; gallery: string[]; products: { images: string[] }[] }) => [
  b.logo,
  b.coverImage,
  ...b.gallery,
  ...b.products.flatMap((p) => p.images),
]);

const missing = [...new Set(images.filter(Boolean))].filter((image) => !fs.existsSync(resolve(image)));
console.log(`${images.length} references, ${new Set(images).size} distinct images, ${missing.length} missing.`);
if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}
