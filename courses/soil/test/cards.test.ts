// @vitest-environment happy-dom
// The figures that are also flash cards (Didactics figure cards): which they
// are, and that each builds as a card from any seed.

import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { figureCardBlocks, figureCardProblems } from 'didactics/review';
import { FIGURES } from '../src/app/figures';
import { LESSONS } from '../src/core/lessons';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

describe('figure cards', () => {
  it('are the chosen figures', () => {
    expect(LESSONS.flatMap((l) => figureCardBlocks(l, FIGURES).map((b) => b.figure)).sort()).toEqual(['pot'].sort());
  });

  it('build as cards from any seed', () => {
    expect(figureCardProblems(LESSONS, FIGURES, emptyProgress('metric'), [1, 2, 3, 4, 5, 6, 7, 8])).toEqual([]);
  });
});

describe('the pot card', () => {
  it('always has gravel leave less air, in every mix and pot it can start with', async () => {
    const { drained, MIX_IDS } = await import('../src/core/pots');
    for (const id of MIX_IDS) for (const h of [25, 30, 35, 40]) expect(drained(id, h, 5).air, `${id} ${h}`).toBeLessThan(drained(id, h, 0).air - 0.01);
  });
});
