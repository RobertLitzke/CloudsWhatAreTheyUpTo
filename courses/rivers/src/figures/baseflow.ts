// Lesson 3, Where August's river comes from: water in the spaces between
// grains (a still), Darcy's sand column (live, guess first: double the drop),
// and a valley in cross-section where weeks without rain and a pumping well
// decide whether the creek gains water from the ground or loses it (live,
// guess first: how hard must the well pump?).

import { svg } from 'didactics/dom';
import { arrow, curve, label, line, polyline, redraw, small, still, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, pick, player, slider, tint, animate, sig, type FigureFactory } from './kit';

const W = 400;

// ---- Water between the grains (a still) ---------------------------------------------------

let clipCount = 0;

/** A round magnifier at (cx, cy) of radius r, showing grains of one kind with water between them. */
function lens(cx: number, cy: number, r: number, kind: 'gravel' | 'sand' | 'clay', seed: number): SVGElement {
  const id = `baseflow-lens-${++clipCount}`;
  const rng = makeRng(seed);
  const grains: SVGElement[] = [];
  const step = kind === 'gravel' ? 21 : kind === 'sand' ? 10 : 6;
  for (let y = cy - r - step; y <= cy + r + step; y += step * 0.87) {
    const row = Math.round((y - cy) / (step * 0.87));
    for (let x = cx - r - step + (row % 2 ? step / 2 : 0); x <= cx + r + step; x += step) {
      const jx = x + (rng() - 0.5) * step * 0.2;
      const jy = y + (rng() - 0.5) * step * 0.2;
      if (kind === 'clay') {
        grains.push(svg('ellipse', { cx: jx, cy: jy, rx: 2.8, ry: 0.9, fill: COL.sediment, transform: `rotate(${Math.round(rng() * 50 - 25)} ${jx.toFixed(1)} ${jy.toFixed(1)})` }));
      } else {
        const gr = step * (0.4 + rng() * 0.07);
        grains.push(svg('circle', { cx: jx, cy: jy, r: gr, fill: COL.sediment, stroke: tint(COL.ink, 0.25), 'stroke-width': 0.6 }));
      }
    }
  }
  return svg('g', {},
    svg('defs', {}, svg('clipPath', { id }, svg('circle', { cx, cy, r }))),
    svg('g', { 'clip-path': `url(#${id})` }, svg('circle', { cx, cy, r, fill: tint(COL.ground, 0.75) }), ...grains),
    svg('circle', { cx, cy, r, fill: 'none', stroke: COL.ink, 'stroke-width': 1.4 }));
}

/** A slice of ground with the water table, a well, and three magnified pinches of what is below it. */
export function poresStill() {
  const H = 230;
  const s = still(W, H);
  const rng = makeRng(7);
  const top = 40;
  const table = 120;
  const bottom = 214;
  const parts: SVGElement[] = [
    // The slice of ground: damp above the water table, full below.
    svg('rect', { x: 14, y: top, width: 150, height: table - top, fill: tint(COL.land, 0.22) }),
    svg('rect', { x: 14, y: table, width: 150, height: bottom - table, fill: tint(COL.ground, 0.45) }),
    line(14, top, 164, top, COL.leaf, 3),
  ];
  for (let i = 0; i < 150; i++) {
    const x = 18 + rng() * 142;
    const y = top + 4 + rng() * (bottom - top - 8);
    if (x > 112 && x < 136) continue;
    parts.push(svg('circle', { cx: x, cy: y, r: 2 + rng() * 2.2, fill: tint(COL.sediment, 0.85) }));
  }
  parts.push(
    // A well: a hole that fills to the water table and no higher.
    svg('rect', { x: 116, y: top - 4, width: 16, height: bottom - top, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1 }),
    svg('rect', { x: 117, y: table, width: 14, height: bottom - table - 4, fill: tint(COL.ground, 0.85) }),
    line(14, table, 164, table, COL.ground, 2, { 'stroke-dasharray': '5 3' }),
    small(20, table - 5, 'water table', { fill: COL.ground, bold: true, halo: COL.paper }),
    small(20, top + 16, 'air and water', { halo: COL.paper }),
    small(20, top + 28, 'in the pores', { halo: COL.paper }),
    small(20, table + 18, 'every pore', { halo: COL.paper }),
    small(20, table + 30, 'full of water', { halo: COL.paper }),
    small(136, top - 6, 'a well'),
    label(89, 18, 'A slice of ground', { anchor: 'middle', bold: true }),
  );
  // The magnifiers, all from below the water table.
  const lx = [222, 292, 360];
  const kinds = ['gravel', 'sand', 'clay'] as const;
  const names = ['Gravel', 'Sand', 'Clay'];
  const share = ['30% water', '35% water', '50% water'];
  const moves = ['flows freely', 'flows', 'barely moves'];
  parts.push(label(291, 18, 'Magnified, below the water table', { anchor: 'middle', bold: true }));
  kinds.forEach((k, i) => {
    parts.push(
      lens(lx[i], 84, 29, k, 11 + i),
      label(lx[i], 134, names[i], { anchor: 'middle', bold: true }),
      small(lx[i], 148, share[i], { anchor: 'middle' }),
      small(lx[i], 160, moves[i], { anchor: 'middle', soft: true }),
    );
  });
  // Lines from the slice to the magnifiers.
  parts.push(line(164, 160, 190, 104, tint(COL.ink, 0.35), 1, { 'stroke-dasharray': '2 3' }));
  parts.push(
    svg('rect', { x: 196, y: 184, width: 12, height: 10, fill: tint(COL.ground, 0.75) }),
    small(212, 193, 'water (groundwater)'),
    svg('rect', { x: 310, y: 184, width: 12, height: 10, fill: COL.sediment }),
    small(326, 193, 'grains'),
  );
  s.svg.append(...parts);
  return { node: s.node };
}

