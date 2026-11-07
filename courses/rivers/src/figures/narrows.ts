// Lesson 11, Why Deception Pass runs at eight knots: two basins joined by a
// narrows. The tide rises and falls on the outer side; the inner basin can
// only fill through the gap, so its level lags, and the current in the gap
// follows the difference between the two levels.

import { svg } from 'didactics/dom';
import { arrow, line, redraw, small } from 'didactics/draw';
import { length } from 'didactics/units';
import { axes, COL, figure, frame, guessFirst, legend, player, slider, tint } from './kit';

const G = 9.81;
/** One knot, in metres a second. */
export const KNOT = 0.5144;
/** The semidiurnal tide's period, in hours (the Moon's M2). */
export const PERIOD = 12.42;

/** The model's pass and basin, set so a big tide gives Deception Pass's eight knots. */
export const PASS = {
  /** Depth of the gap, m. */
  depth: 25,
  /** Area of the inner basin, m² (about 100 km², the size of Skagit Bay). */
  basin: 100e6,
  /** Losses at the entrance, the exit and on the bed, as a multiple of v²/2g. */
  loss: 1.3,
};

/** Speed of water pushed through a gap by a level difference `dh` (m), in m/s: v²/2g ≈ dh, less what friction takes. Positive runs from the high side. */
export function headSpeed(dh: number, loss = PASS.loss): number {
  return Math.sign(dh) * Math.sqrt((2 * G * Math.abs(dh)) / loss);
}

export interface NarrowsRun {
  /** Hours from outer low water, one tide. */
  hours: number[];
  outer: number[];
  inner: number[];
  /** Current in the gap, m/s; positive is the flood, into the inner basin. */
  speed: number[];
  /** Outer high water, h (half a period). */
  high: number;
  /** The slack after outer high water, h. */
  slack: number;
  /** The slack after outer low water, h. */
  slackLow: number;
  /** Fastest flood, m/s. */
  peak: number;
  /** Range in the inner basin, m. */
  innerRange: number;
  /** Largest difference in level across the gap, m. */
  head: number;
  /** Water that runs through on one flood, m³. */
  volume: number;
}

/**
 * One tide through a narrows: the outer level is a plain sine of `range` (m),
 * the inner basin fills only through a gap `width` m wide, and the current is
 * the head speed of the level difference. Run for a few tides first so the
 * one returned has settled.
 */
