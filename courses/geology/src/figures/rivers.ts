// Lesson 12, A river that cuts through a mountain: a ridge rising across a
// river's path, and whether the river can cut down as fast as the ridge
// rises; and a fall in base level, working its way upstream as a knickpoint.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, player, slider } from './kit';

const W = 400;

// ---- Uplift against incision ----------------------------------------------------------

/** How deep the lake behind a rising ridge can get before it spills around the ridge's end, metres. */
const SPILL = 250;

export interface Race {
  /** Height of the ridge's rock, metres. */
  ridge: number;
  /** Height of the river's bed where it crosses the ridge, metres above the valley upstream. */
  bed: number;
  /** The river gave up its gap and went round, this many years ago (or null). */
  diverted: number | null;
}

/** After `years` with the ridge rising `uplift` mm a year and the river able to cut `cut` mm a year. */
export function race(uplift: number, cut: number, years: number): Race {
  const ridge = (uplift / 1000) * years;
  const climb = Math.max(0, uplift - cut) / 1000; // m a year the river's bed rises in the gap
  const tSpill = climb > 0 ? SPILL / climb : Infinity;
  if (years < tSpill) return { ridge, bed: climb * years, diverted: null };
  // Abandoned: the gap rises with the ridge from then on, a dry notch.
  return { ridge, bed: SPILL + (uplift / 1000) * (years - tSpill), diverted: years - tSpill };
}

export const raceFigure = figure(['gorge'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let uplift = 0.6;
  let cut = 0.3;
  let myr = 0;
  const BASE = 180;
  const ZY = (m: number) => BASE - (m / 3000) * 150;
  const shape = (x: number) => Math.exp(-(((x - 230) / 70) ** 4));
  const paint = () => {
    const r = race(uplift, cut, myr * 1e6);
    const ridge: string[] = [];
    for (let x = 0; x <= W; x += 5) ridge.push(`${x},${ZY(r.ridge * shape(x)).toFixed(1)}`);
    const gapL = 190;
    const gapR = 270;
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: 220, fill: '#eef2f0' }),
      svg('polygon', { points: `0,${BASE + 30} ${ridge.join(' ')} ${W},${BASE + 30}`, fill: '#b79c7e' }),
      small(230, Math.max(14, ZY(r.ridge) - 6), r.ridge > 50 ? 'the rising ridge' : '', { anchor: 'middle', bold: true, fill: '#6b5440' }),
    ];
    // The river's bed: flat up to the ridge, then over the gap.
    const bedY = ZY(r.bed);
    if (r.diverted === null) {
      parts.push(
        svg('polygon', { points: `0,${BASE} ${gapL - 20},${BASE} ${gapL},${bedY} ${gapR},${bedY} ${gapR + 20},${BASE} ${W},${BASE} ${W},${BASE + 30} 0,${BASE + 30}`, fill: '#8f7a64' }),
        r.bed > 1 ? svg('rect', { x: 0, y: bedY, width: gapL, height: BASE - bedY, fill: COL.water, opacity: 0.55 }) : null,
        line(0, Math.min(BASE, bedY) - 1, W, Math.min(BASE, bedY) - 1, COL.water, 3, { opacity: 0.9 }),
        arrow(20, BASE - 10, 70, BASE - 10, COL.water, 1.6),
      );
      if (r.ridge - r.bed > 100) {
        const top = ZY(r.ridge);
        parts.push(line(300, top, 300, bedY, COL.ink, 1), small(294, (top + bedY) / 2 + 3, `canyon ${Math.round(r.ridge - r.bed)} m deep`, { bold: true, anchor: 'end', halo: '#b79c7e' }));
      }
    } else {
      parts.push(
        svg('polygon', { points: `${gapL - 20},${BASE + 30} ${gapL - 20},${BASE} ${gapL},${bedY} ${gapR},${bedY} ${gapR + 20},${BASE} ${gapR + 20},${BASE + 30}`, fill: '#a58c71' }),
        line(0, BASE - 1, gapL - 20, BASE - 1, COL.water, 3), line(gapR + 20, BASE - 1, W, BASE - 1, COL.water, 3, { opacity: 0.4 }),
        small(230, bedY - 6, 'wind gap: a dry notch', { anchor: 'middle', bold: true, fill: '#5a4636', halo: '#eef2f0' }),
        small(10, BASE - 10, 'the river now goes round the end of the ridge', { fill: COL.water, bold: true }),
      );
    }
    parts.push(svg('rect', { x: 0, y: BASE + 30, width: W, height: 10, fill: '#eef2f0' }));
    parts.push(label(W - 6, 16, `${myr.toFixed(2)} million years`, { size: 'note', anchor: 'end', bold: true, soft: true }));
    redraw(g, ...parts);
    const canyon = r.ridge - r.bed;
    f.readout.textContent = myr === 0
      ? 'A river crosses flat ground. A fold in the crust starts to push a ridge up across its path. Move time forward.'
      : r.diverted !== null
        ? `The ridge rose ${uplift.toFixed(1)} mm a year; the river could cut only ${cut.toFixed(1)}. Its bed in the gap rose, a lake ponded behind it and spilled round the ridge’s end ${(r.diverted / 1e6).toFixed(2)} million years ago.`
        : uplift <= cut
          ? `The river cuts as fast as the ridge rises, so its bed stays at the level of the valley while the ridge grows up around it: a canyon ${Math.round(canyon)} m deep, through a mountain the river is older than.`
          : `The ridge is winning: the river’s bed in the gap is ${Math.round(r.bed)} m above the valley upstream, and a lake is filling behind it. At ${SPILL} m it spills round the ridge’s end.`;
    if (r.diverted === null && canyon >= 700 && t.goal === 'gorge') t.done();
  };
  const us = slider('Ridge rises', 0.1, 1.5, 0.05, uplift, (v) => `${v.toFixed(2)} mm a year`, (v) => { uplift = v; paint(); }, 'pressure');
  const cs = slider('River can cut down', 0.1, 1.5, 0.05, cut, (v) => `${v.toFixed(2)} mm a year`, (v) => { cut = v; paint(); }, 'water');
  const ts = slider('Time', 0, 2, 0.01, 0, (v) => `${v.toFixed(2)} million years`, (v) => { myr = v; paint(); }, 'old');
  f.controls.append(us.node, cs.node, player(ts, ctx).node, ts.node);
  paint();
  return f.node;
});

