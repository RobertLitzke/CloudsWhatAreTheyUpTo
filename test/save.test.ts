import { describe, expect, it } from 'vitest';
import { emptySave, migrate } from '../src/core/save';

describe('the save', () => {
  it('repairs junk into an empty save, in inches, with no radio', () => {
    expect(migrate('x')).toEqual(emptySave());
    expect(emptySave().units).toBe('imperial');
    expect(migrate({ talk: true }).talk).toBe(false);
  });

  it('keeps what can be kept', () => {
    const s = migrate({ name: 'Rob', units: 'metric', lessons: { 'made-of': { done: true, best: 6, of: 7 } } });
    expect(s.name).toBe('Rob');
    expect(s.units).toBe('metric');
    expect(s.lessons['made-of'].best).toBe(6);
  });
});
