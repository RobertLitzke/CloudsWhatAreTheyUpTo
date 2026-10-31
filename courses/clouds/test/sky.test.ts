import { describe, expect, it } from 'vitest';
import { angularSize, fogHour, frontSky, layerBySize, nightTemp, strikeKm } from '../src/core/sky';
import { deviation, haloHistogram, ICE_N, minimumDeviation, refract, type V } from '../src/core/optics';

describe('halo optics', () => {
  it('bends light no less than about 22 degrees through a 60 degree prism', () => {
    expect(minimumDeviation()).toBeCloseTo(21.8, 1);
    for (let i = 14; i <= 90; i += 2) {
      const d = deviation(i);
      if (d != null) expect(d).toBeGreaterThanOrEqual(minimumDeviation() - 1e-9);
    }
  });

  it('traps steep rays inside', () => {
    expect(deviation(5)).toBeNull();
  });

  it('piles light up just outside 22 degrees', () => {
    const samples = Array.from({ length: 2000 }, (_, k) => (k / 2000) * 90);
    const bins = haloHistogram(samples);
    const peak = bins.indexOf(Math.max(...bins));
    expect(peak).toBeGreaterThanOrEqual(21);
    expect(peak).toBeLessThanOrEqual(23);
    expect(bins.slice(0, 21).every((b) => b === 0)).toBe(true);
  });

  // A ray heading down at `deg` from the vertical, onto a level surface whose normal points up.
  const down = (deg: number): V => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)];

  it('refracts by Snell’s law', () => {
    for (const i of [0, 20, 45, 70]) {
      const t = refract(down(i), [0, 1], 1, ICE_N)!;
      expect(Math.hypot(...t)).toBeCloseTo(1, 9);
      expect(t[0]).toBeCloseTo(Math.sin((i * Math.PI) / 180) / ICE_N, 9);
      expect(t[1]).toBeLessThan(0);
    }
  });

  it('reflects a ray that meets the inside of a face too steeply', () => {
    // Leaving ice for air, nothing gets out beyond about 50° from the normal.
    expect(refract(down(45), [0, 1], ICE_N, 1)).not.toBeNull();
    expect(refract(down(55), [0, 1], ICE_N, 1)).toBeNull();
  });
});

describe('sizes', () => {
  it('measures angles', () => {
    expect(angularSize(100, 100 / (2 * Math.tan(Math.PI / 360)))).toBeCloseTo(1, 5);
  });
  it('files layers by the finger rule', () => {
    expect(layerBySize(0.5)).toBe('cirrocumulus');
    expect(layerBySize(3)).toBe('altocumulus');
    expect(layerBySize(8)).toBe('stratocumulus');
  });
});

describe('a warm front', () => {
  it('comes in high and thickens down to rain', () => {
    const order = [48, 34, 26, 15, 5].map(frontSky);
    expect(order).toEqual(['clear', 'cirrus', 'cirrostratus', 'altostratus', 'nimbostratus']);
  });
});

describe('a clear night', () => {
  const night = { duskC: 16, dewC: 8, clear: 1, wind: 0 };
  it('cools fastest early and never below the dew point', () => {
    expect(nightTemp(1, night) - nightTemp(2, night)).toBeGreaterThan(nightTemp(8, night) - nightTemp(9, night) - 1e-9);
    expect(nightTemp(12, night)).toBeGreaterThanOrEqual(8);
  });
  it('makes fog on a clear calm night and not under cloud or wind', () => {
    expect(fogHour(night)).not.toBeNull();
    expect(fogHour({ ...night, clear: 0.2 })).toBeNull();
    expect(fogHour({ ...night, wind: 0.9 })).toBeNull();
  });
});

describe('thunder', () => {
  it('is about three seconds per kilometre', () => {
    expect(strikeKm(3)).toBeCloseTo(1, 1);
  });
});
