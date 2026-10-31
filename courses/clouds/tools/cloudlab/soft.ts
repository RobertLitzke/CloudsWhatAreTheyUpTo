// Option A: clouds kept as SVG, made soft by the browser's own filters. Each
// puff is a ball with a radial gradient, lit from the sun's side; the puffs are
// laid lowest first so the upper lobes overlap the lower ones; a turbulence
// filter frays the outline into cauliflower and fibres; the base is shaded and
// cut flat. It stays vector, costs no pixels of our own, and ships nothing.

import { svg } from 'didactics/dom';
import type { Palette } from '../../src/app/scene/landscape';
import { SUN, type Cirrus, type Cloud, type Heap, type Layer, type Puff } from '../../src/app/clouds/shapes';

let count = 0;

function unit(x: number, y: number): [number, number] {
  const n = Math.hypot(x, y) || 1;
  return [x / n, y / n];
}

/** A ball lit from direction (lx, ly): bright towards the light, shade on the far side. */
function ballGradient(id: string, p: Palette, lx: number, ly: number): SVGElement {
  return svg(
    'radialGradient',
    { id, cx: 0.5 + lx * 0.12, cy: 0.5 + ly * 0.12, r: 0.62, fx: 0.5 + lx * 0.3, fy: 0.5 + ly * 0.3 },
    svg('stop', { offset: '0%', 'stop-color': p.cloudLight }),
    svg('stop', { offset: '45%', 'stop-color': p.cloudLight }),
    svg('stop', { offset: '78%', 'stop-color': p.cloudMid }),
    svg('stop', { offset: '100%', 'stop-color': p.cloudShade }),
  );
}

function fray(id: string, freq: number, scale: number, seed: number, blur: number): SVGElement {
  return svg(
    'filter',
    { id, x: -0.2, y: -0.2, width: 1.4, height: 1.4 },
    svg('feTurbulence', { type: 'fractalNoise', baseFrequency: freq, numOctaves: 3, seed, result: 'n' }),
    svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
    svg('feGaussianBlur', { in: 'd', stdDeviation: blur }),
  );
}

function puffShape(q: Puff, fill: string): SVGElement {
  return svg('ellipse', { cx: q.x, cy: q.y, rx: q.r, ry: q.r * q.flat, fill });
}

function heap(c: Heap, p: Palette, defs: SVGElement): SVGElement {
  const id = `soft${++count}`;
  const [lx, ly] = unit(SUN[0] - c.cx, SUN[1] - (c.base - c.h / 2));
  const detail = Math.max(2.5, c.h * 0.1);
  defs.append(
    ballGradient(`${id}b`, p, lx, ly),
    fray(`${id}f`, 1 / (detail * 4), detail * 0.9, count, 0.35),
    // The base in shadow: darkest along the bottom, gone by mid-height.
    svg('linearGradient', { id: `${id}g`, x1: 0, y1: 1, x2: 0, y2: 0 },
      svg('stop', { offset: '0%', 'stop-color': p.cloudShade, 'stop-opacity': 0.85 }),
      svg('stop', { offset: '45%', 'stop-color': p.cloudShade, 'stop-opacity': 0 }),
    ),
    svg('clipPath', { id: `${id}c` }, svg('rect', { x: c.cx - c.w, y: c.base - c.h * 2, width: c.w * 2, height: c.h * 2 })),
    svg('clipPath', { id: `${id}u` }, ...c.puffs.map((q) => puffShape(q, '#000'))),
  );
  const order = [...c.puffs].sort((a, b) => b.y + b.r - (a.y + a.r));
  return svg('g', { 'clip-path': `url(#${id}c)` },
    svg('g', { filter: `url(#${id}f)` },
      // A shadow underlay so the gaps between balls read as creases.
      ...c.puffs.map((q) => puffShape(q, p.cloudShade)),
      ...order.map((q) => puffShape(q, `url(#${id}b)`)),
      svg('rect', { x: c.cx - c.w, y: c.base - c.h, width: c.w * 2, height: c.h, fill: `url(#${id}g)`, 'clip-path': `url(#${id}u)` }),
    ),
  );
}

function layer(c: Layer, p: Palette, defs: SVGElement): SVGElement {
  const id = `soft${++count}`;
  const [lx, ly] = unit(SUN[0] - (c.x0 + c.x1) / 2, SUN[1] - (c.top + c.bottom) / 2);
  defs.append(ballGradient(`${id}b`, p, lx, ly), fray(`${id}f`, 0.12, 2.6, count, 0.3));
  return svg('g', { filter: `url(#${id}f)` }, ...c.puffs.map((q) => puffShape(q, `url(#${id}b)`)));
}

function cirrus(c: Cirrus, p: Palette, defs: SVGElement): SVGElement {
  const id = `soft${++count}`;
  defs.append(
    svg('filter', { id: `${id}f`, x: -0.1, y: -0.5, width: 1.2, height: 2 },
      // Noise long along the strands and short across them: combed fibres.
      svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.02 0.6', numOctaves: 3, seed: 4, result: 'n' }),
      svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 5, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
      svg('feComponentTransfer', { in: 'n', result: 'm' }, svg('feFuncA', { type: 'table', tableValues: '0 0 0.6 1' })),
      svg('feComposite', { in: 'd', in2: 'm', operator: 'in', result: 'f' }),
      svg('feGaussianBlur', { in: 'f', stdDeviation: '1.2 0.35' }),
    ),
  );
  const strands = c.strands.map((s) => {
    // The strand as a filled outline: down one side of the spine, back up the other.
    const side = (sgn: number) => s.pts.map(([x, y, hw], i) => {
      const [ax, ay] = s.pts[Math.max(0, i - 1)];
      const [bx, by] = s.pts[Math.min(s.pts.length - 1, i + 1)];
      const [tx, ty] = unit(bx - ax, by - ay);
      return `${(x - ty * hw * 1.6 * sgn).toFixed(1)},${(y + tx * hw * 1.6 * sgn).toFixed(1)}`;
    });
    return svg('polygon', { points: [...side(1), ...side(-1).reverse()].join(' '), fill: p.cloudLight, opacity: 0.85 });
  });
  return svg('g', { filter: `url(#${id}f)` }, ...strands);
}

/** The clouds as SVG to lay over a scene's sky. */
export function softClouds(clouds: Cloud[], p: Palette): { node: SVGElement; ms: number } {
  const t0 = performance.now();
  const defs = svg('defs');
  const g = svg('g', {}, defs);
  for (const c of clouds) g.append(c.kind === 'heap' ? heap(c, p, defs) : c.kind === 'layer' ? layer(c, p, defs) : c.kind === 'cirrus' ? cirrus(c, p, defs) : svg('g'));
  return { node: g, ms: performance.now() - t0 };
}
