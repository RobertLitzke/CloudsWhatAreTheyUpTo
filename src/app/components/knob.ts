// A knob drawn in SVG.
//
// Stepped (the puzzle): a ring of LED dots, one per detent. It is never
// dragged, because every click is a move. Tap a dot, or the space around it, to
// go there (each detent crossed is a move). Tap the knob's face, or below it
// where the − and + are, to go one detent left or right. The arrow keys and a
// mouse wheel also step. Continuous (free play): an arc, and it drags.
//
// Cyan is always yours; orange is always the target (the ghost ring shown after
// a puzzle is committed).

import { el, svg } from '../dom';

const SIZE = 64;
const C = SIZE / 2;
const SWEEP = 270;
const R_DOTS = 27;
const R_BODY = 19;
const END_SLACK = 5; // degrees

function angleAt(fraction: number): number {
  return -SWEEP / 2 + SWEEP * fraction;
}

function polar(r: number, degrees: number): [number, number] {
  const a = ((degrees - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

export interface KnobOptions {
  label: string;
  /** Number of positions. */
  count: number;
  continuous: boolean;
  format: (pos: number) => string;
  /** Stepped: asked to move one detent. */
  onStep?: (dir: -1 | 1) => void;
  /** Stepped: asked to go to a detent, however far. The owner counts the moves. */
  onJump?: (pos: number) => void;
  /** Continuous: dragged to a new position. */
  onChange?: (pos: number) => void;
}

export interface Knob {
  el: HTMLElement;
  set(pos: number): void;
  /** Show (or clear) the target's position. */
  setGhost(pos: number | null): void;
  /** `locked`: not in play at this stage. `inactive`: has no effect in the current patch. */
  setState(state: { locked?: boolean; inactive?: boolean; disabled?: boolean }): void;
}

export function createKnob(opts: KnobOptions): Knob {
  const last = opts.count - 1;
  let pos = 0;
  let turnedOff = false;
  let locked = false;
  const disabled = () => turnedOff || locked;

  const dots: SVGElement[] = [];
  const ring = svg('g', { class: 'knob-dots' });
  if (!opts.continuous) {
    for (let i = 0; i <= last; i++) {
      const [x, y] = polar(R_DOTS, angleAt(i / last));
      const dot = svg('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 2.4, class: 'knob-dot' });
      dots.push(dot);
      ring.append(dot);
    }
  }
  const track = svg('path', { class: 'knob-track', fill: 'none' });
  const arc = svg('path', { class: 'knob-arc', fill: 'none' });
  const ghost = svg('circle', { r: 4.6, class: 'knob-ghost', fill: 'none' });
  const pointer = svg('line', { class: 'knob-pointer', x1: C, y1: C - 7, x2: C, y2: C - 17 });
  const body = svg('circle', { cx: C, cy: C, r: R_BODY, class: 'knob-body' });

  const arcPath = (from: number, to: number) => {
    const [x1, y1] = polar(R_DOTS, from);
    const [x2, y2] = polar(R_DOTS, to);
    const large = to - from > 180 ? 1 : 0;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${R_DOTS} ${R_DOTS} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  const art = svg('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'knob-art', 'aria-hidden': 'true' });
  if (opts.continuous) {
    track.setAttribute('d', arcPath(-SWEEP / 2, SWEEP / 2));
    art.append(track, arc);
  } else {
    art.append(ring);
    const minus = svg('text', { x: 5, y: SIZE - 1, class: 'knob-sign' });
    minus.textContent = '−';
    const plus = svg('text', { x: SIZE - 5, y: SIZE - 1, class: 'knob-sign', 'text-anchor': 'end' });
    plus.textContent = '+';
    art.append(minus, plus);
  }
  art.append(body, pointer, ghost);
  ghost.style.display = 'none';

  const value = el('div.knob-value');
  const control = el(
    'div.knob-control',
    { tabIndex: 0, role: 'slider', 'aria-label': opts.label, 'aria-valuemin': '0', 'aria-valuemax': String(last) },
  );
  control.append(art);
  const root = el('div.knob', {}, el('div.knob-label', {}, opts.label), control, value);

  const render = () => {
    const a = angleAt(pos / last);
    pointer.setAttribute('transform', `rotate(${a.toFixed(2)} ${C} ${C})`);
    if (opts.continuous) {
      arc.setAttribute('d', pos > 0.001 ? arcPath(-SWEEP / 2, a) : '');
    } else {
      dots.forEach((d, i) => d.classList.toggle('lit', i === Math.round(pos)));
    }
    const text = opts.format(pos);
    value.textContent = text;
    control.setAttribute('aria-valuenow', String(pos));
    control.setAttribute('aria-valuetext', text);
  };

  const step = (dir: -1 | 1) => {
    if (disabled()) return;
    if (opts.continuous) {
      const next = Math.min(last, Math.max(0, pos + dir * (last / 40)));
      if (next !== pos) opts.onChange?.(next);
    } else if ((dir < 0 && pos > 0) || (dir > 0 && pos < last)) {
      opts.onStep?.(dir);
    }
  };

  control.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(1);
    else return;
    e.preventDefault();
  });

  if (opts.continuous) {
    let startY = 0;
    let startPos = 0;
    control.addEventListener('pointerdown', (e) => {
      if (disabled()) return;
      control.setPointerCapture(e.pointerId);
      startY = e.clientY;
      startPos = pos;
      e.preventDefault();
      control.focus();
    });
    control.addEventListener('pointermove', (e) => {
      if (!control.hasPointerCapture(e.pointerId)) return;
      // 160 px of travel covers the whole range.
      const next = Math.min(last, Math.max(0, startPos + ((startY - e.clientY) / 160) * last));
      if (next !== pos) opts.onChange?.(next);
    });
    control.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        step(e.deltaY < 0 ? 1 : -1);
      },
      { passive: false },
    );
  } else {
    // Where a tap lands. Outside the knob's face and within the dots' sweep, it
    // names the dot at that angle, so each dot is a wedge rather than a 5px
    // circle. The face and the gap at the foot, where the − and + are, step one.
    type Aim = { jump: number } | { step: -1 | 1 };
    const aimAt = (e: MouseEvent): Aim => {
      const box = control.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height / 2);
      const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
      // The end dots sit on the edge of the sweep, so the edge gets a little slack.
      if (Math.hypot(dx, dy) > (box.width * R_BODY) / SIZE && Math.abs(degrees) <= SWEEP / 2 + END_SLACK) {
        const fraction = (degrees + SWEEP / 2) / SWEEP;
        return { jump: Math.round(Math.min(1, Math.max(0, fraction)) * last) };
      }
      return { step: dx < 0 ? -1 : 1 };
    };
    control.addEventListener('click', (e) => {
      const aim = aimAt(e);
      if ('step' in aim) step(aim.step);
      else if (!disabled() && aim.jump !== Math.round(pos)) opts.onJump?.(aim.jump);
    });
    // Lights what the tap will do: the dot it will go to, or the − or +.
    control.addEventListener('pointerdown', (e) => {
      if (disabled()) return;
      const aim = aimAt(e);
      if ('step' in aim) control.classList.add(aim.step < 0 ? 'press-minus' : 'press-plus');
      else dots[aim.jump]?.classList.add('aim');
    });
    const release = () => {
      control.classList.remove('press-minus', 'press-plus');
      for (const d of dots) d.classList.remove('aim');
    };
    control.addEventListener('pointerup', release);
    control.addEventListener('pointerleave', release);
    control.addEventListener('pointercancel', release);
    // A mouse wheel notch is one step. A trackpad sends a stream of small
    // deltas while the page scrolls under the pointer; those must not cost
    // moves, so only a single large delta counts.
    control.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) < 50) return;
        e.preventDefault();
        step(e.deltaY < 0 ? 1 : -1);
      },
      { passive: false },
    );
  }

  render();
  return {
    el: root,
    set(p) {
      pos = p;
      render();
    },
    setGhost(p) {
      if (p == null) {
        ghost.style.display = 'none';
        return;
      }
      const [x, y] = polar(R_DOTS, angleAt(p / last));
      ghost.setAttribute('cx', x.toFixed(2));
      ghost.setAttribute('cy', y.toFixed(2));
      ghost.style.display = '';
    },
    setState(state) {
      if (state.locked != null) locked = state.locked;
      if (state.disabled != null) turnedOff = state.disabled;
      root.classList.toggle('locked', locked);
      if (state.inactive != null) root.classList.toggle('inactive', state.inactive);
      control.tabIndex = disabled() ? -1 : 0;
      control.setAttribute('aria-disabled', String(disabled()));
    },
  };
}

