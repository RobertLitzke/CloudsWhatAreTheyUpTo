// Make the PNG icons the manifest and iOS need from the poster
// (art/poster.jpg): a square of the clouds with the seeding plane in it. Also
// writes public/poster.webp, the whole poster as the loading screen shows it.
// Run `npm run icons` after changing the poster or the crop.
//
// The maskable variant is the same square shrunk a little, because Android
// crops maskable icons to an arbitrary shape and only guarantees the centre 80%.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const iconsDir = path.join(root, 'public', 'icons');
const CROP = { left: 360, top: 1040, width: 900, height: 900 };
const art = await sharp(path.join(root, 'art', 'poster.jpg')).extract(CROP).toBuffer();

async function render(size, out, inset = 1) {
  const inner = Math.round(size * inset);
  let img = sharp(art).resize(inner, inner);
  if (inset < 1) {
    // Fill the margin by blowing the same square up behind it.
    const back = await sharp(art).resize(size, size).blur(12).toBuffer();
    const front = await img.png().toBuffer();
    img = sharp(back).composite([{ input: front, gravity: 'center' }]);
  }
  const png = await img.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toBuffer();
  await writeFile(path.join(iconsDir, out), png);
  return `${out} (${size}x${size}, ${(png.length / 1024).toFixed(1)} kB)`;
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

const results = await Promise.all([
  poster(),
  render(192, 'icon-192.png'),
  render(512, 'icon-512.png'),
  render(512, 'icon-512-maskable.png', 0.8),
]);
for (const line of results) console.log('wrote', line);
