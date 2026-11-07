// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { LAKE, lakeLevel, outflows } from '../src/figures/lowering';
import { context, guess, setSlider } from './helpers';

describe('S2 lowering', () => {
  it('before the cut, the lake spills its late-summer inflow over the Black River', () => {
    expect(outflows(LAKE.before, LAKE.union, false).black).toBeCloseTo(LAKE.inflow);
    expect(outflows(LAKE.sill - 0.1).black).toBe(0);
  });

  it('after the cut the lake falls about 2.7 m in a couple of months and settles near Lake Union', () => {
    expect(lakeLevel(0)).toBe(LAKE.before);
    const fell = LAKE.before - lakeLevel(70);
    expect(fell).toBeGreaterThan(2.2);
    expect(fell).toBeLessThan(2.8);
    expect(lakeLevel(120) - LAKE.union).toBeLessThan(0.15);
    // The Black River stops within a few weeks.
    expect(outflows(lakeLevel(20)).black).toBe(0);
  });

  it('if the locks held Lake Union above the old lip, the Black River would keep running', () => {
    expect(outflows(lakeLevel(120, 8.8), 8.8).black).toBeGreaterThan(1);
  });

  it('the outlet figure is done when the Black River has stopped', async () => {
    for (const units of ['metric', 'imperial'] as const) {
      const f = FIGURES['lowering-outlet'](context(units), 'dry');
      guess(f.node, 'It stops running altogether');
      setSlider(f.node, 0, 60);
      await expect(f.done).resolves.toBeUndefined();
    }
  });

  it('the locks still builds', () => {
    expect(FIGURES['lowering-locks'](context()).node).toBeInstanceOf(HTMLElement);
  });
});
