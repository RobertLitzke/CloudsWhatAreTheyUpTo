// A drawing of every subject (core/photos.ts SUBJECTS), for wherever the photo
// library has no photo of it yet. Each is a close look, 400 by 260, in the same
// flat style as the garden.

import { svg } from 'didactics/dom';
import { makeRng, type Rng } from 'didactics/rng';
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

/** A wavy line of grass or leaves along the top of a soil surface at `y`. */
function tufts(s: SVGSVGElement, y: number, rng: Rng, colour: string, n = 40): void {
  for (let i = 0; i < n; i++) {
    const x = rng() * W;
    const h = 8 + rng() * 14;
    s.append(svg('path', { d: `M${f1(x)},${y} q${f1((rng() - 0.5) * 6)},${f1(-h / 2)} ${f1((rng() - 0.5) * 10)},${f1(-h)}`, stroke: colour, 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }));
  }
}

function puddle(): SVGSVGElement {
  const rng = makeRng(13);
  const s = canvas('Water standing in a puddle on a bare bed after rain', '#5a4330');
  for (let i = 0; i < 160; i++) s.append(blob(rng() * W, rng() * H, 4 + rng() * 6, rng, ['#4d3926', '#634a33', '#56402b'][Math.floor(rng() * 3)]));
  s.append(svg('path', { d: 'M40,150 C60,95 190,80 290,105 C370,125 380,190 300,210 C200,236 70,220 40,150 Z', fill: '#6f8a99' }));
  s.append(svg('path', { d: 'M80,140 C120,110 220,104 280,120', stroke: '#c9dde6', 'stroke-width': 3, fill: 'none', opacity: 0.6, 'stroke-linecap': 'round' }));
  s.append(svg('path', { d: 'M200,180 C230,176 270,170 300,160', stroke: '#c9dde6', 'stroke-width': 2, fill: 'none', opacity: 0.45, 'stroke-linecap': 'round' }));
  // A drowned seedling.
  s.append(svg('path', { d: 'M330,120 q4,-20 0,-40', stroke: '#9aa25a', 'stroke-width': 3, fill: 'none' }), svg('ellipse', { cx: 320, cy: 84, rx: 12, ry: 5, fill: '#b5b56a', transform: 'rotate(-30 320 84)' }), svg('ellipse', { cx: 340, cy: 86, rx: 12, ry: 5, fill: '#b5b56a', transform: 'rotate(30 340 86)' }));
  return s;
}

