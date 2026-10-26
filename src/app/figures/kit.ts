// What every figure is made of, for Clouds. The figure machinery itself (a
// drawing, one text box, controls, a task the lesson waits on) is lesson-kit's
// figure.ts, re-exported here; this file adds Clouds' palette. Figures are
// drawn on the lesson's paper, in ink, with a handful of colours that always
// mean the same thing in every figure and in the text around them: the rising
// air is orange, the air around it violet, the dew point teal, ice blue, and
// sunlight gold.

import { slider as kitSlider, type Slider } from 'lesson-kit/figure';
import { prose as kitProse } from 'lesson-kit/lesson';

export {
  animate, choices, figure, frame, lock, lockIn, placeable, quiz, textBox,
  type Choices, type FigureContext, type FigureFactory, type FigureHandle, type Frame, type Options, type Slider, type Task,
} from 'lesson-kit/figure';
export { deg, height, temp } from 'lesson-kit/units';

export const COL = {
  ink: '#2a2547',
  soft: '#6a5c80',
  grid: 'rgba(42, 37, 71, 0.14)',
  paper: '#fffaf0',
  parcel: '#e0663f',
  env: '#7b4fa0',
  dew: '#0e7a8f',
  ice: '#3a7bd5',
  sun: '#f2a03d',
  cloud: '#ffffff',
  cloudShade: '#c9bfd9',
  rain: '#5a8fd8',
  ground: '#3d3459',
  warm: '#e88a6a',
  cold: '#7fa8d8',
  // Darker versions of the hues above, for text and thin lines on pale ground.
  warmInk: '#b0583a',
  coldInk: '#4f79a8',
  sunInk: '#b06a10',
  // Weather-map red and blue: warm and cold fronts, the low's L, and text that
  // has to stand out (a charge, a warning).
  red: '#d0472f',
  redInk: '#b03a25',
  blue: '#2f62b0',
  // Grounds a drawing is set on.
  sky: '#dcebf3',
  air: '#e9eef6',
  warmSide: '#fbeee6',
  warmAir: '#f7e2d4',
  subzero: '#cfe0f6',
  fog: '#f4f4f8',
  stratus: '#e4e2ec',
  field: '#a39150',
  dust: '#8f8a80',
} as const;

/**
 * The colours of a weather radar screen, from the weakest echo shown (5 dBZ)
 * up in steps of 5: blues for drizzle and snow, greens for rain, yellow and
 * red for heavy rain, magenta and purple for hail. Every radar figure uses
 * them, as every radar app does, so the reader can carry them to a real one.
 */
export const RADAR = ['#9fe3e8', '#5ab8e8', '#3a7bd5', '#4cc94c', '#2fa13a', '#1f7a2e', '#f2e03a', '#f2b02e', '#f07a22', '#e0352a', '#b81f2a', '#8f1020', '#e040c8', '#9a50c8'] as const;

/** The radar colour for an echo of `d` dBZ, or null when it is too faint to show. */
export function radarColor(d: number): string | null {
  if (!(d >= 5)) return null;
  return RADAR[Math.min(RADAR.length - 1, Math.floor((d - 5) / 5))];
}

/** A colour at the given opacity, for a translucent fill. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export type ColorKey = keyof typeof COL;

/** A labelled slider whose thumb wears one of the palette's colours. */
export function slider(label: string, min: number, max: number, step: number, value: number, show: (v: number) => string, onInput: (v: number) => void, color: ColorKey = 'ink'): Slider {
  return kitSlider(label, min, max, step, value, show, onInput, COL[color]);
}

/** A paragraph of lesson text: **bold**, *italic*, and [[words|key]] in the colour COL[key]. */
export const prose = (text: string): HTMLElement => kitProse(text, COL);
