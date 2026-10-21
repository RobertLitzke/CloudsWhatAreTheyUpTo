// The cloud seeding game's sky: set up the air, cool it one of four ways, and
// see which cloud forms, whether anything falls from it, and what a seeding
// run does to it.
//
// The four ways air cools to its dew point are the lessons' four: a clear
// night chills it where it lies (fog), the sun sends bubbles up (heaps), a
// ridge shoves it up and over (waves), and a front lifts a whole sheet of it
// slowly (layers). The rising air follows core/air.ts: the dry rate to the
// cloud base, the moist rate above.
//
// Seeding follows the numbers in the seeding lessons. Droplets stay liquid
// below 0 °C down to about -38 °C. Natural ice nuclei go up about tenfold for
// every 4 °C colder, to about one per litre at -20 °C. Dry ice (-78 °C) freezes
// droplets in any cloud below 0 °C, about 50 crystals per litre for a pound per
// mile of flight. Silver iodide only starts to work below about -5 °C, and
// works better the colder it is. In a layer, a few crystals per litre make
// flurries, 5 to 3,000 snow the cloud out, and more than that share the water
// so thinly that none grow big enough to fall: an overseeded veil of ice.

import { TROPOPAUSE_M, cloudBase, column, parcelAt, type Environment } from './air';
import type { GenusId } from './clouds';

export type Cooling = 'night' | 'sun' | 'hills' | 'front';
export type Agent = 'none' | 'dryIce' | 'silverIodide';

export interface Setup {
  /** Temperature at the ground: at dusk for a night, at dawn for the sun, now for hills and fronts. */
  groundC: number;
  /** Dew point at the ground. Above the temperature it is taken as equal to it. */
  dewC: number;
  /** How fast the air above cools with height, °C per km: under 6 is stable, over 7 unstable. */
  lapsePerKm: number;
  cooling: Cooling;
  /**
   * How hard the air is cooled, in the cooling's own unit: degrees of night
   * cooling, degrees the sun warms the ground, or metres of lift over the
   * ridge or up the front.
   */
  strength: number;
  agent: Agent;
  /** Pounds of dry ice, or grams of silver iodide, per mile flown. */
  dose: number;
}

/** The range and default of `strength` for each cooling, with its label. */
export const STRENGTH: Record<Cooling, { label: string; min: number; max: number; step: number; unit: 'C' | 'm' }> = {
  night: { label: 'Night cooling', min: 0, max: 15, step: 1, unit: 'C' },
  sun: { label: 'Sun’s heating', min: 0, max: 16, step: 1, unit: 'C' },
  hills: { label: 'Lift over the ridge', min: 200, max: 4000, step: 100, unit: 'm' },
  front: { label: 'Lift up the front', min: 500, max: 10000, step: 100, unit: 'm' },
};

export const DOSE: Record<Exclude<Agent, 'none'>, { label: string; min: number; max: number; step: number; unit: string }> = {
  dryIce: { label: 'Dry ice', min: 0, max: 100, step: 1, unit: 'lb per mile' },
  silverIodide: { label: 'Silver iodide', min: 0, max: 50, step: 1, unit: 'g per mile' },
};

/** Below this, droplets freeze on their own. */
export const HOMOGENEOUS_C = -38;
/** Silver iodide starts to make ice below this. */
export const SILVER_IODIDE_C = -5;
/** Crystals per litre: under FLURRIES only flurries; over VEIL, overseeded. */
export const FLURRIES = 5;
export const VEIL = 3000;
/** Ice crystals per litre that make a deep cloud snow on its own. */
const NATURAL_SNOW = 0.5;
/** Clouds thinner than this are layers that seeding clears rather than empties. */
const THIN_M = 1000;
/** Cumulus tops above this have frozen into a cumulonimbus (core/air.ts). */
const ICE_TOP_M = 8000;

export type Made = GenusId | 'fog' | 'clear';

export type Fall = 'none' | 'drizzle' | 'flurries' | 'snow' | 'rain' | 'showers' | 'thunderstorm';