// ---- Darcy's sand column ------------------------------------------------------------------

/** Grains for the column, with a typical hydraulic conductivity K in metres a second. */
export const GRAINS = [
  { name: 'Clay', K: 1e-9 },
  { name: 'Silt', K: 1e-7 },
  { name: 'Fine sand', K: 1e-5 },
  { name: 'Coarse sand', K: 1e-3 },
  { name: 'Gravel', K: 1e-2 },
] as const;

/** The cross-section of Darcy's pipe, 35 cm across, in square metres. */
export const DARCY_AREA = Math.PI * 0.175 ** 2;

/** Darcy's law: the flow (m³/s) through `length` metres of material of conductivity K under a drop in head of `drop` metres. */
export function darcyFlow(K: number, drop: number, length = 1, area = DARCY_AREA): number {
  return (K * area * drop) / length;
}

/** A flow in m³/s, said in the unit that suits it. */
export function flowWords(q: number): string {
  const perMin = q * 60_000;
  const perDay = q * 86_400_000;
  if (perMin >= 1) return `${sig(perMin, 2)} litres a minute`;
  if (perDay >= 1) return `${sig(perDay, 2)} litres a day`;
  if (perDay * 1000 >= 0.1) return `${sig(perDay * 1000, 2)} millilitres a day`;
  return `${sig(perDay * 1e6, 2)} microlitres a day`;
}