function earthworm(): SVGSVGElement {
  const rng = makeRng(17);
  const s = canvas('An earthworm in dark crumbly soil', '#3a2a1c');
  for (let i = 0; i < 220; i++) s.append(blob(rng() * W, rng() * H, 5 + rng() * 9, rng, ['#4c3624', '#5a412b', '#3e2b1c', '#664a31'][Math.floor(rng() * 4)]));
  const d = 'M40,180 C90,120 150,210 210,150 S320,90 360,130';
  s.append(svg('path', { d, stroke: '#b4686a', 'stroke-width': 16, fill: 'none', 'stroke-linecap': 'round' }));
  s.append(svg('path', { d, stroke: '#d38c8a', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round', opacity: 0.6 }));
  // The saddle, and the rings.
  s.append(svg('path', { d: 'M262,112 C272,106 282,104 292,104', stroke: '#c9787a', 'stroke-width': 19, fill: 'none', 'stroke-linecap': 'round' }));
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const x = 40 + t * 320;
    const y = 150 + Math.sin(t * Math.PI * 2.2 + 0.6) * 34;
    s.append(svg('line', { x1: f1(x), y1: f1(y - 7), x2: f1(x + 1.5), y2: f1(y + 7), stroke: '#8f4e50', 'stroke-width': 0.8, opacity: 0.5 }));
  }
  // Casts on the surface.
  for (let i = 0; i < 5; i++) s.append(blob(60 + i * 70, 30 + rng() * 20, 7, rng, '#2c1f14'));
  return s;
}

function fungalThreads(): SVGSVGElement {
  const rng = makeRng(23);
  const s = canvas('White fungal threads spreading through old leaf mulch', '#5b4128');
  for (let i = 0; i < 70; i++) {
    const x = rng() * W;
    const y = rng() * H;
    s.append(svg('ellipse', { cx: f1(x), cy: f1(y), rx: f1(14 + rng() * 14), ry: f1(6 + rng() * 6), fill: ['#7a5530', '#8c6236', '#6a4826', '#9a7040'][Math.floor(rng() * 4)], transform: `rotate(${f1(rng() * 180)} ${f1(x)} ${f1(y)})` }));
  }
  const g = svg('g', { fill: 'none', stroke: '#f2efe4', 'stroke-linecap': 'round', opacity: 0.85 });
  for (let i = 0; i < 70; i++) {
    let x = 200 + (rng() - 0.5) * 140;
    let y = 130 + (rng() - 0.5) * 90;
    let d = `M${f1(x)},${f1(y)}`;
    for (let k = 0; k < 4; k++) {
      x += (rng() - 0.5) * 70;
      y += (rng() - 0.5) * 50;
      d += ` T${f1(x)},${f1(y)}`;
    }
    g.append(svg('path', { d, 'stroke-width': f1(0.4 + rng() * 0.9) }));
  }
  s.append(g);
  return s;
}

function compostHeap(): SVGSVGElement {
  const rng = makeRng(29);
  const s = canvas('A compost heap in a wooden bin, layered browns and greens', '#cfe0b0');
  s.append(svg('rect', { x: 0, y: 200, width: W, height: 60, fill: '#7a9a50' }));
  // The bin's back boards.
  for (let i = 0; i < 6; i++) s.append(svg('rect', { x: 70, y: 60 + i * 24, width: 260, height: 20, fill: '#a07a4f', stroke: '#7a5a38' }));
  // The heap, in layers.
  const layers = ['#6a4826', '#7fa04a', '#8c6236', '#6fa040', '#a0652d', '#5b4a2e'];
  layers.forEach((c, i) => {
    const y = 200 - i * 18;
    s.append(svg('path', { d: `M${80 + i * 6},${y} Q200,${y - 30 - i * 2} ${320 - i * 6},${y} Z`, fill: c }));
  });
  for (let i = 0; i < 40; i++) s.append(svg('line', { x1: f1(110 + rng() * 180), y1: f1(120 + rng() * 70), x2: f1(110 + rng() * 180), y2: f1(120 + rng() * 70), stroke: '#d9b65a', 'stroke-width': 1.2, opacity: 0.7 }));
  // Front posts, and a wisp of steam.
  s.append(svg('rect', { x: 64, y: 50, width: 12, height: 160, fill: '#8a6440' }), svg('rect', { x: 324, y: 50, width: 12, height: 160, fill: '#8a6440' }));
  s.append(svg('path', { d: 'M200,110 q-10,-20 0,-40 q10,-20 0,-40', stroke: '#fff', 'stroke-width': 3, fill: 'none', opacity: 0.5, 'stroke-linecap': 'round' }));
  return s;
}

function crustedSoil(): SVGSVGElement {
  const rng = makeRng(31);
  const s = canvas('A pale crust on silty soil after rain, with seedlings pushing up through cracks', '#b8a888');
  for (let i = 0; i < 1200; i++) s.append(svg('circle', { cx: f1(rng() * W), cy: f1(rng() * H), r: f1(0.4 + rng() * 0.8), fill: rng() < 0.5 ? '#cfc1a2' : '#9c8e70', opacity: 0.6 }));
  // A few fine cracks.
  for (let i = 0; i < 9; i++) {
    let x = rng() * W;
    let y = rng() * H;
    let d = `M${f1(x)},${f1(y)}`;
    for (let k = 0; k < 4; k++) {
      x += (rng() - 0.5) * 60;
      y += (rng() - 0.5) * 40;
      d += ` L${f1(x)},${f1(y)}`;
    }
    s.append(svg('path', { d, stroke: '#7d6f54', 'stroke-width': 1.2, fill: 'none' }));
  }
  // Seedlings bent under the crust.
  for (const [x, y] of [[120, 150], [250, 120], [310, 190]]) {
    s.append(svg('path', { d: `M${x},${y} q6,-6 14,-4`, stroke: '#7fa04a', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }), svg('ellipse', { cx: x + 16, cy: y - 5, rx: 5, ry: 3, fill: '#a9c26a' }));
  }
  return s;
}

function yellowLeaves(): SVGSVGElement {
  const s = canvas('A plant whose oldest, lowest leaves are turning yellow', '#e6efdb');
  s.append(svg('rect', { x: 0, y: 220, width: W, height: 40, fill: '#5a4330' }));
  s.append(svg('path', { d: 'M200,222 C198,170 202,110 200,30', stroke: '#5f8f3a', 'stroke-width': 5, fill: 'none' }));
  const leaf = (y: number, dir: number, size: number, fill: string) =>
    svg('path', { d: `M200,${y} q${f1(30 * size * dir)},${f1(-22 * size)} ${f1(70 * size * dir)},0 q${f1(-40 * size * dir)},${f1(18 * size)} ${f1(-70 * size * dir)},0 z`, fill });
  const tones = ['#d9cf6a', '#d6c95c', '#a8b24e', '#7fa04a', '#5f8f3a', '#5f8f3a'];
  tones.forEach((c, i) => s.append(leaf(205 - i * 32, i % 2 ? 1 : -1, 1.3 - i * 0.12, c)));
  return s;
}

function coverCrop(): SVGSVGElement {
  const rng = makeRng(37);
  const s = canvas('A bed of crimson clover and rye grown as a cover crop', '#cfe0b0');
  s.append(svg('rect', { x: 0, y: 200, width: W, height: 60, fill: '#4a3524' }));
  tufts(s, 205, rng, '#5f8f3a', 160);
  tufts(s, 175, rng, '#7fa04a', 120);
  for (let i = 0; i < 26; i++) {
    const x = rng() * W;
    const y = 80 + rng() * 90;
    s.append(svg('path', { d: `M${f1(x)},205 L${f1(x)},${f1(y)}`, stroke: '#5f8f3a', 'stroke-width': 1.5 }));
    s.append(svg('ellipse', { cx: f1(x), cy: f1(y - 8), rx: 5, ry: 10, fill: '#b8323a' }));
  }
  return s;
}

function mulch(): SVGSVGElement {
  const rng = makeRng(41);
  const s = canvas('Straw mulch laid between young plants in a bed', '#d9b65a');
  for (let i = 0; i < 400; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const a = rng() * Math.PI;
    const l = 10 + rng() * 26;
    s.append(svg('line', { x1: f1(x), y1: f1(y), x2: f1(x + Math.cos(a) * l), y2: f1(y + Math.sin(a) * l), stroke: ['#e9cf7a', '#c9a24a', '#f0dc98', '#b88f3a'][Math.floor(rng() * 4)], 'stroke-width': 2, 'stroke-linecap': 'round' }));
  }
  for (const [x, y] of [[100, 90], [300, 80], [200, 190], [60, 220], [340, 210]]) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      s.append(svg('ellipse', { cx: f1(x + Math.cos(a) * 14), cy: f1(y + Math.sin(a) * 14), rx: 15, ry: 8, fill: k % 2 ? '#5f8f3a' : '#7fa04a', transform: `rotate(${f1((a * 180) / Math.PI)} ${f1(x + Math.cos(a) * 14)} ${f1(y + Math.sin(a) * 14)})` }));
    }
  }
  return s;
}

const DRAWN: Record<SubjectId, () => SVGSVGElement> = {
  'sandy-soil': sandy,
  'clay-soil': clayCracked,
  'loam': loamCrumbs,
  'silt-soil': silty,
  'soil-profile': () => makeGarden({ seed: 21, ground: 0.28 }),
  'jar-test': jarTest,
  'puddle': puddle,
  'earthworm': earthworm,
  'fungal-threads': fungalThreads,
  'compost-heap': compostHeap,
  'crusted-soil': crustedSoil,
  'yellow-leaves': yellowLeaves,
  'cover-crop': coverCrop,
  'mulch': mulch,
};

export function drawSubject(id: SubjectId): SVGSVGElement {
  return DRAWN[id]();
}
