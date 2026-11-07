// @vitest-environment happy-dom
// Lesson 3's figures: Darcy's column and the valley with a well, and the
// maths behind them.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { darcyFlow, DARCY_AREA, exchange, flowWords, GRAINS, reachInflow, slopeAtCreek } from '../src/figures/baseflow';
import { context, guess, setSlider } from './helpers';

const build = (id: string, goal?: string) => {
  let done = false;
  const h = FIGURES[id](context(), goal);
  void h.done?.then(() => (done = true));
  return { node: h.node, done: async () => { await Promise.resolve(); await Promise.resolve(); return done; } };
};

describe("Darcy's law", () => {
  it('flow is proportional to the drop and inversely to the thickness', () => {
    const K = 1e-4;
    expect(darcyFlow(K, 2)).toBeCloseTo(2 * darcyFlow(K, 1), 12);
    expect(darcyFlow(K, 1, 2)).toBeCloseTo(darcyFlow(K, 1) / 2, 12);
    expect(DARCY_AREA).toBeCloseTo(0.096, 3);
  });

  it('spans gravel to clay by ten million', () => {
    expect(GRAINS[4].K / GRAINS[0].K).toBe(1e7);
  });

  it('says flows in sensible units', () => {
    expect(flowWords(darcyFlow(1e-3, 1))).toMatch(/litres a minute/);
    expect(flowWords(darcyFlow(1e-5, 1))).toMatch(/litres a day/);
    expect(flowWords(darcyFlow(1e-9, 1))).toMatch(/millilitres a day/);
  });
});

describe('the creek and the well', () => {
  it('baseflow falls through a dry summer, to about 20 L/s by week 10', () => {
    expect(reachInflow(0)).toBe(60);
    expect(reachInflow(10)).toBeGreaterThan(18);
    expect(reachInflow(10)).toBeLessThan(22);
  });

  it('turns from gaining to losing when pumping passes the inflow, and the slope at the bank agrees', () => {
    const B = reachInflow(10);
    expect(exchange(10, B - 1)).toBeGreaterThan(0);
    expect(exchange(10, B + 1)).toBeLessThan(0);
    expect(slopeAtCreek(10, B - 1)).toBeGreaterThan(0);
    expect(slopeAtCreek(10, B + 1)).toBeLessThan(0);
    expect(slopeAtCreek(0, 15)).toBeGreaterThan(0);
    expect(slopeAtCreek(14, 15)).toBeLessThan(0);
  });
});

describe('the figures reach their goals', () => {
  it('baseflow-darcy: guess, then double the drop', async () => {
    const f = build('baseflow-darcy', 'double');
    guess(f.node, 'It doubles');
    setSlider(f.node, 0, 2);
    expect(await f.done()).toBe(true);
  });

  it('baseflow-valley: guess, then pump the creek into losing', async () => {
    const f = build('baseflow-valley', 'losing');
    guess(f.node, 'About 20 L/s');
    setSlider(f.node, 1, 25);
    expect(await f.done()).toBe(true);
  });

  it('baseflow-pores builds', () => {
    expect(FIGURES['baseflow-pores'](context()).node.querySelector('svg')).toBeTruthy();
  });
});
