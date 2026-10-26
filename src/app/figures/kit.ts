// What every figure is made of, for Dirt. The figure machinery itself (a
// drawing, one text box, controls, a task the lesson waits on) is lesson-kit's
// figure.ts, re-exported here; this file adds Dirt's palette. Figures are drawn
// on the lesson's paper, in ink, with a handful of colours that always mean the
// same thing in every figure and in the text around them: sand is gold, silt
// olive, clay terracotta, water blue, air pale sky, and organic matter the
// near-black of humus.

import { slider as kitSlider, type Slider } from 'lesson-kit/figure';
import { prose as kitProse } from 'lesson-kit/lesson';

export {
  animate, choices, figure, frame, lock, lockIn, placeable, quiz, textBox,
  type Choices, type FigureContext, type FigureFactory, type FigureHandle, type Frame, type Options, type Slider, type Task,
} from 'lesson-kit/figure';

export const COL = {
  ink: '#2b2418',
  soft: '#6b5d48',
  grid: 'rgba(43, 36, 24, 0.14)',
  paper: '#fbf7ec',
  // What soil is made of.
  mineral: '#a07d52',
  organic: '#3b2a1a',
  water: '#3a7fb4',
  air: '#6aa9c0',
  // The three sizes of grain.
  sand: '#c08a28',
  silt: '#7c8a5c',
  clay: '#b0502c',
  // Pale versions of the hues above, for fills behind ink.
  sandPale: '#f1dfb0',
  siltPale: '#dfe3cc',
  clayPale: '#f0cdb8',
  waterPale: '#cfe2f0',
  airPale: '#e6f2f6',
  // The garden.
  leaf: '#5f8f3a',
  leafPale: '#cfe0b0',
  root: '#e9dcc0',
  soil: '#4a3524',
  good: '#4f8f3a',
} as const;

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
