// Lesson 4, organic matter and compost: a heap built a bucket at a time with
// its carbon-to-nitrogen ratio, and buckets of grass, leaves and wood chips
// rotting away into humus over the years. Lesson 5, advanced composting: the
// core temperature of a heap over twelve weeks as its size, moisture and
// turning change, and the time each way of composting takes.

import { el, svg } from 'didactics/dom';
import { label, polyline, redraw, small, still } from 'didactics/draw';
import { AIR_C, heapRatio, heapRun, heapSummary, MATERIAL_IDS, MATERIALS, remains, verdict, VERDICTS, type HeapCare, type Material, type Moisture } from '../../core/compost';
import { choices, COL, figure, frame, slider, tint } from './kit';

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
      small(gx + 30, Y(30) + 3, 'balanced, 20 to 40', { fill: COL.good, bold: true }),
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
  s.svg.append(small(20, 208, 'dashed: initial volume. The rest was breathed out as carbon dioxide or built into soil microbes.', { soft: true }));
  return { node: s.node };
}

// ---- A hot heap ---------------------------------------------------------------

const MOISTURES: { id: Moisture; name: string }[] = [
  { id: 'dry', name: 'Dry and dusty' },
  { id: 'damp', name: 'Damp as a wrung sponge' },
  { id: 'soggy', name: 'Soggy' },
];
const TURNS: { every: number; name: string }[] = [
  { every: 0, name: 'Never' },
  { every: 14, name: 'Every 2 weeks' },
  { every: 7, name: 'Every week' },
];

/**
 * The core temperature of a balanced heap over twelve weeks, with the band
 * above 55 degrees C shaded and a tick at each turning. The reader sets the
 * heap's size, how wet it is and how often it is turned.
 */
export const heatFigure = figure(['hot'], (_ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 3);
  const chart = svg('g');
  const x0 = 44;
  const x1 = 386;
  const y0 = 20;
  const y1 = 190;
  const X = (day: number) => x0 + ((x1 - x0) * day) / 84;
  const Y = (c: number) => y1 - ((y1 - y0) * (c - 10)) / 70;
  const axes: SVGElement[] = [
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }),
    svg('rect', { x: x0, y: f1(Y(80)), width: x1 - x0, height: f1(Y(55) - Y(80)), fill: tint(COL.clay, 0.12) }),
    small(x1 - 4, Y(55) - 5, 'above 55 C: weed seeds and most plant diseases die', { anchor: 'end', fill: COL.clay }),
    svg('line', { x1: x0, y1: y1, x2: x1, y2: y1, stroke: COL.ink, 'stroke-width': 1.2 }),
    svg('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: COL.ink, 'stroke-width': 1.2 }),
  ];
  for (const c of [20, 40, 60, 80]) axes.push(small(x0 - 6, Y(c) + 3, `${c} C`, { anchor: 'end', soft: true }), svg('line', { x1: x0, y1: Y(c), x2: x1, y2: Y(c), stroke: COL.grid }));
  for (let w = 0; w <= 12; w += 2) axes.push(small(X(w * 7), y1 + 14, String(w), { anchor: 'middle', soft: true }));
  axes.push(small((x0 + x1) / 2, y1 + 32, 'weeks after building the heap', { anchor: 'middle', soft: true }));
  axes.push(svg('line', { x1: x0, y1: f1(Y(AIR_C)), x2: x1, y2: f1(Y(AIR_C)), stroke: COL.soft, 'stroke-dasharray': '3 3' }), small(x0 + 4, Y(AIR_C) - 4, 'air', { soft: true }));
  f.svg.append(...axes, chart);
  const care: HeapCare = { side: 0.75, moisture: 'dry', turnEvery: 0 };

  const paint = () => {
    const run = heapRun(care);
    const sum = heapSummary(run);
    const marks: SVGElement[] = run.filter((d) => d.turned).map((d) => svg('line', { x1: f1(X(d.day)), y1: y1 - 6, x2: f1(X(d.day)), y2: y1, stroke: COL.ink, 'stroke-width': 1.2 }));
    redraw(chart, ...marks, polyline(run.map((d) => [Number(f1(X(d.day))), Number(f1(Y(Math.min(80, d.core))))]), COL.clay, 2.5));
    const size = `A heap ${care.side} m across`;
    const peak = `peaks at ${Math.round(sum.peak)} degrees C`;
    if (sum.peak < 45) f.readout.textContent = `${size} ${peak}. ${care.moisture === 'dry' ? 'Without water films to live in, the microbes work too slowly to heat it' : 'It loses heat through its sides almost as fast as the microbes make it'}, so it will rot slowly over a year or more and leave weed seeds alive.`;
    else if (sum.hotDays === 0) f.readout.textContent = `${size} ${peak} and never reaches 55. ${care.moisture === 'soggy' ? 'Water fills its pores, so once the first oxygen is used up the core goes airless, cools and starts to smell sour.' : 'It is close: a bigger heap or more frequent turning would push it over.'}`;
    else f.readout.textContent = `${size} ${peak} and spends ${sum.hotDays} day${sum.hotDays === 1 ? '' : 's'} above 55. ${sum.doneDay ? `Most of the quick food is eaten by week ${Math.ceil(sum.doneDay / 7)}, and the heap then needs a month or two to cure.` : 'It is still working at twelve weeks.'}${care.turnEvery === 0 ? ' Without turning, the cooler outer layers never pass through the hot core.' : ''}`;
    if (t.goal === 'hot' && sum.hotDays >= 10) t.done();
  };

  const moist = choices(MOISTURES.map((m) => m.name), (i) => { care.moisture = MOISTURES[i].id; paint(); });
  const turn = choices(TURNS.map((m) => m.name), (i) => { care.turnEvery = TURNS[i].every; paint(); });
  moist.node.prepend(el('span.chip-label', {}, 'Moisture:'));
  turn.node.prepend(el('span.chip-label', {}, 'Turning:'));
  f.controls.append(
    slider('Heap size', 0.5, 1.5, 0.25, care.side, (v) => `${v} m across`, (v) => { care.side = v; paint(); }, 'soil').node,
    moist.node,
    turn.node,
  );
  moist.pick(0);
  turn.pick(0);
  return f.node;
});

