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
  { id: 107, title: 'Sliding bass', artist: 'A bass line with two notes held into the next', group: 'folk', pd: true, bpm: 112, sure: 3, fixed: true,
    notes: 'A1:2 A1:2 C2:2_ D2:2 A1:2 G1:2_ A1:4' },
  { id: 108, title: 'Singing lead', artist: 'A slow line with leaps', group: 'folk', pd: true, bpm: 84, sure: 3, fixed: true,
    notes: 'E4:4 A4:4_ B4:4 E5:4 | D5:6 B4:2_ A4:8' },
  { id: 109, title: 'Four chords', artist: 'Three-note chords, a bar each', group: 'folk', pd: true, bpm: 90, sure: 3, fixed: true,
    notes: 'A2+C3+E3:16 | F2+A2+C3:16 | C3+E3+G3:16 | G2+B2+D3:16' },
  { id: 110, title: 'Acid line', artist: 'Sixteen steps with accents and slides', group: 'folk', pd: true, bpm: 122, sure: 3, fixed: true,
    notes: 'A1@1 A1@0.45 A2@0.45_ A1@0.45 C2@1 A1@0.45 -:1 G1@0.45_ A1@0.45 A1@0.45 E2@1_ D2@0.45 C2@0.45 -:1 A1@1 A2@0.45' },
  { id: 111, title: 'Acid line, recorded', artist: 'The acid line with a cutoff move recorded across the bar', group: 'folk', pd: true, bpm: 122, sure: 3, fixed: true,
    notes: 'A1@1^-1.5 A1@0.45^-1.5 A2@0.45^-1_ A1@0.45^-1 C2@1^-0.5 A1@0.45^-0.5 -:1 G1@0.45^0_ A1@0.45^0.5 A1@0.45^0.5 E2@1^1_ D2@0.45^1 C2@0.45^1.5 -:1 A1@1^2 A2@0.45^-1.5' },
  { id: 112, title: 'Plucked line', artist: 'Short notes in a rising and falling figure', group: 'folk', pd: true, bpm: 104, sure: 3, fixed: true,
    notes: 'C3:2 G3:2 C4:2 G3:2 Eb4:2 C4:2 Bb3:2 G3:2' },
];
