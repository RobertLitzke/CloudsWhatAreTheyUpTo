// The tutorial series: lessons of a workbook, laid out as a tree. The trunk is
// training, from fog to local tricks; branches fork off it (the Pacific coast,
// and more to come), and the 1946 lesson on cloud seeding hangs off the end of
// the trunk as a leaf. Each lesson starts from a question asked of the sky, and is a short
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
// The lesson format and the view that reads it are lesson-kit's lesson.ts.
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, [[words|colour]] to tie a word to the same colour in a figure,
// and [^id] for a footnote from the file's `footnotes` table, which opens in a
// popup (lesson-kit's footnote.ts).

import type { Footnotes } from 'lesson-kit/footnote';
import type { Block as KitBlock, Lesson, Part as KitPart } from 'lesson-kit/lesson';
import type { TreeBranch } from 'lesson-kit/tree';
import type { GenusId } from './clouds';
import fog from '../data/shifts/fog.json';
import lowSky from '../data/shifts/low-sky.json';
import middleSky from '../data/shifts/middle-sky.json';
import iceRealm from '../data/shifts/ice-realm.json';
import giants from '../data/shifts/giants.json';
import front from '../data/shifts/front.json';
import localSky from '../data/shifts/local-sky.json';
import seeding from '../data/shifts/seeding.json';
import wind from '../data/shifts/wind.json';
import coast from '../data/shifts/coast.json';
import rivers from '../data/shifts/rivers.json';

