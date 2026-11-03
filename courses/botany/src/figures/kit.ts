// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { slider as kitSlider, type Slider } from 'didactics/figure';
import { prose as kitProse } from 'didactics/lesson';

export * from 'didactics/figure';
export * from './plot';

export const COL = {
  ink: '#23281f',
  soft: '#5f6656',
  paper: '#fbf8f1',
  grid: 'rgba(35, 40, 31, 0.14)',
  /** Green tissue, and the leaf's gains. */
  leaf: '#4f8a3c',
  /** Water, wherever it moves. */
  water: '#3d7ea6',
  /** Sugar, and whatever the plant makes from it. */
  sugar: '#c98a2e',
  /** Carbon dioxide. */
  co2: '#6b6f78',
  /** Oxygen. */
  o2: '#2f9a9a',
  light: '#e3b04b',
  heat: '#c4462f',
  soil: '#8b6f4e',
  wood: '#7a5a3a',
  bark: '#5e4b3c',
  /** Nitrogen and the other minerals. */
  nitrogen: '#7a3b6e',
  mineral: '#8f7fd0',
  red: '#c0392b',
  blue: '#3156a8',
  green: '#3f9a3f',
  autumn: '#d9772f',
  /** A model's line, wherever it runs beside real numbers. */
  model: '#5b4b8a',
  /** Real counts and measurements: always dots, in ink. */
  data: '#23281f',
  good: '#3f8f5a',
  bad: '#c0392b',
} as const;
export type ColorKey = keyof typeof COL;

export const slider = (label: string, min: number, max: number, step: number, value: number, show: (v: number) => string, onInput: (v: number) => void, color: ColorKey = 'ink'): Slider =>
  kitSlider(label, min, max, step, value, show, onInput, COL[color]);

export const prose = (text: string) => kitProse(text, COL);

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
