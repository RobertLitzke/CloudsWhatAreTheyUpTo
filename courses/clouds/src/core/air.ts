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

// ---------------------------------------------------------------------------
// The constants every model in core shares, so that no two of them disagree.

/** Gravity, m/s². */
export const G = 9.81;
/** Heat capacity of air at constant pressure, J/(kg K). */
export const CP = 1004;
/** Gas constants of dry air and of water vapour, J/(kg K). */
export const RD = 287;
export const RV = 461.5;
/** Vapour's share of the weight of air, molecule for molecule: RD / RV. */
export const EPSILON = RD / RV;
/** Latent heat of condensing vapour, of freezing water, and of vapour going straight to ice, J/kg. */
export const LV = 2.5e6;
export const LF = 3.34e5;
export const LS = LV + LF;

/**
 * Pressure of a standard atmosphere at a height, hPa: 1013 at sea level,
 * about 540 at 5 km, 265 at 10 km.
 */
export function pressureAt(heightM: number): number {
  return 1013.25 * Math.pow(Math.max(0, 1 - (0.0065 * heightM) / 288.15), 5.2559);
}

/** Height in metres at which air from the ground turns to cloud. */
export function cloudBase(tempC: number, dewC: number): number {
  return Math.max(0, (tempC - dewC) / (DRY_RATE - DEW_RATE));
}

// How much vapour there is room for. Water molecules that meet stick more
// readily the colder they are, so the colder the air, the less water can stay
// vapour; the rest clumps into droplets.

/** The most water vapour a cubic metre can have at a temperature, in grams (Magnus). */
export function roomFor(tempC: number): number {
  const hPa = 6.112 * Math.exp((17.62 * tempC) / (243.12 + tempC));
  return (hPa * 100 * 1000) / (461.5 * (tempC + 273.15));
}

/** The temperature at which `grams` per cubic metre is all the room there is. */
export function dewPointOf(grams: number): number {
  let lo = -40;
  let hi = 50;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (roomFor(mid) < grams) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Vapour pressure in hPa at which air is full next to flat water, and next to ice (Magnus). */
export function fullOverWater(tempC: number): number {
  return 6.112 * Math.exp((17.62 * tempC) / (243.12 + tempC));
}
export function fullOverIce(tempC: number): number {
  return 6.112 * Math.exp((22.46 * tempC) / (272.62 + tempC));
}

/** Grams of vapour in a kilogram of dry air when its vapour pressure is `hPa`, at pressure `pHpa`. */
export function mixingRatio(hPa: number, pHpa: number): number {
  return (1000 * EPSILON * hPa) / Math.max(pHpa - hPa, 1e-3);
}

/**
 * The most vapour a kilogram of air can hold at `tK` kelvin and `pPa` pascals,
 * as a fraction by weight (kg/kg), next to water, or next to ice with `ice`.
 * This is the form the sky lab's fields are kept in.
 */
export function qsat(tK: number, pPa: number, ice = false): number {
  const c = tK - 273.15;
  const es = 100 * (ice ? fullOverIce(c) : fullOverWater(c));
  return (EPSILON * es) / Math.max(pPa - es, 1);
}

export interface Parcel {
  heightM: number;
  tempC: number;
  dewC: number;
  /** At or above the cloud base: the parcel is cloud. */
  cloud: boolean;
}

/**
 * How fast saturated air cools, °C per kilometre, at a temperature and a
 * height. Warm air holds a lot of water, and condensing it releases a lot of
 * heat, so warm cloud cools slowly (about 4 °C/km near the ground); very cold
 * air has little water left to give and cools almost at the dry rate. Higher
 * up the air is thinner, so a kilogram of it holds more vapour at the same
 * temperature and cools more slowly still: about 6.5 °C/km at −10 °C near the
 * ground, but 5.5 at the same temperature 5 km up.
 */
export function moistRate(tempC: number, heightM = 0): number {
  const t = tempC + 273.15;
  const qs = qsat(t, 100 * pressureAt(heightM));
  const a = (LV * qs) / (RD * t);
  const b = (LV * LV * qs * EPSILON) / (CP * RD * t * t);
  return DRY_RATE * 1000 * ((1 + a) / (1 + b));
}

/** The parcel that left the ground at tempC and dewC, lifted to heightM. */
export function parcelAt(heightM: number, tempC: number, dewC: number): Parcel {
  const base = cloudBase(tempC, dewC);
  if (heightM < base) {
    return { heightM, tempC: tempC - DRY_RATE * heightM, dewC: dewC - DEW_RATE * heightM, cloud: false };
  }
  let t = tempC - DRY_RATE * base;
  for (let h = base; h < heightM; h += 10) t -= (moistRate(t, h) / 1000) * Math.min(10, heightM - h);
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
