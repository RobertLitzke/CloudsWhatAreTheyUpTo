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
  { id: 105, title: 'Soft to hard', artist: 'One note, struck harder each time', group: 'folk', pd: true, bpm: 100, sure: 3, fixed: true,
    notes: 'A2:2@0.1 A2:2@0.25 A2:2@0.4 A2:2@0.55 A2:2@0.7 A2:2@0.85 A2:4@1' },
  { id: 106, title: 'Leaning in', artist: 'Two held notes, pressed harder as they go on', group: 'folk', pd: true, bpm: 90, sure: 3, fixed: true,
    notes: 'A3:16@0.5~1 | E3:16@1~1' },
];
