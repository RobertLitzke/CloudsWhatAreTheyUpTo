// Lesson 4, organic matter and compost: a heap built a bucket at a time with
// its carbon-to-nitrogen ratio, and buckets of grass, leaves and wood chips
// rotting away into humus over the years.

import { el, svg } from 'lesson-kit/dom';
import { label, redraw, small, still } from 'lesson-kit/draw';
import { heapRatio, MATERIAL_IDS, MATERIALS, remains, verdict, VERDICTS, type Material } from '../../core/compost';
import { COL, figure, frame, tint } from './kit';

const f1 = (n: number) => n.toFixed(1);

/** Each material's colour in the bin: browns in browns, greens in greens. */
const HUE: Record<Material, string> = {
  leaves: '#a0652d', straw: '#d9b65a', chips: '#c49a6c', cardboard: '#b89a74',
  grass: '#6fa040', scraps: '#8db04a', manure: '#5b4a2e', coffee: '#3d2a1c',
};

// ---- The heap -----------------------------------------------------------------

export const heapFigure = figure(['hot'], (_ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 3);
  const bin = svg('g');
  const gauge = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), bin, gauge);
  const layers: Material[] = [];

  const paint = () => {
    const parts: Partial<Record<Material, number>> = {};
    for (const m of layers) parts[m] = (parts[m] ?? 0) + 1;
    const ratio = heapRatio(parts);
    // The bin: twelve layers fill it.
    const bx = 30;
    const by = 30;
    const bw = 130;
    const bh = 180;
    const lh = bh / 12;
    const shapes: SVGElement[] = [svg('rect', { x: bx, y: by, width: bw, height: bh, fill: tint(COL.soil, 0.08) })];
    layers.slice(-12).forEach((m, i) => {
      const y = by + bh - (i + 1) * lh;
      shapes.push(svg('path', { d: `M${bx},${f1(y + lh)} V${f1(y + 2)} q${bw / 4},-3 ${bw / 2},0 t${bw / 2},0 V${f1(y + lh)} z`, fill: HUE[m] }));
    });
    shapes.push(svg('path', { d: `M${bx},${by} V${by + bh} H${bx + bw} V${by}`, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }));
    for (let x = bx + 16; x < bx + bw; x += 22) shapes.push(svg('line', { x1: x, y1: by, x2: x, y2: by + bh, stroke: COL.ink, 'stroke-width': 0.6, opacity: 0.3 }));
    shapes.push(small(bx + bw / 2, by + bh + 14, `${layers.length} bucket${layers.length === 1 ? '' : 's'}`, { anchor: 'middle', soft: true }));
    redraw(bin, ...shapes);
    // The gauge: carbon to nitrogen on a log scale, 10 to 400.
    const gx = 230;
    const gy0 = 30;
    const gh = 180;
    const Y = (r: number) => gy0 + gh * (1 - Math.log(r / 10) / Math.log(40));
    const g: SVGElement[] = [
      svg('rect', { x: gx, y: gy0, width: 24, height: gh, rx: 4, fill: tint(COL.ink, 0.06), stroke: COL.grid }),
      svg('rect', { x: gx, y: f1(Y(40)), width: 24, height: f1(Y(20) - Y(40)), fill: tint(COL.good, 0.5) }),
      small(gx + 30, Y(30) + 3, 'just right, 20–40', { fill: COL.good, bold: true }),
      small(gx + 30, Y(12) + 3, 'too green: smelly', { soft: true }),
      small(gx + 30, Y(70) + 3, 'brown: slow', { soft: true }),
      small(gx + 30, Y(250) + 3, 'far too brown', { soft: true }),
      label(gx + 12, gy0 - 10, 'carbon : nitrogen', { anchor: 'middle', bold: true }),
    ];
    if (ratio !== null) {
      const y = Y(Math.max(10, Math.min(400, ratio)));
      g.push(svg('path', { d: `M${gx - 12},${f1(y - 6)} l10,6 l-10,6 z`, fill: COL.ink }), label(gx - 16, y + 4, String(Math.round(ratio)), { anchor: 'end', bold: true }));
    }
    redraw(gauge, ...g);
    const v = verdict(ratio);
    f.readout.textContent = ratio === null ? VERDICTS.empty : `About ${Math.round(ratio)} to 1. ${VERDICTS[v]}`;
    if (t.goal === 'hot' && v === 'hot' && layers.length >= 3) t.done();
  };

  const add = (m: Material) => {
    layers.push(m);
    paint();
  };
  const row = (kind: 'brown' | 'green') => el('div.chips', {},
    el('span.chip-label', {}, kind === 'brown' ? 'Browns:' : 'Greens:'),
    MATERIAL_IDS.filter((m) => MATERIALS[m].kind === kind).map((m) => el('button.chip', { type: 'button', onclick: () => add(m) }, `+ ${MATERIALS[m].name.toLowerCase()}`)));
  const empty = el('button.btn.btn-small.btn-ghost', { type: 'button', onclick: () => { layers.length = 0; paint(); } }, 'Empty the bin');
  f.controls.append(row('brown'), row('green'), empty);
  paint();
  return f.node;
});

// ---- Rotting away -------------------------------------------------------------

const ROT: Material[] = ['grass', 'leaves', 'chips'];
const ROT_TIMES: [number, string][] = [[0, 'fresh'], [12, 'after 1 year'], [60, 'after 5 years']];

/**
 * A bucket each of grass, leaves and wood chips, fresh, after a year and after
 * five: a bar per moment, split by what is left of each part, against a dashed
 * outline of what went in.
 */
export function rotDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 214;
  const s = still(W, H);
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }));
  const PARTS = [
    { name: 'sugars and proteins', key: 'fast', fill: HUE.grass },
    { name: 'cellulose', key: 'middle', fill: HUE.straw },
    { name: 'lignin, the woody part', key: 'slow', fill: HUE.leaves },
    { name: 'humus', key: 'humus', fill: COL.organic },
  ] as const;
  const x0 = 92;
  const cw = 100;
  const bw = 88;
  ROT_TIMES.forEach(([, when], j) => s.svg.append(label(x0 + j * cw + bw / 2, 18, when, { anchor: 'middle', bold: true })));
  ROT.forEach((m, i) => {
    const y = 32 + i * 40;
    s.svg.append(label(x0 - 8, y + 18, MATERIALS[m].name, { anchor: 'end', bold: true }));
    ROT_TIMES.forEach(([months], j) => {
      const r = remains(m, months);
      const bx = x0 + j * cw;
      let x = bx;
      for (const p of PARTS) {
        const w = bw * r[p.key];
        s.svg.append(svg('rect', { x: f1(x), y, width: f1(w), height: 26, fill: p.fill }));
        x += w;
      }
      s.svg.append(svg('rect', { x: bx, y, width: bw, height: 26, fill: 'none', stroke: COL.soft, 'stroke-dasharray': '4 3' }));
      if (months) s.svg.append(small(bx + bw - 2, y + 36, `${Math.round((1 - r.gone) * 100)}% left`, { anchor: 'end', soft: true }));
    });
  });
  PARTS.forEach((p, i) => {
    const lx = 20 + (i % 2) * 190;
    const ly = 168 + Math.floor(i / 2) * 18;
    s.svg.append(svg('rect', { x: lx, y: ly - 9, width: 12, height: 12, rx: 2, fill: p.fill }), small(lx + 18, ly + 1, p.name));
  });
  s.svg.append(small(20, 208, 'dashed: what went in. The rest was breathed out as carbon dioxide or became soil life.', { soft: true }));
  return { node: s.node };
}
