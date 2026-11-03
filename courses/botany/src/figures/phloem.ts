// Lesson 9, The ring around the trunk: a tree with a ring of bark cut away
// (or its wood cut instead), and Münch's two-bulb model of pressure flow.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, player, slider, toggles, wrapped } from './kit';

const W = 400;

export type Cut = 'none' | 'bark' | 'wood';

/** A tree month by month after a cut: sugar stored in the roots, live roots, live leaves (each 0 to 1), and the swelling above a bark ring. */
export function girdled(cut: Cut, months: number) {
  let stored = 1;
  let roots = 1;
  let leaves = 1;
  let swell = 0;
  const out = [{ stored, roots, leaves, swell }];
  for (let m = 1; m <= months; m++) {
    if (cut === 'bark') {
      // No sugar comes down; the roots live on their store, then starve; the leaves wilt once the roots fail.
      stored = Math.max(0, stored - 0.07);
      if (stored < 0.25) roots = Math.max(0, roots - 0.18);
      leaves = Math.min(leaves, Math.max(0, Math.min(1, (roots - 0.25) / 0.5)));
      swell = Math.min(1, swell + 0.08);
    } else if (cut === 'wood') {
      // No water goes up: the leaves wilt in days; the roots go on until their store runs out.
      leaves = 0;
      stored = Math.max(0, stored - 0.07);
      if (stored < 0.25) roots = Math.max(0, roots - 0.18);
    }
    out.push({ stored, roots, leaves, swell });
  }
  return out;
}

