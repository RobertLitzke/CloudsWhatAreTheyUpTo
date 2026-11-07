// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { DEPTH, density, lakeYear, mixingMonth, seichePeriods, tempAt, windSetup } from '../src/figures/lake';
import { context, guess, click, setSlider } from './helpers';

const build = (id: string, goal?: string) => {
  let done = false;
  const h = FIGURES[id](context('metric'), goal);
  void h.done?.then(() => (done = true));
  return { node: h.node, done: async () => { await Promise.resolve(); await Promise.resolve(); return done; } };
};

describe('lake: the physics', () => {
  it('fresh water is densest near 4 °C, with the known densities', () => {
    expect(density(3.98)).toBeCloseTo(999.97, 1);
    expect(density(20)).toBeCloseTo(998.2, 1);
    expect(density(0)).toBeCloseTo(999.84, 1);
    expect(density(3)).toBeGreaterThan(density(1));
    expect(density(4)).toBeGreaterThan(density(6));
  });

  it('a degree matters about thirty times more at 21 °C than at 4 °C', () => {
    const ratio = (density(21) - density(22)) / (density(4) - density(5));
    expect(ratio).toBeGreaterThan(20);
    expect(ratio).toBeLessThan(40);
  });

  it('Lake Washington layers in spring, keeps about 7 °C at the bottom in August, and mixes in December', () => {
    const year = lakeYear(5);
    const aug = year[Math.round(7.5 / 0.02)];
    expect(tempAt(aug, DEPTH)).toBeGreaterThan(6.5);
    expect(tempAt(aug, DEPTH)).toBeLessThan(8.5);
    expect(aug.mixed).toBeGreaterThan(5);
    expect(aug.mixed).toBeLessThan(15);
    const m = mixingMonth(year);
    expect(m).toBeGreaterThan(11);
    expect(m).toBeLessThan(12);
    expect(year.find((s) => s.month > 1 && s.mixed < DEPTH)!.month).toBeLessThan(4);
  });

  it('a stronger wind mixes the lake sooner', () => {
    expect(mixingMonth(lakeYear(10))).toBeLessThan(mixingMonth(lakeYear(3)));
  });

  it('the surface seiche takes about an hour, the internal one about two days', () => {
    const p = seichePeriods();
    expect(p.surface).toBeGreaterThan(0.8);
    expect(p.surface).toBeLessThan(1.4);
    expect(p.internal).toBeGreaterThan(30);
    expect(p.internal).toBeLessThan(80);
  });

  it('the thermocline tilts hundreds of times more than the surface, and reaches the top in a strong wind', () => {
    const s = windSetup(5);
    expect(s.thermocline / s.surface).toBeGreaterThan(500);
    expect(s.surface).toBeLessThan(0.01);
    expect(windSetup(10).thermocline).toBeGreaterThan(10);
    expect(windSetup(5).thermocline).toBeLessThan(10);
  });
});

describe('lake: the figures', () => {
  it('lake-year: guess, then play to winter and the lake mixes', async () => {
    const h = build('lake-year', 'mixed');
    guess(h.node, 'Early winter, around December');
    await Promise.resolve();
    setSlider(h.node, 0, 7.5);
    expect(await h.done()).toBe(false);
    setSlider(h.node, 0, 11.9);
    expect(await h.done()).toBe(true);
  });

  it('lake-seiche: guess, then watch the thermocline swing over days', async () => {
    const h = build('lake-seiche', 'slosh');
    guess(h.node, 'Deeper downwind');
    await Promise.resolve();
    click(h.node, 'The first 4 days');
    setSlider(h.node, 1, 0.1);
    expect(await h.done()).toBe(false);
    setSlider(h.node, 1, 0.4);
    expect(await h.done()).toBe(true);
  });

  it('lake-density draws', () => {
    expect(FIGURES['lake-density'](context('metric')).node).toBeInstanceOf(HTMLElement);
  });
});
