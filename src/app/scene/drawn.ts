// Drawn clouds, one recipe per genus, in the flat, cel-shaded style of the
// clouds library (clouds/flat.ts). These are the "mock clouds" of the lessons;
// the real thing is always a photo. Each drawing sits on its own base line at
// y = 0, centred on x = 0, and is about 80 units wide; the caller places and
// scales it.
//
// Heaps are lobes with a flat base, each lobe in three hard-edged tones lit
// from the upper right, so each lobe throws a crescent of shadow on the one
// below it, as on the poster.

import { svg } from '../dom';
import type { GenusId } from '../../core/clouds';
import { makeRng, type Rng } from '../../core/rng';
import { celCells, celCumulus, celHeap } from '../clouds/flat';
import { heap as heapPuffs, type Puff } from '../clouds/shapes';
import { W, type Palette } from './landscape';

function cumulus(p: Palette, seed: number): SVGElement {
  return celHeap(heapPuffs(0, 0, 80, 40, seed, false).puffs, p, { base: 0, seed });
}

function cumulonimbus(p: Palette, seed: number): SVGElement {
  const tower = celCumulus(0, 0, 74, 130, p, seed);
  const anvilY = -128;
  const anvil = svg('g', {},
    // Underside in shade, a lit top, and a bright sunward edge.
    svg('polygon', { points: `-26,${anvilY + 8} -66,${anvilY - 1} -54,${anvilY - 11} 48,${anvilY - 13} 78,${anvilY - 4} 30,${anvilY + 8}`, fill: p.cloudShade }),
    svg('polygon', { points: `-62,${anvilY - 3} -54,${anvilY - 11} 48,${anvilY - 13} 78,${anvilY - 4} 40,${anvilY - 2} -20,${anvilY - 1}`, fill: p.cloudMid }),
    svg('polygon', { points: `-40,${anvilY - 10} 48,${anvilY - 13} 78,${anvilY - 4} 56,${anvilY - 7} 0,${anvilY - 8}`, fill: p.cloudLight }),
  );
  const rain = svg('g', { opacity: 0.55 },
    ...[-22, -14, -6, 2, 10, 18, 26].map((x) => svg('line', { x1: x, y1: 0, x2: x - 5, y2: 26, stroke: p.cloudShade, 'stroke-width': 2.2 })),
  );
  return svg('g', {}, rain, anvil, tower);
}

function stratocumulus(p: Palette, rng: Rng, seed: number): SVGElement {
  // A row of broad, flattened, greyer rolls: lit less than a cumulus.
  const puffs: Puff[] = [];
  for (let i = 0; i < 8; i++) puffs.push({ x: -60 + i * 17 + rng() * 3, y: -6 - rng() * 3, z: 0, r: 10 + rng() * 4, flat: 0.7 });
  return celHeap(puffs, { cloudShade: p.cloudShade, cloudMid: mix(p.cloudMid, p.cloudShade), cloudLight: p.cloudMid }, { base: 0, shadow: 4, bumps: false, seed });
}

function altocumulus(p: Palette, rng: Rng): SVGElement {
  // Rows of rounded cells, smaller towards the back of the sheet.
  const cells: Puff[] = [];
  for (let r = 0; r < 3; r++) {
    const k = 1 - r * 0.14;
    for (let i = 0; i < 6 - r; i++) {
      cells.push({ x: (-48 + r * 8 + i * 18 + rng() * 4) * k, y: -4 - r * 9, z: 0, r: (6 + rng() * 2) * k, flat: 0.72 });
    }
  }
  return celCells(cells, p);
}

// The sheets (stratus, altostratus, nimbostratus, cirrostratus) are drawn
// `span` units either side of the middle, so a sky scene can stretch them from
// edge to edge as a real overcast is; a lone patch of sheet looks wrong.

