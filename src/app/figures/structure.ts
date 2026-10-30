// Lesson 5, crumb: a magnified bed whose grains gather into crumbs as roots,
// fungi and organic matter build them, or pack flat as digging and footsteps
// break them; and the slake test, two dry clods dropped in water, drawn at
// the moment they go in and five minutes later.

import { el, svg } from 'didactics/dom';
import { label, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { mixOf } from '../../core/soil';
import { bedHydraulics, DISTURBANCE, slaked, stability, type Bed, type Disturbance } from '../../core/structure';
import { COL, figure, frame, slider, tint } from './kit';

const f1 = (n: number) => n.toFixed(1);
const LOAM = mixOf(40, 20);

/** Grains in a box, gathered into crumbs by `s` (0 packed flat, 1 good crumb), with threads and roots through them. */
function drawCrumbs(g: SVGElement, s: number, roots: number, om: number, packed: boolean): void {
  const rng = makeRng(9);
  const x0 = 20;
  const y0 = 16;
  const w = 220;
  const h = 180;
  const shapes: SVGElement[] = [svg('rect', { x: x0, y: y0, width: w, height: h, fill: COL.airPale })];
  // Twelve crumbs on a loose grid; each grain belongs to one.
  const cols = 4;
  const rows = 3;
  const cw = w / cols;
  const ch = h / rows;
  const squeeze = packed ? 0.82 : 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = x0 + (i + 0.5) * cw + (rng() - 0.5) * 10;
      const cy = y0 + h - (h - (j + 0.5) * ch) * squeeze + (rng() - 0.5) * 8;
      for (let k = 0; k < 14; k++) {
        // Where the grain would sit packed flat, and where it sits in its crumb.
        const ax = x0 + (i + (k % 4) / 4 + 0.12) * cw;
        const ay = y0 + h - (h - (j + Math.floor(k / 4) / 4 + 0.12) * ch) * squeeze;
        const a = rng() * Math.PI * 2;
        const rr = Math.sqrt(rng()) * 22;
        const bx = cx + Math.cos(a) * rr;
        const by = cy + Math.sin(a) * rr * 0.85;
        const x = ax + (bx - ax) * s;
        const y = ay + (by - ay) * s;
        const r = 5 + rng() * 3;
        shapes.push(svg('circle', { cx: f1(x), cy: f1(y), r: f1(r), fill: COL.mineral, stroke: '#7d6040', 'stroke-width': 0.6 }));
      }
      // Dark gums and humus binding the crumb.
      if (s > 0.2) shapes.push(svg('ellipse', { cx: f1(cx), cy: f1(cy), rx: 24, ry: 20, fill: tint(COL.organic, Math.min(0.35, om * 0.05 * s)) }));
    }
  }
  // Fungal threads and fine roots, more of them with more months of roots and less disturbance.
  const threads = svg('g', { fill: 'none', stroke: COL.root, 'stroke-linecap': 'round' });
  const n = Math.round(roots * s * 0.8);
  for (let i = 0; i < n; i++) {
    let x = x0 + rng() * w;
    let y = y0 + rng() * 20;
    let d = `M${f1(x)},${f1(y)}`;
    for (let k = 0; k < 6; k++) {
      x += (rng() - 0.5) * 40;
      y += 18 + rng() * 14;
      d += ` T${f1(Math.max(x0, Math.min(x0 + w, x)))},${f1(Math.min(y0 + h, y))}`;
    }
    threads.append(svg('path', { d, 'stroke-width': i % 3 === 0 ? 2 : 0.8 }));
  }
  shapes.push(threads, svg('rect', { x: x0, y: y0, width: w, height: h, fill: 'none', stroke: COL.ink, 'stroke-width': 1.5 }));
  redraw(g, ...shapes);
}

