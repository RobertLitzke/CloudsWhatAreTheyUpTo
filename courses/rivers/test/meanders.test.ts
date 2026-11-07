// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { history, sinuosity, BANKS, visibleOxbows } from '../src/figures/meanders';
describe('explore', () => {
  it('runs', () => {
    for (const b of [0, 1]) {
      const h = history(b);
      const first = h.findIndex((c) => visibleOxbows(c, h.indexOf(c)).length > 0);
      console.log(BANKS[b].name, 'first', first, first > 0 ? sinuosity(h[first - 1]).toFixed(2) : '', sinuosity(h[400]).toFixed(2));
    }
    expect(1).toBe(1);
  });
});
