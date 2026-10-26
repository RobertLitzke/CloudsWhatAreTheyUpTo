// Make the app's icons, and public/poster.webp (the whole poster as the
// loading screen shows it). Run `npm run icons` after changing either.
//
// The icon is drawn here rather than cropped from the poster, because a crop
// of the poster turns to mush at tab size: one bold cel-shaded cumulus, as
// src/app/clouds/flat.ts draws them, in front of a peach sun on the poster's
// indigo-to-magenta sky. Kept to big shapes so it still reads at 16 px.
//
// - icons/icon.svg: the favicon (inlined into the page by lesson-kit's build,
//   so the one-file copy has it too).
// - icon-192.png, icon-512.png: the manifest's icons, with rounded corners.
// - icon-512-maskable.png: full bleed, the drawing shrunk into the centre 80%,
//   because Android crops maskable icons to a shape of its choosing.
// - apple-touch-icon.png: 180 px, full bleed; iOS rounds the corners itself.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const iconsDir = path.join(root, 'public', 'icons');

/** The cumulus as plain shapes (no <g>), so it can also sit in a <clipPath>. */
function cloud(fill, dx = 0, dy = 0) {
  const x = (v) => v + dx - 18;
  const y = (v) => v + dy;
  return [
    `<circle fill="${fill}" cx="${x(160)}" cy="${y(316)}" r="84"/>`,
    `<circle fill="${fill}" cx="${x(240)}" cy="${y(230)}" r="124"/>`,
    `<circle fill="${fill}" cx="${x(352)}" cy="${y(282)}" r="94"/>`,
    `<circle fill="${fill}" cx="${x(410)}" cy="${y(338)}" r="62"/>`,
    `<rect fill="${fill}" x="${x(76)}" y="${y(300)}" width="396" height="100" rx="50"/>`,
  ].join('');
}

/**
 * The icon on a 512 square. `corner` rounds the tile; `scale` shrinks the sun
 * and cloud about the centre, leaving the sky full bleed.
 */
function icon({ corner = 0, scale = 1 } = {}) {
  const t = (256 * (1 - scale)).toFixed(1);
  // Cel shading as flat.ts does it: the shade is the whole silhouette, and the
  // mid and light tones are the silhouette moved towards the sun (upper right)
  // and clipped to it, leaving a crescent of shadow low on the left.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#2e2c53"/><stop offset=".6" stop-color="#6b3a86"/><stop offset="1" stop-color="#a8448f"/>` +
    `</linearGradient><clipPath id="c">${cloud('#000')}</clipPath></defs>` +
    `<rect width="512" height="512" rx="${corner}" fill="url(#s)"/>` +
    `<g transform="translate(${t} ${t}) scale(${scale})">` +
    `<circle cx="350" cy="168" r="100" fill="#f6b98e"/>` +
    cloud('#a9a0c4') +
    `<g clip-path="url(#c)">${cloud('#dcd7ea', 16, -20)}${cloud('#ffffff', 40, -50)}</g>` +
    `</g></svg>`;
}

async function png(svg, size, out) {
  const buf = await sharp(Buffer.from(svg), { density: (72 * size * 4) / 512 })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer();
  await writeFile(path.join(iconsDir, out), buf);
  return `${out} (${size}x${size}, ${(buf.length / 1024).toFixed(1)} kB)`;
}

async function svgFile(svg, out) {
  await writeFile(path.join(iconsDir, out), svg);
  return `${out} (${(svg.length / 1024).toFixed(1)} kB)`;
}

/** The loading screen fills a phone, so 900 wide is plenty even at 2x. */
async function poster() {
  const webp = await sharp(path.join(root, 'art', 'poster.jpg'))
    .resize({ width: 900 })
    .webp({ quality: 74, effort: 6, smartSubsample: true })
    .toBuffer();
  await writeFile(path.join(root, 'public', 'poster.webp'), webp);
  return `poster.webp (900 wide, ${(webp.length / 1024).toFixed(1)} kB)`;
}

const tile = icon({ corner: 112 });
const results = await Promise.all([
  poster(),
  svgFile(tile, 'icon.svg'),
  png(tile, 192, 'icon-192.png'),
  png(tile, 512, 'icon-512.png'),
  png(icon({ scale: 0.8 }), 512, 'icon-512-maskable.png'),
  png(icon(), 180, 'apple-touch-icon.png'),
]);
for (const line of results) console.log('wrote', line);
