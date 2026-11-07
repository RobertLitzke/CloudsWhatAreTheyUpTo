// @vitest-environment happy-dom
// C3, The bar at the mouth: swell against the ebb over the Columbia bar.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { BAR, barCurrent, barState, groupSpeed, overBar, riverPush, waveNumber } from '../src/figures/bar';
import { context, guess, setSlider } from './helpers';

describe('waves on a current', () => {
  it('gives the deep-water wavelength with no current: 1.56 T² metres', () => {
    const k = waveNumber(10, 4000, 0)!;
    expect((2 * Math.PI) / k).toBeCloseTo(1.5613 * 100, 0);
    expect(groupSpeed(k, 4000)).toBeCloseTo((9.81 * 10) / (4 * Math.PI), 1);
  });

  it('runs at √(gh) in shallow water', () => {
    const k = waveNumber(60, 5, 0)!;
    expect(((2 * Math.PI) / 60) / k).toBeCloseTo(Math.sqrt(9.81 * 5), 0);
  });

  it('shortens and grows against an opposing current, and lengthens with one', () => {
    const still = overBar(2, 10, BAR.depth, 0);
    const ebb = overBar(2, 10, BAR.depth, -2);
    const flood = overBar(2, 10, BAR.depth, 1.5);
    expect(ebb.length).toBeLessThan(still.length);
    expect(ebb.height).toBeGreaterThan(1.25 * still.height);
    expect(flood.height).toBeLessThan(still.height);
    expect(flood.length).toBeGreaterThan(still.length);
  });

  it('blocks deep-water waves at a quarter of their speed: U = -c/4', () => {
    const c = (9.81 * 8) / (2 * Math.PI);
    expect(waveNumber(8, 4000, -0.24 * c)).not.toBeNull();
    expect(waveNumber(8, 4000, -0.26 * c)).toBeNull();
  });

  it('opens the bar on the flood and shuts it on a big ebb', () => {
    expect(barState(overBar(2, BAR.period, BAR.depth, barCurrent(3.1, riverPush(7000))))).toBe('open');
    expect(barState(overBar(3, BAR.period, BAR.depth, barCurrent(9.3, riverPush(15000))))).toBe('breaking');
  });

  it('is closed with a 3 m swell on a freshet ebb', async () => {
    const h = FIGURES['bar-waves'](context(), 'closed');
    guess(h.node, 'On the ebb tide, as the river runs out');
    setSlider(h.node, 0, 9.4);
    setSlider(h.node, 1, 3);
    setSlider(h.node, 2, 15000);
    expect(h.node.textContent).toContain('closed');
    await expect(h.done).resolves.toBeUndefined();
  });
});
