// Make the PNG icons the manifest and iOS need: a sprout over a cut-away of
// soil in layers, drawn here as SVG so there is no art file to keep. Run
// `npm run icons` after changing the drawing.
//
// The maskable variant keeps the sprout inside the centre 80%, because Android
// crops maskable icons to an arbitrary shape and only guarantees that much.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(here, '..', 'public', 'icons');

/** The icon on a 100-unit square; `pad` shrinks the sprout and soil toward the centre. */
function icon(pad = 0) {
  const k = 1 - pad * 2;
  const g = `translate(${50 - 50 * k} ${50 - 50 * k}) scale(${k})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#cfe2c6"/>
  <g transform="${g}">
    <circle cx="74" cy="24" r="10" fill="#f7dc8a"/>
    <rect x="0" y="56" width="100" height="44" fill="#3d2b1c"/>
    <path d="M0 74 Q25 70 50 74 T100 73 V100 H0Z" fill="#7b5838"/>
    <path d="M0 90 Q30 86 60 90 T100 89 V100 H0Z" fill="#9a7a50"/>
    <path d="M0 58 Q50 50 100 58 V56 H0Z" fill="#5a3f28"/>
    <path d="M50 56 v22 M50 64 q-6 6 -12 8 M50 68 q7 5 11 11" stroke="#ecdfc3" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="84" r="2.6" fill="#9a9284"/><circle cx="76" cy="66" r="1.4" fill="#c9b48a"/><circle cx="20" cy="64" r="1.2" fill="#c9b48a"/>
    <path d="M50 56 V36" stroke="#4e7a2c" stroke-width="3" stroke-linecap="round"/>
    <path d="M50 40 C47 28 36 23 25 25 C25 37 36 42 50 40Z" fill="#6c9b40"/>
    <path d="M50 35 C53 23 64 18 75 20 C75 32 64 37 50 35Z" fill="#9cc46a"/>
  </g>
</svg>`;
}

async function render(size, out, pad = 0) {
  const png = await sharp(Buffer.from(icon(pad))).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toBuffer();
  await writeFile(path.join(iconsDir, out), png);
  return `${out} (${size}x${size}, ${(png.length / 1024).toFixed(1)} kB)`;
}

const results = await Promise.all([
  render(192, 'icon-192.png'),
  render(512, 'icon-512.png'),
  render(512, 'icon-512-maskable.png', 0.1),
]);
for (const line of results) console.log('wrote', line);
