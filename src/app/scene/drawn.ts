// Drawn clouds, one recipe per genus, in the same flat, faceted style as the
// landscape. These are the "mock clouds" of the lessons; the real thing is
// always a photo. Each drawing sits on its own base line at y = 0, centred on
// x = 0, and is about 80 units wide; the caller places and scales it.
//
// Heaps are built from polygon puffs whose points never dip below the base, so
// every heap has the flat bottom a real cumulus has. Each puff is drawn three
// times: shade, body and highlight, offset upward, which gives the dark
// underside and lit top without any gradients.

import { svg } from '../dom';
import type { GenusId } from '../../core/clouds';
import { makeRng, type Rng } from '../../core/rng';
import type { Palette } from './landscape';

type Puff = [cx: number, cy: number, r: number];

function puffPoints([cx, cy, r]: Puff, base: number, sides: number, turn: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = turn + (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = Math.min(base, cy + Math.sin(a) * r);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function heap(puffs: Puff[], p: Palette, rng: Rng, base = 0, opacity = 1): SVGElement {
  const turns = puffs.map(() => rng() * Math.PI);
  const layer = (fill: string, dy: number, shrink: number) =>
    puffs.map(([cx, cy, r], i) =>
      svg('polygon', { points: puffPoints([cx - shrink * 0.6, cy + dy, r * (1 - shrink * 0.04)], base + dy * 0.2, 8, turns[i]), fill }),
    );
  return svg('g', { opacity }, ...layer(p.cloudShade, 0, 0), ...layer(p.cloudMid, -2.5, 1), ...layer(p.cloudLight, -5, 2.4));
}

function cumulus(p: Palette, rng: Rng): SVGElement {
  return heap(
    [
      [-24, -6, 11],
      [-10, -14, 15],
      [8, -18, 17],
      [24, -9, 12],
      [0, -4, 12],
    ],
    p,
    rng,
  );
}

function cumulonimbus(p: Palette, rng: Rng): SVGElement {
  const tower: Puff[] = [];
  for (let i = 0; i < 9; i++) {
    const y = -8 - i * 13;
    tower.push([-18 + rng() * 6, y, 13], [0 + rng() * 4, y - 4, 15], [17 - rng() * 6, y, 12]);
  }
  const anvilY = -128;
  const anvil = svg('g', {},
    svg('polygon', { points: `-26,${anvilY + 6} -62,${anvilY - 2} -50,${anvilY - 10} 46,${anvilY - 12} 74,${anvilY - 4} 30,${anvilY + 6}`, fill: p.cloudMid }),
    svg('polygon', { points: `-50,${anvilY - 10} 46,${anvilY - 12} 74,${anvilY - 4} 40,${anvilY - 6} -30,${anvilY - 5}`, fill: p.cloudLight }),
  );
  const rain = svg('g', { opacity: 0.55 },
    ...[-20, -12, -4, 4, 12, 20].map((x) => svg('line', { x1: x, y1: 0, x2: x - 5, y2: 26, stroke: p.cloudShade, 'stroke-width': 2.2 })),
  );
  const base = svg('polygon', { points: '-34,-2 34,-2 30,4 -30,4', fill: p.cloudShade });
  return svg('g', {}, rain, anvil, heap(tower, p, rng), base);
}

function stratus(p: Palette, rng: Rng): SVGElement {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = -70 + i * 14;
    top.push(`${x},${(-12 - rng() * 3).toFixed(1)}`);
    bottom.unshift(`${x},${(rng() * 2).toFixed(1)}`);
  }
  return svg('g', {},
    svg('polygon', { points: [...top, ...bottom].join(' '), fill: p.cloudShade, opacity: 0.85 }),
    svg('polygon', { points: `-70,-12 70,-13 70,-8 -70,-7`, fill: p.cloudMid, opacity: 0.7 }),
  );
}

function stratocumulus(p: Palette, rng: Rng): SVGElement {
  const puffs: Puff[] = [];
  for (let i = 0; i < 8; i++) puffs.push([-60 + i * 17, -5 - rng() * 4, 9 + rng() * 4]);
  return heap(puffs, { ...p, cloudLight: p.cloudMid, cloudMid: mix(p.cloudMid, p.cloudShade) }, rng);
}

function altocumulus(p: Palette, rng: Rng): SVGElement {
  const rows: SVGElement[] = [];
  for (let r = 0; r < 3; r++) {
    const puffs: Puff[] = [];
    for (let i = 0; i < 6 - r; i++) puffs.push([-48 + r * 8 + i * 18 + rng() * 4, -3, 5 + rng() * 2]);
    const g = heap(puffs, p, rng);
    g.setAttribute('transform', `translate(0 ${-r * 10}) scale(${1 - r * 0.12})`);
    rows.push(g);
  }
  return svg('g', {}, ...rows.reverse());
}

function altostratus(p: Palette): SVGElement {
  return svg('g', {},
    svg('polygon', { points: '-80,-16 80,-20 84,0 -84,2', fill: p.cloudMid, opacity: 0.6 }),
    svg('polygon', { points: '-80,-16 80,-20 80,-14 -80,-10', fill: p.cloudLight, opacity: 0.35 }),
  );
}

function nimbostratus(p: Palette): SVGElement {
  const dark = mix(p.cloudShade, p.ink);
  return svg('g', {},
    svg('g', { opacity: 0.5 },
      ...Array.from({ length: 16 }, (_, i) => -75 + i * 10).map((x) =>
        svg('line', { x1: x, y1: 0, x2: x - 6, y2: 34, stroke: p.cloudShade, 'stroke-width': 1.6 })),
    ),
    svg('polygon', { points: '-84,-22 84,-26 86,2 -86,2', fill: dark, opacity: 0.92 }),
    svg('polygon', { points: '-84,-22 84,-26 84,-19 -84,-16', fill: p.cloudShade }),
  );
}

function cirrus(p: Palette, rng: Rng): SVGElement {
  const strokes: SVGElement[] = [];
  for (let i = 0; i < 6; i++) {
    const x = -50 + i * 18 + rng() * 6;
    const y = -4 - rng() * 14;
    const len = 26 + rng() * 22;
    // A long sweep ending in an upturned hook: a mare's tail.
    const d = `M${x},${y} q${len * 0.5},${-3 - rng() * 4} ${len},${-1} q6,-1 8,-8`;
    strokes.push(svg('path', { d, fill: 'none', stroke: p.cloudLight, 'stroke-width': 1.6 + rng(), 'stroke-linecap': 'round', opacity: 0.85 }));
  }
  return svg('g', {}, ...strokes);
}

function cirrocumulus(p: Palette, rng: Rng): SVGElement {
  const dots: SVGElement[] = [];
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < 14; i++) {
      const x = -60 + i * 9 + (r % 2) * 4 + rng() * 2;
      const y = -2 - r * 5 + Math.sin(i * 0.8) * 1.5;
      dots.push(svg('circle', { cx: x, cy: y, r: 1.4 + rng() * 0.8, fill: p.cloudLight, opacity: 0.9 }));
    }
  }
  return svg('g', {}, ...dots);
}

