import express from 'express';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { initDb } from '../server/db.js';
import { Business, Order } from '../server/models/index.js';
import { htmlWithMeta, injectMeta } from '../server/services/pageMeta.js';
import { app, createCategories, register, request } from './helpers.js';

const TEMPLATE = '<!doctype html><html><head><meta name="description" content="Detoke" /><title>Detoke</title></head><body><div id="root"></div></body></html>';
const site = express().use(htmlWithMeta(async () => TEMPLATE));
const meta = (html: string, property: string) => html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`))?.[1];

let code: string;
let slug: string;

beforeAll(async () => {
  await initDb({ reset: true });
  const categories = await createCategories();
  const seller = await register(categories.pizzas.id, 'Lo de "Tito" <b>');
  slug = seller.business.slug;
  await Business.update({ tagline: 'Pizza & fainá <script>alert(1)</script>', neighborhood: 'Pocitos', coverImage: 'pizzeria_cover.jpg' }, { where: { id: seller.business.id } });
  const order = await Order.create({
    publicCode: 'META00000001', number: 7, businessId: seller.business.id,
    items: [{ productId: 'p', name: 'Muzza', unitPrice: 520, quantity: 2, subtotal: 1040, image: null }, { productId: 'q', name: 'Fainá', unitPrice: 95, quantity: 1, subtotal: 95, image: null }],
    subtotal: 1135, deliveryFee: 0, total: 1135, fulfillment: 'pickup', paymentMethod: 'cash',
    customerName: 'Clara Privada', customerPhone: '099 123 456', deliveryAddress: 'Calle Secreta 123', status: 'pending', statusHistory: [],
  });
  code = order.publicCode;
});

describe('link previews', () => {
  it('describes an order without the customer data', async () => {
    const res = await request(site).get(`/pedido/${code}`);
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
    expect(meta(res.text, 'og:title')).toBe('Pedido #7 · Lo de &quot;Tito&quot; &lt;b&gt;');
    expect(meta(res.text, 'og:description')).toBe('3 productos · Total $ 1.135 · Retiro en el local · Estado: Recibido'.replace(' 1.135', ' 1.135'));
    expect(meta(res.text, 'og:url')).toMatch(new RegExp(`^https?://.+/pedido/${code}$`));
    expect(meta(res.text, 'og:image')).toMatch(new RegExp(`/api/og/business/${slug}\\.jpg\\?v=\\d+$`));
    expect(meta(res.text, 'og:site_name')).toBe('Detoke');
    expect(meta(res.text, 'twitter:card')).toBe('summary_large_image');
    expect(res.text).toContain('<title>Pedido #7 · Lo de &quot;Tito&quot; &lt;b&gt; · Detoke</title>');
    // One description only, and nothing about who ordered.
    expect(res.text.match(/name="description"/g)).toHaveLength(1);
    for (const secret of ['Clara', '099 123 456', 'Calle Secreta']) expect(res.text).not.toContain(secret);
  });

  it('describes a business and escapes its texts', async () => {
    const res = await request(site).get(`/negocio/${slug}`);
    expect(meta(res.text, 'og:title')).toBe('Lo de &quot;Tito&quot; &lt;b&gt; · Pizzería en Pocitos');
    expect(meta(res.text, 'og:description')).toBe('Pizza &amp; fainá &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(res.text).not.toContain('<script>alert(1)');
  });

  it('leaves the page as it is when the order or business does not exist', async () => {
    expect((await request(site).get('/pedido/noexiste')).text).toBe(TEMPLATE);
    expect((await request(site).get('/negocio/noexiste')).text).toBe(TEMPLATE);
  });

  it('serves a 1200x630 JPEG preview image', async () => {
    const res = await request(app).get(`/api/og/business/${slug}.jpg`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.type).toBe('image/jpeg');
    expect(await sharp(res.body as Buffer).metadata()).toMatchObject({ format: 'jpeg', width: 1200, height: 630 });
    expect((await request(app).get('/api/og/business/noexiste.jpg')).status).toBe(404);
  });

  it('describes the about page', async () => {
    const res = await request(site).get('/nosotros');
    expect(meta(res.text, 'og:title')).toBe('Sobre Detoke');
    expect(meta(res.text, 'og:image')).toMatch(/\/api\/og\/site\.jpg$/);
    expect((await request(app).get('/api/og/site.jpg')).type).toBe('image/jpeg');
  });

  it('keeps the rest of the head', () => {
    const html = injectMeta(TEMPLATE, { title: 'T', description: 'D', url: 'https://x.test/a', image: 'https://x.test/i.jpg', imageAlt: 'A' });
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<link rel="canonical" href="https://x.test/a" />');
  });
});
