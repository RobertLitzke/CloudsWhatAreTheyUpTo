import { describe, expect, it } from 'vitest';
import type { Puzzle } from '../src/core/gen';
import { DEFAULTS, RULES } from '../src/core/gen/v1';
import { unlockedAt, type Patch } from '../src/core/params';
import { totals, toRecord } from '../src/core/round';
import { describeError, diagnosis, formatDiff, resultName, scorePuzzle, scoredParams } from '../src/core/score';

function puzzle(target: Partial<Patch>, start: Partial<Patch>, goal: number, stage = 4): Puzzle {
  const t = { ...DEFAULTS, ...target };
  const s = { ...t, ...start };
  const diffs = unlockedAt(stage).filter((id) => t[id] !== s[id]);
  return {
    key: { version: '1', stage, tier: 'N', seed: 0 },
    index: 0,
    riffId: 2,
    target: t,
    start: s,
    goal,
    turns: 0,
    diffs,
    gated: [],
    unlocked: unlockedAt(stage),
    rules: RULES,
  };
}

describe('scoring a puzzle', () => {
  it('a perfect match scores its moves against goal', () => {
    const h = puzzle({ cutoff: 3 }, { cutoff: 5 }, 3);
    const s = scorePuzzle(h, h.target, 2);
    expect(s).toMatchObject({ moves: 2, penalty: 0, total: 2, diff: -1, remainingSteps: 0 });
    expect(s.remaining).toEqual({});
  });

  it('charges two moves per step still wrong, so fixing beats leaving', () => {
    const h = puzzle({ cutoff: 3, res: 1 }, { cutoff: 6, res: 3 }, 6);
    const left = scorePuzzle(h, { ...h.target, cutoff: 5 }, 3);
    expect(left.remaining).toEqual({ cutoff: 2 });
    expect(left.penalty).toBe(4);
    expect(left.total).toBe(7);
    const fixed = scorePuzzle(h, h.target, 5);
    expect(fixed.total).toBeLessThan(left.total);
  });

  it('a wrong selector is one step whichever option it sits on', () => {
    const h = puzzle({ wave: 0 }, { wave: 3 }, 2);
    expect(scorePuzzle(h, { ...h.target, wave: 2 }, 1).penalty).toBe(2);
  });

  it('ignores a knob that is silent in the target', () => {
    // A triangle target: width does nothing on it, so wherever it was left is fine,
    // including on the pulse wave the player tried on the way.
    const h = puzzle({ wave: 2, pw: 4 }, { wave: 3 }, 2, 1);
    expect(scoredParams(h)).toEqual(['wave']);
    expect(scorePuzzle(h, { ...h.target, pw: 3 }, 6)).toMatchObject({ remaining: {}, penalty: 0 });
    // The same for the LFO rate with the depth at zero.
    expect(scoredParams(puzzle({ wave: 0 }, {}, 2))).not.toContain('lfoRate');
  });

  it('accepts a setting that sounds the same as the one in the target', () => {
    // No echo: a drive behind the filter and a drive at the end of the chain are one place.
    const dry = puzzle({ drive: 2, chain: 1 }, { chain: 0 }, 2, 9);
    expect(scorePuzzle(dry, { ...dry.target, chain: 2 }, 1)).toMatchObject({ remaining: {}, penalty: 0 });
    expect(scorePuzzle(dry, { ...dry.target, chain: 0 }, 0).penalty).toBe(2);
    // With an echo between them they are two places.
    const wet = puzzle({ drive: 2, chain: 1, echoMix: 2 }, { chain: 0 }, 2, 9);
    expect(scorePuzzle(wet, { ...wet.target, chain: 2 }, 1).penalty).toBe(2);
  });

  it('judges the target, not the player\'s patch, so a wrong wave cannot hide a wrong width', () => {
    // A pulse target at 10 % width, started on a saw at 50 % (width is locked there).
    // Committing straight away must not be cheaper than solving it.
    const h = puzzle({ wave: 1, pw: 4 }, { wave: 0, pw: 0 }, 6, 1);
    const left = scorePuzzle(h, h.start, 0);
    expect(left.remaining).toEqual({ wave: -1, pw: -4 });
    expect(left.penalty).toBe(2 + 8);
    expect(scorePuzzle(h, h.target, 5).total).toBeLessThan(left.total);
  });

  it('ignores knobs the stage has not unlocked', () => {
    const h = puzzle({ wave: 1 }, { wave: 0 }, 2, 1);
    expect(scoredParams(h)).toEqual(['wave', 'pw']);
  });
});

describe('words', () => {
  it('names a result by its distance from the goal', () => {
    expect([-3, -1, 0, 1, 5].map(resultName)).toEqual(['3 under', '1 under', 'On goal', '1 over', '5 over']);
    expect([-3, 0, 2].map(formatDiff)).toEqual(['−3', '0', '+2']);
  });

  it('describes an error by direction', () => {
    expect(describeError('cutoff', -2)).toBe('2 steps too dark');
    expect(describeError('cutoff', 1)).toBe('1 step too bright');
    expect(describeError('wave', 2)).toBe('wrong setting');
  });

  it('sums the diagnosis by category', () => {
    const h = puzzle({ cutoff: 3, res: 1, lfoDepth: 2 }, { cutoff: 5, res: 2, lfoDepth: 0 }, 6);
    expect(diagnosis(h, { cutoff: 2 })).toBe('The differences were brightness ×2 and movement ×1.');
    expect(diagnosis(h, { cutoff: 2, wave: 2 })).toMatch(/You also spent 2 moves on tone colour/);
  });
});

describe('a round', () => {
  it('totals moves and penalties against total goal', () => {
    const h = puzzle({ cutoff: 3 }, { cutoff: 5 }, 3);
    const records = [
      toRecord(0, 2, scorePuzzle(h, h.target, 2)),
      toRecord(1, 3, scorePuzzle(h, { ...h.target, cutoff: 4 }, 3)),
    ];
    expect(totals(records)).toEqual({ puzzles: 2, goal: 6, total: 7, diff: 1 });
  });
});
