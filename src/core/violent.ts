// Violent storms, as plain numbers: the fuel a rising bubble can gain (CAPE),
// the cap that holds bubbles down until the afternoon, the wind's change with
// height (shear) that sorts storms into lone showers, clusters, lines and
// supercells, and the hail an updraft can hold up.

import { parcelAt } from './air';

const G = 9.81;

/** A spring afternoon's air over the Plains, with a warm cap a kilometre and a half up. */
export interface StormAir {
  /** Ground temperature and dew point now, °C. */
  groundC: number;
  dewC: number;
  /** How much warmer the cap is than the air under it would be, °C (0: no cap). */
  capC: number;
}

/** The cap's bottom and top, m. */
export const CAP_FROM_M = 1200;
export const CAP_TO_M = 1500;
export const TOP_M = 12000;
/** The morning air above the ground layer: 15 °C at the cap's bottom, cooling at 7.5 °C/km, steady above 11 km. */
const morningC = (h: number) => 15 - 7.5 * ((Math.min(h, 11000) - CAP_FROM_M) / 1000);

/** The air's temperature at height `h`, °C: the sun-stirred layer from the ground, and above it the morning air, with the cap added on. */
export function stormEnvC(h: number, a: StormAir): number {
  // The cap: a warm layer that comes in over the cap's bottom and fades out a kilometre above its top.
  const cap = h <= CAP_FROM_M ? 0 : h <= CAP_TO_M ? a.capC * ((h - CAP_FROM_M) / (CAP_TO_M - CAP_FROM_M)) : a.capC * Math.max(0, 1 - (h - CAP_TO_M) / 1000);
  return Math.max(a.groundC - 9.8 * (h / 1000), morningC(h) + cap);
}

export interface Fuel {
  /** Energy a kilogram of rising air gains, J/kg, from where it turns warmer than the air until it stops (CAPE). */
  cape: number;
  /** Energy it must be given to get through the cap first, J/kg (CIN). */
  cin: number;
  /** Where the rising air turns to cloud, and where it stops, m. */
  baseM: number;
  topM: number;
  /** Its updraft, m/s: half the speed all the fuel would give, since drag and the weight of its water hold it back. */
  updraft: number;
}

/** A bubble of ground air, lifted: what it gains and what it must first pay. */
export function stormFuel(a: StormAir): Fuel {
  let cape = 0;
  let cin = 0;
  let free = false;
  let topM = 0;
  const step = 50;
  let baseM = TOP_M;
  for (let h = 0; h <= TOP_M; h += step) {
    const p = parcelAt(h, a.groundC, a.dewC);
    if (p.cloud && baseM === TOP_M) baseM = h;
    const e = stormEnvC(h, a);
    const lift = (G * (p.tempC - e)) / (e + 273.15);
    if (lift > 0) {
      free = free || h > 0;
      cape += lift * step;
      topM = h;
    } else if (!free) {
      cin -= lift * step;
    } else if (cape > 0) {
      break;
    }
  }
  return { cape: Math.round(cape), cin: Math.round(cin), baseM, topM, updraft: Math.round(0.5 * Math.sqrt(2 * cape)) };
}

// ---- The cap through a day ----------------------------------------------------

/** The ground's temperature through a spring day on the Plains, °C: 16 at 5 a.m., 34 at 3 p.m. */
export const dayGroundC = (hour: number) => 16 + 18 * Math.max(0, Math.sin(((hour - 5) / 20) * Math.PI));
/** The day's dew point, °C: damp air in from the Gulf of Mexico. */
export const DAY_DEW_C = 18;
/**
 * How hot the ground must get before its bubbles break through a cap `capC`
 * warmer than the air under it, °C. With no cap, bubbles start rising once the
 * ground reaches 27 °C; each degree of cap puts that off by two and a half,
 * since a bubble from hotter ground has a higher, colder cloud base.
 */
export const breakC = (capC: number) => 27 + 2.5 * capC;

/** The hour (5 to 20) bubbles first break through, and the fuel waiting for them then; null if they never do. */
export function capBreak(capC: number): { hour: number; groundC: number; fuel: Fuel } | null {
  for (let hour = 5; hour <= 20; hour += 0.25) {
    const groundC = dayGroundC(hour);
    if (groundC >= breakC(capC)) return { hour, groundC, fuel: stormFuel({ groundC, dewC: DAY_DEW_C, capC: 0 }) };
    if (hour > 15) break;
  }
  return null;
}

// ---- Shear, and the kinds of storm ----------------------------------------------

export type StormKind = 'none' | 'shower' | 'single' | 'multicell' | 'line' | 'supercell';

/**
 * The storm that grows from `cape` J/kg of fuel in wind that changes by
 * `shearKmh` between the ground and 6 km. With little shear, a storm's rain
 * falls back down its own updraft and chokes it within the hour; with some,
 * new cells keep growing on the gust front; with a lot, the updraft leans
 * away from its rain, and turns.
 */
export function stormKind(cape: number, shearKmh: number): StormKind {
  if (cape < 150) return 'none';
  if (cape < 500) return 'shower';
  if (shearKmh < 35) return 'single';
  if (shearKmh < 65) return 'multicell';
  return cape >= 1000 ? 'supercell' : 'line';
}

// ---- Hail ------------------------------------------------------------------------

/** How fast a hailstone `cm` across falls, m/s. */
export const hailFall = (cm: number) => 15 * Math.sqrt(cm);
/** The largest stone an updraft of `ms` m/s can hold up, cm. */
export const hailHeld = (ms: number) => (ms / 15) ** 2;

/** Hail sizes as people name them, by diameter in cm. */
export const HAIL_NAMES: [number, string][] = [
  [0.6, 'pea'], [1.9, 'marble'], [2.5, 'quarter'], [4.4, 'golf ball'], [7, 'baseball'], [10, 'grapefruit'],
];
export function hailName(cm: number): string {
  let name = 'small hail';
  for (const [d, n] of HAIL_NAMES) if (cm >= d * 0.9) name = n;
  return name;
}
