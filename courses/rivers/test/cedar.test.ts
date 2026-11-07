// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { CITY_DRAW, GROUNDS, seepage, waterTable } from '../src/figures/cedar';
import { context, guess, setSlider } from './helpers';

describe('S1 cedar', () => {
  it('seepage follows Darcy in Dupuit form: the square of the depth, in step with the conductivity', () => {
    const k = GROUNDS[4].k;
    expect(seepage(40, k) / seepage(20, k)).toBeCloseTo(4);
    expect(seepage(30, 1e-3) / seepage(30, 1e-4)).toBeCloseTo(10);
    expect(seepage(0, k)).toBe(0);
    // q = K h² / 2L per metre of shore, times the front: 1e-3 × 1600 / 3000 × 3000.
    expect(seepage(40, 1e-3)).toBeCloseTo(1.6);
    // Clean gravel at 40 m is a fair share of the city's draw; clay is nothing.
    expect(seepage(40, 1e-3) / CITY_DRAW).toBeGreaterThan(0.2);
    expect(seepage(60, GROUNDS[0].k)).toBeLessThan(1e-5);
  });

  it('the water table falls from the reservoir to the springs', () => {
    expect(waterTable(30, 0)).toBe(30);
    expect(waterTable(30, 1)).toBe(0);
    expect(waterTable(30, 0.5)).toBeGreaterThan(15);
  });

  it('the seep figure is done once the reservoir is raised to 40 m after the guess', async () => {
    for (const units of ['metric', 'imperial'] as const) {
      const f = FIGURES['cedar-seep'](context(units), 'double');
      guess(f.node, 'About four times as much');
      setSlider(f.node, 0, 40);
      await expect(f.done).resolves.toBeUndefined();
      expect(f.node.querySelector('.fig-readout')?.textContent).toMatch(/squared/);
    }
  });
});
