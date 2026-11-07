// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { capacity, drift, evolve, housesBeach, N, steady, supply, type Cell } from '../src/figures/beach';
import { context, guess, setSlider } from './helpers';

const open: Cell = { angle: 30, retreat: 0.1, wall: null };
const walledCell: Cell = { ...open, wall: 0.32 };

describe('lesson 14, the beach', () => {
  it('drift is strongest near 45 degrees and none head-on', () => {
    expect(capacity(0)).toBeCloseTo(0);
    expect(capacity(45)).toBeGreaterThan(capacity(30));
    expect(capacity(45)).toBeGreaterThan(capacity(60));
    expect(capacity(30)).toBeCloseTo(capacity(60));
  });

  it('a bluff supplies what the lesson estimates', () => {
    // 30 m high, 10 cm a year, 1 km: 3,000 m³, half of it sand and gravel.
    const perKm = Array.from({ length: N }, (_, i) => supply(open, i)).reduce((a, b) => a + b, 0) / (0.49 * 5);
    expect(perKm).toBeGreaterThan(1300);
    expect(perKm).toBeLessThan(1700);
  });

  it('the steady beach carries the whole supply to the spit', () => {
    const v = steady(open);
    const total = Array.from({ length: N }, (_, i) => supply(open, i)).reduce((a, b) => a + b, 0);
    expect(drift(open, v)[N - 1]).toBeCloseTo(total, 0);
  });

  it('a bulkhead narrows the beach down-drift and leaves it alone without one', () => {
    const before = housesBeach(steady(open));
    expect(housesBeach(evolve(open, 30).v)).toBeCloseTo(before, 1);
    const after = housesBeach(evolve(walledCell, 30).v);
    expect(after).toBeLessThan(before * 0.85);
    expect(housesBeach(evolve(walledCell, 5).v)).toBeGreaterThan(after);
  });

  it('the drift cell figure reaches a starved beach', async () => {
    const f = FIGURES['beach-cell'](context(), 'starve');
    guess(f.node, 'It narrows');
    setSlider(f.node, 0, 30);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the swash still builds', () => {
    expect(FIGURES['beach-swash'](context()).node).toBeInstanceOf(HTMLElement);
  });
});
