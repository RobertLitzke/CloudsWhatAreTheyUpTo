// The drawn scene at the top of the home page and each lesson: a shallow
// valley with a line of trees, a low sun and a bird, seen through the brackets
// of a viewfinder. It is flat and geometric on purpose, so it never competes
// with the photographs the lessons are about.

import { svg } from 'didactics/dom';
import { makeRng } from 'didactics/rng';

export const W = 400;

export interface SceneOptions {
  seed?: number;
  /** Morning is cool and misty, evening warm and low. */
  time?: 'morning' | 'evening';
  h?: number;
  /** How far down the picture the far ridge sits, 0 to 1. */
  horizon?: number;
  align?: string;
}

const PALETTES = {
  morning: { sky: ['#cfe0ea', '#eef3f2'], far: '#9fb3bd', mid: '#7d9a94', near: '#43584f', sun: '#f3e0b8', bird: '#2b3a3a' },
  evening: { sky: ['#f0c99a', '#f7e6cf'], far: '#b89c92', mid: '#8a6f6b', near: '#473536', sun: '#f0a65c', bird: '#2e2425' },
} as const;

/** The scene, as an SVG element to drop into a page. */
export function makeScene(o: SceneOptions = {}): SVGSVGElement {
  const h = o.h ?? 260;
  const rng = makeRng(o.seed ?? 1);
  const p = PALETTES[o.time ?? 'morning'];
  const sky = (o.horizon ?? 0.62) * h;

  const ridge = (y: number, roughness: number, fill: string) => {
    const points: string[] = [`M0 ${h}`, `L0 ${y}`];
    for (let x = 0; x <= W; x += 25) {
      points.push(`L${x} ${(y + (rng() - 0.5) * roughness).toFixed(1)}`);
    }
    points.push(`L${W} ${h}Z`);
    return svg('path', { d: points.join(' '), fill });
  };

  const tree = (x: number, y: number, s: number, fill: string) =>
    svg('path', { d: `M${x} ${y} L${x - 4 * s} ${y} L${x} ${y - 16 * s} L${x + 4 * s} ${y}Z`, fill });

  const s = svg('svg', {
    viewBox: `0 0 ${W} ${h}`,
    class: 'scene',
    preserveAspectRatio: `${o.align ?? 'xMidYMid'} slice`,
    role: 'img',
    'aria-label': 'A valley at first light, seen through a viewfinder',
  }) as SVGSVGElement;

  const id = `sky-${Math.floor(rng() * 1e6)}`;
  s.append(
    svg('defs', {}, svg('linearGradient', { id, x1: '0', y1: '0', x2: '0', y2: '1' },
      svg('stop', { offset: '0', 'stop-color': p.sky[0] }),
      svg('stop', { offset: '1', 'stop-color': p.sky[1] }),
    )),
    svg('rect', { width: W, height: h, fill: `url(#${id})` }),
    svg('circle', { cx: W * 0.22, cy: sky * 0.5, r: 22, fill: p.sun }),
    ridge(sky, 10, p.far),
    ridge(sky + h * 0.1, 16, p.mid),
    ridge(sky + h * 0.24, 22, p.near),
    // A line of trees along the middle ridge.
    ...Array.from({ length: 14 }, (_, i) => tree(12 + i * 29 + rng() * 8, sky + h * 0.11, 0.7 + rng() * 0.6, p.mid)),
    // The bird, two strokes, off centre and small: it is far away.
    svg('path', {
      d: `M${W * 0.68} ${sky * 0.5} q 9 -7 17 0 q 8 -7 17 0`,
      fill: 'none',
      stroke: p.bird,
      'stroke-width': 2.4,
      'stroke-linecap': 'round',
    }),
    // The viewfinder: four corner brackets and a focus box on the bird.
    ...corners(p.bird, h),
    svg('rect', {
      x: W * 0.65,
      y: sky * 0.34,
      width: 58,
      height: 42,
      rx: 3,
      fill: 'none',
      stroke: p.bird,
      'stroke-width': 1.6,
      opacity: 0.75,
    }),
  );
  return s;
}

/** The viewfinder's corner brackets. */
function corners(stroke: string, h: number): SVGElement[] {
  const m = 14;
  const len = 22;
  const at = (x: number, y: number, dx: number, dy: number) =>
    svg('path', { d: `M${x + dx * len} ${y} L${x} ${y} L${x} ${y + dy * len}`, fill: 'none', stroke, 'stroke-width': 2, opacity: 0.55 });
  return [at(m, m, 1, 1), at(W - m, m, -1, 1), at(m, h - m, 1, -1), at(W - m, h - m, -1, -1)];
}
