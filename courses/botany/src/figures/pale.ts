// Lesson 11, The plant with no green: the two kinds of root fungus, the
// trade of sugar for phosphorus as soil phosphorus changes, and Björkman's
// tracer running from a spruce through a fungus into pinesap.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, player, slider, toggles, wrapped } from './kit';

const W = 400;

// ---- Two kinds of partnership (still) --------------------------------------------------------------

export const kindsStill = () => {
  const s = still(W, 226);
  const fungus = '#d9cfa8';
  const hyph = '#a8946a';
  const parts: SVGElement[] = [];
  // Left: a pine root tip in a fungal sheath, threads running out into the soil.
  parts.push(
    label(100, 18, 'Ectomycorrhiza: a sheath', { anchor: 'middle', bold: true }),
    small(100, 32, 'pines, firs, oaks, birches', { anchor: 'middle', soft: true }),
    svg('path', { d: 'M100,44 L100,150', stroke: '#c9a36a', 'stroke-width': 14, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M100,96 L100,156', stroke: fungus, 'stroke-width': 22, 'stroke-linecap': 'round', opacity: 0.9 }),
  );
  for (const [dx, dy, ex, ey] of [[-10, 110, -70, 96], [-10, 130, -78, 150], [-10, 150, -60, 186], [10, 104, 74, 90], [10, 126, 84, 140], [10, 148, 66, 182], [0, 160, 10, 200]]) {
    parts.push(svg('path', { d: `M${100 + dx},${dy} q${(ex - dx) / 2},${(ey - dy) / 3 - 6} ${ex - dx},${ey - dy}`, stroke: hyph, 'stroke-width': 1, fill: 'none' }));
  }
  parts.push(...wrapped(14, 212, 'A felt round the root tip; threads run far out.', 40, { soft: true }));
  // Right: a root cell with a branched fungal tree inside it.
  const cx = 300;
  parts.push(
    label(cx, 18, 'Arbuscular: inside the cells', { anchor: 'middle', bold: true }),
    small(cx, 32, 'most other plants', { anchor: 'middle', soft: true }),
    svg('rect', { x: cx - 70, y: 60, width: 140, height: 96, rx: 8, fill: '#e9f1dc', stroke: COL.leaf, 'stroke-width': 2 }),
    line(cx, 60, cx, 156, COL.leaf, 2),
    line(cx - 92, 108, cx - 70, 108, hyph, 1.5),
    line(cx + 70, 108, cx + 92, 100, hyph, 1.5),
  );
  // A small tree of fungus (an arbuscule) in each cell.
  for (const ax of [cx - 35, cx + 35]) {
    parts.push(line(ax, 140, ax, 100, hyph, 2));
    for (const [bx, by] of [[-14, 82], [0, 78], [14, 82], [-20, 94], [20, 94]]) parts.push(line(ax, 104, ax + bx, by, hyph, 1.2));
  }
  parts.push(line(cx - 70, 140, cx + 70, 140, hyph, 1.5));
  parts.push(...wrapped(cx - 86, 180, 'Little trees of fungus inside root cells, where the trade is made.', 36, { soft: true }));
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The trade --------------------------------------------------------------------------------------

/**
 * A plant's growth (1 = never short of anything) with soil phosphorus `p`
 * (0 to 1, 1 = plenty), on its own or trading with a fungus. Growth is held
 * back by whichever runs short: the sugar it keeps, or the phosphorus it gets.
 * Sending a share `s` of its sugar to the fungus gives it phosphorus from
 * 1 + 10 s times as much soil; the plant sends the share that grows it most,
 * never more than a quarter.
 */
export function trade(p: number): { alone: number; partnered: number; share: number } {
  const alone = Math.min(1, p);
  // Best share: where the sugar kept (1 - s) meets the phosphorus got p (1 + 10 s).
  const share = p >= 1 ? 0 : Math.min(0.25, Math.max(0, (1 - p) / (1 + 10 * p)));
  const partnered = Math.min(1 - share, p * (1 + 10 * share));
  return { alone, partnered, share };
}

export const tradeFigure = figure(['trade'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let p = 0.5;
  let sawLow = false;
  let sawHigh = false;
  const paint = () => {
    const r = trade(p);
    const ground = 50;
    const cx = 110;
    const reach = 30 + r.share * 340;
    const dots: SVGElement[] = [];
    // Phosphate in the soil: more dots when there is more.
    const n = Math.round(6 + p * 40);
    for (let i = 0; i < n; i++) {
      const x = 12 + ((i * 83) % 200);
      const y = ground + 16 + ((i * 37) % 140);
      dots.push(svg('circle', { cx: x, cy: y, r: 2.2, fill: COL.mineral }));
    }
    const threads: SVGElement[] = [];
    if (r.share > 0.01) {
      for (let k = 0; k < 9; k++) {
        const a = -1.2 + (k / 8) * 2.4;
        const len = Math.min(reach, 120);
        threads.push(svg('path', { d: `M${cx},${ground + 70} q${Math.sin(a) * len * 0.5},${len * 0.2} ${Math.sin(a) * len},${Math.cos(a) * len * 0.7}`, stroke: '#a8946a', 'stroke-width': 1, fill: 'none' }));
      }
    }
    redraw(g,
      svg('rect', { x: 0, y: ground, width: 222, height: 170, fill: COL.soil, opacity: 0.25 }),
      ...dots,
      ...threads,
      // The plant and its root.
      line(cx, ground, cx, ground - 34, COL.leaf, 3),
      svg('ellipse', { cx: cx - 12, cy: ground - 26, rx: 11, ry: 5, fill: COL.leaf }),
      svg('ellipse', { cx: cx + 12, cy: ground - 34, rx: 11, ry: 5, fill: COL.leaf }),
      svg('path', { d: `M${cx},${ground} L${cx},${ground + 80}`, stroke: '#c9a36a', 'stroke-width': 4 }),
      small(14, ground - 8, 'soil phosphate', { fill: COL.mineral }),
      r.share > 0.01 ? small(cx + 20, ground + 168, 'fungal threads', { fill: '#8a7650' }) : null,
      // Bars.
      label(240, 30, 'Growth', { bold: true }),
      ...([['On its own', r.alone, COL.soft], ['With its fungus', r.partnered, COL.leaf]] as const).flatMap(([name, v, col], i) => [
        small(240, 54 + i * 34, name, { bold: true }),
        svg('rect', { x: 240, y: 60 + i * 34, width: 140, height: 10, fill: COL.grid, rx: 2 }),
        svg('rect', { x: 240, y: 60 + i * 34, width: 140 * v, height: 10, fill: col, rx: 2 }),
      ]),
      small(240, 136, 'Sugar paid to the fungus', { bold: true }),
      svg('rect', { x: 240, y: 142, width: 140, height: 10, fill: COL.grid, rx: 2 }),
      svg('rect', { x: 240, y: 142, width: 140 * r.share * 4, height: 10, fill: COL.sugar, rx: 2 }),
      small(380, 164, `${Math.round(r.share * 100)}% of its sugar`, { anchor: 'end', soft: true }),
      ...wrapped(240, 190, 'A model: growth is held back by whichever runs short, sugar or phosphorus.', 30, { soft: true }),
    );
    if (p <= 0.25) sawLow = true;
    if (p >= 0.85) sawHigh = true;
    f.readout.textContent = p >= 0.85
      ? `Plenty of phosphate within the roots’ reach. The fungus has little to sell, so the plant pays it only ${Math.round(r.share * 100)}% of its sugar, or nothing, and grows about as well alone.`
      : p <= 0.25
        ? `Little phosphate, and what there is sits far from the root. Alone the plant manages ${Math.round(r.alone * 100)}% of full growth; paying the fungus ${Math.round(r.share * 100)}% of its sugar lifts that to ${Math.round(r.partnered * 100)}%.`
        : `Some phosphate. The plant pays its fungus ${Math.round(r.share * 100)}% of its sugar and grows ${Math.round(r.partnered * 100)}% as well as an unhindered plant, against ${Math.round(r.alone * 100)}% alone.`;
    if (sawLow && sawHigh) t.done();
  };
  const ps = slider('Phosphate in the soil', 0.05, 1, 0.05, p, (v) => (v < 0.3 ? 'scarce' : v < 0.7 ? 'some' : 'plenty'), (v) => { p = v; paint(); }, 'mineral');
  f.controls.append(ps.node);
  paint();
  return f.node;
});

// ---- Björkman's tracer -----------------------------------------------------------------------------

/** Where the tracer is, day by day: in the spruce's needles, its roots, the fungus, and the pinesap (each a share of the dose). */
export function tracer(days: number, trench: boolean) {
  let needles = 1;
  let roots = 0;
  let fungus = 0;
  let pinesap = 0;
  const out = [{ needles, roots, fungus, pinesap }];
  for (let d = 1; d <= days; d++) {
    const down = needles * 0.3;
    const out1 = roots * 0.25;
    const out2 = trench ? 0 : fungus * 0.3;
    needles -= down;
    roots += down - out1;
    fungus += out1 - out2;
    pinesap += out2;
    out.push({ needles, roots, fungus, pinesap });
  }
  return out;
}

export const tracerFigure = figure(['pinesap'], (ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let day = 0;
  let trench = false;
  const paint = () => {
    const s = tracer(14, trench)[day];
    const ground = 140;
    const glow = (v: number) => 0.1 + 0.9 * Math.min(1, v * 2.5);
    const spot = COL.heat;
    redraw(g,
      svg('rect', { x: 0, y: ground, width: W, height: 90, fill: COL.soil, opacity: 0.25 }),
      // The spruce.
      svg('rect', { x: 66, y: 60, width: 10, height: ground - 60, fill: COL.wood }),
      svg('polygon', { points: `71,14 30,${ground - 30} 112,${ground - 30}`, fill: COL.leaf, opacity: 0.85 }),
      svg('polygon', { points: `71,14 30,${ground - 30} 112,${ground - 30}`, fill: spot, opacity: glow(s.needles) * 0.5 }),
      small(124, 40, 'spruce, given', { soft: true }),
      small(124, 52, 'radioactive sugar', { soft: true }),
      // Spruce roots.
      ...[-30, -10, 10, 34].map((dx) => svg('path', { d: `M71,${ground} q${dx * 0.5},16 ${dx},30`, stroke: '#c9a36a', 'stroke-width': 3, fill: 'none' })),
      ...[-30, -10, 10, 34].map((dx) => svg('circle', { cx: 71 + dx, cy: ground + 30, r: 4, fill: spot, opacity: glow(s.roots) })),
      // Fungal threads to the pinesap.
      svg('path', { d: `M105,${ground + 30} C170,${ground + 60} 230,${ground + 50} 290,${ground + 28}`, stroke: '#a8946a', 'stroke-width': 2, fill: 'none' }),
      svg('path', { d: `M100,${ground + 36} C170,${ground + 76} 240,${ground + 66} 296,${ground + 34}`, stroke: '#a8946a', 'stroke-width': 1.2, fill: 'none' }),
      svg('path', { d: `M105,${ground + 30} C170,${ground + 60} 230,${ground + 50} 290,${ground + 28}`, stroke: spot, 'stroke-width': 2, fill: 'none', opacity: glow(s.fungus) }),
      small(140, ground + 22, 'fungal threads', { fill: '#8a7650' }),
      trench ? svg('rect', { x: 200, y: ground, width: 10, height: 90, fill: COL.paper, stroke: COL.bad }) : null,
      trench ? small(214, ground + 14, 'trench cut', { fill: COL.bad }) : null,
      // The pinesap: pale stems nodding over.
      ...[0, 10, 20].map((dx) => svg('path', { d: `M${290 + dx},${ground} L${290 + dx},${ground - 44} q0,-10 -8,-12`, stroke: '#e6d79a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' })),
      ...[0, 10, 20].map((dx) => svg('circle', { cx: 282 + dx, cy: ground - 56, r: 5, fill: spot, opacity: glow(s.pinesap) })),
      svg('path', { d: `M300,${ground} L300,${ground + 26}`, stroke: '#e6d79a', 'stroke-width': 6 }),
      small(330, ground - 50, 'pinesap', { bold: true }),
      small(330, ground - 38, 'no chlorophyll', { soft: true }),
      label(250, 26, `Day ${day}`, { bold: true }),
      small(250, 42, `in the pinesap: ${Math.round(s.pinesap * 100)}% of the dose`, { fill: spot }),
      small(200, 226, 'Red: where the tracer is. A model of Björkman’s experiment.', { anchor: 'middle', soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = day === 0
      ? 'Radioactive sugar painted onto the spruce. Press Play to follow it.'
      : trench
        ? `Day ${day}: the tracer reaches the spruce’s roots and the fungus on them, but the trench cuts the threads, and none reaches the pinesap.`
        : s.pinesap > 0.05
          ? `Day ${day}: down the spruce’s phloem to its roots, out into the fungus, along its threads and into the pinesap. The pale plant is eating the tree’s sugar, through the fungus they share.`
          : `Day ${day}: the tracer runs down the spruce’s phloem to its roots, as lesson 9’s sugar does.`;
    if (!trench && s.pinesap > 0.1) t.done();
  };
  const days = slider('Days', 0, 14, 1, 0, (v) => `${v}`, (v) => { day = v; paint(); }, 'heat');
  const play = player(days, ctx, { seconds: 7 });
  const cut = toggles(['Cut a trench between them'], [false], (on) => { trench = on[0]; days.set(0); });
  f.controls.append(play.node, days.node, cut.node);
  const open = guessFirst(t, f, {
    ask: 'Björkman puts radioactive sugar into a spruce. A metre away grows pinesap, which has no chlorophyll. Where does the radioactivity turn up?',
    options: ['Only in the spruce and its roots', 'In the pinesap too', 'Nowhere: the spruce burns it all'],
    answer: 1,
    reveal: 'done',
    sliders: [days],
    buttons: cut.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
