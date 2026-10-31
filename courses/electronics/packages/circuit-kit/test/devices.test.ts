import { describe, expect, it } from 'vitest';
import { e12, nearestE12, sourceVolts, type Part } from '../src/parts';
import { simulate } from '../src/sim';
import { solve } from '../src/solve';

const battery = (volts: number, ohms?: number): Part => ({ id: 'bat', kind: 'source', a: 'top', b: 'gnd', volts, ohms });

describe('curved parts', () => {
  it('bends a lamp: a tenth of its hot resistance when cold', () => {
    const lamp = (v: number) => solve([battery(v), { id: 'l', kind: 'lamp', a: 'top', b: 'gnd', ohms: 30, rated: 9 }]).i.l;
    expect(lamp(9)).toBeCloseTo(0.3, 3);
    expect(lamp(0.01) / 0.01).toBeGreaterThan(0.2); // under 5 Ω cold
    expect(lamp(4.5)).toBeGreaterThan(0.15); // more than half the current at half the voltage
  });

  it('drops about 0.6 V across a silicon diode and 2 V across a red LED', () => {
    const drop = (model: 'silicon' | 'led-red' | 'germanium') => {
      const s = solve([battery(9), { id: 'r', kind: 'resistor', a: 'top', b: 'k', ohms: 680 }, { id: 'd', kind: 'diode', a: 'k', b: 'gnd', model }]);
      return s.v.k;
    };
    expect(drop('silicon')).toBeGreaterThan(0.6);
    expect(drop('silicon')).toBeLessThan(0.8);
    expect(drop('germanium')).toBeLessThan(0.4);
    expect(drop('led-red')).toBeGreaterThan(1.7);
    expect(drop('led-red')).toBeLessThan(2.1);
  });

  it('blocks a reversed diode, and drops less when warm', () => {
    const rev = solve([battery(9), { id: 'r', kind: 'resistor', a: 'top', b: 'k', ohms: 1000 }, { id: 'd', kind: 'diode', a: 'gnd', b: 'k', model: 'silicon' }]);
    expect(rev.i.r).toBeLessThan(1e-6);
    const at = (celsius: number) => solve([battery(9), { id: 'r', kind: 'resistor', a: 'top', b: 'k', ohms: 1000 }, { id: 'd', kind: 'diode', a: 'k', b: 'gnd', model: 'silicon' }], { celsius }).v.k;
    const perDegree = (at(75) - at(25)) / 50;
    expect(perDegree).toBeLessThan(-0.001);
    expect(perDegree).toBeGreaterThan(-0.004);
  });

  it('switches an NPN transistor with a small base current', () => {
    const s = solve([
      battery(9),
      { id: 'rb', kind: 'resistor', a: 'top', b: 'base', ohms: 100000 },
      { id: 'rc', kind: 'resistor', a: 'top', b: 'col', ohms: 1000 },
      { id: 'q', kind: 'bjt', type: 'npn', c: 'col', b: 'base', e: 'gnd', beta: 100 },
    ]);
    expect(s.i['q:b']).toBeCloseTo(84e-6, 5);
    expect(s.i.q).toBeCloseTo(8.4e-3, 3);
    expect(s.v.col).toBeCloseTo(9 - 8.4, 0);
    // Too much base current: it saturates, the collector down near 0.1 V.
    const sat = solve([
      battery(9),
      { id: 'rb', kind: 'resistor', a: 'top', b: 'base', ohms: 10000 },
      { id: 'rc', kind: 'resistor', a: 'top', b: 'col', ohms: 1000 },
      { id: 'q', kind: 'bjt', type: 'npn', c: 'col', b: 'base', e: 'gnd', beta: 100 },
    ]);
    expect(sat.v.col).toBeLessThan(0.2);
  });

  it('works a PNP the other way up', () => {
    const s = solve([
      battery(9),
      { id: 'rb', kind: 'resistor', a: 'base', b: 'gnd', ohms: 100000 },
      { id: 'rc', kind: 'resistor', a: 'col', b: 'gnd', ohms: 1000 },
      { id: 'q', kind: 'bjt', type: 'pnp', c: 'col', b: 'base', e: 'top', beta: 100 },
    ]);
    expect(s.i.q).toBeCloseTo(-8.4e-3, 3);
    expect(s.v.col).toBeCloseTo(8.4, 0);
  });

  it('turns a MOSFET on past its threshold', () => {
    const at = (vg: number) =>
      solve([
        battery(12),
        { id: 'g', kind: 'source', a: 'gate', b: 'gnd', volts: vg },
        { id: 'load', kind: 'resistor', a: 'top', b: 'drain', ohms: 12 },
        { id: 'm', kind: 'mosfet', type: 'n', d: 'drain', g: 'gate', s: 'gnd', vth: 2, k: 2 },
      ]);
    expect(at(0).i.m).toBeLessThan(1e-3);
    expect(at(10).i.m).toBeCloseTo(1, 1);
  });

  it('runs an op-amp with feedback at 1 + Rf/Rg, and clips at its rails', () => {
    const amp = (vin: number) =>
      solve([
        { id: 'vcc', kind: 'source', a: 'vcc', b: 'gnd', volts: 9 },
        { id: 'in', kind: 'source', a: 'in', b: 'gnd', volts: vin },
        { id: 'rf', kind: 'resistor', a: 'out', b: 'minus', ohms: 10000 },
        { id: 'rg', kind: 'resistor', a: 'minus', b: 'gnd', ohms: 1000 },
        { id: 'u', kind: 'opamp', plus: 'in', minus: 'minus', out: 'out', vcc: 'vcc', vee: 'gnd' },
      ]).v.out;
    expect(amp(0.3)).toBeCloseTo(3.3, 2);
    expect(amp(2)).toBeCloseTo(7.5, 1);
  });

  it('feeds a constant-power load more current as its voltage falls', () => {
    const at = (volts: number) => solve([battery(volts), { id: 'w', kind: 'wire', a: 'top', b: 'end', ohms: 0.1 }, { id: 'l', kind: 'load', a: 'end', b: 'gnd', watts: 60 }]);
    expect(at(12).i.l).toBeCloseTo(5.26, 1);
    expect(at(48).i.l).toBeCloseTo(1.25, 1);
  });
});

