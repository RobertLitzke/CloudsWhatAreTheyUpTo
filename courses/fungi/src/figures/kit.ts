// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';
export * from './plot';

export const COL = {
  ink: '#26221f',
  soft: '#645c55',
  paper: '#fbf8f1',
  grid: 'rgba(38, 34, 31, 0.14)',
  /** The fungus itself: hyphae, mycelium, mushrooms. */
  hypha: '#b9975b',
  /** A mushroom cap and other fruiting bodies. */
  cap: '#a8643a',
  /** Spores, wherever they go. */
  spore: '#7a4e8a',
  /** Food the fungus is eating: wood, leaves, sugar. */
  food: '#c98a2e',
  /** Enzymes the fungus pours out. */
  enzyme: '#d0507a',
  /** Plants, algae and anything green that makes sugar. */
  leaf: '#4f8a3c',
  /** Water. */
  water: '#3d7ea6',
  /** Carbon, as a store or a flow. */
  carbon: '#4a4a52',
  /** Nitrogen and phosphorus, the minerals fungi trade and hunt for. */
  nitrogen: '#3156a8',
  wood: '#7a5a3a',
  lignin: '#5e4130',
  soil: '#8b6f4e',
  /** Cold light: foxfire and glowing mushrooms. */
  glow: '#4fd08a',
  /** Poisons and antibiotics. */
  toxin: '#c4462f',
  /** Mating types and genotypes. */
  matA: '#d9772f',
  matB: '#3f9a9a',
  /** A model's line, wherever it runs beside real numbers. */
  model: '#5b4b8a',
  /** Real counts and measurements: always dots, in ink. */
  data: '#26221f',
  good: '#3f8f5a',
  bad: '#c0392b',
} as const;
export type ColorKey = keyof typeof COL;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);

/** A number with thousands separated: 40,000. */
export const big = (n: number) => Math.round(n).toLocaleString('en-US');

/** A number to `d` significant figures, without a run of zeros after the point. */
export const sig = (n: number, d = 2) => Number(n.toPrecision(d)).toLocaleString('en-US', { maximumFractionDigits: 6 });

/** A count in words a reader takes in at a glance: 2,400, 1.3 million, 19 million. */
export function count(n: number): string {
  if (n >= 1e9) return `${sig(n / 1e9, 2)} billion`;
  if (n >= 1e6) return `${sig(n / 1e6, n >= 1e7 ? 2 : 2)} million`;
  return big(n);
}
