// Small pieces every view uses.

import { formatDiff } from '../core/score';
import { el, type Child } from './dom';
import { getSave } from './store';

export function page(...children: Child[]): HTMLElement {
  return el('div.page', {}, ...children);
}

/** A score against goal, coloured: under goal good, over goal orange. */
export function diffSpan(diff: number): HTMLElement {
  return el(`span.num${diff < 0 ? '.under' : diff > 0 ? '.over' : ''}`, {}, formatDiff(diff));
}

/**
 * A view that wants the whole screen on a phone held sideways (a puzzle, free
 * play): the top bar steps aside there. Returns the way back out.
 */
export function immersive(): () => void {
  document.body.classList.add('immersive');
  return () => document.body.classList.remove('immersive');
}

/** The click of a detent, felt: a few milliseconds of buzz where the phone can and the player wants it. */
export function tick(ms = 8): void {
  if (!getSave().haptics) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not allowed here (an iframe, a browser that refuses): the knob still turns.
  }
}

let toastTimer = 0;

/** A short message at the foot of the screen, with an optional action. */
export function toast(message: string, action?: { label: string; run: () => void }, lingerMs = 2600): void {
  document.querySelector('.toast-host')?.remove();
  clearTimeout(toastTimer);
  const node = el('div.toast', { role: 'status' }, message);
  // In a .pm box of its own, so PatchMatch's styles reach it on any course page.
  const host = el('div.pm.toast-host', {}, node);
  if (action) {
    node.append(
      el(
        'button.btn.btn-small',
        {
          onclick: () => {
            host.remove();
            action.run();
          },
        },
        action.label,
      ),
    );
  }
  document.body.append(host);
  if (!action) toastTimer = window.setTimeout(() => host.remove(), lingerMs);
}

export async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${what} copied`);
  } catch {
    // No clipboard access (an insecure origin, or file://): show it to copy by hand.
    window.prompt(`Copy the ${what.toLowerCase()}:`, text);
  }
}

export function randomUnit(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}

/** A row of mutually exclusive buttons. */
export function segmented<T extends string | number>(
  options: readonly { value: T; label: string; disabled?: boolean }[],
  initial: T,
  onPick: (value: T) => void,
): HTMLElement {
  let current = initial;
  const buttons = options.map((o) =>
    el(
      'button',
      {
        type: 'button',
        disabled: o.disabled === true,
        onclick: () => {
          current = o.value;
          paint();
          onPick(o.value);
        },
      },
      o.label,
    ),
  );
  const paint = () => buttons.forEach((b, i) => b.classList.toggle('on', options[i].value === current));
  paint();
  return el('div.seg', { role: 'group' }, buttons);
}
