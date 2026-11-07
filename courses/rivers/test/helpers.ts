// What the figure tests share: a figure context, setting sliders, clicking
// buttons, locking in a guess, and a live chart's options from the lessons.

import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import type { Units } from 'didactics/units';
import { WRITTEN } from '../src/lessons';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

export const context = (units: Units = 'metric') => ({ save: emptyProgress(units), closed: new AbortController().signal, score: () => {} });

/** A chart's options, from the one block in the written lessons with that id (the first, if several). */
export const blockOptions = (id: string, lesson?: string) => {
  const b = WRITTEN.filter((l) => !lesson || l.id === lesson).flatMap((l) => l.parts.flatMap((p) => p.blocks)).find((x) => isDiagram(x) && x.id === id);
  return b && isDiagram(b) ? b.options : undefined;
};

/** Set the `n`th range slider in a figure and fire its input event. */
export function setSlider(node: HTMLElement, n: number, value: number): void {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  if (!input) throw new Error(`no slider ${n}`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

/** Click the button whose text is `text`. */
export const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}" (have: ${[...node.querySelectorAll('button')].map((x) => x.textContent?.trim()).join(' | ')})`);
  b.dispatchEvent(new Event('click'));
};

/** Pick a guess and lock it in. */
export const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};
