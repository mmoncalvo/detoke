// npm run brand:icons — writes the favicons from the logo in use (LogoMark): SVG, PNG 32 and the 180 px Apple touch icon.
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
console.log('Favicons written in public/.');
