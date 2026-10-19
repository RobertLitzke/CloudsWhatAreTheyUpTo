import { describe, expect, it } from 'vitest';
import { cloudBase, dewPointOf, parcelAt, roomFor } from '../src/core/air';

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

import { column, envTemp, mixedTop, moistRate } from '../src/core/air';

describe('moist rate', () => {
  it('is slow in warm cloud and near the dry rate in cold cloud', () => {
    expect(moistRate(25)).toBeLessThan(5);
    expect(moistRate(-40)).toBeGreaterThan(9);
    expect(moistRate(5)).toBeGreaterThan(moistRate(15));
  });
});

describe('the afternoon column', () => {
  const base = { dawnC: 12, lapsePerKm: 6, groundC: 22, inversion: { atM: 2400, deltaC: 3 } };

  it('stirs a deeper layer as the ground warms', () => {
    expect(mixedTop({ ...base, groundC: 26 })).toBeGreaterThan(mixedTop(base));
    expect(envTemp(0, base)).toBe(22);
  });

  it('gives no cloud when thermals stop below the cloud base', () => {
    expect(column({ ...base, groundC: 14 }, 2).kind).toBe('none');
  });

  it('gives small heaps under a lid and towers without one', () => {
    expect(['humilis', 'mediocris']).toContain(column(base, 9).kind);
    expect(column({ ...base, lapsePerKm: 7, groundC: 28, inversion: undefined }, 9).kind).toBe('cumulonimbus');
  });

  it('grows taller as the air is less stable', () => {
    const tops = [5, 6, 7].map((l) => column({ ...base, lapsePerKm: l, inversion: undefined }, 9).topM);
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThan(tops[2]);
  });
});

describe('room for vapour', () => {
  it('is about 30 g at 30 °C and under 5 g at 0 °C', () => {
    expect(roomFor(30)).toBeGreaterThan(29);
    expect(roomFor(30)).toBeLessThan(32);
    expect(roomFor(0)).toBeLessThan(5);
  });

  it('gives back the temperature it was taken at as a dew point', () => {
    for (const c of [2, 14, 25]) expect(dewPointOf(roomFor(c))).toBeCloseTo(c, 3);
  });
});