export const crumbFigure = figure(['crumb'], (_ctx, t) => {
  const W = 400;
  const H = 210;
  const f = frame(W, H, 3);
  const pic = svg('g');
  const side = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), pic, side);
  const bed: Bed = { roots: 4, om: 2, disturbance: 'dig', trodden: true };
  const paint = () => {
    const s = stability(bed);
    const h = bedHydraulics(LOAM, bed);
    drawCrumbs(pic, s, bed.roots, bed.om, bed.trodden);
    const x = 260;
    const bar = (y: number, name: string, v: number, colour: string, say: string) => [
      label(x, y, name, { bold: true, fill: colour }),
      svg('rect', { x, y: y + 6, width: 120, height: 10, rx: 5, fill: tint(colour, 0.18) }),
      svg('rect', { x, y: y + 6, width: f1(120 * Math.max(0, Math.min(1, v))), height: 10, rx: 5, fill: colour }),
      small(x + 120, y, say, { anchor: 'end', soft: true }),
    ];
    redraw(side,
      ...bar(40, 'crumb', s, COL.organic, s > 0.7 ? 'strong' : s > 0.35 ? 'fair' : 'weak'),
      ...bar(90, 'pore space', (h.saturated - 0.3) / 0.3, COL.air, `${Math.round(h.saturated * 100)}%`),
      ...bar(140, 'drains', Math.log10(Math.max(1, h.ksat)) / 2, COL.water, `${Math.round(h.ksat)} mm/h`),
      small(x, 190, 'the same loam each time', { soft: true }),
    );
    f.readout.textContent = s > 0.7 && !bed.trodden
      ? 'Good crumb: mineral grains are bound into rounded clumps, leaving wide pores between them for air, drainage, and roots.'
      : bed.trodden
        ? 'Footsteps crush the crumbs and squeeze out the large pores between them. Try keeping off the bed.'
        : s < 0.35
          ? 'Weak structure: mineral grains sit packed together with very few large pores between them.'
          : 'Moderate crumb. Keeping living roots in the ground longer, adding compost, or digging less will build stronger aggregates.';
    if (t.goal === 'crumb' && s > 0.7 && !bed.trodden) t.done();
  };
  const digs = Object.keys(DISTURBANCE) as Disturbance[];
  const digChips = digs.map((d) => el('button.chip', { type: 'button', className: d === bed.disturbance ? 'chip on' : 'chip', onclick: () => {
    bed.disturbance = d;
    digChips.forEach((c, i) => c.classList.toggle('on', digs[i] === d));
    paint();
  } }, DISTURBANCE[d].name));
  const walk = el('button.chip.on', { type: 'button', onclick: () => {
    bed.trodden = !bed.trodden;
    walk.classList.toggle('on', bed.trodden);
    walk.textContent = bed.trodden ? 'Walked on' : 'Kept off';
    paint();
  } }, 'Walked on');
  f.controls.append(
    slider('Months with roots', 0, 12, 1, bed.roots, (v) => `${v}`, (v) => { bed.roots = v; paint(); }, 'leaf').node,
    slider('Organic matter', 1, 8, 0.5, bed.om, (v) => `${v}%`, (v) => { bed.om = v; paint(); }, 'organic').node,
    el('div.chips', {}, digChips),
    el('div.chips', {}, walk),
  );
  paint();
  return f.node;
});

// ---- The slake test -----------------------------------------------------------

const SLAKE_BEDS: { name: string; bed: Bed }[] = [
  { name: 'Dug every year, bare in winter', bed: { roots: 5, om: 2, disturbance: 'dig', trodden: false } },
  { name: 'No dig, mulched, cover crop', bed: { roots: 11, om: 5, disturbance: 'none', trodden: false } },
];

/** A dry clod sitting on a mesh in a glass of water: an intact lump, crumbling to a heap of mud below as it slakes. */
function clod(x: number, base: number, whole: number, rng: () => number, scale = 1): SVGElement[] {
  const out: SVGElement[] = [];
  const r = 26 * scale * Math.sqrt(Math.max(0.02, whole));
  // The heap of fallen grains on the bottom grows as the clod shrinks.
  const heap = 1 - whole;
  const hw = 40 * scale * heap;
  out.push(svg('path', { d: `M${f1(x - hw - 6)},${base + 60} q${f1(hw + 6)},${f1(-22 * scale * heap - 2)} ${f1(2 * hw + 12)},0 z`, fill: '#7a5a3a' }));
  if (whole > 0.03) {
    let d = '';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr = r * (0.8 + rng() * 0.3);
      d += `${i ? 'L' : 'M'}${f1(x + Math.cos(a) * rr)},${f1(base - rr * 0.8 + Math.sin(a) * rr * 0.8)}`;
    }
    out.push(svg('path', { d: d + 'Z', fill: COL.soil }));
  }
  // Cloudy water when grains are falling.
  if (scale === 1 && heap > 0.02 && whole > 0.02) out.push(svg('ellipse', { cx: x, cy: base + 22, rx: 22 * scale, ry: 16 * scale, fill: tint('#7a5a3a', 0.12 * Math.min(1, heap * 3)) }));
  return out;
}

/** Each bed's clod in its glass, just dropped in and five minutes later. */
export function slakeDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 224;
  const s = still(W, H);
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }));
  const rng = makeRng(2);
  SLAKE_BEDS.forEach((b, i) => {
    const mid = 100 + i * 200;
    for (const [k, secs] of [[0, 0], [1, 300]] as const) {
      const x = mid - 46 + k * 92;
      const base = 96;
      s.svg.append(
        svg('rect', { x: x - 42, y: 40, width: 84, height: 128, rx: 6, fill: tint(COL.water, 0.18), stroke: COL.soft }),
        svg('line', { x1: x - 34, y1: base + 2, x2: x + 34, y2: base + 2, stroke: COL.soft, 'stroke-width': 2, 'stroke-dasharray': '2 3' }),
        ...clod(x, base, slaked(stability(b.bed), secs), rng, 0.8),
        small(x, 32, secs ? 'after 5 min' : 'dropped in', { anchor: 'middle', soft: true }),
      );
    }
    s.svg.append(small(mid, 186, b.name.split(',')[0], { anchor: 'middle', bold: true }), small(mid, 199, b.name.split(',').slice(1).join(',').trim(), { anchor: 'middle', soft: true }));
  });
  return { node: s.node };
}
