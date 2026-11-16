// node scripts/marketing-social.cjs — generates detoke's social media assets (Facebook and Instagram)
// in marketing/redes/ as self-contained SVGs (text as outlines, photos embedded) and renders each one to
// PNG. Needs `npm i --no-save playwright lucide-static` and network access to Google Fonts.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const opentype = require('opentype.js');
const { chromium } = require('playwright');

const REPO = path.join(__dirname, '..');
const OUT = path.join(REPO, 'marketing/redes');
const IMAGES = path.join(REPO, 'data/images');

// The site's palette (src/index.css + BRAND in LogoMarks.tsx).
const C = {
  hero: '#133122', // --sidebar: the home hero background
  green: '#1D5C45', // BRAND.green: the logo tile
  cream: '#FBF7EE',
  mustard: '#E3A82B',
  soft: '#D2D7C5', // --sidebar-foreground
  awningA: '#5AB086',
  awningB: '#D7A646',
  pill: 'rgba(255,255,255,0.09)',
  line: 'rgba(255,255,255,0.11)',
};

// The site's fonts (Quicksand for titles, Figtree for text), static weights from Google Fonts.
const FONT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'detoke-social-'));
function loadFont(spec) {
  const css = execFileSync('curl', ['-s', `https://fonts.googleapis.com/css2?family=${spec}`]).toString();
  const file = path.join(FONT_DIR, `${spec.replace(/\W/g, '_')}.ttf`);
  execFileSync('curl', ['-s', '-o', file, css.match(/url\((https:[^)]+)\)/)[1]]);
  return opentype.loadSync(file);
}
const F = {
  display: loadFont('Quicksand:wght@700'),
  body: loadFont('Figtree:wght@500'),
  bodyBold: loadFont('Figtree:wght@700'),
};

// The logo, from the app's own outlines.
const wmSrc = fs.readFileSync(path.join(REPO, 'src/components/brand/wordmarks.ts'), 'utf8');
const WM = JSON.parse(wmSrc.slice(wmSrc.indexOf('{'), wmSrc.lastIndexOf('} as const') + 1)).quicksand;