function stratus(p: Palette, rng: Rng, span: number): SVGElement {
  // A low, even grey ceiling: a soft, gently rolling top and a base that is
  // flat but frayed, with a few torn shreds hanging below it.
  const step = 12;
  const n = Math.ceil((span * 2) / step);
  const top: string[] = [];
  const base: string[] = [];
  const lit: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = -span + i * step;
    const y = -30 + Math.sin(i * 0.45 + rng() * 0.6) * 2.5;
    top.push(`${x},${y.toFixed(1)}`);
    lit.unshift(`${x},${(y + 5 + rng()).toFixed(1)}`);
    base.unshift(`${x},${(rng() * 2.5).toFixed(1)}`);
  }
  const shreds: SVGElement[] = [];
  for (let i = 0; i < Math.round(span / 30); i++) {
    const x = -span + 20 + rng() * (span * 2 - 40);
    const w = 14 + rng() * 18;
    shreds.push(svg('polygon', { points: `${x - w / 2},1 ${x + w / 2},1 ${x + w * 0.2},${5 + rng() * 3} ${x - w * 0.3},${4 + rng() * 2}`, fill: p.cloudShade, opacity: 0.55 }));
  }
  return svg('g', {},
    ...shreds,
    svg('polygon', { points: [...top, ...base].join(' '), fill: mix(p.cloudMid, p.cloudShade) }),
    svg('polygon', { points: [...top, ...lit].join(' '), fill: p.cloudMid, opacity: 0.9 }),
    svg('polygon', { points: `${-span},-9 ${span},-9 ${span},1 ${-span},1`, fill: p.cloudShade, opacity: 0.4 }),
  );
}

function altostratus(p: Palette, span: number): SVGElement {
  return svg('g', {},
    svg('polygon', { points: `${-span},-16 ${span},-20 ${span},0 ${-span},2`, fill: p.cloudMid, opacity: 0.6 }),
    svg('polygon', { points: `${-span},-16 ${span},-20 ${span},-14 ${-span},-10`, fill: p.cloudLight, opacity: 0.35 }),
  );
}

function nimbostratus(p: Palette, span: number): SVGElement {
  const dark = mix(p.cloudShade, p.ink);
  return svg('g', {},
    svg('g', { opacity: 0.5 },
      ...Array.from({ length: Math.floor((span * 2) / 10) }, (_, i) => -span + 5 + i * 10).map((x) =>
        svg('line', { x1: x, y1: 0, x2: x - 6, y2: 34, stroke: p.cloudShade, 'stroke-width': 1.6 })),
    ),
    svg('polygon', { points: `${-span},-22 ${span},-26 ${span},2 ${-span},2`, fill: dark, opacity: 0.92 }),
    svg('polygon', { points: `${-span},-22 ${span},-26 ${span},-19 ${-span},-16`, fill: p.cloudShade }),
  );
}

/**
 * One strand of cirrus as a filled, tapering ribbon: a dense tuft at the head,
 * where the ice forms, and a fall streak that sweeps down and trails back
 * behind it in the slower air below, thinning to nothing.
 */
function strand(hx: number, hy: number, len: number, drop: number, w: number, fill: string, opacity: number): SVGElement {
  // The centre line, a cubic from the head back along the tail.
  const P = [[hx, hy], [hx - len * 0.12, hy + drop * 0.75], [hx - len * 0.55, hy + drop * 1.05], [hx - len, hy + drop * 0.8]];
  const at = (t: number): [number, number] => {
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [k.reduce((a, c, i) => a + c * P[i][0], 0), k.reduce((a, c, i) => a + c * P[i][1], 0)];
  };
  const width = (t: number) => (t < 0.1 ? 0.55 + (t / 0.1) * 0.45 : Math.pow(1 - (t - 0.1) / 0.9, 1.4)) * w + 0.15;
  const left: string[] = [];
  const right: string[] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01));
    const [x1, y1] = at(Math.max(0, t - 0.01));
    const len2 = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len2;
    const ny = (x2 - x1) / len2;
    // Fuller on the underside, where the crystals fall out.
    const wt = width(t);
    left.push(`${(x + nx * wt * 0.35).toFixed(1)},${(y + ny * wt * 0.35).toFixed(1)}`);
    right.unshift(`${(x - nx * wt * 0.65).toFixed(1)},${(y - ny * wt * 0.65).toFixed(1)}`);
  }
  return svg('polygon', { points: [...left, ...right].join(' '), fill, opacity });
}

