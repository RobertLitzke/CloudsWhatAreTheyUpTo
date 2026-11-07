// @vitest-environment happy-dom
// Lesson 3, Why so high?
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { CALLS, MIDGE, MOTH, absorption, dutyCycle, echoShare, glints, heard, reach, wavelength } from '../src/figures/ultrasound';
import { click, context, guess, setSlider } from './helpers';

describe('lesson 3: ultrasound', () => {
  it('wavelengths and air absorption match the published numbers', () => {
    expect(wavelength(20)).toBeCloseTo(17.15, 1);
    expect(wavelength(50)).toBeCloseTo(6.86, 1);
    expect(wavelength(100)).toBeCloseTo(3.43, 1);
    expect(absorption(20)).toBeCloseTo(0.5);
    expect(absorption(50)).toBeGreaterThanOrEqual(1.5);
    expect(absorption(50)).toBeLessThanOrEqual(2);
    expect(absorption(100)).toBeGreaterThanOrEqual(3);
  });

  it('a midge echoes weakly at long wavelengths; a moth echoes at any pitch a bat uses', () => {
    expect(echoShare(20, MIDGE)).toBeLessThan(0.05);
    expect(echoShare(60, MIDGE)).toBeGreaterThan(0.5);
    expect(echoShare(20, MOTH)).toBe(1);
  });

  it('no one pitch finds both the midge at 2 m and the moth at 10 m', () => {
    expect(heard(20, MIDGE, 2)).toBe(false);
    expect(heard(50, MIDGE, 2)).toBe(true);
    expect(heard(120, MIDGE, 2)).toBe(false);
    expect(heard(20, MOTH, 10)).toBe(true);
    expect(heard(50, MOTH, 10)).toBe(false);
    for (let f = 10; f <= 120; f++) expect(heard(f, MIDGE, 2) && heard(f, MOTH, 10)).toBe(false);
    expect(reach(25, MOTH)).toBeGreaterThan(reach(80, MOTH));
  });

  it('sweeps are short and sparse, steady tones long and nearly continuous', () => {
    const [bigBrown, yuma, horseshoe] = CALLS;
    expect(dutyCycle(bigBrown)).toBeLessThan(0.15);
    expect(dutyCycle(yuma)).toBeLessThan(0.15);
    expect(dutyCycle(horseshoe)).toBeGreaterThan(0.5);
    expect(glints(horseshoe.length)).toBeGreaterThanOrEqual(2);
    expect(glints(bigBrown.length)).toBe(0);
  });

  it('the waves figure is done once the midge echoes strongly', async () => {
    const f = FIGURES['ultra-waves'](context(), 'bounce');
    setSlider(f.node, 0, 70);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the trade-off figure needs a guess, then a pitch for each target', async () => {
    const f = FIGURES['ultra-tradeoff'](context(), 'both');
    guess(f.node, 'About 50 kHz');
    setSlider(f.node, 0, 50);
    setSlider(f.node, 0, 20);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the sonogram is done once a sweep and a steady tone have been seen with the echo', async () => {
    const f = FIGURES['ultra-calls'](context(), 'compare');
    click(f.node, 'Moth echo');
    click(f.node, 'Greater horseshoe bat');
    click(f.node, '▶ Play slowed ten times');
    await expect(f.done).resolves.toBeUndefined();
  });
});
