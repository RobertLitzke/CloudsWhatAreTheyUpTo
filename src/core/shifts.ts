// The tutorial series, as shifts at the lookout. Each shift is a short
// illustrated article in the manner of an interactive explainer: paragraphs,
// a word from Juniper over the radio now and then, and live figures to play
// with. A shift comes in parts; the next part opens once the figures in this
// one have had their small task done. The last part is a check, and the shift
// ends with the log.
//
// The story: you have taken a summer job as the cloud watcher on Anvil Peak, a
// lookout in the Thunderhead National Forest. Juniper, the district weather
// officer, trains you over the radio. Once training is done the district's
// cloud-seeding programme opens up, and you start making clouds as well as
// reading them.
//
// Each shift's words are in a JSON file in data/shifts, one per shift.
//
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, and [[words|colour]] to tie a word to the same colour in a figure.

import type { GenusId } from './clouds';
import textures from '../data/shifts/textures.json';
import lowSky from '../data/shifts/low-sky.json';
import middleSky from '../data/shifts/middle-sky.json';
import iceRealm from '../data/shifts/ice-realm.json';
import giants from '../data/shifts/giants.json';

export const FIGURE_IDS = [
  'jar', 'parcel', 'freezing', 'iceGrowth', 'thermals', 'sounding', 'nudge', 'night', 'spread', 'drops', 'sunThrough', 'hand', 'shadow',
  'streaks', 'prism', 'halo', 'front', 'storm', 'flash', 'wave', 'billow', 'mamma', 'sort', 'names', 'radioCheck', 'forecast',
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type Speaker = 'juniper' | 'you';

export type Block =
  /** A paragraph of the article. */
  | { kind: 'text'; text: string }
  /** A word over the radio, set apart from the article. */
  | { kind: 'radio'; who: Speaker; text: string }
  /** A live figure. `task` says what to do with it; `goal` tells the figure when it is done. */
  | { kind: 'figure'; figure: FigureId; caption: string; task?: string; goal?: string; options?: Record<string, unknown> };

export interface Part {
  title: string;
  blocks: Block[];
}

/** A forecasting question: a sky over some hours, and what it is up to. */
export interface Forecast {
  /** The sky over the hours, oldest first; one drawing per entry. */
  sky: { genus: GenusId; when: string }[];
  question: string;
  options: string[];
  answer: number;
  why: string;
}

export interface Shift {
  id: string;
  n: number;
  title: string;
  /** The clouds this shift introduces. */
  clouds: GenusId[];
  /** One line for the shift board. */
  teaches: string;
  parts: Part[];
  /** What was learned, written into the log. */
  learned: string[];
  next: string;
  /** Journal entries this shift unlocks. */
  journal: string[];
}

/**
 * A shift whose words live in a JSON file in data/shifts, so they can be edited
 * outside the code. The file holds everything but the clouds the shift
 * introduces; its journal entries are merged into JOURNAL below. The content
 * tests check the files' shape, since JSON has no types of its own.
 */
interface ShiftFile {
  id: string;
  n: number;
  title: string;
  teaches: string;
  parts: unknown[];
  learned: string[];
  next: string;
  journal: Record<string, { title: string; text: string; rare?: boolean }>;
}
function fromJson(file: ShiftFile, clouds: GenusId[]): Shift {
  return {
    id: file.id,
    n: file.n,
    title: file.title,
    clouds,
    teaches: file.teaches,
    parts: file.parts as Part[],
    learned: file.learned,
    next: file.next,
    journal: Object.keys(file.journal),
  };
}

export const SHIFTS: readonly Shift[] = [
  // -------------------------------------------------------------------------
  fromJson(textures, ['cumulus', 'stratus']),
  fromJson(lowSky, ['stratocumulus']),
  fromJson(middleSky, ['altocumulus', 'altostratus']),
  fromJson(iceRealm, ['cirrus', 'cirrostratus', 'cirrocumulus', 'nimbostratus']),
  fromJson(giants, ['cumulonimbus']),
];

export function shiftById(id: string): Shift | undefined {
  return SHIFTS.find((s) => s.id === id);
}

/** Journal entries and what they say. Shifts unlock them by id. Rare ones are the clouds to stay up for. */
export const JOURNAL: Record<string, { title: string; text: string; rare?: boolean }> = {
  ...textures.journal,
  ...lowSky.journal,
  ...middleSky.journal,
  ...iceRealm.journal,
  ...giants.journal,
};
