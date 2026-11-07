// @vitest-environment happy-dom
// Lesson 7, What a wave knows about the wind: the wave speeds, the growth law,
// waves on a current, and every goal the lesson sets.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { KNOT, deepLength, deepSpeed, ebbSteepness, BREAK_STEEPNESS, onCurrent, orbit, shallowSpeed, waveNumber, waveSpeed, windSea } from '../src/figures/waves';
import { context, guess, setSlider } from './helpers';

const tick = () => new Promise((r) => setTimeout(r, 0));
/** The input position of a log slider for the value `v`. */
const logPos = (v: number, min: number, max: number) => Math.round((Math.log(v / min) / Math.log(max / min)) * 1000);

describe('waves: the numbers', () => {
  it('a deep-water wave goes 1.56 m/s per second of period', () => {
    expect(deepSpeed(1)).toBeCloseTo(1.56, 2);
    expect(deepSpeed(12)).toBeCloseTo(18.7, 1);
    expect(deepLength(12)).toBeCloseTo(225, 0);
  });

  it('the full formula meets both limits', () => {
    expect(waveSpeed(4, 500)).toBeCloseTo(deepSpeed(4), 4);
    expect(waveSpeed(60, 2) / shallowSpeed(2)).toBeGreaterThan(0.995);
    expect(shallowSpeed(10)).toBeCloseTo(9.9, 1);
  });

  it('the loops shrink by e^-π half a wavelength down, in deep water', () => {
    const k = waveNumber(6, 500);
    expect(orbit(k, 500, Math.PI / k)[0]).toBeCloseTo(Math.exp(-Math.PI), 4);
    expect(orbit(k, 500, 0)[0]).toBeCloseTo(1, 4);
  });

  it('the wind sea matches the numbers in the lesson', () => {
    const sound = windSea(30 * KNOT, 40, 12);
    expect(sound.limit).toBe('fetch');
    expect(sound.height).toBeCloseTo(1.6, 1);
    expect(sound.period).toBeCloseTo(5.3, 1);
    const strait = windSea(30 * KNOT, 150, 12);
    expect(Math.abs(strait.height - 3)).toBeLessThan(0.1);
    expect(windSea(30 * KNOT, 150, 6).limit).toBe('duration');
    const full = windSea(30 * KNOT, 2000, 72);
    expect(full.limit).toBe('full');
    expect(full.height).toBeCloseTo(5.8, 1);
    // Full development at 30 knots needs about 500 km and a day.
    expect(windSea(30 * KNOT, 600, 30).limit).toBe('full');
    expect(windSea(30 * KNOT, 450, 30).limit).toBe('fetch');
  });

  it('an opposing current shortens and steepens the waves', () => {
    const r = onCurrent(4, -1);
    expect(r.length).toBeLessThan(1);
    expect(r.height).toBeGreaterThan(1);
    expect(onCurrent(4, 0)).toEqual({ length: 1, height: 1, blocked: false });
    expect(onCurrent(4, -2).blocked).toBe(true);
    expect(ebbSteepness(-2 * KNOT)).toBeLessThan(BREAK_STEEPNESS);
    expect(ebbSteepness(-2.8 * KNOT)).toBeGreaterThan(BREAK_STEEPNESS);
  });
});

describe('waves: the goals', () => {
  it('orbits: bring the floor up, then make the water shallow', async () => {
    const a = FIGURES['waves-orbits'](context(), 'reach');
    let done = false;
    void a.done?.then(() => (done = true));
    setSlider(a.node, 1, logPos(20, 1, 100));
    await tick();
    expect(done).toBe(true);

    const b = FIGURES['waves-orbits'](context(), 'shallow');
    let shallow = false;
    void b.done?.then(() => (shallow = true));
    setSlider(b.node, 1, logPos(4, 1, 100));
    await tick();
    expect(shallow).toBe(false);
    setSlider(b.node, 0, 14);
    await tick();
    expect(shallow).toBe(true);
  });

  it('fetch: guess, then find each limit', async () => {
    const f = FIGURES['waves-fetch'](context(), 'every');
    let done = false;
    void f.done?.then(() => (done = true));
    guess(f.node, 'The fetch');
    setSlider(f.node, 1, logPos(150, 1, 2000));
    setSlider(f.node, 2, logPos(6, 1, 72));
    await tick();
    expect(done).toBe(false);
    setSlider(f.node, 1, logPos(2000, 1, 2000));
    setSlider(f.node, 2, logPos(72, 1, 72));
    await tick();
    expect(done).toBe(true);
  });

  it('ebb: guess, then run the ebb until the waves break', async () => {
    const f = FIGURES['waves-ebb'](context(), 'break');
    let done = false;
    void f.done?.then(() => (done = true));
    guess(f.node, 'About two knots');
    setSlider(f.node, 0, 2);
    await tick();
    expect(done).toBe(false);
    setSlider(f.node, 0, 2.8);
    await tick();
    expect(done).toBe(true);
  });
});
