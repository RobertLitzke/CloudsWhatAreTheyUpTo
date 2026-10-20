import { describe, expect, it } from 'vitest';
import { compose, genus, type Body, type Prefix } from '../src/core/clouds';
import { problems, type Photo } from '../src/core/photos';
import { FIGURE_IDS, JOURNAL, SHIFTS, type Block, type Forecast, type Shift } from '../src/core/shifts';

const blocks = (s: Shift): Block[] => s.parts.flatMap((p) => p.blocks);
import library from '../src/data/photos.json';

describe('shifts', () => {
  it('have unique ids and numbers in order', () => {
    expect(new Set(SHIFTS.map((s) => s.id)).size).toBe(SHIFTS.length);
    SHIFTS.forEach((s, i) => expect(s.n).toBe(i + 1));
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
});
