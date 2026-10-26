// A drawing of every subject (core/photos.ts SUBJECTS), for wherever the photo
// library has no photo of it yet. Each is a close look, 400 by 260, in the same
// flat style as the garden.

import { svg } from 'lesson-kit/dom';
import { makeRng, type Rng } from 'lesson-kit/rng';
import type { SubjectId } from '../../core/photos';
import { mixOf } from '../../core/soil';
import { COL } from '../figures/kit';
import { makeGarden, W } from './garden';
import { drawJar } from './jar';

const H = 260;
const f1 = (n: number) => n.toFixed(1);

function canvas(label: string, ground: string): SVGSVGElement {
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scene', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid slice' }) as SVGSVGElement;
  s.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: ground }));
  return s;
}

/** A rounded, irregular blob around (x, y). */
function blob(x: number, y: number, r: number, rng: Rng, fill: string, n = 8): SVGElement {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.7 + rng() * 0.45);
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
  });
  const mid = (a: number[], b: number[]) => `${f1((a[0] + b[0]) / 2)},${f1((a[1] + b[1]) / 2)}`;
  let d = `M${mid(pts[0], pts[1])}`;
  for (let i = 1; i <= n; i++) d += ` Q${f1(pts[i % n][0])},${f1(pts[i % n][1])} ${mid(pts[i % n], pts[(i + 1) % n])}`;
  return svg('path', { d: d + ' Z', fill });
}

function sandy(): SVGSVGElement {
  const rng = makeRng(3);
  const s = canvas('Sandy soil, close up: loose rounded grains', '#e3c48a');
  const tones = ['#d8ab5c', '#e9c98a', '#c99a4c', '#f2dcab', '#b9874a', '#ddd2bd'];
  for (let i = 0; i < 520; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = 2.5 + rng() * 5;
    s.append(svg('ellipse', { cx: f1(x), cy: f1(y), rx: f1(r * 1.15), ry: f1(r), fill: tones[Math.floor(rng() * tones.length)], stroke: '#9c7440', 'stroke-width': 0.4 }));
    if (rng() < 0.5) s.append(svg('circle', { cx: f1(x - r * 0.35), cy: f1(y - r * 0.35), r: f1(r * 0.3), fill: '#fff', opacity: 0.35 }));
  }
  return s;
}

function clayCracked(): SVGSVGElement {
  const rng = makeRng(7);
  const s = canvas('Clay soil dried and cracked into plates', '#4a3020');
  // Plates on a jittered grid, each shrunk away from its neighbours.
  const step = 58;
  const pts: [number, number][][] = [];
  for (let j = 0; j <= H / step + 1; j++) {
    pts.push([]);
    for (let i = 0; i <= W / step + 1; i++) pts[j].push([i * step + (rng() - 0.5) * 34 - 10, j * step + (rng() - 0.5) * 34 - 10]);
  }
  for (let j = 0; j < pts.length - 1; j++) {
    for (let i = 0; i < pts[j].length - 1; i++) {
      const quad = [pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]];
      const cx = quad.reduce((a, p) => a + p[0], 0) / 4;
      const cy = quad.reduce((a, p) => a + p[1], 0) / 4;
      const shrink = 0.86 + rng() * 0.05;
      const poly = quad.map(([x, y]) => `${f1(cx + (x - cx) * shrink)},${f1(cy + (y - cy) * shrink)}`).join(' ');
      const tone = ['#b7764c', '#a8683f', '#c2845a', '#9d6038'][Math.floor(rng() * 4)];
      s.append(svg('polygon', { points: poly, fill: tone, stroke: '#6b4128', 'stroke-width': 1, 'stroke-linejoin': 'round' }));
      s.append(svg('polygon', { points: quad.map(([x, y]) => `${f1(cx + (x - cx) * shrink * 0.7)},${f1(cy + (y - cy) * shrink * 0.7 - 2)}`).join(' '), fill: '#fff', opacity: 0.06 }));
    }
  }
  return s;
}

function loamCrumbs(): SVGSVGElement {
  const rng = makeRng(11);
  const s = canvas('Loam, close up: dark crumbs with roots running through', '#2f2117');
  const tones = ['#4c3624', '#5a412b', '#3e2b1c', '#664a31', '#55402c'];
  for (let i = 0; i < 260; i++) {
    const x = rng() * W;
    const y = rng() * H;
    s.append(blob(x, y, 6 + rng() * 10, rng, tones[Math.floor(rng() * tones.length)]));
    if (rng() < 0.35) s.append(svg('circle', { cx: f1(x + (rng() - 0.5) * 8), cy: f1(y + (rng() - 0.5) * 8), r: f1(0.8 + rng()), fill: '#c9b48a', opacity: 0.6 }));
  }
  const roots = svg('g', { fill: 'none', stroke: COL.root, 'stroke-linecap': 'round', opacity: 0.8 });
  for (let i = 0; i < 4; i++) {
    let x = 40 + rng() * 320;
    let y = -5;
    let d = `M${f1(x)},${f1(y)}`;
    while (y < H + 10) {
      x += (rng() - 0.5) * 40;
      y += 25 + rng() * 20;
      d += ` T${f1(x)},${f1(y)}`;
    }
    roots.append(svg('path', { d, 'stroke-width': f1(1 + rng() * 1.5) }));
  }
  s.append(roots);
  return s;
}

function silty(): SVGSVGElement {
  const rng = makeRng(5);
  const s = canvas('Silty soil: smooth and fine, with a thin crust where rain has fallen on it', '#a99c80');
  for (let i = 0; i < 1400; i++) s.append(svg('circle', { cx: f1(rng() * W), cy: f1(rng() * H), r: f1(0.4 + rng() * 0.8), fill: rng() < 0.5 ? '#c4b899' : '#8f8268', opacity: 0.6 }));
  // Ripples of a rain crust.
  for (let y = 18; y < H; y += 26) {
    let d = `M0,${y}`;
    for (let x = 0; x <= W; x += 40) d += ` Q${x + 20},${f1(y + (rng() - 0.5) * 12)} ${x + 40},${y}`;
    s.append(svg('path', { d, fill: 'none', stroke: '#8a7d62', 'stroke-width': 1, opacity: 0.5 }));
  }
  return s;
}

function jarTest(): SVGSVGElement {
  const s = canvas('A jar test a day after shaking: sand, silt and clay in layers under clearing water', '#e6efdb');
  s.append(svg('rect', { x: 0, y: 200, width: W, height: 60, fill: '#c9b48a' }));
  s.append(drawJar({ x: 150, y: 30, w: 100, h: 180 }, mixOf(40, 20), 30 * 3600));
  return s;
}

const DRAWN: Record<SubjectId, () => SVGSVGElement> = {
  'sandy-soil': sandy,
  'clay-soil': clayCracked,
  'loam': loamCrumbs,
  'silt-soil': silty,
  'soil-profile': () => makeGarden({ seed: 21, ground: 0.28 }),
  'jar-test': jarTest,
};

export function drawSubject(id: SubjectId): SVGSVGElement {
  return DRAWN[id]();
}
