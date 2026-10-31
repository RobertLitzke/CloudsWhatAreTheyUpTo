import { describe, expect, it } from 'vitest';
import { feelOf, mixOf, PARTICLES, sayTime, SETTLED_BY, settled, textureOf, TEXTURES } from '../src/core/soil';

describe('texture classes', () => {
  it('names well-known mixes as the USDA triangle does', () => {
    const cases: [number, number, string][] = [
      [92, 3, 'sand'],
      [82, 6, 'loamy sand'],
      [65, 10, 'sandy loam'],
      [40, 20, 'loam'],
      [20, 15, 'silt loam'],
      [5, 5, 'silt'],
      [60, 27, 'sandy clay loam'],
      [33, 33, 'clay loam'],
      [10, 33, 'silty clay loam'],
      [52, 42, 'sandy clay'],
      [7, 47, 'silty clay'],
      [20, 60, 'clay'],
      [0, 100, 'clay'],
      [100, 0, 'sand'],
      [0, 0, 'silt'],
    ];
    for (const [sand, clay, name] of cases) expect(textureOf(mixOf(sand, clay)), `${sand} sand, ${clay} clay`).toBe(name);
  });

  it('gives every point on the triangle a class, and reaches all twelve', () => {
    const seen = new Set<string>();
    for (let s = 0; s <= 100; s++) for (let c = 0; s + c <= 100; c++) seen.add(textureOf(mixOf(s, c)));
    expect([...seen].sort()).toEqual([...TEXTURES].sort());
  });

  it('keeps a mix adding up to 100', () => {
    expect(mixOf(70, 50)).toEqual({ sand: 70, silt: 0, clay: 30 });
    expect(mixOf(-5, 10)).toEqual({ sand: 0, silt: 90, clay: 10 });
  });

  it('groups the classes as a gardener would', () => {
    expect(feelOf('sandy loam')).toBe('sandy');
    expect(feelOf('silt loam')).toBe('loamy');
    expect(feelOf('silty clay')).toBe('clayey');
    expect(feelOf('clay loam')).toBe('loamy');
  });
});

describe('the jar test', () => {
  it('settles each size in order, and all of it by its time', () => {
    for (const p of PARTICLES) {
      expect(settled(p, 0)).toBe(0);
      expect(settled(p, SETTLED_BY[p])).toBeCloseTo(1);
      let last = 0;
      for (let t = 1; t < 4 * 86400; t *= 1.5) {
        const v = settled(p, t);
        expect(v).toBeGreaterThanOrEqual(last);
        last = v;
      }
    }
    // A minute in, the sand is down and the clay has not started.
    expect(settled('sand', 60)).toBeCloseTo(1);
    expect(settled('clay', 60)).toBe(0);
  });

  it('says times the way a person would', () => {
    expect(sayTime(30)).toBe('30 s');
    expect(sayTime(300)).toBe('5 min');
    expect(sayTime(6 * 3600)).toBe('6 h');
    expect(sayTime(48 * 3600)).toBe('2 days');
  });
});

describe('the triangle drawing', () => {
  it('draws each class where textureOf puts it', async () => {
    const { REGIONS } = await import('../src/app/figures/made-of');
    for (const [name, pts] of Object.entries(REGIONS)) {
      const sand = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const clay = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      expect(textureOf(mixOf(sand, clay)), name).toBe(name);
    }
  });
});
