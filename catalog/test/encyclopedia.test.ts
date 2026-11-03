// The site's encyclopedia (encyclopedia/ at the repository's root, read by
// Didactics' build into every course): its entries check out, every [[link]]
// in every course's lessons names an entry, and every entry is linked from
// at least one lesson, so a reader can find it.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENTRY_LINK, encyclopediaProblems, entryIndex, entryLinkProblems, readEntries, type EncyclopediaData } from 'didactics/encyclopedia';
import { readEncyclopedia } from 'didactics/vite';

const root = resolve(__dirname, '../..');
const data = readEncyclopedia(join(root, 'encyclopedia'), join(root, 'courses')) as unknown as EncyclopediaData;

/** Every string in a lesson file. */
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) for (const v of x) strings(v, out);
  else if (x && typeof x === 'object') for (const v of Object.values(x)) strings(v, out);
  return out;
}

/** Every JSON file the courses keep text in: their lessons and data. */
function courseTexts(): { label: string; texts: string[] }[] {
  const out: { label: string; texts: string[] }[] = [];
  for (const folder of readdirSync(join(root, 'courses'))) {
    for (const dir of ['src/lessons', 'src/data']) {
      const walk = (d: string) => {
        if (!existsSync(d)) return;
        for (const f of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, f.name);
          if (f.isDirectory()) walk(p);
          else if (f.name.endsWith('.json')) out.push({ label: p.slice(root.length + 1), texts: strings(JSON.parse(readFileSync(p, 'utf8'))) });
        }
      };
      walk(join(root, 'courses', folder, dir));
    }
  }
  return out;
}

describe('the encyclopedia', () => {
  const idx = entryIndex(readEntries(data));

  it('has files for the courses that have entries so far', () => {
    expect(Object.keys(data.files).sort()).toEqual(expect.arrayContaining(['encyclopedia/astronomy.json', 'encyclopedia/clouds.json', 'encyclopedia/geology.json']));
  });

  it('has no unknown links, lessons or courses, and no entry runs long', () => {
    expect(encyclopediaProblems(data)).toEqual([]);
  });

  it('is linked from the lessons only by names it has', () => {
    expect(courseTexts().flatMap((f) => entryLinkProblems(f.label, f.texts, idx))).toEqual([]);
  });

  it('links each entry from the lessons that teach it', () => {
    // An entry that names a lesson should be linked from that lesson's text, so a reader there finds it.
    const linked = new Map<string, Set<string>>();
    for (const f of courseTexts()) {
      const lesson = f.label.split('/').at(-1)!.replace(/\.json$/, '');
      for (const t of f.texts) for (const m of t.matchAll(ENTRY_LINK)) {
        const hit = m[2] ? idx.byId(m[2]) : idx.byName(m[1]);
        if (hit) linked.set(hit.id, new Set([...(linked.get(hit.id) ?? []), lesson]));
      }
    }
    const unlinked = idx.all.filter((e) => e.kind !== 'course' && !linked.has(e.id)).map((e) => e.id);
    expect(unlinked, 'entries no lesson links to').toEqual([]);
  });
});
