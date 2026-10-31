// Wheat country in eastern Washington, drawn in flat, saturated layers: a
// banded sky, a big low sun, rolling hills that fade into the haze as they go
// back, contour stripes of wheat on the nearest swell, poplars, and a small
// town with its grain elevator and airfield. Everything is plain shapes so it
// stays crisp at any size and costs nothing to ship.
//
// The scene is 400 wide and 260 tall. The sky is split into the three floors
// for the lessons: a stylised, not to scale, building of the sky.

import { svg } from 'didactics/dom';
import { makeRng, type Rng } from 'didactics/rng';

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface Palette {
  /** Sky, top to horizon. */
  sky: string[];
  sun: string;
  /** Hills, farthest first. */
  hills: string[];
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
    hills: ['#c9798a', '#b0677c', '#8a4f6f', '#5e3657'],
    near: '#24152e',
    cloudLight: '#ffe9de',
    cloudMid: '#f2b9b4',
    cloudShade: '#a8678a',
    ink: '#1a0f22',
  },
  day: {
    sky: ['#1f6f8b', '#3f9fb5', '#7cc6c8', '#c9e7d6', '#f6e7b8'],
    sun: '#fff6d8',
    hills: ['#c6c79a', '#b3b072', '#a39150', '#7c6b34'],
    near: '#3b3016',
    cloudLight: '#ffffff',
    cloudMid: '#dfe9ec',
    cloudShade: '#93aab4',
    ink: '#0b1d20',
  },
  // The poster's evening: teal overhead, magenta and lavender, a peach glow
  // at the horizon, and violet hills going down to indigo.
  dusk: {
    sky: ['#0e4860', '#465778', '#a15793', '#c97fae', '#f2c4a4'],
    sun: '#fbe7a6',
    hills: ['#8d6a94', '#7a5f8b', '#5b4677', '#3a3260'],
    near: '#1b172f',
    cloudLight: '#ffdcc4',
    cloudMid: '#d185b1',
    cloudShade: '#6e418e',
    ink: '#17142a',
  },
  // Moonlight: indigo going navy at the top, and the moon in the sun's place.
  night: {
    sky: ['#0c1330', '#151f45', '#1f2c58', '#2b3a69', '#3b4a78'],
    sun: '#f1eedb',
    hills: ['#2e3460', '#272c52', '#1f2444', '#181b36'],
    near: '#0d0f20',
    cloudLight: '#c8cee2',
    cloudMid: '#8790b0',
    cloudShade: '#4a5277',
    ink: '#070a18',
  },
};

export const W = 400;
export const H = 260;
/** Where the far hills meet the sky. */
export const HORIZON = 196;

/** The floors as drawn: y ranges in the scene, top to bottom. */
export const FLOOR_BANDS = {
  high: { top: 8, bottom: 72 },
  middle: { top: 72, bottom: 136 },
  low: { top: 136, bottom: 200 },
} as const;

