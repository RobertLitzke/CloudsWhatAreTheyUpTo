// Shorthands for figures that build circuits: a wire between two nodes, and
// the corners of a rectangular loop.

import type { P } from 'didactics/draw';
import type { Part } from 'circuit-kit/parts';

export type Wire = Extract<Part, { kind: 'wire' }>;

/** A plain wire, or one with a little resistance (a joint, a trace) or a lot (a break). */
export const wire = (id: string, a: string, b: string, ohms?: number): Wire => ({ id, kind: 'wire', a, b, ...(ohms ? { ohms } : {}) });

/** The resistance a broken wire, cracked joint or lifted pad is given: open, to any meter. */
export const OPEN = 1e9;

export type { P };
