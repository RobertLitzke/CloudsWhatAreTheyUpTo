// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { approach, approachCalls, bestCell, BEST_DELAYS, callLength, callRate, catchTime, phase, rangeOf, roundTrip } from '../src/figures/buzz';
import { context, guess, setSlider } from './helpers';

describe('lesson 4, the feeding buzz', () => {
  it('waits 5.8 ms per metre for an echo', () => {
    expect(roundTrip(1) * 1000).toBeCloseTo(5.83, 2);
    expect(roundTrip(5) * 1000).toBeCloseTo(29.2, 1);
  });

  it('limits a bat to about 30 calls a second at 5 m and lets it buzz under a metre', () => {
    expect(callRate(5)).toBeGreaterThan(25);
    expect(callRate(5)).toBeLessThan(35);
    expect(callRate(0.3)).toBe(200);
    expect(callRate(10)).toBe(10);
    expect(phase(10)).toBe('search');
    expect(phase(3)).toBe('approach');
    expect(phase(0.5)).toBe('buzz');
    expect(phase(1.2)).toBe('approach');
  });

  it('never lets a call overlap its own echo, and shortens calls from 8 ms to half a millisecond', () => {
    for (const d of [7, 3, 1, 0.5, 0.2]) expect(callLength(d)).toBeLessThan(roundTrip(d));
    expect(callLength(6) * 1000).toBe(8);
    expect(callLength(0.1) * 1000).toBe(0.5);
  });

  it('plays a hunt out call by call, faster at the end', () => {
    const p = approach(6);
    expect(p[0].d).toBe(6);
    expect(p[p.length - 1].t).toBeLessThan(catchTime(6));
    const gaps = p.slice(1).map((q, i) => q.t - p[i].t);
    expect(gaps[gaps.length - 1]).toBeCloseTo(0.005, 4);
    expect(gaps[0]).toBeCloseTo(0.04, 1);
    expect(approachCalls(p)).toHaveLength(p.length);
  });

  it('maps a delay to a range and to the right cell', () => {
    expect(rangeOf(0.4) * 100).toBeCloseTo(6.9, 0);
    expect(rangeOf(18)).toBeCloseTo(3.1, 1);
    expect(BEST_DELAYS[bestCell(roundTrip(0.5) * 1000)]).toBe(2.8);
  });

  it('reaches its goals', async () => {
    const r = FIGURES['buzz-rate'](context(), 'near');
    guess(r.node, 'In the last metre');
    setSlider(r.node, 0, 0.5);
    await expect(r.done).resolves.toBeUndefined();

    const a = FIGURES['buzz-approach'](context(), 'catch');
    setSlider(a.node, 0, 4);
    setSlider(a.node, 1, catchTime(4));
    await expect(a.done).resolves.toBeUndefined();
  });
});
