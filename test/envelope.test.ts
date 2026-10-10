import { describe, expect, it } from 'vitest';
import { levelAt, noteEnvelope, type Adsr } from '../src/core/envelope';

const adsr: Adsr = { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.6 };

describe('one note', () => {
  it('rises, decays towards sustain, then releases towards zero', () => {
    const { events, end } = noteEnvelope(0, 1, 2, 4, adsr);
    expect(levelAt(events, 1)).toBe(0);
    expect(levelAt(events, 1.05)).toBeCloseTo(0.5, 6);
    expect(levelAt(events, 1.1)).toBeCloseTo(1, 6);
    // One decay time is three time constants: 95 % of the way to sustain.
    expect(levelAt(events, 1.4)).toBeCloseTo(0.5 + 0.5 * Math.exp(-3), 6);
    expect(levelAt(events, 1.99)).toBeCloseTo(0.5, 2);
    const atRelease = levelAt(events, 2);
    expect(levelAt(events, 2.6)).toBeCloseTo(atRelease * Math.exp(-3), 6);
    expect(end).toBeCloseTo(levelAt(events, 4), 9);
    expect(end).toBeLessThan(0.001);
  });

  it('emits nothing at or after the next note', () => {
    for (const next of [1.02, 1.1, 1.5, 2, 3]) {
      const { events } = noteEnvelope(0.2, 1, 2, next, adsr);
      for (const e of events) expect(e.t).toBeLessThanOrEqual(next);
      for (const e of events) if (e.kind !== 'ramp') expect(e.t).toBeLessThan(next);
      // Times never go backwards.
      for (let i = 1; i < events.length; i++) expect(events[i].t).toBeGreaterThanOrEqual(events[i - 1].t);
    }
  });

  it('releases from part-way up if the key lifts during the attack', () => {
    const { events } = noteEnvelope(0, 0, 0.05, 1, adsr);
    expect(levelAt(events, 0.05)).toBeCloseTo(0.5, 6);
    expect(levelAt(events, 0.3)).toBeLessThan(0.5);
    expect(events.some((e) => e.kind === 'target' && e.v === 0.5)).toBe(false);
  });

  it('is cut short without a release when the next note arrives first', () => {
    const { events, end } = noteEnvelope(0, 0, 0.5, 0.05, adsr);
    expect(end).toBeCloseTo(0.5, 6);
    expect(events.map((e) => e.kind)).toEqual(['set', 'ramp']);
  });
});

describe('notes in a row', () => {
  it('each starts from the level the last one reached, with no jump', () => {
    const slow: Adsr = { attack: 0.02, decay: 0.2, sustain: 0.6, release: 1.5 };
    let level = 0;
    const all = [];
    for (let i = 0; i < 6; i++) {
      const on = i * 0.25;
      const { events, end } = noteEnvelope(level, on, on + 0.2, on + 0.25, slow);
      expect(events[0]).toEqual({ kind: 'set', t: on, v: level });
      all.push(...events);
      level = end;
    }
    // A long release keeps the level well up between notes.
    expect(level).toBeGreaterThan(0.4);
    for (let i = 1; i < 6; i++) {
      const t = i * 0.25;
      expect(levelAt(all, t - 1e-6)).toBeCloseTo(levelAt(all, t), 4);
    }
  });

  it('with sustain at zero the note dies away while held', () => {
    const pluck: Adsr = { attack: 0.002, decay: 0.12, sustain: 0, release: 0.08 };
    const { events } = noteEnvelope(0, 0, 0.5, 1, pluck);
    expect(levelAt(events, 0.4)).toBeLessThan(0.001);
  });
});
