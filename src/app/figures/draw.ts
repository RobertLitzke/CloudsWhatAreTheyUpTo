// The pieces figures are drawn with: lines, arrows, text and a few shapes
// that turn up in many drawings (a puff of cloud, an ice crystal). kit.ts says
// what a figure is; this file only draws.

import { el, svg } from '../dom';
import { celCumulus, celHeap } from '../clouds/flat';
import { FIGURE } from '../clouds/tones';
import { COL, RADAR, radarColor } from './kit';

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

// ---- Text -------------------------------------------------------------------

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

// ---- Lines ------------------------------------------------------------------

export function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1.5, extra: Attrs = {}): SVGElement {
  return svg('line', { x1, y1, x2, y2, stroke, 'stroke-width': width, 'stroke-linecap': 'round', ...extra });
}

export function polyline(points: P[], stroke: string, width = 2, extra: Attrs = {}): SVGElement {
  return svg('polyline', { points: points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), fill: 'none', stroke, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...extra });
}

/** Points as an SVG `points` list, unrounded. */
export const points = (pts: readonly (readonly number[])[]) => pts.map((p) => p.join(',')).join(' ');

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

// ---- Shapes -----------------------------------------------------------------

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

/** A cumulus-like puff of lobes in flat, cel-shaded vector, cut flat at `base` when given. */
export function puff(cx: number, cy: number, s: number, cut?: { base: number; sky: string }): SVGElement {
  const blobs: [number, number, number][] = [[-22, 6, 16], [0, -8, 22], [22, 4, 17], [-8, -24, 14], [12, -22, 15], [0, 10, 18]];
  const puffs = blobs.map(([dx, dy, r]) => ({ x: cx + dx * s, y: cy + dy * s, z: 0, r: r * s, flat: 1 }));
  return celHeap(puffs, FIGURE, { base: cut?.base, seed: Math.round(cx) });
}

/** A heap with a flat base at `baseY`, about `w` * 1.6 wide and `h` tall, in flat, cel-shaded vector: a dome, or a tower of turrets when tall. */
export function heapAt(cx: number, baseY: number, w: number, h: number): SVGElement {
  return celCumulus(cx, baseY, w * 1.6, h + 6, FIGURE, Math.round(cx));
}

// ---- Radar ------------------------------------------------------------------

/**
 * A radar picture: the box `w` by `h` at x, y cut into bins `bin` units
 * square, each coloured by the echo `dbzAt` gives at its centre, in drawing
 * units. Bins too faint to show are left clear.
 */
export function radarImage(x: number, y: number, w: number, h: number, bin: number, dbzAt: (x: number, y: number) => number): SVGElement {
  const image = svg('image', { x, y, width: w, height: h, preserveAspectRatio: 'none', style: 'image-rendering: pixelated' });
  const cw = Math.ceil(w / bin);
  const ch = Math.ceil(h / bin);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext?.('2d');
  if (!g) return image;
  const px = g.createImageData(cw, ch);
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      const c = radarColor(dbzAt(x + (i + 0.5) * bin, y + (j + 0.5) * bin));
      if (!c) continue;
      const n = parseInt(c.slice(1), 16);
      const k = (j * cw + i) * 4;
      px.data[k] = n >> 16;
      px.data[k + 1] = (n >> 8) & 255;
      px.data[k + 2] = n & 255;
      px.data[k + 3] = 255;
    }
  }
  g.putImageData(px, 0, 0);
  image.setAttribute('href', canvas.toDataURL());
  return image;
}

/**
 * The radar colour key, `w` wide at x, y: a strip from 5 dBZ up, in steps of
 * 5, with the words for light rain, heavy rain and hail under it. With
 * `from` below 5 the strip starts with a blank stretch for echoes too faint to
 * show. `mark` puts a pointer at that many dBZ. The key needs 22 units below y
 * and 12 above.
 */
export function radarKey(x: number, y: number, w: number, from = 5, mark?: number): SVGElement {
  const to = 5 + 5 * RADAR.length;
  const at = (d: number) => x + ((d - from) / (to - from)) * w;
  const g = svg('g');
  if (from < 5) {
    g.append(
      svg('rect', { x, y, width: at(5) - x, height: 8, fill: 'none', stroke: COL.grid }),
      small((x + at(5)) / 2, y + 19, 'too faint to show', { anchor: 'middle', soft: true }),
    );
  }
  RADAR.forEach((c, k) => g.append(svg('rect', { x: at(5 + 5 * k), y, width: at(10) - at(5) + 0.3, height: 8, fill: c })));
  for (const d of from < 5 ? [20, 40, 60] : [10, 20, 40, 60]) {
    g.append(line(at(d), y + 8, at(d), y + 11, COL.soft, 1), small(at(d), y + 19, String(d), { anchor: 'middle', soft: true }));
  }
  g.append(small(x + w, y - 3, 'dBZ', { anchor: 'end', soft: true }));
  // Words over the strip, unless a pointer will sit there.
  if (mark === undefined) for (const [d, text] of [[25, 'light'], [45, 'heavy'], [65, 'hail']] as const) g.append(small(at(d), y - 3, text, { anchor: 'middle', soft: true }));
  if (mark !== undefined) {
    const mx = Math.max(x, Math.min(x + w, at(mark)));
    g.append(svg('polygon', { points: `${mx},${y - 1} ${mx - 5},${y - 8} ${mx + 5},${y - 8}`, fill: COL.ink }));
  }
  return g;
}

/** A radar dish on a short mast, standing on y, tilted up towards `toward` (degrees above the horizon). */
export function radarDish(x: number, y: number, toward = 30): SVGElement {
  return svg('g', {},
    svg('rect', { x: x - 2, y: y - 12, width: 4, height: 12, fill: COL.ink }),
    svg('g', { transform: `translate(${x} ${y - 13}) rotate(${-toward})` },
      svg('path', { d: 'M-3,-11 Q6,0 -3,11', fill: 'none', stroke: COL.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      line(-1, 0, 9, 0, COL.ink, 1.4),
      svg('circle', { cx: 9, cy: 0, r: 1.6, fill: COL.ink })),
  );
}