function cirrostratus(p: Palette): SVGElement {
  return svg('g', {},
    svg('polygon', { points: '-90,-10 90,-14 90,0 -90,2', fill: p.cloudLight, opacity: 0.28 }),
    svg('polygon', { points: '-90,-10 90,-14 90,-11 -90,-7', fill: p.cloudLight, opacity: 0.25 }),
  );
}

/** Halfway between two #rrggbb colours. */
function mix(a: string, b: string): string {
  const n = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round((n(a, i) + n(b, i)) / 2).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
}

export function drawCloud(id: GenusId, p: Palette, seed = 1): SVGElement {
  const rng = makeRng(seed);
  switch (id) {
    case 'cumulus': return cumulus(p, rng);
    case 'cumulonimbus': return cumulonimbus(p, rng);
    case 'stratus': return stratus(p, rng);
    case 'stratocumulus': return stratocumulus(p, rng);
    case 'altocumulus': return altocumulus(p, rng);
    case 'altostratus': return altostratus(p);
    case 'nimbostratus': return nimbostratus(p);
    case 'cirrus': return cirrus(p, rng);
    case 'cirrocumulus': return cirrocumulus(p, rng);
    case 'cirrostratus': return cirrostratus(p);
  }
}

/** A drawing placed in a scene: base centre at (x, y), scaled. */
export function placeCloud(id: GenusId, p: Palette, x: number, y: number, scale = 1, seed = 1): SVGElement {
  const g = drawCloud(id, p, seed);
  return svg('g', { transform: `translate(${x} ${y}) scale(${scale})`, class: 'drawn-cloud', 'data-genus': id }, g);
}

/** Where each drawing sits in a sky scene, as base y and scale, by floor. */
export const SKY_SPOTS: Record<GenusId, { y: number; scale: number }> = {
  cirrus: { y: 48, scale: 0.8 },
  cirrocumulus: { y: 46, scale: 0.8 },
  cirrostratus: { y: 40, scale: 1 },
  altocumulus: { y: 118, scale: 0.8 },
  altostratus: { y: 110, scale: 1 },
  nimbostratus: { y: 130, scale: 1 },
  stratocumulus: { y: 166, scale: 0.8 },
  stratus: { y: 168, scale: 1 },
  cumulus: { y: 174, scale: 0.9 },
  cumulonimbus: { y: 182, scale: 1.2 },
};
