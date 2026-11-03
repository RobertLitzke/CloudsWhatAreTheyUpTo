// What every figure is made of, for this course. The figure machinery itself
// (a drawing, one text box, controls, a task the lesson waits on) is
// Didactics' figure.ts, re-exported here; this file adds the palette and the
// pieces every camera figure needs.
//
// A colour means the same thing in every figure and in the text around it.
// The four decisions each have one: the aperture teal, time rose, the sensor
// and its noise violet, and focus green, which is also the colour of whatever
// is sharp. Light is gold, and what is out of focus grey-blue.

import type { Slider } from 'didactics/figure';
import { courseKit } from 'didactics/kit';
import { length, type Units } from 'didactics/units';
import { APERTURE_STEPS, ISO_STEPS, SHUTTER_STEPS, apertureLabel, shutterLabel } from '../../core/camera';

export {
  animate, choices, figure, frame, lock, lockIn, placeable, quiz, textBox,
  type Choices, type FigureContext, type FigureFactory, type FigureHandle, type Frame, type Options, type Slider, type Task,
} from 'didactics/figure';

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

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);

/** A slider over the settings the camera really offers, one stop at a time. */
const stepSlider = (label: string, steps: readonly number[], value: number, show: (v: number) => string, onInput: (v: number) => void, color: ColorKey): Slider =>
  slider(label, { steps, value, show, onInput, color });

export const apertureSlider = (value: number, onInput: (v: number) => void) =>
  stepSlider('Aperture', APERTURE_STEPS, value, apertureLabel, onInput, 'aperture');

export const shutterSlider = (value: number, onInput: (v: number) => void) =>
  stepSlider('Shutter', SHUTTER_STEPS, value, (t) => `${shutterLabel(t)} s`, onInput, 'time');

export const isoSlider = (value: number, onInput: (v: number) => void) =>
  stepSlider('ISO', ISO_STEPS, value, (v) => String(v), onInput, 'sensor');

/** The zoom slider, in the equivalent millimetres the camera's own display shows, on a log scale. */
export const zoomSlider = (value: number, onInput: (v: number) => void) =>
  slider('Zoom', { min: 24, max: 2000, scale: 'log', step: 1, value, show: (v) => `${Math.round(v)} mm`, onInput, color: 'subject' });

/** A distance in the reader's units, said the way a person would: 40 cm, 3.5 m, 120 m; 16 in, 11 ft, 390 ft. */
export function distance(m: number, units: Units): string {
  return isFinite(m) ? length(m, units) : 'the horizon';
}

