// Loops for the course's own lessons, not the game's: a drum pattern on a low
// note, a backbeat, long held notes for noise to blow through. They are not
// tunes, so they are no one's copyright, and they are not in the riff list the
// game and the Synth lab choose from. Ids from 101 up never meet a riff's.

import type { RiffSource } from './types';

export const PATTERNS: readonly RiffSource[] = [
  { id: 101, title: 'Four on the floor', artist: 'A kick on every beat', group: 'folk', pd: true, bpm: 120, sure: 3, fixed: true,
    notes: 'E2:4 E2:4 E2:4 E2:4' },
  { id: 102, title: 'Backbeat', artist: 'A snare on beats two and four', group: 'folk', pd: true, bpm: 120, sure: 3, fixed: true,
    notes: '-:4 E3:4 -:4 E3:4' },
  { id: 103, title: 'Long notes', artist: 'Two held notes', group: 'folk', pd: true, bpm: 90, sure: 3, fixed: true,
    notes: 'A3:16 | E3:16' },
  { id: 104, title: 'Three octaves', artist: 'One note, low to high', group: 'folk', pd: true, bpm: 100, sure: 3, fixed: true,
    notes: 'A1:4 A2:4 A3:4 A4:4' },
];
