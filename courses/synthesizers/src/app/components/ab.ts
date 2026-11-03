// The switch that says which patch is heard: the target, yours, and after a
// puzzle is committed the patch you started from. Space flips between the
// first two.

import { el } from '../dom';

export interface AbOption {
  label: string;
  /** Colours the button when it is on: `target` is orange, the others cyan. */
  cls: 'target' | 'mine' | 'start';
  hidden?: boolean;
}

export interface Ab {
  el: HTMLElement;
  buttons: HTMLElement[];
  /** Which one is on. */
  readonly on: number;
  /** Switch without telling the owner, who is the one asking. */
  show(i: number): void;
  destroy(): void;
}

export function createAb(options: readonly AbOption[], initial: number, onPick: (i: number) => void): Ab {
  let on = initial;
  const buttons = options.map((o) => el(`button.${o.cls}`, { type: 'button', hidden: o.hidden === true }, o.label));
  const root = el('div.ab', { role: 'group', 'aria-label': 'Which patch you hear' }, buttons);
  const paint = () => buttons.forEach((b, i) => b.classList.toggle('on', i === on));
  const pick = (i: number) => {
    on = i;
    paint();
    onPick(i);
  };
  buttons.forEach((b, i) => b.addEventListener('click', () => pick(i)));

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== ' ' || e.target instanceof HTMLInputElement) return;
    e.preventDefault();
    // A focused button would also fire on key-up; take the focus away first.
    if (e.target instanceof HTMLButtonElement) e.target.blur();
    pick(on === 0 ? 1 : 0);
  };
  document.addEventListener('keydown', onKey);

  paint();
  return {
    el: root,
    buttons,
    get on() {
      return on;
    },
    show(i) {
      on = i;
      paint();
    },
    destroy() {
      document.removeEventListener('keydown', onKey);
    },
  };
}
