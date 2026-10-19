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
import { USER_AGENT, fileInfo } from './commons.ts';
import { STORE_WIDTH } from './config.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const photoDir = path.join(root, 'public', 'photos');
const picks: Record<string, string[]> = JSON.parse(await readFile(path.join(here, 'picks.json'), 'utf8'));

await mkdir(photoDir, { recursive: true });
const entries: unknown[] = [];
const keep = new Set<string>();

for (const [genus, titles] of Object.entries(picks)) {
  const infos = await fileInfo(titles, STORE_WIDTH);
  let n = 0;
  for (const info of infos) {
    if (!info.license) {
      console.warn(`skip ${info.title}: licence "${info.licenseName}" is not accepted`);
      continue;
    }
    const id = `${genus}-${String(++n).padStart(2, '0')}`;
    const file = `${id}.webp`;
    const res = await fetch(info.thumbUrl, { headers: { 'User-Agent': USER_AGENT } });
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
