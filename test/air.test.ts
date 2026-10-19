import { describe, expect, it } from 'vitest';
import { cloudBase, parcelAt } from '../src/core/air';

describe('cloud base', () => {
  it('is about 125 m per degree of spread', () => {
    expect(cloudBase(24, 12)).toBeCloseTo(1500, 0);
    expect(cloudBase(20, 20)).toBe(0);
  });

  it('is never below the ground', () => {
    expect(cloudBase(10, 12)).toBe(0);
  });
});

describe('parcel', () => {
  it('cools at the dry rate below the base and is clear', () => {
    const p = parcelAt(1000, 24, 12);
    expect(p.cloud).toBe(false);
    expect(p.tempC).toBeCloseTo(14.2, 1);
    expect(p.dewC).toBeCloseTo(10.2, 1);
  });

  it('turns to cloud at the base, where temperature meets dew point', () => {
    const p = parcelAt(1500, 24, 12);
    expect(p.cloud).toBe(true);
    expect(p.tempC).toBeCloseTo(p.dewC, 5);
    expect(p.tempC).toBeCloseTo(9.3, 1);
  });

  it('cools more slowly once it is cloud', () => {
    const below = parcelAt(1400, 24, 12).tempC - parcelAt(1500, 24, 12).tempC;
    const above = parcelAt(1500, 24, 12).tempC - parcelAt(1600, 24, 12).tempC;
    expect(above).toBeLessThan(below);
  });
});
