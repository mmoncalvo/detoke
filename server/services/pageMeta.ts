// Link previews: WhatsApp and other apps read Open Graph tags from the HTML and do not run JavaScript,
// so the server writes them into index.html for order and business pages.
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router, type Request } from 'express';
import sharp from 'sharp';
import { DELIVERY_LABELS } from '../../shared/business.js';
import { formatMoney } from '../../shared/money.js';
import { statusLabel } from '../../shared/orders.js';
import { config } from '../config.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Business, BusinessCategory, Order } from '../models/index.js';

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
}

const SITE = 'Detoke';
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ogImage = (slug: string, version: Date) => `${config.appUrl}/api/og/business/${encodeURIComponent(slug)}.jpg?v=${version.getTime()}`;

/** Order preview: number, business, how many products, total, pickup or delivery and status. Nothing about the customer. */
async function orderMeta(code: string): Promise<PageMeta | null> {
  const order = await Order.findOne({ where: { publicCode: code }, include: [{ model: Business, attributes: ['name', 'slug', 'updatedAt'] }] });
  if (!order?.business) return null;
  const count = order.items.reduce((sum, i) => sum + i.quantity, 0);
  return {
    title: `Pedido #${order.number} · ${order.business.name}`,
    description: [plural(count, 'producto', 'productos'), `Total ${formatMoney(order.total)}`, DELIVERY_LABELS[order.fulfillment], `Estado: ${statusLabel(order.status)}`].join(' · '),
    url: `${config.appUrl}/pedido/${encodeURIComponent(order.publicCode)}`,
    image: ogImage(order.business.slug, order.business.updatedAt),
    imageAlt: order.business.name,
  };
}

async function businessMeta(slug: string): Promise<PageMeta | null> {
  const business = await Business.findOne({ where: { slug, isActive: true }, include: [BusinessCategory] });
  if (!business) return null;
  const place = [business.category?.name, business.neighborhood ?? business.city].filter(Boolean).join(' en ');
  return {
    title: place ? `${business.name} · ${place}` : business.name,
    description: business.tagline || business.description || 'Mirá el catálogo y hacé tu pedido por WhatsApp.',
    url: `${config.appUrl}/negocio/${encodeURIComponent(business.slug)}`,
    image: ogImage(business.slug, business.updatedAt),
    imageAlt: business.name,
  };
}

/** Fixed pages that are worth sharing. */
const STATIC_PAGES: Record<string, Omit<PageMeta, 'url' | 'image'>> = {
  '/nosotros': {
    title: 'Sobre Detoke',
    description: 'Todo el barrio, de toque: los comercios de tu barrio con su catálogo, y los pedidos se cierran por WhatsApp.',
    imageAlt: 'Detoke',
  },
};

export async function metaForPath(pathname: string): Promise<PageMeta | null> {
  const page = STATIC_PAGES[pathname.replace(/\/$/, '')];
  if (page) return { ...page, url: `${config.appUrl}${pathname.replace(/\/$/, '')}`, image: `${config.appUrl}/api/og/site.jpg` };
  const order = pathname.match(/^\/pedido\/([^/]+)\/?$/);
  if (order) return orderMeta(decodeURIComponent(order[1]));
  const business = pathname.match(/^\/negocio\/([^/]+)\/?$/);
  if (business) return businessMeta(decodeURIComponent(business[1]));
  return null;
}

/** Puts the page's title and preview tags in the HTML; everything is escaped. */
export function injectMeta(html: string, meta: PageMeta) {
  const e = escapeHtml;
  const tags = [
    `<meta name="description" content="${e(meta.description)}" />`,
    `<meta property="og:site_name" content="${SITE}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="es_UY" />`,
    `<meta property="og:title" content="${e(meta.title)}" />`,
    `<meta property="og:description" content="${e(meta.description)}" />`,
    `<meta property="og:url" content="${e(meta.url)}" />`,
    `<meta property="og:image" content="${e(meta.image)}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="${OG_WIDTH}" />`,
    `<meta property="og:image:height" content="${OG_HEIGHT}" />`,
    `<meta property="og:image:alt" content="${e(meta.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(meta.title)}" />`,
    `<meta name="twitter:description" content="${e(meta.description)}" />`,
    `<meta name="twitter:image" content="${e(meta.image)}" />`,
    `<link rel="canonical" href="${e(meta.url)}" />`,
  ].join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${e(meta.title)} · ${SITE}</title>`)
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

// ------------------------------------------------------------------ preview image
/** Where a stored image lives on disk: an upload, a seed photo or a public file. */
function localImagePath(stored: string | null | undefined) {
  if (!stored || /^(https?:|data:)/.test(stored)) return null;
  if (stored.startsWith('/data/uploads/')) return path.join(config.uploadsDir, path.basename(stored));
  if (stored.startsWith('/data/')) return path.join(config.dataDir, stored.slice('/data/'.length));
  if (stored.startsWith('/')) return path.join(path.resolve('public'), stored.slice(1));
  return path.join(config.dataDir, 'images', path.basename(stored));
}

/** The brand's awning along the bottom edge: shapes only, so it needs no fonts. */
const AWNING = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="40">${
  Array.from({ length: OG_WIDTH / 40 }, (_, i) => `<circle cx="${i * 40 + 20}" cy="0" r="20" fill="${i % 2 ? '#e3b23c' : '#1f5c43'}"/>`).join('')
}<rect y="0" width="${OG_WIDTH}" height="4" fill="#1f5c43"/></svg>`);

const BRAND_BACKGROUND = { r: 23, g: 56, b: 41 };
const imageCache = new Map<string, Buffer>();

/** 1200×630 JPEG of the business (cover, else gallery, else logo), with the awning. WhatsApp shows JPEG, not SVG. */
export async function businessPreviewImage(business: Business) {
  const key = `${business.id}:${business.updatedAt?.getTime()}`;
  const hit = imageCache.get(key);
  if (hit) return hit;

  let base: Buffer | null = null;
  for (const candidate of [business.coverImage, ...(business.gallery ?? []), business.logo]) {
    const file = localImagePath(candidate);
    if (!file) continue;
    try {
      base = await sharp(await fs.readFile(file)).rotate().resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover' }).toBuffer();
      break;
    } catch {
      /* missing or unreadable: try the next one */
    }
  }
  const canvas = base ? sharp(base) : sharp({ create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 3, background: BRAND_BACKGROUND } });
  const image = await canvas.composite([{ input: AWNING, top: OG_HEIGHT - 40, left: 0 }]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  if (imageCache.size > 200) imageCache.clear();
  imageCache.set(key, image);
  return image;
}

let siteImage: Buffer | null = null;

/** The brand's preview image for pages without a business: green with the awning. */
export async function sitePreviewImage() {
  siteImage ??= await sharp({ create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 3, background: BRAND_BACKGROUND } })
    .composite([{ input: AWNING, top: 0, left: 0 }, { input: AWNING, top: OG_HEIGHT - 40, left: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer();
  return siteImage;
}

// ------------------------------------------------------------------ routes
/** Serves the web app's HTML with the preview tags of the page, when it has them. */
export function htmlWithMeta(getHtml: (req: Request) => Promise<string>) {
  const router = Router();
  router.get(['/pedido/:code', '/negocio/:slug', ...Object.keys(STATIC_PAGES)], asyncHandler(async (req, res) => {
    const html = await getHtml(req);
    const meta = await metaForPath(req.path).catch(() => null);
    res.type('html').set('Cache-Control', 'no-cache').send(meta ? injectMeta(html, meta) : html);
  }));
  return router;
}