export const darcyFigure = figure(['double'], (ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  const drops = svg('g');
  f.svg.append(g, drops);
  let grain = 3;
  let drop = 1;
  let open = false;
  const rng = makeRng(3);
  const speck = Array.from({ length: 40 }, () => [rng(), rng()]);
  const colX = 60;
  const colW = 56;
  const sandTop = 100;
  const sandBot = 170;
  const headTop = 34;
  const perM = 30;
  // The plot: flow against drop, for the grain chosen.
  const px = 230;
  const pw = 150;
  const py = 40;
  const ph = 130;
  const paint = () => {
    const K = GRAINS[grain].K;
    const q = darcyFlow(K, drop);
    const qmax = darcyFlow(K, 3);
    const h2 = headTop + drop * perM;
    const X = (d: number) => px + (d / 3) * pw;
    const Y = (v: number) => py + ph - (v / qmax) * ph;
    const parts: (SVGElement | null)[] = [
      // Water above the sand, standing at the inlet head.
      svg('rect', { x: colX, y: headTop + 6, width: colW, height: sandTop - headTop - 6, fill: tint(COL.water, 0.35) }),
      svg('rect', { x: colX, y: sandTop, width: colW, height: sandBot - sandTop, fill: tint(COL.ground, 0.5) }),
      ...speck.map(([x, y]) => svg('circle', { cx: colX + 4 + x * (colW - 8), cy: sandTop + 4 + y * (sandBot - sandTop - 8), r: grain >= 4 ? 4 : grain >= 2 ? 2.4 : 1.2, fill: COL.sediment })),
      svg('rect', { x: colX, y: headTop, width: colW, height: sandBot - headTop + 14, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }),
      // Inlet at the top, outlet spout at the bottom.
      line(colX - 26, headTop + 8, colX, headTop + 8, COL.water, 4),
      line(colX + colW, sandBot + 8, colX + colW + 22, sandBot + 8, COL.ink, 3),
      // The two gauges: how high water stands above and below the sand.
      line(colX - 14, headTop - 6, colX - 14, sandTop - 4, COL.ink, 1),
      line(colX - 8, headTop - 6, colX - 8, sandTop - 4, COL.ink, 1),
      svg('rect', { x: colX - 13.5, y: headTop + 2, width: 5, height: sandTop - headTop - 6, fill: tint(COL.water, 0.7) }),
      line(colX + colW + 8, Math.min(h2, sandBot) - 10, colX + colW + 8, sandBot + 6, COL.ink, 1),
      line(colX + colW + 14, Math.min(h2, sandBot) - 10, colX + colW + 14, sandBot + 6, COL.ink, 1),
      svg('rect', { x: colX + colW + 8.5, y: h2, width: 5, height: Math.max(0, sandBot + 6 - h2), fill: tint(COL.water, 0.7) }),
      // The drop in head, between the two levels.
      line(colX - 20, headTop + 2, colX + colW + 30, headTop + 2, COL.flow, 1, { 'stroke-dasharray': '3 2' }),
      line(colX + colW + 4, h2, colX + colW + 30, h2, COL.flow, 1, { 'stroke-dasharray': '3 2' }),
      arrow(colX + colW + 26, headTop + 3, colX + colW + 26, h2 - 1, COL.flow, 1.5),
      small(colX + colW + 32, (headTop + h2) / 2 + 3, `${drop.toFixed(1)} m`, { fill: COL.flow, bold: true }),
      small(colX + colW / 2, sandBot + 26, `1 m of ${GRAINS[grain].name.toLowerCase()}`, { anchor: 'middle', bold: true }),
      small(colX - 34, headTop - 10, 'water in', { soft: true }),
      small(colX + colW + 4, sandBot + 40, 'water out', { soft: true }),
      // The plot.
      line(px, py + ph, px + pw, py + ph, COL.ink, 1.2),
      line(px, py, px, py + ph, COL.ink, 1.2),
      ...[0, 1, 2, 3].flatMap((d) => [line(X(d), py + ph, X(d), py + ph + 4, COL.ink, 1), small(X(d), py + ph + 14, `${d}`, { anchor: 'middle', soft: true })]),
      small(px + pw, py + ph + 28, 'drop in head (m)', { anchor: 'end' }),
      small(px, py - 8, 'flow out of the bottom'),
      open ? line(X(0), Y(0), X(3), Y(qmax), COL.model, 1.5, { opacity: 0.7 }) : null,
      // The first reading, at 1 m, stays as a faint dot to compare with.
      svg('circle', { cx: X(1), cy: Y(darcyFlow(K, 1)), r: 3.5, fill: 'none', stroke: COL.data, 'stroke-width': 1 }),
      svg('circle', { cx: X(drop), cy: Y(q), r: 4.5, fill: COL.data }),
      small(X(drop) - 6, Y(q) - 8, flowWords(q).replace(' a minute', '/min').replace(' a day', '/day'), { anchor: drop > 1.8 ? 'end' : undefined, bold: true, halo: COL.paper }),
    ];
    redraw(g, ...parts);
    if (!open) return;
    const k = GRAINS[grain];
    const twice = Math.abs(drop - 2) < 0.05;
    f.readout.textContent = twice
      ? `Twice the drop, twice the flow: ${flowWords(q)} through ${k.name.toLowerCase()} against ${flowWords(darcyFlow(k.K, 1))} at 1 m. Darcy found the same straight line for every sand he tried.`
      : `A ${drop.toFixed(1)} m drop pushes ${flowWords(q)} through a metre of ${k.name.toLowerCase()}. The open circle is the reading at 1 m.${grain <= 1 ? ' Too slow to see a drop fall.' : ''}`;
    if (twice && t.goal === 'double') t.done();
  };
  // Drips from the spout, as often as the flow allows (none for clay or silt: too slow to see).
  let wait = 0;
  let falling: { y: number }[] = [];
  animate(f.node, ctx, (dt) => {
    const perMin = darcyFlow(GRAINS[grain].K, drop) * 60_000;
    const rate = perMin < 0.01 ? 0 : Math.min(14, perMin * 2);
    wait -= dt;
    if (rate > 0 && wait <= 0) {
      falling.push({ y: sandBot + 12 });
      wait = 1 / rate;
    }
    falling = falling.filter((d) => (d.y += dt * 120) < H - 4);
    const x = colX + colW + 24;
    redraw(drops, ...(perMin > 4 ? [line(x, sandBot + 10, x, H - 4, COL.water, Math.min(5, 1 + perMin / 15))] : falling.map((d) => svg('ellipse', { cx: x, cy: d.y, rx: 2, ry: 3, fill: COL.water }))));
  });
  const grains = pick(GRAINS.map((x) => x.name), grain, (i) => { grain = i; paint(); });
  const s = slider('Drop in head', 0.2, 3, 0.1, drop, (v) => `${v.toFixed(1)} m`, (v) => { drop = Math.round(v * 10) / 10; paint(); }, 'flow');
  f.controls.append(s.node, grains.node);
  guessFirst(t, f, {
    ask: 'Water runs down through a metre of coarse sand with a 1 m drop in head across it. Darcy doubles the drop to 2 m. What happens to the flow out of the bottom?',
    options: ['About the same', 'It doubles', 'It goes up four times'],
    answer: 1,
    sliders: [s],
    buttons: grains.buttons,
    after: () => {
      open = true;
      paint();
      f.readout.textContent = `${f.readout.textContent} Move the drop to 2 m and see.`;
    },
  });
  paint();
  return f.node;
});

