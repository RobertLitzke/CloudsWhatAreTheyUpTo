// Draws the catalog's icon (an open book in ink on paper, a red ribbon) as
// public/icons/icon.svg, and renders the PNGs the manifest and iOS want.
// Run with `npm run icons -w catalog`.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(out, { recursive: true });

const PAPER = '#f4f1e8';
const INK = '#1f1d1a';
const RED = '#7a1f2b';

/** The book, drawn for a 512 square; everything sits inside the middle 70%, so it survives a maskable crop. */
const book = `
  <path d="M256 170 C 214 146 160 140 108 148 V 352 C 160 344 214 350 256 374 Z" fill="#fffdf6" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  <path d="M256 170 C 298 146 352 140 404 148 V 352 C 352 344 298 350 256 374 Z" fill="#fffdf6" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  <g stroke="${INK}" stroke-width="7" stroke-linecap="round" opacity="0.55">
    <path d="M138 196 C 170 192 200 196 226 206"/><path d="M138 232 C 170 228 200 232 226 242"/><path d="M138 268 C 170 264 200 268 226 278"/>
    <path d="M286 206 C 312 196 342 192 374 196"/><path d="M286 242 C 312 232 342 228 374 232"/>
  </g>
  <path d="M330 156 V 300 L 346 284 L 362 300 V 151" fill="${RED}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;

const svg = (round) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${round}" fill="${PAPER}"/>${book}</svg>`;

writeFileSync(resolve(out, 'icon.svg'), svg(96));
const png = (s, size, name) => sharp(Buffer.from(s)).resize(size, size).png().toFile(resolve(out, name));
await png(svg(96), 192, 'icon-192.png');
await png(svg(96), 512, 'icon-512.png');
await png(svg(0), 512, 'icon-512-maskable.png');
await png(svg(0), 180, 'apple-touch-icon.png');
console.log('Wrote', out);
