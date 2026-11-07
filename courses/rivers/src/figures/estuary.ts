// Lesson 12, Why the Sound stays cold in July: fresher water out on top,
// salty water in below, mixed at the sill of Admiralty Inlet; deep water
// renewed at neap tides; a salt wedge in a river mouth; the drain at the locks.

import { svg } from 'didactics/dom';
import { arrow, curve, line, redraw, small, still, type P } from 'didactics/draw';
import { length } from 'didactics/units';
import { axes, COL, figure, frame, guessFirst, legend, player, slider, tint, wrapped } from './kit';

// ---- Salt and density ----------------------------------------------------------------------

/** Density of sea water at about 10 °C, kg/m³, from its salinity in grams per kilogram (a straight-line fit, good from 0 to 35). */
export const density = (salinity: number) => 999.7 + 0.775 * salinity;

// ---- The exchange over the sill ------------------------------------------------------------

/** Days from one spring tide to the next. */
export const SPRING_NEAP = 14.77;
/** Salinity of the deep water arriving at Admiralty Inlet from the Strait, g/kg, in the model. */
export const OCEAN = 31.8;

/** Tidal currents at the sill, 1 at springs, about 0.3 at neaps; day 0 is a spring tide. */
export const tideStrength = (day: number) => 0.65 + 0.35 * Math.cos((2 * Math.PI * day) / SPRING_NEAP);

/** Share of the outflowing surface water mixed down at the sill and carried back in: stirring grows as the cube of the current. */
export const reflux = (day: number) => 0.35 + 0.35 * tideStrength(day) ** 3;

/** Salinity of the Sound's surface layer for a river flow `river` times the average, g/kg. */
export const surfaceSalt = (river: number) => 30.6 - 1.0 * river;

/** Salinity of the water crossing the sill inward: ocean water diluted by the refluxed surface water. */
export const inflowSalt = (day: number, river: number) => {
  const r = reflux(day);
  return (1 - r) * OCEAN + r * surfaceSalt(river);
};

export interface SillRun {
  days: number[];
  /** Salinity crossing the sill inward. */
  inflow: number[];
  /** Salinity of the Main Basin's bottom water. */
  bottom: number[];
  /** Whether the inflow is heavier than the bottom water, so it sinks to the floor and renews it. */
  renewing: boolean[];
  /** Days since the bottom water was last renewed. */
  age: number[];
}

/**
 * A month in the model: the inflow sinks to the bottom and replaces the
 * water there whenever it is the denser of the two; otherwise it spreads
 * at mid-depth, and the bottom water is slowly freshened by mixing from
 * above. Spun up for a few cycles first.
 */
export function sillMonth(river: number, days = 30, perDay = 8): SillRun {
  const dt = 1 / perDay;
  const renewT = 3;
  const mixT = 60;
  let bottom = 30.8;
  let age = 30;
  const out: SillRun = { days: [], inflow: [], bottom: [], renewing: [], age: [] };
  const spin = Math.round(4 * SPRING_NEAP * perDay);
  for (let i = -spin; i <= days * perDay; i++) {
    const day = i * dt;
    const sIn = inflowSalt(day, river);
    const renewing = sIn > bottom;
    if (i >= 0) {
      out.days.push(day);
      out.inflow.push(sIn);
      out.bottom.push(bottom);
      out.renewing.push(renewing);
      out.age.push(age);
    }
    if (renewing) {
      bottom += ((sIn - bottom) / renewT) * dt;
      age += (1 - age / renewT) * dt;
    } else {
      bottom -= ((bottom - surfaceSalt(river)) / mixT) * dt;
      age += dt;
    }
  }
  return out;
}

/** The days when the bottom is being renewed, as [start, end] runs. */
export function renewals(run: SillRun): [number, number][] {
  const out: [number, number][] = [];
  run.renewing.forEach((on, i) => {
    if (on && (i === 0 || !run.renewing[i - 1])) out.push([run.days[i], run.days[i]]);
    if (on) out[out.length - 1][1] = run.days[i];
  });
  return out;
}

