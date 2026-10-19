import { describe, expect, it } from 'vitest';
import { compose, genus } from '../src/core/clouds';
import { problems, type Photo } from '../src/core/photos';
import { JOURNAL, SHIFTS } from '../src/core/shifts';
import library from '../src/data/photos.json';

describe('shifts', () => {
  it('have unique ids and numbers in order', () => {
    expect(new Set(SHIFTS.map((s) => s.id)).size).toBe(SHIFTS.length);
    SHIFTS.forEach((s, i) => expect(s.n).toBe(i + 1));
  });

  it('only unlock journal entries that exist', () => {
    for (const s of SHIFTS) for (const j of s.journal) expect(JOURNAL[j], j).toBeDefined();
  });

  it('end with a log step', () => {
    for (const s of SHIFTS) expect(s.steps.at(-1)?.kind).toBe('log');
  });

  it('give name puzzles whose clue floor matches the answer', () => {
    for (const s of SHIFTS) {
      for (const step of s.steps) {
        if (step.kind !== 'names') continue;
        for (const t of step.targets) {
          const floor = genus(compose(t.prefix, t.body)).floor;
          expect(t.clue.toLowerCase()).toContain(`${floor} floor`);
        }
      }
    }
  });
});

describe('photo library', () => {
  it('every entry is credited, licensed and unique', () => {
    const photos = library as Photo[];
    for (const p of photos) expect(problems(p), p.id).toEqual([]);
    expect(new Set(photos.map((p) => p.id)).size).toBe(photos.length);
  });
});
