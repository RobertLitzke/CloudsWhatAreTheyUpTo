// A playable keyboard strip for free play: touch or mouse on the strip, or the
// computer's own keys (A W S E D F ... like a piano's white and black keys, Z
// and X to change octave).
//
// The synth has one voice. Whatever is pressed last sounds; lifting it hands
// the voice back to a key still held under it.

import { el } from '../dom';

const WHITE = [0, 2, 4, 5, 7, 9, 11];
/** Computer keys by semitone above the strip's lowest C. */
const TYPING = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';'];
const LOWEST_C = 24;
const HIGHEST_C = 84;

export interface KeysOptions {
  /** The note that should sound now, or null for none. */
  onNote: (midi: number | null) => void;
  /** Every key going down or coming up, for a recorder. */
  onKey?: (midi: number, down: boolean) => void;
}

export interface Keys {
  el: HTMLElement;
  /** Off: nothing plays, from the strip or from the computer keyboard. */
  setActive(on: boolean): void;
  /** Let go of everything and stop listening to the computer keyboard. */
  destroy(): void;
}

export function createKeys(opts: KeysOptions): Keys {
  // A narrow screen gets fewer, wider keys. Turning a phone on its side changes which.
  const narrow = window.matchMedia('(max-width: 720px)');
  let semitones = narrow.matches ? 16 : 24;
  let base = 48; // C3
  let active = true;

  const held: number[] = [];
  const byPointer = new Map<number, number>();
  const byTyping = new Map<string, number>();
  const keyEls = new Map<number, HTMLElement>();

  const strip = el('div.keys', { role: 'group', 'aria-label': 'Keyboard' });

  const paintHeld = () => {
    for (const [midi, node] of keyEls) node.classList.toggle('down', held.includes(midi));
  };

  const press = (midi: number) => {
    held.push(midi);
    opts.onKey?.(midi, true);
    opts.onNote(midi);
    paintHeld();
  };
  const release = (midi: number) => {
    const i = held.lastIndexOf(midi);
    if (i < 0) return;
    const wasTop = i === held.length - 1;
    held.splice(i, 1);
    opts.onKey?.(midi, false);
    if (wasTop) opts.onNote(held.length > 0 ? held[held.length - 1] : null);
    paintHeld();
  };
  const releaseAll = () => {
    for (const midi of [...held].reverse()) release(midi);
    byPointer.clear();
    byTyping.clear();
  };

  const build = () => {
    keyEls.clear();
    const whites = [];
    for (let s = 0; s <= semitones; s++) if (WHITE.includes(s % 12)) whites.push(s);
    const width = 100 / whites.length;
    const nodes: HTMLElement[] = [];
    for (let s = 0; s <= semitones; s++) {
      const midi = base + s;
      const white = WHITE.includes(s % 12);
      const node = el(`div.key.${white ? 'white' : 'black'}`, { dataset: { midi: String(midi) } }, el('span.key-hint', {}, TYPING[s] ?? ''));
      if (white) {
        node.style.left = `${whites.indexOf(s) * width}%`;
        node.style.width = `${width}%`;
      } else {
        // A black key straddles the line between the whites either side of it.
        node.style.left = `${whites.indexOf(s - 1) * width + width * 0.68}%`;
        node.style.width = `${width * 0.64}%`;
      }
      keyEls.set(midi, node);
      nodes.push(node);
    }
    strip.replaceChildren(...nodes);
    strip.setAttribute('aria-label', `Keyboard, from C${base / 12 - 1}`);
  };

  const shift = (octaves: number) => {
    const next = base + 12 * octaves;
    if (next < LOWEST_C || next + semitones > HIGHEST_C + 12) return;
    releaseAll();
    base = next;
    build();
  };

  // --- pointer ---------------------------------------------------------------
  const keyAt = (x: number, y: number): number | null => {
    const hit = document.elementFromPoint(x, y);
    const node = hit instanceof HTMLElement ? hit.closest<HTMLElement>('.key') : null;
    return node && strip.contains(node) ? Number(node.dataset.midi) : null;
  };
  strip.addEventListener('pointerdown', (e) => {
    const midi = active ? keyAt(e.clientX, e.clientY) : null;
    if (midi == null) return;
    e.preventDefault();
    strip.setPointerCapture(e.pointerId);
    byPointer.set(e.pointerId, midi);
    press(midi);
  });
  strip.addEventListener('pointermove', (e) => {
    const was = byPointer.get(e.pointerId);
    if (was == null) return;
    const midi = keyAt(e.clientX, e.clientY);
    if (midi == null || midi === was) return;
    // Sliding along the strip plays each key it crosses.
    byPointer.set(e.pointerId, midi);
    press(midi);
    release(was);
  });
  const lift = (e: PointerEvent) => {
    const was = byPointer.get(e.pointerId);
    if (was == null) return;
    byPointer.delete(e.pointerId);
    release(was);
  };
  strip.addEventListener('pointerup', lift);
  strip.addEventListener('pointercancel', lift);

  // --- computer keyboard -------------------------------------------------------
  const typingIn = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
  const onDown = (e: KeyboardEvent) => {
    if (!active || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typingIn(e.target)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' || k === 'x') {
      shift(k === 'z' ? -1 : 1);
      return;
    }
    const s = TYPING.indexOf(k);
    if (s < 0 || s > semitones || byTyping.has(k)) return;
    e.preventDefault();
    byTyping.set(k, base + s);
    press(base + s);
  };
  const onUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const midi = byTyping.get(k);
    if (midi == null) return;
    byTyping.delete(k);
    release(midi);
  };
  document.addEventListener('keydown', onDown);
  document.addEventListener('keyup', onUp);
  // A key held while the window loses focus never sends its key-up.
  window.addEventListener('blur', releaseAll);

  const onWidth = () => {
    releaseAll();
    semitones = narrow.matches ? 16 : 24;
    // Keep the top of the strip inside the range the octave buttons allow.
    while (base + semitones > HIGHEST_C + 12) base -= 12;
    build();
  };
  narrow.addEventListener('change', onWidth);

  build();
  const root = el(
    'div.keys-wrap',
    {},
    el('button.btn.octave', { type: 'button', 'aria-label': 'Octave down', onclick: () => shift(-1) }, '−'),
    strip,
    el('button.btn.octave', { type: 'button', 'aria-label': 'Octave up', onclick: () => shift(1) }, '+'),
  );

  return {
    el: root,
    setActive(on) {
      if (!on) releaseAll();
      active = on;
    },
    destroy() {
      releaseAll();
      document.removeEventListener('keydown', onDown);
      document.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', releaseAll);
      narrow.removeEventListener('change', onWidth);
    },
  };
}