export interface SelectorOptions {
  label: string;
  options: readonly string[];
  onPick: (pos: number) => void;
}

/** A selector: a column of lit options. Picking any other option is one move. */
export function createSelector(opts: SelectorOptions): Knob {
  let pos = 0;
  let turnedOff = false;
  let locked = false;
  const buttons = opts.options.map((name, i) =>
    el(
      'button.sel-option',
      {
        type: 'button',
        role: 'radio',
        onclick: () => {
          if (i !== pos) opts.onPick(i);
        },
      },
      el('span.sel-led'),
      el('span.sel-name', {}, name),
    ),
  );
  const root = el(
    'div.knob.selector',
    {},
    el('div.knob-label', {}, opts.label),
    el('div.sel-options', { role: 'radiogroup', 'aria-label': opts.label, dataset: { count: String(opts.options.length) } }, buttons),
  );
  const render = () => {
    buttons.forEach((b, i) => {
      b.classList.toggle('on', i === pos);
      b.setAttribute('aria-checked', String(i === pos));
    });
  };
  render();
  return {
    el: root,
    set(p) {
      pos = Math.round(p);
      render();
    },
    setGhost(p) {
      buttons.forEach((b, i) => b.classList.toggle('ghost', p != null && i === p));
    },
    setState(state) {
      if (state.locked != null) locked = state.locked;
      if (state.disabled != null) turnedOff = state.disabled;
      root.classList.toggle('locked', locked);
      if (state.inactive != null) root.classList.toggle('inactive', state.inactive);
      for (const b of buttons) (b as HTMLButtonElement).disabled = turnedOff || locked;
    },
  };
}
