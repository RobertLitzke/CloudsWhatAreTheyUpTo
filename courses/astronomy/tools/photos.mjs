// Fetches the course's photos from Wikimedia Commons: each pick in
// tools/photo-picks.json ({ id, title, about }) is read for its licence and
// author, refused unless the licence is public domain, CC0, CC BY or CC BY-SA,
// resized to 1024 px wide, saved as public/photos/<id>.webp, and credited in
// src/data/photos.json. Picks already saved are skipped (--all to redo them).
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
for (const pick of picks) {
  if (out.some((p) => p.id === pick.id)) continue;
  const q = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', titles: pick.title, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: String(WIDTH) });
  const d = await (await polite(`${API}?${q}`)).json();
  const ii = d.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii) { console.error(`${pick.id}: no file ${pick.title}`); continue; }
  const m = ii.extmetadata ?? {};
  const lic = licence(m.LicenseShortName?.value);
  if (!lic) { console.error(`${pick.id}: licence "${m.LicenseShortName?.value}" not allowed`); continue; }
  const src = (ii.thumburl ?? ii.url);
  const img = Buffer.from(await (await polite(src)).arrayBuffer());
  const file = `photos/${pick.id}.webp`;
  const info = await sharp(img).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 72, effort: 6 }).toFile(join(root, 'public', file));
  out.push({
    id: pick.id, about: pick.about, file, width: info.width, height: info.height,
    author: plain(m.Artist?.value) || 'Unknown', license: lic,
    sourceUrl: ii.descriptionurl, source: 'Wikimedia Commons',
  });
  console.log(`${pick.id}: ${lic}, ${info.width}×${info.height}`);
  await new Promise((ok) => setTimeout(ok, 600));
}
out.sort((a, b) => picks.findIndex((k) => k.id === a.id) - picks.findIndex((k) => k.id === b.id));
writeFileSync(listFile, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${out.length} photos in src/data/photos.json`);
