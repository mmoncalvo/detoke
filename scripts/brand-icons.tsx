// npm run brand:icons — writes the favicons from the logo in use (LogoMark): SVG, PNG 32, the 180 px Apple touch icon
// and the notification icon and badge.
import fs from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { LogoMark } from '../src/components/brand/LogoMarks';

const svg = renderToStaticMarkup(<LogoMark />).replace(' class="shrink-0"', '');
await fs.writeFile('public/favicon.svg', `${svg}\n`);
await sharp(Buffer.from(svg), { density: 300 }).resize(32, 32).png().toFile('public/favicon-32.png');
// The touch icon goes edge to edge (iOS rounds the corners itself).
const square = svg.replace('rx="8"', 'rx="0"');
await sharp(Buffer.from(square), { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
// System notifications: the logo as the icon, and the glyphs alone in white for the small badge
// (Android draws the badge as a one-color silhouette, so a filled square would show as a blank tile).
await sharp(Buffer.from(svg), { density: 600 }).resize(192, 192).png().toFile('public/notification-icon.png');
const glyphs = svg.replace(/<rect[^>]*><\/rect>/, '').replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#FFFFFF"');
await sharp(Buffer.from(glyphs), { density: 600 }).resize(96, 96).png().toFile('public/notification-badge.png');
console.log('Favicons and notification icons written in public/.');
