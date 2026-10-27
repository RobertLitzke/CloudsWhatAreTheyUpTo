// Winter rain on the Pacific Northwest, as plain numbers: where the jet stream
// and the Pacific High sit each month, how much rain a wind off the sea wrings
// out on a mountain slope, and how much of a mountain river basin gets rain
// rather than snow, and so how high the river rises.

/** Seattle's average rain each month, January first, in mm (1991–2020 normals, rounded). */
export const SEATTLE_MM = [147, 96, 106, 80, 48, 36, 15, 25, 38, 99, 160, 136] as const;

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

/** How far into winter month `m` (1–12) is: 1 in mid-winter, 0 in mid-summer. */
export const winterness = (m: number) => (1 + Math.cos(((m - 1) / 12) * 2 * Math.PI)) / 2;

/** The jet stream's latitude over the eastern Pacific in month `m`, °N, roughly. */
export const jetLatitude = (m: number) => 55 - 13 * winterness(m);

/** The Pacific High's centre, °N, and how big it is (0 to 1), in month `m`. */
export function pacificHigh(m: number): { lat: number; size: number } {
  const w = winterness(m);
  return { lat: 38 - 8 * w, size: 1 - 0.6 * w };
}

/**
 * Rain on the windward slope of a coast range in a day, mm: a wind of `kmh`
 * blowing straight at the mountains, carrying `vapourMm` of water vapour (all
 * the vapour above a spot, as a depth of water if it rained out). The wind
 * lifts the air up the slope, and the faster and wetter it is, the more is
 * wrung out.
 */
export const windwardRain = (kmh: number, vapourMm: number) => Math.round(0.11 * kmh * vapourMm);

/** The top of the mountain basin in the snow-level figure, m; its outlet is at sea level. */
export const BASIN_TOP_M = 2400;
/** Old snow lies on the basin from this height up. */
export const SNOWPACK_FROM_M = 600;
/** The river is in flood when the basin sends down more than this, in mm of water a day. */
export const FLOOD_MM = 90;

/**
 * A day of 100 mm of rain and snow on the basin, with the snow level at
 * `snowLevelM`: the share of the basin that gets rain (the rest gets snow and
 * keeps it), the snowmelt where rain falls on old snow, and what the river
 * carries off, in mm of water a day.
 */
export function basinDay(snowLevelM: number): { rainShare: number; meltMm: number; runoffMm: number } {
  const below = Math.min(BASIN_TOP_M, Math.max(0, snowLevelM));
  const rainShare = below / BASIN_TOP_M;
  const meltMm = 30 * (Math.max(0, below - SNOWPACK_FROM_M) / BASIN_TOP_M);
  return { rainShare, meltMm, runoffMm: Math.round(100 * rainShare + meltMm) };
}
