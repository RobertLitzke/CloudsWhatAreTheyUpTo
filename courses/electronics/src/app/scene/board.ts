// The home page's picture: a populated circuit board seen from above, in
// solder-mask green with copper traces, silkscreen labels, and a few of the
// parts the lessons take apart (resistors, a capacitor, an op-amp, an LED and
// a pedal's knobs). Traces are routed the way a board designer would, along
// the grid and turning in 45° jogs, from a seed, so the same seed draws the
// same board.

import { svg } from 'didactics/dom';
import { makeRng, type Rng } from 'didactics/rng';
import { COL } from '../figures/kit';

export interface BoardOptions {
  seed?: number;
  /** CSS height of the picture. */
  h?: number;
}

const W = 1200;
const H = 500;

/** A trace from (x0, y0) to (x1, y1): across, a 45° jog, then across again. */
function trace(x0: number, y0: number, x1: number, y1: number, rng: Rng): string {
  const dy = y1 - y0;
  const jog = Math.abs(dy);
  const room = Math.max(0, Math.abs(x1 - x0) - jog);
  const dir = Math.sign(x1 - x0) || 1;
  const xa = x0 + dir * room * (0.2 + rng() * 0.6);
  const xb = xa + dir * jog;
  return `M${x0},${y0} H${xa.toFixed(0)} L${xb.toFixed(0)},${y1} H${x1}`;
}

const pad = (x: number, y: number, r = 7) =>
  svg('g', {}, svg('circle', { cx: x, cy: y, r, fill: COL.solder }), svg('circle', { cx: x, cy: y, r: r * 0.38, fill: '#0e2a20' }));

const silk = (x: number, y: number, text: string, anchor = 'middle') => {
  const t = svg('text', { x, y, fill: COL.silk, 'font-size': 13, 'font-family': 'var(--mono)', 'text-anchor': anchor, opacity: 0.85 });
  t.textContent = text;
  return t;
};

function resistor(x: number, y: number, bands: string[], name: string): SVGElement {
  return svg('g', {},
    pad(x - 40, y), pad(x + 40, y),
    svg('line', { x1: x - 40, y1: y, x2: x + 40, y2: y, stroke: '#9aa0a6', 'stroke-width': 3 }),
    svg('rect', { x: x - 24, y: y - 9, width: 48, height: 18, rx: 8, fill: '#d9c7a0' }),
    ...bands.map((c, k) => svg('rect', { x: x - 16 + k * 9 + (k === bands.length - 1 ? 6 : 0), y: y - 9, width: 4.5, height: 18, fill: c })),
    silk(x, y - 18, name),
  );
}

function chip(x: number, y: number, name: string): SVGElement {
  const legs: SVGElement[] = [];
  for (let k = 0; k < 4; k++) legs.push(pad(x - 30 + k * 20, y - 34, 6), pad(x - 30 + k * 20, y + 34, 6));
  return svg('g', {},
    ...legs,
    svg('rect', { x: x - 44, y: y - 24, width: 88, height: 48, rx: 3, fill: '#22252a' }),
    svg('circle', { cx: x - 34, cy: y + 14, r: 3, fill: '#3a3e45' }),
    silk(x, y + 58, name),
  );
}

function knob(x: number, y: number, turn: number, name: string): SVGElement {
  const a = ((turn - 0.5) * 300 * Math.PI) / 180;
  return svg('g', {},
    svg('circle', { cx: x, cy: y + 3, r: 34, fill: 'rgba(0, 0, 0, 0.3)' }),
    svg('circle', { cx: x, cy: y, r: 32, fill: '#1b1d21' }),
    svg('circle', { cx: x, cy: y, r: 24, fill: '#2a2d33', stroke: '#3c4048', 'stroke-width': 2 }),
    svg('line', { x1: x, y1: y, x2: x + Math.sin(a) * 22, y2: y - Math.cos(a) * 22, stroke: COL.silk, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    silk(x, y + 52, name),
  );
}

export function makeBoard(o: BoardOptions = {}): SVGSVGElement {
  const rng = makeRng(o.seed ?? 1);
  const s = svg('svg', { class: 'scene', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMax slice', role: 'img', 'aria-label': 'A circuit board with copper traces, resistors, a chip and knobs' }) as SVGSVGElement;
  if (o.h) s.style.height = `${o.h}px`;

  const traces = svg('g', { fill: 'none', stroke: COL.copper, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85 });
  // Two buses along the bottom, as a ground and a supply rail, and traces between rows of pads.
  traces.append(
    svg('path', { d: `M0,${H - 40} H${W}`, 'stroke-width': 14 }),
    svg('path', { d: `M0,${H - 80} H${W}`, 'stroke-width': 9 }),
  );
  const rows = [250, 300, 350, 400];
  for (let k = 0; k < 16; k++) {
    const x0 = 40 + rng() * 300;
    const x1 = W - 40 - rng() * 300;
    const y0 = rows[Math.floor(rng() * rows.length)];
    const y1 = rows[Math.floor(rng() * rows.length)];
    const [a, b] = rng() < 0.5 ? [x0, x1] : [x1, x0];
    traces.append(svg('path', { d: trace(a, y0, b, y1, rng), 'stroke-width': rng() < 0.3 ? 9 : 5 }));
    traces.append(svg('path', { d: `M${a},${y0} V${H - (k % 2 ? 40 : 80)}`, 'stroke-width': 4 }));
  }

  // Mounting holes in the corners, and a faint grid in the mask.
  const holes = [[30, 30], [W - 30, 30]].map(([x, y]) => svg('g', {},
    svg('circle', { cx: x, cy: y, r: 16, fill: COL.solder }),
    svg('circle', { cx: x, cy: y, r: 9, fill: '#0b1f18' }),
  ));

  s.append(
    svg('defs', {}, svg('pattern', { id: 'board-grid', width: 25, height: 25, patternUnits: 'userSpaceOnUse' },
      svg('circle', { cx: 12.5, cy: 12.5, r: 1.2, fill: 'rgba(255, 255, 255, 0.06)' }),
    )),
    svg('rect', { width: W, height: H, fill: COL.mask }),
    svg('rect', { width: W, height: H, fill: 'url(#board-grid)' }),
    traces,
    ...holes,
    resistor(170, 300, ['#a0522d', '#1d1d1d', '#c7362f', '#c9a13b'], 'R1'),
    resistor(170, 400, ['#e0a020', '#7a4fb0', '#c7362f', '#c9a13b'], 'R2'),
    resistor(W - 170, 350, ['#a0522d', '#1d1d1d', '#e0a020', '#c9a13b'], 'R3'),
    chip(W - 330, 300, 'U1'),
    // An electrolytic capacitor from above: a can with its − stripe.
    svg('g', {},
      svg('circle', { cx: 330, cy: 380, r: 30, fill: '#1f3f8f' }),
      svg('path', { d: 'M330,350 A30,30 0 0 1 356,365 L330,380Z', fill: '#c9d3e8', opacity: 0.8 }),
      silk(330, 430, 'C1'),
    ),
    // An LED, lit.
    svg('g', {},
      svg('circle', { cx: W - 170, cy: 270, r: 26, fill: COL.current, opacity: 0.25 }),
      svg('circle', { cx: W - 170, cy: 270, r: 13, fill: '#ffb21c' }),
      svg('circle', { cx: W - 174, cy: 266, r: 4, fill: '#fff4cf' }),
      silk(W - 170, 304, 'D1'),
    ),
    knob(80, 160, 0.3, 'LEVEL'),
    knob(W - 80, 160, 0.75, 'GAIN'),
  );
  return s;
}
