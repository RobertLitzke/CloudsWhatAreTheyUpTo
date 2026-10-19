// The view from Anvil Peak, drawn in flat, saturated layers: a banded sky, a
// big low sun, ridges that fade into the haze as they go back, pines on the
// nearest ridge and the lookout on its peak. Everything is plain polygons so it
// stays crisp at any size and costs nothing to ship.
//
// The scene is 400 wide and 260 tall. The sky is split into the three floors
// for the lessons: a stylised, not to scale, building of the sky.

import { svg } from '../dom';
import { makeRng, type Rng } from '../../core/rng';

export type TimeOfDay = 'dawn' | 'day' | 'dusk';

export interface Palette {
  /** Sky, top to horizon. */
  sky: string[];
  sun: string;
  /** Ridges, farthest first. */
  ridges: string[];
  near: string;
  cloudLight: string;
  cloudMid: string;
  cloudShade: string;
  ink: string;
}

export const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    sky: ['#3a2d5c', '#7b4b7a', '#d97a7a', '#f4b183', '#fde3a7'],
    sun: '#fff1c9',
    ridges: ['#c9798a', '#9c5577', '#6d3a63', '#45254c'],
    near: '#24152e',
    cloudLight: '#ffe9de',
    cloudMid: '#f2b9b4',
    cloudShade: '#a8678a',
    ink: '#1a0f22',
  },
  day: {
    sky: ['#1f6f8b', '#3f9fb5', '#7cc6c8', '#c9e7d6', '#f6e7b8'],
    sun: '#fff6d8',
    ridges: ['#7fb3a8', '#4f8a86', '#2f6467', '#1d4448'],
    near: '#0f2a2e',
    cloudLight: '#ffffff',
    cloudMid: '#dfe9ec',
    cloudShade: '#93aab4',
    ink: '#0b1d20',
  },
  dusk: {
    sky: ['#2b1838', '#5a2650', '#b2404f', '#ec7a3c', '#fbc15e'],
    sun: '#ffe08a',
    ridges: ['#c2554e', '#8e3450', '#5b2147', '#381737'],
    near: '#1c0d1f',
    cloudLight: '#ffd7a8',
    cloudMid: '#f39a7a',
    cloudShade: '#9a3f62',
    ink: '#140816',
  },
};

export const W = 400;
export const H = 260;
/** Where the far ridges meet the sky. */
export const HORIZON = 196;

/** The floors as drawn: y ranges in the scene, top to bottom. */
export const FLOOR_BANDS = {
  high: { top: 8, bottom: 72 },
  middle: { top: 72, bottom: 136 },
  low: { top: 136, bottom: 200 },
} as const;

