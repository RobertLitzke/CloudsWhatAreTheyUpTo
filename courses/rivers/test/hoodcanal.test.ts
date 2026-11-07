// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { HYPOXIC, O_IN, bedDepth, oxygenAt, oxygenLeft, PLACES, residenceDays, southSurface, underLid } from '../src/figures/hoodcanal';
import { click, context, guess, setSlider } from './helpers';

describe('lesson 13, Hood Canal', () => {
  it('residence time is volume over exchange', () => {
    // The lesson's estimate: 20 km³ at 2,000 m³/s is about four months.
    expect(residenceDays(20, 2000)).toBeGreaterThan(110);
    expect(residenceDays(20, 2000)).toBeLessThan(120);
    expect(oxygenLeft(O_IN, 0.03, 30)).toBeGreaterThan(5);
    expect(oxygenLeft(O_IN, 0.03, 200)).toBeLessThan(HYPOXIC);
  });

  it('the profile has a shallow sill and a deep basin', () => {
    expect(bedDepth(PLACES.sill)).toBe(50);
    expect(bedDepth(0.5)).toBe(180);
    expect(bedDepth(1)).toBeLessThan(30);
  });

  it('deep water loses oxygen through summer and the inflow renews the floor', () => {
    expect(oxygenAt(PLACES.hoodsport, 130, 8, true, false)).toBeGreaterThan(5);
    expect(oxygenAt(PLACES.hoodsport, 130, 30, true, false)).toBeLessThan(3);
    expect(oxygenAt(PLACES.hoodsport, 130, 40, true, false)).toBeGreaterThan(5);
    expect(oxygenAt(PLACES.hoodsport, 130, 46, false, false)).toBeLessThan(1);
  });

  it('a kill needs both the lift and the wind', () => {
    expect(southSurface(37, true, true)).toBeLessThan(HYPOXIC);
    expect(southSurface(37, false, true)).toBeGreaterThan(HYPOXIC);
    expect(southSurface(37, true, false)).toBeGreaterThan(8);
    expect(underLid(37, true)).toBeLessThan(underLid(37, false) - 1.5);
    expect(southSurface(20, true, true)).toBeGreaterThan(8);
  });

  it('the flushing figure reaches hypoxia when the exchange slows', async () => {
    const f = FIGURES['hoodcanal-flush'](context(), 'hypoxic');
    setSlider(f.node, 0, 0);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the year figure reaches a kill with the inflow and a south wind', async () => {
    const f = FIGURES['hoodcanal-year'](context(), 'kill');
    guess(f.node, 'Hurts: it lifts the old water');
    click(f.node, 'South wind');
    setSlider(f.node, 0, 37);
    await expect(f.done).resolves.toBeUndefined();
  });
});
