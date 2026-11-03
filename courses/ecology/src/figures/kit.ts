// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';
export * from './plot';

export const COL = {
  ink: '#1f2a28',
  soft: '#5b6762',
  paper: '#fbf8ef',
  grid: 'rgba(31, 42, 40, 0.14)',
  /** Plants and whatever grows from sunlight: grass, kelp, lichen. */
  plant: '#4f8a3c',
  lichen: '#a3b36a',
  /** Plant-eaters and prey: hares, reindeer, urchins. */
  prey: '#c98a2e',
  /** Predators: lynx, sea stars, otters, wolves. */
  predator: '#7a3b6e',
  /** A second competitor, beside `prey` as the first. */
  rival: '#2f7f9a',
  /** Births, and whatever flows in. */
  births: '#2f8a6a',
  /** Deaths, and whatever flows out. */
  deaths: '#b4553a',
  water: '#3d7ea6',
  sea: '#2f6f8f',
  rock: '#9a917f',
  soil: '#8b6f4e',
  sun: '#e3b04b',
  heat: '#c4462f',
  /** A model's line, wherever it runs beside real numbers. */
  model: '#5b4b8a',
  /** Real counts and measurements: always dots, in ink. */
  data: '#1f2a28',
  rose: '#a8448f',
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
