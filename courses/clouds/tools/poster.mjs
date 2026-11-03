// Makes public/poster.webp, the whole poster as the loading screen shows it,
// from art/poster.jpg. Run `npm run poster` after changing the poster.
// (The app's icons are made for every course at once by `npm run icons` at
// the repo's root; see catalog/icons/README.md.)

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

/** The loading screen fills a phone, so 900 wide is plenty even at 2x. */
const webp = await sharp(path.join(root, 'art', 'poster.jpg'))
  .resize({ width: 900 })
  .webp({ quality: 74, effort: 6, smartSubsample: true })
  .toBuffer();
await writeFile(path.join(root, 'public', 'poster.webp'), webp);
console.log(`wrote poster.webp (900 wide, ${(webp.length / 1024).toFixed(1)} kB)`);
