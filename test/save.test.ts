import { describe, expect, it } from 'vitest';
import { emptySave, migrate } from '../src/core/save';

describe('the save', () => {
  it('repairs junk into an empty save, in metres, with no radio', () => {
    expect(migrate('x')).toEqual(emptySave());
    expect(emptySave().units).toBe('metric');
    expect('talk' in migrate({ talk: true })).toBe(false);
  });

  it('keeps what can be kept', () => {
    const s = migrate({ name: 'Rob', units: 'imperial', lessons: { tour: { done: true, best: 4, of: 5 } } });
    expect(s.name).toBe('Rob');
    expect(s.units).toBe('imperial');
    expect(s.lessons.tour.best).toBe(4);
  });
});
