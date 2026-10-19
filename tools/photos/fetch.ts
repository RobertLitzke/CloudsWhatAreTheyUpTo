// npm run photos:fetch
//
// Downloads the photos named in tools/photos/picks.json, re-reading each one's
// licence and author from Commons at the moment of download, resizes them to
// WebP in public/photos/, and writes src/data/photos.json with a credit for
// every photo. A pick whose licence the app does not accept is skipped and
// named. Photos no longer picked are deleted.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { fileInfo, politeFetch } from './commons.ts';
import { FEATURES, STORE_WIDTH } from './config.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const photoDir = path.join(root, 'public', 'photos');
/** A pick is a file title, or a title with the genus it shows (for a rare cloud that forms on several). */
type Pick = string | { title: string; genus: string };
const picks: Record<string, Pick[]> = JSON.parse(await readFile(path.join(here, 'picks.json'), 'utf8'));

await mkdir(photoDir, { recursive: true });
const entries: unknown[] = [];
const keep = new Set<string>();

for (const [key, list] of Object.entries(picks)) {
  const feature = Object.hasOwn(FEATURES, key) ? key : undefined;
  const genusOf = new Map(list.map((p) => (typeof p === 'string' ? [p, feature ? FEATURES[key].genus : key] : [p.title, p.genus])));
  const infos = await fileInfo([...genusOf.keys()], STORE_WIDTH);
  // Commons returns files in its own order; keep the order they were picked in.
  const order = [...genusOf.keys()];
  infos.sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  let n = 0;
  for (const info of infos) {
    const genus = genusOf.get(info.title) ?? genusOf.get(info.title.replace(/_/g, ' '));
    if (!info.license) {
      console.warn(`skip ${info.title}: licence "${info.licenseName}" is not accepted`);
      continue;
    }
    const id = `${key}-${String(++n).padStart(2, '0')}`;
    const file = `${id}.webp`;
    const res = await politeFetch(info.thumbUrl);
    if (!res.ok) {
      console.warn(`skip ${info.title}: download answered ${res.status}`);
      n--;
      continue;
    }
    const out = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize({ width: STORE_WIDTH, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });
    await writeFile(path.join(photoDir, file), out.data);
    keep.add(file);
    entries.push({
      id,
      genus,
      ...(feature ? { feature } : {}),
      file: `photos/${file}`,
      width: out.info.width,
      height: out.info.height,
      author: info.author,
      license: info.license,
      sourceUrl: info.pageUrl,
      source: 'Wikimedia Commons',
    });
    console.log(`${id}  ${(out.data.length / 1024).toFixed(0)} kB  ${info.license}  ${info.author}`);
  }
}

for (const f of await readdir(photoDir)) if (f.endsWith('.webp') && !keep.has(f)) await rm(path.join(photoDir, f));
await writeFile(path.join(root, 'src', 'data', 'photos.json'), JSON.stringify(entries, null, 2) + '\n');
console.log(`\n${entries.length} photos written. Run npm test to check every credit.`);
