// The ten cloud genera of the WMO International Cloud Atlas, and the facts the
// game teaches about each: how to tell it, what made it, what it means.
//
// Heights are the Atlas's figures for temperate latitudes. Clouds sit higher
// in the tropics and lower near the poles, which a later lesson can say.

export type GenusId =
  | 'cirrus'
  | 'cirrocumulus'
  | 'cirrostratus'
  | 'altocumulus'
  | 'altostratus'
  | 'nimbostratus'
  | 'stratocumulus'
  | 'stratus'
  | 'cumulus'
  | 'cumulonimbus';

/**
 * The floor of the sky a cloud is filed under. A tower has its base on the low
 * floor and its top on the high one; the Atlas files cumulonimbus as low by its
 * base, but to someone on the ground it fills all three.
 */
export type Floor = 'high' | 'middle' | 'low' | 'tower';

export interface Genus {
  id: GenusId;
  name: string;
  /** The Atlas's two-letter code, as written in an observer's log. */
  abbr: string;
  floor: Floor;
  /** What it looks like, in a sentence. */
  look: string;
  /** What made it. */
  made: string;
  /** What it says about the weather to come. */
  means: string;
  /** Genera it is most often taken for, most likely first. */
  confused: GenusId[];
}

export const GENERA: readonly Genus[] = [
  {
    id: 'cirrus',
    name: 'Cirrus',
    abbr: 'Ci',
    floor: 'high',
    look: 'Thin white threads, hooks and streaks with a silky sheen, often called mares’ tails.',
    made: 'Ice crystals falling out of moist air near the top of the troposphere. Winds that change with height stretch the falling crystals into streaks.',
    means: 'Fair for now. If cirrus thickens and spreads from one direction into a veil, a warm front may arrive within a day.',
    confused: ['cirrostratus', 'cirrocumulus'],
  },
  {
    id: 'cirrocumulus',
    name: 'Cirrocumulus',
    abbr: 'Cc',
    floor: 'high',
    look: 'Tiny white grains or ripples with no shading, in rows: a mackerel sky.',
    made: 'A thin, high layer stirred by weak overturning. It is made of ice or supercooled droplets and rarely lasts long.',
    means: 'Usually fair, but often an early sign that a weather system is on the way.',
    confused: ['altocumulus', 'cirrus'],
  },
  {
    id: 'cirrostratus',
    name: 'Cirrostratus',
    abbr: 'Cs',
    floor: 'high',
    look: 'A thin, milky veil over the whole sky. The sun still casts shadows and often wears a halo.',
    made: 'A wide, deep layer of moist air lifted slowly, usually as warm air rides up over cold ahead of a front.',
    means: 'When it thickens, rain or snow often follows within 12 to 24 hours.',
    confused: ['altostratus', 'cirrus'],
  },
  {
    id: 'altocumulus',
    name: 'Altocumulus',
    abbr: 'Ac',
    floor: 'middle',
    look: 'White or grey patches, rolls or rounded masses with shaded sides, in a layer: a flock of sheep.',
    made: 'A moist layer in the middle of the sky that is gently overturning, or air lifted in waves over hills.',
    means: 'Usually no rain from it. Turreted altocumulus on a warm, humid morning warns of thunderstorms later in the day.',
    confused: ['cirrocumulus', 'stratocumulus'],
  },
  {
    id: 'altostratus',
    name: 'Altostratus',
    abbr: 'As',
    floor: 'middle',
    look: 'A grey or bluish sheet. The sun shows as if through frosted glass, with no halo and no shadows.',
    made: 'Wide, slow lifting ahead of a warm front; it is often cirrostratus that has thickened and lowered.',
    means: 'Steady rain or snow is likely soon.',
    confused: ['cirrostratus', 'nimbostratus'],
  },
  {
    id: 'nimbostratus',
    name: 'Nimbostratus',
    abbr: 'Ns',
    floor: 'middle',
    look: 'A dark grey, featureless layer thick enough to blot out the sun, with rain or snow falling from it.',
    made: 'Deep, widespread lifting along a front, through a thick layer of moist air.',
    means: 'Steady rain or snow for hours, easing only when the front has passed.',
    confused: ['altostratus', 'stratus'],
  },
  {
    id: 'stratocumulus',
    name: 'Stratocumulus',
    abbr: 'Sc',
    floor: 'low',
    look: 'Grey and white lumps or rolls joined into a layer, with darker parts and gaps of sky.',
    made: 'Moist air stirred near the ground and trapped under a warm layer above it, or flattened cumulus spreading out.',
    means: 'Mostly dry, perhaps light drizzle. Often settled weather.',
    confused: ['altocumulus', 'stratus'],
  },
  {
    id: 'stratus',
    name: 'Stratus',
    abbr: 'St',
    floor: 'low',
    look: 'A flat, grey, even layer, low enough to hide hilltops: fog that is not touching the ground.',
    made: 'Moist air cooled near the ground, by a clear night or by drifting over cold ground or sea, or fog lifting.',
    means: 'Drizzle at most. It often burns off by midday.',
    confused: ['nimbostratus', 'stratocumulus'],
  },
  {
    id: 'cumulus',
    name: 'Cumulus',
    abbr: 'Cu',
    floor: 'low',
    look: 'Separate, dense heaps with flat bases and bright, cauliflower tops.',
    made: 'Thermals: the sun heats the ground, bubbles of warm air rise, and each turns to cloud where it cools to its dew point.',
    means: 'Small ones mean fair weather. Ones still growing tall by midday can bring showers by afternoon.',
    confused: ['stratocumulus', 'cumulonimbus'],
  },
  {
    id: 'cumulonimbus',
    name: 'Cumulonimbus',
    abbr: 'Cb',
    floor: 'tower',
    look: 'A huge, dark-based tower reaching to the top of the sky, often spread into a flat anvil of ice.',
    made: 'Deep, strong overturning in warm, moist, unstable air, or a cold front shoving warm air up hard.',
    means: 'Thunderstorm: lightning, heavy rain, hail and sudden gusts. It is local, and usually passes within an hour or two.',
    confused: ['cumulus', 'nimbostratus'],
  },
];