export function narrowsTide(range: number, width: number, steps = 600): NarrowsRun {
  const a = range / 2;
  const T = PERIOD * 3600;
  const w = (2 * Math.PI) / T;
  const outerAt = (t: number) => -a * Math.cos(w * t);
  const area = width * PASS.depth;
  const rate = (t: number, h: number) => (headSpeed(outerAt(t) - h) * area) / PASS.basin;
  const sub = 8;
  const dt = T / steps / sub;
  let h = -a;
  const hours: number[] = [];
  const outer: number[] = [];
  const inner: number[] = [];
  const speed: number[] = [];
  for (let cycle = 0; cycle < 5; cycle++) {
    for (let i = 0; i < steps; i++) {
      for (let k = 0; k < sub; k++) {
        const t = (i * sub + k) * dt;
        const k1 = rate(t, h);
        const k2 = rate(t + dt / 2, h + (k1 * dt) / 2);
        const k3 = rate(t + dt / 2, h + (k2 * dt) / 2);
        const k4 = rate(t + dt, h + k3 * dt);
        if (cycle === 4 && k === 0) {
          hours.push((i * sub * dt) / 3600);
          outer.push(outerAt(t));
          inner.push(h);
          speed.push(headSpeed(outerAt(t) - h));
        }
        h += (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      }
    }
  }
  const half = PERIOD / 2;
  const after = (from: number, ebbing: boolean) => {
    for (let i = 1; i < hours.length; i++) {
      if (hours[i] < from) continue;
      if (ebbing ? speed[i] <= 0 : speed[i] >= 0) {
        const f = speed[i - 1] / (speed[i - 1] - speed[i]);
        return hours[i - 1] + f * (hours[i] - hours[i - 1]);
      }
    }
    return from;
  };
  const sliceDt = T / steps;
  return {
    hours, outer, inner, speed,
    high: half,
    slack: after(half, true),
    slackLow: after(0, false),
    peak: Math.max(...speed),
    innerRange: Math.max(...inner) - Math.min(...inner),
    head: Math.max(...outer.map((o, i) => o - inner[i])),
    volume: speed.reduce((s, v) => s + (v > 0 ? v * area * sliceDt : 0), 0),
  };
}

/** Hours as "1 h 05 min". */
export const hm = (h: number) => {
  const m = Math.round(Math.abs(h) * 60);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};

const W = 400;
const H = 345;

export const narrowsFigure = figure(['slack'], (ctx, t) => {
  const units = ctx.save.units;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let range = 2.5;
  let width = 160;
  let now = 0;
  let run = narrowsTide(range, width);
  let passedSlack = false;

  // Plan view: two basins and the gap, the gap drawn to scale with the slider.
  const plan = (v: number) => {
    const gap = Math.max(3, width / 12);
    const cy = 40;
    const parts: SVGElement[] = [
      svg('rect', { x: 0, y: 8, width: W, height: 64, fill: tint(COL.salt, 0.18) }),
      svg('path', { d: `M150,8 L250,8 L250,${cy - gap / 2} L150,${cy - gap / 2} Z`, fill: COL.land }),
      svg('path', { d: `M150,72 L250,72 L250,${cy + gap / 2} L150,${cy + gap / 2} Z`, fill: COL.land }),
      small(12, 22, 'Strait side', { bold: true }),
      small(W - 12, 22, 'Skagit Bay side', { bold: true, anchor: 'end' }),
      small(200, 84, `the pass, ${length(width, units)} wide`, { anchor: 'middle', soft: true }),
    ];
    const len = Math.min(90, Math.abs(v) / KNOT * 9);
    if (len > 4) {
      const x0 = 200 - (len / 2) * Math.sign(v);
      parts.push(arrow(x0, cy, x0 + len * Math.sign(v), cy, COL.flow, 3));
    }
    parts.push(small(200, cy - gap / 2 - 5, Math.abs(v) < 0.05 ? 'slack' : `${(Math.abs(v) / KNOT).toFixed(1)} knots`, { anchor: 'middle', bold: true, fill: COL.flow, halo: COL.paper }));
    return parts;
  };

  // Side view: the two water levels, exaggerated, with the slope through the pass.
  const side = (o: number, i: number) => {
    const y0 = 128;
    const k = 13;
    const yo = y0 - o * k;
    const yi = y0 - i * k;
    return [
      line(0, y0, W, y0, COL.grid, 1, { 'stroke-dasharray': '3 3' }),
      small(200, y0 + 22, 'mean level', { soft: true, anchor: 'middle' }),
      svg('path', { d: `M0,${yo} L160,${yo} C200,${yo} 200,${yi} 240,${yi} L${W},${yi} L${W},160 L0,160 Z`, fill: tint(COL.salt, 0.35) }),
      svg('path', { d: `M0,${yo} L160,${yo} C200,${yo} 200,${yi} 240,${yi} L${W},${yi}`, fill: 'none', stroke: COL.salt, 'stroke-width': 2 }),
      svg('rect', { x: 0, y: 160, width: W, height: 8, fill: COL.rock }),
      small(70, yo - 5, length(o, units), { anchor: 'middle', bold: true, fill: COL.salt }),
      small(330, yi - 5, length(i, units), { anchor: 'middle', bold: true, fill: COL.salt }),
    ];
  };

  const paint = () => {
    const i = Math.min(run.hours.length - 1, Math.round((now / PERIOD) * run.hours.length));
    const o = run.outer[i];
    const n = run.inner[i];
    const v = run.speed[i];
    const ax = axes({
      x: 34, y: 190, w: 316, h: 100, xmin: 0, xmax: PERIOD, ymin: -2, ymax: 2,
      xticks: [0, 2, 4, 6, 8, 10, 12],
      yticks: units === 'metric' ? [-2, -1, 0, 1, 2] : [-6, -3, 0, 3, 6].map((ft) => ft / 3.2808),
      yfmt: (y) => (units === 'metric' ? `${y}` : `${Math.round(y * 3.2808)}`),
      xlabel: 'hours from low water', ylabel: units === 'metric' ? 'level, m' : 'level, ft', ink: COL.ink, grid: COL.grid,
    });
    // The current on the same box: ±10 knots spans the height.
    const cur = (s: number) => (s / KNOT / 10) * 2;
    const upto = (arr: number[], map = (x: number) => x) => arr.slice(0, i + 1).map((y, j) => [run.hours[j], map(y)] as [number, number]);
    const mark = (h: number, text: string, color: string, below = false) => (now >= h ? [
      line(ax.X(h), 190, ax.X(h), 290, color, 1.2, { 'stroke-dasharray': '4 3' }),
      small(ax.X(h) + (below ? 3 : -3), below ? 286 : 200, text, { anchor: below ? undefined : 'end', bold: true, fill: color, halo: COL.paper }),
    ] : []);
    redraw(g,
      ...plan(v),
      ...side(o, n),
      ...ax.parts,
      small(W - 12, 180, 'knots', { anchor: 'end', fill: COL.flow }),
      ...[-10, -5, 5, 10].map((kn) => small(W - 12, ax.Y(cur(kn * KNOT)) + 3, `${kn > 0 ? '+' : ''}${kn}`, { anchor: 'end', fill: COL.flow })),
      ...mark(run.high, 'high water', COL.salt),
      ...mark(run.slack, 'slack', COL.flow, true),
      ax.path(upto(run.outer), COL.salt, 2.2),
      ax.path(upto(run.inner), COL.salt, 2.2, { 'stroke-dasharray': '5 3' }),
      ax.path(upto(run.speed, cur), COL.flow, 2),
      line(ax.X(now), 190, ax.X(now), 290, COL.ink, 1),
      ...legend(34, 338, [
        { text: 'Strait side', color: COL.salt },
        { text: 'Skagit Bay side', color: COL.salt, dash: true },
        { text: 'current (+ flood)', color: COL.flow },
      ]),
    );
    if (!open()) return;
    if (now >= run.slack) passedSlack = true;
    const dir = Math.abs(v) < 0.05 ? 'slack water' : v > 0 ? `flooding toward Skagit Bay at ${(v / KNOT).toFixed(1)} knots` : `ebbing toward the Strait at ${(-v / KNOT).toFixed(1)} knots`;
    const lead = `${hm(now)}: the Strait side is ${length(Math.abs(o - n), units)} ${o >= n ? 'above' : 'below'} Skagit Bay, so the pass is ${dir}.`;
    const tail = now >= run.slack
      ? ` Slack came ${hm(run.slack - run.high)} after high water. Fastest flood ${(run.peak / KNOT).toFixed(1)} knots; ${sigKm3(run.volume)} km³ went through.`
      : now >= run.high
        ? ' High water has passed, yet the flood still runs: Skagit Bay is still lower.'
        : '';
    f.readout.textContent = lead + tail;
    if (passedSlack && t.goal === 'slack') t.done();
  };

  const recompute = () => {
    run = narrowsTide(range, width);
    paint();
  };
  const ts = slider('Time', 0, PERIOD, 0.05, now, (v) => hm(v), (v) => { now = v; paint(); }, 'ink');
  const play = player(ts, ctx, { seconds: 12 });
  const rs = slider('Tide range outside', 1, 3.6, 0.1, range, (v) => `${v.toFixed(1)} m (${Math.round(v * 3.28)} ft)`, (v) => { range = v; recompute(); }, 'salt');
  const ws = slider('Width of the pass', 40, 600, 10, width, (v) => length(v, units), (v) => { width = v; recompute(); }, 'land');
  f.controls.append(play.node, ts.node, rs.node, ws.node);
  const open = guessFirst(t, f, {
    ask: 'At the moment of high water on the Strait side, what is the current in the pass doing?',
    options: ['It has stopped: slack water', 'Still running in, toward Skagit Bay', 'Already running out, toward the Strait'],
    answer: 1,
    sliders: [ts, rs, ws],
    after: () => paint(),
  });
  paint();
  return f.node;
});

const sigKm3 = (m3: number) => (m3 / 1e9).toFixed(2);

export const figures = {
  'narrows-basins': narrowsFigure,
};
