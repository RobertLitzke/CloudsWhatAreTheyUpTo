// A rising parcel of air, simplified to the two rates a watcher needs.
//
// Unsaturated air cools at the dry rate, about 9.8 °C per kilometre. Its dew
// point falls too, but only by about 1.8 °C per kilometre, so the two close in
// at about 8 °C per kilometre and meet at the cloud base: roughly 125 metres
// for every degree the air started above its dew point. Above that the air is
// saturated, and condensing water warms it, so it cools more slowly: see
// moistRate.

export const DRY_RATE = 9.8 / 1000;
export const DEW_RATE = 1.8 / 1000;

/** Height in metres at which air from the ground turns to cloud. */
export function cloudBase(tempC: number, dewC: number): number {
  return Math.max(0, (tempC - dewC) / (DRY_RATE - DEW_RATE));
}

export interface Parcel {
  heightM: number;
  tempC: number;
  dewC: number;
  /** At or above the cloud base: the parcel is cloud. */
  cloud: boolean;
}

/**
 * How fast saturated air cools, °C per kilometre, at a temperature. Warm air
 * holds a lot of water, and condensing it releases a lot of heat, so warm
 * cloud cools slowly (about 4 °C/km); very cold air has little water left to
 * give and cools almost at the dry rate.
 */
export function moistRate(tempC: number): number {
  const table: [number, number][] = [[30, 3.6], [20, 4.3], [10, 5.3], [0, 6.5], [-10, 7.7], [-20, 8.6], [-30, 9.2], [-40, 9.5], [-60, 9.7]];
  if (tempC >= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [t0, r0] = table[i - 1];
    const [t1, r1] = table[i];
    if (tempC >= t1) return r0 + ((tempC - t0) / (t1 - t0)) * (r1 - r0);
  }
  return table[table.length - 1][1];
}

/** The parcel that left the ground at tempC and dewC, lifted to heightM. */
export function parcelAt(heightM: number, tempC: number, dewC: number): Parcel {
  const base = cloudBase(tempC, dewC);
  if (heightM < base) {
    return { heightM, tempC: tempC - DRY_RATE * heightM, dewC: dewC - DEW_RATE * heightM, cloud: false };
  }
  let t = tempC - DRY_RATE * base;
  for (let h = base; h < heightM; h += 10) t -= (moistRate(t) / 1000) * Math.min(10, heightM - h);
  return { heightM, tempC: t, dewC: t, cloud: true };
}

// ---------------------------------------------------------------------------
// The air around the parcel. A parcel keeps rising while it is warmer than the
// air around it, and stops where it is no longer: that is the cloud top.
//
// This is the glider pilot's way of forecasting cumulus. Start from the
// morning's air, which cools with height at its own rate (its lapse rate).
// As the sun heats the ground, the air near it is stirred into a layer that
// cools at the dry rate, and that layer deepens as the afternoon warms. Bubbles
// rise through it, turn to cloud at the cloud base if it is low enough, and
// climb on as cloud until they are no longer warmer than the morning air
// around them. The faster the morning air cools with height (the less stable
// it is), the higher they go.

/** Where the troposphere ends in mid-latitudes; above it the air stops cooling. */
export const TROPOPAUSE_M = 11000;

export interface Environment {
  /** Ground temperature at dawn, before the sun gets to work. */
  dawnC: number;
  /** How fast the morning air cools with height, °C per kilometre. */
  lapsePerKm: number;
  /** Ground temperature now. */
  groundC: number;
  /** A warm lid: the air warms by `deltaC` over 200 m starting at `atM`. */
  inversion?: { atM: number; deltaC: number };
}

/** The morning air, before any heating. */
export function dawnTemp(heightM: number, env: Environment): number {
  const h = Math.min(heightM, TROPOPAUSE_M);
  let t = env.dawnC - (env.lapsePerKm / 1000) * h;
  const inv = env.inversion;
  if (inv && heightM > inv.atM) t += inv.deltaC * Math.min(1, (heightM - inv.atM) / 200);
  return t;
}

/** The air now: the stirred layer near the ground, and the morning air above it. */
export function envTemp(heightM: number, env: Environment): number {
  return Math.max(dawnTemp(heightM, env), env.groundC - DRY_RATE * heightM);
}

/** The top of the stirred layer: how high the sun's heating reaches. */
export function mixedTop(env: Environment): number {
  for (let h = 0; h <= TROPOPAUSE_M; h += 10) if (env.groundC - DRY_RATE * h <= dawnTemp(h, env)) return h;
  return TROPOPAUSE_M;
}

/** Tops above this have frozen into the fibrous ice of a cumulonimbus. */
export const ICE_TOP_M = 8000;

export type HeapKind = 'none' | 'humilis' | 'mediocris' | 'congestus' | 'cumulonimbus';

export interface Column {
  /** The cloud base, or null if thermals stop before reaching it. */
  baseM: number | null;
  /** Where the rising air stops. */
  topM: number;
  kind: HeapKind;
}

/**
 * Follow a bubble of ground air, `kickC` warmer than its surroundings, and say
 * where it turns to cloud and where it stops. The cumulus species follow from
 * the depth: under a kilometre is humilis (fair weather), up to three is
 * mediocris, deeper is congestus. A cloud whose top climbs past about 8 km,
 * where it is far below freezing and turns to ice, has become a cumulonimbus.
 */
export function column(env: Environment, dewC: number, kickC = 0.5): Column {
  const start = env.groundC + kickC;
  const base = cloudBase(start, dewC);
  let top = 0;
  for (let h = 0; h <= 16000; h += 25) {
    if (parcelAt(h, start, dewC).tempC < envTemp(h, env)) break;
    top = h;
  }
  if (top < base) return { baseM: null, topM: top, kind: 'none' };
  const depth = top - base;
  const kind: HeapKind = top >= ICE_TOP_M ? 'cumulonimbus' : depth < 1000 ? 'humilis' : depth < 3000 ? 'mediocris' : 'congestus';
  return { baseM: base, topM: top, kind };
}
