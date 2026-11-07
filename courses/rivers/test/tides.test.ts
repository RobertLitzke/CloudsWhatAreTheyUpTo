// @vitest-environment happy-dom
// Lesson 8, Two tides a day: the pulls and their differences, the Sun's
// share, springs and neaps, and every goal the lesson sets.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { MONTH, SKY, leftover, pullAt, springNeap, sunShare, tideAt, tideRaising } from '../src/figures/tides';
import { click, context, guess, setSlider } from './helpers';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('tides: the numbers', () => {
  it('the Sun pulls about 180 times harder but raises a bit under half the tide', () => {
    expect(pullAt(SKY.sun) / pullAt(SKY.moon)).toBeGreaterThan(170);
    expect(pullAt(SKY.sun) / pullAt(SKY.moon)).toBeLessThan(185);
    expect(sunShare()).toBeGreaterThan(0.44);
    expect(sunShare()).toBeLessThan(0.48);
  });

  it('the scale chart’s millionths of g', () => {
    const m = (a: number) => (a / SKY.g) * 1e6;
    expect(m(pullAt(SKY.sun))).toBeCloseTo(605, -1);
    expect(m(pullAt(SKY.moon))).toBeCloseTo(3.4, 1);
    expect(m(tideRaising(SKY.moon))).toBeCloseTo(0.11, 2);
    expect(m(tideRaising(SKY.sun))).toBeCloseTo(0.05, 2);
  });

  it('what is left points out on both sides and in round the middle', () => {
    const d = 60.3;
    const near = leftover(0, d);
    const far = leftover(Math.PI, d);
    const side = leftover(Math.PI / 2, d);
    expect(near.up / (2 / d ** 3)).toBeGreaterThan(1);
    expect(near.up / (2 / d ** 3)).toBeLessThan(1.04);
    expect(far.up).toBeGreaterThan(0);
    expect(far.up / near.up).toBeGreaterThan(0.94);
    expect(side.up).toBeLessThan(0);
    expect(side.up / near.up).toBeCloseTo(-0.5, 1);
  });

  it('springs at new and full moon, neaps at the quarters', () => {
    const s = sunShare();
    expect(springNeap(0)).toBeCloseTo(1 + s, 6);
    expect(springNeap(MONTH / 2)).toBeCloseTo(1 + s, 6);
    expect(springNeap(MONTH / 4)).toBeCloseTo(1 - s, 6);
    expect(springNeap(0)).toBeCloseTo(1.46, 2);
    expect(springNeap(MONTH / 4)).toBeCloseTo(0.54, 2);
  });

  it('the M2 and S2 tides fall into step again after 14.8 days', () => {
    const hours = 14.77 * 24;
    // At that moment both are near a high together.
    const best = Math.max(...Array.from({ length: 50 }, (_, i) => tideAt(hours - 12 + i * 0.5)));
    expect(best).toBeGreaterThan(1.44);
  });
});

describe('tides: the goals', () => {
  it('pull: guess, then step through to what is left', async () => {
    const f = FIGURES['tides-pull'](context(), 'left');
    let done = false;
    void f.done?.then(() => (done = true));
    guess(f.node, 'Away from the Moon');
    click(f.node, 'Minus the pull at the centre');
    await tick();
    expect(done).toBe(false);
    click(f.node, 'What is left');
    await tick();
    expect(done).toBe(true);
  });

  it('month: guess, then play to the end', async () => {
    const f = FIGURES['tides-month'](context(), 'month');
    let done = false;
    void f.done?.then(() => (done = true));
    guess(f.node, 'New moon and full moon');
    setSlider(f.node, 0, 14.75);
    await tick();
    expect(done).toBe(false);
    setSlider(f.node, 0, MONTH);
    await tick();
    expect(done).toBe(true);
  });

  it('the turning Earth is a still', () => {
    expect(FIGURES['tides-turn'](context()).node).toBeInstanceOf(HTMLElement);
  });
});
