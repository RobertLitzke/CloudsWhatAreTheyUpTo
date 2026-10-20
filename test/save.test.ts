import { describe, expect, it } from 'vitest';
import { emptySave, finishShift, migrate } from '../src/core/save';

describe('migrate', () => {
  it('turns junk into an empty save', () => {
    expect(migrate(null)).toEqual(emptySave());
    expect(migrate('x')).toEqual(emptySave());
    expect(migrate([1, 2])).toEqual(emptySave());
  });

  it('keeps what is valid and repairs the rest', () => {
    const s = migrate({
      name: 'Rob',
      units: 'metric',
      journal: ['floors', 'floors', 3],
      shifts: { floors: { done: true, best: 12, of: 8, finishedAt: '2026-10-19' }, bad: 'x' },
    });
    expect(s.name).toBe('Rob');
    expect(s.units).toBe('metric');
    expect(s.journal).toEqual(['floors']);
    expect(s.shifts.floors).toEqual({ done: true, best: 8, of: 8, finishedAt: '2026-10-19' });
    expect(s.shifts.bad).toBeUndefined();
  });

  it('carries the old first lesson over to the two it was split into', () => {
    const s = migrate({ shifts: { textures: { done: true, best: 5, of: 6, finishedAt: '2026-10-19' } } });
    expect(s.shifts.textures).toBeUndefined();
    expect(s.shifts.fog).toEqual({ done: true, best: 5, of: 6, finishedAt: '2026-10-19' });
    expect(s.shifts.heaps).toEqual(s.shifts.fog);
  });

  it('keeps the radio settings and what was heard', () => {
    expect(emptySave().talk).toBe(true);
    const s = migrate({ talk: false, introSeen: true, heard: { intro: [1, '2', -3], junk: 'x' } });
    expect(s.talk).toBe(false);
    expect(s.introSeen).toBe(true);
    expect(s.heard).toEqual({ intro: [1, 2, 0] });
  });
});

describe('finishShift', () => {
  const now = new Date('2026-10-19T12:00:00Z');

  it('records a first finish with its date and journal entries', () => {
    const s = finishShift(emptySave(), 'floors', 6, 8, ['floors', 'roots'], now);
    expect(s.shifts.floors).toEqual({ done: true, best: 6, of: 8, finishedAt: '2026-10-19' });
    expect(s.journal).toEqual(['floors', 'roots']);
  });

  it('keeps the better score and the first date', () => {
    const first = finishShift(emptySave(), 'floors', 7, 8, [], now);
    const worse = finishShift(first, 'floors', 3, 8, [], new Date('2026-10-20T12:00:00Z'));
    expect(worse.shifts.floors.best).toBe(7);
    expect(worse.shifts.floors.finishedAt).toBe('2026-10-19');
    const better = finishShift(worse, 'floors', 8, 8, [], now);
    expect(better.shifts.floors.best).toBe(8);
  });
});