// ---- Base level and a knickpoint --------------------------------------------------------

const L = 60; // km of river, mouth to source
const HEAD = 600; // m, height of the source above the old base level
/** The river's old graded profile: concave, steep near the source. */
const graded = (x: number) => HEAD * (x / L) ** 1.8;
/** How fast the knickpoint climbs, km per thousand years, at distance x from the mouth: slower as the river shrinks upstream. */
const climbRate = (x: number) => 0.9 * Math.max(0.03, 1 - x / L) ** 0.85;

/** Where the knickpoint is after `kyr` thousand years, km from the mouth. */
export function knickAt(kyr: number): number {
  let x = 0;
  const dt = 0.1;
  for (let s = 0; s < kyr; s += dt) x = Math.min(L, x + climbRate(x) * dt);
  return x;
}

export const knickFigure = figure(['knick'], (ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let drop = 0;
  let kyr = 0;
  const X = (km: number) => 380 - (km / L) * 350; // mouth at the right
  const Y = (m: number) => 170 - ((m + 120) / (HEAD + 120)) * 150;
  const paint = () => {
    const xk = drop > 0 ? knickAt(kyr) : 0;
    const old: P[] = [];
    const now: P[] = [];
    for (let x = 0; x <= L; x += 0.5) {
      old.push([X(x), Y(graded(x))]);
      now.push([X(x), Y(graded(x) - (x < xk ? drop : 0))]);
    }
    const ground = `${now.map((p) => p.join(',')).join(' ')} ${X(L)},${Y(-120)} ${X(0)},${Y(-120)}`;
    redraw(g,
      svg('rect', { width: W, height: 200, fill: '#eef2f0' }),
      svg('polygon', { points: ground, fill: '#b9a183' }),
      svg('polyline', { points: old.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.soft, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
      svg('polyline', { points: now.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2.5 }),
      svg('rect', { x: X(0), y: Y(-drop), width: 20, height: Y(-120) - Y(-drop), fill: COL.water, opacity: 0.45 }),
      small(X(0) + 10, Y(-drop) - 5, 'base level', { anchor: 'end', fill: COL.water, bold: true }),
      drop > 0 && xk > 0.5 && xk < L ? small(X(xk), Y(graded(xk)) - 8, 'knickpoint: a waterfall or rapids', { anchor: 'middle', bold: true, fill: COL.heat, halo: '#eef2f0' }) : null,
      drop > 0 && xk > 0.5 && xk < L ? svg('circle', { cx: X(xk), cy: Y(graded(xk) - drop / 2), r: 4, fill: COL.heat }) : null,
      small(X(L), 190, 'source', { soft: true }), small(X(0), 190, 'mouth', { anchor: 'end', soft: true }),
      small(X(L / 2), 190, `${L} km`, { anchor: 'middle', soft: true }),
    );
    f.readout.textContent = drop === 0
      ? 'A river graded to its base level: the level of the lake or sea it flows into, below which it cannot cut. Lower the base level.'
      : kyr === 0
        ? `Base level has dropped ${drop} m. Only the very mouth feels it yet. Move time forward.`
        : xk >= L
          ? `After ${kyr} thousand years the step has climbed all the way to the source: the whole river now runs ${drop} m lower.`
          : `After ${kyr} thousand years the step has climbed ${xk.toFixed(1)} km upstream. Below it the river has cut down ${drop} m; above it, the river does not yet know base level fell. It climbs more slowly as the river gets smaller.`;
    if (drop > 0 && xk >= L * 0.4 && t.goal === 'knick') t.done();
  };
  const ds = slider('Fall in base level', 0, 120, 5, 0, (v) => `${v} m`, (v) => { drop = v; paint(); }, 'water');
  const ts = slider('Time since', 0, 150, 1, 0, (v) => `${v} thousand years`, (v) => { kyr = v; paint(); }, 'old');
  f.controls.append(ds.node, player(ts, ctx).node, ts.node);
  paint();
  return f.node;
});
