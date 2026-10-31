// A bed through the year: what covers it in each season, how it is dug, and
// what that does to its organic matter over five years. A rough model, for a
// figure that shows the direction and pace of change, not a forecast: each
// cover adds organic matter, and soil life burns a share of what is there
// each year, a larger share when the bed is dug. Pure TypeScript, no DOM.

import type { Disturbance } from './structure';

export const SEASONS = ['autumn', 'winter', 'spring', 'summer'] as const;
export type Season = (typeof SEASONS)[number];

export type Cover = 'bare' | 'crop' | 'cover' | 'mulch' | 'compost';

export const COVERS: Record<Cover, { name: string; adds: number; roots: boolean; covered: boolean }> = {
  bare: { name: 'Bare', adds: 0, roots: false, covered: false },
  crop: { name: 'A crop', adds: 0.03, roots: true, covered: true },
  cover: { name: 'Cover crop', adds: 0.06, roots: true, covered: true },
  mulch: { name: 'Mulch', adds: 0.05, roots: false, covered: true },
  compost: { name: 'Compost on top', adds: 0.1, roots: false, covered: true },
};

export const COVER_IDS = Object.keys(COVERS) as Cover[];

/** The share of a bed's organic matter its life burns in a year, by how it is dug. */
export const BURN: Record<Disturbance, number> = { none: 0.025, fork: 0.03, dig: 0.045, till: 0.06 };

export type Plan = Record<Season, Cover>;

/** Organic matter, % by weight, at the start and then after each of `years` years. */
export function project(plan: Plan, dig: Disturbance, start = 3, years = 5): number[] {
  const adds = SEASONS.reduce((a, s) => a + COVERS[plan[s]].adds, 0);
  // A bare season loses topsoil and organic matter to rain and wind as well.
  const bare = SEASONS.filter((s) => !COVERS[plan[s]].covered).length;
  const out = [start];
  let om = start;
  for (let y = 0; y < years; y++) {
    om = Math.max(0.5, om + adds - om * (BURN[dig] + 0.01 * bare));
    out.push(om);
  }
  return out;
}

/** Seasons in the year with living roots in the bed, and seasons with the soil covered. */
export function cover(plan: Plan): { roots: number; covered: number } {
  return {
    roots: SEASONS.filter((s) => COVERS[plan[s]].roots).length,
    covered: SEASONS.filter((s) => COVERS[plan[s]].covered).length,
  };
}
