// The app icon: a cliff of tilted layers under flat ones (an unconformity),
// drawn as SVG, and the PNGs the manifest and phones need, made from it.
//   npm run icons -w geology

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = join(dirname(fileURLToPath(import.meta.url)), '../public/icons');

/** Tilted beds below, flat beds above, with the line between them. `pad` shrinks it for the maskable icon. */
function icon(pad = 0, round = 22) {
  const s = 100 - 2 * pad;
  const t = (x, y) => `${pad + (x * s) / 100},${pad + (y * s) / 100}`;
  const tilted = ['#5b4b8a', '#b4553a', '#d4a54a', '#8f9aa3', '#b4553a', '#d4a54a', '#5b4b8a'];
  const beds = tilted.map((c, i) => {
    const x = -40 + i * 22;
    return `<polygon points="${t(x, 100)} ${t(x + 22, 100)} ${t(x + 22 + 40, 52)} ${t(x + 40, 52)}" fill="${c}"/>`;
  }).join('');
  const flat = [['#e9d9b0', 52, 44], ['#d9b98a', 44, 36], ['#c99a6b', 36, 28]]
    .map(([c, a, b]) => `<rect x="${pad}" y="${pad + (b * s) / 100}" width="${s}" height="${((a - b) * s) / 100}" fill="${c}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><rect width="100" height="100" rx="${round}"/></clipPath><g clip-path="url(#c)"><rect width="100" height="100" fill="#2a2420"/>${beds}${flat}<polyline points="${t(0, 52)} ${t(30, 50)} ${t(62, 53)} ${t(100, 51)}" fill="none" stroke="#2a2420" stroke-width="${2.2 * s / 100}"/><circle cx="${pad + (78 * s) / 100}" cy="${pad + (15 * s) / 100}" r="${(7 * s) / 100}" fill="#fbf6ec"/></g></svg>`;
}

writeFileSync(join(out, 'icon.svg'), icon());
const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 72 * (size / 100) }).resize(size, size).png().toFile(join(out, file));
await png(icon(), 192, 'icon-192.png');
await png(icon(), 512, 'icon-512.png');
await png(icon(10, 0), 512, 'icon-512-maskable.png');
await png(icon(0, 0), 180, 'apple-touch-icon.png');
await png(icon(), 32, 'favicon-32.png');
console.log('icons written');
