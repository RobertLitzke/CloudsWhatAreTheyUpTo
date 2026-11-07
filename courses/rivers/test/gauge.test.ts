// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { BASINS, CFS, MEASURED, MEASURED_AFTER, RIVER, SHIFTED, SUMMER_CM, SUMMER_S, peakHour, profileMean, profileSpeed, rate, section, stageFor } from '../src/figures/gauge';
import { click, context, guess, setSlider } from './helpers';

async function reach(id: string, goal: string, act: (node: HTMLElement) => void) {
  let done = false;
  const handle = FIGURES[id](context('metric'), goal);
  void handle.done?.then(() => (done = true));
  document.body.append(handle.node);
  act(handle.node);
  await new Promise((r) => setTimeout(r, 0));
  return () => done;
}

describe('F2 creek maths', () => {
  it('the speed profile averages 0.8 of the surface, reached about 0.6 of the way down', () => {
    expect(profileMean()).toBeCloseTo(0.8, 2);
    expect(profileSpeed(1)).toBeCloseTo(1, 5);
    expect(profileSpeed(0.4)).toBeCloseTo(0.8, 1);
  });

  it('the summer creek matches the lesson: 0.57 m², quick 0.18, panels 0.14, middle third two thirds', () => {
    const s = section(SUMMER_CM.map((c) => c / 100), 10 / SUMMER_S);
    expect(s.area).toBeCloseTo(0.57, 5);
    expect(s.quick).toBeCloseTo(0.18, 2);
    expect(s.total).toBeCloseTo(0.14, 2);
    expect(s.middle).toBeGreaterThan(0.6);
    expect(s.middle).toBeLessThan(0.75);
    expect(s.quick * CFS).toBeCloseTo(6.4, 1);
  });

  it('after a storm the creek carries nearly seven times as much', () => {
    const a = section(SUMMER_CM.map((c) => c / 100), 10 / SUMMER_S).total;
    const b = section(SUMMER_CM.map((c) => (c + 20) / 100), 10 / 8).total;
    expect(b / a).toBeGreaterThan(6);
    expect(b / a).toBeLessThan(7.5);
  });

  it('the rating curve: about eight times from 4 to 8 ft, through the measurements, and the shift reads high', () => {
    expect(rate(RIVER, 8) / rate(RIVER, 4)).toBeCloseTo(8, 0);
    for (const [h, q] of MEASURED) expect(Math.abs(q / rate(RIVER, h) - 1)).toBeLessThan(0.1);
    for (const [h, q] of MEASURED_AFTER) expect(Math.abs(q / rate(SHIFTED, h) - 1)).toBeLessThan(0.1);
    expect(rate(RIVER, 8)).toBeGreaterThan(rate(SHIFTED, 8));
    expect(stageFor(RIVER, rate(RIVER, 11.3))).toBeCloseTo(11.3, 5);
  });

  it('the creek peaks within two hours of the heaviest rain, the river about half a day later', () => {
    const [creek, river] = BASINS;
    expect(peakHour(creek) - 44).toBeLessThan(2);
    expect(peakHour(river) - 44).toBeGreaterThan(8);
    expect(peakHour(river) - 44).toBeLessThan(14);
  });
});

describe('F2 figures reach their goals', () => {
  it('section: guess, then the storm', async () => {
    const done = await reach('gauge-section', 'storm', (n) => { guess(n, 'About two thirds'); setSlider(n, 1, 20); setSlider(n, 2, 8); });
    expect(done()).toBe(true);
  });

  it('rating: guess, 8 ft, and the shifted curve', async () => {
    const done = await reach('gauge-rating', 'rating', (n) => { guess(n, 'About eight times'); setSlider(n, 0, 8.5); click(n, 'After a flood: gravel bar built up'); });
    expect(done()).toBe(true);
  });

  it('storm: guess, then play both through', async () => {
    const done = await reach('gauge-storm', 'storm', (n) => {
      guess(n, 'Half a day later');
      setSlider(n, 0, 72);
      click(n, 'City creek');
      setSlider(n, 0, 0);
      setSlider(n, 0, 72);
    });
    expect(done()).toBe(true);
  });
});
