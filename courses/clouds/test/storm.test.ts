import { describe, expect, it } from 'vitest';
import { compass, crossRange, frontLift, stormPressure, stormSky, stormWeather, WARM_SECTOR_H } from '../src/core/storm';
import { coldBox, judge, runTrial, seedLayer } from '../src/core/cold-cloud';

describe('a storm going by', () => {
  it('brings its clouds top down, then the warm sector, then the cold front', () => {
    const order = [-40, -30, -20, -10, -3, 5, WARM_SECTOR_H, WARM_SECTOR_H + 2, WARM_SECTOR_H + 8].map((h) => stormSky(h).genus);
    expect(order).toEqual(['clear', 'cirrus', 'cirrostratus', 'altostratus', 'nimbostratus', 'stratocumulus', 'cumulonimbus', 'clear', 'cumulus']);
  });

  it('lowers its cloud base as the warm front nears', () => {
    expect(stormSky(-30).baseM).toBeGreaterThan(stormSky(-20).baseM);
    expect(stormSky(-20).baseM).toBeGreaterThan(stormSky(-10).baseM);
  });

  it('falls the barometer steadily ahead of it, and jumps it behind the cold front', () => {
    for (let h = -34; h < 0; h += 2) expect(stormPressure(h)).toBeLessThan(stormPressure(h - 2));
    const fall = stormWeather(-10).tendency;
    expect(fall).toBeLessThan(-0.5);
    expect(fall).toBeGreaterThan(-3);
    expect(stormWeather(WARM_SECTOR_H + 3).tendency).toBeGreaterThan(3);
  });

  it('backs the wind ahead and veers it behind', () => {
    expect(compass(stormWeather(-6).windFrom)).toBe('southeast');
    expect(compass(stormWeather(6).windFrom)).toMatch(/south/);
    expect(compass(stormWeather(WARM_SECTOR_H + 6).windFrom)).toBe('northwest');
    expect(stormWeather(WARM_SECTOR_H + 6).tempC).toBeLessThan(stormWeather(6).tempC);
  });
});

describe('how steep a front is', () => {
  it('lifts air faster and squeezes the same rain into a shorter time on a steeper front', () => {
    const gentle = frontLift(150);
    const steep = frontLift(30);
    expect(gentle.kind).toBe('layers');
    expect(steep.kind).toBe('towers');
    expect(steep.cmPerS).toBeGreaterThan(gentle.cmPerS * 4);
    expect(steep.rainHours).toBeLessThan(gentle.rainHours);
    expect(steep.mmPerHour * steep.rainHours).toBeCloseTo(gentle.mmPerHour * gentle.rainHours);
  });
});

describe('the rain shadow', () => {
  it('leaves no cloud over low hills and a dry, warm basin behind high mountains', () => {
    const low = crossRange(500, 6);
    expect(low.wrungG).toBe(0);
    const high = crossRange(2000, 10);
    expect(high.wrungG).toBeGreaterThan(1);
    expect(high.eastRH).toBeLessThan(0.5);
    expect(high.eastC).toBeGreaterThan(high.crestC + 10);
  });
});

describe('seeding', () => {
  it('freezes the cold box with dry ice below 0 °C, and with silver iodide only below about −5 °C', () => {
    expect(coldBox('dryIce', 2).result).toBe('warm');
    expect(coldBox('dryIce', -2).result).toBe('snow');
    expect(coldBox('iodide', -3).result).toBe('nothing');
    expect(coldBox('iodide', -10).result).toBe('snow');
    expect(coldBox('dust', -10).result).not.toBe('snow');
  });

  it('snows a hole with the right dose, and overseeds with too much', () => {
    expect(seedLayer(0.001, -10).result).toBe('nothing');
    expect(seedLayer(0.02, -10).result).toBe('flurries');
    expect(seedLayer(1, -10).result).toBe('hole');
    expect(seedLayer(100, -10).result).toBe('overseeded');
    expect(seedLayer(1, 2).result).toBe('warm');
    expect(seedLayer(100, -10).sizeMm).toBeLessThan(seedLayer(1, -10).sizeMm);
  });

  it('needs many winters of chance-picked storms to see the effect, and is fooled by a seeder’s pick', () => {
    // The trial figure shows these same storms.
    expect(judge(runTrial(1, true, 1)).low).toBeLessThan(1);
    expect(judge(runTrial(3, true, 1)).low).toBeLessThan(1);
    expect(judge(runTrial(30, true, 1)).low).toBeGreaterThan(1);
    expect(judge(runTrial(5, false, 2)).ratio).toBeGreaterThan(1.8);
  });
});
