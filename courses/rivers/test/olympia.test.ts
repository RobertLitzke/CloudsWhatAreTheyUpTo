// @vitest-environment happy-dom
// Lesson 10, Why Olympia's tide is nearly twice Port Townsend's: the long
// wave's numbers, the channel's resonance, sea level under the king tides,
// and every goal the lesson sets can be reached.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import {
  MOUTH_RANGE, SOUND, datums, gainAt, headGain, heightAt, inverseBarometer, resonantKm, riseBy, travelHours, waveSpeed, wavelength, yearOrdinaryReachesKing,
} from '../src/figures/olympia';
import { blockOptions, click, context, guess, setSlider } from './helpers';

const build = (id: string, goal?: string, options?: Record<string, unknown>) => {
  let done = false;
  const h = FIGURES[id](context(), goal, options);
  void h.done?.then(() => (done = true));
  return { node: h.node, done: () => done };
};
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('lesson 10: the long wave', () => {
  it('runs at √(g h): about 200 m/s in the open ocean, 24 m/s in the Sound', () => {
    expect(waveSpeed(4000)).toBeCloseTo(198, 0);
    expect(waveSpeed(60)).toBeCloseTo(24.3, 1);
    expect(travelHours(150, 60)).toBeCloseTo(1.7, 1);
    expect(wavelength(4000)).toBeGreaterThan(8500);
  });

  it('peaks at a quarter wavelength, and the Sound sits about half way there', () => {
    const q = resonantKm(60);
    expect(q).toBeCloseTo(271, -1);
    expect(headGain(q, 60)).toBeGreaterThan(10);
    expect(headGain(q * 0.6, 60)).toBeLessThan(headGain(q * 0.9, 60));
    expect(headGain(q * 1.4, 60)).toBeLessThan(headGain(q * 1.1, 60));
    // A short basin barely amplifies.
    expect(headGain(20, 60)).toBeCloseTo(1, 1);
    // The model Sound: about 1.5 times the mouth, against the measured 1.7.
    const g = headGain(SOUND.km, SOUND.depth);
    expect(g).toBeGreaterThan(1.4);
    expect(g).toBeLessThan(1.8);
    expect(g * MOUTH_RANGE).toBeGreaterThan(3.7);
  });

  it('is a standing wave: the swing grows toward the closed end, and the mouth keeps its own tide', () => {
    expect(gainAt(0, 150, 60)).toBeCloseTo(1, 5);
    expect(gainAt(75, 150, 60)).toBeLessThan(gainAt(150, 150, 60));
    expect(Math.abs(heightAt(0, 150, 60, 0))).toBeCloseTo(MOUTH_RANGE / 2, 5);
  });

  it('a 980 hPa low lifts the sea about a foot', () => {
    expect(inverseBarometer(980)).toBeCloseTo(33, 0);
  });
});

describe('lesson 10: sea level under the king tides', () => {
  it("the model's Seattle datums are close to the real ones (MSL 6.7 ft, MHHW 11.4 ft above MLLW)", () => {
    const d = datums();
    expect(d.msl * 3.28084).toBeGreaterThan(5.8);
    expect(d.msl * 3.28084).toBeLessThan(7.2);
    expect(d.mhhw * 3.28084).toBeGreaterThan(10.5);
    expect(d.mhhw * 3.28084).toBeLessThan(12);
    expect(d.king).toBeGreaterThan(d.mhhw);
  });

  it('rises 2 mm a year in the past, and ordinary meets king later at a slower pace', () => {
    expect(riseBy(1925, 0.01)).toBeCloseTo(-0.2, 5);
    expect(riseBy(2100, 0.005)).toBeCloseTo(0.375, 5);
    const slow = yearOrdinaryReachesKing(0.002);
    const fast = yearOrdinaryReachesKing(0.01);
    expect(slow).toBeGreaterThan(2150);
    expect(fast).toBeGreaterThan(2040);
    expect(fast).toBeLessThan(2080);
  });
});

describe('lesson 10: the goals', () => {
  it('scale-guess: Olympia', async () => {
    const f = build('scale-guess', 'guess', blockOptions('scale-guess', 'olympia'));
    guess(f.node, '14.6 ft');
    await settle();
    expect(f.done()).toBe(true);
  });

  it('channel: guess, then lengthen it to resonance', async () => {
    const f = build('olympia-channel', 'peak');
    guess(f.node, 'It peaks at one length, then falls');
    click(f.node, 'Puget Sound');
    await settle();
    expect(f.done()).toBe(false);
    setSlider(f.node, 0, 270);
    await settle();
    expect(f.done()).toBe(true);
  });

  it('rise: at 5 mm a year an ordinary high reaches the king tides by 2110', async () => {
    const f = build('olympia-rise', 'reach');
    setSlider(f.node, 0, 2150);
    await settle();
    expect(f.done()).toBe(false);
    click(f.node, '5 mm');
    setSlider(f.node, 0, 2110);
    await settle();
    expect(f.done()).toBe(true);
  });
});
