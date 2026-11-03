// Writes a course's app icons from one SVG drawing: the files the manifest,
// iOS and the favicon need (didactics/vite lessonApp lists them), so a
// course's tools/icons.mjs holds only its drawing.
//
//   import { writeIcons } from '../../../tools/lib/icons.mjs';
//   await writeIcons(new URL('../public/icons/', import.meta.url), ({ pad, round }) => svgText, { viewBox: 100 });
//
// `draw` gets `pad`, how much of the square to leave empty on each side (0 to
// 0.1, as a fraction: Android crops maskable icons to a shape of its choosing
// and only guarantees the centre 80%), and `round`, whether to round the
// tile's corners (iOS rounds its own, so the touch icon is square).

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/** The files written, with the drawing each gets. */
const FILES = [
  { name: 'icon-192.png', size: 192, pad: 0, round: true },
  { name: 'icon-512.png', size: 512, pad: 0, round: true },
  { name: 'icon-512-maskable.png', size: 512, pad: 0.1, round: false },
  { name: 'apple-touch-icon.png', size: 180, pad: 0, round: false },
  { name: 'favicon-32.png', size: 32, pad: 0, round: true },
];

/**
 * Write icon.svg and the PNGs into `dir` (a URL or path). `viewBox` is the
 * width of the drawing's square; `extra` runs alongside and reports a line
 * (a course's poster, say). Returns the lines written, for the console.
 */
export async function writeIcons(dir, draw, { viewBox = 100, extra = [] } = {}) {
  const out = dir instanceof URL ? fileURLToPath(dir) : dir;
  await mkdir(out, { recursive: true });
  const svg = draw({ pad: 0, round: true });
  const png = async ({ name, size, pad, round }) => {
    // Drawn at twice the size and scaled down, for smooth edges.
    const buf = await sharp(Buffer.from(draw({ pad, round })), { density: (72 * size * 2) / viewBox })
      .resize(size, size)
      .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
      .toBuffer();
    await writeFile(`${out}/${name}`, buf);
    return `${name} (${size}x${size}, ${(buf.length / 1024).toFixed(1)} kB)`;
  };
  const lines = await Promise.all([
    writeFile(`${out}/icon.svg`, svg).then(() => `icon.svg (${(svg.length / 1024).toFixed(1)} kB)`),
    ...FILES.map(png),
    ...extra.map((f) => f()),
  ]);
  for (const line of lines) console.log('wrote', line);
  return lines;
}