// ---- Ways to compost ------------------------------------------------------------

/** Each way of composting: the months it takes to give usable compost, and what sets it apart. */
const METHODS: { name: string; months: [number, number]; note: string; hot?: true }[] = [
  { name: 'Hot heap', months: [2, 4], note: 'kills most weed seeds; needs a full bin at once', hot: true },
  { name: 'Cool heap', months: [9, 18], note: 'takes garden waste as it comes; seeds survive' },
  { name: 'Leaf mould', months: [12, 24], note: 'leaves only; low in nutrients, great for structure' },
  { name: 'Worm bin', months: [3, 6], note: 'kitchen scraps, a little at a time' },
  { name: 'Bokashi', months: [1, 2], note: 'ferments any food scraps, then goes in the soil' },
];

/** The months each way of composting takes, as a bar from soonest to latest on a shared scale. */
export function methodsDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 238;
  const s = still(W, H);
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }));
  const x0 = 96;
  const x1 = 384;
  const X = (m: number) => x0 + ((x1 - x0) * m) / 24;
  for (const m of [0, 6, 12, 18, 24]) {
    s.svg.append(svg('line', { x1: X(m), y1: 26, x2: X(m), y2: 206, stroke: COL.grid }), small(X(m), 220, String(m), { anchor: 'middle', soft: true }));
  }
  s.svg.append(small((x0 + x1) / 2, 234, 'months until the compost is ready to use', { anchor: 'middle', soft: true }));
  METHODS.forEach((m, i) => {
    const y = 30 + i * 36;
    const fill = m.hot ? COL.clay : COL.leaf;
    s.svg.append(
      label(x0 - 8, y + 12, m.name, { anchor: 'end', bold: true }),
      svg('rect', { x: f1(X(m.months[0])), y, width: f1(X(m.months[1]) - X(m.months[0])), height: 14, rx: 4, fill }),
      small(x0, y + 27, m.note, { soft: true }),
    );
  });
  return { node: s.node };
}
