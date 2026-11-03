// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';

export const COL = {
  ink: '#2b2622',
  soft: '#6e6258',
  paper: '#fbf6ec',
  grid: 'rgba(43, 38, 34, 0.14)',
  /** Older, deeper in the pile. */
  old: '#5b4b8a',
  /** Younger, higher up. */
  young: '#c98a2e',
  water: '#3d7ea6',
  wind: '#c7782f',
  sand: '#d4a54a',
  mud: '#8b7a66',
  shell: '#b9a587',
  fossil: '#8a5a2b',
  heat: '#c4462f',
  pressure: '#2f6f8f',
  crystal: '#2a8c7a',
  glass: '#3b3a48',
  rose: '#a8448f',
  good: '#3f8f5a',
  bad: '#c0392b',
  /** Hot, slowly flowing mantle under the plates (asthenosphere): the same fill in every cross-section. */
  mantle: '#ecc4aa',
  /** Stiff mantle rock that is part of a plate, under its crust. */
  lid: '#7d8aa3',
  /** Ocean crust (basalt). */
  oceanCrust: '#3b3a48',
  /** Continental crust. */
  landCrust: '#cdb07f',
} as const;
export type ColorKey = keyof typeof COL;

/** Layers of rock in a figure, from the bottom up: the same order wherever a stack is drawn. */
export const BEDS = ['#b4553a', '#e3c27a', '#8f9aa3', '#d9b98a', '#7c8f6a', '#c99a6b', '#a7a2c2', '#e8d8b5'] as const;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);

/** Hex to [r, g, b]. */
export const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** A guess before the controls; see didactics/figure guessFirst. */
export { guessFirst } from 'didactics/figure';
