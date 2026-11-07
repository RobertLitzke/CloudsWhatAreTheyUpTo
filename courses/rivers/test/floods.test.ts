// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { atLeastOne, century, discharge, FLOOD, hydrograph, mortgages, rating, twoOrMore } from '../src/figures/floods';
import { click, context, guess, setSlider } from './helpers';

const start = { rain: 150, soil: 0.85, freezing: 1000, snow: true, paved: 0.05 };

const finished = (h: { done?: Promise<void> }) => {
  let done = false;
  void h.done!.then(() => (done = true));
  return () => Promise.resolve().then(() => done);
};

describe('lesson 2, floods', () => {
  it('discharge is width times depth times speed', () => {
    expect(discharge(40, 1, 1)).toBe(40);
    expect(discharge(40, 3, 2.5) / discharge(40, 1, 1)).toBeCloseTo(7.5);
  });

  it('the rating curve rises ever faster with stage', () => {
    expect(rating(2)).toBe(0);
    expect(rating(12) - rating(10)).toBeGreaterThan(rating(6) - rating(4));
  });

  it('the starting storm stays below flood stage; warm rain on snow nearly doubles it', () => {
    const cold = hydrograph(start);
    const warm = hydrograph({ ...start, freezing: 2000 });
    expect(cold.peak).toBeLessThan(FLOOD);
    expect(warm.peak).toBeGreaterThan(FLOOD * 1.3);
    expect(warm.peak / cold.peak).toBeGreaterThan(1.6);
    expect(warm.melt).toBeGreaterThan(10);
  });

  it('dry soil lowers the peak; pavement brings it sooner', () => {
    expect(hydrograph({ ...start, soil: 0 }).peak).toBeLessThan(hydrograph(start).peak * 0.8);
    expect(hydrograph({ ...start, paved: 0.5 }).peakHour).toBeLessThan(hydrograph(start).peakHour);
  });

  it('the odds: 26% over a 30-year mortgage, 0.4% for two in a decade', () => {
    expect(atLeastOne(0.01, 30)).toBeCloseTo(0.26, 2);
    expect(twoOrMore(0.01, 10)).toBeCloseTo(0.0043, 4);
    let hit = 0;
    for (let s = 0; s < 2000; s++) hit += mortgages(century(s)).filter(Boolean).length;
    expect(hit / 6000).toBeGreaterThan(0.23);
    expect(hit / 6000).toBeLessThan(0.29);
  });

  it('the discharge figure is done at flood depth and speed', async () => {
    const h = FIGURES['floods-discharge'](context(), 'flood');
    const done = finished(h);
    guess(h.node, 'About 7 or 8 times');
    setSlider(h.node, 1, 3);
    setSlider(h.node, 2, 2.5);
    expect(await done()).toBe(true);
  });

  it('the hydrograph is done when warm rain on snow floods the river', async () => {
    const h = FIGURES['floods-hydrograph'](context(), 'flood');
    const done = finished(h);
    guess(h.node, 'Yes, well over flood stage');
    setSlider(h.node, 2, 2000);
    expect(await done()).toBe(true);
  });

  it('the dice are done after three centuries', async () => {
    const h = FIGURES['floods-dice'](context(), 'roll');
    const done = finished(h);
    guess(h.node, 'About 1 in 4');
    click(h.node, 'Roll 1,000 centuries');
    expect(await done()).toBe(true);
  });
});
