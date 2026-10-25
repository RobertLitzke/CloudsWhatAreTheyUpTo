// What every figure is made of. A figure is a drawing, one text box that says
// what the drawing is and what it is showing now, a few controls, and sometimes
// a small task; it says when the task is done so
// the lesson can move on. Figures are drawn on the shift's paper, in ink, with
// a handful of colours that always mean the same thing in every figure and in
// the text around them: the rising air is orange, the air around it violet, the
// dew point teal, ice blue, and sunlight gold.

import { el, svg, type Child } from '../dom';
import type { SaveData } from '../../core/save';
import { feet } from '../../core/clouds';

export const COL = {
  ink: '#2a2547',
  soft: '#6a5c80',
  grid: 'rgba(42, 37, 71, 0.14)',
  paper: '#fffaf0',
  parcel: '#e0663f',
  env: '#7b4fa0',
  dew: '#0e7a8f',
  ice: '#3a7bd5',
  sun: '#f2a03d',
  cloud: '#ffffff',
  cloudShade: '#c9bfd9',
  rain: '#5a8fd8',
  ground: '#3d3459',
  warm: '#e88a6a',
  cold: '#7fa8d8',
  // Darker versions of the hues above, for text and thin lines on pale ground.
  warmInk: '#b0583a',
  coldInk: '#4f79a8',
  sunInk: '#b06a10',
  // Weather-map red and blue: warm and cold fronts, the low's L, and text that
  // has to stand out (a charge, a warning).
  red: '#d0472f',
  redInk: '#b03a25',
  blue: '#2f62b0',
  // Grounds a drawing is set on.
  sky: '#dcebf3',
  air: '#e9eef6',
  warmSide: '#fbeee6',
  warmAir: '#f7e2d4',
  subzero: '#cfe0f6',
  fog: '#f4f4f8',
  stratus: '#e4e2ec',
  field: '#a39150',
  dust: '#8f8a80',
} as const;

/**
 * The colours of a weather radar screen, from the weakest echo shown (5 dBZ)
 * up in steps of 5: blues for drizzle and snow, greens for rain, yellow and
 * red for heavy rain, magenta and purple for hail. Every radar figure uses
 * them, as every radar app does, so the reader can carry them to a real one.
 */
export const RADAR = ['#9fe3e8', '#5ab8e8', '#3a7bd5', '#4cc94c', '#2fa13a', '#1f7a2e', '#f2e03a', '#f2b02e', '#f07a22', '#e0352a', '#b81f2a', '#8f1020', '#e040c8', '#9a50c8'] as const;

/** The radar colour for an echo of `d` dBZ, or null when it is too faint to show. */
export function radarColor(d: number): string | null {
  if (!(d >= 5)) return null;
  return RADAR[Math.min(RADAR.length - 1, Math.floor((d - 5) / 5))];
}

/** A colour at the given opacity, for a translucent fill. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export type ColorKey = keyof typeof COL;

export interface FigureContext {
  save: SaveData;
  /** Aborted when the lesson closes; figures that animate stop then, and only run while on screen. */
  closed: AbortSignal;
  /** A figure that is a test reports its result here. */
  score: (right: number, of: number) => void;
  /** Who in town asked the forecast question with this id, when the radio is on. */
  local?: (id: string) => string | undefined;
}

export interface FigureHandle {
  node: HTMLElement;
  /** Resolves when the figure's task is done; absent when it has none. */
  done?: Promise<void>;
}

export type Options = Record<string, unknown>;

/**
 * Makes a figure for a lesson block. A live figure lists the `goals` a lesson
 * may set it, so the content test can catch a goal that no figure would ever
 * meet; a quiz is always a task. Stills have neither.
 */
export type FigureFactory = ((ctx: FigureContext, goal?: string, options?: Options) => FigureHandle) & {
  goals?: readonly string[];
  quiz?: true;
};

/** A figure's task, as the figure sees it. */
export interface Task {
  /** What the lesson asked for; absent when the figure is only to be played with. */
  readonly goal?: string;
  /** Mark the task done. Safe to call again. */
  done: () => void;
  readonly promise: Promise<void>;
}

