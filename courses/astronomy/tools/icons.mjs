// The app icon: a gold star with one tilted orbit and a small blue planet on
// it, on the night-blue ground, drawn as SVG, and the PNGs the manifest and
// phones need, made from it.
//   npm run icons -w astronomy

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = join(dirname(fileURLToPath(import.meta.url)), '../public/icons');

/** `pad` shrinks the drawing for the maskable icon; `round` is the corner radius. */
function icon(pad = 0, round = 22) {
  const s = (100 - 2 * pad) / 100;
  const at = (v) => pad + v * s;
  const dots = [[16, 20, 1.2, '#ffd2a1'], [80, 14, 1.5, '#cfe0ff'], [88, 70, 1.1, '#ffffff'], [12, 78, 1.3, '#ffb27a'], [30, 88, 0.9, '#dfe8ff'], [64, 30, 0.8, '#ffffff']]
    .map(([x, y, r, c]) => `<circle cx="${at(x)}" cy="${at(y)}" r="${r * s}" fill="${c}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><rect width="100" height="100" rx="${round}"/></clipPath><g clip-path="url(#c)"><rect width="100" height="100" fill="#141a2e"/>${dots}`
    + `<ellipse cx="${at(50)}" cy="${at(54)}" rx="${36 * s}" ry="${14 * s}" fill="none" stroke="#a9adc2" stroke-width="${1.6 * s}" transform="rotate(-18 ${at(50)} ${at(54)})"/>`
    + `<circle cx="${at(50)}" cy="${at(54)}" r="${13 * s}" fill="#f6c766"/><circle cx="${at(50)}" cy="${at(54)}" r="${9 * s}" fill="#fff1c4"/>`
    + `<circle cx="${at(81)}" cy="${at(38)}" r="${5 * s}" fill="#4f9fb8"/></g></svg>`;
}

writeFileSync(join(out, 'icon.svg'), icon());
const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 72 * (size / 100) }).resize(size, size).png().toFile(join(out, file));
await png(icon(), 192, 'icon-192.png');
await png(icon(), 512, 'icon-512.png');
await png(icon(10, 0), 512, 'icon-512-maskable.png');
await png(icon(0, 0), 180, 'apple-touch-icon.png');
await png(icon(), 32, 'favicon-32.png');
console.log('icons written');
