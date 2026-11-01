// @vitest-environment happy-dom
// The figures that are also flash cards (Didactics figure cards): which they
// are, and that each builds as a card from any seed.

import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { figureCardBlocks, figureCardProblems } from 'didactics/review';
import { FIGURES } from '../src/figures';
import { LESSONS } from '../src/lessons';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

describe('figure cards', () => {
  it('are the chosen figures', () => {
    expect(LESSONS.flatMap((l) => figureCardBlocks(l, FIGURES).map((b) => b.figure)).sort()).toEqual(['dune', 'drill', 'vees'].sort());
  });

  it('build as cards from any seed', () => {
    expect(figureCardProblems(LESSONS, FIGURES, emptyProgress('metric'), [1, 2, 3, 4, 5, 6, 7, 8])).toEqual([]);
  });
});
