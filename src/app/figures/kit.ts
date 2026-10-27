// What every figure is made of, for this course. The figure machinery itself
// (a drawing, one text box, controls, a task the lesson waits on) is
// lesson-kit's figure.ts, re-exported here; this file adds the palette and the
// pieces every camera figure needs.
//
// A colour means the same thing in every figure and in the text around it.
// The four decisions each have one: the aperture teal, time rose, the sensor
// and its noise violet, and focus green, which is also the colour of whatever
// is sharp. Light is gold, and what is out of focus grey-blue.

import type { FootnoteSet } from 'lesson-kit/footnote';
import { slider as kitSlider, type Slider } from 'lesson-kit/figure';
import { prose as kitProse } from 'lesson-kit/lesson';
import { APERTURE_STEPS, ISO_STEPS, SHUTTER_STEPS, apertureLabel, shutterLabel } from '../../core/camera';

export {
  animate, choices, figure, frame, lock, lockIn, placeable, quiz, textBox,
  type Choices, type FigureContext, type FigureFactory, type FigureHandle, type Frame, type Options, type Slider, type Task,
} from 'lesson-kit/figure';

export const COL = {
  ink: '#1d2430',
  soft: '#5d6a7d',
  grid: 'rgba(29, 36, 48, 0.14)',
  paper: '#f7f5f0',
  /** Light itself, and the exposure. */
  light: '#e8a33d',
  lightPale: '#f7e3bd',
  /** The aperture: the hole and everything that follows from its width. */
  aperture: '#1f8a8f',
  aperturePale: '#cce7e8',
  /** Time: the shutter, and everything that moves while it is open. */
  time: '#c4543f',
  timePale: '#f3d6ce',
  /** The sensor, the ISO dial and the grain they leave. */
  sensor: '#6a4fa3',
  sensorPale: '#ded3f0',
  /** Focus: where the lens is focused, and everything sharp because of it. */
  focus: '#3f7d4a',
  /** The same green, by the name a figure uses for "this part is sharp". */
  sharp: '#3f7d4a',
  /** Out of focus. */
  soften: '#8d9bb0',
  /** The colour of light, for the white-balance figures. */
  warm: '#e07a3c',
  cool: '#4a7fc1',
  subject: '#2f3a4a',
} as const;

export type ColorKey = keyof typeof COL;

/** A colour at the given opacity, for a translucent fill. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** A labelled slider whose thumb wears one of the palette's colours. */
export function slider(label: string, min: number, max: number, step: number, value: number, show: (v: number) => string, onInput: (v: number) => void, color: ColorKey = 'ink'): Slider {
  return kitSlider(label, min, max, step, value, show, onInput, COL[color]);
}

/**
 * A slider that steps through a list of camera settings rather than a range of
 * numbers, so every stop it lands on is one the camera really offers. Its
 * value is the index; `at()` gives the setting.
 */
export function stepSlider(label: string, steps: readonly number[], value: number, show: (v: number) => string, onInput: (v: number) => void, color: ColorKey = 'ink'): Slider & { at: () => number } {
  const start = nearestStep(steps, value);
  const s = slider(label, 0, steps.length - 1, 1, start, (i) => show(steps[i]), (i) => onInput(steps[i]), color);
  return { ...s, at: () => steps[s.value()] };
}

/** The place in `steps` nearest to `value`, by ratio, so stops are judged evenly. */
export function nearestStep(steps: readonly number[], value: number): number {
  let best = 0;
  for (let i = 1; i < steps.length; i++) {
    if (Math.abs(Math.log(steps[i] / value)) < Math.abs(Math.log(steps[best] / value))) best = i;
  }
  return best;
}

export const apertureSlider = (value: number, onInput: (v: number) => void) =>
  stepSlider('Aperture', APERTURE_STEPS, value, apertureLabel, onInput, 'aperture');

export const shutterSlider = (value: number, onInput: (v: number) => void) =>
  stepSlider('Shutter', SHUTTER_STEPS, value, (t) => `${shutterLabel(t)} s`, onInput, 'time');

export const isoSlider = (value: number, onInput: (v: number) => void) =>
  stepSlider('ISO', ISO_STEPS, value, (v) => String(v), onInput, 'sensor');

/** The zoom slider, in the equivalent millimetres the camera's own display shows. */
export const zoomSlider = (value: number, onInput: (v: number) => void) =>
  slider('Zoom', Math.log2(24), Math.log2(2000), 0.02, Math.log2(value), (l) => `${Math.round(2 ** l)} mm`, (l) => onInput(2 ** l), 'subject');

/** A distance, said the way a person would: 40 cm, 3.5 m, 120 m. */
export function distance(m: number): string {
  if (!isFinite(m)) return 'the horizon';
  if (m < 1) return `${Math.round(m * 100)} cm`;
  if (m < 10) return `${m.toFixed(1)} m`;
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** A paragraph of lesson text: **bold**, *italic*, [[words|key]] in the colour COL[key], and [^id] footnotes. */
export const prose = (text: string, notes?: FootnoteSet): HTMLElement => kitProse(text, COL, notes);
