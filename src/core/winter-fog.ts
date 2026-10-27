// Winter fog, as plain numbers: the cold pool a run of calm nights builds in a
// basin and the wind that scours it out, which kind of fog a surface and the
// air over it make, and what falls through a warm layer aloft onto a cold one
// at the ground.

// ---- The cold pool ------------------------------------------------------------------

/** How deep the cold pool in a basin is, m, after `nights` calm, clear winter nights in a row. */
export const poolDepth = (nights: number) => Math.round(Math.min(800, 60 + 90 * nights));

/** The thickest fog, m, that a January afternoon's sun can heat through and burn off. */
export const JANUARY_BURN_M = 150;

/** How deep, m, a wind of `kmh` stirs the air from the ground up. */
export const stirDepth = (kmh: number) => Math.round(1.2 * kmh * kmh);

export interface PoolDay {
  depthM: number;
  /** Grey all day: fog or low cloud filling the pool. */
  grey: boolean;
  /** The afternoon sun burns it off. */
  burnsOff: boolean;
  /** The wind has stirred the whole pool up and mixed it away. */
  scoured: boolean;
  /** The afternoon temperature in the bottom of the basin and on the ridges above it, °C. */
  floorC: number;
  ridgeC: number;
}

/** The basin after `nights` calm nights, then a wind of `windKmh`. */
export function poolDay(nights: number, windKmh: number): PoolDay {
  const depthM = poolDepth(nights);
  const scoured = stirDepth(windKmh) >= depthM;
  const burnsOff = !scoured && depthM <= JANUARY_BURN_M;
  const grey = !scoured && !burnsOff;
  // The ridges sit in the mild air above the lid, which a high's sinking air warms day by day.
  const ridgeC = Math.round(Math.min(10, 3 + 0.6 * nights));
  const floorC = scoured ? 4 : grey ? -2 : 3;
  return { depthM, grey, burnsOff, scoured, floorC, ridgeC };
}

// ---- Which fog --------------------------------------------------------------------------

export type FogKind = 'none' | 'shallow' | 'advection' | 'stratus' | 'steam';

/**
 * The fog a surface at `surfaceC` makes under damp air at `airC` (its dew point
 * a degree lower) blowing at `windKmh`. Air chilled from below to its dew point
 * fogs: in a shallow skin when still, through a deep layer when a breeze stirs
 * the chill up, and lifted off the ground into stratus in a strong wind. Water
 * much warmer than the air steams into it.
 */
export function fogKind(surfaceC: number, airC: number, windKmh: number, water: boolean): FogKind {
  const dewC = airC - 1;
  if (water && surfaceC - airC >= 8) return windKmh > 30 ? 'none' : 'steam';
  if (surfaceC >= dewC) return 'none';
  if (windKmh < 4) return 'shallow';
  return windKmh <= 25 ? 'advection' : 'stratus';
}

// ---- Through a warm layer --------------------------------------------------------------------

export type Fall = 'snow' | 'wet snow' | 'rain' | 'sleet' | 'freezing rain';

/** How much of a snowflake melts falling through a warm layer whose warmest air is `warmC`, 0 to 1. */
export const meltShare = (warmC: number) => Math.max(0, Math.min(1, warmC / 3));

/**
 * What reaches the ground when snow falls through a warm layer aloft whose
 * warmest air is `warmC`, then through a layer below freezing `coldM` deep at
 * the ground (0 for none). Half-melted flakes refreeze round their icy core
 * into pellets; fully melted drops stay liquid through a shallow cold layer
 * and freeze only when they hit something, unless the cold is deep enough to
 * freeze them on the way down.
 */
export function fallThrough(warmC: number, coldM: number): Fall {
  const melt = meltShare(warmC);
  if (melt === 0) return 'snow';
  if (coldM < 50) return melt >= 0.5 ? 'rain' : 'wet snow';
  if (melt < 1) return 'sleet';
  return coldM >= 900 ? 'sleet' : 'freezing rain';
}
