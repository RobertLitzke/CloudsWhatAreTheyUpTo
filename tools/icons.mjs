// Make the icons the manifest, the browser tab and iOS need: a two-leaf
// sprout coming up out of a mound of soil, drawn here as SVG so there is no
// art file to keep. Run `npm run icons` after changing the drawing.
//
// It is drawn to read at 16 pixels: three big shapes in colours far apart in
// lightness (cream sky, dark soil, mid-green leaves) and no fine detail. The
// maskable variant keeps the sprout inside the centre 80%, because Android
// crops maskable icons to an arbitrary shape and only guarantees that much.
// The favicon has rounded corners; the others are square, as the platforms
// round them themselves.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(here, '..', 'public', 'icons');

/** The drawing on a 100-unit square. Keep MARK in src/main.ts (the header logo) in step. */
export const SPROUT = `<path d="M-40 76 Q50 50 140 76 V140 H-40Z" fill="#5a3f28"/>
    <path d="M50 70 V47" stroke="#3f6b2a" stroke-width="7" stroke-linecap="round"/>
    <path d="M50 50 C45 33 31 25 14 27 C14 45 30 54 50 50Z" fill="#4e8a2e"/>
    <path d="M50 43 C55 26 69 18 86 20 C86 38 70 47 50 43Z" fill="#86b43e"/>`;

/** The icon; `pad` shrinks the sprout and soil toward the centre, `round` rounds the corners. */
function icon(pad = 0, round = false) {
  const k = 1 - pad * 2;
  const g = `translate(${50 - 50 * k} ${50 - 50 * k}) scale(${k})`;
  const clip = round ? ' clip-path="url(#r)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <clipPath id="r"><rect width="100" height="100" rx="22"/></clipPath>
  <g${clip}>
  <rect width="100" height="100" fill="#efe6cf"/>
  <g transform="${g}">
    ${SPROUT}
  </g>
  </g>
</svg>`;
}

async function render(size, out, pad = 0, round = false) {
  const png = await sharp(Buffer.from(icon(pad, round)), { density: 72 * Math.max(1, size / 100) })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 })
    .toBuffer();
  await writeFile(path.join(iconsDir, out), png);
  return `${out} (${size}x${size}, ${(png.length / 1024).toFixed(1)} kB)`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(path.join(iconsDir, 'icon.svg'), icon(0, true));
  const results = await Promise.all([
    render(32, 'favicon-32.png', 0, true),
    render(180, 'apple-touch-icon.png'),
    render(192, 'icon-192.png'),
    render(512, 'icon-512.png'),
    render(512, 'icon-512-maskable.png', 0.1),
  ]);
  for (const line of results) console.log('wrote', line);
}