export interface Sky {
  made: Made;
  /** The species where it matters to an order: humilis, congestus, lenticularis. */
  species?: string;
  baseM: number;
  topM: number;
  /** Temperatures of the cloud at its base and top. */
  baseC: number;
  topC: number;
  /** Ice crystals per litre at the top, from nature and from the seeding run. */
  naturalIce: number;
  seededIce: number;
  /** What falls out of the cloud, and whether it gets to the ground. */
  fall: Fall;
  reaches: boolean;
  /** A seeding run cleared a hole in a layer, or the fog. */
  hole: boolean;
  /** A seeding run overseeded the cloud into a veil of small ice. */
  veil: boolean;
  /** A seeding run made a heap grow taller. */
  grew: boolean;
  seeded: boolean;
  /** Why: one sentence per step, in order. */
  why: string[];
}

export function clampSetup(s: Setup): Setup {
  return { ...s, dewC: Math.min(s.dewC, s.groundC) };
}

/**
 * Natural ice crystals per litre at a temperature: tenfold for every 4 °C, one
 * per litre at -20 °C. Nature never overseeds: in a cloud colder than that,
 * crystals that form early fall out and take the water with them, so the count
 * is held at 100.
 */
export function naturalIce(tempC: number): number {
  if (tempC >= 0) return 0;
  if (tempC <= HOMOGENEOUS_C) return 100;
  return Math.min(100, Math.pow(10, (-20 - tempC) / 4));
}

/** Crystals per litre a seeding run makes in cloud at `tempC`. */
export function seededIce(agent: Agent, dose: number, tempC: number): number {
  if (agent === 'none' || dose <= 0 || tempC >= 0) return 0;
  if (agent === 'dryIce') return dose * 50;
  if (tempC > SILVER_IODIDE_C) return 0;
  return dose * 0.2 * Math.pow(10, (SILVER_IODIDE_C - tempC) / 4);
}

