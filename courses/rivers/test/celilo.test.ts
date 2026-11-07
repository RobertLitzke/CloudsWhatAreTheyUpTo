// @vitest-environment happy-dom
// C1, The falls that went under: the stair of reservoirs, and storage
// flattening the year at The Dalles.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { BORDER, CELILO, DAMS, damsBy, freeKm, natural, naturalYear, regulate, surface, TODAY, yearVolume } from '../src/figures/celilo';
import { context, guess, setSlider } from './helpers';

describe('the stair of reservoirs', () => {
  it('each dam’s tailwater is the pool of the dam below', () => {
    for (let i = 1; i < DAMS.length; i++) {
      const below = [...DAMS].filter((d) => d.km < DAMS[i].km).sort((a, b) => b.km - a.km)[0];
      expect(DAMS[i].tail).toBeGreaterThanOrEqual(below.pool);
    }
  });

  it('the river rises all the way to Canada, and Celilo is a step', () => {
    for (let km = 0; km < BORDER; km += 10) expect(natural(km + 10)).toBeGreaterThanOrEqual(natural(km));
    expect(natural(CELILO.km + 1) - natural(CELILO.km - 1)).toBeGreaterThan(5);
  });

  it('Celilo goes under in 1957 and not before', () => {
    expect(surface(CELILO.km, 1956)).toBeCloseTo(natural(CELILO.km));
    expect(surface(CELILO.km, 1957)).toBe(49);
  });

  it('leaves only the Hanford Reach free above the tide', () => {
    expect(freeKm(1930)).toBe(BORDER - DAMS[0].km);
    const today = freeKm(1975);
    expect(today).toBeGreaterThan(60);
    expect(today).toBeLessThan(96); // under a tenth of the 964 km
    expect(damsBy(1975)).toHaveLength(DAMS.length);
  });

  it('reaches its end once the guess is in and the years are played', async () => {
    const h = FIGURES['celilo-stair'](context(), 'end');
    guess(h.node, 'Less than a tenth');
    setSlider(h.node, 0, 1975);
    expect(h.node.textContent).toContain('still run free');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('storage and the year', () => {
  const year = naturalYear();

  it('carries about 160 km³ a year, a mean near 5,100 m³/s', () => {
    expect(yearVolume(year)).toBeGreaterThan(150);
    expect(yearVolume(year)).toBeLessThan(170);
  });

  it('cuts the June peak and lifts the winter by the same volume', () => {
    const r = regulate(year, TODAY);
    expect(r.moved).toBeCloseTo(TODAY, 5);
    expect(Math.max(...r.flows)).toBeLessThan(0.7 * Math.max(...year));
    expect(Math.max(...r.flows)).toBeGreaterThan(0.5 * Math.max(...year));
    expect(Math.min(...r.flows)).toBeGreaterThan(Math.min(...year) + 1000);
    expect(yearVolume(r.flows)).toBeCloseTo(yearVolume(year), 3);
  });

  it('does nothing with no storage', () => {
    expect(regulate(year, 0).flows).toEqual(year);
  });

  it('reaches today once the storage is up', async () => {
    const h = FIGURES['celilo-dams'](context(), 'today');
    guess(h.node, 'Winter');
    setSlider(h.node, 0, 20);
    expect(h.node.textContent).toContain('ordinary year');
    await expect(h.done).resolves.toBeUndefined();
  });

});
