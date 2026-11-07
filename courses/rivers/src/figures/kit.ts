// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';
export * from './plot';

export const COL = {
  ink: '#1f2a2e',
  soft: '#56656a',
  paper: '#f8faf6',
  grid: 'rgba(31, 42, 46, 0.14)',
  /** Fresh water: rivers, lakes, rain once it has landed. */
  water: '#2f7fb8',
  /** Salt water: the Sound, the Strait, the ocean. */
  salt: '#1d4f6e',
  /** Rain and snow falling. */
  rain: '#7aa6c8',
  /** Snow and ice, the water stored on the mountains. */
  snow: '#b9d3e3',
  /** Water underground: in soil, in an aquifer. */
  ground: '#3f9a8c',
  /** Mud, sand and gravel carried or laid down. */
  sediment: '#b0864a',
  /** Land and rock. */
  land: '#8f8a6a',
  rock: '#6e6a62',
  /** A current: arrows and speeds of moving water. */
  flow: '#d0572f',
  /** The Moon's pull and its tide. */
  moon: '#7b62b8',
  /** The Sun's pull and its tide; also heat and warm water. */
  sun: '#e0a030',
  /** Cold water. */
  cold: '#5aa0d8',
  /** Warm water. */
  warm: '#d9773a',
  /** Wind and waves. */
  wind: '#5a8a5a',
  /** Oxygen dissolved in water. */
  oxygen: '#3fa86a',
  /** Plants and algae (the next course's subject; here only as what greens the water). */
  leaf: '#5f8f3c',
  /** People's works: dams, levees, bulkheads, locks. */
  works: '#8a5a7a',
  /** A model's line, wherever it runs beside real numbers. */
  model: '#5b4b8a',
  /** Real measurements: always dots, in ink. */
  data: '#1f2a2e',
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