/** Text as outlines: kerning plus tracking (em). Returns { d, width }. */
function shape(font, str, size, tracking = 0) {
  const scale = size / font.unitsPerEm;
  let x = 0;
  const parts = [];
  const glyphs = [...str].map((ch) => font.charToGlyph(ch));
  glyphs.forEach((g, i) => {
    parts.push(g.getPath(x, 0, size).toPathData(2));
    x += g.advanceWidth * scale + tracking * size;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return { d: parts.join(''), width: x - tracking * size };
}

/** One line of text at (x, baseline y), anchored start | middle | end. */
function text(font, str, { x, y, size, fill, anchor = 'start', tracking = 0 }) {
  const s = shape(font, str, size, tracking);
  const dx = anchor === 'middle' ? -s.width / 2 : anchor === 'end' ? -s.width : 0;
  return `<path transform="translate(${(x + dx).toFixed(1)} ${y})" d="${s.d}" fill="${fill}"/>`;
}

/** "detoke!" with the site's extruded depth and the mustard "!"; `h` = cap height box (logo viewBox height). */
function wordmark({ x, y, h, color = C.cream, depthColor = '#0B1F16', accent = true, anchor = 'start', depth = true }) {
  const [vx, vy, vw, vh] = WM.viewBox;
  const k = h / vh;
  const w = vw * k;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const letters = (fill, bang) => WM.letters.map((l) => `<path d="${l.d}" fill="${l.char === '!' && bang ? bang : fill}"/>`).join('');
  return {
    width: w,
    svg: `<g transform="translate(${left.toFixed(1)} ${y}) scale(${k.toFixed(4)}) translate(${-vx} ${-vy})">`
      + (depth ? `<g transform="translate(0 3.2)">${letters(depthColor)}</g>` : '')
      + letters(color, accent ? C.mustard : null) + '</g>',
  };
}

/** The monogram "d!" centered in a box. */
function monogram({ cx, cy, size, color = C.cream }) {
  const [vx, vy, vw, vh] = WM.monogram.viewBox;
  const k = size / Math.max(vw, vh);
  return `<g transform="translate(${(cx - (vw * k) / 2).toFixed(1)} ${(cy - (vh * k) / 2).toFixed(1)}) scale(${k.toFixed(4)}) translate(${-vx} ${-vy})">`
    + WM.monogram.letters.map((l) => `<path d="${l.d}" fill="${color}"/>`).join('') + '</g>';
}

/** The site's striped, scalloped awning across the top: 32 px stripes at k = 1. */
function awning(width, k, y = 0) {
  const w = 32 * k;
  let s = '';
  for (let i = 0, x = 0; x < width; i++, x += w) {
    s += `<path d="M${x} ${y}H${x + w}V${y + 2 * k}A${16 * k} ${16 * k} 0 0 1 ${x} ${y + 2 * k}Z" fill="${i % 2 ? C.awningB : C.awningA}"/>`;
  }
  return s;
}

const noiseDefs = `<filter id="noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="2.4" intercept="-0.7"/><feFuncG type="linear" slope="2.4" intercept="-0.7"/><feFuncB type="linear" slope="2.4" intercept="-0.7"/></feComponentTransfer></filter>`
  + `<filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000" flood-opacity="0.45"/></filter>`;
const noise = (w, h) => `<rect width="${w}" height="${h}" filter="url(#noise)" style="mix-blend-mode:overlay" opacity="0.35"/>`;

const photoCache = {};
const photoData = (file) => (photoCache[file] ??= `data:image/jpeg;base64,${fs.readFileSync(path.join(IMAGES, file)).toString('base64')}`);
let clipId = 0;
/** A photo dropped on the table: cream border, rounded, tilted, with a soft shadow (HeroCollage). */
function photo(file, { cx, cy, w, h, angle, border = 9, r = 22 }) {
  const id = `clip${clipId++}`;
  const x = -w / 2, y = -h / 2;
  return `<g transform="translate(${cx} ${cy}) rotate(${angle})" filter="url(#shadow)">`
    + `<rect x="${x - border}" y="${y - border}" width="${w + 2 * border}" height="${h + 2 * border}" rx="${r + border}" fill="${C.cream}"/>`
    + `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>`
    + `<image href="${photoData(file)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/></g>`;
}

/** The hero's pill: a mustard dot and "Comercios de cercanía". */
function pill({ x, y, size, label = 'Comercios de cercanía', anchor = 'start' }) {
  const s = shape(F.body, label, size);
  const padX = size * 0.75, h = size * 1.9, dot = size * 0.3, gap = size * 0.5;
  const w = padX * 2 + dot * 2 + gap + s.width;
  const left = anchor === 'middle' ? x - w / 2 : x;
  return `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${C.pill}"/>`
    + `<circle cx="${left + padX + dot}" cy="${y + h / 2}" r="${dot}" fill="${C.mustard}"/>`
    + `<path transform="translate(${(left + padX + dot * 2 + gap).toFixed(1)} ${(y + h / 2 + size * 0.36).toFixed(1)})" d="${s.d}" fill="${C.mustard}"/>`;
}

function icon(name) {
  const src = fs.readFileSync(path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons', `${name}.svg`), 'utf8');
  return src.slice(src.indexOf('>', src.indexOf('<svg')) + 1, src.lastIndexOf('</svg>')).trim();
}
/** A lucide icon (24 grid, stroke 2) at (cx, cy), `size` px. */
function drawIcon(name, { cx, cy, size, color, stroke = 2 }) {
  const k = size / 24;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${k})" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${icon(name)}</g>`;
}

const svg = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${title}</title><defs>${noiseDefs}</defs>${body}</svg>`;
const hero = (w, h) => `<rect width="${w}" height="${h}" fill="${C.hero}"/>` + noise(w, h);

const ASSETS = [];
const add = (file, w, h, title, body) => ASSETS.push({ file, w, h, content: svg(w, h, body, title) });

// ---------------------------------------------------------------------------------------------------
// Logos (transparent background, for general use).
{
  const wm = wordmark({ x: 0, y: 0, h: 200, depth: false });
  const pad = 40;
  const W = Math.ceil(wm.width + 2 * pad), H = 200 + 2 * pad;
  add('logo/detoke-logo-verde.svg', W, H, 'detoke! logo', wordmark({ x: pad, y: pad, h: 200, color: C.green, depth: false }).svg);
  add('logo/detoke-logo-crema.svg', W, H, 'detoke! logo (fondo oscuro)', wordmark({ x: pad, y: pad, h: 200, color: C.cream, depth: false }).svg);
  add('logo/detoke-isotipo.svg', 1024, 1024, 'detoke! isotipo', `<rect width="1024" height="1024" rx="288" fill="${C.green}"/>` + monogram({ cx: 512, cy: 512, size: 608 }));
}

// Profile picture, Facebook and Instagram: square, both crop it to a circle, so the mark sits well
// inside it. 1080 × 1080 (Instagram shows 320, Facebook 176).
add('perfil/detoke-perfil-1080.svg', 1080, 1080, 'detoke! foto de perfil',
  `<rect width="1080" height="1080" fill="${C.green}"/>` + noise(1080, 1080) + monogram({ cx: 540, cy: 545, size: 560 }));

// ---------------------------------------------------------------------------------------------------
// Facebook cover: 1640 × 624 (2× of 820 × 312, desktop). Mobile shows the center 1110 × 624, so
// everything that matters sits between x 265 and 1375; the profile picture covers the bottom left.
{
  const W = 1640, H = 624;
  let b = hero(W, H) + awning(W, 1.6);
  const x0 = 300;
  b += wordmark({ x: x0, y: 112, h: 58 }).svg;
  b += text(F.display, 'Todo el barrio,', { x: x0, y: 292, size: 96, fill: C.cream, tracking: -0.025 });
  b += text(F.display, 'de toque.', { x: x0, y: 392, size: 96, fill: C.mustard, tracking: -0.025 });
  b += text(F.body, 'Mirá qué tienen hoy los comercios de tu zona', { x: x0, y: 462, size: 30, fill: C.soft });
  b += text(F.body, 'y hacé tu pedido directo por WhatsApp.', { x: x0, y: 504, size: 30, fill: C.soft });
  b += photo('panaderia_cover.jpg', { cx: 1085, cy: 225, w: 250, h: 190, angle: -7 });
  b += photo('verduleria_cover.jpg', { cx: 1300, cy: 240, w: 200, h: 250, angle: 5 });
  b += photo('dietetica_cover.jpg', { cx: 1080, cy: 450, w: 210, h: 195, angle: 4 });
  b += photo('del-barrio_cover.jpg', { cx: 1280, cy: 455, w: 180, h: 230, angle: -3 });
  add('facebook/detoke-facebook-portada-1640x624.svg', W, H, 'detoke! portada de Facebook', b);
}

// ---------------------------------------------------------------------------------------------------
// Instagram presentation post: 1080 × 1350 (4:5). The profile grid shows the center 3:4 (1012 wide).
{
  const W = 1080, H = 1350;
  let b = hero(W, H) + awning(W, 2);
  b += pill({ x: 110, y: 140, size: 30 });
  b += text(F.display, 'Todo el barrio,', { x: 110, y: 330, size: 112, fill: C.cream, tracking: -0.025 });
  b += text(F.display, 'de toque.', { x: 110, y: 448, size: 112, fill: C.mustard, tracking: -0.025 });
  b += text(F.body, 'Mirá qué tienen hoy los comercios de tu zona', { x: 110, y: 530, size: 34, fill: C.soft });
  b += text(F.body, 'y hacé tu pedido directo por WhatsApp.', { x: 110, y: 578, size: 34, fill: C.soft });
  b += photo('panaderia_cover.jpg', { cx: 300, cy: 800, w: 330, h: 250, angle: -7 });
  b += photo('verduleria_cover.jpg', { cx: 760, cy: 790, w: 280, h: 330, angle: 5 });
  b += photo('dietetica_cover.jpg', { cx: 330, cy: 1060, w: 280, h: 250, angle: 4 });
  b += photo('del-barrio_cover.jpg', { cx: 715, cy: 1060, w: 235, h: 300, angle: -3 });
  b += `<rect y="${H - 120}" width="${W}" height="120" fill="#0E271B"/>`;
  b += wordmark({ x: 110, y: H - 84, h: 46 }).svg;
  b += text(F.body, 'Comercios de Uruguay', { x: W - 110, y: H - 48, size: 30, fill: C.soft, anchor: 'end' });
  add('instagram/detoke-instagram-post-presentacion-1080x1350.svg', W, H, 'detoke! post de presentación', b);
}

// ---------------------------------------------------------------------------------------------------
// Instagram story "how it works": 1080 × 1920. The top 250 and bottom 250 stay free of text
// (Instagram puts the profile bar and the reply box there).
{
  const W = 1080, H = 1920;
  let b = hero(W, H) + awning(W, 2.5);
  b += wordmark({ x: W / 2, y: 320, h: 110, anchor: 'middle' }).svg;
  b += text(F.display, 'Todo el barrio,', { x: W / 2, y: 590, size: 104, fill: C.cream, anchor: 'middle', tracking: -0.025 });
  b += text(F.display, 'de toque.', { x: W / 2, y: 702, size: 104, fill: C.mustard, anchor: 'middle', tracking: -0.025 });
  const steps = [
    ['search', 'Buscá', 'el comercio o producto que querés'],
    ['shopping-bag', 'Armá tu pedido', 'con el catálogo y los precios del día'],
    ['message-circle', 'Envialo por WhatsApp', 'directo al negocio, sin intermediarios'],
  ];
  steps.forEach(([ic, title, sub], i) => {
    const y = 860 + i * 250;
    b += `<rect x="110" y="${y}" width="${W - 220}" height="210" rx="40" fill="${C.pill}" stroke="${C.line}" stroke-width="2"/>`;
    b += `<circle cx="215" cy="${y + 105}" r="60" fill="${C.mustard}"/>`;
    b += drawIcon(ic, { cx: 215, cy: y + 105, size: 58, color: C.hero, stroke: 2.2 });
    b += text(F.bodyBold, title, { x: 310, y: y + 95, size: 46, fill: C.cream });
    b += text(F.body, sub, { x: 310, y: y + 150, size: 32, fill: C.soft });
  });
  b += pill({ x: W / 2, y: 1640, size: 32, label: 'Comercios de cercanía en Uruguay', anchor: 'middle' });
  add('instagram/detoke-instagram-historia-como-funciona-1080x1920.svg', W, H, 'detoke! historia: cómo funciona', b);
}

// ---------------------------------------------------------------------------------------------------
// For businesses: why to join and how (same claims as the site: free, no fees, orders on WhatsApp).
/** Largest size (up to `max`) at which `str` fits in `width`. */
function fit(font, str, width, max, tracking = 0) {
  return Math.min(max, Math.floor((max * width) / shape(font, str, max, tracking).width));
}
/** A benefit: mustard badge with an icon, title and one line below, on a soft card. */
function benefit({ x, y, w, h, ic, title, sub, titleSize, subSize }) {
  const r = h * 0.3;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * 0.22}" fill="${C.pill}" stroke="${C.line}" stroke-width="2"/>`
    + `<circle cx="${x + h / 2}" cy="${y + h / 2}" r="${r}" fill="${C.mustard}"/>`
    + drawIcon(ic, { cx: x + h / 2, cy: y + h / 2, size: r * 0.95, color: C.hero, stroke: 2.3 })
    + text(F.bodyBold, title, { x: x + h, y: y + h / 2 - subSize * 0.15, size: titleSize, fill: C.cream })
    + text(F.body, sub, { x: x + h, y: y + h / 2 + subSize * 1.15, size: subSize, fill: C.soft });
}
/** The call to action: a mustard button with dark text, as on the site. */
function button({ x, y, label, size, anchor = 'start' }) {
  const s = shape(F.bodyBold, label, size);
  const padX = size * 1.1, h = size * 2.3, w = s.width + 2 * padX + size * 1.4;
  const left = anchor === 'middle' ? x - w / 2 : x;
  return { w, svg: `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h * 0.28}" fill="${C.mustard}"/>`
    + drawIcon('store', { cx: left + padX + size * 0.45, cy: y + h / 2, size: size * 0.95, color: C.hero, stroke: 2.2 })
    + `<path transform="translate(${(left + padX + size * 1.4).toFixed(1)} ${(y + h / 2 + size * 0.36).toFixed(1)})" d="${s.d}" fill="${C.hero}"/>` };
}
const BENEFITS = [
  ['badge-percent', 'Gratis y sin comisiones', 'No cobramos por publicar ni por vender.'],
  ['message-circle', 'Pedidos directo a tu WhatsApp', 'Con el detalle completo y aviso al instante.'],
  ['store', 'Tu catálogo en minutos', 'Productos, precios, horarios y envíos.'],
  ['map-pin', 'Te encuentran en tu zona', 'Los vecinos ven quién está abierto hoy.'],
];
{
  const W = 1080, H = 1350, x0 = 110, inner = W - 2 * x0;
  let b = hero(W, H) + awning(W, 2);
  b += pill({ x: x0, y: 112, size: 30, label: 'Para comercios' });
  const hs = fit(F.display, '¿Tenés un comercio?', inner, 104, -0.025);
  b += text(F.display, '¿Tenés un comercio?', { x: x0, y: 290, size: hs, fill: C.cream, tracking: -0.025 });
  b += text(F.display, 'Sumalo gratis.', { x: x0, y: 290 + hs * 1.08, size: hs, fill: C.mustard, tracking: -0.025 });
  BENEFITS.forEach(([ic, title, sub], i) => {
    b += benefit({ x: x0, y: 470 + i * 152, w: inner, h: 132, ic, title, sub, titleSize: 36, subSize: 27 });
  });
  b += button({ x: x0, y: 1092, label: 'Sumá tu negocio', size: 34 }).svg;
  b += text(F.body, 'Link en la bio', { x: W - x0, y: 1092 + 34 * 1.15 + 12, size: 30, fill: C.soft, anchor: 'end' });
  b += `<rect y="${H - 120}" width="${W}" height="120" fill="#0E271B"/>`;
  b += wordmark({ x: x0, y: H - 84, h: 46 }).svg;
  b += text(F.body, 'Comercios de Uruguay', { x: W - x0, y: H - 48, size: 30, fill: C.soft, anchor: 'end' });
  add('instagram/detoke-post-comercios-1080x1350.svg', W, H, 'detoke! post para comercios', b);
}
{
  const W = 1080, H = 1920, x0 = 110, inner = W - 2 * x0;
  let b = hero(W, H) + awning(W, 2.5);
  b += photo('del-barrio_cover.jpg', { cx: 330, cy: 470, w: 300, h: 400, angle: -5 });
  b += photo('verduleria_cover.jpg', { cx: 730, cy: 500, w: 290, h: 380, angle: 5 });
  b += pill({ x: W / 2, y: 760, size: 32, label: 'Para comercios', anchor: 'middle' });
  const hs = fit(F.display, '¿Tenés un comercio?', inner, 110, -0.025);
  b += text(F.display, '¿Tenés un comercio?', { x: W / 2, y: 930, size: hs, fill: C.cream, anchor: 'middle', tracking: -0.025 });
  b += text(F.display, 'Sumalo gratis.', { x: W / 2, y: 930 + hs * 1.08, size: hs, fill: C.mustard, anchor: 'middle', tracking: -0.025 });
  BENEFITS.slice(0, 3).forEach(([ic, title, sub], i) => {
    b += benefit({ x: x0, y: 1130 + i * 160, w: inner, h: 140, ic, title, sub, titleSize: 38, subSize: 28 });
  });
  b += button({ x: W / 2, y: 1636, label: 'Sumá tu negocio', size: 36, anchor: 'middle' }).svg;
  add('instagram/detoke-historia-comercios-1080x1920.svg', W, H, 'detoke! historia para comercios', b);
}

// ---------------------------------------------------------------------------------------------------
// Instagram highlight covers: a story (1080 × 1920) with the icon in the middle; Instagram shows a
// circle cut from the center, so the icon stays inside a 600 px circle.
{
  const covers = [
    ['como-pedir', 'shopping-bag'],
    ['comercios', 'store'],
    ['suma-tu-negocio', 'circle-plus'],
    ['novedades', 'sparkles'],
    ['zonas', 'map-pin'],
  ];
  for (const [slug, ic] of covers) {
    const W = 1080, H = 1920;
    const b = `<rect width="${W}" height="${H}" fill="${C.green}"/>` + noise(W, H)
      + `<circle cx="540" cy="960" r="260" fill="rgba(255,255,255,0.08)"/>`
      + drawIcon(ic, { cx: 540, cy: 960, size: 300, color: C.cream, stroke: 1.75 });
    add(`instagram/destacados/detoke-destacado-${slug}.svg`, W, H, `detoke! destacado ${slug}`, b);
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const a of ASSETS) {
    const svgPath = path.join(OUT, a.file);
    fs.mkdirSync(path.dirname(svgPath), { recursive: true });
    fs.writeFileSync(svgPath, a.content);
    await page.setViewportSize({ width: a.w, height: a.h });
    await page.setContent(`<html><body style="margin:0;background:transparent">${a.content}</body></html>`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: svgPath.replace(/\.svg$/, '.png'), omitBackground: true, clip: { x: 0, y: 0, width: a.w, height: a.h } });
    console.log(a.file, a.w, a.h);
  }
  await browser.close();
})();
