// The lessons: short illustrated articles on how circuits work, for someone
// who has soldered and wants to design. Each is paragraphs and live figures to
// play with, in parts; the next part opens once the figures in this one have
// had their small task done. The last part is a check, and the lesson ends
// with a log to sign.
//
// They come in tracks. The core path builds the intuition every circuit
// needs, in order; the pedal and solar tracks branch off it once the core is
// done, and each leans on it. A lesson with no parts is planned and not yet
// written; it shows as coming soon and its route goes home. Each lesson's
// words are a JSON file in data/lessons.
//
// The lesson format and the view that reads it are Didactics' lesson.ts.
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, [[words|colour]] to tie a word to the same colour in a figure, and
// [^id] for a note from the lesson's `footnotes`, which opens in a popup.

import type { Block as KitBlock, Lesson as KitLesson, Part as KitPart } from 'didactics/lesson';
import whatFlows from '../data/lessons/what-flows.json';
import seriesParallel from '../data/lessons/series-parallel.json';
import sources from '../data/lessons/sources.json';
import power from '../data/lessons/power.json';
import signals from '../data/lessons/signals.json';
import capacitors from '../data/lessons/capacitors.json';
import diodes from '../data/lessons/diodes.json';
import switches from '../data/lessons/switches.json';
import amplifiers from '../data/lessons/amplifiers.json';
import deadCircuit from '../data/lessons/dead-circuit.json';
import fuzzFace from '../data/lessons/fuzz-face.json';
import tubeScreamer from '../data/lessons/tube-screamer.json';
import solarPanels from '../data/lessons/solar-panels.json';
import offGrid from '../data/lessons/off-grid.json';

export const FIGURE_IDS = [
  'loop',
  'check',
  // 1 What is actually flowing
  'series-bulbs',
  'true-speed',
  'meter',
  'ohm-target',
  'iv-curve',
  // 2 Series and parallel
  'parallel-bulbs',
  'junction',
  'ranking',
  'cells',
  'broken-wire',
  // 3 Every source has a resistor inside
  'divider',
  'pot',
  'sag',
  'mystery-box',
  'wrong-value',
  // 4 Where the energy goes
  'heat',
  'battery-time',
  'long-wire',
  'fuse',
  'matching',
  'bad-joint',
  // 5 Signals
  'sine',
  'offset',
  'stuck-bias',
  // 6 Things that take time
  'rc-charge',
  'coupling',
  'lowpass',
  'decoupling',
  'kickback',
  'shorted-cap',
  // 7 Curved lines
  'diode-iv',
  'led-resistor',
  'reverse',
  'rectifier',
  'clipper',
  'backwards-led',
  // 8 A small current steering a big one
  'bjt-switch',
  'mosfet-switch',
  'relay',
  'blinker',
  'shorted-transistor',
  // 9 Turning it up
  'bias',
  'gain',
  'follower',
  'opamp-gain',
  'bridged-emitter',
  // 10 The dead circuit
  'two-views',
  'dead-led',
  'wrong-rc',
  'dry-joint',
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type TrackId = 'core' | 'pedals' | 'solar';

export interface Track {
  id: TrackId;
  title: string;
  /** A line on the home page under the title. */
  blurb: string;
}

export const TRACKS: readonly Track[] = [
  { id: 'core', title: 'The core path', blurb: 'How electricity behaves in a circuit, from one battery and a resistor to a populated board. Take these in order.' },
  { id: 'pedals', title: 'Guitar pedals', blurb: 'After the core path: two classic circuits taken apart, with the sound of each knob.' },
  { id: 'solar', title: 'Off-grid solar', blurb: 'After the core path (lesson 9, on amplifiers, can be skipped): panels, batteries and controllers, and wiring them into a system that is safe to leave running.' },
];

export type Block = KitBlock<FigureId>;
export type Part = KitPart<FigureId>;
export interface Lesson extends KitLesson<FigureId> {
  track: TrackId;
}

export const LESSONS: readonly Lesson[] = [
  whatFlows as Lesson,
  seriesParallel as Lesson,
  sources as Lesson,
  power as Lesson,
  signals as Lesson,
  capacitors as Lesson,
  diodes as Lesson,
  switches as Lesson,
  amplifiers as Lesson,
  deadCircuit as Lesson,
  fuzzFace as Lesson,
  tubeScreamer as Lesson,
  solarPanels as Lesson,
  offGrid as Lesson,
];

export const isWritten = (l: Lesson): boolean => l.parts.length > 0;

export function lesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export const lessonsIn = (track: TrackId): Lesson[] => LESSONS.filter((l) => l.track === track);

/** A multiple-choice question in a lesson's check. */
export interface Question {
  question: string;
  options: string[];
  answer: number;
  why: string;
}
