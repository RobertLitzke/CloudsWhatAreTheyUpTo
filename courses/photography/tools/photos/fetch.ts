// npm run photos:fetch
//
// Downloads the photographs named in tools/photos/picks.json, re-reading each one's
// licence and author from Commons at the moment of download, resizes them to
// WebP in public/photos/, and writes src/data/photos.json with a credit for
// every photo. A pick whose licence the app does not accept is skipped and
// named. Photos no longer picked are deleted.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { fileInfo, politeFetch } from './commons.ts';
import { depthMap, depthName } from './depth.ts';
import { DEPTH_WIDTH, STORE_WIDTH, WEBP } from './config.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const photoDir = path.join(root, 'public', 'photos');
/** A pick is a file title, or a title with noMirror for a photo with writing or a landmark in it. */
type Pick = string | { title: string; noMirror?: true };
const picks: Record<string, Pick[]> = JSON.parse(await readFile(path.join(here, 'picks.json'), 'utf8'));

await mkdir(photoDir, { recursive: true });
const entries: unknown[] = [];
const keep = new Set<string>();

for (const [subject, list] of Object.entries(picks)) {
  const order = list.map((p) => (typeof p === 'string' ? p : p.title));
  const noMirror = new Set(list.flatMap((p) => (typeof p !== 'string' && p.noMirror ? [p.title] : [])));
  const infos = await fileInfo(order, STORE_WIDTH);
  // Commons returns files in its own order; keep the order they were picked in.
  infos.sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  let n = 0;
  for (const info of infos) {
    if (!info.license) {
      console.warn(`skip ${info.title}: licence "${info.licenseName}" is not accepted`);
      continue;
    }
    const id = `${subject}-${String(++n).padStart(2, '0')}`;
    const file = `${id}.webp`;
    const res = await politeFetch(info.thumbUrl);
    if (!res.ok) {
      console.warn(`skip ${info.title}: download answered ${res.status}`);
      n--;
      continue;
    }
    const original = Buffer.from(await res.arrayBuffer());
    const out = await sharp(original)
      .rotate()
      .resize({ width: STORE_WIDTH, withoutEnlargement: true })
      .webp(WEBP)
      .toBuffer({ resolveWithObject: true });
    await writeFile(path.join(photoDir, file), out.data);
    keep.add(file);
    // The depth map the aperture and movement figures blur by. Check it on the
    // contact sheet: a wrong map makes a figure that lies.
    const depth = depthName(id);
    await writeFile(path.join(photoDir, depth), await depthMap(original, DEPTH_WIDTH));
    keep.add(depth);
    entries.push({
      id,
      subject,
      ...(noMirror.has(info.title) ? { noMirror: true } : {}),
      file: `photos/${file}`,
      depthFile: `photos/${depth}`,
      // How far away things are, and how fast they move: the figures need it
      // and no API knows it. Fill it in by hand, photo by photo.
      scene: { subjectAt: 10, near: 2, far: null },
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