export const FIGURE_IDS = [
  'jar', 'parcel', 'freezing', 'iceGrowth', 'thermals', 'sounding', 'nudge', 'night', 'spread', 'drops', 'sunThrough', 'hand', 'shadow',
  'streaks', 'prism', 'halo', 'front', 'storm', 'flash', 'wave', 'billow', 'mamma', 'sort', 'names', 'radioCheck', 'forecast',
  'molecules', 'expand', 'stability', 'heap', 'dayNight', 'radiators', 'fogStratus',
  'edges', 'nameGrid', 'layerKinds', 'subsidence', 'million', 'collide', 'depth',
  'specks', 'inversion', 'burnOff', 'latent', 'kettle', 'density',
  'glide', 'overturn', 'freezeSeeds', 'haloSight', 'escape', 'snowToRain', 'tropopause', 'charge',
  'lowMap', 'barometer', 'frontPass', 'slope', 'crossedWinds', 'rainShadow', 'buysBallot', 'barograph', 'veer', 'twoFronts', 'occlusion',
  'coldBox', 'dryIce', 'lattice', 'seedLayer', 'cloudWater', 'seedWindow', 'trial',
  'iceSteal', 'iceShortage', 'agentRange', 'fallstreak', 'mountainSeed', 'conveyor', 'fogHole', 'fairTest',
  'radarEcho', 'brightBand', 'stormRadar', 'radarMap', 'frontRadar', 'seedLines',
  'lookAlike',
  'pressureMap', 'turntable', 'spinLatitude', 'windBalance', 'lowHigh', 'jetStream',
  'upwelling', 'pacificHigh', 'marineLayer', 'coastSounding', 'thunderDays',
  'stormTrack', 'atmosphericRiver', 'windward', 'acrossWashington', 'snowLevel', 'convergenceZone',
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type Block = KitBlock<FigureId>;
export type Part = KitPart<FigureId>;

/** A forecasting question: a sky over some hours, and what it is up to. */
export interface Forecast {
  /** Questions with an id come last in the check, after the shuffled ones. */
  id?: string;
  /**
   * The sky over the hours, oldest first; one drawing per entry. Only what the
   * question says has been seen: never a later sky that gives the answer away.
   */
  sky: SkyPanel[];
  /** What the barometer and the wind vane say, shown as readings under the sky. */
  instruments?: string[];
  /** A slice up through the air instead of the sky drawings: the freezing level and the cloud, by height. */
  profile?: Profile;
  question: string;
  options: string[];
  answer: number;
  why: string;
}

/**
 * One drawing in a forecast's sky strip: the cloud, and whatever the question
 * says about it that the bare genus drawing would not show.
 */
export interface SkyPanel {
  /** Left out for a clear sky. */
  genus?: GenusId;
  when: string;
  /** Light: day unless given; night has a moon for a sun. */
  time?: 'dawn' | 'day' | 'dusk' | 'night';
  /** The sun (or moon) as seen through the cloud. Sheets have their own: sharp through cirrostratus, a dim disc through altostratus, gone behind the rest. */
  sun?: 'clear' | 'halo' | 'dim' | 'hidden';
  /** How thick and dark a sheet or deck is, 0 to 1: a thicker sheet is darker, lower, and rains harder. */
  thick?: number;
  /** Heaps: how many, and how big. */
  count?: number;
  size?: 'small' | 'congestus';
  /** Across the sky, −1 (west, on the left) to 1 (east); `far` draws it smaller, away on the horizon. */
  x?: number;
  far?: boolean;
  /** A storm's rain (on unless false), lightning, and dust blown up ahead of it. */
  rain?: boolean;
  lightning?: boolean;
  dust?: boolean;
  /** Ground fog over the fields, hiding the ridges; thin lets the ridge tops show. */
  fog?: 'dense' | 'thin';
  /** A stratus ceiling so low it hides the hilltops, with the fields clear below. */
  low?: boolean;
  /** Streaks that hang from the base and vanish before the ground. */
  virga?: boolean;
  /** A deck that covers the whole sky (decks of cells and heaps; sheets always do). */
  cover?: boolean;
  /** A cloud's shape beyond its genus. */
  shape?: 'castellanus' | 'lenticular' | 'hole' | 'iced';
  contrails?: 'short' | 'wide';
  /** Draw the town, grain elevator and all. */
  town?: boolean;
}

export interface Profile {
  /** Height of the 0 °C level, km; temperatures fall 6.5 °C a km above it. Left out, no freezing level or temperatures are drawn. */
  freezeKm?: number;
  /** Two or more clouds stand side by side; `dark` shades one's base. */
  clouds: { baseKm: number; topKm: number; name: string; dark?: boolean }[];
  /** How high to draw, km. */
  topKm?: number;
  /** A note on the ground, such as "dry air below". */
  ground?: string;
}

/** A lesson (lesson-kit's Lesson shape, which its JSON file holds), with what only Clouds adds. */
export interface Shift extends Lesson<FigureId> {
  /** The clouds this shift introduces. */
  clouds: GenusId[];
  /** The clouds drawn over the fields at the top of the lesson: the ones it introduces, or the ones it is about. */
  sky: GenusId[];
  /** Training, or the lessons on cloud seeding that come after it. */
  book: 'training' | 'seeding';
  /** Where it sits in the tree on the home page (lesson-kit's tree.ts): its branch, and what it leans on. */
  branch?: string;
  needs?: string[];
  betterAfter?: string[];
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
  footnotes?: Record<string, { kind: string; title: string; text: string; glossary?: boolean | string }>;
}
type Place = Pick<Shift, 'branch' | 'needs' | 'betterAfter'>;
function fromJson(file: ShiftFile, clouds: GenusId[], more: { sky?: GenusId[]; book?: Shift['book'] } & Place = {}): Shift {
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
    footnotes: (file.footnotes ?? {}) as Footnotes,
    ...(more.branch ? { branch: more.branch } : {}),
    ...(more.needs ? { needs: more.needs } : {}),
    ...(more.betterAfter ? { betterAfter: more.betterAfter } : {}),
  };
}

