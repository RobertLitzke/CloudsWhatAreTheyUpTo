// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { headSpeed, KNOT, narrowsTide, PERIOD } from '../src/figures/narrows';
import { context, guess, setSlider } from './helpers';

describe('narrows: the physics', () => {
  it('a metre of fall gives about eight knots, less friction', () => {
    expect(headSpeed(1, 1) / KNOT).toBeCloseTo(8.6, 1);
    expect(headSpeed(1) / KNOT).toBeGreaterThan(7);
    expect(headSpeed(-1)).toBeLessThan(0);
  });

  it('a big tide runs near eight knots, an ordinary one slower', () => {
    const big = narrowsTide(3.5, 160);
    const usual = narrowsTide(2.5, 160);
    expect(big.peak / KNOT).toBeGreaterThan(7.5);
    expect(big.peak / KNOT).toBeLessThan(9);
    expect(usual.peak / KNOT).toBeLessThan(7);
    expect(big.head).toBeGreaterThan(1);
  });

  it('slack comes after high water, later for a narrower gap', () => {
    const wide = narrowsTide(2.5, 500);
    const narrow = narrowsTide(2.5, 80);
    const mid = narrowsTide(2.5, 160);
    expect(mid.slack).toBeGreaterThan(mid.high + 0.5);
    expect(narrow.slack - narrow.high).toBeGreaterThan(wide.slack - wide.high);
    expect(narrow.innerRange).toBeLessThan(wide.innerRange);
    expect(narrow.peak).toBeGreaterThan(wide.peak);
    expect(narrow.volume).toBeLessThan(wide.volume);
    expect(mid.slackLow).toBeGreaterThan(0);
    expect(mid.slackLow).toBeLessThan(mid.high);
  });

  it('a big flood carries about a quarter of a cubic kilometre', () => {
    const v = narrowsTide(3, 160).volume / 1e9;
    expect(v).toBeGreaterThan(0.15);
    expect(v).toBeLessThan(0.4);
  });
});

describe('narrows: the figure', () => {
  it('is done once the guess is in and the tide is played past slack', async () => {
    let done = false;
    const h = FIGURES['narrows-basins'](context(), 'slack');
    h.done!.then(() => (done = true));
    const node = h.node;
    guess(node, 'Still running in, toward Skagit Bay');
    setSlider(node, 0, PERIOD / 2);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(node, 0, PERIOD * 0.7);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('narrows: the text', () => {
  it('at high water the default tide still floods at a few knots', () => {
    const r = narrowsTide(2.5, 160);
    const i = r.hours.findIndex((h) => h >= r.high);
    expect(r.speed[i] / KNOT).toBeGreaterThan(1.5);
    expect(r.speed[i] / KNOT).toBeLessThan(5);
  });
});