const W = 400;

const RIVER_STEPS = [0.4, 0.7, 1, 1.6, 2.5];
const riverWords = (v: number) => (v < 0.6 ? 'late-summer low' : v < 0.9 ? 'below average' : v < 1.3 ? 'average' : v < 2 ? 'high' : 'winter flood');

export const sillFigure = figure(['neap'], (ctx, t) => {
  const f = frame(W, 352, 3);
  const g = svg('g');
  f.svg.append(g);
  let river = 1;
  let day = 0;
  let run = sillMonth(river);
  let sawRenewal = false;

  const section = (i: number) => {
    const r = reflux(run.days[i]);
    const renewing = run.renewing[i];
    const sea = 22;
    const iface = 46 + 6 * (river - 1);
    const sill = 100;
    const parts: SVGElement[] = [];
    // Floor: the Strait, the sill and the deep Main Basin.
    const floor = `M0,150 L95,150 C120,150 125,${sill} 145,${sill} C165,${sill} 175,168 200,168 L400,168`;
    parts.push(
      svg('rect', { x: 0, y: sea, width: W, height: 150, fill: tint(COL.salt, 0.45) }),
      svg('rect', { x: 0, y: sea, width: W, height: iface - sea, fill: tint(COL.water, 0.45) }),
      line(0, iface, W, iface, COL.water, 1, { 'stroke-dasharray': '4 3' }),
      svg('path', { d: `${floor} L400,180 L0,180 Z`, fill: COL.rock }),
      line(0, sea, W, sea, COL.salt, 1.5),
      small(10, 16, 'Strait', { bold: true }),
      small(145, 16, 'Admiralty Inlet sill', { anchor: 'middle', bold: true }),
      small(W - 14, 16, 'Main Basin', { bold: true, anchor: 'end' }),
    );
    // River water in at the head, fresher water out on top.
    const rw = 1.5 + river * 1.4;
    parts.push(arrow(W - 12, sea + 4, W - 44, sea + 10, COL.water, rw), small(W - 14, sea + 24, 'rivers', { anchor: 'end', fill: COL.water, bold: true, halo: COL.paper }));
    parts.push(arrow(320, (sea + iface) / 2, 210, (sea + iface) / 2, COL.flow, 2.5), arrow(110, (sea + iface) / 2, 20, (sea + iface) / 2, COL.flow, 2.5));
    parts.push(small(265, (sea + iface) / 2 - 6, 'out on top', { anchor: 'middle', fill: COL.flow, bold: true, halo: COL.paper }));
    // In below, over the sill.
    parts.push(arrow(10, 128, 120, 106, COL.flow, 2.5), small(14, 142, 'in below', { fill: COL.flow, bold: true, halo: COL.paper }));
    // Mixing at the sill: swirls, more at springs.
    const n = Math.round(2 + 6 * r);
    for (let k = 0; k < n; k++) {
      const x = 128 + (k % 4) * 11;
      const y = iface + 8 + Math.floor(k / 4) * 16;
      parts.push(svg('circle', { cx: x, cy: y, r: 4 + r * 2, fill: 'none', stroke: COL.ink, 'stroke-width': 1, 'stroke-dasharray': '6 3', opacity: 0.6 }));
    }
    parts.push(arrow(175, iface - 6, 168, sill - 2, COL.flow, 1.5 + r * 3));
    parts.push(small(182, 72, `${Math.round(r * 100)}% carried back in`, { fill: COL.flow, bold: true, halo: COL.paper }));
    // Where the new water goes.
    if (renewing) {
      const pts: P[] = curve([175, 108], [205, 165], [330, 160]);
      parts.push(svg('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.salt, 'stroke-width': 4, 'stroke-linecap': 'round' }));
      parts.push(arrow(320, 160, 345, 160, COL.salt, 4));
      parts.push(small(260, 150, 'sinks to the bottom', { anchor: 'middle', bold: true, fill: COL.paper }));
    } else {
      const depth = 92 + (run.bottom[i] - run.inflow[i]) * -10;
      parts.push(arrow(175, 104, 330, Math.max(80, Math.min(120, depth)), COL.salt, 4));
      parts.push(small(260, 136, 'spreads at mid-depth', { anchor: 'middle', bold: true, fill: COL.paper }));
    }
    return parts;
  };

  const paint = () => {
    const i = Math.min(run.days.length - 1, Math.round(day * 8));
    const all = [...run.inflow, ...run.bottom].map(density);
    const lo = Math.floor(Math.min(...all) * 2) / 2 - 0.25;
    const hi = Math.ceil(Math.max(...all) * 2) / 2 + 0.25;
    const ax = axes({
      x: 44, y: 234, w: 340, h: 76, xmin: 0, xmax: 30, ymin: lo, ymax: hi,
      xticks: [0, 5, 10, 15, 20, 25, 30], yticks: [Math.ceil(lo * 2) / 2, Math.floor(hi * 2) / 2],
      yfmt: (v) => v.toFixed(1), xlabel: 'days', ylabel: 'density, kg/m³', ink: COL.ink, grid: COL.grid,
    });
    const upto = (arr: number[]) => arr.slice(0, i + 1).map((s, j) => [run.days[j], density(s)] as [number, number]);
    // The tide's strength as a strip above the graph.
    const tideY = (v: number) => 210 - v * 18;
    const tide = run.days.slice(0, i + 1).map((d) => [ax.X(d), tideY(tideStrength(d))] as P);
    const bands = renewals(run).filter(([a]) => a <= day).map(([a, b]) => svg('rect', { x: ax.X(a), y: 234, width: Math.max(1, ax.X(Math.min(b, day)) - ax.X(a)), height: 76, fill: tint(COL.salt, 0.18) }));
    redraw(g,
      ...section(i),
      ...bands,
      small(10, 204, 'tide', { fill: COL.moon, bold: true }),
      svg('polyline', { points: tide.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.moon, 'stroke-width': 2 }),
      ...[0, SPRING_NEAP, 2 * SPRING_NEAP].map((d) => small(ax.X(d) + (d > 20 ? -6 : d < 1 ? 2 : 0), 189, 'spring', { anchor: d > 20 ? 'end' : d < 1 ? undefined : 'middle', soft: true })),
      ...[SPRING_NEAP / 2, 1.5 * SPRING_NEAP].map((d) => small(ax.X(d), 222, 'neap', { anchor: 'middle', soft: true })),
      ...ax.parts,
      ax.path(upto(run.inflow), COL.salt, 2.2),
      ax.path(upto(run.bottom), COL.ink, 1.8, { 'stroke-dasharray': '5 3' }),
      line(ax.X(day), 190, ax.X(day), 310, COL.ink, 1),
      ...legend(44, 348, [
        { text: 'water crossing the sill', color: COL.salt },
        { text: 'bottom water', color: COL.ink, dash: true },
      ]),
    );
    if (!open()) return;
    const renewing = run.renewing[i];
    if (renewing) sawRenewal = true;
    const phase = tideStrength(day) > 0.8 ? 'Near spring tides' : tideStrength(day) < 0.5 ? 'Near neap tides' : 'Between springs and neaps';
    f.readout.textContent = `Day ${Math.round(day)}. ${phase}, ${Math.round(reflux(day) * 100)}% of the outflow is mixed down and carried back in. ` + (renewing
      ? 'The water crossing the sill is denser than the bottom water, so it sinks to the floor and replaces it.'
      : `The water crossing the sill is lighter than the bottom water, so it spreads at mid-depth. The bottom water is ${Math.round(run.age[i])} days old.`);
    if (sawRenewal && day >= 15 && t.goal === 'neap') t.done();
  };

  const ds = slider('Day', 0, 30, 0.125, day, (v) => `${Math.round(v)}`, (v) => { day = v; paint(); }, 'moon');
  const play = player(ds, ctx, { seconds: 15 });
  const rs = slider('River flow', { steps: RIVER_STEPS, value: river, show: riverWords, onInput: (v) => { river = v; run = sillMonth(river); paint(); }, color: 'water' });
  f.controls.append(play.node, ds.node, rs.node);
  const open = guessFirst(t, f, {
    ask: 'New ocean water reaches the bottom of the Main Basin in pulses, about twice a month. Do they come at the strong spring tides or the weak neaps?',
    options: ['At spring tides', 'At neap tides', 'A little on every tide'],
    answer: 1,
    sliders: [ds, rs],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A salt wedge in a river mouth ------------------------------------------------------------

export const WEDGE = {
  /** Channel width, m. */
  width: 100,
  /** Channel depth, m. */
  depth: 10,
  /** Reduced gravity for river water over sea water, m/s² (2 percent of g). */
  gPrime: 0.2,
  /** Friction between the layers, set so an average flow holds the wedge some kilometres up. */
  friction: 0.06,
  /** How far up the channel the wedge can reach before the bed rises, m. */
  reach: 12000,
};

/** The river's densimetric Froude number: its speed against the speed of a wave on the boundary between the layers. */
export const froude = (q: number) => q / (WEDGE.width * WEDGE.depth) / Math.sqrt(WEDGE.gPrime * WEDGE.depth);

/** How far a salt wedge reaches up a channel against a river of `q` m³/s (Schijf and Schönfeld's arrested wedge, capped at the channel's reach), m. */
export function wedgeLength(q: number): number {
  const F = froude(q);
  if (F >= 1) return 0;
  const L = (WEDGE.depth / (4 * WEDGE.friction)) * (1 / (5 * F * F) - 2 + 3 * F ** (2 / 3) - 1.2 * F ** (4 / 3));
  return Math.max(0, Math.min(WEDGE.reach, L));
}

export const wedgeFigure = figure(['pushed'], (ctx, t) => {
  const units = ctx.save.units;
  const f = frame(W, 212, 2);
  const g = svg('g');
  f.svg.append(g);
  let q = 40;
  let sawFar = false;
  let sawNear = false;
  const x0 = 30;
  const xw = 360;
  const X = (m: number) => x0 + (m / 14000) * xw;
  const top = 50;
  const bed = 150;
  const paint = () => {
    const L = wedgeLength(q);
    const F = froude(q);
    const mouthTop = top + (bed - top) * Math.min(0.85, F ** (2 / 3) + 0.15);
    const iface: P[] = [];
    for (let k = 0; k <= 40; k++) {
      const m = (L * k) / 40;
      const frac = L > 0 ? (1 - m / L) ** 0.45 : 0;
      iface.push([X(m), bed - (bed - mouthTop) * frac]);
    }
    const wedge = `M${X(0)},${bed} ` + iface.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ` L${X(L)},${bed} Z`;
    const aw = 1.5 + Math.log10(q) * 1.5;
    redraw(g,
      svg('rect', { x: 0, y: top, width: x0, height: bed - top + 10, fill: tint(COL.salt, 0.5) }),
      svg('rect', { x: x0, y: top, width: xw, height: bed - top, fill: tint(COL.water, 0.35) }),
      svg('path', { d: wedge, fill: tint(COL.salt, 0.7) }),
      svg('path', { d: `M${x0},${bed} L${X(12000)},${bed} L${X(14000)},${top + 30} L${X(14000)},${bed + 20} L${x0},${bed + 20} Z`, fill: COL.rock }),
      line(0, top, W, top, COL.salt, 1.5),
      small(10, top - 8, 'the Sound', { bold: true, fill: COL.salt }),
      small(X(14000) - 8, top - 8, 'river', { bold: true, fill: COL.water, anchor: 'end' }),
      arrow(X(11000), top + 12, X(11000) - 30 - aw * 8, top + 12, COL.flow, aw),
      small(X(11000) - 34 - aw * 8, top + 16, `${Math.round(q)} m³/s`, { anchor: 'end', fill: COL.flow, bold: true }),
      ...(L > 1500 ? [small((X(0) + X(L)) / 2, bed - 8, 'salt wedge', { anchor: 'middle', bold: true, fill: COL.paper })] : []),
      ...(L > 0 ? [line(X(L), bed + 2, X(L), bed + 22, COL.paper, 2), small(Math.max(X(L), x0 + 20), bed + 34, `toe, ${length(L, units)}`, { anchor: 'middle', bold: true, fill: COL.salt, halo: COL.paper })] : []),
      ...[0, 4000, 8000, 12000].map((m) => small(X(m), 206, m ? length(m, units) : 'mouth', { anchor: 'middle', soft: true })),
    );
    if (L >= 6000) sawFar = true;
    if (L <= 1000) sawNear = true;
    f.readout.textContent = L <= 0
      ? 'The river is strong enough to push the salt water right out of the channel.'
      : `Salt water reaches ${length(L, units)} up the channel along the bottom, under the river water flowing out on top.` + (L >= WEDGE.reach ? ' At low flow it reaches the head of the deep channel.' : '');
    if (sawFar && sawNear && t.goal === 'pushed') t.done();
  };
  const s = slider('River flow', { min: 10, max: 600, scale: 'log', value: q, show: (v) => `${Math.round(v)} m³/s`, onInput: (v) => { q = v; paint(); }, color: 'water' });
  f.controls.append(s.node);
  paint();
  return f.node;
});

// ---- The drain at the locks (still) -------------------------------------------------------------

export const locksStill = () => {
  const s = still(W, 210);
  const lake = 50;
  const sound = 80;
  const bed = 150;
  const pipeY = bed + 26;
  const pipe = `M308,${bed + 14} L308,${pipeY} L80,${pipeY} L80,${bed}`;
  s.svg.append(
    svg('rect', { x: 0, y: sound, width: 150, height: bed - sound, fill: tint(COL.salt, 0.5) }),
    svg('rect', { x: 150, y: 30, width: 70, height: bed - 30 + 10, fill: COL.works, opacity: 0.85 }),
    svg('rect', { x: 162, y: lake, width: 46, height: bed - lake, fill: tint(COL.salt, 0.45) }),
    svg('rect', { x: 220, y: lake, width: 180, height: bed - lake, fill: tint(COL.water, 0.35) }),
    svg('path', { d: `M220,${bed} L220,${bed - 12} C250,${bed - 12} 270,${bed - 5} 300,${bed - 3} L300,${bed} Z`, fill: tint(COL.salt, 0.7) }),
    svg('rect', { x: 0, y: bed, width: W, height: 60, fill: COL.rock }),
    svg('path', { d: pipe, fill: 'none', stroke: COL.works, 'stroke-width': 9, 'stroke-linejoin': 'round' }),
    svg('path', { d: pipe, fill: 'none', stroke: tint(COL.salt, 0.9), 'stroke-width': 4, 'stroke-linejoin': 'round' }),
    svg('rect', { x: 298, y: bed, width: 20, height: 14, fill: tint(COL.salt, 0.8), stroke: COL.works, 'stroke-width': 2 }),
    arrow(140, pipeY, 100, pipeY, COL.paper, 2),
    line(0, sound, 150, sound, COL.salt, 1.5),
    line(220, lake, W, lake, COL.water, 1.5),
    small(10, sound - 8, 'Salmon Bay, the Sound', { bold: true, fill: COL.salt }),
    small(185, 24, 'the large lock', { anchor: 'middle', bold: true, fill: COL.works }),
    small(W - 12, lake - 8, 'ship canal, toward Lake Union', { anchor: 'end', bold: true, fill: COL.water }),
    ...wrapped(232, bed - 52, 'salt water let out with each opening slides along the bottom', 34, { fill: COL.salt }),
    small(324, bed + 12, 'drain', { bold: true, fill: COL.paper }),
    small(200, pipeY + 20, 'salt water returned below the locks', { anchor: 'middle', bold: true, fill: COL.paper }),
  );
  return { node: s.node };
};

export const figures = {
  'estuary-sill': sillFigure,
  'estuary-wedge': wedgeFigure,
  'estuary-locks': locksStill,
};
