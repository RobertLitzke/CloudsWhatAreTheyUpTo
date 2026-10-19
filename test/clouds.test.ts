import { describe, expect, it } from 'vitest';
import { GENERA, compose, feet, genus, isGenusId } from '../src/core/clouds';

describe('genera', () => {
  it('has the ten WMO genera with unique ids and codes', () => {
    expect(GENERA).toHaveLength(10);
    expect(new Set(GENERA.map((g) => g.id)).size).toBe(10);
    expect(new Set(GENERA.map((g) => g.abbr)).size).toBe(10);
  });

  it('only names real genera as look-alikes, never itself', () => {
    for (const g of GENERA) {
      for (const c of g.confused) {
        expect(isGenusId(c)).toBe(true);
        expect(c).not.toBe(g.id);
      }
    }
  });

  it('files three genera on each floor and one tower', () => {
    const count = (f: string) => GENERA.filter((g) => g.floor === f).length;
    expect([count('high'), count('middle'), count('low'), count('tower')]).toEqual([3, 3, 3, 1]);
  });
});

describe('compose', () => {
  it('builds the six regular names', () => {
    expect(compose('cirro', 'cumulus')).toBe('cirrocumulus');
    expect(compose('cirro', 'stratus')).toBe('cirrostratus');
    expect(compose('alto', 'cumulus')).toBe('altocumulus');
    expect(compose('alto', 'stratus')).toBe('altostratus');
    expect(compose('none', 'cumulus')).toBe('cumulus');
    expect(compose('none', 'stratus')).toBe('stratus');
  });

  it('puts each composed name on the floor its prefix says', () => {
    expect(genus(compose('cirro', 'stratus')).floor).toBe('high');
    expect(genus(compose('alto', 'cumulus')).floor).toBe('middle');
    expect(genus(compose('none', 'stratus')).floor).toBe('low');
  });
});

describe('feet', () => {
  it('rounds to a step that suits a sign', () => {
    expect(feet(2000)).toBe(6500);
    expect(feet(100)).toBe(330);
  });
});
