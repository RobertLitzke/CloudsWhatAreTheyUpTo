import { describe, expect, it } from 'vitest';
import { amps, ohms, si, volts, watts } from '../src/app/circuit/units';

describe('readout units', () => {
  it('pick a prefix and keep two or three figures', () => {
    expect(ohms(4700)).toBe('4.7 kΩ');
    expect(amps(0.0234)).toBe('23.4 mA');
    expect(amps(0.15)).toBe('150 mA');
    expect(volts(9)).toBe('9 V');
    expect(watts(1.25)).toBe('1.25 W');
    expect(si(0, 'V')).toBe('0 V');
    expect(si(-0.002, 'A')).toBe('-2 mA');
  });
});