const BY_ID = new Map(GENERA.map((g) => [g.id, g]));

export function genus(id: GenusId): Genus {
  const g = BY_ID.get(id);
  if (!g) throw new Error(`No genus ${id}`);
  return g;
}

export function isGenusId(value: string): value is GenusId {
  return BY_ID.has(value as GenusId);
}

export interface FloorInfo {
  id: Floor;
  name: string;
  /** Where the floor sits, in metres, for temperate latitudes. */
  fromM: number;
  toM: number;
  /** What its clouds are made of. */
  stuff: string;
}

export const FLOORS: readonly FloorInfo[] = [
  { id: 'high', name: 'High', fromM: 5000, toM: 13000, stuff: 'ice crystals' },
  { id: 'middle', name: 'Middle', fromM: 2000, toM: 7000, stuff: 'water droplets, often supercooled, and some ice' },
  { id: 'low', name: 'Low', fromM: 0, toM: 2000, stuff: 'water droplets' },
  { id: 'tower', name: 'All three', fromM: 500, toM: 13000, stuff: 'droplets below and ice above' },
];

export function floorInfo(id: Floor): FloorInfo {
  return FLOORS.find((f) => f.id === id)!;
}

/** Metres to feet, rounded to a sensible step for a sign or a log. */
export function feet(m: number): number {
  const ft = m * 3.28084;
  return ft < 1000 ? Math.round(ft / 10) * 10 : Math.round(ft / 500) * 500;
}

// ---------------------------------------------------------------------------
// The words the names are built from.

export type Prefix = 'cirro' | 'alto' | 'none';
export type Body = 'cumulus' | 'stratus';

export interface Root {
  word: string;
  latin: string;
  meaning: string;
}

export const ROOTS: readonly Root[] = [
  { word: 'cirrus', latin: 'cirrus', meaning: 'a curl or lock of hair' },
  { word: 'cumulus', latin: 'cumulus', meaning: 'a heap or pile' },
  { word: 'stratus', latin: 'stratus', meaning: 'spread out, a layer' },
  { word: 'nimbus', latin: 'nimbus', meaning: 'a rain cloud' },
  { word: 'alto', latin: 'altus', meaning: 'high, though here it marks the middle floor' },
];

/**
 * Six of the ten names are a floor and a shape put together. Cirrus,
 * nimbostratus, stratocumulus and cumulonimbus break the pattern, and the
 * lesson says so rather than pretending otherwise.
 */
export function compose(prefix: Prefix, body: Body): GenusId {
  if (prefix === 'none') return body;
  return `${prefix}${body}` as GenusId;
}
