import { describe, expect, it } from 'vitest';
import type { Part } from '../src/parts';
import { solve } from '../src/solve';

const battery = (volts: number, ohms?: number): Part => ({ id: 'bat', kind: 'source', a: 'top', b: 'gnd', volts, ohms });

describe('solve', () => {
  it("follows Ohm's law round a single loop", () => {
    const s = solve([battery(9), { id: 'r', kind: 'resistor', a: 'top', b: 'gnd', ohms: 450 }]);
    expect(s.short).toBe(false);
    expect(s.v.top).toBeCloseTo(9);
    expect(s.i.r).toBeCloseTo(0.02);
    expect(s.p.r).toBeCloseTo(0.18);
    // The battery's current runs − to + inside it, against its a→b direction, and it gives power out.
    expect(s.i.bat).toBeCloseTo(-0.02);
    expect(s.p.bat).toBeCloseTo(-0.18);
  });

  it('divides a voltage between two resistors in series', () => {
    const s = solve([
      battery(12),
      { id: 'r1', kind: 'resistor', a: 'top', b: 'mid', ohms: 1000 },
      { id: 'r2', kind: 'resistor', a: 'mid', b: 'gnd', ohms: 2000 },
    ]);
    expect(s.v.mid).toBeCloseTo(8);
  });

  it('splits current between parallel branches and adds it back up', () => {
    const s = solve([
      battery(6),
      { id: 'w', kind: 'wire', a: 'top', b: 'join' },
      { id: 'r1', kind: 'resistor', a: 'join', b: 'gnd', ohms: 100 },
      { id: 'r2', kind: 'resistor', a: 'join', b: 'gnd', ohms: 300 },
    ]);
    expect(s.i.r1).toBeCloseTo(0.06);
    expect(s.i.r2).toBeCloseTo(0.02);
    expect(s.i.w).toBeCloseTo(0.08);
  });

  it('drops voltage across a resistive joint or trace', () => {
    const s = solve([
      battery(5),
      { id: 'joint', kind: 'wire', a: 'top', b: 'pad', ohms: 50 },
      { id: 'load', kind: 'resistor', a: 'pad', b: 'gnd', ohms: 50 },
    ]);
    expect(s.v.pad).toBeCloseTo(2.5);
  });

  it('carries no current through an open switch, and floats the far side', () => {
    const open = solve([
      battery(9),
      { id: 'sw', kind: 'switch', a: 'top', b: 'lamp', closed: false },
      { id: 'l', kind: 'lamp', a: 'lamp', b: 'gnd', ohms: 30 },
    ]);
    expect(open.i.l).toBeCloseTo(0);
    expect(open.v.lamp).toBeCloseTo(0);
    const closed = solve([
      battery(9),
      { id: 'sw', kind: 'switch', a: 'top', b: 'lamp', closed: true },
      { id: 'l', kind: 'lamp', a: 'lamp', b: 'gnd', ohms: 30 },
    ]);
    expect(closed.i.l).toBeCloseTo(0.3);
    expect(closed.i.sw).toBeCloseTo(0.3);
  });

  it('sags a real battery under load through its internal resistance', () => {
    const s = solve([battery(9, 1), { id: 'r', kind: 'resistor', a: 'top', b: 'gnd', ohms: 8 }]);
    expect(s.v.top).toBeCloseTo(8);
    expect(s.i.r).toBeCloseTo(1);
  });

  it('flags a dead short across an ideal source', () => {
    expect(solve([battery(9), { id: 'w', kind: 'wire', a: 'top', b: 'gnd' }]).short).toBe(true);
    // With some internal resistance the short is finite: all the volts are lost inside.
    const real = solve([battery(9, 0.5), { id: 'w', kind: 'wire', a: 'top', b: 'gnd' }]);
    expect(real.short).toBe(false);
    expect(real.i.w).toBeCloseTo(18);
  });

  it('drives a set current through a current source', () => {
    const s = solve([
      { id: 'cs', kind: 'current', a: 'gnd', b: 'top', amps: 0.01 },
      { id: 'r', kind: 'resistor', a: 'top', b: 'gnd', ohms: 220 },
    ]);
    expect(s.v.top).toBeCloseTo(2.2);
  });
});
