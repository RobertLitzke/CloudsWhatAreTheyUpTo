// @vitest-environment happy-dom
// Lesson 9, Why one low tide is lower: the model's numbers, and every goal
// the lesson sets can be reached.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import {
  SEATTLE, SEATTLE_LAT, SUM_DAYS, SUM_FROM, beatDays, daylight, equilibrium, formNumber, hasSingleLowDay, turns, twoHighs, yearOfLows,
} from '../src/figures/inequality';
import { click, context, guess, setSlider } from './helpers';

const build = (id: string, goal?: string) => {
  let done = false;
  const h = FIGURES[id](context(), goal);
  void h.done?.then(() => (done = true));
  return { node: h.node, handle: h, done: () => done };
};
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('lesson 9: the model', () => {
  it('two waves of 12 and 12.42 hours beat every 14.8 days, K1 and O1 every 13.66', () => {
    expect(beatDays(12, 12.4206)).toBeCloseTo(14.77, 1);
    expect(beatDays(23.9345, 25.8193)).toBeCloseTo(13.66, 1);
  });

  it("Newton's tilted bulge: equal highs with the Moon over the equator, unequal with it far north", () => {
    const [a, b] = twoHighs(SEATTLE_LAT, 0);
    expect(a).toBeCloseTo(b, 6);
    const [c, d] = twoHighs(SEATTLE_LAT, 25);
    expect(c - d).toBeGreaterThan(0.6);
    // The lows stay at the waist of the bulge, -1/3, in this picture.
    const lows = [...Array(360).keys()].map((h) => equilibrium(SEATTLE_LAT, 25, h));
    expect(Math.min(...lows)).toBeCloseTo(-1 / 3, 2);
  });

  it("Seattle's form number is near one: a mixed tide", () => {
    const { F, kind } = formNumber(SEATTLE);
    expect(F).toBeGreaterThan(0.85);
    expect(F).toBeLessThan(1.1);
    expect(kind).toMatch(/mixed/);
  });

  it('every day has two lows with no tilt, and some day has one with strong daily waves', () => {
    expect(hasSingleLowDay({ M2: 1.07, S2: 0.26 }, SUM_FROM, SUM_FROM + SUM_DAYS * 24)).toBe(false);
    expect(hasSingleLowDay(SEATTLE, SUM_FROM, SUM_FROM + SUM_DAYS * 24)).toBe(false);
    expect(hasSingleLowDay({ ...SEATTLE, K1: 2, O1: 2 }, SUM_FROM, SUM_FROM + SUM_DAYS * 24)).toBe(true);
    expect(hasSingleLowDay({ ...SEATTLE, M2: 0.4, S2: 0.1 }, SUM_FROM, SUM_FROM + SUM_DAYS * 24)).toBe(true);
  });

  it("the Seattle model's lows split more than its highs, as Seattle's do", () => {
    const { lows, highs } = turns(SEATTLE, SUM_FROM, SUM_FROM + 30 * 24, 0.1);
    const split = (xs: [number, number][]) => {
      let s = 0;
      for (let i = 0; i + 1 < xs.length; i += 2) s += Math.abs(xs[i][1] - xs[i + 1][1]);
      return s / Math.floor(xs.length / 2);
    };
    expect(split(lows)).toBeGreaterThan(1.5 * split(highs));
  });

  it("a year of lows: summer's minus tides near midday, winter's near midnight", () => {
    const year = yearOfLows();
    const minus = (from: number, to: number) => year.filter((d) => d.day >= from && d.day < to && d.height < -0.3);
    const june = minus(152, 182);
    const dec = minus(335, 365);
    expect(june.length).toBeGreaterThan(5);
    expect(dec.length).toBeGreaterThan(5);
    for (const d of june) expect(d.hour).toBeGreaterThan(8), expect(d.hour).toBeLessThan(17);
    for (const d of dec) expect(d.hour < 5 || d.hour > 20).toBe(true);
    // Lowest lows of the year about 3 ft below the tables' zero, as at Seattle.
    const lowest = Math.min(...year.map((d) => d.height));
    expect(lowest).toBeLessThan(-0.7);
    expect(lowest).toBeGreaterThan(-1.3);
  });

  it('daylight at Seattle: about 16 hours in June, 8.5 in December', () => {
    const [r1, s1] = daylight(172);
    const [r2, s2] = daylight(355);
    expect(s1 - r1).toBeCloseTo(16, 0);
    expect(s2 - r2).toBeGreaterThan(8);
    expect(s2 - r2).toBeLessThan(9);
  });
});

describe('lesson 9: the goals', () => {
  it('tilt: the Moon at 20° or more', async () => {
    const f = build('inequality-tilt', 'tilted');
    setSlider(f.node, 0, 10);
    await settle();
    expect(f.done()).toBe(false);
    setSlider(f.node, 0, -24);
    await settle();
    expect(f.done()).toBe(true);
  });

  it('beat: wave B at 12.42 hours', async () => {
    const f = build('inequality-beat', 'beat');
    setSlider(f.node, 0, 12.42);
    await settle();
    expect(f.done()).toBe(true);
  });

  it('sum: guess, then raise K1 and O1 until a day has one low', async () => {
    const f = build('inequality-sum', 'oneLow');
    guess(f.node, 'One deepens, the other climbs until it vanishes');
    click(f.node, 'Seattle');
    await settle();
    expect(f.done()).toBe(false);
    setSlider(f.node, 2, 2);
    setSlider(f.node, 3, 2);
    await settle();
    expect(f.done()).toBe(true);
  });

  it('machine: two days of turning', async () => {
    const f = build('inequality-machine', 'turned');
    setSlider(f.node, 0, 50);
    await settle();
    expect(f.done()).toBe(true);
  });
});
