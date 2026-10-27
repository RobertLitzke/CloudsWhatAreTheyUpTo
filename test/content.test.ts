import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compose, genus, type Body, type Prefix } from '../src/core/clouds';
import { photoFile, problems, type Photo } from '../src/core/photos';
import { BRANCHES, FIGURE_IDS, JOURNAL, SHIFTS, TREE_LESSONS, type Block, type Forecast, type Shift } from '../src/core/shifts';
import { GLOSSARY } from '../src/core/glossary';
import { footnoteProblems } from 'lesson-kit/footnote';
import { glossaryProblems } from 'lesson-kit/glossary';
import { lessonTexts } from 'lesson-kit/lesson';
import { treeProblems } from 'lesson-kit/tree';

const blocks = (s: Shift): Block[] => s.parts.flatMap((p) => p.blocks);
import library from '../src/data/photos.json';

describe('shifts', () => {
  it('have unique ids and numbers in order', () => {
    expect(new Set(SHIFTS.map((s) => s.id)).size).toBe(SHIFTS.length);
    SHIFTS.forEach((s, i) => expect(s.n).toBe(i + 1));
  });

  it('fit the tree on the home page: every branch forks off the trunk, and every lock names a lesson', () => {
    expect(treeProblems(TREE_LESSONS, BRANCHES)).toEqual([]);
    expect(new Set(TREE_LESSONS.map((s) => s.id)).size).toBe(TREE_LESSONS.length);
    TREE_LESSONS.forEach((s, i) => expect(s.n).toBe(i + 1));
  });

  it('mark every footnote they have, and only those', () => {
    expect(SHIFTS.flatMap((s) => footnoteProblems(s.id, s.footnotes, lessonTexts(s)))).toEqual([]);
  });

  it('keep footnotes few: no more than one for every three paragraphs', () => {
    for (const s of SHIFTS) expect(Object.keys(s.footnotes ?? {}).length, s.id).toBeLessThanOrEqual(lessonTexts(s).length / 3);
  });

  it('have a glossary with every term defined, once, linked to a real lesson', () => {
    expect(glossaryProblems(GLOSSARY, SHIFTS)).toEqual([]);
    expect(GLOSSARY.length).toBeGreaterThan(80);
    for (const g of ['Cirrus', 'Dew point', 'Dry adiabatic lapse rate', 'Condensation nuclei']) expect(GLOSSARY.map((e) => e.term)).toContain(g);
  });

  it('only unlock journal entries that exist', () => {
    for (const s of SHIFTS) for (const j of s.journal) expect(JOURNAL[j], j).toBeDefined();
  });

  it('use only known figures, and end with a radio check', () => {
    for (const s of SHIFTS) {
      expect(s.parts.length, s.id).toBeGreaterThan(1);
      for (const b of blocks(s)) if (b.kind === 'figure') expect(FIGURE_IDS, b.figure).toContain(b.figure);
      const check = s.parts.at(-1)!.blocks.filter((b) => b.kind === 'figure').map((b) => (b as { figure: string }).figure);
      expect(check.length, s.id).toBeGreaterThan(0);
      expect(check.every((f) => f === 'radioCheck' || f === 'forecast'), s.id).toBe(true);
    }
  });

  it('introduce each genus once, all ten in all', () => {
    const met = SHIFTS.flatMap((s) => s.clouds);
    expect(new Set(met).size).toBe(met.length);
    expect(met.length).toBe(10);
  });

  it('give name puzzles whose clue floor matches the answer', () => {
    for (const s of SHIFTS) {
      for (const b of blocks(s)) {
        if (b.kind !== 'figure' || b.figure !== 'names') continue;
        for (const t of b.options!.targets as { clue: string; prefix: Prefix; body: Body }[]) {
          const floor = genus(compose(t.prefix, t.body)).floor;
          expect(t.clue.toLowerCase()).toContain(`${floor} floor`);
        }
      }
    }
  });

  it('ask forecasts with an answer among the options', () => {
    for (const s of SHIFTS) {
      for (const b of blocks(s)) {
        if (b.kind !== 'figure' || b.figure !== 'forecast') continue;
        for (const q of b.options!.items as Forecast[]) {
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
          expect(q.sky.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('show every pair of look-alikes in photos, in the lesson that meets the second of the two', () => {
    const photos = library as Photo[];
    const met: string[] = [];
    const shown = new Set<string>();
    for (const s of SHIFTS) {
      met.push(...s.clouds);
      for (const b of blocks(s)) {
        if (b.kind !== 'figure' || b.figure !== 'lookAlike') continue;
        const sides = b.options!.photos as { photo: string; cue: string }[];
        expect(sides.length, s.id).toBe(2);
        const pair = sides.map((side) => {
          const p = photos.find((x) => x.id === side.photo);
          expect(p, side.photo).toBeDefined();
          expect(p!.feature, side.photo).toBeUndefined();
          expect(met, `${s.id}: ${p!.genus} not met yet`).toContain(p!.genus);
          expect(side.cue.trim()).not.toBe('');
          return p!.genus;
        });
        expect(String(b.options!.tell).trim()).not.toBe('');
        shown.add(pair.sort().join('|'));
      }
      // A lesson that meets new clouds shows them in photos before its check.
      if (s.clouds.length) expect(blocks(s).some((b) => b.kind === 'figure' && b.figure === 'lookAlike'), s.id).toBe(true);
    }
    for (const g of SHIFTS.flatMap((s) => s.clouds)) for (const c of genus(g).confused) expect(shown, `${g} and ${c}`).toContain([g, c].sort().join('|'));
  });

  it('keep the shape the shift files promise', () => {
    const colours = ['ink', 'soft', 'parcel', 'env', 'dew', 'ice', 'sun', 'rain', 'warm', 'cold'];
    for (const s of SHIFTS) {
      for (const p of s.parts) {
        expect(p.title, s.id).toBeTruthy();
        for (const b of p.blocks) {
          expect(['text', 'figure', 'key'], `${s.id} ${p.title}`).toContain(b.kind);
          if (b.kind === 'key') {
            expect(b.title.trim(), `${s.id} ${p.title}`).not.toBe('');
            expect(b.points.length, `${s.id} ${p.title}`).toBeGreaterThan(0);
            for (const point of b.points) expect(point.trim()).not.toBe('');
          } else if (b.kind !== 'figure') {
            expect(b.text.trim(), `${s.id} ${p.title}`).not.toBe('');
            for (const m of b.text.matchAll(/\[\[.+?\|(\w+)\]\]/g)) expect(colours, b.text).toContain(m[1]);
          } else expect(b.caption, `${s.id} ${b.figure}`).toBeTruthy();
        }
      }
      expect(s.learned.length, s.id).toBeGreaterThan(0);
    }
  });

  it('only quiz names the player has met by then', () => {
    const met = new Set<string>();
    for (const s of SHIFTS) {
      for (const g of s.clouds) met.add(g);
      for (const b of blocks(s)) {
        if (b.kind !== 'figure' || b.figure !== 'radioCheck' || b.options?.mode !== 'name') continue;
        for (const g of b.options.pool as string[]) expect([...met], `${s.id} ${g}`).toContain(g);
      }
      for (const b of blocks(s)) {
        if (b.kind !== 'figure' || b.figure !== 'radioCheck' || b.options?.mode !== 'spot') continue;
        expect([...met], `${s.id} spot`).toContain(b.options.target);
        expect((b.options.decoys as string[]).length, s.id).toBeGreaterThan(0);
      }
    }
  });

  it('only use goals on figures that take them', () => {
    for (const s of SHIFTS) for (const b of blocks(s)) if (b.kind === 'figure' && b.goal) expect(b.task, `${s.id} ${b.figure}`).toBeTruthy();
  });
});

describe('photo library', () => {
  it('every entry is credited, licensed and unique', () => {
    const photos = library as Photo[];
    for (const p of photos) expect(problems(p), p.id).toEqual([]);
    expect(new Set(photos.map((p) => p.id)).size).toBe(photos.length);
  });

  it('has one file per id, named by it, and no file without an entry', () => {
    const files = readdirSync(resolve(__dirname, '../public/photos')).filter((f) => !f.startsWith('.')).sort();
    expect(files).toEqual((library as Photo[]).map((p) => photoFile(p).replace('photos/', '')).sort());
  });

  it('names every photo a lesson asks for by an id it has', () => {
    const ids = new Set((library as Photo[]).map((p) => p.id));
    const named = JSON.stringify(SHIFTS).match(/"photo":"[^"]*"/g) ?? [];
    expect(named.length).toBeGreaterThan(0);
    for (const m of named) expect(ids.has(m.slice(9, -1)), m).toBe(true);
  });
});