function cirrus(p: Palette, rng: Rng): SVGElement {
  // Hair combed by the wind: each strand is a faint ribbon of haze carrying a
  // bundle of fine fibres, all swept the same way and thinning out behind.
  const soft: SVGElement[] = [];
  const fibres: SVGElement[] = [];
  const heads: [number, number][] = [[80, -34], [44, -26], [88, -14], [8, -36], [54, -6], [-16, -20], [20, -14]];
  for (const [hx0, hy0] of heads) {
    const hx = hx0 + rng() * 6;
    const hy = hy0 + rng() * 4;
    const len = 70 + rng() * 40;
    const drop = 6 + rng() * 6;
    soft.push(strand(hx, hy, len, drop, 5 + rng() * 2, p.cloudLight, 0.3));
    for (let k = 0; k < 6; k++) {
      const off = (k - 2.5) * 0.9;
      fibres.push(strand(hx - Math.abs(off) * 2, hy + off, len * (0.45 + rng() * 0.55), drop * (0.8 + rng() * 0.3), 0.7, p.cloudLight, 0.5 + rng() * 0.4));
    }
  }
  return svg('g', {}, ...soft, ...fibres);
}

function cirrocumulus(p: Palette, rng: Rng): SVGElement {
  // Grains too small to show a shadow side by eye: ripples of tiny cells.
  const grains: Puff[] = [];
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < 14; i++) {
      const x = -60 + i * 9 + (r % 2) * 4 + rng() * 2;
      const y = -2 - r * 5 + Math.sin(i * 0.8) * 1.5;
      grains.push({ x, y, z: 0, r: 1.8 + rng() * 0.8, flat: 0.8 });
    }
  }
  return svg('g', { opacity: 0.92 }, celCells(grains, { cloudShade: p.cloudMid, cloudMid: p.cloudLight, cloudLight: p.cloudLight }));
}

function cirrostratus(p: Palette, span: number): SVGElement {
  return svg('g', {},
    svg('polygon', { points: `${-span},-10 ${span},-14 ${span},0 ${-span},2`, fill: p.cloudLight, opacity: 0.28 }),
    svg('polygon', { points: `${-span},-10 ${span},-14 ${span},-11 ${-span},-7`, fill: p.cloudLight, opacity: 0.25 }),
  );
}

/** Halfway between two #rrggbb colours. */
function mix(a: string, b: string): string {
  const n = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round((n(a, i) + n(b, i)) / 2).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
}

/** The genera that are sheets, drawn across the whole sky. */
export const SHEETS: ReadonlySet<GenusId> = new Set(['stratus', 'altostratus', 'nimbostratus', 'cirrostratus']);

/** A drawing on its own; a sheet reaches `span` units either side of the middle. */
export function drawCloud(id: GenusId, p: Palette, seed = 1, span = 90): SVGElement {
  const rng = makeRng(seed);
  switch (id) {
    case 'cumulus': return cumulus(p, seed);
    case 'cumulonimbus': return cumulonimbus(p, seed);
    case 'stratus': return stratus(p, rng, span);
    case 'stratocumulus': return stratocumulus(p, rng, seed);
    case 'altocumulus': return altocumulus(p, rng);
    case 'altostratus': return altostratus(p, span);
    case 'nimbostratus': return nimbostratus(p, span);
    case 'cirrus': return cirrus(p, rng);
    case 'cirrocumulus': return cirrocumulus(p, rng);
    case 'cirrostratus': return cirrostratus(p, span);
  }
}

/**
 * A drawing placed in a scene: base centre at (x, y), scaled. A sheet ignores
 * `x` and runs from edge to edge of the scene.
 */
export function placeCloud(id: GenusId, p: Palette, x: number, y: number, scale = 1, seed = 1): SVGElement {
  const sheet = SHEETS.has(id);
  const g = sheet ? drawCloud(id, p, seed, W / 2 / scale + 6) : drawCloud(id, p, seed);
  return svg('g', { transform: `translate(${sheet ? W / 2 : x} ${y}) scale(${scale})`, class: 'drawn-cloud', 'data-genus': id }, g);
}

/** Add a placed cloud to a sky, with sheets behind any clouds already there. */
export function addToSky(sky: SVGElement, cloud: SVGElement): void {
  const first = sky.querySelector('.drawn-cloud');
  if (SHEETS.has(cloud.getAttribute('data-genus') as GenusId) && first) sky.insertBefore(cloud, first);
  else sky.append(cloud);
}

/** Where each drawing sits in a sky scene, as base y and scale, by floor. */
export const SKY_SPOTS: Record<GenusId, { y: number; scale: number }> = {
  cirrus: { y: 52, scale: 0.9 },
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
