// @vitest-environment happy-dom
// The figures that are also flash cards (Didactics figure cards): which they
// are, and that each builds as a card from any seed.

import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { figureCardBlocks, figureCardProblems } from 'didactics/review';
import { FIGURES } from '../src/app/figures';
import { SHIFTS } from '../src/core/shifts';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

describe('figure cards', () => {
  it('are the chosen figures', () => {
    expect(SHIFTS.flatMap((l) => figureCardBlocks(l, FIGURES).map((b) => b.figure)).sort()).toEqual(['parcel', 'front', 'billow', 'windBalance', 'stormSorter'].sort());
  });

  it('build as cards from any seed', () => {
    expect(figureCardProblems(SHIFTS, FIGURES, emptyProgress('metric'), [1, 2, 3, 4, 5, 6, 7, 8])).toEqual([]);
  });
});

describe('a guess in a lesson', () => {
  it('is marked right or wrong once the figure shows the answer', async () => {
    const { testContext } = await import('didactics/figure');
    const ctx = testContext(emptyProgress('metric'));
    const node = FIGURES.storm(ctx, 'end').node;
    node.querySelector<HTMLButtonElement>('.fig-choices .chip')!.click();
    [...node.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Run the storm')!.click();
    const time = node.querySelector<HTMLInputElement>('input[type=range]')!;
    time.value = '55';
    time.dispatchEvent(new Event('input', { bubbles: true }));
    expect(node.querySelector('.chip.wrong')).not.toBeNull();
    expect(node.querySelector('.chip.answer')).not.toBeNull();
    expect(node.querySelector('.fig-verdict.wrong')).not.toBeNull();
    ctx.close();
  });
});
