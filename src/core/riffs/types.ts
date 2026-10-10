import type { RiffNote } from './notation';

export type RiffGroup = 'electronic' | 'pop' | 'rock' | 'pearl-jam' | 'iron-wine' | 'folk';

/** A riff as authored. */
export interface RiffSource {
  /** Permanent. Keys name riffs by id, so never renumber and never reuse. */
  id: number;
  title: string;
  artist: string;
  group: RiffGroup;
  /** Public domain: safe in a build that ships to the public. */
  pd?: boolean;
  /** Quarter notes per minute. */
  bpm: number;
  /** Sixteenths per bar: 16 for 4/4 (the default), 12 for 6/8 and 3/4. */
  bar?: number;
  /** How far to trust the transcription: 3 confident, 2 roughly right, 1 a guess. */
  sure: 1 | 2 | 3;
  notes: string;
}

/** A riff ready to play and to reason about. */
export interface Riff {
  id: number;
  title: string;
  artist: string;
  group: RiffGroup;
  pd: boolean;
  bpm: number;
  bar: number;
  sure: 1 | 2 | 3;
  /** Notes moved by whole octaves into the common register. */
  notes: RiffNote[];
  /** Loop length in sixteenths. */
  length: number;
  bars: number;
  /** Seconds per sixteenth. */
  six: number;
  /** Longest time a note is held, in seconds. */
  longest: number;
  /** Longest silence between one note's end and the next note's start, in seconds. */
  gap: number;
}
