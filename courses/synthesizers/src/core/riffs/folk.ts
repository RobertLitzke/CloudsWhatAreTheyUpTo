// Public-domain folk tunes: the traditional melody's opening phrase, never a
// later recording's arrangement. These are the whole riff list of a
// public-domain-only build.
//
// `sure` means the same as in popular.ts. Ids are permanent.
// A `bar` of 12 is 6/8 or 3/4 (twelve sixteenths to the bar); `bpm` always
// counts quarter notes, so a jig at 170 has 340 eighths a minute.

import type { RiffSource } from './types';

export const FOLK: readonly RiffSource[] = [
  { id: 57, title: 'Greensleeves', artist: 'Traditional (England)', group: 'folk', pd: true, bpm: 90, bar: 12, sure: 3,
    notes: 'C5:4 D5:2 E5:3 F5 E5:2 | D5:4 B4:2 G4:3 A4 B4:2 | C5:4 A4:2 A4:3 G#4 A4:2 | B4:4 G#4:2 E4:4 A4:2' },
  { id: 58, title: 'Scarborough Fair', artist: 'Traditional (England)', group: 'folk', pd: true, bpm: 110, bar: 12, sure: 3,
    notes: 'D4:8 D4:4 | A4:8 A4:4 | E4:6 F4:2 E4:4 | D4:12' },
  { id: 59, title: 'The House of the Rising Sun', artist: 'Traditional (USA)', group: 'folk', pd: true, bpm: 80, bar: 12, sure: 1,
    notes: 'A4:6 C5:2 D5:4 | E5:8 G5:4 | E5:6 D5:2 C5:4 | A4:10 E4:2' },
  { id: 60, title: 'Shady Grove', artist: 'Traditional (Appalachia)', group: 'folk', pd: true, bpm: 120, sure: 2,
    notes: 'D4:2 D4:2 F4:4 G4:2 A4:2 G4:2 F4:2 | D4:2 D4:2 F4:4 G4:4 A4:4 | D4:2 D4:2 F4:4 G4:2 A4:2 G4:2 F4:2 | C4:2 D4:2 F4:2 D4:2 D4:8' },
  { id: 61, title: 'Drunken Sailor', artist: 'Traditional (sea shanty)', group: 'folk', pd: true, bpm: 110, sure: 3,
    notes: 'A4:2 A4 A4 A4:2 A4 A4 A4:2 D4:2 F4:2 A4:2 | G4:2 G4 G4 G4:2 G4 G4 G4:2 C4:2 E4:2 G4:2 | A4:2 A4 A4 A4:2 A4 A4 A4:2 B4:2 C5:2 D5:2 | C5:2 A4:2 G4:2 E4:2 D4:4 D4:4' },
  { id: 62, title: 'Wellerman', artist: 'Traditional (New Zealand)', group: 'folk', pd: true, bpm: 100, sure: 2,
    notes: 'A4:2 A4 A4 A4:2 C5:2 E5:2 E5:2 E5:4 | F5:2 F5 F5 F5:2 A5:2 E5:2 E5:2 E5:4 | A4:2 A4 A4 A4:2 C5:2 E5:2 E5:2 E5:4 | E5:2 E5:2 D5:2 C5:2 B4:4 A4:4' },
  { id: 63, title: 'Star of the County Down', artist: 'Traditional (Ireland)', group: 'folk', pd: true, bpm: 120, sure: 2,
    notes: 'E4:4 E4:2 D4:2 E4:4 G4:2 A4:2 | B4:4 A4:2 G4:2 E4:4 D4:2 B3:2' },
  { id: 64, title: 'Swallowtail Jig', artist: 'Traditional (Ireland)', group: 'folk', pd: true, bpm: 170, bar: 12, sure: 3,
    notes: 'G4:2 E4:2 E4:2 B4:2 E4:2 E4:2 | G4:2 E4:2 E4:2 B4:2 A4:2 G4:2 | F#4:2 D4:2 D4:2 A4:2 D4:2 D4:2 | D5:2 C#5:2 D5:2 A4:2 G4:2 F#4:2' },
  { id: 65, title: 'The Irish Washerwoman', artist: 'Traditional (Ireland)', group: 'folk', pd: true, bpm: 170, bar: 12, sure: 3,
    notes: 'B4:2 G4:2 G4:2 D4:2 G4:2 G4:2 | B4:2 G4:2 B4:2 D5:2 C5:2 B4:2 | C5:2 A4:2 A4:2 E4:2 A4:2 A4:2 | C5:2 A4:2 C5:2 E5:2 D5:2 C5:2' },
  { id: 66, title: 'Drowsy Maggie', artist: 'Traditional (Ireland)', group: 'folk', pd: true, bpm: 105, sure: 3,
    notes: 'E4:4 B4:2 E4:2 D5:2 E4:2 B4:2 E4:2 | E4:4 B4:2 E4:2 A4:2 F#4:2 D4:2 F#4:2 | E4:4 B4:2 E4:2 D5:2 E4:2 B4:2 E4:2 | B4:2 A4:2 B4:2 C#5:2 D5:2 A4:2 F#4:2 D4:2' },
  { id: 67, title: "Sailor's Hornpipe", artist: 'Traditional (England)', group: 'folk', pd: true, bpm: 110, sure: 1,
    notes: 'G5:4 G4:4 G4:4 B4:2 D5:2 | G5:2 F#5:2 G5:2 A5:2 B5:2 A5:2 G5:2 D5:2' },
  { id: 68, title: 'Old Joe Clark', artist: 'Traditional (Appalachia)', group: 'folk', pd: true, bpm: 120, sure: 1,
    notes: 'E5:2 F#5:2 G5:2 G5:2 F#5:2 E5:2 D5:4 | E5:2 F#5:2 G5:2 G5:2 F#5:2 E5:2 E5:4' },
  { id: 69, title: 'Korobeiniki', artist: 'Traditional (Russia)', group: 'folk', pd: true, bpm: 140, sure: 3,
    notes: 'E5:4 B4:2 C5:2 D5:4 C5:2 B4:2 | A4:4 A4:2 C5:2 E5:4 D5:2 C5:2 | B4:6 C5:2 D5:4 E5:4 | C5:4 A4:4 A4:8' },
  { id: 70, title: 'Kalinka', artist: 'Traditional (Russia)', group: 'folk', pd: true, bpm: 120, sure: 2,
    notes: 'D5:4 B4:2 C5:2 D5:4 B4:2 C5:2 | D5:2 C5:2 B4:2 A4:2 A4:4 E5:4 | D5:4 B4:2 C5:2 D5:4 B4:2 C5:2 | D5:2 C5:2 B4:2 A4:2 A4:8' },
  { id: 71, title: 'Hava Nagila', artist: 'Traditional (Jewish)', group: 'folk', pd: true, bpm: 120, sure: 2,
    notes: 'E4:6 E4:2 G#4:2 F4:2 E4:4 | G#4:6 G#4:2 B4:2 A4:2 G#4:4 | A4:6 A4:2 C5:2 B4:2 A4:4 | G#4:2 F4:2 E4:4 E4:8' },
  { id: 72, title: 'Sakura Sakura', artist: 'Traditional (Japan)', group: 'folk', pd: true, bpm: 100, sure: 3,
    notes: 'A4:4 A4:4 B4:8 | A4:4 A4:4 B4:8 | A4:4 B4:4 C5:4 B4:4 | A4:4 B4:2 A4:2 F4:8' },
];
