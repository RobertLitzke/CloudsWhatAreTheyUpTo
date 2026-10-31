import { describe, expect, it } from 'vitest';
import { capBreak, hailHeld, hailName, stormFuel, stormKind } from '../src/core/violent';

describe('violent storms', () => {
  it('give damp, hot air more fuel than dry air', () => {
    const damp = stormFuel({ groundC: 32, dewC: 22, capC: 0 });
    const dry = stormFuel({ groundC: 32, dewC: 10, capC: 0 });
    expect(damp.cape).toBeGreaterThan(2500);
    expect(dry.cape).toBeLessThan(damp.cape / 3);
    expect(damp.updraft).toBeGreaterThan(30);
  });

  it('let a cap put the storms off until there is more fuel, or stop them altogether', () => {
    const none = capBreak(0)!;
    const some = capBreak(2)!;
    expect(none.hour).toBeLessThan(11);
    expect(some.hour).toBeGreaterThan(none.hour + 2);
    expect(some.fuel.cape).toBeGreaterThan(none.fuel.cape * 1.5);
    expect(capBreak(4)).toBeNull();
  });

  it('sort storms by fuel and shear, and hold up bigger hail in faster updrafts', () => {
    expect(stormKind(2500, 10)).toBe('single');
    expect(stormKind(2500, 50)).toBe('multicell');
    expect(stormKind(2500, 80)).toBe('supercell');
    expect(hailName(hailHeld(30))).toBe('golf ball');
    expect(hailHeld(15)).toBeCloseTo(1);
  });
});