/** A line of rolling hills as a closed path from the left edge to the right, down to the bottom. */
function hills(rng: Rng, baseY: number, amp: number, waves: number): string {
  // Two sines of random phase: the long, soft swells of the Palouse.
  const p1 = rng() * Math.PI * 2;
  const p2 = rng() * Math.PI * 2;
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = (i / 40) * W;
    const y = baseY - amp * (0.6 * Math.sin((x / W) * waves * Math.PI + p1) + 0.4 * Math.sin((x / W) * waves * 2.3 * Math.PI + p2));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${pts.join(' L')} L${W},${H} L0,${H} Z`;
}

/** A Lombardy poplar: the tall, narrow windbreak tree of every farmstead out there. */
function poplar(x: number, base: number, h: number, fill: string): SVGElement {
  return svg('g', {},
    svg('rect', { x: x - 0.6, y: base - h * 0.12, width: 1.2, height: h * 0.12, fill }),
    svg('ellipse', { cx: x, cy: base - h * 0.55, rx: h * 0.11, ry: h * 0.47, fill }),
  );
}

/** The town: a grain elevator with its annex, a few houses, a water tower, and the airfield's windsock. */
function town(x: number, base: number, fill: string, glow: string): SVGElement {
  const house = (hx: number, w: number, h: number) =>
    svg('polygon', { points: `${hx},${base} ${hx},${base - h} ${hx + w / 2},${base - h - w * 0.45} ${hx + w},${base - h} ${hx + w},${base}`, fill });
  return svg(
    'g',
    {},
    // The elevator: a tall shaft with a gabled cupola, and a lower annex.
    svg('rect', { x: x - 10, y: base - 34, width: 20, height: 34, fill }),
    svg('polygon', { points: `${x - 6},${base - 34} ${x - 6},${base - 40} ${x},${base - 44} ${x + 6},${base - 40} ${x + 6},${base - 34}`, fill }),
    svg('rect', { x: x + 10, y: base - 20, width: 15, height: 20, fill }),
    svg('polygon', { points: `${x + 10},${base - 20} ${x + 17.5},${base - 25} ${x + 25},${base - 20}`, fill }),
    // Houses along the main street.
    house(x - 30, 9, 6),
    house(x - 19, 8, 5),
    house(x + 26, 10, 6),
    svg('rect', { x: x - 27, y: base - 4.5, width: 2, height: 2, fill: glow }),
    // The water tower on its legs.
    svg('path', { d: `M${x + 42},${base} L${x + 44},${base - 14} M${x + 50},${base} L${x + 48},${base - 14}`, stroke: fill, 'stroke-width': 1.2 }),
    svg('rect', { x: x + 41, y: base - 21, width: 10, height: 7, rx: 1, fill }),
    svg('polygon', { points: `${x + 40},${base - 21} ${x + 46},${base - 25} ${x + 52},${base - 21}`, fill }),
    // The airfield's windsock, standing out in the breeze.
    svg('line', { x1: x + 66, y1: base, x2: x + 66, y2: base - 16, stroke: fill, 'stroke-width': 1 }),
    svg('polygon', { points: `${x + 66},${base - 16} ${x + 76},${base - 14.5} ${x + 76},${base - 12.5} ${x + 66},${base - 11.5}`, fill }),
  );
}

export interface SceneOptions {
  time: TimeOfDay;
  seed?: number;
  /** Draw the town on the near hill. */
  town?: boolean;
  /** Which part to keep when the scene is cropped to a box of another shape. */
  align?: 'xMinYMax' | 'xMidYMax';
  /** Sun position as fractions of the width and height; null for no sun, as behind an overcast. */
  sun?: [number, number] | null;
}

export interface Scene {
  root: SVGSVGElement;
  /** Clouds and anything else in the sky go here: in front of the sky, behind the hills. */
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
  const sun = opts.sun === null ? svg('g') : svg(
    'g',
    {},
    svg('circle', { cx: sx * W, cy: sy * H, r: 38, fill: p.sun, opacity: 0.18 }),
    svg('circle', { cx: sx * W, cy: sy * H, r: 26, fill: p.sun, opacity: 0.3 }),
    svg('circle', { cx: sx * W, cy: sy * H, r: 17, fill: p.sun }),
  );
  const sky = svg('g', { class: 'scene-sky' }) as SVGGElement;

  const far = p.hills.map((fill, i) => svg('path', { d: hills(rng, HORIZON + 2 + i * 11, 9 - i, 1.6 + i * 0.7), fill }));

  // The near swell, with contour stripes of wheat and fallow following it.
  const near = svg('path', { d: `M0,232 C70,214 140,214 200,226 S330,246 ${W},230 L${W},${H} L0,${H} Z`, fill: p.near });
  const stripes = [0, 1, 2, 3].map((k) =>
    svg('path', {
      d: `M0,${238 + k * 6} C70,${221 + k * 7} 140,${221 + k * 7} 200,${233 + k * 6} S330,${252 + k * 4} ${W},${237 + k * 6}`,
      fill: 'none',
      stroke: p.hills[0],
      'stroke-width': 1.6,
      opacity: 0.22,
    }),
  );
  // A windbreak of poplars round a farmstead, and a row along the far road.
  const farmstead: SVGElement[] = [];
  for (let i = 0; i < 5; i++) farmstead.push(poplar(270 + i * 7 + rng() * 3, 238 + i * 0.6, 20 + rng() * 6, p.near));
  const road: SVGElement[] = [];
  for (let i = 0; i < 7; i++) road.push(poplar(150 + i * 11 + rng() * 4, HORIZON + 26, 7 + rng() * 3, p.hills[p.hills.length - 1]));

  const front = svg('g', { class: 'scene-front' }) as SVGGElement;
  const root = svg(
    'svg',
    { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: `${opts.align ?? 'xMidYMax'} slice`, class: 'scene', role: 'img', 'aria-hidden': 'true' },
    defs,
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: `url(#${id})` }),
    ...bands,
    sun,
    sky,
    ...far,
    ...road,
    near,
    ...stripes,
    ...farmstead,
    opts.town !== false ? town(70, 224, p.near, p.sun) : svg('g'),
    front,
  ) as SVGSVGElement;
  return { root, sky, front, palette: p };
}
