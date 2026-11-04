// The arpeggiator's order, as arithmetic: which note of a held chord plays at
// each step. The voice (for loops) and the engine (for the keyboard) both ask
// here, so a pattern is the same wherever it is played.

import { ARP_MODE } from './params';

/**
 * The notes one pass of the pattern visits, in order: the held notes (in the
 * order played) sorted as the mode says, then repeated an octave up for each
 * extra octave. Down starts from the top octave.
 */
export function arpSequence(played: readonly number[], mode: number, octaves: number): number[] {
  const notes = [...new Set(played)];
  const sorted = mode === ARP_MODE.order ? notes : [...notes].sort((a, b) => a - b);
  const span: number[] = [];
  for (let k = 0; k < Math.max(1, Math.round(octaves)); k++) for (const n of sorted) span.push(n + 12 * k);
  return mode === ARP_MODE.down ? span.reverse() : span;
}

/** The note at step `i` of a pattern; Random draws from it, the same way for the same `seed` and step. */
export function arpPick(seq: readonly number[], mode: number, i: number, seed = 0): number {
  if (mode !== ARP_MODE.random) return seq[i % seq.length];
  let h = (seed * 2654435761 + i * 40503 + 12345) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return seq[h % seq.length];
}
