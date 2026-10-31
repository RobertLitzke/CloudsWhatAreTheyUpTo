// Smaller models behind the figures: how big cloud pieces look, a warm front
// coming in, a clear night cooling to fog, and how far away the thunder is.

import type { GenusId } from './clouds';

// ---- Sizes in the sky ------------------------------------------------------

/** How wide something looks, in degrees, at a distance. */
export function angularSize(sizeM: number, distanceM: number): number {
  return (2 * Math.atan(sizeM / 2 / distanceM) * 180) / Math.PI;
}

/**
 * The Atlas's rule of thumb for a layer of cloud pieces seen high in the sky:
 * pieces narrower than a little finger at arm's length (about 1°) are
 * cirrocumulus, one to three fingers (up to about 5°) altocumulus, wider is
 * stratocumulus.
 */
export function layerBySize(deg: number): GenusId {
  return deg < 1 ? 'cirrocumulus' : deg <= 5 ? 'altocumulus' : 'stratocumulus';
}

// ---- A warm front ----------------------------------------------------------

/** The front's surface rises about 1 km for every 100 km ahead of it. */
export const FRONT_SLOPE = 100;
/** A typical speed for a warm front. */
export const FRONT_KMH = 25;

/** How high the frontal cloud is over a watcher this many hours before the front arrives. */
export function frontHeightM(hoursAhead: number): number {
  return (Math.max(0, hoursAhead) * FRONT_KMH * 1000) / FRONT_SLOPE;
}

/** The cloud overhead, from the height of the front's surface. */
export function frontSky(hoursAhead: number): GenusId | 'clear' {
  const h = frontHeightM(hoursAhead);
  if (h > 11000) return 'clear';
  if (h > 8000) return 'cirrus';
  if (h > 5500) return 'cirrostratus';
  if (h > 2500) return 'altostratus';
  return 'nimbostratus';
}

// ---- A clear night ---------------------------------------------------------

export interface Night {
  /** Temperature at sunset. */
  duskC: number;
  dewC: number;
  /** 0 overcast to 1 perfectly clear. */
  clear: number;
  /** 0 calm to 1 windy. */
  wind: number;
}

/**
 * Temperature `hours` after sunset. The ground loses heat to a clear sky and
 * cools quickly at first, then more slowly; cloud sends heat back down and wind
 * stirs warmer air in from above, so both shrink the drop. The air cannot cool
 * below its dew point without its water condensing, so the curve stops there:
 * that is when fog forms.
 */
export function nightTemp(hours: number, n: Night): number {
  const drop = 14 * n.clear * (1 - 0.75 * n.wind);
  const t = n.duskC - (drop * (1 - Math.exp(-hours / 4))) / (1 - Math.exp(-3));
  return Math.max(t, n.dewC);
}

/** The hour after sunset at which fog forms, or null if it does not by dawn (12 hours). */
export function fogHour(n: Night): number | null {
  if (n.wind > 0.6) return null; // Wind mixes the cooled layer away: low stratus, perhaps, but no fog.
  for (let h = 0; h <= 12; h += 0.1) if (nightTemp(h, n) <= n.dewC + 1e-9) return Math.round(h * 10) / 10;
  return null;
}

// ---- Thunder ---------------------------------------------------------------

/** Kilometres to a lightning strike from the seconds between flash and thunder. */
export function strikeKm(seconds: number): number {
  return (seconds * 343) / 1000;
}
