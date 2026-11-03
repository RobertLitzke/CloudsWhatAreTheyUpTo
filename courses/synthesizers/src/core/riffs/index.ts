// The riff list, parsed once.
//
// A public-domain-only build (`npm run build:pd`) leaves the copyrighted
// melodies out of the bundle altogether: VITE_RIFFS is replaced at build time,
// the condition below folds to a constant, and the unused import is dropped.

import { FOLK } from './folk';
import { parseNotation, type RiffNote } from './notation';
import { PATTERNS } from './patterns';
import { POPULAR } from './popular';
import type { Riff, RiffSource } from './types';

export type { Riff, RiffGroup, RiffSource } from './types';
export type { RiffNote } from './notation';

export const PD_ONLY: boolean = import.meta.env.VITE_RIFFS === 'pd';

/** The riffs as authored, for the audition page. */
export const SOURCES: readonly RiffSource[] = import.meta.env.VITE_RIFFS === 'pd' ? FOLK : [...POPULAR, ...FOLK];

/**
 * Every riff is moved by whole octaves so its average pitch sits near A3. A
 * bass line and a lead line then meet the filter at the same place, so a cutoff
 * step means the same thing on every riff, and nothing sits below what a phone
 * speaker can reproduce.
 */
const REGISTER_CENTRE = 57;

/** Fraction of a note's length it sounds for, capped so long notes stay long. */
export function gateSixteenths(len: number): number {
  return len - Math.min(0.25 * len, 0.5);
}

export interface TimedNote {
  /** Seconds from the start of the loop. */
  on: number;
  off: number;
  midi: number;
  /** How hard it is struck (1 unless the riff says) and leaned on (0 unless it says). */
  vel?: number;
  press?: number;
}

export function timedNotes(riff: Riff): TimedNote[] {
  return riff.notes.map((n) => ({
    on: n.start * riff.six,
    off: (n.start + gateSixteenths(n.len)) * riff.six,
    midi: n.midi,
    vel: n.vel ?? 1,
    press: n.press ?? 0,
  }));
}

export function buildRiff(src: RiffSource): Riff {
  const bar = src.bar ?? 16;
  const parsed = parseNotation(src.notes, bar);
  const mean = parsed.notes.reduce((sum, n) => sum + n.midi, 0) / parsed.notes.length;
  const shift = src.fixed ? 0 : 12 * Math.round((REGISTER_CENTRE - mean) / 12);
  const notes: RiffNote[] = parsed.notes.map((n) => ({ ...n, midi: n.midi + shift }));
  const six = 60 / src.bpm / 4;

  let longest = 0;
  let gap = 0;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const held = gateSixteenths(n.len);
    longest = Math.max(longest, held * six);
    const next = i + 1 < notes.length ? notes[i + 1].start : notes[0].start + parsed.length;
    gap = Math.max(gap, (next - n.start - held) * six);
  }

  return {
    id: src.id,
    title: src.title,
    artist: src.artist,
    group: src.group,
    pd: src.pd === true,
    bpm: src.bpm,
    bar,
    sure: src.sure,
    notes,
    length: parsed.length,
    bars: parsed.length / bar,
    six,
    longest,
    gap,
  };
}

export const RIFFS: readonly Riff[] = SOURCES.map(buildRiff);

/** Loops written for the course's lessons: drum patterns and held notes. Not in the game's riff list. */
export const LESSON_LOOPS: readonly Riff[] = PATTERNS.map(buildRiff);

const BY_ID = new Map([...RIFFS, ...LESSON_LOOPS].map((r) => [r.id, r]));

export function riffById(id: number): Riff | undefined {
  return BY_ID.get(id);
}