const round = (n: number) => Math.round(n);
const fmtC = (c: number) => `${c < 0 ? '−' : ''}${Math.abs(Math.round(c))} °C`;
const fmtKm = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${round(m / 10) * 10} m`);

/** The air around the cloud, for heaps: what the sun has stirred, and the morning air above. */
function heapEnv(s: Setup, heat = s.strength): Environment {
  return { dawnC: s.groundC, lapsePerKm: s.lapsePerKm, groundC: s.groundC + heat };
}

/** The air at a height around a lifted layer: the ground temperature, cooling at the lapse rate. */
function aroundC(s: Setup, h: number): number {
  return s.groundC - (s.lapsePerKm / 1000) * Math.min(h, TROPOPAUSE_M);
}

/** Lifted air keeps rising on its own while it is warmer than the air around it. */
function climb(s: Setup, fromM: number): number {
  let top = fromM;
  for (let h = fromM; h <= 16000; h += 25) {
    if (parcelAt(h, s.groundC, s.dewC).tempC < aroundC(s, h)) break;
    top = h;
  }
  return top;
}

function heapKind(baseM: number, topM: number): { made: Made; species?: string } {
  if (topM >= ICE_TOP_M) return { made: 'cumulonimbus' };
  const depth = topM - baseM;
  return { made: 'cumulus', species: depth < 1000 ? 'humilis' : depth < 3000 ? 'mediocris' : 'congestus' };
}

function blank(why: string[]): Sky {
  return { made: 'clear', baseM: 0, topM: 0, baseC: 0, topC: 0, naturalIce: 0, seededIce: 0, fall: 'none', reaches: false, hole: false, veil: false, grew: false, seeded: false, why };
}

/** The sky the setup makes before anyone flies. */
export function formCloud(raw: Setup): Sky {
  const s = clampSetup(raw);
  const spread = s.groundC - s.dewC;
  const why: string[] = [];

  if (s.cooling === 'night') {
    const dawn = s.groundC - s.strength;
    if (dawn > s.dewC) {
      why.push(`The night cools the ground air to ${fmtC(dawn)}, still above its dew point of ${fmtC(s.dewC)}. Dew or frost on the stubble, and a clear dawn.`);
      return blank(why);
    }
    const depth = Math.min(400, 60 + 40 * (s.dewC - dawn));
    why.push(`The night cools the ground air to its dew point, ${fmtC(s.dewC)}, and the extra chill wrings the vapour out as droplets: fog about ${fmtKm(depth)} deep.`);
    const sky: Sky = { ...blank(why), made: 'fog', baseM: 0, topM: depth, baseC: s.dewC, topC: s.dewC };
    return finish(s, sky);
  }

  if (s.cooling === 'sun') {
    const col = column(heapEnv(s), s.dewC);
    if (col.baseM == null) {
      why.push(`The sun warms the ground to ${fmtC(s.groundC + s.strength)}, but the thermals stop at ${fmtKm(col.topM)}, below the ${fmtKm(cloudBase(s.groundC + s.strength + 0.5, s.dewC))} it takes to cool them to the dew point. Blue sky.`);
      return blank(why);
    }
    const base = col.baseM;
    let { made, species } = heapKind(base, col.topM);
    why.push(`The sun warms the ground to ${fmtC(s.groundC + s.strength)}. Bubbles rise, cool to their dew point at ${fmtKm(base)} and climb on as cloud while they are warmer than the air around them, to ${fmtKm(col.topM)}.`);
    // Heaps that stop low in stable, damp air spread out under it into a layer.
    if (made === 'cumulus' && species !== 'congestus' && s.lapsePerKm <= 5 && base <= 900) {
      made = 'stratocumulus';
      species = undefined;
      why.push('The air above is stable, so the low heaps stop at the same height and spread out sideways into a lumpy layer.');
    }
    const start = s.groundC + s.strength + 0.5;
    const sky: Sky = { ...blank(why), made, species, baseM: base, topM: col.topM, baseC: parcelAt(base, start, s.dewC).tempC, topC: parcelAt(col.topM, start, s.dewC).tempC };
    return finish(s, sky);
  }

  const lift = s.strength;
  const base = Math.round(cloudBase(s.groundC, s.dewC));
  const how = s.cooling === 'hills' ? `Air pushed ${fmtKm(lift)} up over the Blue Mountains` : `Warm air gliding ${fmtKm(lift)} up the cold air of the front`;
  if (base > lift) {
    why.push(`${how} cools, but with its dew point ${Math.round(spread)}° below its temperature it needs ${fmtKm(base)} to reach it. Nothing forms.`);
    return blank(why);
  }
  why.push(`${how} cools to its dew point at ${fmtKm(base)} and turns to cloud from there up.`);

  // Unstable air, once lifted to cloud, keeps going on its own.
  const free = climb(s, lift);
  if (free - lift > 500) {
    const { made, species } = heapKind(base, free);
    why.push(`The air around is unstable: once it is cloud, the lifted air is warmer than its surroundings and boils up on its own to ${fmtKm(free)}.`);
    const sky: Sky = { ...blank(why), made, species, baseM: base, topM: free, baseC: parcelAt(base, s.groundC, s.dewC).tempC, topC: parcelAt(free, s.groundC, s.dewC).tempC };
    return finish(s, sky);
  }

  const top = lift;
  const depth = top - base;
  let made: Made;
  let species: string | undefined;
  if (s.cooling === 'hills') {
    // Stable air bounces in waves downwind of the ridge; each crest is a lens.
    made = base < 2000 ? 'stratocumulus' : base < 6000 ? 'altocumulus' : 'cirrocumulus';
    species = 'lenticularis';
    why.push(`The air is stable, so after the ridge it bobs up and down in waves. Cloud sits on each crest, where the air is lifted highest: smooth lenses${base < 2000 ? ' low over the ridge' : ''}.`);
  } else if (base >= 5000) {
    made = depth < 1000 ? 'cirrus' : 'cirrostratus';
    why.push(`So high up the cloud is ice, ${depth < 1000 ? 'a thin layer falling out in streaks' : 'a wide, thin veil'}.`);
  } else if (base >= 2000) {
    made = depth < 800 ? 'altocumulus' : 'altostratus';
    why.push(depth < 800 ? 'A thin layer in the middle of the sky, gently overturning into rows of puffs.' : 'A thick, even sheet in the middle of the sky.');
  } else {
    made = depth >= 2500 ? 'nimbostratus' : 'stratus';
    why.push(depth >= 2500 ? `A thick sheet from low down to ${fmtKm(top)}.` : 'A low, flat grey sheet.');
  }
  const sky: Sky = { ...blank(why), made, species, baseM: base, topM: top, baseC: parcelAt(base, s.groundC, s.dewC).tempC, topC: parcelAt(top, s.groundC, s.dewC).tempC };
  return finish(s, sky);
}

const HEAPS: ReadonlySet<Made> = new Set(['cumulus', 'cumulonimbus']);

/** What falls from a cloud, left to itself or after seeding. */
function finish(s: Setup, sky: Sky): Sky {
  const why = sky.why;
  const depth = sky.topM - sky.baseM;
  sky.naturalIce = naturalIce(sky.topC);
  const ice = sky.naturalIce + sky.seededIce;

  // Temperature of the stuff it is made of.
  if (!sky.seeded) {
    if (sky.topC >= 0) why.push(`The whole cloud is above freezing (its top is ${fmtC(sky.topC)}): all water droplets.`);
    else if (sky.topC <= HOMOGENEOUS_C) why.push(`Its top is ${fmtC(sky.topC)}, so cold the droplets there freeze on their own: its top is ice.`);
    else if (sky.naturalIce >= NATURAL_SNOW) why.push(`Its top is ${fmtC(sky.topC)}, cold enough that dust in the air starts ice crystals by itself, about ${sky.naturalIce >= 10 ? Math.round(sky.naturalIce) : sky.naturalIce.toFixed(1)} per litre.`);
    else why.push(`Its top is ${fmtC(sky.topC)}, but the droplets stay liquid: supercooled, with hardly a speck of dust that will start ice.`);
  }

  let fall: Fall = 'none';
  if (sky.made === 'fog') {
    fall = 'none';
  } else if (sky.made === 'cumulonimbus') {
    fall = 'thunderstorm';
  } else if (ice >= NATURAL_SNOW && ice <= VEIL && depth >= THIN_M) {
    // Ice grows at the droplets' expense and falls.
    fall = HEAPS.has(sky.made) ? 'showers' : 'snow';
  } else if (ice >= NATURAL_SNOW && ice <= VEIL) {
    fall = 'flurries';
  } else {
    // No ice: only the droplets bumping into each other, which needs a deep
    // warm cloud, or drizzle from a low layer.
    const warmDepth = Math.min(sky.topM, Math.max(sky.baseM, freezingHeight(sky))) - sky.baseM;
    if (warmDepth >= 2000) fall = HEAPS.has(sky.made) ? 'showers' : 'rain';
    else if ((sky.made === 'stratus' || sky.made === 'stratocumulus') && depth >= 300 && sky.baseC > -10) fall = 'drizzle';
  }

  // Snow melts into rain on the way down if the ground is warm.
  const warmGround = s.groundC > 2;
  let reaches = fall !== 'none';
  if (fall === 'snow' && warmGround) fall = 'rain';
  // Light falls from a high base evaporate on the way down: virga.
  const light = fall === 'flurries' || fall === 'drizzle' || (depth < 2500 && fall !== 'thunderstorm');
  if (reaches && (sky.baseM > 3000 || (sky.baseM > 1500 && light))) reaches = false;

  sky.fall = fall;
  sky.reaches = reaches;
  if (!sky.seeded) {
    if (fall === 'none') why.push('Nothing falls from it.');
    else why.push(fallSentence(sky, s));
  }
  return sky;
}

/** Where the rising air in the cloud crosses 0 °C, or the base if it is all below. */
function freezingHeight(sky: Sky): number {
  if (sky.baseC <= 0) return sky.baseM;
  if (sky.topC >= 0) return sky.topM;
  const span = sky.baseC - sky.topC;
  return sky.baseM + ((sky.topM - sky.baseM) * sky.baseC) / span;
}

function fallSentence(sky: Sky, s: Setup): string {
  const ground = sky.reaches ? '' : ' It evaporates in the dry air below before it reaches the ground: virga, streaks hanging from the base.';
  switch (sky.fall) {
    case 'thunderstorm': return `The top freezes to ice and the tower makes its own weather: a thunderstorm, with heavy rain, hail and lightning.${ground}`;
    case 'showers': return `Ice crystals grow at the droplets’ expense and fall, ${s.groundC > 2 ? 'melting into rain: showers' : 'as snow showers'}.${ground}`;
    case 'snow': return `Ice crystals grow at the droplets’ expense and fall as snow.${ground}`;
    case 'rain': return sky.topC < 0 && sky.naturalIce + sky.seededIce >= NATURAL_SNOW ? `Ice crystals grow at the droplets’ expense and fall as snow, melting into rain in the warmer air near the ground.${ground}` : `The cloud is deep enough for droplets to bump together into raindrops: rain.${ground}`;
    case 'drizzle': return `Its droplets slowly bump together into drizzle.${ground}`;
    case 'flurries': return `A few ice crystals grow and drift down as flurries.${ground}`;
    default: return '';
  }
}

/** The sky after a seeding run through the cloud. */
export function seed(raw: Setup): Sky {
  const s = clampSetup(raw);
  const before = formCloud(s);
  if (s.agent === 'none' || s.dose <= 0) return before;
  const name = s.agent === 'dryIce' ? 'dry ice' : 'silver iodide';
  const why = [...before.why];
  const after: Sky = { ...before, why, seeded: true };
  why.push(`A plane flies through the top of the cloud, ${s.agent === 'dryIce' ? 'dropping pellets of dry ice' : 'burning silver iodide'}: ${s.dose} ${DOSE[s.agent].unit}.`);

  if (before.made === 'clear') {
    why.push(`There is no cloud to seed. The ${name} falls through clear air and does nothing.`);
    return after;
  }
  if (before.topC >= 0) {
    why.push(`But the cloud is above freezing, all of it: there are no supercooled droplets to freeze. Seeding does nothing.`);
    return after;
  }
  if (before.topC <= HOMOGENEOUS_C) {
    why.push('But the top of the cloud is ice already, making all the snow it can. Seeding adds nothing.');
    return after;
  }
  const made = seededIce(s.agent, s.dose, before.topC);
  if (made === 0) {
    why.push(`But silver iodide only starts ice below about −5 °C, and this cloud’s top is ${fmtC(before.topC)}. Nothing happens. Dry ice would work.`);
    return after;
  }
  after.seededIce = made;
  const total = made + before.naturalIce;
  const count = total >= 100 ? Math.round(total / 10) * 10 : total >= 10 ? Math.round(total) : total.toFixed(1);
  why.push(`It makes about ${count} ice crystals per litre among some 100,000 droplets.`);

  const thin = before.made === 'fog' || before.topM - before.baseM < THIN_M;
  const heap = HEAPS.has(before.made);

  if (total < FLURRIES) {
    after.fall = 'flurries';
    after.reaches = before.baseM < 1500;
    why.push(`Too few crystals to make much difference: they grow big and drift down as flurries${after.reaches ? '' : ' that dry up on the way down'}, and the cloud stays.`);
    return after;
  }

  if (total > VEIL) {
    after.veil = true;
    after.fall = 'none';
    after.reaches = false;
    why.push('Overseeded. So many crystals share the water that none grows big enough to fall: the cloud turns into a lingering veil of small ice, and nothing comes down.');
    return after;
  }

  if (before.naturalIce >= NATURAL_SNOW && !thin && !heap) {
    finish(s, after);
    why.push('But this cloud was already making its own ice, and was already snowing out. Seeding adds little.');
    return after;
  }

  if (thin) {
    after.hole = true;
    finish(s, after);
    after.fall = 'flurries';
    after.reaches = before.baseM < 1500;
    if (before.made === 'fog') why.push('The crystals grow at the droplets’ expense, since air that is just full for water is over-full for ice. They fall out as a sprinkle of snow and the fog clears where the seed went.');
    else why.push(`The crystals grow at the droplets’ expense, since air that is just full for water is over-full for ice, and fall out of the layer: a hole opens where the plane flew, with ${after.reaches ? 'a light snow under it' : 'a streak of falling ice under it that never reaches the ground'}.`);
    return after;
  }

  if (heap) {
    // Freezing the supercooled water gives up its heat, and the tower climbs.
    const boost = 1;
    const env = s.cooling === 'sun' ? heapEnv(s) : null;
    let top = before.topM;
    if (env) {
      const col = column({ ...env, groundC: env.groundC + boost }, s.dewC + boost * 0.5);
      top = Math.max(top, col.topM);
    } else {
      top = Math.min(16000, top + 1500);
    }
    if (top > before.topM + 200) {
      after.grew = true;
      after.topM = top;
      after.topC = parcelAt(top, s.cooling === 'sun' ? s.groundC + s.strength + 0.5 : s.groundC, s.dewC).tempC;
      const k = heapKind(before.baseM, top);
      after.made = k.made;
      after.species = k.species;
      why.push(`Freezing the supercooled water gives up its heat, so the top warms and climbs on, to ${fmtKm(top)}${after.made === 'cumulonimbus' ? ': it has become a cumulonimbus' : ''}.`);
    }
    finish(s, after);
    if (after.fall === 'none' || after.fall === 'flurries') after.fall = 'showers';
    why.push(fallSentence(after, s));
    return after;
  }

  finish(s, after);
  why.push(`The crystals grow at the droplets’ expense and fall: ${after.fall === 'rain' ? 'snow aloft, melting into rain near the ground' : after.fall}.${after.reaches ? '' : ' It evaporates before it reaches the ground.'}`);
  return after;
}

export const NAMES: Record<Made, string> = {
  clear: 'Clear sky',
  fog: 'Fog',
  cirrus: 'Cirrus',
  cirrocumulus: 'Cirrocumulus',
  cirrostratus: 'Cirrostratus',
  altocumulus: 'Altocumulus',
  altostratus: 'Altostratus',
  nimbostratus: 'Nimbostratus',
  stratocumulus: 'Stratocumulus',
  stratus: 'Stratus',
  cumulus: 'Cumulus',
  cumulonimbus: 'Cumulonimbus',
};

export const FALLS: Record<Fall, string> = {
  none: 'nothing falls',
  drizzle: 'drizzle',
  flurries: 'flurries',
  snow: 'snow',
  rain: 'rain',
  showers: 'showers',
  thunderstorm: 'a thunderstorm',
};

/** A one-line verdict: what formed and what fell where. */
export function headline(sky: Sky, cooling: Cooling): string {
  const where = cooling === 'hills' ? 'on the mountains' : 'on Harrow';
  const name = sky.veil ? 'An ice veil' : sky.hole ? (sky.made === 'fog' ? 'Fog, cleared' : `${NAMES[sky.made]}, holed`) : NAMES[sky.made] + (sky.species ? ` ${sky.species}` : '');
  if (sky.made === 'clear' || sky.fall === 'none') return `${name}. Nothing falls.`;
  return `${name}. ${FALLS[sky.fall][0].toUpperCase()}${FALLS[sky.fall].slice(1)}${sky.reaches ? ` ${where}` : ', but it dries up before the ground'}.`;
}

/** Where the rising air reaches `tempC`, or null if it never does below the cloud top or the tropopause. */
export function levelOf(raw: Setup, tempC: number): number | null {
  const s = clampSetup(raw);
  const start = s.cooling === 'sun' ? s.groundC + s.strength + 0.5 : s.cooling === 'night' ? s.groundC - s.strength : s.groundC;
  const dew = Math.min(s.dewC, start);
  for (let h = 0; h <= TROPOPAUSE_M; h += 50) if (parcelAt(h, start, dew).tempC <= tempC) return h;
  return null;
}

/** Default settings for a free sky: a fair summer morning. */
export const DEFAULT_SETUP: Setup = { groundC: 14, dewC: 6, lapsePerKm: 6.5, cooling: 'sun', strength: 10, agent: 'none', dose: 0 };

