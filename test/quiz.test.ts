import { describe, expect, it } from 'vitest';
import { buildDeck, deal, GAPS_DAYS, review, tally } from '../src/core/quiz';
import { makeRng } from 'lesson-kit/rng';
import { migrate } from '../src/core/save';
import library from '../src/data/photos.json';
import type { Photo } from '../src/core/photos';

const deck = buildDeck(library as Photo[], makeRng(1));
const DAY = 86400000;

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

  it('has a card for every photo', () => {
    expect(deck.filter((c) => c.kind === 'photo').length).toBe((library as Photo[]).length);
  });
});

describe('scheduling', () => {
  it('spaces right answers further apart and starts a miss over', () => {
    let s = review(undefined, true, 0);
    expect(s).toEqual({ box: 1, due: GAPS_DAYS[1] * DAY });
    s = review(s, true, 0);
    expect(s.box).toBe(2);
    expect(review(s, false, 5)).toEqual({ box: 0, due: 5 });
  });

  it('deals due cards first, then a few new ones', () => {
    const states = { [deck[0].id]: { box: 2, due: 0 }, [deck[1].id]: { box: 2, due: 10 * DAY } };
    const hand = deal(deck, states, DAY, 15, 3, makeRng(2));
    expect(hand.map((c) => c.id)).toContain(deck[0].id);
    expect(hand.map((c) => c.id)).not.toContain(deck[1].id);
    expect(hand.length).toBe(4);
    const t = tally(deck, states, DAY);
    expect(t.due).toBe(1);
    expect(t.fresh).toBe(deck.length - 2);
  });

  it('keeps quiz progress in the save', () => {
    expect(migrate({ quiz: { a: { box: 2, due: 5 }, b: 'x', c: { box: 1, due: 'no' } } }).quiz).toEqual({ a: { box: 2, due: 5 } });
  });
});