describe('time', () => {
  it('charges a capacitor to 63% in one RC', () => {
    const parts: Part[] = [battery(10), { id: 'r', kind: 'resistor', a: 'top', b: 'c', ohms: 1000 }, { id: 'cap', kind: 'capacitor', a: 'c', b: 'gnd', farads: 1e-3 }];
    const sim = simulate(parts);
    expect(sim.now.v.c).toBeCloseTo(0, 3);
    sim.step(1, 1000);
    expect(sim.now.v.c).toBeCloseTo(6.32, 1);
    sim.step(4, 4000);
    expect(sim.now.v.c).toBeGreaterThan(9.9);
  });

  it('builds current slowly in an inductor', () => {
    const parts: Part[] = [battery(10), { id: 'l', kind: 'inductor', a: 'top', b: 'gnd', henries: 1, ohms: 10 }];
    const sim = simulate(parts);
    sim.step(0.1, 1000);
    expect(sim.now.i.l).toBeCloseTo(0.632, 2);
    expect(solve(parts).i.l).toBeCloseTo(1);
  });

  it('moves a sine source with time', () => {
    const parts: Part[] = [{ id: 'g', kind: 'source', a: 'top', b: 'gnd', volts: 4.5, wave: { shape: 'sine', amp: 1, hz: 100 } }, { id: 'r', kind: 'resistor', a: 'top', b: 'gnd', ohms: 1000 }];
    const sim = simulate(parts);
    sim.step(0.0025, 10);
    expect(sim.now.v.top).toBeCloseTo(5.5);
  });

  it('pushes a current through a diode with nothing else to set its voltage', () => {
    const s = solve([{ id: 'i', kind: 'current', a: 'gnd', b: 'a', amps: 0.01 }, { id: 'd', kind: 'diode', a: 'a', b: 'gnd', model: 'silicon' }]);
    expect(s.i.d).toBeCloseTo(0.01, 4);
    expect(s.v.a).toBeGreaterThan(0.5);
    expect(s.v.a).toBeLessThan(0.9);
  });

  it('drops about 3 V across a blue LED at 10 mA', () => {
    const s = solve([{ id: 'i', kind: 'current', a: 'gnd', b: 'a', amps: 0.01 }, { id: 'd', kind: 'diode', a: 'a', b: 'gnd', model: 'led-blue' }]);
    expect(s.v.a).toBeGreaterThan(2.7);
    expect(s.v.a).toBeLessThan(3.4);
  });

  it('plays a guitar note that peaks at its amplitude and repeats', () => {
    const g = { id: 'g', kind: 'source' as const, a: 'top', b: 'gnd', volts: 0, wave: { shape: 'guitar' as const, amp: 0.2, hz: 110 } };
    const vs = Array.from({ length: 400 }, (_, k) => sourceVolts(g, k / 400 / 110));
    expect(Math.max(...vs.map(Math.abs))).toBeCloseTo(0.2, 2);
    expect(sourceVolts(g, 0.3 / 110)).toBeCloseTo(sourceVolts(g, 2.3 / 110));
  });

  it('runs a two-transistor blinker, its bases swinging below ground, at about 0.6 RC a side', () => {
    const blinker = (c: number): Part[] => [
      battery(9),
      { id: 'r1', kind: 'resistor', a: 'top', b: 'l1', ohms: 470 },
      { id: 'd1', kind: 'diode', a: 'l1', b: 'k1', model: 'led-red' },
      { id: 'r2', kind: 'resistor', a: 'top', b: 'l2', ohms: 470 },
      { id: 'd2', kind: 'diode', a: 'l2', b: 'k2', model: 'led-red' },
      { id: 'rb1', kind: 'resistor', a: 'top', b: 'b1', ohms: 47000 },
      { id: 'rb2', kind: 'resistor', a: 'top', b: 'b2', ohms: 47000 },
      { id: 'c1', kind: 'capacitor', a: 'k1', b: 'b2', farads: c },
      { id: 'c2', kind: 'capacitor', a: 'k2', b: 'b1', farads: c },
      { id: 'q1', kind: 'bjt', type: 'npn', c: 'k1', b: 'b1', e: 'gnd', beta: 200 },
      { id: 'q2', kind: 'bjt', type: 'npn', c: 'k2', b: 'b2', e: 'gnd', beta: 200 },
    ];
    // Perfectly balanced, both turn on together and stay on, as a real one can on a slowly rising supply.
    const stuck = simulate(blinker(10e-6));
    stuck.step(0.5, 100);
    expect(stuck.now.v.k1).toBeLessThan(0.5);
    expect(stuck.now.v.k2).toBeLessThan(0.5);
    // Nudged, it runs, steadily: each half takes about 0.6 × 47 kΩ × 10 µF.
    const sim = simulate(blinker(10e-6), { charged: { c1: -1 } });
    const flips: number[] = [];
    let low = sim.now.v.k1 < 4;
    let lowest = 0;
    while (sim.t < 2) {
      const s = sim.step(0.005);
      expect(s.converged).toBe(true);
      lowest = Math.min(lowest, s.v.b1);
      if (s.v.k1 < 4 !== low) flips.push(sim.t);
      low = s.v.k1 < 4;
    }
    expect(flips.length).toBeGreaterThanOrEqual(6);
    const halves = flips.slice(2).map((f, k) => f - flips[k + 1]);
    for (const h of halves) expect(h).toBeCloseTo(0.6 * 47000 * 10e-6, 1);
    expect(lowest).toBeLessThan(-6);
  });
});

describe('standard values', () => {
  it('lists the E12 series and finds the nearest', () => {
    expect(e12(100, 1000)).toEqual([100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000]);
    expect(nearestE12(450)).toBe(470);
    expect(nearestE12(9.5)).toBe(10);
  });
});
