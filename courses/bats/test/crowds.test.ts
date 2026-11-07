// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { byMovingListener, compensatedCall, density, echoPitch, emerged, fromMovingSource, inFovea, overlap } from '../src/figures/crowds';
import { click, context, guess, setSlider } from './helpers';

describe('lesson 5, twenty million voices', () => {
  it('shifts pitch for a moving source, a moving listener, and twice for an echo', () => {
    expect(fromMovingSource(40000, 0)).toBe(40000);
    expect(fromMovingSource(40000, 34.3)).toBeCloseTo(40000 / 0.9, 3);
    expect(byMovingListener(40000, 34.3)).toBeCloseTo(44000, 3);
    // About 2.4 kHz at 5 m/s and 83 kHz.
    expect(echoPitch(83000, 5) - 83000).toBeGreaterThan(2350);
    expect(echoPitch(83000, 5) - 83000).toBeLessThan(2500);
  });

  it('brings the echo back into the fovea when the call is lowered', () => {
    expect(inFovea(echoPitch(83000, 5))).toBe(false);
    expect(echoPitch(compensatedCall(83000, 5), 5)).toBeCloseTo(83000, 3);
    expect(83000 - compensatedCall(83000, 5)).toBeGreaterThan(2300);
  });

  it('jams only when the calls share a band', () => {
    expect(overlap(26000, 26000)).toBe(1);
    expect(overlap(26000, 27000)).toBe(0.5);
    expect(overlap(26000, 29000)).toBe(0);
  });

  it('empties the cave in two and a half hours and spreads the bats outward', () => {
    expect(emerged(0)).toBe(0);
    expect(emerged(75)).toBeCloseTo(0.5, 5);
    expect(emerged(150)).toBe(1);
    expect(density(40, 60)).toBe(0);
    expect(density(40, 200)).toBeGreaterThan(0);
  });

  it('reaches its goals', async () => {
    const r = FIGURES['crowds-radar'](context(), 'end');
    setSlider(r.node, 0, 240);
    await expect(r.done).resolves.toBeUndefined();

    const w = FIGURES['crowds-waves'](context(), 'all');
    click(w.node, 'Moving listener');
    click(w.node, 'Echo from a wall');
    await expect(w.done).resolves.toBeUndefined();

    const c = FIGURES['crowds-compensation'](context(), 'fovea');
    guess(c.node, 'About 85.4 kHz');
    setSlider(c.node, 0, 5);
    click(c.node, 'Lower the call');
    await expect(c.done).resolves.toBeUndefined();

    const j = FIGURES['crowds-jam'](context(), 'clear');
    setSlider(j.node, 0, 30000);
    await expect(j.done).resolves.toBeUndefined();
  });
});
