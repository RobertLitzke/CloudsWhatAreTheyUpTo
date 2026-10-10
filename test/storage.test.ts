import { describe, expect, it } from 'vitest';
import { stageBest, stageOpen, stageReached, UNLOCK_AT } from '../src/core/campaign';
import { addStats, deleteLoop, deletePatch, emptySave, migrate, recordRound, saveLoop, savePatch, setSaved, SHELF_LIMIT } from '../src/core/storage';

describe('migrating stored data', () => {
  it('gives a fresh save for anything unrecognisable', () => {
    for (const raw of [null, undefined, 'x', 42, [], {}, { v: 'one' }, { v: 99 }]) {
      expect(migrate(raw)).toEqual(emptySave());
    }
  });

  it('round-trips a real save through JSON', () => {
    let save = emptySave();
    save = recordRound(save, '11N-K7QX2M', 3, 30, '2026-10-09');
    save = setSaved(save, '11N-K7QX2M', true);
    save = addStats(save, { cutoff: { puzzles: 2, needed: 4, spent: 6, left: 1 } });
    save = { ...save, unlockAll: true, lessons: [1], volume: 0.5 };
    save.resume = { key: '12E-000001', records: [{ index: 0, riffId: 2, goal: 2, moves: 1, penalty: 0 }] };
    expect(migrate(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it('drops damaged pieces and keeps the rest', () => {
    const save = migrate({
      v: 1,
      volume: 7,
      lessons: [1, 'two', 2.5],
      rounds: [{ key: '11N-K7QX2M', best: 2 }, { best: 1 }, 'junk'],
      stats: { cutoff: { puzzles: 1, needed: -5 }, bogus: { puzzles: 1 } },
      resume: { key: '11N-K7QX2M', records: [{ index: 0 }, { index: 1, riffId: 2, goal: 2, moves: 1, penalty: 0 }] },
    });
    expect(save.volume).toBe(0.8);
    expect(save.lessons).toEqual([1]);
    expect(save.rounds).toEqual([{ key: '11N-K7QX2M', best: 2, goal: 0, plays: 1, last: '', saved: false }]);
    expect(save.stats).toEqual({ cutoff: { puzzles: 1, needed: 0, spent: 0, left: 0 } });
    expect(save.resume?.records).toHaveLength(1);
  });
});

describe('a save from the first build', () => {
  it('is read under the names it was written with', () => {
    const save = migrate({
      v: 1,
      rounds: [{ key: '11N-K7QX2M', best: 2, par: 30, plays: 1, last: 'a', saved: true }],
      stats: { cutoff: { holes: 3, needed: 4, spent: 6, left: 1 } },
      resume: { key: '11N-K7QX2M', records: [{ index: 0, riffId: 2, par: 2, strokes: 1, penalty: 0 }] },
    });
    expect(save.rounds[0].goal).toBe(30);
    expect(save.stats.cutoff?.puzzles).toBe(3);
    expect(save.resume?.records).toEqual([{ index: 0, riffId: 2, goal: 2, moves: 1, penalty: 0 }]);
  });
});

describe('recording rounds', () => {
  it('keeps the best score per key and counts plays', () => {
    let save = recordRound(emptySave(), '11N-K7QX2M', 5, 30, 'a');
    save = recordRound(save, '11N-K7QX2M', 8, 30, 'b');
    save = recordRound(save, '11N-K7QX2M', 2, 30, 'c');
    expect(save.rounds).toEqual([{ key: '11N-K7QX2M', best: 2, goal: 30, plays: 3, last: 'c', saved: false }]);
  });

  it('forgets old unsaved rounds but never a saved one', () => {
    let save = recordRound(emptySave(), '11N-000001', 0, 30, 'first');
    save = setSaved(save, '11N-000001', true);
    for (let i = 2; i < 100; i++) {
      save = recordRound(save, `11N-0000${String(i).padStart(2, '0')}`, 0, 30, 'later');
    }
    expect(save.rounds.length).toBe(61);
    expect(save.rounds.some((r) => r.key === '11N-000001')).toBe(true);
    expect(save.rounds[0].key).toBe('11N-000099');
  });
});

describe('opening stages', () => {
  it('starts with stage 1 only', () => {
    expect(stageReached(emptySave())).toBe(1);
    expect(stageOpen(emptySave(), 2)).toBe(false);
  });

  it('a normal round at the threshold opens the next stage; an easy one does not', () => {
    const easy = recordRound(emptySave(), '11E-000001', -4, 24, '');
    expect(stageReached(easy)).toBe(1);
    const miss = recordRound(emptySave(), '11N-000001', UNLOCK_AT + 1, 30, '');
    expect(stageReached(miss)).toBe(1);
    const pass = recordRound(miss, '11N-000002', UNLOCK_AT, 30, '');
    expect(stageReached(pass)).toBe(2);
    expect(stageOpen(pass, 2)).toBe(true);
    expect(stageOpen(pass, 3)).toBe(false);
  });

  it('stages open in order, and a hard round counts', () => {
    let save = recordRound(emptySave(), '13H-000001', 0, 40, '');
    expect(stageReached(save)).toBe(1);
    save = recordRound(save, '11H-000001', 0, 40, '');
    save = recordRound(save, '12N-000001', 0, 40, '');
    expect(stageReached(save)).toBe(4);
  });

  it('unlock-all skips the gating', () => {
    expect(stageOpen({ ...emptySave(), unlockAll: true }, 4)).toBe(true);
  });

  it('the best at a stage is the best round at that stage and tier', () => {
    let save = recordRound(emptySave(), '11N-000001', 4, 30, '');
    save = recordRound(save, '11N-000002', 1, 30, '');
    save = recordRound(save, '12N-000003', -9, 30, '');
    expect(stageBest(save, 1, 'N')).toEqual({ key: '11N-000002', diff: 1 });
    expect(stageBest(save, 1, 'H')).toBeNull();
  });
});

describe('saved sounds and loops', () => {
  it('keeps the newest first and replaces one of the same name', () => {
    let save = savePatch(emptySave(), 'Bass', { cutoff: 2.5 });
    save = savePatch(save, 'Lead', { cutoff: 6 });
    save = savePatch(save, '  Bass  ', { cutoff: 1 });
    expect(save.patches).toEqual([
      { name: 'Bass', patch: { cutoff: 1 } },
      { name: 'Lead', patch: { cutoff: 6 } },
    ]);
    expect(deletePatch(save, 'Bass').patches.map((p) => p.name)).toEqual(['Lead']);
  });

  it('survives a round trip, and never keeps more than the shelf holds', () => {
    let save = emptySave();
    for (let i = 0; i < SHELF_LIMIT + 5; i++) save = savePatch(save, `Sound ${i}`, { wave: 1, fmAmount: 1.5 });
    save = saveLoop(save, { name: 'Riff', bpm: 120, bars: 2, notes: [{ start: 0, len: 2.5, midi: 60 }] });
    expect(save.patches).toHaveLength(SHELF_LIMIT);
    expect(migrate(JSON.parse(JSON.stringify(save)))).toEqual(save);
    expect(deleteLoop(save, 'Riff').loops).toEqual([]);
  });

  it('drops what it cannot play and keeps the rest', () => {
    const save = migrate({
      v: 1,
      patches: [{ name: 'ok', patch: { cutoff: 3, bogus: 9, res: 'high', wave: -1 } }, { name: '', patch: {} }, { patch: {} }, 'junk'],
      loops: [
        { name: 'good', bpm: 100, bars: 1, notes: [{ start: 0, len: 4, midi: 60 }, { start: 14, len: 4, midi: 62 }, { start: 2, len: 0, midi: 60 }] },
        { name: 'empty', bpm: 100, bars: 1, notes: [] },
        { name: 'fast', bpm: 9000, bars: 1, notes: [{ start: 0, len: 4, midi: 60 }] },
      ],
    });
    expect(save.patches).toEqual([{ name: 'ok', patch: { cutoff: 3 } }]);
    expect(save.loops).toEqual([{ name: 'good', bpm: 100, bars: 1, notes: [{ start: 0, len: 4, midi: 60 }] }]);
  });

  it('a save from before sounds and loops existed simply has none', () => {
    const save = migrate({ v: 1, rounds: [] });
    expect(save.patches).toEqual([]);
    expect(save.loops).toEqual([]);
  });
});
