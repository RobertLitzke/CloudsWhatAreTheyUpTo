import { describe, expect, it } from 'vitest';
import { buildDeck } from '../src/core/quiz';
import { makeRng } from 'didactics/rng';
import { migrate } from '../src/core/save';
import library from '../src/data/photos.json';
import type { Photo } from '../src/core/photos';
import { LESSONS } from '../src/core/lessons';

const deck = buildDeck(library as Photo[], makeRng(1));

describe('quiz deck', () => {
  it('has unique ids and well-formed cards', () => {
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
    for (const c of deck) {
      expect(c.question.trim(), c.id).not.toBe('');
      expect(c.why.trim(), c.id).not.toBe('');
      expect(c.options.length, c.id).toBeGreaterThanOrEqual(2);
      expect(new Set(c.options).size, c.id).toBe(c.options.length);
    }
  });

  it('holds back cards only for lessons that exist', () => {
    const ids = new Set(LESSONS.map((s) => s.id));
    for (const c of deck) if (c.after) expect(ids.has(c.after), c.id).toBe(true);
  });

  it('has a card for every photo', () => {
    expect(deck.filter((c) => c.kind === 'photo').length).toBe((library as Photo[]).length);
  });
});

describe('scheduling', () => {
  it('keeps quiz progress in the save', () => {
    expect(migrate({ quiz: { a: { box: 2, due: 5 }, b: 'x', c: { box: 1, due: 'no' } } }).quiz).toEqual({ a: { box: 2, due: 5 } });
  });
});
