// The tutorial series: nine lessons of a workbook, seven of training and two on
// cloud seeding. Each lesson is a short
// illustrated article in the manner of an interactive explainer: paragraphs
// and live figures to play with. A lesson comes in parts; the next part opens
// once the figures in this one have had their small task done. The last part
// is a check, and the lesson ends with the log. (In the code a lesson is still
// called a shift, from an earlier story.)
//
// The lessons tell no story; the story is in the radio talks, core/talk.ts.
//
// Each lesson's words are in a JSON file in data/shifts, one per lesson.
//
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, and [[words|colour]] to tie a word to the same colour in a figure.

import type { GenusId } from './clouds';
import fog from '../data/shifts/fog.json';
import heaps from '../data/shifts/heaps.json';
import lowSky from '../data/shifts/low-sky.json';
import middleSky from '../data/shifts/middle-sky.json';
import iceRealm from '../data/shifts/ice-realm.json';
import giants from '../data/shifts/giants.json';
import front from '../data/shifts/front.json';
import seeding from '../data/shifts/seeding.json';
import seedingLimits from '../data/shifts/seeding-limits.json';

export const FIGURE_IDS = [
  'jar', 'parcel', 'freezing', 'iceGrowth', 'thermals', 'sounding', 'nudge', 'night', 'spread', 'drops', 'sunThrough', 'hand', 'shadow',
  'streaks', 'prism', 'halo', 'front', 'storm', 'flash', 'wave', 'billow', 'mamma', 'sort', 'names', 'radioCheck', 'forecast',
  'molecules', 'expand', 'stability', 'heap', 'dayNight', 'fogStratus',
  'edges', 'nameGrid', 'layerKinds', 'subsidence', 'million', 'collide', 'depth',
  'specks', 'inversion', 'burnOff', 'latent', 'kettle', 'density',
  'glide', 'overturn', 'freezeSeeds', 'escape', 'snowToRain', 'tropopause', 'charge',
  'lowMap', 'barometer', 'frontPass', 'slope', 'crossedWinds', 'rainShadow',
  'coldBox', 'dryIce', 'lattice', 'seedLayer', 'cloudWater', 'seedWindow', 'trial',
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type Block =
  /** A paragraph of the article. */
  | { kind: 'text'; text: string }
  /** The few ideas to hold on to, as a short list set apart from the article. */
  | { kind: 'key'; title: string; points: string[] }
  /** A live figure. `task` says what to do with it; `goal` tells the figure when it is done. */
  | { kind: 'figure'; figure: FigureId; caption: string; task?: string; goal?: string; options?: Record<string, unknown> };

export interface Part {
  title: string;
  blocks: Block[];
}

/** A forecasting question: a sky over some hours, and what it is up to. */
export interface Forecast {
  /** Set on a question someone in town asks over the radio (core/talk.ts locals); these come last. */
  id?: string;
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
  /** The clouds drawn over the fields at the top of the lesson: the ones it introduces, or the ones it is about. */
  sky: GenusId[];
  /** Training, or the lessons on cloud seeding that come after it. */
  book: 'training' | 'seeding';
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
function fromJson(file: ShiftFile, clouds: GenusId[], more: { sky?: GenusId[]; book?: Shift['book'] } = {}): Shift {
  return {
    id: file.id,
    n: file.n,
    title: file.title,
    clouds,
    sky: more.sky ?? clouds,
    book: more.book ?? 'training',
    teaches: file.teaches,
    parts: file.parts as Part[],
    learned: file.learned,
    next: file.next,
    journal: Object.keys(file.journal),
  };
}

export const SHIFTS: readonly Shift[] = [
  // -------------------------------------------------------------------------
  fromJson(fog, ['stratus']),
  fromJson(heaps, ['cumulus']),
  fromJson(lowSky, ['stratocumulus']),
  fromJson(middleSky, ['altocumulus', 'altostratus']),
  fromJson(iceRealm, ['cirrus', 'cirrostratus', 'cirrocumulus', 'nimbostratus']),
  fromJson(giants, ['cumulonimbus']),
  // These meet no new clouds: they put the ones already met to work.
  fromJson(front, [], { sky: ['cirrostratus', 'altostratus', 'cumulonimbus'] }),
  fromJson(seeding, [], { sky: ['altocumulus', 'stratus'], book: 'seeding' }),
  fromJson(seedingLimits, [], { sky: ['cumulus', 'altocumulus'], book: 'seeding' }),
];

export function shiftById(id: string): Shift | undefined {
  return SHIFTS.find((s) => s.id === id);
}

/** Journal entries and what they say. Shifts unlock them by id. Rare ones are the clouds to stay up for. */
export const JOURNAL: Record<string, { title: string; text: string; rare?: boolean }> = {
  ...fog.journal,
  ...heaps.journal,
  ...lowSky.journal,
  ...middleSky.journal,
  ...iceRealm.journal,
  ...giants.journal,
  ...front.journal,
  ...seeding.journal,
  ...seedingLimits.journal,
};
