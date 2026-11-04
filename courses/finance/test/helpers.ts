// Building figures outside a lesson, and working their controls, for the tests.
import { emptyProgress } from 'didactics/progress';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

export const context = () => ({ save: emptyProgress('imperial'), closed: new AbortController().signal, score: () => {} });

export function setSlider(node: HTMLElement, n: number, value: number): void {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  if (!input) throw new Error(`no slider ${n}`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

export const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}" among ${[...node.querySelectorAll('button')].map((x) => x.textContent?.trim()).join(' | ')}`);
  b.dispatchEvent(new Event('click'));
};

/** Pick a guess and lock it in. */
export const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};
