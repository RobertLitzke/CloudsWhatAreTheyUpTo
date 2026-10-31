import { describe, expect, it } from 'vitest';
import { emptySave, migrate } from '../src/core/save';

describe('the save', () => {
  it('repairs junk into an empty save, metric, with no radio', () => {
    expect(migrate('x')).toEqual(emptySave());
    expect(emptySave().units).toBe('metric');
    const s = migrate({ talk: true, heard: {}, units: 'imperial' });
    expect(s.units).toBe('metric');
    expect(s).not.toHaveProperty('talk');
  });

  it('keeps what can be kept', () => {
    const s = migrate({ name: 'Rob', lessons: { 'what-flows': { done: true, best: 6, of: 7 } } });
    expect(s.name).toBe('Rob');
    expect(s.lessons['what-flows'].best).toBe(6);
  });
});
