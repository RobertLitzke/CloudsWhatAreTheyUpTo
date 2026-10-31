import { describe, expect, it } from 'vitest';
import { ORDERS } from '../src/core/orders';
import { DEFAULT_SETUP, VEIL, formCloud, naturalIce, seed, seededIce, type Setup } from '../src/core/seeding';
import { migrate } from '../src/core/save';

const sky = (s: Partial<Setup>) => seed({ ...DEFAULT_SETUP, ...s });

describe('ice', () => {
  it('starts on dust about tenfold per 4 °C, one per litre at -20 °C', () => {
    expect(naturalIce(-20)).toBeCloseTo(1, 5);
    expect(naturalIce(-16)).toBeCloseTo(0.1, 5);
    expect(naturalIce(2)).toBe(0);
  });

  it('comes from dry ice in any cloud below 0 °C, and from silver iodide only below -5 °C', () => {
    expect(seededIce('dryIce', 1, -2)).toBe(50);
    expect(seededIce('dryIce', 1, 3)).toBe(0);
    expect(seededIce('silverIodide', 10, -4)).toBe(0);
    expect(seededIce('silverIodide', 10, -15)).toBeGreaterThan(seededIce('silverIodide', 10, -8));
  });
});

describe('forming clouds', () => {
  it('makes fog when the night cools the air to its dew point, and nothing when it does not', () => {
    expect(formCloud({ ...DEFAULT_SETUP, cooling: 'night', groundC: 10, dewC: 4, strength: 8 }).made).toBe('fog');
    expect(formCloud({ ...DEFAULT_SETUP, cooling: 'night', groundC: 10, dewC: 0, strength: 8 }).made).toBe('clear');
  });

  it('grows taller heaps in less stable air', () => {
    const tops = [5, 6.5, 8.5].map((l) => formCloud({ ...DEFAULT_SETUP, groundC: 14, dewC: 6, strength: 12, lapsePerKm: l }).topM);
    expect(tops[1]).toBeGreaterThan(tops[0]);
    expect(tops[2]).toBeGreaterThan(tops[1]);
  });

  it('turns a front into a thicker sheet the higher it lifts', () => {
    expect(formCloud({ ...DEFAULT_SETUP, cooling: 'front', groundC: 8, dewC: 0, strength: 1500, lapsePerKm: 5.5 }).made).toBe('stratus');
    expect(formCloud({ ...DEFAULT_SETUP, cooling: 'front', groundC: 8, dewC: 0, strength: 4000, lapsePerKm: 5.5 }).made).toBe('nimbostratus');
  });
});

describe('seeding', () => {
  const deck: Partial<Setup> = { cooling: 'front', groundC: 8, dewC: 0, strength: 2600, lapsePerKm: 5.5 };

  it('does nothing to a warm cloud', () => {
    const warm: Partial<Setup> = { cooling: 'front', groundC: 20, dewC: 18, strength: 1500, lapsePerKm: 5.5 };
    expect(formCloud({ ...DEFAULT_SETUP, ...warm }).topC).toBeGreaterThan(0);
    const s = sky({ ...warm, agent: 'dryIce', dose: 5 });
    expect(s.seededIce).toBe(0);
    expect(s.fall).toBe(formCloud({ ...DEFAULT_SETUP, ...warm }).fall);
  });

  it('makes a supercooled deck rain, and overseeding stops it', () => {
    expect(formCloud({ ...DEFAULT_SETUP, ...deck }).fall).toBe('drizzle');
    expect(sky({ ...deck, agent: 'dryIce', dose: 2 }).fall).toBe('rain');
    const over = sky({ ...deck, agent: 'dryIce', dose: 100 });
    expect(over.seededIce).toBeGreaterThan(VEIL);
    expect(over.veil).toBe(true);
    expect(over.fall).toBe('none');
  });

  it('gives only flurries with too few crystals', () => {
    expect(sky({ ...deck, agent: 'silverIodide', dose: 0.01 }).fall).toBe('flurries');
  });
});

describe('orders', () => {
  it('are not met by the day as given, before any seeding', () => {
    for (const o of ORDERS.filter((o) => o.fixed)) expect(o.met(formCloud({ ...DEFAULT_SETUP, ...o.fixed })), o.id).toBe(false);
  });

  it('can each be met', () => {
    const ways: Record<string, Partial<Setup>> = {
      picnic: { cooling: 'sun', groundC: 14, dewC: 6, strength: 12, lapsePerKm: 5 },
      flock: { cooling: 'hills', groundC: 0, dewC: -20, strength: 3000, lapsePerKm: 5.5 },
      soaker: { cooling: 'front', groundC: 8, dewC: 0, strength: 4000, lapsePerKm: 5.5 },
      halo: { cooling: 'front', groundC: 20, dewC: -20, strength: 7000, lapsePerKm: 5.5 },
      newsreel: { cooling: 'sun', groundC: 14, dewC: 6, strength: 10, lapsePerKm: 8.5 },
      fog: { agent: 'dryIce', dose: 2 },
      soak: { agent: 'dryIce', dose: 2 },
      tower: { agent: 'silverIodide', dose: 10 },
      snowpack: { agent: 'silverIodide', dose: 5 },
    };
    for (const o of ORDERS) {
      const way = ways[o.id];
      expect(way, o.id).toBeDefined();
      expect(o.met(seed({ ...DEFAULT_SETUP, ...way, ...o.fixed })), o.id).toBe(true);
    }
  });

  it('teach that silver iodide fails on fog warmer than -5 °C', () => {
    const fog = ORDERS.find((o) => o.id === 'fog')!;
    expect(fog.met(seed({ ...DEFAULT_SETUP, ...fog.fixed, agent: 'silverIodide', dose: 50 }))).toBe(false);
  });

  it('are kept in the save', () => {
    expect(migrate({ v: 1, orders: ['fog', 'fog', 3] }).orders).toEqual(['fog']);
    expect(migrate({ v: 1 }).orders).toEqual([]);
  });
});
