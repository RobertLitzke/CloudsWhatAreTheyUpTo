// @vitest-environment happy-dom
// Lesson 4's figures: Hjulström's chart and the Elwha's delta, and the maths
// behind them.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { deltaHistory, grainState, settleSpeed, sinkSpeed, startSpeed, supply } from '../src/figures/sediment';
import { context, click, guess, setSlider } from './helpers';

const build = (id: string, goal?: string) => {
  let done = false;
  const h = FIGURES[id](context(), goal);
  void h.done?.then(() => (done = true));
  return { node: h.node, done: async () => { await Promise.resolve(); await Promise.resolve(); return done; } };
};

/** A log slider's position (0 to 1000) for a value. */
const logPos = (v: number, min: number, max: number) => Math.round((1000 * Math.log(v / min)) / Math.log(max / min));

describe("Hjulström's lines", () => {
  it('dip to about 20 cm/s near a quarter of a millimetre', () => {
    const sizes = Array.from({ length: 501 }, (_, i) => 10 ** (-3 + i / 100));
    const low = sizes.reduce((a, b) => (startSpeed(b) < startSpeed(a) ? b : a));
    expect(low).toBeGreaterThan(0.1);
    expect(low).toBeLessThan(0.5);
    expect(startSpeed(low)).toBeGreaterThan(0.15);
    expect(startSpeed(low)).toBeLessThan(0.3);
  });

  it('need about a metre a second or more for clay, and for 10 mm gravel', () => {
    expect(startSpeed(0.002)).toBeGreaterThan(1);
    expect(startSpeed(10)).toBeGreaterThan(0.7);
    expect(startSpeed(10)).toBeLessThan(1.2);
  });

  it('settle below the starting speed, and far below it for clay', () => {
    for (const d of [0.002, 0.02, 0.2, 1, 10, 100]) expect(settleSpeed(d)).toBeLessThan(startSpeed(d));
    expect(startSpeed(0.002) / settleSpeed(0.002)).toBeGreaterThan(1000);
  });

  it('sink at Stokes speeds: clay about a centimetre an hour, fine sand a couple of centimetres a second', () => {
    expect(sinkSpeed(0.002) * 3600 * 100).toBeGreaterThan(0.8);
    expect(sinkSpeed(0.002) * 3600 * 100).toBeLessThan(2);
    expect(sinkSpeed(0.2)).toBeGreaterThan(0.015);
    expect(sinkSpeed(0.2)).toBeLessThan(0.035);
  });

  it('a moving grain keeps going between the lines; a resting one does not start', () => {
    expect(grainState(0.002, 0.3, false)).toBe('rest');
    expect(grainState(0.002, 0.3, true)).toBe('suspended');
    expect(grainState(10, 1.5, false)).toBe('bed');
  });
});

describe("the Elwha's delta, a model", () => {
  it('holds its size before the dams, shrinks behind them and grows back within a few years', () => {
    const out = deltaHistory(true);
    const kept = deltaHistory(false);
    expect(out[1912 - 1900]).toBeCloseTo(1, 5);
    expect(out[2011 - 1900]).toBeLessThan(0.3);
    expect(out[2017 - 1900]).toBeGreaterThan(0.8);
    expect(kept[2017 - 1900]).toBeLessThan(0.2);
    expect(supply(2013, true)).toBeGreaterThan(supply(2011, true));
  });
});

describe('the figures reach their goals', () => {
  it('sediment-hjulstrom: guess, then lift clay', async () => {
    const f = build('sediment-hjulstrom', 'clay');
    guess(f.node, 'No, clay needs a faster current');
    click(f.node, 'Clay');
    setSlider(f.node, 0, logPos(3, 0.005, 5));
    expect(await f.done()).toBe(true);
  });

  it('sediment-delta: guess, then run past 2016 with the dams out', async () => {
    const f = build('sediment-delta', 'grown');
    guess(f.node, 'A few years');
    setSlider(f.node, 0, 2020);
    expect(await f.done()).toBe(true);
  });

  it('sediment-loads builds', () => {
    expect(FIGURES['sediment-loads'](context()).node.querySelector('svg')).toBeTruthy();
  });
});
