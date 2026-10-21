// The pieces figures are drawn with: lines, arrows, text and a few shapes
// that turn up in many drawings (a puff of cloud, an ice crystal). kit.ts says
// what a figure is; this file only draws.

import { el, svg } from '../dom';
import { COL } from './kit';

export type Attrs = Record<string, string | number>;
export type P = [number, number];

/** A still picture: a drawing `w` by `h` units with no controls and no task. */
export function still(w: number, h: number): { node: HTMLElement; svg: SVGSVGElement } {
  const s = svg('svg', { viewBox: `0 0 ${w} ${h}`, class: 'fig-svg', role: 'img' }) as SVGSVGElement;
  return { node: el('div.fig-body.fig-still', {}, s), svg: s };
}

/** Replace a group's children. */
export function redraw(g: SVGElement, ...children: (SVGElement | null | false)[]): void {
  g.replaceChildren(...(children.filter(Boolean) as SVGElement[]));
}

// ---- Text ---------------------------------------------------------------------

export interface TextStyle {
  /** 9 px or 10 px; 11 px when absent. */
  size?: 'small' | 'note';
  bold?: boolean;
  /** The muted ink, unless `fill` is given. */
  soft?: boolean;
  anchor?: 'middle' | 'end';
  fill?: string;
  /** A band of this colour behind the letters, so text reads over a busy drawing. */
  halo?: string;
  haloWidth?: number;
  /** Any other attributes (transform, opacity, font-size). */
  attrs?: Attrs;
}

/** Text in a drawing. */
export function label(x: number, y: number, text: string, style: TextStyle = {}): SVGElement {
  const cls = ['fig-label', style.size, style.bold && 'bold', style.soft && 'soft'].filter(Boolean).join(' ');
  const attrs: Attrs = { x, y, class: cls };
  if (style.anchor) attrs['text-anchor'] = style.anchor;
  if (style.fill) attrs.fill = style.fill;
  if (style.halo) Object.assign(attrs, { stroke: style.halo, 'stroke-width': style.haloWidth ?? 3, 'paint-order': 'stroke' });
  const t = svg('text', { ...attrs, ...style.attrs });
  t.textContent = text;
  return t;
}

/** 9 px text, for notes inside a busy drawing. */
export const small = (x: number, y: number, text: string, style: TextStyle = {}) => label(x, y, text, { size: 'small', ...style });
/** 10 px text. */
export const note = (x: number, y: number, text: string, style: TextStyle = {}) => label(x, y, text, { size: 'note', ...style });
/** A bold title, centred on x. */
export const heading = (x: number, y: number, text: string, style: TextStyle = {}) => label(x, y, text, { bold: true, anchor: 'middle', ...style });

// ---- Lines --------------------------------------------------------------------

export function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1.5, extra: Attrs = {}): SVGElement {
  return svg('line', { x1, y1, x2, y2, stroke, 'stroke-width': width, 'stroke-linecap': 'round', ...extra });
}

export function polyline(points: P[], stroke: string, width = 2, extra: Attrs = {}): SVGElement {
  return svg('polyline', { points: points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), fill: 'none', stroke, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...extra });
}

/** Points as an SVG `points` list, unrounded. */
export const points = (pts: readonly P[]) => pts.map((p) => p.join(',')).join(' ');

export function arrow(x1: number, y1: number, x2: number, y2: number, color: string, width = 2): SVGElement {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = 5 + width * 1.5;
  const tip = (da: number) => `${x2 - head * Math.cos(a + da)},${y2 - head * Math.sin(a + da)}`;
  return svg('g', {},
    line(x1, y1, x2 - head * 0.7 * Math.cos(a), y2 - head * 0.7 * Math.sin(a), color, width),
    svg('polygon', { points: `${x2},${y2} ${tip(0.45)} ${tip(-0.45)}`, fill: color }));
}

/** An arrow drawn as a wave, for infrared light, going straight up or down. */
export function wavy(x: number, y1: number, y2: number, color: string, width = 2): SVGElement {
  const pts: P[] = [];
  const dir = Math.sign(y2 - y1);
  const len = Math.abs(y2 - y1) - 8;
  for (let d = 0; d <= len; d += 2) pts.push([x + 4 * Math.sin(d / 4), y1 + dir * d]);
  return svg('g', {}, polyline(pts, color, width), arrow(x, y2 - dir * 9, x, y2, color, width));
}

/** Points along a quadratic curve. */
export function curve(a: P, c: P, b: P, n = 40): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as P;
  });
}

// ---- Shapes -------------------------------------------------------------------

/** A hexagon of radius `r`, with a corner at angle `turn` (radians). */
export function hexagon(cx: number, cy: number, r: number, attrs: Attrs, turn = 0): SVGElement {
  const pts = Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k + turn;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return svg('polygon', { points: pts, ...attrs });
}

/** A snowflake: three strokes crossing at the centre. */
export function flake(x: number, y: number, r: number, color: string = COL.ice, width = 1.4): SVGElement {
  return svg('g', {}, ...[0, 1, 2].map((k) => line(x - r * Math.cos((k * Math.PI) / 3), y - r * Math.sin((k * Math.PI) / 3), x + r * Math.cos((k * Math.PI) / 3), y + r * Math.sin((k * Math.PI) / 3), color, width)));
}

/** An ice crystal: six arms round a solid hexagon. */
export function crystal(cx: number, cy: number, r: number): SVGElement {
  const g = svg('g');
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    g.append(line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a), COL.ice, Math.max(1.5, r / 6)));
  }
  g.append(hexagon(cx, cy, Math.max(2, r * 0.3), { fill: COL.ice }));
  return g;
}

/** A cumulus-like puff from circles, with a flat base cut at `base` when given. */
export function puff(cx: number, cy: number, s: number, cut?: { base: number; sky: string }): SVGElement {
  const blobs: [number, number, number][] = [[-22, 6, 16], [0, -8, 22], [22, 4, 17], [-8, -24, 14], [12, -22, 15], [0, 10, 18]];
  const g = svg('g', {}, ...blobs.map(([dx, dy, r]) => svg('circle', { cx: cx + dx * s, cy: cy + dy * s, r: r * s, fill: COL.cloud, stroke: COL.cloudShade, 'stroke-width': 1 })));
  if (cut) g.append(svg('rect', { x: cx - 50 * s, y: cut.base, width: 100 * s, height: 40 * s, fill: cut.sky }));
  return g;
}

/** A plain heap with a flat base at `baseY`, `w` wide and `h` tall, in figure colours. */
export function heapAt(cx: number, baseY: number, w: number, h: number): SVGElement {
  const g = svg('g');
  const n = Math.max(3, Math.round(h / 12));
  for (let i = 0; i < n; i++) {
    const y = baseY - (i / n) * h - 6;
    const spread = w * (1 - (i / n) * 0.45);
    for (const dx of [-spread * 0.45, 0, spread * 0.45]) {
      g.append(svg('circle', { cx: cx + dx + (i % 2 ? 3 : -3), cy: y, r: Math.max(6, spread * 0.36), fill: COL.cloud, stroke: COL.cloudShade, 'stroke-width': 1 }));
    }
  }
  // Shade under the flat base.
  g.append(svg('rect', { x: cx - w * 0.75, y: baseY - 4, width: w * 1.5, height: 4, fill: COL.cloudShade }));
  return g;
}