// ---- A valley, a creek and a well ---------------------------------------------------------

/** How much water (litres a second) the ground feeds this reach of creek after `weeks` without rain: a store draining. */
export function reachInflow(weeks: number): number {
  return 60 * Math.exp(-weeks / 9);
}

/** What the creek gains from the ground along the reach (negative: what it loses), once a well pumping `pump` L/s has run long enough to settle. */
export function exchange(weeks: number, pump: number): number {
  return reachInflow(weeks) - pump;
}

const XC = 82; // the creek
const D = 130; // from the creek to the well
const XW = XC + D;
const L0 = 160;
const M = 0.55; // drawdown, pixels per (L/s) per unit of log distance
const C = (2 * M) / D; // chosen so the slope at the creek turns over exactly when pumping equals inflow

/**
 * The water table's height (drawing units, up from the creek's surface) at x:
 * a slope down to the creek that grows with the ground's store, less the cone
 * a well makes, with the creek holding the level under itself (an image well).
 */
export function tableHeight(x: number, weeks: number, pump: number): number {
  const dx = Math.max(0, x - XC);
  const store = C * reachInflow(weeks) * L0 * (1 - Math.exp(-dx / L0));
  const cone = M * pump * Math.log((dx + D) / Math.max(14, Math.abs(XW - x)));
  return store - cone;
}

/** The water table's slope at the creek's bank: positive when water runs into the creek. */
export function slopeAtCreek(weeks: number, pump: number): number {
  return (tableHeight(XC + 0.5, weeks, pump) - tableHeight(XC, weeks, pump)) / 0.5;
}

