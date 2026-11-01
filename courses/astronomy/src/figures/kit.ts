// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { choices, lock, lockIn, slider as kitSlider, type Slider, type Task } from 'didactics/figure';
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

/**
 * A guess before the controls: `ask` in the readout, the options as chips, and
 * the sliders locked until a pick is locked in; then `after(guess)` runs. The
 * guess is kept, so a reader who comes back finds it made. Returns whether the
 * guess is in.
 */
export function guessFirst(t: Task, f: { controls: HTMLElement; readout: HTMLElement }, o: { ask: string; options: readonly string[]; sliders: readonly Slider[]; buttons?: readonly HTMLButtonElement[]; after: (guess: number) => void }): () => boolean {
  let open = false;
  const pick = choices(o.options, () => (go.disabled = false));
  const go = lockIn('Lock it in', () => {
    const guess = pick.picked();
    if (guess < 0) return;
    t.keep(guess);
    pick.freeze(true);
    go.remove();
    lock(o.sliders, false);
    for (const b of o.buttons ?? []) b.disabled = false;
    open = true;
    o.after(guess);
  });
  go.disabled = true;
  lock(o.sliders, true);
  for (const b of o.buttons ?? []) b.disabled = true;
  f.controls.prepend(pick.node, go);
  f.readout.textContent = o.ask;
  queueMicrotask(() => {
    if (typeof t.kept === 'number' && !open) {
      pick.pick(t.kept);
      go.click();
    }
  });
  return () => open;
}

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
