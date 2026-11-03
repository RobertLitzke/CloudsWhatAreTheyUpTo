// Fetches a course's photos. Each pick in courses/<course>/tools/photo-picks.json
// names a file on Wikimedia Commons, { id, title, ...fields }, whose licence
// and author are read at the moment of download and refused unless the
// licence is public domain, CC0, CC BY or CC BY-SA; or a file elsewhere (a
// USGS or NOAA library, Flickr, a city archive), { id, url, page, source,
// author, license, ...fields }, where `page` is the record the licence was
// read from and `license` one of the same short names. Either kind may add
// `crop: [left, top, width, height]` in source pixels to cut off scanned
// borders. The photo is resized to 1024 px wide, saved as
// public/photos/<id>.webp, and credited in src/data/photos.json; every other
// field of the pick (about, genus, feature, noMirror, subject) is carried
// into its record, so a course names its photos as it likes. Picks already
// saved are skipped (--all to redo them); photos no longer picked are left
// alone (--prune deletes them).
//
//   npm run photos -- <course> [--all] [--prune]
//
// Photo ids are remembered by saves (check answers, review cards), so a pick
// keeps its id for good.

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { fileInfo, licenceId, politeFetch } from './lib/commons.mjs';
import { courseArg, readJson } from './lib/course.mjs';

const { name, dir, userAgent } = courseArg('usage: npm run photos -- <course> [--all] [--prune]');
const WIDTH = 1024;
const WEBP = { quality: 72, effort: 6, smartSubsample: true };

const picksFile = join(dir, 'tools/photo-picks.json');
const picks = readJson(picksFile, null);
if (!picks) {
  console.error(`${name} has no tools/photo-picks.json`);
  process.exit(1);
}
const listFile = join(dir, 'src/data/photos.json');
const have = readJson(listFile, []);
const redo = process.argv.includes('--all');
const prune = process.argv.includes('--prune');
const OWN = new Set(['id', 'title', 'url', 'page', 'source', 'author', 'license', 'crop']);
/** The pick's own fields, carried into the record. */
const fields = (pick) => Object.fromEntries(Object.entries(pick).filter(([k]) => !OWN.has(k)));

const out = redo ? [] : have.filter((p) => picks.some((k) => k.id === p.id) && existsSync(join(dir, 'public', p.file ?? `photos/${p.id}.webp`)));

/** Resizes a downloaded image into public/photos/<id>.webp. */
async function save(pick, img) {
  let s = sharp(img).rotate();
  if (pick.crop) {
    const [left, top, width, height] = pick.crop;
    s = sharp(await s.extract({ left, top, width, height }).toBuffer());
  }
  const file = `photos/${pick.id}.webp`;
  const info = await s.resize({ width: WIDTH, withoutEnlargement: true }).webp(WEBP).toFile(join(dir, 'public', file));
  return { file, width: info.width, height: info.height };
}

const seen = new Set();
for (const pick of picks) {
  if (seen.has(pick.id)) { console.error(`${pick.id}: picked twice`); process.exitCode = 1; }
  seen.add(pick.id);
  if (out.some((p) => p.id === pick.id)) continue;
  if (pick.url) {
    const lic = licenceId(pick.license);
    if (!lic) { console.error(`${pick.id}: licence "${pick.license}" not allowed`); continue; }
    const r = await politeFetch(pick.url, userAgent);
    if (!r.ok) { console.error(`${pick.id}: ${r.status} from ${pick.url}`); continue; }
    const saved = await save(pick, Buffer.from(await r.arrayBuffer()));
    out.push({ id: pick.id, ...fields(pick), ...saved, author: pick.author, license: lic, sourceUrl: pick.page, source: pick.source });
    console.log(`${pick.id}: ${lic}, ${saved.width}×${saved.height} from ${pick.source}`);
    continue;
  }
  const [info] = await fileInfo([pick.title], WIDTH, userAgent);
  if (!info) { console.error(`${pick.id}: no file ${pick.title}`); continue; }
  if (!info.license) { console.error(`${pick.id}: licence "${info.licenseName}" not allowed`); continue; }
  const r = await politeFetch(info.thumbUrl, userAgent);
  if (!r.ok) { console.error(`${pick.id}: ${r.status} from ${info.thumbUrl}`); continue; }
  const saved = await save(pick, Buffer.from(await r.arrayBuffer()));
  out.push({ id: pick.id, ...fields(pick), ...saved, author: info.author, license: info.license, sourceUrl: info.pageUrl, source: 'Wikimedia Commons' });
  console.log(`${pick.id}: ${info.license}, ${saved.width}×${saved.height}`);
  await new Promise((ok) => setTimeout(ok, 600));
}
out.sort((a, b) => picks.findIndex((k) => k.id === a.id) - picks.findIndex((k) => k.id === b.id));
writeFileSync(listFile, `${JSON.stringify(out, null, 2)}\n`);
if (prune) {
  const keep = new Set(out.map((p) => p.file ?? `photos/${p.id}.webp`));
  for (const f of readdirSync(join(dir, 'public/photos'))) {
    if (f.endsWith('.webp') && !keep.has(`photos/${f}`)) { rmSync(join(dir, 'public/photos', f)); console.log(`removed photos/${f}`); }
  }
}
console.log(`${out.length} photos in courses/${name}/src/data/photos.json`);
