// Lesson 5, The river that changed its mind: Einstein's teacup (the swirl and
// the slow loop across it), a bend cut across (a still), a meander migrating
// across its floodplain until a neck cutoff, braided against meandering by
// slope and sediment supply, and an avulsion (a still).

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, pick, player, slider, tint, wrapped, type FigureFactory } from './kit';

const W = 400;

/** A colour part way between two hex colours, `k` from 0 (a) to 1 (b). */
function mix(a: string, b: string, k: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, k)))).join(',')})`;
}

// ---- The teacup ---------------------------------------------------------------------------------

/** Seconds for the swirl to die away to about a third after the spoon comes out. */
export const SPIN_DOWN = 5;

/** The swirl's speed `t` seconds after stirring stops, as a share of how hard it was stirred. */
export const swirl = (stir: number, t: number) => stir * Math.exp(-t / SPIN_DOWN);

/**
 * How far a leaf has moved toward the middle `t` seconds after stirring stops,
 * as the share of its starting distance from the centre it still has. The slow
 * loop across the cup goes with the square of the swirl, so the inward drift
 * is k·stir²·e^(−2t/τ), which adds up to k·stir²·τ/2·(1 − e^(−2t/τ)).
 */
export function leafRadius(stir: number, t: number): number {
  const k = 0.76;
  return Math.exp(-k * stir * stir * (SPIN_DOWN / 2) * (1 - Math.exp((-2 * t) / SPIN_DOWN)));
}

export const teacupFigure = figure(['gather'], (ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let stir = 1;
  let time = 0;
  const rng = makeRng(7);
  const leaves = Array.from({ length: 16 }, () => ({ r: 0.55 + 0.4 * rng(), a: rng() * Math.PI * 2 }));
  const paint = () => {
    const w = swirl(stir, time);
    const shrink = leafRadius(stir, time);
    // How far the leaves have been carried round: the bottom water turns at a third of the swirl.
    const turned = stir * SPIN_DOWN * (1 - Math.exp(-time / SPIN_DOWN)) * 0.9;
    const cx = 100;
    const cy = 120;
    const R = 78;
    const top: SVGElement[] = [
      svg('circle', { cx, cy, r: R + 8, fill: '#fbf8ef', stroke: COL.soft, 'stroke-width': 2 }),
      svg('circle', { cx, cy, r: R, fill: tint(COL.sediment, 0.28), stroke: COL.soft, 'stroke-width': 1 }),
    ];
    // Swirl arrows round the cup, fading as the swirl dies.
    for (let k = 0; k < 3; k++) {
      const a0 = (k * 2 * Math.PI) / 3 + turned * 0.3;
      const rr = R * 0.78;
      const p = (a: number) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
      top.push(svg('path', { d: `M${p(a0)} A${rr},${rr} 0 0 1 ${p(a0 + 0.9)}`, fill: 'none', stroke: COL.flow, 'stroke-width': 2, opacity: Math.max(0.08, w), 'marker-end': '' }));
      const ae = a0 + 0.9;
      const ex = cx + rr * Math.cos(ae);
      const ey = cy + rr * Math.sin(ae);
      top.push(arrow(ex - 6 * Math.cos(ae + Math.PI / 2), ey - 6 * Math.sin(ae + Math.PI / 2), ex + 2 * Math.cos(ae + Math.PI / 2), ey + 2 * Math.sin(ae + Math.PI / 2), mix('#ffffff', COL.flow, Math.max(0.15, w)), 2));
    }
    for (const lf of leaves) {
      const r = lf.r * shrink * (R - 6);
      const a = lf.a + turned;
      top.push(svg('ellipse', { cx: cx + r * Math.cos(a), cy: cy + r * Math.sin(a), rx: 4, ry: 2.2, fill: '#3b2a1a', transform: `rotate(${(a * 180) / Math.PI + 90} ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)})` }));
    }
    top.push(small(cx, 24, 'From above', { anchor: 'middle', bold: true }));
    // The cup cut in half: the surface a dish, and the slow loop.
    const x0 = 220;
    const x1 = 384;
    const mid = (x0 + x1) / 2;
    const bottom = 196;
    const rim = 60;
    const dip = 22 * w * w;
    const level = 74;
    const surf = (x: number) => level + dip * (1 - ((x - mid) / ((x1 - x0) / 2)) ** 2) - dip * 0.5;
    const pts = Array.from({ length: 21 }, (_, i) => x0 + ((x1 - x0) * i) / 20);
    const loop = Math.min(1, w * w * 1.4);
    const side: SVGElement[] = [
      svg('path', { d: `M${x0},${surf(x0)} ${pts.map((x) => `L${x},${surf(x)}`).join(' ')} L${x1},${bottom} L${x0},${bottom} Z`, fill: tint(COL.sediment, 0.28) }),
      svg('path', { d: `M${x0 - 6},${rim} L${x0 - 6},${bottom + 6} L${x1 + 6},${bottom + 6} L${x1 + 6},${rim}`, fill: 'none', stroke: COL.soft, 'stroke-width': 3 }),
      svg('polyline', { points: pts.map((x) => `${x},${surf(x)}`).join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2 }),
    ];
    // Two loops, one each side of the middle: out at the top, down the wall, in along the bottom, up the middle.
    for (const s of [-1, 1]) {
      const xin = mid + s * 12;
      const xout = mid + s * 70;
      const op = Math.max(0.1, loop);
      const c = mix('#ffffff', COL.flow, op);
      side.push(
        arrow(xin, surf(xin) + 12, xout - s * 8, surf(xout) + 12, c, 2),
        arrow(xout, surf(xout) + 18, xout, bottom - 18, c, 2),
        arrow(xout - s * 8, bottom - 10, xin + s * 4, bottom - 10, c, 2),
        arrow(xin, bottom - 18, xin, surf(xin) + 22, c, 2),
      );
    }
    for (const lf of leaves) {
      const r = lf.r * shrink;
      const x = mid + Math.cos(lf.a + turned) * r * ((x1 - x0) / 2 - 6);
      side.push(svg('ellipse', { cx: x, cy: bottom - 2.5, rx: 3.5, ry: 2, fill: '#3b2a1a' }));
    }
    side.push(small(mid, 24, 'Cut in half', { anchor: 'middle', bold: true }), small(mid, 40, 'higher at the rim', { anchor: 'middle', soft: true }));
    redraw(g, ...top, ...side, small(W / 2, 222, `${time.toFixed(1)} s after the spoon comes out; swirl at ${Math.round(w * 100)}% of a hard stir`, { anchor: 'middle', soft: true }));
    const spread = shrink;
    f.readout.textContent = time < 0.5
      ? 'The swirl is at its fastest. The surface is a dish, higher at the rim, and the slow loop runs out at the top, down the wall, in along the bottom and up the middle.'
      : spread < 0.3
        ? 'The leaves have been swept into a heap in the middle. The water at the bottom, slowed by rubbing on the cup, was pushed inward by the higher water at the rim; the leaves were too heavy to follow it up the middle.'
        : w < 0.15
          ? `The swirl has nearly stopped, and the leaves have only moved ${Math.round((1 - spread) * 100)}% of the way in. A gentle stir drives a much weaker loop: it goes with the square of the swirl's speed.`
          : 'The swirl is dying away. Along the bottom, where friction slows it, the inward push of the dish wins and the bottom water creeps toward the middle, carrying the leaves.';
    if (spread < 0.3 && t.goal === 'gather') t.done();
  };
  const st = slider('How hard you stirred', 0.2, 1, 0.05, stir, (v) => (v < 0.45 ? 'gently' : v < 0.8 ? 'briskly' : 'hard'), (v) => { stir = v; paint(); }, 'flow');
  const ts = slider('Seconds since', 0, 20, 0.1, time, (v) => `${v.toFixed(1)} s`, (v) => { time = v; paint(); }, 'soft');
  const play = player(ts, ctx, { seconds: 8 });
  f.controls.append(st.node, play.node, ts.node);
  paint();
  return f.node;
});