/** A live figure, which knows the goals in `goals`. */
export function figure(goals: readonly string[], build: (ctx: FigureContext, t: Task, options?: Options) => HTMLElement): FigureFactory {
  const make = (ctx: FigureContext, goal?: string, options?: Options): FigureHandle => {
    const p = promised();
    const node = build(ctx, { goal, done: p.resolve, promise: p.promise }, options);
    return { node, done: goal ? p.promise : undefined };
  };
  return Object.assign(make, { goals });
}

/** A figure that is a test: its task is to be answered, whatever the lesson says. */
export function quiz(build: (ctx: FigureContext, t: Task, options?: Options) => HTMLElement): FigureFactory {
  const make = (ctx: FigureContext, _goal?: string, options?: Options): FigureHandle => {
    const p = promised();
    const node = build(ctx, { done: p.resolve, promise: p.promise }, options);
    return { node, done: p.promise };
  };
  return Object.assign(make, { quiz: true as const });
}

export interface Frame {
  node: HTMLElement;
  svg: SVGSVGElement;
  controls: HTMLElement;
  /** The live part of the text box under the drawing: what the figure is showing now. */
  readout: HTMLElement;
}

/**
 * The standard figure: a drawing `w` by `h` units, scaled to the column. The
 * text box under it keeps room for `lines` lines of readout at phone width, so
 * the controls below stay put while the text changes; the lesson puts the
 * figure's caption at the top of the same box (views/shift.ts).
 */
export function frame(w: number, h: number, lines = 3, ...extra: Child[]): Frame {
  const s = svg('svg', { viewBox: `0 0 ${w} ${h}`, class: 'fig-svg', role: 'img' }) as SVGSVGElement;
  const readout = el('p.fig-readout');
  const controls = el('div.fig-controls');
  const node = el('div.fig-body', {}, s, textBox(readout, lines), controls, ...extra);
  return { node, svg: s, controls, readout };
}

/** The box a figure's text lives in, `lines` lines of readout tall. */
export function textBox(readout: HTMLElement, lines = 3): HTMLElement {
  readout.style.setProperty('--lines', String(lines));
  return el('div.fig-text', {}, readout);
}

export interface Slider {
  node: HTMLElement;
  input: HTMLInputElement;
  value: () => number;
  set: (v: number) => void;
}

export function slider(label: string, min: number, max: number, step: number, value: number, show: (v: number) => string, onInput: (v: number) => void, color: ColorKey = 'ink'): Slider {
  const input = el('input', { type: 'range', min, max, step, value, 'aria-label': label }) as HTMLInputElement;
  input.style.setProperty('--thumb', COL[color]);
  const out = el('output', {}, show(value));
  const node = el('label.fig-slider', {}, el('span', {}, label), input, out);
  const fire = () => {
    const v = Number(input.value);
    out.textContent = show(v);
    onInput(v);
  };
  input.addEventListener('input', fire);
  return {
    node,
    input,
    value: () => Number(input.value),
    set: (v) => {
      input.value = String(v);
      fire();
    },
  };
}

// ---------------------------------------------------------------------------
// Guess first. A figure that turns on one threshold asks the reader to say
// where it will be before the controls that reach it unlock, then checks the
// guess when the drawing gets there.

/** Lock or unlock sliders while a guess is being made. */
export function lock(sliders: readonly Slider[], locked: boolean): void {
  for (const s of sliders) s.input.disabled = locked;
}

export interface Choices {
  node: HTMLElement;
  /** The option picked, or -1. */
  picked: () => number;
  /** Stop or allow picking. */
  freeze: (frozen: boolean) => void;
}

/** A row of options for a guess, one of which can be picked. */
export function choices(options: readonly string[], onPick: (i: number) => void): Choices {
  let at = -1;
  const chips = options.map((text, i) => el('button.chip', { type: 'button', onclick: () => pick(i) }, text) as HTMLButtonElement);
  const pick = (i: number) => {
    at = i;
    chips.forEach((c, k) => c.classList.toggle('on', k === i));
    onPick(i);
  };
  return {
    node: el('div.chips.fig-choices', {}, chips),
    picked: () => at,
    freeze: (frozen) => chips.forEach((c) => (c.disabled = frozen)),
  };
}

