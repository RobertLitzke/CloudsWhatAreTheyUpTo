import { describe, expect, it } from 'vitest';
import type { GenusId } from '../src/core/clouds';
import { dealFloorCalls } from '../src/core/photo-call';
import type { Photo } from '../src/core/photos';
import { makeRng } from '../src/core/rng';

const photo = (id: string, genus: GenusId): Photo => ({
  id,
  genus,
  file: `photos/${id}.webp`,
  width: 1280,
  height: 853,
  author: 'A. Watcher',
  license: 'CC-BY-SA-4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
  source: 'Wikimedia Commons',
});

const POOL: GenusId[] = ['cirrus', 'altocumulus', 'stratus', 'cumulonimbus'];

describe('dealFloorCalls', () => {
  it('uses every genus before repeating one', () => {
    const calls = dealFloorCalls(POOL, [], 8, makeRng(1));
    expect(new Set(calls.slice(0, 4).map((c) => c.genus)).size).toBe(4);
    expect(new Set(calls.slice(4).map((c) => c.genus)).size).toBe(4);
  });

  it('never deals the same genus twice in a row', () => {
    for (let seed = 0; seed < 50; seed++) {
      const calls = dealFloorCalls(POOL, [], 12, makeRng(seed));
      for (let i = 1; i < calls.length; i++) expect(calls[i].genus).not.toBe(calls[i - 1].genus);
    }
  });

  it('leaves the rare clouds out of everyday checks', () => {
    const lens = { ...photo('lenticularis-01', 'altocumulus'), feature: 'lenticularis' as const };
    for (let seed = 0; seed < 20; seed++) {
      const calls = dealFloorCalls(['altocumulus'], [lens, photo('altocumulus-01', 'altocumulus')], 3, makeRng(seed));
      for (const c of calls) expect(c.photo?.id).toBe('altocumulus-01');
    }
    expect(dealFloorCalls(['altocumulus'], [lens], 1, makeRng(1))[0].photo).toBeNull();
  });

  it('answers with the genus floor', () => {
    for (const c of dealFloorCalls(POOL, [], 4, makeRng(2))) {
      expect(c.answer).toBe({ cirrus: 'high', altocumulus: 'middle', stratus: 'low', cumulonimbus: 'tower' }[c.genus as string]);
    }
  });

  it('stands a drawing in when there is no photo, and uses fresh photos first', () => {
    const lib = [photo('ci-1', 'cirrus'), photo('ci-2', 'cirrus')];
    const calls = dealFloorCalls(['cirrus', 'stratus'], lib, 4, makeRng(3));
    const ci = calls.filter((c) => c.genus === 'cirrus').map((c) => c.photo?.id);
    expect(new Set(ci).size).toBe(2);
    expect(calls.filter((c) => c.genus === 'stratus').every((c) => c.photo === null)).toBe(true);
  });

  it('deals the same calls from the same seed', () => {
    expect(dealFloorCalls(POOL, [], 8, makeRng(9))).toEqual(dealFloorCalls(POOL, [], 8, makeRng(9)));
  });
});
