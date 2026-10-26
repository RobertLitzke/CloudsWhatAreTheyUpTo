// Feeding plants: what holds nutrients in soil, which ones a plant can reach at
// each pH, and where the signs of a shortage show on a plant. Pure TypeScript,
// no DOM.

// ---- Parking spots -------------------------------------------------------------

/**
 * Cation exchange capacity in centimoles of charge per kilogram, the number
 * of "parking spots" for positively charged nutrients, from clay and organic
 * matter percentages. Rule-of-thumb charges: about 0.5 per percent of a mixed
 * garden clay, and 2 per percent of organic matter.
 */
export const cec = (clay: number, om: number): number => 0.5 * clay + 2 * om;

/** Nutrients that park on the spots (positive charges), and those that do not and wash out. */
export const PARKED = ['calcium', 'magnesium', 'potassium', 'ammonium'] as const;
export const LOOSE = ['nitrate', 'sulfate', 'boron'] as const;

// ---- pH ------------------------------------------------------------------------

export const NUTRIENTS = ['N', 'P', 'K', 'S', 'Ca', 'Mg', 'Fe', 'Mn', 'B', 'Cu', 'Zn', 'Mo'] as const;
export type Nutrient = (typeof NUTRIENTS)[number];

export const NAMES: Record<Nutrient, string> = {
  N: 'nitrogen', P: 'phosphorus', K: 'potassium', S: 'sulfur', Ca: 'calcium', Mg: 'magnesium',
  Fe: 'iron', Mn: 'manganese', B: 'boron', Cu: 'copper', Zn: 'zinc', Mo: 'molybdenum',
};

/** The pH values the availability table is given at. */
export const PH_STEPS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9] as const;

/**
 * How available each nutrient is to roots at each pH, 0 to 1, read off the
 * band chart first drawn by Emil Truog (1946) for mineral soils. It is a
 * guide to the trend, not a measurement: the bands' widths are not amounts.
 */
const AVAIL: Record<Nutrient, readonly number[]> = {
  N: [0.3, 0.4, 0.55, 0.8, 1, 1, 1, 1, 0.8, 0.55, 0.4],
  P: [0.2, 0.25, 0.35, 0.6, 0.9, 1, 0.95, 0.6, 0.4, 0.45, 0.5],
  K: [0.35, 0.45, 0.6, 0.8, 1, 1, 1, 1, 1, 1, 0.95],
  S: [0.35, 0.45, 0.6, 0.85, 1, 1, 1, 1, 1, 1, 1],
  Ca: [0.2, 0.3, 0.45, 0.65, 0.85, 1, 1, 1, 1, 0.9, 0.7],
  Mg: [0.2, 0.3, 0.45, 0.65, 0.85, 1, 1, 1, 1, 0.9, 0.7],
  Fe: [1, 1, 1, 1, 0.9, 0.75, 0.55, 0.35, 0.25, 0.2, 0.2],
  Mn: [1, 1, 1, 0.95, 0.85, 0.7, 0.5, 0.35, 0.25, 0.25, 0.2],
  B: [0.4, 0.5, 0.75, 0.95, 1, 1, 0.9, 0.6, 0.45, 0.55, 0.6],
  Cu: [1, 1, 1, 1, 0.95, 0.85, 0.65, 0.45, 0.3, 0.27, 0.25],
  Zn: [1, 1, 1, 1, 0.95, 0.85, 0.65, 0.45, 0.3, 0.27, 0.25],
  Mo: [0.15, 0.2, 0.3, 0.45, 0.6, 0.75, 0.9, 1, 1, 1, 1],
};

/** How available `n` is at `ph`, 0 to 1, between the table's steps. */
export function availability(n: Nutrient, ph: number): number {
  const p = Math.max(4, Math.min(9, ph));
  const i = Math.min(PH_STEPS.length - 2, Math.floor((p - 4) / 0.5));
  const f = (p - PH_STEPS[i]) / 0.5;
  return AVAIL[n][i] * (1 - f) + AVAIL[n][i + 1] * f;
}

/** The nutrients that are scarce (under half available) at `ph`. */
export const scarceAt = (ph: number): Nutrient[] => NUTRIENTS.filter((n) => availability(n, ph) < 0.5);

/** The least available nutrient at `ph`. */
export function leastAt(ph: number): { n: Nutrient; a: number } {
  let best = { n: NUTRIENTS[0] as Nutrient, a: 2 };
  for (const n of NUTRIENTS) {
    const a = availability(n, ph);
    if (a < best.a) best = { n, a };
  }
  return best;
}

/** Below this pH, aluminium dissolves and poisons roots. */
export const ALUMINIUM_PH = 5.2;

// ---- Reading leaves -------------------------------------------------------------

export type Shortage = 'N' | 'P' | 'K' | 'Mg' | 'Fe' | 'Ca';

export interface Sign {
  /** Where it shows first: old leaves, because the plant can move the nutrient to new growth, or new ones, because it can't. */
  where: 'old' | 'new';
  /** What the leaf looks like. */
  looks: string;
  /** How to draw it: the colour of the leaf, of its veins, and of its edge. */
  leaf: string;
  vein: string;
  edge?: string;
  /** The usual cause in a garden. */
  cause: string;
}

export const SIGNS: Record<Shortage, Sign> = {
  N: { where: 'old', looks: 'The oldest leaves turn pale yellow all over, and the whole plant looks pale and thin.', leaf: '#d9cf6a', vein: '#cfc35d', cause: 'Too little nitrogen, or roots sitting in waterlogged soil that cannot take it up.' },
  P: { where: 'old', looks: 'Old leaves go dull dark green, often with purple tints, and the plant stays small.', leaf: '#3f5f3a', vein: '#6b3f6e', edge: '#6b3f6e', cause: 'Cold soil in spring, a very acid or very chalky soil, or too little phosphorus.' },
  K: { where: 'old', looks: 'Old leaves yellow and then brown at the edges, as if scorched.', leaf: '#7fa04a', vein: '#6f9142', edge: '#8a5a2a', cause: 'Too little potassium, common in sandy soils where it washes out.' },
  Mg: { where: 'old', looks: 'Old leaves yellow between the veins, while the veins stay green.', leaf: '#d6cf6a', vein: '#4f8a38', cause: 'Too little magnesium, or too much potassium fertilizer crowding it off the parking spots.' },
  Fe: { where: 'new', looks: 'The youngest leaves yellow between the veins, the veins green; the old leaves stay green.', leaf: '#e3de8a', vein: '#4f8a38', cause: 'Usually not too little iron but too high a pH, which locks it away.' },
  Ca: { where: 'new', looks: 'New growth is stunted and twisted; in tomatoes, the fruit rots black at the blossom end.', leaf: '#5f8f3a', vein: '#4f7a33', edge: '#5a3a1a', cause: 'Usually uneven watering, which stops calcium moving with the water to new growth.' },
};
