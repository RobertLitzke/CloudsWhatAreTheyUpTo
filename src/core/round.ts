// A round is twelve puzzles; its score is total moves against total goal.

import type { PuzzleScore } from './score';

export interface PuzzleRecord {
  /** 0-based puzzle index. */
  index: number;
  riffId: number;
  goal: number;
  moves: number;
  penalty: number;
}

export function toRecord(index: number, riffId: number, score: PuzzleScore): PuzzleRecord {
  return { index, riffId, goal: score.goal, moves: score.moves, penalty: score.penalty };
}

export interface RoundTotals {
  puzzles: number;
  goal: number;
  total: number;
  diff: number;
}

export function totals(records: readonly PuzzleRecord[]): RoundTotals {
  let goal = 0;
  let total = 0;
  for (const r of records) {
    goal += r.goal;
    total += r.moves + r.penalty;
  }
  return { puzzles: records.length, goal, total, diff: total - goal };
}
