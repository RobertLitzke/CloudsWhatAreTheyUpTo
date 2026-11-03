// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';

export const COL = {
  ink: '#141a2e',
  soft: '#5a6074',
  paper: '#fbf9f3',
  grid: 'rgba(20, 26, 46, 0.14)',
  /** A wave as it is heard: the pressure against time. */
  wave: '#1f8fa3',
  /** Harmonics, and a spectrum's bars. */
  harmonic: '#e0661a',
  /** A filter's curve, and a resonance. */
  filter: '#7a5bc8',
  /** A second tone, beside the first. */
  second: '#c8507a',
  /** The sum of two tones, or what comes out. */
  sum: '#141a2e',
  /** Time and echoes. */
  time: '#4b8a3c',
  /** Clipping, and the grit it adds. */
  grit: '#c0392b',
  good: '#2f8f5a',
  bad: '#c0392b',
} as const;
export type ColorKey = keyof typeof COL;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);

/** A frequency as it reads best: 440 Hz, 2.4 kHz. */
export const hz = (f: number) => (f < 1000 ? `${Math.round(f)} Hz` : `${(f / 1000).toFixed(f < 10000 ? 1 : 0)} kHz`);

/** A path through `n` points of `f(x)` for x from 0 to 1, drawn in the box at (x0, y) of width w and half-height h. */
export function trace(f: (x: number) => number, x0: number, y: number, w: number, h: number, n = 240): string {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const x = i / n;
    d += `${i ? 'L' : 'M'}${(x0 + x * w).toFixed(1)},${(y - f(x) * h).toFixed(1)}`;
  }
  return d;
}
