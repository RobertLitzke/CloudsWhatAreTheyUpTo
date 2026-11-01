// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { slider as kitSlider, type Slider } from 'didactics/figure';
import { prose as kitProse } from 'didactics/lesson';

export * from 'didactics/figure';

export const COL = {
  ink: '#1f2233',
  soft: '#5f6275',
  paper: '#fbf8f1',
  grid: 'rgba(31, 34, 51, 0.13)',
  /** The night sky, wherever a figure shows it. */
  sky: '#141a2e',
  skyLine: '#3a4363',
  sun: '#e8a93a',
  earth: '#3f7fb0',
  moon: '#8d8a84',
  /** Light, rays and lines of sight. */
  light: '#d9a521',
  planet: '#c4583c',
  orbit: '#8a8fa8',
  /** What was measured. */
  seen: '#1f2233',
  /** What a model predicts. */
  model: '#c75b6a',
  hot: '#4f7fd8',
  cool: '#d0553a',
  heat: '#c4462f',
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

/** A guess before the controls; see didactics/figure guessFirst. */
export { guessFirst } from 'didactics/figure';

/** A row of on/off buttons; `onChange` gets which are on. */
export function toggles(names: readonly string[], on: readonly boolean[], onChange: (on: boolean[]) => void): { node: HTMLElement; buttons: HTMLButtonElement[]; set: (i: number, v: boolean) => void } {
  const state = names.map((_, i) => !!on[i]);
  const node = document.createElement('div');
  node.className = 'chips';
  const buttons = names.map((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = n;
    b.setAttribute('aria-pressed', String(state[i]));
    b.classList.toggle('on', state[i]);
    b.addEventListener('click', () => {
      state[i] = !state[i];
      b.setAttribute('aria-pressed', String(state[i]));
      b.classList.toggle('on', state[i]);
      onChange(state.slice());
    });
    node.append(b);
    return b;
  });
  const set = (i: number, v: boolean) => {
    state[i] = v;
    buttons[i].setAttribute('aria-pressed', String(v));
    buttons[i].classList.toggle('on', v);
  };
  return { node, buttons, set };
}
