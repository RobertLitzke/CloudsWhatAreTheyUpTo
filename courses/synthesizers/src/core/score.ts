// Scoring. A move is one detent of one knob. Every puzzle has a goal: a number
// of moves fixed when the puzzle is generated and hidden until the player
// commits. The score is moves against goal; there is no limit on moves, and
// going over the goal is simply a worse score. Committing with knobs still
// wrong adds two penalty moves per remaining step, so fixing always beats
// leaving. A parameter is scored when the stage has unlocked it and it can be
// heard in the TARGET (pulse width counts only if the target is a pulse). It is
// the target that decides, never the player's own patch: otherwise leaving the
// wave wrong would silence the knobs that depend on it and be the cheaper play.

import type { Puzzle } from './gen/types';
import { CATEGORIES, PARAMS, resolve, type Category, type ParamId, type Patch } from './params';

export const PENALTY_PER_STEP = 2;

/** Moves between two positions: steps on a knob, one for a selector. */
export function stepsApart(id: ParamId, a: number, b: number): number {
  if (a === b) return 0;
  return PARAMS[id].kind === 'selector' ? 1 : Math.abs(a - b);
}

/** The parameters a puzzle scores: unlocked, and audible in the target. */
export function scoredParams(puzzle: Puzzle): ParamId[] {
  const sound = resolve(puzzle.target, puzzle.rules.steps);
  return puzzle.unlocked.filter((id) => puzzle.rules.active(id, sound));
}

export interface PuzzleScore {
  moves: number;
  /** Signed error per scored parameter that is still off: yours minus the target. */
  remaining: Partial<Record<ParamId, number>>;
  remainingSteps: number;
  penalty: number;
  total: number;
  goal: number;
  /** total − goal. */
  diff: number;
}

/**
 * How many moves each scored knob of `patch` is from matching the target.
 * Knobs that match, or sit somewhere that sounds the same, are left out.
 */
export function stepsLeft(puzzle: Puzzle, patch: Patch): Partial<Record<ParamId, number>> {
  const sound = resolve(puzzle.target, puzzle.rules.steps);
  const out: Partial<Record<ParamId, number>> = {};
  for (const id of puzzle.unlocked) {
    if (!puzzle.rules.active(id, sound) || puzzle.rules.alike(id, patch[id], puzzle.target[id], sound)) continue;
    out[id] = stepsApart(id, patch[id], puzzle.target[id]);
  }
  return out;
}

export function scorePuzzle(puzzle: Puzzle, final: Patch, moves: number): PuzzleScore {
  const remaining: Partial<Record<ParamId, number>> = {};
  let remainingSteps = 0;
  for (const [id, steps] of Object.entries(stepsLeft(puzzle, final)) as [ParamId, number][]) {
    remaining[id] = final[id] - puzzle.target[id];
    remainingSteps += steps;
  }
  const penalty = PENALTY_PER_STEP * remainingSteps;
  const total = moves + penalty;
  return { moves, remaining, remainingSteps, penalty, total, goal: puzzle.goal, diff: total - puzzle.goal };
}

/** "2 under", "On goal", "3 over": a score against the goal in words. */
export function resultName(diff: number): string {
  if (diff === 0) return 'On goal';
  return diff < 0 ? `${-diff} under` : `${diff} over`;
}

/** "−3", "0", "+2": a score against the goal as a number. */
export function formatDiff(diff: number): string {
  if (diff === 0) return '0';
  return diff < 0 ? `−${-diff}` : `+${diff}`;
}

/** "2 steps too dark", "wrong wave". */
export function describeError(id: ParamId, signed: number): string {
  const spec = PARAMS[id];
  if (spec.kind === 'selector') return 'wrong setting';
  const n = Math.abs(signed);
  return `${n} step${n === 1 ? '' : 's'} too ${signed < 0 ? spec.low : spec.high}`;
}

/** "a", "a and b", "a, b and c". */
function listOf(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function tally(ids: readonly ParamId[]): string {
  const counts = new Map<Category, number>();
  for (const id of ids) counts.set(PARAMS[id].category, (counts.get(PARAMS[id].category) ?? 0) + 1);
  return listOf([...counts].map(([c, n]) => `${CATEGORIES[c]} ×${n}`));
}

/** The one-line account shown after commit. */
export function diagnosis(puzzle: Puzzle, movesBy: Partial<Record<ParamId, number>>): string {
  const first = `The difference${puzzle.diffs.length === 1 ? ' was' : 's were'} ${tally(puzzle.diffs)}.`;
  const stray = new Map<Category, number>();
  for (const [id, n] of Object.entries(movesBy) as [ParamId, number][]) {
    if (n > 0 && !puzzle.diffs.includes(id)) {
      stray.set(PARAMS[id].category, (stray.get(PARAMS[id].category) ?? 0) + n);
    }
  }
  if (stray.size === 0) return first;
  const spent = [...stray].map(([c, n]) => `${n} move${n === 1 ? '' : 's'} on ${CATEGORIES[c]}`);
  return `${first} You also spent ${listOf(spent)} where nothing was wrong.`;
}