/** The button that locks a guess in. */
export function lockIn(text: string, onClick: () => void): HTMLButtonElement {
  return el('button.btn.btn-small', { type: 'button', onclick: onClick }, text) as HTMLButtonElement;
}

/**
 * Lets the reader put a guess on the drawing. A tap anywhere on it, or a drag
 * that starts on `handle`, sends the point (in drawing units) to `to`; with the
 * drawing focused, the arrow keys call `nudge` with -1 or 1. Only the handle
 * holds the page still for a drag, so the figure still scrolls on a phone.
 */
export function placeable(s: SVGSVGElement, handle: SVGElement, to: (x: number, y: number) => void, nudge: (step: number) => void): { enable: (on: boolean) => void } {
  let on = false;
  let dragging = false;
  const vb = s.viewBox.baseVal;
  const at = (e: PointerEvent) => {
    const r = s.getBoundingClientRect();
    if (!r.width) return;
    to(((e.clientX - r.left) / r.width) * vb.width, ((e.clientY - r.top) / r.height) * vb.height);
  };
  handle.style.touchAction = 'none';
  handle.style.cursor = 'grab';
  s.addEventListener('pointerdown', (e) => {
    if (!on) return;
    if (handle.contains(e.target as Node)) {
      dragging = true;
      s.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
  });
  s.addEventListener('pointermove', (e) => { if (on && dragging) at(e); });
  const stop = () => (dragging = false);
  s.addEventListener('pointerup', (e) => { if (on && !dragging) at(e); stop(); });
  s.addEventListener('pointercancel', stop);
  s.addEventListener('keydown', (e) => {
    if (!on) return;
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (step) {
      nudge(step);
      e.preventDefault();
    }
  });
  return {
    enable: (v) => {
      on = v;
      s.classList.toggle('placing', v);
      if (v) s.setAttribute('tabindex', '0');
      else s.removeAttribute('tabindex');
    },
  };
}

/** A promise with its resolver, settled once. */
function promised(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

export function height(m: number, units: SaveData['units']): string {
  if (units === 'metric') return m >= 1000 ? `${(m / 1000).toFixed(m % 1000 ? 1 : 0)} km` : `${Math.round(m)} m`;
  return `${feet(m).toLocaleString()} ft`;
}

/** A whole-degree temperature with a proper minus sign. */
export const deg = (c: number) => `${c < 0 ? '−' : ''}${Math.abs(c)} °C`;

export function temp(c: number): string {
  return `${c.toFixed(1)} °C`;
}

/**
 * Run `tick` every frame while the figure is on screen and the shift is open.
 * `tick` gets the seconds since the last frame (capped, so a tab that was
 * hidden does not jump).
 */
export function animate(node: Element, ctx: FigureContext, tick: (dt: number) => void): void {
  let visible = false;
  let running = false;
  let last = 0;
  const loop = (now: number) => {
    if (ctx.closed.aborted || !visible) {
      running = false;
      return;
    }
    tick(Math.min(0.05, (now - last) / 1000));
    last = now;
    requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  });
  io.observe(node);
  ctx.closed.addEventListener('abort', () => io.disconnect(), { once: true });
}

// ---------------------------------------------------------------------------
// The lesson's text: a little markup so names in the prose can wear the same
// colour as the thing in the figure. **bold**, *italic*, and [[words|key]] in
// the colour COL[key].

export function prose(text: string): HTMLElement {
  const p = el('p');
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[\[(.+?)\|(\w+)\]\]/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > at) p.append(text.slice(at, m.index));
    if (m[1]) p.append(el('b', {}, m[1]));
    else if (m[2]) p.append(el('i', {}, m[2]));
    else p.append(el('b.tint', { style: `color: ${COL[m[4] as ColorKey] ?? COL.ink}` }, m[3]));
    at = m.index! + m[0].length;
  }
  if (at < text.length) p.append(text.slice(at));
  return p;
}
