// @vitest-environment happy-dom
// C2, The town behind the embankment: levees that confine a flood raise it.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { CHANNEL, FLOOD_1948, carries, leveeFlood, stageFor } from '../src/figures/vanport';
import { context, guess, setSlider } from './helpers';

describe('the levee model', () => {
  it('fills the channel to the brim at a few thousand m³/s', () => {
    const brim = carries(0, CHANNEL.open);
    expect(brim).toBeGreaterThan(4000);
    expect(brim).toBeLessThan(10000);
  });

  it('finds the stage that carries a flow', () => {
    for (const q of [5000, 15000, 30000]) expect(carries(stageFor(q, 1000), 1000)).toBeCloseTo(q, 0);
  });

  it('raises the 1948 flood as the levees close in', () => {
    const wide = stageFor(FLOOD_1948, 2000);
    const tight = stageFor(FLOOD_1948, 100);
    const open = stageFor(FLOOD_1948, CHANNEL.open);
    expect(open).toBeLessThan(wide);
    expect(tight - wide).toBeGreaterThan(3);
    expect(open).toBeGreaterThan(3);
  });

  it('overtops levees that are too low', () => {
    expect(leveeFlood(FLOOD_1948, 100, 10).overtopped).toBe(true);
    expect(leveeFlood(FLOOD_1948, 2000, 10).overtopped).toBe(false);
    expect(leveeFlood(FLOOD_1948, 2000, 0).stage).toBeCloseTo(stageFor(FLOOD_1948, CHANNEL.open));
  });

  it('is squeezed once the 1948 flood meets levees near and far', async () => {
    const h = FIGURES['vanport-levee'](context(), 'squeeze');
    guess(h.node, 'Beside the bank');
    setSlider(h.node, 0, 29000);
    setSlider(h.node, 1, 2000);
    setSlider(h.node, 1, 100);
    expect(h.node.textContent).toContain('pours over');
    await expect(h.done).resolves.toBeUndefined();
  });
});
