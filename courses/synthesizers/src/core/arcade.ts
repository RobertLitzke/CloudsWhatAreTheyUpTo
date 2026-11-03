// Arcade: the same puzzles, played as a run. There is no commit and no goal.
// A level ends by itself the moment the patch matches, and the next one starts.
// What is at stake is the signal meter: it drains while a level is being
// played, a knob click that brings the patch no closer drains it further, and
// a match puts some back. When it is empty the run is over.
//
// Every number here is a first guess, to be tuned by playing.

import type { Tier } from './key';

export const SIGNAL_MAX = 100;

/** Which puzzle a level is: the stage it draws on, how hard, and which of a round's twelve it is shaped like. */
export interface ArcadeLevel {
  stage: number;
  tier: Tier;
  /** Index into a round, which is what sets how many knobs differ. */
  index: number;
}

/**
 * The ramp. Modules arrive every two levels, up to the last stage the player
 * has opened. Knobs different go 1 1 1 2 2 2 2 3 on easy differences, then
 * 3 3 3 3 4 4 4 4 on normal ones, then 4 4 4 and 5 from there on with the
 * subtle differences of the hard tier.
 */
export function arcadeLevel(level: number, lastStage: number): ArcadeLevel {
  const n = Math.max(0, level - 1);
  const stage = Math.min(lastStage, 1 + Math.floor(n / 2));
  if (n < 8) return { stage, tier: 'E', index: n };
  if (n < 16) return { stage, tier: 'N', index: n - 4 };
  return { stage, tier: 'H', index: Math.min(11, n - 11) };
}

/** Signal lost per second while a level is being played. */
export function drain(level: number): number {
  return Math.min(2.5, 1 + 0.06 * (level - 1));
}

/** Signal lost to a click that left the patch no closer to the target. */
export const WASTED_COST = 6;

/** Signal a match puts back. A puzzle with more to fix took longer, and gives more. */
export function refill(turns: number, clean: boolean): number {
  return 22 + 2 * turns + (clean ? 8 : 0);
}

/** Seconds a level is expected to take; finishing inside it earns the speed bonus. */
export function parSeconds(turns: number): number {
  return 10 + 6 * turns;
}

/** How much a streak of clean levels multiplies a level's points by. */
export function multiplier(streak: number): number {
  return Math.min(4, 1 + 0.5 * streak);
}

/**
 * Points for a matched level.
 *
 * @param turns   the fewest moves the puzzle could be solved in
 * @param seconds how long it took
 * @param streak  clean levels in a row before this one
 */
export function points(turns: number, seconds: number, streak: number): number {
  const speed = Math.max(0, parSeconds(turns) - seconds) * 5;
  return Math.round((100 + 40 * turns + speed) * multiplier(streak));
}
