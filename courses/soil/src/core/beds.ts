// Raised beds: how far a freshly filled bed sinks over its first few years,
// from what it was filled with. Pure TypeScript, no DOM.

export interface Fill {
  /** Depth of the bed's fill, in cm. */
  depth: number;
  /** Compost as a share of the soil mix by volume, 0 to 1; the rest is topsoil. */
  compost: number;
  /** Logs and branches laid under the mix, as a share of the depth, 0 to 1. */
  wood: number;
}

/**
 * The share of each part's fresh volume left after `years` years. Loose fill
 * of any kind settles by about a tenth in its first season as air pockets
 * collapse under rain and its own weight. After that, topsoil barely changes,
 * because its minerals do not rot. Compost keeps losing volume as soil life
 * eats it, at roughly a sixth a year. Buried wood rots slowly but leaves large
 * gaps between logs that the soil above falls into, so it loses about a
 * quarter of its remaining volume each year. These rates are rough figures
 * from extension advice and gardeners' measurements, for a sketch of the
 * pattern rather than a forecast for any one bed.
 */
export function left(part: 'topsoil' | 'compost' | 'wood', years: number): number {
  if (years <= 0) return 1;
  if (part === 'topsoil') return 0.9 - 0.01 * (years - 1);
  if (part === 'compost') return 0.9 * Math.exp(-0.18 * years);
  return 0.85 * Math.pow(0.75, years);
}

/** How far below its starting level the surface of the fill sits after `years` years, in cm. */
export function sunk(fill: Fill, years: number): number {
  const wood = fill.depth * fill.wood;
  const mix = fill.depth - wood;
  const after = wood * left('wood', years) + mix * (fill.compost * left('compost', years) + (1 - fill.compost) * left('topsoil', years));
  return fill.depth - after;
}

/** The volume of a bed in litres, from its length, width and depth in cm. */
export const litres = (length: number, width: number, depth: number): number => (length * width * depth) / 1000;
