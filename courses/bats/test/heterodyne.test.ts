// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { BAND, DETECTOR_BATS, HORSESHOE, beat, cfTone, dwell, freqAt, heterodyned, products, timeAt } from '../src/figures/heterodyne';
import { context, guess, setSlider } from './helpers';

describe('lesson L1: the heterodyne detector', () => {
  it('mixing makes the sum and the difference', () => {
    expect(products(45, 48)).toEqual({ difference: 3, sum: 93 });
    expect(beat(83, 80)).toBe(3);
    expect(cfTone(83, 80)).toBe(3);
    expect(cfTone(83, 70)).toBeNull();
    expect(cfTone(HORSESHOE.cf, 83)).toBe(0);
  });

  it('a sweep runs from start to end, and timeAt undoes freqAt', () => {
    const s = DETECTOR_BATS[0].sweep;
    expect(freqAt(s, 0)).toBe(90);
    expect(freqAt(s, 1)).toBe(45);
    for (const u of [0.1, 0.4, 0.8]) expect(timeAt(s, freqAt(s, u))).toBeCloseTo(u, 6);
  });

  it('a Myotis is loudest with the dial just above its end frequency, and silent far below', () => {
    const s = DETECTOR_BATS[0].sweep;
    expect(dwell(s, 25)).toBe(0);
    expect(dwell(s, 48)).toBeGreaterThan(dwell(s, 70));
    expect(dwell(s, 50)).toBeGreaterThan(0.45);
    expect(dwell(s, 55)).toBeLessThan(0.3);
  });

  it('what reaches the speaker stays under the filter', () => {
    const calls = heterodyned(DETECTOR_BATS[0].sweep, 48);
    expect(calls.length).toBe(2);
    for (const c of calls) {
      expect(Math.max(c.from, c.to)).toBeLessThanOrEqual(BAND * 1000 + 1e-6);
      expect(c.dur).toBeGreaterThan(0);
    }
    expect(heterodyned(DETECTOR_BATS[0].sweep, 25)).toEqual([]);
  });

  it('tuning the dial to the Myotis meets the goal', async () => {
    const f = FIGURES['het-detector'](context(), 'myotis');
    setSlider(f.node, 0, 30);
    setSlider(f.node, 0, 48);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the steady call: guess, then find zero beat', async () => {
    const f = FIGURES['het-steady'](context(), 'zero');
    guess(f.node, 'A steady whistle, about 3 kHz');
    setSlider(f.node, 0, 83);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the block diagram draws', () => {
    expect(FIGURES['het-blocks'](context()).node.querySelectorAll('rect').length).toBeGreaterThanOrEqual(7);
  });
});
