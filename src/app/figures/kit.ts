// What every figure is made of. A figure is a drawing with a few controls under
// it, a caption, and sometimes a small task; it says when the task is done so
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
} as const;

export type ColorKey = keyof typeof COL;

export interface FigureContext {
  save: SaveData;
  /** Figures that animate only run while this is true and they are on screen. */
  alive: () => boolean;
  /** A figure that is a test reports its result here. */
  score: (right: number, of: number) => void;
}

export interface FigureHandle {
  node: HTMLElement;
  /** Resolves when the figure's task is done; absent when it has none. */
  done?: Promise<void>;
}

export type FigureFactory = (ctx: FigureContext, goal?: string, options?: Record<string, unknown>) => FigureHandle;

export interface Frame {
  node: HTMLElement;
  svg: SVGSVGElement;
  controls: HTMLElement;
  /** A line under the drawing that says what the figure is showing now. */
  readout: HTMLElement;
}

/** The standard figure: a drawing `w` by `h` units, scaled to the column. */
export function frame(w: number, h: number, ...extra: Child[]): Frame {
  const s = svg('svg', { viewBox: `0 0 ${w} ${h}`, class: 'fig-svg', role: 'img' }) as SVGSVGElement;
  const readout = el('p.fig-readout');
  const controls = el('div.fig-controls');
  const node = el('div.fig-body', {}, s, readout, controls, ...extra);
  return { node, svg: s, controls, readout };
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

/** A promise with its resolver, for a figure's task. */
export function task(): { promise: Promise<void>; resolve: () => void; isDone: () => boolean } {
  let resolve!: () => void;
  let done = false;
  const promise = new Promise<void>((r) => (resolve = () => {
    if (!done) {
      done = true;
      r();
    }
  }));
  return { promise, resolve, isDone: () => done };
}

export function height(m: number, units: SaveData['units']): string {
  if (units === 'metric') return m >= 1000 ? `${(m / 1000).toFixed(m % 1000 ? 1 : 0)} km` : `${Math.round(m)} m`;
  return `${feet(m).toLocaleString()} ft`;
}

export function temp(c: number): string {
  return `${c.toFixed(1)} °C`;
}

/** Text in a drawing. */
export function label(x: number, y: number, text: string, attrs: Record<string, string | number> = {}): SVGElement {
  const t = svg('text', { x, y, class: 'fig-label', ...attrs });
  t.textContent = text;
  return t;
}

export function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1.5, extra: Record<string, string | number> = {}): SVGElement {
  return svg('line', { x1, y1, x2, y2, stroke, 'stroke-width': width, 'stroke-linecap': 'round', ...extra });
}

export function polyline(points: [number, number][], stroke: string, width = 2, extra: Record<string, string | number> = {}): SVGElement {
  return svg('polyline', { points: points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), fill: 'none', stroke, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...extra });
}

/** Replace a group's children. */
export function redraw(g: SVGElement, ...children: (SVGElement | null | false)[]): void {
  g.replaceChildren(...(children.filter(Boolean) as SVGElement[]));
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
    if (!ctx.alive()) {
      io.disconnect();
      running = false;
      return;
    }
    if (!visible) {
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
