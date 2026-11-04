// Riff notation: compact text on a sixteenth-note grid.
//
//   E2:2 -:2 G2 A#2:3 | Bb2:8
//
// `Pitch:length` with the length in sixteenths (1 if omitted), `-` for a rest,
// then, for the course's own loops, `@0.5` for how hard the note is struck
// (velocity, 0 to 1; 1 if omitted), `~1` for how hard it is leaned on once
// down (pressure, rising through the note; 0 if omitted) and a closing `_`
// for a note held until the next one starts, which is then played legato.
// `^1.5` moves the cutoff for that note, in octaves (a recorded knob lane).
// `A3+C4+E4:16` is a chord: a monophonic synth plays its first note, a
// paraphonic one all of them,
// and an optional `|` that must fall on a bar line (a cheap check against
// miscounting). A note may cross a bar line; just leave the `|` out there.

export interface RiffNote {
  /** Onset, in sixteenths from the start of the loop. */
  start: number;
  /** Length in sixteenths. */
  len: number;
  midi: number;
  /** How hard it is struck, 0 to 1. */
  vel?: number;
  /** How hard it is leaned on once down, 0 to 1. */
  press?: number;
  /** Held until the next note starts, so the next is played legato. */
  slur?: boolean;
  /** A chord: the other notes, as semitones above (or below) `midi`. */
  chord?: number[];
  /** The cutoff lane's value on this note, in octaves. */
  lane?: number;
}

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiOf(name: string): number | null {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + SEMITONE[m[1]] + accidental;
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface ParsedNotation {
  notes: RiffNote[];
  /** Total length in sixteenths. */
  length: number;
}

/** Throws with a message naming the bad token; riffs are authored, not user input. */
export function parseNotation(text: string, bar = 16): ParsedNotation {
  const notes: RiffNote[] = [];
  let pos = 0;
  for (const token of text.trim().split(/\s+/)) {
    if (token === '|') {
      if (pos % bar !== 0) throw new Error(`bar line at sixteenth ${pos}, not on a bar of ${bar}`);
      continue;
    }
    const m = /^([^:@~_^]+)(?::(\d+))?(?:@([\d.]+))?(?:~([\d.]+))?(?:\^(-?[\d.]+))?(_)?$/.exec(token);
    if (!m) throw new Error(`bad token "${token}"`);
    const [, name, lenText, velText, pressText, laneText, slur] = m;
    const len = lenText == null ? 1 : Number(lenText);
    if (!Number.isInteger(len) || len < 1) throw new Error(`bad length in "${token}"`);
    if (name !== '-') {
      const pitches = name.split('+').map(midiOf);
      if (pitches.some((p) => p == null)) throw new Error(`bad pitch in "${token}"`);
      const midi = pitches[0]!;
      const note: RiffNote = { start: pos, len, midi };
      if (pitches.length > 1) note.chord = pitches.slice(1).map((p) => p! - midi);
      if (velText != null) note.vel = Number(velText);
      if (pressText != null) note.press = Number(pressText);
      if (slur) note.slur = true;
      if (laneText != null) note.lane = Number(laneText);
      if (!(note.vel == null || (note.vel >= 0 && note.vel <= 1)) || !(note.press == null || (note.press >= 0 && note.press <= 1))) throw new Error(`velocity or pressure out of 0 to 1 in "${token}"`);
      notes.push(note);
    }
    pos += len;
  }
  if (notes.length === 0) throw new Error('riff has no notes');
  if (pos % bar !== 0) throw new Error(`length ${pos} is not a whole number of ${bar}-sixteenth bars`);
  return { notes, length: pos };
}
