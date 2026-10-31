import { describe, expect, it } from 'vitest';
import { downdraftChill, dustWall, gapWind, outflowKmh, rainLands, sinkTo } from '../src/core/east-wind';
import { fallThrough, fogKind, poolDay } from '../src/core/winter-fog';

describe('winter fog', () => {
  it('lets one night’s fog burn off, keeps a week’s, and needs a strong wind to scour it out', () => {
    expect(poolDay(1, 0).burnsOff).toBe(true);
    expect(poolDay(7, 0).grey).toBe(true);
    expect(poolDay(7, 15).grey).toBe(true);
    expect(poolDay(7, 30).scoured).toBe(true);
    expect(poolDay(7, 0).ridgeC).toBeGreaterThan(poolDay(7, 0).floorC);
  });

  it('names the fog from the surface, the air and the wind', () => {
    expect(fogKind(2, 10, 0, false)).toBe('shallow');
    expect(fogKind(2, 10, 15, true)).toBe('advection');
    expect(fogKind(2, 10, 40, true)).toBe('stratus');
    expect(fogKind(10, -5, 10, true)).toBe('steam');
    expect(fogKind(10, -5, 10, false)).toBe('none');
    expect(fogKind(12, 10, 10, false)).toBe('none');
  });

  it('turns snow to freezing rain through a warm layer over a shallow cold one', () => {
    expect(fallThrough(-1, 400)).toBe('snow');
    expect(fallThrough(4, 400)).toBe('freezing rain');
    expect(fallThrough(4, 1000)).toBe('sleet');
    expect(fallThrough(1.5, 400)).toBe('sleet');
    expect(fallThrough(4, 0)).toBe('rain');
  });
});

describe('dust and dry winds', () => {
  it('lets less rain land and blows harder from a higher base', () => {
    expect(rainLands(0.5)).toBe(1);
    expect(rainLands(3)).toBe(0);
    expect(outflowKmh(downdraftChill(2.5))).toBeGreaterThan(outflowKmh(downdraftChill(1)) + 10);
  });

  it('lifts dust off dry ploughed fields long before wet ones', () => {
    const gust = outflowKmh(downdraftChill(2.5));
    expect(dustWall(gust, 'ploughed')).toBeGreaterThan(1000);
    expect(dustWall(gust, 'wet')).toBe(0);
  });

  it('warms sinking air about 10 °C a kilometre and dries it', () => {
    const bottom = sinkTo(1500, 15, -2, 0);
    expect(bottom.c).toBeCloseTo(29.7, 1);
    expect(bottom.humidity).toBeLessThan(20);
  });

  it('blows harder through a gap with more pressure behind it', () => {
    expect(gapWind(8)).toBeGreaterThan(55);
    expect(gapWind(2)).toBeLessThan(40);
  });
});
