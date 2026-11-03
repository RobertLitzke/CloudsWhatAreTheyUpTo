// The app icon: a stem with two leaves and a pink five-petal flower,
// drawn as SVG, and the PNGs the manifest and phones need, made from it.
//   npm run icons -w botany

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = join(dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(out, { recursive: true });

const ART = `<path d="M50 96 V52" stroke="#3f6b2a" stroke-width="5" stroke-linecap="round"/> <path d="M50 78 C40 66 26 64 16 70 C26 82 40 84 50 78Z" fill="#4e8a2e"/> <path d="M50 70 C60 58 74 56 84 62 C74 74 60 76 50 70Z" fill="#86b43e"/> <ellipse cx="50" cy="20" rx="10" ry="17" fill="#d9658a" transform="rotate(0 50 36)"/><ellipse cx="50" cy="20" rx="10" ry="17" fill="#d9658a" transform="rotate(72 50 36)"/><ellipse cx="50" cy="20" rx="10" ry="17" fill="#d9658a" transform="rotate(144 50 36)"/><ellipse cx="50" cy="20" rx="10" ry="17" fill="#d9658a" transform="rotate(216 50 36)"/><ellipse cx="50" cy="20" rx="10" ry="17" fill="#d9658a" transform="rotate(288 50 36)"/> <circle cx="50" cy="36" r="9" fill="#f2c14e"/> <circle cx="47" cy="33" r="2.6" fill="#fff0bd"/>`;

/** The drawing on its background. `pad` shrinks it for the maskable icon; `round` is the corner radius. */
function icon(pad = 0, round = 22) {
  const s = (100 - 2 * pad) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><rect width="100" height="100" rx="${round}"/></clipPath><g clip-path="url(#c)"><rect width="100" height="100" fill="#f1eedb"/><g transform="translate(${pad} ${pad}) scale(${s})">${ART}</g></g></svg>`;
}

writeFileSync(join(out, 'icon.svg'), icon());
const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 72 * (size / 100) }).resize(size, size).png().toFile(join(out, file));
await png(icon(), 192, 'icon-192.png');
await png(icon(), 512, 'icon-512.png');
await png(icon(10, 0), 512, 'icon-512-maskable.png');
await png(icon(0, 0), 180, 'apple-touch-icon.png');
await png(icon(), 32, 'favicon-32.png');
console.log('icons written');
