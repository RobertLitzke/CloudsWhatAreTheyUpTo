// What every figure is made of, for Dirt. The figure machinery itself (a
// drawing, one text box, controls, a task the lesson waits on) is Didactics'
// figure.ts, re-exported here; this file adds Dirt's palette. Figures are drawn
// on the lesson's paper, in ink, with a handful of colours that always mean the
// same thing in every figure and in the text around them: sand is gold, silt
// olive, clay terracotta, water blue, air pale sky, and organic matter the
// near-black of humus.

import { courseKit } from 'didactics/kit';

export {
  animate, choices, figure, frame, lock, lockIn, placeable, quiz, textBox,
  type Choices, type FigureContext, type FigureFactory, type FigureHandle, type Frame, type Options, type Slider, type Task,
} from 'didactics/figure';

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

export type ColorKey = keyof typeof COL;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);
