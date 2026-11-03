// Fetches the course's photos from Wikimedia Commons: each pick in
// tools/photo-picks.json ({ id, title, about }) is read for its licence and
// author, refused unless the licence is public domain, CC0, CC BY or CC BY-SA,
// resized to 1024 px wide, saved as public/photos/<id>.webp, and credited in
// src/data/photos.json. Picks already saved are skipped (--all to redo them).
// A photo that isn't on Commons (a USGS or NOAA library, say) is picked by
// its file instead: { id, url, page, source, author, license, about }, where
// `page` is the record the licence was read from and `license` is one of the
// same short names. Either kind may add `crop: [left, top, width, height]`
// in source pixels to cut off scanned borders.
//   npm run photos -w astronomy

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'AstronomyCourse/0.1 (https://github.com/RobertLitzke/CloudsWhatAreTheyUpTo)';
const API = 'https://commons.wikimedia.org/w/api.php';
const WIDTH = 1024;

const picks = JSON.parse(readFileSync(join(root, 'tools/photo-picks.json'), 'utf8'));
const listFile = join(root, 'src/data/photos.json');
const have = existsSync(listFile) ? JSON.parse(readFileSync(listFile, 'utf8')) : [];
const redo = process.argv.includes('--all');

function licence(short) {
  const s = (short ?? '').trim().toLowerCase();
  if (s === 'public domain' || s.startsWith('pd') || s === 'no restrictions') return 'PD';
  if (s === 'cc0' || s.startsWith('cc0')) return 'CC0';
  const m = /^cc[ -]by(-sa)?[ -](2\.0|3\.0|4\.0)$/.exec(s);
  return m ? `CC-BY${m[1] ? '-SA' : ''}-${m[2]}` : null;
}
const plain = (html) => (html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

async function polite(url, init = {}) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { ...init, headers: { 'User-Agent': UA } });
    if (r.ok || i > 6 || (r.status !== 429 && r.status < 500)) return r;
    await new Promise((ok) => setTimeout(ok, 1500 * 2 ** i));
  }
}

const out = redo ? [] : have.filter((p) => picks.some((k) => k.id === p.id) && existsSync(join(root, 'public', p.file)));
/** Resizes a downloaded image into public/photos/<id>.webp. */
async function save(pick, img) {
  let s = sharp(img);
  if (pick.crop) {
    const [left, top, width, height] = pick.crop;
    s = sharp(await s.extract({ left, top, width, height }).toBuffer());
  }
  const file = `photos/${pick.id}.webp`;
  const info = await s.resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 72, effort: 6 }).toFile(join(root, 'public', file));
  return { file, width: info.width, height: info.height };
}

for (const pick of picks) {
  if (out.some((p) => p.id === pick.id)) continue;
  if (pick.url) {
    const lic = licence(pick.license);
    if (!lic) { console.error(`${pick.id}: licence "${pick.license}" not allowed`); continue; }
    const r = await polite(pick.url);
    if (!r.ok) { console.error(`${pick.id}: ${r.status} from ${pick.url}`); continue; }
    const saved = await save(pick, Buffer.from(await r.arrayBuffer()));
    out.push({ id: pick.id, about: pick.about, ...saved, author: pick.author, license: lic, sourceUrl: pick.page, source: pick.source });
    console.log(`${pick.id}: ${lic}, ${saved.width}×${saved.height} from ${pick.source}`);
    continue;
  }
  const q =new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', titles: pick.title, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: String(WIDTH) });
  const d = await (await polite(`${API}?${q}`)).json();
  const ii = d.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii) { console.error(`${pick.id}: no file ${pick.title}`); continue; }
  const m = ii.extmetadata ?? {};
  const lic = licence(m.LicenseShortName?.value);
  if (!lic) { console.error(`${pick.id}: licence "${m.LicenseShortName?.value}" not allowed`); continue; }
  const src = (ii.thumburl ?? ii.url).replace('https://thumb.wikimedia.org/', 'https://upload.wikimedia.org/');
  const saved = await save(pick, Buffer.from(await (await polite(src)).arrayBuffer()));
  out.push({
    id: pick.id, about: pick.about, ...saved,
    author: plain(m.Artist?.value) || 'Unknown', license: lic,
    sourceUrl: ii.descriptionurl, source: 'Wikimedia Commons',
  });
  console.log(`${pick.id}: ${lic}, ${saved.width}×${saved.height}`);
  await new Promise((ok) => setTimeout(ok, 600));
}
out.sort((a, b) => picks.findIndex((k) => k.id === a.id) - picks.findIndex((k) => k.id === b.id));
writeFileSync(listFile, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${out.length} photos in src/data/photos.json`);