export const valleyFigure = figure(['losing'], (ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let weeks = 10;
  let pump = 0;
  let open = false;
  const bank = 106;
  const bankY = 140;
  const bed = 212;
  const channel = curve([58, bankY], [XC, 198], [bank, bankY], 24);
  const surf = (x: number) => bankY - 85 * (Math.max(0, x - bank) / (W - bank)) ** 1.3;
  const paint = () => {
    const net = exchange(weeks, pump);
    const B = reachInflow(weeks);
    const depth = 7 + 12 * Math.max(0, Math.min(1, (B + net) / 120));
    const wl = 169 - depth;
    const ground: P[] = [];
    const table: P[] = [];
    for (let x = bank; x <= W; x += 4) {
      table.push([x, Math.min(bed - 2, Math.max(surf(x) + 3, wl - tableHeight(x, weeks, pump)))]);
      ground.push([x, surf(x)]);
    }
    const water = channel.filter(([, y]) => y >= wl);
    const tableAtWell = Math.min(bed - 2, wl - tableHeight(XW, weeks, pump));
    const wide = Math.min(4, 1 + Math.abs(net) / 10);
    const pts = (ps: P[]) => ps.map((q) => q.join(',')).join(' ');
    const parts: (SVGElement | null)[] = [
      // Ground, then the saturated aquifer below the water table, then the creek in its channel.
      svg('polygon', { points: pts([[58, bed], ...channel, ...ground, [W, bed]]), fill: tint(COL.land, 0.3) }),
      svg('polygon', { points: pts([[58, bed], [58, wl], [bank, wl], ...table, [W, bed]]), fill: tint(COL.ground, 0.45) }),
      water.length > 1 ? svg('polygon', { points: pts(water), fill: COL.water }) : null,
      polyline(channel, COL.land, 1.5),
      svg('rect', { x: 0, y: bed, width: W, height: H - bed, fill: COL.rock }),
      // A rock wall on the creek's far side.
      svg('polygon', { points: `0,40 34,44 58,${bankY} 62,${bed} 0,${bed}`, fill: COL.rock }),
      polyline(table, COL.ground, 2, { 'stroke-dasharray': '5 3' }),
      polyline(ground, COL.land, 2),
      small(W - 6, table[table.length - 1][1] + 14, 'water table', { anchor: 'end', fill: COL.ground, bold: true }),
      small(XC, bankY - 6, 'creek', { anchor: 'middle', bold: true, fill: COL.water }),
      small(W - 6, bed + 13, 'rock', { anchor: 'end', fill: COL.paper }),
      // Groundwater into the creek, or creek water into the ground.
      net > 0.5 ? arrow(bank + 34, wl + 20, bank - 6, wl + 4, COL.ground, wide) : null,
      net < -0.5 ? arrow(bank - 8, wl + 4, bank + 32, wl + 22, COL.water, wide) : null,
      // The well, its pump and the water standing in it.
      svg('rect', { x: XW - 4, y: surf(XW) - 16, width: 8, height: bed - surf(XW) + 14, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1 }),
      svg('rect', { x: XW - 3, y: tableAtWell, width: 6, height: Math.max(0, bed - 3 - tableAtWell), fill: COL.ground }),
      svg('rect', { x: XW - 9, y: surf(XW) - 26, width: 18, height: 11, rx: 2, fill: pump > 0 ? COL.works : tint(COL.works, 0.35) }),
      small(XW, surf(XW) - 31, pump > 0 ? `well: ${pump} L/s` : 'well (off)', { anchor: 'middle', bold: pump > 0, fill: COL.works }),
      small(XC + 44, 30, `Week ${weeks} without rain`, { bold: true }),
      small(XC + 44, 44, `ground feeds the creek ${Math.round(B)} L/s`, { fill: COL.ground }),
    ];
    redraw(g, ...parts);
    if (!open) return;
    const season = weeks <= 2 ? 'Late spring' : weeks <= 7 ? 'Midsummer' : weeks <= 11 ? 'Late summer' : 'Early autumn, still dry';
    f.readout.textContent = pump === 0
      ? `${season}: the water table slopes down to the creek, and ${Math.round(B)} litres a second seep in along this reach. That is baseflow, falling week by week as the ground drains.`
      : net >= 0
        ? `${season}: the well takes ${pump} L/s out of the ${Math.round(B)} L/s the ground was sending to the creek. The creek still gains, but only ${Math.round(net)} L/s.`
        : `${season}: the well takes ${pump} L/s, more than the ${Math.round(B)} L/s the ground can supply. The water table now slopes away from the creek, and the creek loses ${Math.round(-net)} L/s to the ground.`;
    if (net < 0 && t.goal === 'losing') t.done();
  };
  const w = slider('Weeks without rain', 0, 16, 1, weeks, (v) => `${v}`, (v) => { weeks = v; paint(); }, 'sun');
  const play = player(w, ctx, { seconds: 8 });
  const p = slider('Pumping', 0, 40, 1, pump, (v) => `${v} L/s`, (v) => { pump = v; paint(); }, 'works');
  f.controls.append(play.node, w.node, p.node);
  guessFirst(t, f, {
    ask: 'Late August, ten weeks without real rain. The ground feeds this reach of creek about 20 litres a second. How hard must the well pump, once it has run for a while, before the creek starts losing water to the ground?',
    options: ['About 2 L/s', 'About 20 L/s', 'About 200 L/s'],
    answer: 1,
    sliders: [w, p],
    after: () => {
      open = true;
      paint();
    },
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'baseflow-pores': poresStill,
  'baseflow-darcy': darcyFigure,
  'baseflow-valley': valleyFigure,
};
