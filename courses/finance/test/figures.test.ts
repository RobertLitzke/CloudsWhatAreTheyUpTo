// @vitest-environment happy-dom
// Every figure the lessons name builds, and the ones with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { context, guess, setSlider } from './helpers';

describe('figures', () => {
  it('all build', () => {
    for (const l of WRITTEN) for (const p of l.parts) for (const b of p.blocks) {
      if (!isDiagram(b)) continue;
      const handle = FIGURES[b.id](context(), b.goal, b.options);
      expect(handle.node, `${l.id}: ${b.id}`).toBeInstanceOf(HTMLElement);
    }
  });

  it('lesson 1: the income cancels, and the savings rate moves the date', async () => {
    const inc = FIGURES.income(context(), 'income');
    setSlider(inc.node, 0, 200_000);
    await expect(inc.done).resolves.toBeUndefined();
    expect(inc.node.textContent).toContain('only the share saved changes the date');
    const yrs = FIGURES.years(context(), 'sooner');
    guess(yrs.node, 'About four years');
    setSlider(yrs.node, 1, 0.06);
    await expect(yrs.done).resolves.toBeUndefined();
    expect(yrs.node.textContent).toMatch(/from 50% to 60% saves 3\.\d/);
  });
});