export const girdleFigure = figure(['roots'], (ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let cut: Cut = 'bark';
  let month = 0;
  const paint = () => {
    const s = girdled(cut, 30)[month];
    const ground = 190;
    const cx = 120;
    const ringY = 150;
    const leafCol = s.leaves > 0.6 ? COL.leaf : s.leaves > 0.2 ? '#a3a04a' : '#9a7b4f';
    const rootCol = s.roots > 0.6 ? '#c9a36a' : s.roots > 0.2 ? '#8a6d4c' : '#4a3a2c';
    const bulge = 4 + s.swell * 6;
    redraw(g,
      svg('rect', { x: 0, y: ground, width: 250, height: 50, fill: COL.soil, opacity: 0.35 }),
      // Roots.
      ...[-60, -35, -10, 15, 40, 62].map((dx, i) => svg('path', { d: `M${cx},${ground} q${dx * 0.4},${18 + (i % 2) * 8} ${dx},${30 + (i % 3) * 6}`, stroke: rootCol, 'stroke-width': 3, fill: 'none' })),
      // Trunk, with the bark above the ring swollen.
      svg('rect', { x: cx - 10, y: 60, width: 20, height: ground - 60, fill: COL.wood }),
      cut === 'bark' ? svg('path', { d: `M${cx - 10},${ringY - 30} Q${cx - 10 - bulge},${ringY - 6} ${cx - 10},${ringY - 2} L${cx + 10},${ringY - 2} Q${cx + 10 + bulge},${ringY - 6} ${cx + 10},${ringY - 30} Z`, fill: COL.bark }) : null,
      cut === 'bark' ? svg('rect', { x: cx - 12, y: ringY - 2, width: 24, height: 9, fill: '#e8d8b0' }) : null,
      cut === 'wood' ? svg('rect', { x: cx - 8, y: ringY, width: 16, height: 6, fill: COL.paper, stroke: COL.bad }) : null,
      svg('ellipse', { cx, cy: 56, rx: 70, ry: 42, fill: leafCol, opacity: 0.35 + 0.6 * Math.max(s.leaves, 0.3) }),
      cut === 'bark' ? small(cx + 22, ringY + 6, 'ring of bark cut away', { fill: COL.bad }) : null,
      cut === 'wood' ? small(cx + 22, ringY + 6, 'wood cut through, bark left', { fill: COL.bad }) : null,
      // Gauges.
      label(260, 40, `Month ${month}`, { bold: true }),
      ...([['Leaves alive', s.leaves, COL.leaf], ['Sugar stored in roots', s.stored, COL.sugar], ['Roots alive', s.roots, '#a67c52']] as const).flatMap(([name, v, col], i) => [
        small(260, 66 + i * 34, name, { bold: true }),
        svg('rect', { x: 260, y: 72 + i * 34, width: 120, height: 10, fill: COL.grid, rx: 2 }),
        svg('rect', { x: 260, y: 72 + i * 34, width: 120 * v, height: 10, fill: col, rx: 2 }),
      ]),
      ...wrapped(260, 182, cut === 'none' ? 'An uncut tree: sugar goes down the bark to the roots, water up the wood.' : 'A model, on a timescale typical of a young tree.', 26, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = cut === 'none'
      ? 'Uncut: leaves send sugar down, roots send water up, and both stay alive.'
      : cut === 'wood'
        ? 'Cut the wood and leave the bark: the leaves wilt within days, because no water reaches them.'
        : month === 0
          ? 'A ring of bark taken off all round the trunk, down to the wood. Press Play.'
          : s.roots < 0.3
            ? `Month ${month}: the roots have starved. Now they can't take up water, and the leaves above, green all this time, are dying too.`
            : `Month ${month}: the leaves are green and the wood still carries water up. But no sugar comes down past the ring: it piles up and the bark above swells, while the roots live on their store.`;
    if (cut === 'bark' && s.roots < 0.3) t.done();
  };
  const months = slider('Months', 0, 30, 1, 0, (v) => `${v}`, (v) => { month = v; paint(); }, 'wood');
  const play = player(months, ctx, { seconds: 8 });
  const which = pick(['No cut', 'Ring of bark cut away', 'Wood cut, bark left'], 1, (i) => { cut = (['none', 'bark', 'wood'] as const)[i]; months.set(0); });
  f.controls.append(which.node, play.node, months.node);
  const open = guessFirst(t, f, {
    ask: 'Malpighi cuts a ring of bark all the way round a trunk, leaving the wood. Which dies first?',
    options: ['The leaves', 'The roots', 'The bark above the cut'],
    answer: 1,
    reveal: 'done',
    sliders: [months],
    buttons: which.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Münch's bulbs -----------------------------------------------------------------------------------

/** Sugar in the source and sink bulbs and the flow between them, minute by minute. */
export function munch(loading: number, unloading: boolean, minutes: number) {
  let source = 0;
  let sink = 0;
  let flow = 0;
  const out = [{ source, sink, flow }];
  for (let m = 1; m <= minutes; m++) {
    // The leaf keeps its end topped up with sugar; water rushes in by osmosis and the pressure drives sap down the tube.
    source = loading * 1.2;
    flow = Math.max(0, 0.25 * (source - sink));
    sink += flow * 0.5;
    if (unloading) sink *= 0.6;
    out.push({ source, sink, flow });
  }
  return out;
}

export const munchFigure = figure(['stops'], (ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let loading = 0.6;
  let unloading = true;
  let minute = 0;
  const paint = () => {
    const now = munch(loading, unloading, 60)[minute];
    const shade = (v: number) => Math.min(1, v / 1.2);
    const bulb = (cx: number, v: number, name: string, sub: string) => [
      svg('ellipse', { cx, cy: 110, rx: 52, ry: 40, fill: COL.sugar, 'fill-opacity': 0.08 + 0.7 * shade(v), stroke: COL.ink, 'stroke-width': 2 }),
      label(cx, 166, name, { anchor: 'middle', bold: true }),
      small(cx, 180, sub, { anchor: 'middle', soft: true }),
    ];
    const speed = now.flow;
    redraw(g,
      svg('rect', { x: 10, y: 50, width: 380, height: 110, fill: COL.water, opacity: 0.1 }),
      small(16, 64, 'water bath', { fill: COL.water }),
      svg('rect', { x: 132, y: 104, width: 136, height: 12, fill: COL.sugar, 'fill-opacity': 0.2 + Math.min(0.7, speed * 3), stroke: COL.ink, 'stroke-width': 1.5 }),
      ...bulb(80, now.source, 'Source: a leaf', 'sugar loaded in'),
      ...bulb(320, now.sink, 'Sink: a root or fruit', unloading ? 'sugar used up' : 'sugar kept'),
      speed > 0.01 ? svg('polygon', { points: `${200 + 8},104 ${200 + 22},110 ${200 + 8},116`, fill: COL.ink }) : null,
      label(200, 96, speed > 0.01 ? `sap flowing: ${(speed * 10).toFixed(1)}` : 'no flow', { anchor: 'middle', bold: true, fill: speed > 0.01 ? COL.ink : COL.bad }),
      ...[0, 1, 2].map((i) => svg('path', { d: `M${50 + i * 25},38 l0,14`, stroke: COL.water, 'stroke-width': 2 })),
      small(80, 32, 'water drawn in', { anchor: 'middle', fill: COL.water }),
      unloading ? small(320, 32, 'water pushed out', { anchor: 'middle', fill: COL.water }) : null,
      small(200, 196, `Minute ${minute}. Membranes let water through but not sugar. A model.`, { anchor: 'middle', soft: true }),
    );
    f.readout.textContent = minute === 0
      ? 'Two bulbs with membrane walls in a water bath, joined by a tube. Press Play.'
      : speed > 0.01
        ? `Sugar loaded into the source draws water in by osmosis; the pressure pushes sap along the tube to the sink${unloading ? ', where the sugar is taken out and the water leaves' : ''}.`
        : 'The sink is as sugary as the source now, so it pulls water in just as hard: no difference in pressure, and the flow stops.';
    if (!unloading && minute >= 30 && speed < 0.05) t.done();
  };
  const time = slider('Minutes', 0, 60, 1, 0, (v) => `${v}`, (v) => { minute = v; paint(); }, 'sugar');
  const play = player(time, ctx, { seconds: 6 });
  const l = slider('Sugar loaded at the source', 0, 1, 0.05, loading, (v) => `${Math.round(v * 100)}%`, (v) => { loading = v; paint(); }, 'sugar');
  const sw = toggles(['Stop the sink using sugar'], [false], (on) => { unloading = !on[0]; paint(); });
  f.controls.append(play.node, time.node, l.node, sw.node);
  paint();
  return f.node;
});
