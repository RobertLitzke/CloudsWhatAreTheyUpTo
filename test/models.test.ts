// The models behind the lessons after the first: water, crumb, compost,
// nutrients and pH, the seasons, the food web and the diagnosis tree.
import { describe, expect, it } from 'vitest';
import { heapRatio, remains, verdict } from '../src/core/compost';
import { reachable, START, STEPS } from '../src/core/diagnosis';
import { LESSONS } from '../src/core/lessons';
import { DWELLERS, EATS, starves } from '../src/core/life';
import { availability, cec, leastAt, NUTRIENTS } from '../src/core/nutrients';
import { project } from '../src/core/seasons';
import { mixOf } from '../src/core/soil';
import { slaked, stability } from '../src/core/structure';
import { available, hydraulics, storm } from '../src/core/water';

describe('water', () => {
  it('matches Saxton and Rawls for a loam', () => {
    // Their Table 3: loam (40% sand, 20% clay, 2.5% organic matter): wilting 0.14, field 0.28, saturated 0.46, 15.5 mm/h.
    const h = hydraulics(mixOf(40, 20), 2.5);
    expect(h.wilt).toBeCloseTo(0.137, 2);
    expect(h.field).toBeCloseTo(0.28, 2);
    expect(h.saturated).toBeCloseTo(0.459, 2);
    expect(h.ksat).toBeCloseTo(15.5, 0);
  });

  it('holds more for plants in loam than sand, and drains faster in sand than clay', () => {
    const sand = hydraulics(mixOf(88, 5), 3);
    const loam = hydraulics(mixOf(40, 20), 3);
    const clay = hydraulics(mixOf(25, 50), 3);
    expect(available(loam)).toBeGreaterThan(available(sand));
    expect(sand.ksat).toBeGreaterThan(loam.ksat);
    expect(loam.ksat).toBeGreaterThan(clay.ksat);
  });

  it('packs tighter with a density factor above 1', () => {
    const loose = hydraulics(mixOf(40, 20), 3, 1);
    const packed = hydraulics(mixOf(40, 20), 3, 1.2);
    expect(packed.saturated).toBeLessThan(loose.saturated);
    expect(packed.ksat).toBeLessThan(loose.ksat);
  });

  it('pools rain on clay that sand swallows', () => {
    expect(storm(hydraulics(mixOf(88, 5), 3), 30, 1).pooled).toBeCloseTo(0, 5);
    expect(storm(hydraulics(mixOf(25, 50), 3), 30, 1).pooled).toBeGreaterThan(10);
  });
});

describe('crumb', () => {
  it('is built by roots and organic matter and broken by digging and feet', () => {
    const good = stability({ roots: 12, om: 5, disturbance: 'none', trodden: false });
    const bad = stability({ roots: 4, om: 2, disturbance: 'till', trodden: true });
    expect(good).toBeGreaterThan(0.7);
    expect(bad).toBe(0);
    expect(slaked(good, 300)).toBeGreaterThan(0.5);
    expect(slaked(bad, 30)).toBeLessThan(0.01);
  });
});

describe('compost', () => {
  it('balances browns and greens', () => {
    expect(verdict(heapRatio({ grass: 1 }))).toBe('smelly');
    expect(verdict(heapRatio({ leaves: 2, grass: 1 }))).toBe('hot');
    expect(verdict(heapRatio({ chips: 1 }))).toBe('stalled');
    expect(heapRatio({})).toBeNull();
  });

  it('rots soft parts first and keeps every share between 0 and 1', () => {
    for (const months of [0, 1, 12, 60]) {
      const r = remains('leaves', months);
      const sum = r.fast + r.middle + r.slow + r.humus + r.gone;
      expect(sum).toBeCloseTo(1, 6);
      for (const v of Object.values(r)) expect(v).toBeGreaterThanOrEqual(-1e-9);
    }
    expect(remains('grass', 2).fast).toBeLessThan(remains('grass', 0).fast / 4);
  });
});

describe('nutrients and pH', () => {
  it('holds more nutrients with more clay and organic matter', () => {
    expect(cec(30, 5)).toBeGreaterThan(cec(5, 1));
  });

  it('opens every nutrient only near pH 6.5', () => {
    expect(leastAt(6.4).a).toBeGreaterThanOrEqual(0.65);
    expect(leastAt(5).a).toBeLessThan(0.5);
    expect(leastAt(8).a).toBeLessThan(0.5);
    for (const n of NUTRIENTS) for (let ph = 4; ph <= 9; ph += 0.25) {
      const a = availability(n, ph);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });
});

describe('the seasons', () => {
  it('build organic matter under cover and lose it bare and dug', () => {
    const covered = project({ autumn: 'cover', winter: 'cover', spring: 'compost', summer: 'crop' }, 'none');
    const bare = project({ autumn: 'bare', winter: 'bare', spring: 'bare', summer: 'crop' }, 'dig');
    expect(covered[5] - covered[0]).toBeGreaterThan(0.5);
    expect(bare[5]).toBeLessThan(bare[0]);
  });
});

describe('the food web', () => {
  it('names only real members, and losing bacteria starves protozoa', () => {
    for (const [a, b] of EATS) expect(DWELLERS.includes(a) && DWELLERS.includes(b)).toBe(true);
    expect(starves('bacteria')).toContain('protozoa');
  });
});

describe('the diagnosis tree', () => {
  it('leads from every symptom only to steps that exist, and ends in findings', () => {
    const lessons = new Set(LESSONS.map((l) => l.id));
    for (const s of START) {
      for (const id of reachable(s)) {
        const step = STEPS[id];
        expect(step, id).toBeDefined();
        if (step.kind === 'finding') expect(lessons.has(step.lesson), id).toBe(true);
        else if (step.test) expect(lessons.has(step.test.lesson), id).toBe(true);
      }
    }
  });

  it('uses every step', () => {
    const used = new Set(START.flatMap((s) => [...reachable(s)]));
    expect(Object.keys(STEPS).filter((id) => !used.has(id))).toEqual([]);
  });
});
