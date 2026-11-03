// Lists candidate photos from Wikimedia Commons for a course to pick from.
// courses/<course>/tools/photo-search.json says where to look: categories per
// key ({ "cirrus": ["Cirrus clouds", ...] }), optional "features" (keys whose
// photos belong to another key's genus: { "mammatus": { "genus":
// "cumulonimbus", "categories": [...] } }) and "minWidth" (default 1200;
// narrower files would look soft on a phone). Only files under an accepted
// licence are kept, spread across photographers so one series does not fill
// a sheet. The result is courses/<course>/tools/candidates/index.html, a
// contact sheet: tap the photos that clearly show their subject (Commons
// categories are often wrong), then paste the JSON at the bottom into
// tools/photo-picks.json (ids follow on from the picks there) and run
// `npm run photos -- <course>`.
//
//   npm run photos:find -- <course>          PER_KEY=60 to see more or fewer per key

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { categoryFiles, fileInfo } from './lib/commons.mjs';
import { courseArg, readJson } from './lib/course.mjs';

const { name, dir, userAgent } = courseArg('usage: npm run photos:find -- <course>');
const search = readJson(join(dir, 'tools/photo-search.json'), null);
if (!search) {
  console.error(`${name} has no tools/photo-search.json: write one ({ categories, features?, minWidth? }) to search Commons for it`);
  process.exit(1);
}
const outDir = join(dir, 'tools/candidates');
const PER_KEY = Number(process.env.PER_KEY ?? 60);
const minWidth = search.minWidth ?? 1200;
const picks = readJson(join(dir, 'tools/photo-picks.json'), []);

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * Categories list files alphabetically, so one keen photographer's series can
 * fill a whole sheet. Take every author's first photo, then every author's
 * second, and so on.
 */
function spreadByAuthor(files) {
  const byAuthor = new Map();
  for (const f of files) byAuthor.set(f.author, [...(byAuthor.get(f.author) ?? []), f]);
  const out = [];
  for (let round = 0; out.length < files.length; round++) for (const list of byAuthor.values()) if (list[round]) out.push(list[round]);
  return out;
}

const features = search.features ?? {};
const searches = { ...search.categories, ...Object.fromEntries(Object.entries(features).map(([k, f]) => [k, f.categories])) };
const found = {};
for (const [key, cats] of Object.entries(searches)) {
  const titles = new Set();
  for (const cat of cats) {
    try {
      for (const t of await categoryFiles(cat, userAgent, 500)) titles.add(t);
    } catch (e) {
      console.warn(`  ${cat}: ${e.message}`);
    }
  }
  const images = [...titles].filter((t) => /\.(jpe?g|png|webp|tiff?)$/i.test(t));
  const infos = (await fileInfo(images, 400, userAgent)).filter((f) => f.license && f.width >= minWidth);
  found[key] = spreadByAuthor(infos).slice(0, PER_KEY);
  console.log(`${key}: ${images.length} files, ${infos.length} usable, kept ${found[key].length}`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'candidates.json'), JSON.stringify(found, null, 2));

/** The next free number for ids like "<key>-07", following the picks already made. */
const next = {};
for (const p of picks) {
  const m = /^(.*)-(\d+)$/.exec(p.id);
  if (m) next[m[1]] = Math.max(next[m[1]] ?? 0, Number(m[2]));
}
const sections = Object.entries(found)
  .map(([key, files]) => `<h2>${esc(key)}</h2><div class="grid">${files
    .map((f) => `<label><input type="checkbox" data-key="${esc(key)}" value="${esc(f.title)}"><img loading="lazy" src="${esc(f.thumbUrl)}"><span>${esc(f.author)} · ${esc(f.licenseName)} · <a href="${esc(f.pageUrl)}" target="_blank">page</a></span></label>`)
    .join('')}</div>`)
  .join('');
writeFileSync(
  join(outDir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>${esc(name)} photo candidates</title>
<style>body{font:14px system-ui;margin:16px;background:#222;color:#eee}h2{text-transform:capitalize}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
label{background:#333;padding:4px;border-radius:6px;cursor:pointer}label:has(input:checked){outline:3px solid #ffb347}input{display:none}img{width:100%;aspect-ratio:3/2;object-fit:cover;display:block}span{font-size:11px;color:#aaa}a{color:#ffb347}
textarea{position:sticky;bottom:0;width:100%;height:120px;background:#111;color:#ffb347;font:12px monospace}</style>
<p>Pick the photos that clearly show their subject, then add the JSON below to tools/photo-picks.json.</p>
${sections}<textarea readonly></textarea>
<script>const next=${JSON.stringify(next)};const features=${JSON.stringify(Object.fromEntries(Object.entries(features).map(([k, f]) => [k, f.genus])))};const ta=document.querySelector('textarea');
const paint=()=>{const n={...next};const o=[];for(const c of document.querySelectorAll('input:checked')){const k=c.dataset.key;n[k]=(n[k]??0)+1;const id=k+'-'+String(n[k]).padStart(2,'0');o.push(features[k]?{id,title:c.value,genus:features[k],feature:k}:{id,title:c.value,${search.field ? `${JSON.stringify(search.field)}:k` : 'about:""'}})}ta.value=JSON.stringify(o,null,2)};document.addEventListener('change',paint);paint();</script>`,
);
console.log(`\nOpen ${relative(process.cwd(), join(outDir, 'index.html'))} to pick.`);
