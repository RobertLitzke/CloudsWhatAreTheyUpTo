// Make the icons the manifest, the browser tab and iOS need: an aperture of
// six blades with a warm hole in the middle, the same drawing the header shows
// (src/app/mark.ts), so there is no art file to keep. Run `npm run icons`
// after changing it.
//
// It is drawn to read at 16 pixels: three tones far apart in lightness and no
// fine detail. The maskable variant keeps the aperture inside the centre 80%,
// because Android crops maskable icons to an arbitrary shape and only
// guarantees that much. The favicon has rounded corners; the others are
// square, as the platforms round them themselves.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { BLADES } from '../src/app/mark.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(here, '..', 'public', 'icons');

/** The icon; `pad` shrinks the drawing toward the centre, `round` rounds the corners. */
function icon(pad = 0, round = false) {
  const k = 1 - pad * 2;
  const g = `translate(${50 - 50 * k} ${50 - 50 * k}) scale(${k})`;
  const clip = round ? ' clip-path="url(#r)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <clipPath id="r"><rect width="100" height="100" rx="22"/></clipPath>
  <g${clip}>
  <rect width="100" height="100" fill="#f2efe9"/>
  <g transform="${g}">
    ${BLADES}
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
