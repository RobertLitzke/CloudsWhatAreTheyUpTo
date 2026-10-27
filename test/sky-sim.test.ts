import { describe, expect, it } from 'vitest';
import { SCENARIOS, SkySim, type Controls } from '../src/core/sky-sim';

const ridge = SCENARIOS[0];

function run(c: Partial<Controls>, hours: number, setup?: (s: SkySim) => void): SkySim {
  const s = new SkySim(ridge, { ...ridge.start, ...c });
  setup?.(s);
  for (let n = 0; n < (hours * 3600) / s.dt; n++) s.step();
  return s;
}

const sum = (a: Float64Array, from: number, to: number) => a.slice(from, to).reduce((x, y) => x + y, 0);

describe('sky lab', () => {
  it('stays clear on a stable, dry day', () => {
    const s = run({ sun: 3, humidity: 30, aloftC: 6 }, 3);
    expect(s.totals().cloud).toBe(0);
  }, 60000);

  it('grows cumulus from the sun alone by midday', () => {
    const s = run({}, 3);
    const t = s.totals();
    expect(t.cloud).toBeGreaterThan(0);
    expect(t.topM).toBeGreaterThan(2000);
  }, 60000);

  it('rains on the windward side of the ridge and less in its lee', () => {
    const s = run({ sun: 0, humidity: 85, windMs: 10, aloftC: 6 }, 3);
    const i = (km: number) => Math.round((km / ridge.widthKm) * s.nx);
    const windward = sum(s.rain, i(13), i(24));
    const lee = sum(s.rain, i(29), i(38));
    expect(windward).toBeGreaterThan(0.5);
    expect(windward).toBeGreaterThan(2 * lee);
  }, 60000);

  it('makes much shallower clouds without the heat condensing water gives back', () => {
    const c = { sun: 10, humidity: 85, aloftC: -14 };
    const real = run(c, 2);
    const cheat = run(c, 2, (s) => (s.latentHeat = false));
    expect(real.totals().topM).toBeGreaterThan(8000);
    expect(cheat.totals().topM).toBeLessThan(real.totals().topM - 3000);
  }, 60000);

  it('keeps every field finite and water non-negative', () => {
    const s = run({ sun: 10, humidity: 85, aloftC: -14, windMs: -10 }, 2);
    for (const f of [s.th, s.qv, s.qc, s.qr, s.u, s.w]) expect(f.every(Number.isFinite)).toBe(true);
    for (const f of [s.qv, s.qc, s.qr]) expect(Math.min(...f)).toBeGreaterThanOrEqual(0);
  }, 60000);

  it('eases a change of air mass in rather than all at once', () => {
    const s = new SkySim(ridge);
    const before = s.th0[20];
    s.set({ aloftC: -16 });
    s.step();
    const after = s.th0[20];
    expect(after).toBeLessThan(before);
    expect(before - after).toBeLessThan(0.1);
  });

  it('lifts a warm bubble', () => {
    const s = new SkySim(ridge, { ...ridge.start, sun: 0 });
    s.bubble(8, 0.6, 3);
    for (let n = 0; n < 120; n++) s.step();
    expect(s.totals().maxW).toBeGreaterThan(1);
  });
});