export const SHIFTS: readonly Shift[] = [
  // -------------------------------------------------------------------------
  // The trunk. Lessons 3 and 4 can be taken in either order.
  fromJson(fog, ['stratus', 'cumulus']),
  fromJson(lowSky, ['stratocumulus', 'nimbostratus'], { needs: ['fog'] }),
  fromJson(middleSky, ['altocumulus', 'cirrocumulus', 'cirrus'], { needs: ['low-sky'] }),
  fromJson(iceRealm, ['cirrostratus', 'altostratus'], { sky: ['cirrus', 'cirrostratus', 'altostratus'], needs: ['low-sky'], betterAfter: ['middle-sky'] }),
  fromJson(giants, ['cumulonimbus'], { needs: ['middle-sky', 'ice-realm'] }),
  // These meet no new clouds: they put the ones already met to work.
  fromJson(front, [], { sky: ['cirrostratus', 'altostratus', 'cumulonimbus'], needs: ['giants'] }),
  fromJson(localSky, [], { sky: ['altocumulus', 'stratocumulus', 'stratus'], needs: ['front'] }),
  // A leaf off the end of the trunk: fifteen years on.
  fromJson(seeding, [], { sky: ['altocumulus', 'stratus'], book: 'seeding', branch: 'seeding', needs: ['local-sky'] }),
  // -------------------------------------------------------------------------
  // The Pacific coast, forking off after Lesson 6. Its first lesson is the
  // bridge into weather on the scale of the planet, which later branches lean on too.
  fromJson(wind, [], { sky: ['cirrus', 'altostratus'], branch: 'coast' }),
  fromJson(coast, [], { sky: ['stratus', 'stratocumulus'], branch: 'coast', betterAfter: ['wind'] }),
  fromJson(rivers, [], { sky: ['nimbostratus', 'cumulus'], branch: 'coast', betterAfter: ['coast', 'local-sky'] }),
];

/** A lesson in the tree that is not written yet. */
export interface ComingLesson {
  id: string;
  n: number;
  title: string;
  teaches: string;
  branch: string;
  needs?: string[];
  betterAfter?: string[];
  coming: true;
}

/** The branches of the tree, each forking off the trunk lesson it grows from. */
export const BRANCHES: readonly TreeBranch[] = [
  { id: 'coast', title: 'The Pacific coast', promise: 'Why the coast almost never thunders, and where a week of winter rain comes from', from: 'front', color: 'var(--coast)' },
  { id: 'storms', title: 'Violent storms', promise: 'Hail, tornadoes and hurricanes: what turns a shower into a monster', from: 'giants', color: 'var(--storms)' },
  { id: 'seeding', title: 'Cloud seeding', promise: '', from: 'local-sky', leaf: true, color: 'var(--rose)' },
];

/** Lessons shown in the tree before they are written: the next branch to come. */
export const COMING: readonly ComingLesson[] = [
  { id: 'violent', n: 12, title: 'What makes a storm violent?', teaches: 'Why most thunderstorms rain and rumble and die in an hour, and a few drop hail the size of oranges and last all evening.', branch: 'storms', coming: true },
  { id: 'tornado', n: 13, title: 'How does a tornado form?', teaches: 'A storm that spins, and how its spin is stretched down to the ground.', branch: 'storms', coming: true },
  { id: 'hurricane', n: 14, title: 'How does a hurricane work?', teaches: 'A storm that feeds on a warm sea, and why it has an eye.', branch: 'storms', coming: true },
];

/** Every lesson the home page's tree shows, written or coming, in the order the tree lists them. */
export const TREE_LESSONS: readonly (Shift | ComingLesson)[] = [...SHIFTS, ...COMING];

export function shiftById(id: string): Shift | undefined {
  return SHIFTS.find((s) => s.id === id);
}

/** Journal entries and what they say. Shifts unlock them by id. Rare ones are the clouds to stay up for. */
export const JOURNAL: Record<string, { title: string; text: string; rare?: boolean }> = {
  ...fog.journal,
  ...lowSky.journal,
  ...middleSky.journal,
  ...iceRealm.journal,
  ...giants.journal,
  ...front.journal,
  ...localSky.journal,
  ...seeding.journal,
  ...wind.journal,
  ...coast.journal,
  ...rivers.journal,
};
