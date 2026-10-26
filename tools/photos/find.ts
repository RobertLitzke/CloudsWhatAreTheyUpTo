// npm run photos:find
//
// Lists candidate photos for every subject from Wikimedia Commons, keeping only
// files under a licence the app accepts and wide enough to use, and writes
// tools/photos/candidates/index.html: a contact sheet to pick from. Tap the
// photos that clearly show their subject (Commons categories are often wrong),
// then copy the JSON at the bottom into tools/photos/picks.json and run
// npm run photos:fetch.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { categoryFiles, fileInfo, type FileInfo } from './commons.ts';
import { CATEGORIES, MIN_WIDTH } from './config.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'candidates');
const PER_SUBJECT = Number(process.env.PER_SUBJECT ?? 60);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Categories list files alphabetically, so one keen photographer's series can
 * fill a whole sheet. Take every author's first photo, then every author's
 * second, and so on.
 */
function spreadByAuthor(files: FileInfo[]): FileInfo[] {
  const byAuthor = new Map<string, FileInfo[]>();
  for (const f of files) byAuthor.set(f.author, [...(byAuthor.get(f.author) ?? []), f]);
  const out: FileInfo[] = [];
  for (let round = 0; out.length < files.length; round++) for (const list of byAuthor.values()) if (list[round]) out.push(list[round]);
  return out;
}

const found: Record<string, FileInfo[]> = {};
for (const [subject, cats] of Object.entries(CATEGORIES)) {
  const titles = new Set<string>();
  for (const cat of cats) {
    try {
      for (const t of await categoryFiles(cat, 500)) titles.add(t);
    } catch (e) {
      console.warn(`  ${cat}: ${(e as Error).message}`);
    }
  }
  const images = [...titles].filter((t) => /\.(jpe?g|png|webp|tiff?)$/i.test(t));
  const infos = (await fileInfo(images, 400)).filter((f) => f.license && f.width >= MIN_WIDTH);
  found[subject] = spreadByAuthor(infos).slice(0, PER_SUBJECT);
  console.log(`${subject}: ${images.length} files, ${infos.length} usable, kept ${found[subject].length}`);
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'candidates.json'), JSON.stringify(found, null, 2));

const sections = Object.entries(found)
  .map(
    ([subject, files]) => `<h2>${subject}</h2><div class="grid">${files
      .map(
        (f) => `<label><input type="checkbox" data-subject="${subject}" value="${esc(f.title)}"><img loading="lazy" src="${esc(f.thumbUrl)}"><span>${esc(f.author)} · ${esc(f.licenseName)} · <a href="${esc(f.pageUrl)}" target="_blank">page</a></span></label>`,
      )
      .join('')}</div>`,
  )
  .join('');

await writeFile(
  path.join(outDir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Soil photo candidates</title>
<style>body{font:14px system-ui;margin:16px;background:#222;color:#eee}h2{text-transform:capitalize}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
label{background:#333;padding:4px;border-radius:6px;cursor:pointer}label:has(input:checked){outline:3px solid #ffb347}input{display:none}img{width:100%;aspect-ratio:3/2;object-fit:cover;display:block}span{font-size:11px;color:#aaa}a{color:#ffb347}
textarea{position:sticky;bottom:0;width:100%;height:120px;background:#111;color:#ffb347;font:12px monospace}</style>
<p>Pick the photos that clearly show their subject, then copy the JSON below into tools/photos/picks.json.</p>
${sections}<textarea readonly></textarea>
<script>const ta=document.querySelector('textarea');const paint=()=>{const o={};for(const c of document.querySelectorAll('input:checked'))(o[c.dataset.subject]??=[]).push(c.value);ta.value=JSON.stringify(o,null,2)};document.addEventListener('change',paint);paint();</script>`,
);
console.log(`\nOpen ${path.relative(process.cwd(), path.join(outDir, 'index.html'))} to pick.`);