// ---- A bend, from above and cut across (still) ----------------------------------------------------

export const sectionStill = () => {
  const s = still(W, 250);
  const parts: SVGElement[] = [];
  // From above: a bend turning right, with the outside bank on the left.
  parts.push(
    svg('rect', { x: 0, y: 0, width: 150, height: 120, fill: tint(COL.land, 0.18) }),
    svg('path', { d: 'M40,118 Q40,40 140,40 L140,78 Q78,78 78,118 Z', fill: tint(COL.sediment, 0.45) }),
    svg('path', { d: 'M14,118 Q14,14 140,14 L140,52 Q52,52 52,118 Z', fill: tint(COL.water, 0.55), stroke: COL.water, 'stroke-width': 1 }),
    arrow(34, 112, 34, 70, COL.flow, 2),
    arrow(60, 32, 120, 30, COL.flow, 2),
    line(26, 74, 64, 60, COL.ink, 1, { 'stroke-dasharray': '3 2' }),
    small(66, 58, 'cut', { soft: true }),
    small(6, 10, 'From above', { bold: true }),
    small(98, 70, 'point bar', { soft: true }),
    small(4, 132, 'outside bank', { soft: true }),
  );
  // Cut across, looking downstream: outside bank on the left.
  const X0 = 170;
  const ground = 60;
  const surface = 82;
  const bed = (x: number) => {
    // Deep pool at the outside (left), shallow point bar sloping up to the right.
    const u = (x - 196) / (390 - 196);
    return surface + 4 + 92 * Math.pow(1 - u, 1.6) * (u < 0 ? 0 : 1);
  };
  const xs = Array.from({ length: 41 }, (_, i) => 196 + (194 * i) / 40);
  const bedPts = xs.map((x) => `${x},${Math.min(bed(x), 190)}`).join(' ');
  parts.push(
    small(X0, 10, 'Cut across, looking downstream', { bold: true }),
    // Land: steep cut bank at left, the point bar rising gently at right.
    svg('path', { d: `M${X0},${ground} L196,${ground} L196,190 L${X0},190 Z`, fill: tint(COL.land, 0.45) }),
    svg('path', { d: `M196,190 L${bedPts.split(' ').join(' L')} L396,${surface - 6} L396,200 L196,200 Z`, fill: tint(COL.sediment, 0.5) }),
    svg('path', { d: `M196,${surface - 3} L396,${surface + 3} L${xs.slice().reverse().map((x) => `${x},${Math.min(bed(x), 190)}`).join(' L')} Z`, fill: tint(COL.water, 0.55) }),
    line(196, surface - 3, 380, surface + 2.5, COL.water, 2),
    // The loop: surface toward the outside, down the cut bank, back along the bed, up over the bar.
    arrow(330, surface + 10, 220, surface + 8, COL.flow, 2),
    arrow(208, surface + 16, 208, 160, COL.flow, 2),
    arrow(222, 176, 300, 128, COL.flow, 2),
    arrow(318, 118, 336, surface + 16, COL.flow, 2),
    small(176, 52, 'cut bank', { soft: true }),
    small(200, 204, 'deep pool', { soft: true }),
    small(320, 204, 'point bar', { soft: true }),
    small(392, surface - 10, 'surface higher at the outside', { anchor: 'end', soft: true }),
    ...wrapped(196, 234, 'Sand and gravel ride the bed flow to the inside.', 44, { soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The two pushes in a stirred cup (still) ------------------------------------------------------

export const pushesStill = () => {
  const s = still(W, 200);
  const parts: SVGElement[] = [];
  const x0 = 160;
  const x1 = 296;
  const bottom = 180;
  const surf = (x: number) => 40 + 18 * (1 - ((x - 228) / 68) ** 2);
  const xs = Array.from({ length: 21 }, (_, i) => x0 + (6.8 * i));
  parts.push(
    svg('path', { d: `M${x0},${surf(x0)} ${xs.map((x) => `L${x},${surf(x)}`).join(' ')} L${x1},${bottom} L${x0},${bottom} Z`, fill: tint(COL.water, 0.25) }),
    svg('polyline', { points: xs.map((x) => `${x},${surf(x)}`).join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2 }),
    svg('path', { d: `M${x0 - 5},28 L${x0 - 5},${bottom + 5} L${x1 + 5},${bottom + 5} L${x1 + 5},28`, fill: 'none', stroke: COL.soft, 'stroke-width': 3 }),
    small(x1 + 10, 44, 'higher at the rim', { soft: true }),
  );
  // At the top and at the bottom, near the right-hand wall: inward push (same) and outward swirl push (strong, then weak).
  const row = (y: number, out: number, name: string, net: string) => {
    const x = 250;
    parts.push(
      arrow(x, y - 6, x - 45, y - 6, COL.soft, 2.5),
      arrow(x, y + 6, x + out, y + 6, COL.flow, 2.5),
      small(14, y - 2, name, { bold: true }),
      small(14, y + 12, net, { soft: true }),
    );
  };
  row(78, 40, 'Near the top', 'out wins: water moves out');
  row(160, 12, 'At the bottom', 'in wins: water moves in');
  parts.push(
    small(x1 + 10, 72, 'grey: push toward', { fill: COL.soft }),
    small(x1 + 10, 84, 'the middle', { fill: COL.soft }),
    small(x1 + 10, 102, 'red: the swirl’s', { fill: COL.flow }),
    small(x1 + 10, 114, 'outward push', { fill: COL.flow }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- A meander migrating across its floodplain ----------------------------------------------------

/** What holds the banks, and how fast each lets the river move (bare banks = 1). */
export const BANKS = [
  { name: 'Forest roots', rate: 0.5 },
  { name: 'Bare banks', rate: 1 },
  { name: 'Riprap', rate: 0 },
] as const;

/** One state of the channel: its centreline, and the oxbow lakes it has left. */
export interface Channel {
  x: number[];
  y: number[];
  oxbows: { x: number[]; y: number[]; year: number }[];
}

/** How far a bank moves in a year for a given bend, in drawing units (bare banks). */
export const GAIN = { k: 3, reach: 3 };

/** Channel width in the model, in drawing units (drawn 5 wide, for about 50 metres). */
export const WIDTH = 3.5;
const DS = WIDTH * 0.5;
const TOP = 26;
const BOTTOM = 256;

/** The starting wiggle's height and length, in drawing units. */
export const START = { amp: 5, wave: 75 };

/** The starting channel: nearly straight, with gentle wiggles a few widths high. */
export function startChannel(): Channel {
  const rng = makeRng(31);
  const x: number[] = [];
  const y: number[] = [];
  for (let px = -300; px <= W + 40; px += DS) {
    x.push(px);
    y.push(141 + START.amp * (1 + 0.5 * Math.sin((2 * Math.PI * px) / 330)) * Math.sin((2 * Math.PI * px) / START.wave + 0.6) + (rng() - 0.5) * 0.6);
  }
  return { x, y, oxbows: [] };
}

/** Signed curvature at each node (1/units), positive turning left. */
export function curvature(x: number[], y: number[]): number[] {
  const n = x.length;
  const c = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const ax = x[i] - x[i - 1];
    const ay = y[i] - y[i - 1];
    const bx = x[i + 1] - x[i];
    const by = y[i + 1] - y[i];
    const turn = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    c[i] = turn / (0.5 * (Math.hypot(ax, ay) + Math.hypot(bx, by)));
  }
  return c;
}

/**
 * One year of migration, after Howard and Knutson (1984): each stretch of bank
 * moves outward at a rate set by the curvature just upstream of it (a weighted
 * sum, so erosion peaks downstream of each bend's apex), times the banks'
 * strength. Then the line is respaced, and any neck narrower than a channel
 * width is cut off, leaving an oxbow.
 */
export function stepChannel(ch: Channel, rate: number, year: number): Channel {
  let { x, y } = ch;
  const oxbows = ch.oxbows.slice();
  if (rate > 0) {
    const n = x.length;
    const c = curvature(x, y).map((v) => v * WIDTH);
    let sm = c;
    for (let pass = 0; pass < 3; pass++) sm = sm.map((v, i) => (i > 0 && i < n - 1 ? (sm[i - 1] + 2 * v + sm[i + 1]) / 4 : v));
    const decay = Math.exp(-DS / (GAIN.reach * WIDTH));
    const nx = x.slice();
    const ny = y.slice();
    for (let i = 2; i < n - 2; i++) {
      let sum = 0;
      let wsum = 0;
      let wgt = 1;
      for (let j = 0; j < 40 && i - j >= 0; j++) {
        sum += sm[i - j] * wgt;
        wsum += wgt;
        wgt *= decay;
      }
      const r1 = -1 * sm[i] + 2.5 * (sum / wsum);
      const tx = x[i + 1] - x[i - 1];
      const ty = y[i + 1] - y[i - 1];
      const len = Math.hypot(tx, ty) || 1;
      // Outward is to the right of the direction of travel when turning left.
      const m = Math.max(-0.8, Math.min(0.8, GAIN.k * rate * r1));
      nx[i] = x[i] + (ty / len) * m;
      ny[i] = Math.max(TOP - 60, Math.min(BOTTOM + 60, y[i] - (tx / len) * m));
    }
    // A light smoothing of the line, which stands for the banks' resistance to sharp kinks.
    x = nx.map((v, i) => (i > 0 && i < n - 1 ? v + 0.1 * rate * (nx[i - 1] - 2 * v + nx[i + 1]) : v));
    y = ny.map((v, i) => (i > 0 && i < n - 1 ? v + 0.1 * rate * (ny[i - 1] - 2 * v + ny[i + 1]) : v));
    // Respace: split long steps, drop short ones.
    const rx = [x[0]];
    const ry = [y[0]];
    for (let i = 1; i < x.length; i++) {
      const d = Math.hypot(x[i] - rx[rx.length - 1], y[i] - ry[ry.length - 1]);
      if (d < DS * 0.5 && i < x.length - 1) continue;
      if (d > DS * 1.5) {
        rx.push((x[i] + rx[rx.length - 1]) / 2);
        ry.push((y[i] + ry[ry.length - 1]) / 2);
      }
      rx.push(x[i]);
      ry.push(y[i]);
    }
    x = rx;
    y = ry;
    // Neck cutoffs: the first pair of points far apart along the channel but closer than a width and a quarter across.
    const near = WIDTH * 1.25;
    const gap = Math.ceil((6 * WIDTH) / DS);
    let cut = true;
    while (cut) {
      cut = false;
      const grid = new Map<string, number[]>();
      const key = (cx: number, cy: number) => `${cx},${cy}`;
      x.forEach((v, i) => {
        const k = key(Math.floor(v / near), Math.floor(y[i] / near));
        const b = grid.get(k);
        if (b) b.push(i);
        else grid.set(k, [i]);
      });
      search: for (let i = 0; i < x.length; i++) {
        const cx = Math.floor(x[i] / near);
        const cy = Math.floor(y[i] / near);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          for (const j of grid.get(key(cx + dx, cy + dy)) ?? []) {
            if (j < i + gap || Math.hypot(x[i] - x[j], y[i] - y[j]) >= near) continue;
            oxbows.push({ x: x.slice(i, j + 1), y: y.slice(i, j + 1), year });
            x = [...x.slice(0, i + 1), ...x.slice(j)];
            y = [...y.slice(0, i + 1), ...y.slice(j)];
            cut = true;
            break search;
          }
        }
      }
    }
  }
  return { x, y, oxbows };
}

/** Channel length over valley length, between the drawing's edges. */
export function sinuosity(ch: Channel): number {
  let len = 0;
  let first = -1;
  let last = -1;
  for (let i = 1; i < ch.x.length; i++) {
    if (ch.x[i - 1] < 0 || ch.x[i] > W) continue;
    if (first < 0) first = i - 1;
    last = i;
    len += Math.hypot(ch.x[i] - ch.x[i - 1], ch.y[i] - ch.y[i - 1]);
  }
  return first < 0 ? 1 : len / Math.max(1, ch.x[last] - ch.x[first]);
}

export const YEARS = 400;

/** The oxbows inside the drawing that have not yet filled in (younger than `age` years at `year`). */
export const visibleOxbows = (ch: Channel, year: number, age = 160) =>
  ch.oxbows.filter((o) => year - o.year < age && o.x.some((v, i) => v > 10 && v < W - 10 && o.y[i] > TOP && o.y[i] < BOTTOM));

/** The river after `years` years with banks of the given kind, every year kept. */
export function history(bank: number, years = YEARS): Channel[] {
  const out = [startChannel()];
  for (let yr = 1; yr <= years; yr++) out.push(stepChannel(out[yr - 1], BANKS[bank].rate, yr));
  return out;
}

export const migrateFigure = figure(['cutoff'], (ctx, t) => {
  const f = frame(W, 280, 3);
  const clip = `mclip${Math.floor(Math.random() * 1e9)}`;
  f.svg.append(svg('defs', {}, svg('clipPath', { id: clip }, svg('rect', { x: 0, y: TOP - 8, width: W, height: BOTTOM - TOP + 16 }))));
  const g = svg('g');
  f.svg.append(g);
  let bank = 1;
  let year = 0;
  // Each kind of bank's years, worked out only as far as the reader has gone.
  const cache: Channel[][] = [[startChannel()], [startChannel()], [startChannel()]];
  const at = (yr: number) => {
    const all = cache[bank];
    while (all.length <= yr) all.push(stepChannel(all[all.length - 1], BANKS[bank].rate, all.length));
    return all[yr];
  };
  const path = (x: number[], y: number[]) => x.map((v, i) => `${i ? 'L' : 'M'}${v.toFixed(1)},${y[i].toFixed(1)}`).join(' ');
  const paint = () => {
    const ch = at(year);
    const scrolls: SVGElement[] = [];
    for (let yr = Math.max(25, Math.floor((year - 100) / 25) * 25); yr < year; yr += 25) {
      const old = at(yr);
      scrolls.push(svg('path', { d: path(old.x, old.y), fill: 'none', stroke: COL.sediment, 'stroke-width': 1.2, opacity: 0.3 + 0.5 * (1 - (year - yr) / 100) }));
    }
    const lakes = visibleOxbows(ch, year);
    const sin = sinuosity(ch);
    redraw(g,
      svg('rect', { x: 0, y: TOP - 8, width: W, height: BOTTOM - TOP + 16, fill: tint(bank === 0 ? COL.leaf : COL.land, 0.22) }),
      svg('g', { 'clip-path': `url(#${clip})` },
        ...scrolls,
        ...lakes.map((o) => svg('path', { d: path(o.x, o.y), fill: 'none', stroke: mix(COL.water, COL.leaf, (year - o.year) / 160), 'stroke-width': 4.5, 'stroke-linecap': 'round', opacity: 1 - (year - o.year) / 200 })),
        svg('path', { d: path(ch.x, ch.y), fill: 'none', stroke: COL.water, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
        ...(bank === 2 ? [svg('path', { d: path(ch.x, ch.y), fill: 'none', stroke: COL.works, 'stroke-width': 10, opacity: 0.4 })] : []),
      ),
      line(0, TOP - 8, W, TOP - 8, COL.land, 2),
      line(0, BOTTOM + 8, W, BOTTOM + 8, COL.land, 2),
      arrow(8, 10, 44, 10, COL.flow, 2),
      small(50, 13, 'flow', { soft: true }),
      small(W - 8, 13, `year ${year}`, { anchor: 'end', bold: true }),
      small(W - 8, 276, `sinuosity ${sin.toFixed(2)}`, { anchor: 'end', soft: true }),
      line(8, 273, 8 + 40, 273, COL.ink, 2),
      small(54, 276, '400 m', { soft: true }),
    );
    if (!open()) return;
    const cut = lakes.length;
    f.readout.textContent = BANKS[bank].rate === 0
      ? 'With riprap on every bank, nothing moves however long you wait. The bends stay as they started, and the river spends its energy scouring its bed along the rock instead.'
      : cut > 0
        ? 'A neck cutoff: a loop grew until the river broke through the narrow neck of land at its base. The old loop is left as an oxbow lake (green as it fills with mud and plants), and the channel is shorter again.'
        : year === 0
          ? 'A nearly straight river with small wiggles. Play the years and watch which bank of each bend moves.'
          : `The outside of each bend is eaten away and the inside builds out as point bars (the pale lines are where the channel ran). The loops grow, lean and creep downstream${bank === 0 ? ', slowly, because roots hold the banks' : ''}.`;
    if (cut > 0 && t.goal === 'cutoff') t.done();
  };
  const ys = slider('Years', 0, YEARS, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'soft');
  const play = player(ys, ctx, { seconds: 14 });
  const bp = pick(BANKS.map((b) => b.name), bank, (i) => { bank = i; paint(); });
  f.controls.append(bp.node, play.node, ys.node);
  const open = guessFirst(t, f, {
    ask: 'As the loops grow, which way do they travel along the valley?',
    options: ['Downstream', 'Upstream', 'They stay put'],
    answer: 0,
    sliders: [ys],
    buttons: [...bp.buttons],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Braided or meandering ------------------------------------------------------------------------

/** The bankfull discharge the figure assumes, cubic metres a second. */
export const BRAID_Q = 300;

/** Leopold and Wolman's (1957) dividing slope for a bankfull discharge `q` (m³/s): steeper braids. */
export const braidSlope = (q: number) => 0.012 * Math.pow(q, -0.44);

/**
 * How far into braiding a river is: the log of its slope over the dividing
 * slope, plus a rough share for its sediment supply (1 is ordinary). Below
 * −0.2 it meanders, above 0.2 it braids, between it wanders.
 */
export function braidIndex(slope: number, supply: number, q = BRAID_Q): number {
  return Math.log10(slope / braidSlope(q)) + 0.7 * Math.log10(supply);
}

export const pattern = (i: number) => (i < -0.2 ? 'meandering' : i > 0.2 ? 'braided' : 'wandering');

const SLOPES = [0.0002, 0.0003, 0.0005, 0.0007, 0.001, 0.0015, 0.002, 0.003, 0.005, 0.007, 0.01, 0.015, 0.02];
const SUPPLIES = [0.25, 0.35, 0.5, 0.7, 1, 1.4, 2, 2.8, 4];

export const braidFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, 260, 3);
  const g = svg('g');
  f.svg.append(g);
  let slope = 0.001;
  let supply = 1;
  let sawBraid = false;
  let sawMeander = false;
  const paint = () => {
    const bi = braidIndex(slope, supply);
    const kind = pattern(bi);
    const parts: SVGElement[] = [];
    // Plan view strip.
    const top = 8;
    const h = 120;
    const cy = top + h / 2;
    parts.push(svg('rect', { x: 0, y: top, width: W, height: h, fill: tint(COL.leaf, 0.2) }));
    const k = Math.max(0, Math.min(1, (bi + 0.6) / 1.4));
    const bedW = 14 + 76 * k;
    parts.push(svg('rect', { x: 0, y: cy - bedW / 2, width: W, height: bedW, fill: tint(COL.sediment, kind === 'meandering' ? 0 : 0.5) }));
    const rng = makeRng(5);
    const thread = (phase: number, amp: number, wave: number, width: number, off: number) => {
      const pts: string[] = [];
      for (let x = 0; x <= W; x += 4) pts.push(`${x},${(cy + off + amp * Math.sin((2 * Math.PI * x) / wave + phase)).toFixed(1)}`);
      return svg('polyline', { points: pts.join(' '), fill: 'none', stroke: COL.water, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    };
    if (kind === 'meandering') {
      const amp = 22 + 22 * Math.min(1, (-0.2 - bi) / 0.8);
      parts.push(svg('rect', { x: 0, y: cy - amp - 6, width: W, height: 2 * amp + 12, fill: tint(COL.land, 0.12) }));
      parts.push(thread(0.4, amp, 120, 7, 0));
    } else {
      const n = kind === 'wandering' ? 2 : 3 + Math.round(3 * Math.min(1, (bi - 0.2) / 0.8));
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * (bedW / n) * 0.8;
        parts.push(thread(rng() * 6, bedW / (n + 1), 50 + 40 * rng(), kind === 'wandering' ? 5 : 3.2, off));
      }
    }
    parts.push(small(6, top + 12, kind === 'braided' ? 'Braided' : kind === 'wandering' ? 'Wandering: between the two' : 'Meandering', { bold: true }));
    // The chart: slope (up) against sediment supply (across), with the dividing line.
    const ax = { x: 70, y: 150, w: 300, h: 80 };
    const sx = (s: number) => ax.x + ((Math.log10(s) + Math.log10(4)) / Math.log10(16)) * ax.w;
    const sy = (s: number) => ax.y + ax.h - ((Math.log10(s) - Math.log10(0.0002)) / 2) * ax.h;
    const lineAt = (i: number) => {
      const pts: string[] = [];
      for (let k2 = 0; k2 <= 20; k2++) {
        const sup = 0.25 * Math.pow(16, k2 / 20);
        const s = braidSlope(BRAID_Q) * Math.pow(10, i - 0.7 * Math.log10(sup));
        pts.push(`${sx(sup).toFixed(1)},${Math.max(ax.y, Math.min(ax.y + ax.h, sy(s))).toFixed(1)}`);
      }
      return pts.join(' ');
    };
    parts.push(
      svg('rect', { x: ax.x, y: ax.y, width: ax.w, height: ax.h, fill: 'none', stroke: COL.ink, 'stroke-width': 1 }),
      svg('polyline', { points: lineAt(0.2), fill: 'none', stroke: COL.sediment, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }),
      svg('polyline', { points: lineAt(-0.2), fill: 'none', stroke: COL.water, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }),
      small(ax.x + 6, ax.y + 12, 'braided', { fill: COL.sediment, bold: true }),
      small(ax.x + ax.w - 6, ax.y + ax.h - 4, 'meandering', { anchor: 'end', fill: COL.water, bold: true }),
      small(ax.x - 4, ax.y + 8, 'steep', { anchor: 'end', soft: true }),
      small(ax.x - 4, ax.y + ax.h, 'gentle', { anchor: 'end', soft: true }),
      small(ax.x - 4, ax.y + ax.h / 2 + 4, 'slope', { anchor: 'end' }),
      small(ax.x, ax.y + ax.h + 14, 'little sediment', { soft: true }),
      small(ax.x + ax.w, ax.y + ax.h + 14, 'a lot', { anchor: 'end', soft: true }),
      small(ax.x + ax.w / 2, ax.y + ax.h + 14, 'sediment supply', { anchor: 'middle' }),
      svg('circle', { cx: sx(supply), cy: sy(slope), r: 5, fill: COL.flow, stroke: '#fff', 'stroke-width': 1.5 }),
    );
    redraw(g, ...parts);
    if (kind === 'braided') sawBraid = true;
    if (kind === 'meandering') sawMeander = true;
    const drop = slope * 1000;
    f.readout.textContent = kind === 'braided'
      ? `A drop of ${drop < 1 ? drop.toFixed(1) : Math.round(drop)} m in every kilometre, with ${supply >= 2 ? 'a heavy load of gravel' : 'its load'}: more than one channel can carry. Bars build in mid-channel and the river splits around them, like the White below Rainier.`
      : kind === 'wandering'
        ? 'Between the two: a main channel with a side channel or two around gravel islands, shifting in big floods. Many Puget Sound rivers are like this where they leave the mountains.'
        : `A drop of ${drop < 1 ? drop.toFixed(1) : Math.round(drop)} m in every kilometre and a load one channel can carry: a single channel that winds in loops, like the Snoqualmie below Fall City.`;
    if (sawBraid && sawMeander && t.goal === 'both') t.done();
  };
  const ss = slider('Slope', { steps: SLOPES, value: slope, show: (v) => `${v * 1000 < 1 ? (v * 1000).toFixed(1) : Math.round(v * 1000)} m per km`, onInput: (v) => { slope = v; paint(); }, color: 'land' });
  const sp = slider('Sand and gravel supplied', { steps: SUPPLIES, value: supply, show: (v) => (v < 0.6 ? 'little' : v < 1.6 ? 'ordinary' : v < 3 ? 'a lot' : 'a glacier’s worth'), onInput: (v) => { supply = v; paint(); }, color: 'sediment' });
  f.controls.append(ss.node, sp.node);
  paint();
  return f.node;
});

// ---- An avulsion (still) --------------------------------------------------------------------------

export const avulsionStill = () => {
  const s = still(W, 240);
  const parts: SVGElement[] = [];
  const strip = (y0: number, title: string, note: string, stage: number) => {
    // Valley floor sloping down to the right; the river on a low ridge at left-centre.
    const ground = (x: number) => y0 + 50 + (x / W) * 14 - (stage < 2 ? 12 * Math.exp(-(((x - 130) / 34) ** 2)) : 12 * Math.exp(-(((x - 130) / 34) ** 2)));
    const pts = Array.from({ length: 41 }, (_, i) => (W * i) / 40);
    parts.push(svg('path', { d: `M0,${y0 + 76} ${pts.map((x) => `L${x},${ground(x).toFixed(1)}`).join(' ')} L${W},${y0 + 76} Z`, fill: tint(COL.land, 0.45) }));
    // The old channel cut into the ridge.
    const rc = 130;
    const chTop = ground(rc);
    parts.push(svg('path', { d: `M${rc - 16},${chTop} Q${rc},${chTop + 14} ${rc + 16},${chTop} Z`, fill: stage < 2 ? tint(COL.water, 0.8) : tint(COL.water, 0.25) }));
    if (stage === 1) {
      parts.push(
        line(rc - 8, chTop - 2, rc + 8, chTop + 4, '#5e4130', 4),
        line(rc - 6, chTop + 5, rc + 10, chTop - 1, '#5e4130', 4),
        svg('path', { d: `M${rc + 16},${chTop} Q${rc + 60},${chTop - 2} ${rc + 120},${ground(rc + 140) - 2}`, fill: 'none', stroke: COL.water, 'stroke-width': 5, opacity: 0.8 }),
        arrow(rc + 70, chTop - 8, rc + 130, ground(rc + 130) - 10, COL.flow, 2),
        small(rc - 30, chTop - 14, 'jam', { anchor: 'end', bold: true }),
      );
    }
    if (stage === 2) {
      const nx = 300;
      parts.push(svg('path', { d: `M${nx - 16},${ground(nx)} Q${nx},${ground(nx) + 14} ${nx + 16},${ground(nx)} Z`, fill: tint(COL.water, 0.8) }));
      parts.push(small(nx, ground(nx) - 8, 'new channel', { anchor: 'middle', bold: true }), small(rc, chTop - 8, 'old channel, abandoned', { anchor: 'middle', soft: true }));
    }
    if (stage === 0) parts.push(small(rc, chTop - 18, 'river on its own ridge', { anchor: 'middle', soft: true }), small(320, ground(320) - 8, 'lower ground', { anchor: 'middle', soft: true }));
    parts.push(label(6, y0 + 12, title, { bold: true }), small(W - 6, y0 + 12, note, { anchor: 'end', soft: true }));
  };
  strip(0, '1. Building up', 'gravel on its bed, sand on its banks', 0);
  strip(80, '2. A flood and a jam', 'water spills over the side', 1);
  strip(160, '3. Avulsion', 'the river takes the low ground', 2);
  s.svg.append(...parts);
  return { node: s.node };
};

export const figures: Record<string, FigureFactory> = {
  'meanders-teacup': teacupFigure,
  'meanders-pushes': pushesStill,
  'meanders-section': sectionStill,
  'meanders-migrate': migrateFigure,
  'meanders-braid': braidFigure,
  'meanders-avulsion': avulsionStill,
};

