// The app icon: a fir tree on a hill inside two gold cycle arrows,
// drawn as SVG, and the PNGs the manifest and phones need, made from it.
//   npm run icons -w ecology

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = join(dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(out, { recursive: true });

const ART = `<path d="M-10 84 Q50 66 110 84 V110 H-10Z" fill="#2f6a4b"/> <path d="M50 26 L38 56 H62Z M50 40 L34 70 H66Z" fill="#6fae5b"/> <rect x="47" y="68" width="6" height="12" fill="#6b4a2e"/> <path d="M20 46 A32 32 0 0 1 64 17" fill="none" stroke="#e8c46a" stroke-width="5" stroke-linecap="round"/> <path d="M60 10 L71 18 L59 25Z" fill="#e8c46a"/> <path d="M80 54 A32 32 0 0 1 36 83" fill="none" stroke="#e8c46a" stroke-width="5" stroke-linecap="round"/> <path d="M40 90 L29 82 L41 75Z" fill="#e8c46a"/>`;

/** The drawing on its background. `pad` shrinks it for the maskable icon; `round` is the corner radius. */
function icon(pad = 0, round = 22) {
  const s = (100 - 2 * pad) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><rect width="100" height="100" rx="${round}"/></clipPath><g clip-path="url(#c)"><rect width="100" height="100" fill="#173b3a"/><g transform="translate(${pad} ${pad}) scale(${s})">${ART}</g></g></svg>`;
}

writeFileSync(join(out, 'icon.svg'), icon());
const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 72 * (size / 100) }).resize(size, size).png().toFile(join(out, file));
await png(icon(), 192, 'icon-192.png');
await png(icon(), 512, 'icon-512.png');
await png(icon(10, 0), 512, 'icon-512-maskable.png');
await png(icon(0, 0), 180, 'apple-touch-icon.png');
await png(icon(), 32, 'favicon-32.png');
console.log('icons written');
