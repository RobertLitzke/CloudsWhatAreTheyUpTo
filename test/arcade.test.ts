import { describe, expect, it } from 'vitest';
import { arcadeLevel, drain, multiplier, parSeconds, points, refill, SIGNAL_MAX, WASTED_COST } from '../src/core/arcade';
import { generatePuzzle, MAX_STAGE } from '../src/core/gen';
import { PUZZLES_PER_ROUND } from '../src/core/key';

describe('the arcade ramp', () => {
  it('starts on stage 1 with one easy knob and never asks for a puzzle that does not exist', () => {
    expect(arcadeLevel(1, MAX_STAGE)).toEqual({ stage: 1, tier: 'E', index: 0 });
    for (let level = 1; level <= 200; level++) {
      for (const last of [1, 4, MAX_STAGE]) {
        const spec = arcadeLevel(level, last);
        expect(spec.stage).toBeGreaterThanOrEqual(1);
        expect(spec.stage).toBeLessThanOrEqual(last);
        expect(spec.index).toBeGreaterThanOrEqual(0);
        expect(spec.index).toBeLessThan(PUZZLES_PER_ROUND);
      }
    }
  });

  it('never gets easier: stages, tiers and knobs different only go up', () => {
    const rank = { E: 0, N: 1, H: 2 };
    let before = { stage: 0, tier: 0, turns: 0 };
    for (let level = 1; level <= 40; level++) {
      const spec = arcadeLevel(level, MAX_STAGE);
      expect(spec.stage).toBeGreaterThanOrEqual(before.stage);
      expect(rank[spec.tier]).toBeGreaterThanOrEqual(before.tier);
      before = { ...before, stage: spec.stage, tier: rank[spec.tier] };
    }
    expect(arcadeLevel(40, MAX_STAGE)).toMatchObject({ stage: MAX_STAGE, tier: 'H', index: 11 });
  });

  it('stays inside the stages the player has opened', () => {
    for (let level = 1; level <= 60; level++) expect(arcadeLevel(level, 3).stage).toBeLessThanOrEqual(3);
  });

  it('every level is a puzzle the generator can make', () => {
    for (let level = 1; level <= 30; level++) {
      const { stage, tier, index } = arcadeLevel(level, MAX_STAGE);
      const made = generatePuzzle({ version: '1', stage, tier, seed: level * 7919 }, index);
      expect(made.ok).toBe(true);
      if (made.ok) expect(made.puzzle.diffs.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('the signal meter', () => {
  it('drains faster as the levels go by, up to a limit', () => {
    expect(drain(1)).toBe(1);
    expect(drain(10)).toBeGreaterThan(drain(1));
    expect(drain(500)).toBe(2.5);
  });

  it('a quick clean match gives back more than it cost', () => {
    // Ten seconds of listening on level 1, one click, a match.
    expect(refill(1, true)).toBeGreaterThan(10 * drain(1));
    // A wasted click costs something, but less than a match gives.
    expect(WASTED_COST).toBeGreaterThan(0);
    expect(refill(1, false)).toBeGreaterThan(WASTED_COST);
    expect(refill(8, true)).toBeLessThan(SIGNAL_MAX);
  });
});

describe('arcade points', () => {
  it('pays more for bigger puzzles, for speed and for a streak', () => {
    expect(points(3, 60, 0)).toBeGreaterThan(points(1, 60, 0));
    expect(points(2, 5, 0)).toBeGreaterThan(points(2, 60, 0));
    expect(points(2, 60, 2)).toBeGreaterThan(points(2, 60, 0));
    // Past its expected time a level earns no speed bonus, and loses nothing for it either.
    expect(points(2, parSeconds(2) + 30, 0)).toBe(points(2, parSeconds(2), 0));
  });

  it('caps the streak multiplier', () => {
    expect(multiplier(0)).toBe(1);
    expect(multiplier(2)).toBe(2);
    expect(multiplier(50)).toBe(4);
  });
});
