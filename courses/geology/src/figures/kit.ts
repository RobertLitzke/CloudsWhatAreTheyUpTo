// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { choices, lock, lockIn, slider as kitSlider, type Slider, type Task } from 'didactics/figure';
import { prose as kitProse } from 'didactics/lesson';

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
} as const;
export type ColorKey = keyof typeof COL;

/** Layers of rock in a figure, from the bottom up: the same order wherever a stack is drawn. */
export const BEDS = ['#b4553a', '#e3c27a', '#8f9aa3', '#d9b98a', '#7c8f6a', '#c99a6b', '#a7a2c2', '#e8d8b5'] as const;

export const slider = (label: string, min: number, max: number, step: number, value: number, show: (v: number) => string, onInput: (v: number) => void, color: ColorKey = 'ink'): Slider =>
  kitSlider(label, min, max, step, value, show, onInput, COL[color]);

export const prose = (text: string) => kitProse(text, COL);

/** Hex to [r, g, b]. */
export const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * A guess before the controls: `ask` in the readout, the options as chips, and
 * the sliders locked until a pick is locked in; then `after(guess)` runs. The
 * guess is kept, so a reader who comes back finds it made. Returns whether the
 * guess is in.
 */
export function guessFirst(t: Task, f: { controls: HTMLElement; readout: HTMLElement }, o: { ask: string; options: readonly string[]; sliders: readonly Slider[]; hidden?: readonly HTMLElement[]; after: (guess: number) => void }): () => boolean {
  let open = false;
  const pick = choices(o.options, () => (go.disabled = false));
  const go = lockIn('Lock it in', () => {
    const guess = pick.picked();
    if (guess < 0) return;
    t.keep(guess);
    pick.freeze(true);
    go.remove();
    lock(o.sliders, false);
    for (const h of o.hidden ?? []) h.style.display = '';
    open = true;
    o.after(guess);
  });
  go.disabled = true;
  lock(o.sliders, true);
  for (const h of o.hidden ?? []) h.style.display = 'none';
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
