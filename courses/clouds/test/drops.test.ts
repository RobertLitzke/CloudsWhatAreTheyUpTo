import { describe, expect, it } from 'vitest';
import { dropFate, fallSpeed, survivalM } from '../src/core/drops';

describe('drops', () => {
  it('fall faster the bigger they are, from a crawl to about 9 m/s', () => {
    expect(fallSpeed(0.01)).toBeLessThan(0.01);
    expect(fallSpeed(1)).toBeCloseTo(4, 5);
    expect(fallSpeed(8)).toBeCloseTo(9.1, 5);
    for (let mm = 0.01; mm < 5; mm *= 1.3) expect(fallSpeed(mm * 1.3)).toBeGreaterThan(fallSpeed(mm));
  });

  it('last centimetres as cloud droplets and kilometres as raindrops', () => {
    expect(survivalM(0.02, 0.9)).toBeLessThan(0.1);
    expect(survivalM(2, 0.9)).toBeGreaterThan(10000);
    expect(survivalM(0.2, 0.5)).toBeLessThan(survivalM(0.2, 0.9));
  });

  it('reach the ground only when they outfall the updraft and outlast the drop', () => {
    expect(dropFate(2, 1, 0.9, 1000).lands).toBe(true);
    expect(dropFate(2, 8, 0.9, 1000).lands).toBe(false);
    expect(dropFate(0.05, 0, 0.9, 1000).lands).toBe(false);
  });
});
