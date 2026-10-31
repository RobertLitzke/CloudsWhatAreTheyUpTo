// The pieces every lesson's figures share: a guess asked before the circuit
// shows the answer, a multimeter's face, and the stars a design task earns.
//
// A guess is asked before a figure uncovers what it would otherwise show at a
// glance (the colours, the dots, the glow): the reader picks an answer, or
// says they are not sure, and locks it in; only then does the drawing show
// what really happens. Being wrong is expected and said to be: each option
// can carry its own reply, so a common wrong guess is met with why it is
// tempting rather than a cross.

import { el, svg } from 'didactics/dom';
import { label } from 'didactics/draw';
import { choices, COL, lockIn } from './kit';

export interface GuessOptions {
  question: string;
  options: string[];
  /** The right option's index. */
  answer: number;
  /** What to say for each option once locked in, by index; the "not sure" reply is `unsure`. */
  replies: string[];
  unsure?: string;
  /** Called once the guess is locked in, with whether it was right (false when unsure). */
  onLock: (picked: number, right: boolean) => void;
}

export interface Guess {
  node: HTMLElement;
  /** The reply to show once locked in, or '' before. */
  reply: () => string;
  locked: () => boolean;
}

/** A question, its options plus "I'm not sure", and a button to lock the guess in. */
export function guess(o: GuessOptions): Guess {
  const all = [...o.options, 'I’m not sure'];
  let locked = false;
  let reply = '';
  const pick = choices(all, () => (button.disabled = false));
  const button = lockIn('Lock it in', () => {
    const k = pick.picked();
    if (k < 0 || locked) return;
    locked = true;
    pick.freeze(true);
    button.remove();
    const unsure = k === o.options.length;
    reply = unsure ? (o.unsure ?? 'Fair enough. Here is what happens.') : o.replies[k];
    node.classList.add('locked');
    o.onLock(k, !unsure && k === o.answer);
  });
  button.disabled = true;
  const node = el('div.guess', {}, el('p.guess-q', {}, o.question), pick.node, button);
  return { node, reply: () => reply, locked: () => locked };
}

export interface MeterFace {
  node: SVGGElement;
  /** Show a reading, such as "4.52" with its unit "V", or a word such as "FUSE". */
  show(reading: string, unit: string, mode: string): void;
}

/** A multimeter's face, `w` wide, with its top-left corner at x, y. */
export function meterFace(x: number, y: number, w = 96): MeterFace {
  const h = w * 0.56;
  const value = label(x + w - 12, y + h * 0.74, '', { anchor: 'end', attrs: { 'font-size': w * 0.2, 'font-family': 'var(--mono)', fill: COL.ink } });
  const unit = label(x + w - 10, y + h * 0.74, '', { size: 'note', attrs: { 'font-family': 'var(--mono)' } });
  const mode = label(x + 12, y + 19, '', { size: 'small', bold: true });
  const node = svg('g', { class: 'meter-face' },
    svg('rect', { x, y, width: w + 14, height: h, rx: 7, fill: '#f0b23e', stroke: COL.ink, 'stroke-width': 1.6 }),
    svg('rect', { x: x + 6, y: y + 6, width: w + 2, height: h - 12, rx: 3, fill: '#c9d4b8', stroke: COL.ink, 'stroke-width': 1 }),
    value, unit, mode,
  ) as SVGGElement;
  return {
    node,
    show(reading, u, m) {
      value.textContent = reading;
      unit.textContent = u;
      mode.textContent = m;
    },
  };
}

/** A probe's tip at a point on the drawing: red or black. */
export function probeTip(colour: 'red' | 'black'): SVGGElement {
  const fill = colour === 'red' ? '#d23b2a' : COL.ink;
  return svg('g', { class: `probe probe-${colour}`, style: 'pointer-events: none' },
    svg('circle', { r: 6.5, fill, stroke: COL.paper, 'stroke-width': 1.6 }),
    svg('circle', { r: 2, fill: COL.paper }),
  ) as SVGGElement;
}

export function placeTip(tip: SVGGElement, at: [number, number] | undefined): void {
  if (!at) {
    tip.setAttribute('display', 'none');
    return;
  }
  tip.removeAttribute('display');
  tip.setAttribute('transform', `translate(${at[0]} ${at[1]})`);
}

/** The stars a design task earns, shown once it is done: one per thing done well, each with what it was for. */
export function stars(earned: { text: string; got: boolean }[]): HTMLElement {
  return el('div.stars', {}, earned.map((s) => el('p', { className: s.got ? 'star got' : 'star' }, el('span', { 'aria-hidden': 'true' }, s.got ? '★' : '☆'), ' ', s.text)));
}
