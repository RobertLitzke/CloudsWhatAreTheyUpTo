// What every figure is made of, for Circuitry. The figure machinery itself (a
// drawing, one text box, controls, a task the lesson waits on) is Didactics'
// figure.ts, re-exported here; this file adds Circuitry's palette. Figures are
// drawn on the lesson's paper, in ink, with a handful of colours that always
// mean the same thing in every figure and in the text around them: voltage
// runs from the deep blue of ground up to a hot orange, current is the yellow
// of the dots that move along the wires, resistance is violet, and power and
// heat are red. Boards are solder-mask green with copper traces.

import type { FootnoteSet } from 'didactics/footnote';
import { slider as kitSlider, type Slider, type SliderOptions } from 'didactics/figure';
import { prose as kitProse } from 'didactics/lesson';

export {
  animate, choices, figure, frame, lock, lockIn, placeable, quiz, textBox,
  type Choices, type FigureContext, type FigureFactory, type FigureHandle, type Frame, type Options, type Slider, type Task,
} from 'didactics/figure';

export const COL = {
  ink: '#1d2530',
  soft: '#5b6675',
  grid: 'rgba(29, 37, 48, 0.12)',
  paper: '#fbfaf6',
  // The quantities: these name the colour in prose too, as [[volts|voltage]].
  ground: '#2f4f9e',
  voltage: '#e0662a',
  current: '#e8b416',
  resistance: '#7a4fb0',
  power: '#c7362f',
  // The board.
  mask: '#1f5a43',
  copper: '#c8793a',
  solder: '#b9bec4',
  silk: '#f3f1ea',
  good: '#2f8a4f',
} as const;

/** A colour at the given opacity, for a translucent fill. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export type ColorKey = keyof typeof COL;

/**
 * A labelled slider whose thumb wears one of the palette's colours. The
 * options form takes `steps` (a list of set values, such as the E-series
 * resistors a lesson offers) or `scale: 'log'`; `show` and `onInput` get
 * real values either way.
 */
export function slider(label: string, min: number, max: number, step: number, value: number, show: (v: number) => string, onInput: (v: number) => void, color?: ColorKey): Slider;
export function slider(label: string, o: Omit<SliderOptions, 'color'> & { color?: ColorKey }): Slider;
export function slider(label: string, a: number | (Omit<SliderOptions, 'color'> & { color?: ColorKey }), max?: number, step?: number, value?: number, show?: (v: number) => string, onInput?: (v: number) => void, color: ColorKey = 'ink'): Slider {
  if (typeof a === 'object') return kitSlider(label, { ...a, color: COL[a.color ?? 'ink'] });
  return kitSlider(label, a, max!, step!, value!, show!, onInput!, COL[color]);
}

/** A paragraph of lesson text: **bold**, *italic*, [[words|key]] in the colour COL[key], and [^id] footnotes from `notes`. */
export const prose = (text: string, notes?: FootnoteSet): HTMLElement => kitProse(text, COL, notes);