/** A ridge line as a closed polygon from the left edge to the right, down to the bottom. */
function ridge(rng: Rng, baseY: number, rough: number, steps: number): string {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const y = baseY - rng() * rough;
    pts.push([x, y]);
  }
  return [...pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`), `${W},${H}`, `0,${H}`].join(' ');
}

function pine(x: number, base: number, h: number, fill: string): SVGElement {
  const w = h * 0.36;
  // Three stacked triangles: the geometric pine of every park poster.
  const tiers = [0, 0.3, 0.58].map((t, i) => {
    const top = base - h + t * h * 0.9;
    const bottom = top + h * (0.5 - i * 0.06);
    const half = w * (1 - i * 0.22);
    return svg('polygon', { points: `${x},${top} ${x + half},${bottom} ${x - half},${bottom}`, fill });
  });
  return svg('g', {}, svg('rect', { x: x - 0.8, y: base - h * 0.15, width: 1.6, height: h * 0.15, fill }), ...tiers.reverse());
}

/** The lookout: a cab with a hip roof on a braced tower. */
function lookout(x: number, base: number, fill: string, glow: string): SVGElement {
  const legH = 26;
  const cabW = 20;
  const cabH = 11;
  const top = base - legH;
  return svg(
    'g',
    {},
    svg('polygon', { points: `${x - 9},${base} ${x - 6},${top} ${x - 4.6},${top} ${x - 7.4},${base}`, fill }),
    svg('polygon', { points: `${x + 9},${base} ${x + 6},${top} ${x + 4.6},${top} ${x + 7.4},${base}`, fill }),
    svg('path', { d: `M${x - 8},${base - 4} L${x + 6.5},${top + 9} M${x + 8},${base - 4} L${x - 6.5},${top + 9} M${x - 7},${top + 12} L${x + 7},${top + 12}`, stroke: fill, 'stroke-width': 1.1 }),
    svg('rect', { x: x - cabW / 2 - 2, y: top - 1.5, width: cabW + 4, height: 2, fill }),
    svg('rect', { x: x - cabW / 2, y: top - cabH, width: cabW, height: cabH - 1, fill }),
    svg('rect', { x: x - cabW / 2 + 2, y: top - cabH + 2, width: cabW - 4, height: 4.5, fill: glow }),
    svg('polygon', { points: `${x - cabW / 2 - 3},${top - cabH} ${x},${top - cabH - 7} ${x + cabW / 2 + 3},${top - cabH}`, fill }),
  );
}

export interface SceneOptions {
  time: TimeOfDay;
  seed?: number;
  /** Draw the lookout on the near ridge. */
  tower?: boolean;
  /** Which part to keep when the scene is cropped to a box of another shape. */
  align?: 'xMinYMax' | 'xMidYMax';
  /** Sun position as fractions of the width and height. */
  sun?: [number, number];
}

export interface Scene {
  root: SVGSVGElement;
  /** Clouds and anything else in the sky go here: in front of the sky, behind the ridges. */
  sky: SVGGElement;
  /** In front of everything. */
  front: SVGGElement;
  palette: Palette;
}

let gradientCount = 0;

export function makeScene(opts: SceneOptions): Scene {
  const p = PALETTES[opts.time];
  const rng = makeRng(opts.seed ?? 7);
  const id = `sky${++gradientCount}`;
  const stops = p.sky.map((c, i) => svg('stop', { offset: `${(i / (p.sky.length - 1)) * 100}%`, 'stop-color': c }));
  const defs = svg('defs', {}, svg('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, ...stops));

  // The sky in hard bands as well as a gradient: the banding is the look.
  const bands = p.sky.map((c, i) =>
    svg('rect', { x: 0, y: (i / p.sky.length) * HORIZON, width: W, height: HORIZON / p.sky.length + 1, fill: c, opacity: 0.55 }),
  );
  const [sx, sy] = opts.sun ?? [0.68, 0.62];
  const sun = svg(
    'g',
    {},
    svg('circle', { cx: sx * W, cy: sy * H, r: 38, fill: p.sun, opacity: 0.18 }),
    svg('circle', { cx: sx * W, cy: sy * H, r: 26, fill: p.sun, opacity: 0.3 }),
    svg('circle', { cx: sx * W, cy: sy * H, r: 17, fill: p.sun }),
  );
  const sky = svg('g', { class: 'scene-sky' }) as SVGGElement;

  const ridges = p.ridges.map((fill, i) =>
    svg('polygon', { points: ridge(rng, HORIZON - 2 + i * 12, 20 - i * 3, 9 + i * 3), fill }),
  );

  // The near ridge rises to a peak on the left, where the lookout stands.
  const peakX = 92;
  const peakY = 214;
  const near = svg('polygon', {
    points: `0,${H} 0,232 40,224 ${peakX - 18},${peakY + 4} ${peakX},${peakY} ${peakX + 22},${peakY + 6} 170,236 260,242 330,238 ${W},244 ${W},${H}`,
    fill: p.near,
  });
  const trees: SVGElement[] = [];
  for (let i = 0; i < 26; i++) {
    const x = 120 + rng() * 280;
    const base = 248 + rng() * 10;
    trees.push(pine(x, base, 14 + rng() * 16, p.near));
  }
  for (let i = 0; i < 6; i++) trees.push(pine(4 + i * 9 + rng() * 4, 236, 10 + rng() * 8, p.near));

  const front = svg('g', { class: 'scene-front' }) as SVGGElement;
  const root = svg(
    'svg',
    { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: `${opts.align ?? 'xMidYMax'} slice`, class: 'scene', role: 'img', 'aria-hidden': 'true' },
    defs,
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: `url(#${id})` }),
    ...bands,
    sun,
    sky,
    ...ridges,
    near,
    opts.tower !== false ? lookout(peakX, peakY + 1, p.near, p.sun) : svg('g'),
    ...trees,
    front,
  ) as SVGSVGElement;
  return { root, sky, front, palette: p };
}
