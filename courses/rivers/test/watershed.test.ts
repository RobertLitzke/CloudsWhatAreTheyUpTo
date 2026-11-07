// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { fallsOnCedar, monthFlow, seattleShare, waterYear } from '../src/figures/watershed';
import { blockOptions, click, context, guess, setSlider } from './helpers';

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

describe('lesson 1, watershed', () => {
  it('the estimate: about 0.9 km³ falls on the Cedar, and Seattle drinks about an eighth', () => {
    expect(fallsOnCedar()).toBeCloseTo(0.89, 1);
    expect(seattleShare()).toBeGreaterThan(1 / 10);
    expect(seattleShare()).toBeLessThan(1 / 7);
  });

  it('a year balances: what falls goes to the air or down the river, a fifth or so to the air', () => {
    for (const warm of [false, true]) {
      const y = waterYear(warm);
      const fell = sum(y.map((w) => w.rain + w.snowfall));
      const out = sum(y.map((w) => w.air + w.river));
      expect(fell).toBeCloseTo(2400, -1);
      expect(Math.abs(fell - out - y[51].snow - (y[51].ground - 70))).toBeLessThan(1);
      expect(y[51].snow).toBeLessThan(1);
      const air = sum(y.map((w) => w.air)) / fell;
      expect(air).toBeGreaterThan(0.12);
      expect(air).toBeLessThan(0.25);
    }
  });

  it('a warm winter keeps less snow, sends more water down in winter and leaves June low', () => {
    const cold = waterYear(false);
    const warm = waterYear(true);
    const peak = (y: typeof cold) => Math.max(...y.map((w) => w.snow));
    expect(peak(warm)).toBeLessThan(peak(cold) / 3);
    expect(monthFlow(warm, 3)).toBeGreaterThan(monthFlow(cold, 3) * 1.4); // January
    expect(monthFlow(warm, 8)).toBeLessThan(monthFlow(cold, 8) * 0.7); // June
    // In an ordinary year the snow peaks in spring.
    const top = cold.findIndex((w) => w.snow === peak(cold));
    expect(cold[top].month).toBeGreaterThanOrEqual(5);
  });

  it('the water year is done once a warm winter is played into July', () => {
    const h = FIGURES['watershed-year'](context(), 'warm');
    let done = false;
    void h.done!.then(() => (done = true));
    guess(h.node, 'Less water than usual');
    click(h.node, 'Warm winter, like 2015');
    setSlider(h.node, 0, 44);
    return Promise.resolve().then(() => expect(done).toBe(true));
  });

  it('the map has the passes and a ringed place for each', () => {
    const o = blockOptions('map-live', 'watershed') as { spots: { name: string }[] };
    expect(o.spots.map((s) => s.name)).toContain('Snoqualmie Pass');
  });
});
