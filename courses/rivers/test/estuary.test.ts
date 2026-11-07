// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { density, froude, inflowSalt, renewals, SPRING_NEAP, sillMonth, wedgeLength } from '../src/figures/estuary';
import { context, guess, setSlider } from './helpers';

describe('estuary: the physics', () => {
  it('Sound water is 2 to 3 percent denser than river water', () => {
    const r = density(30) / density(0) - 1;
    expect(r).toBeGreaterThan(0.02);
    expect(r).toBeLessThan(0.03);
  });

  it('the inflow is saltier at neaps than at springs', () => {
    expect(inflowSalt(SPRING_NEAP / 2, 1)).toBeGreaterThan(inflowSalt(0, 1) + 0.5);
  });

  it('the bottom is renewed around each neap tide, not at springs, whatever the river', () => {
    for (const river of [0.4, 1, 2.5]) {
      const runs = renewals(sillMonth(river));
      expect(runs.length).toBe(2);
      for (const [a, b] of runs) {
        const mid = (a + b) / 2;
        const neap = Math.abs(mid - SPRING_NEAP / 2) < 2 || Math.abs(mid - 1.5 * SPRING_NEAP) < 2;
        expect(neap).toBe(true);
      }
    }
  });

  it('a stronger river pushes the salt wedge back', () => {
    expect(wedgeLength(20)).toBeGreaterThanOrEqual(6000);
    expect(wedgeLength(60)).toBeLessThan(wedgeLength(40));
    expect(wedgeLength(300)).toBeLessThan(1000);
    expect(froude(40)).toBeLessThan(0.1);
  });
});

describe('estuary: the figures', () => {
  it('the sill figure is done after the guess and half a month', async () => {
    let done = false;
    const h = FIGURES['estuary-sill'](context(), 'neap');
    h.done!.then(() => (done = true));
    guess(h.node, 'At neap tides');
    setSlider(h.node, 0, 5);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 8);
    setSlider(h.node, 0, 16);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the wedge figure is done after a low flow and a flood', async () => {
    let done = false;
    const h = FIGURES['estuary-wedge'](context('metric'), 'pushed');
    h.done!.then(() => (done = true));
    const input = h.node.querySelector('input[type=range]') as HTMLInputElement;
    setSlider(h.node, 0, Number(input.min));
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, Number(input.max));
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the locks still draws', () => {
    expect(FIGURES['estuary-locks'](context()).node).toBeInstanceOf(HTMLElement);
  });
});
