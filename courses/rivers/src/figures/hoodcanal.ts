// Lesson 13, Why Hood Canal runs out of breath: a basin's residence time and
// the oxygen its deep water keeps, and a year along the canal in which dense
// ocean water lifts the old water and a south wind brings it up.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, axes, figure, frame, guessFirst, player, slider, tint, toggles, type FigureFactory } from './kit';

const W = 400;

// ---- Residence time and oxygen ------------------------------------------------------------------

/** Hood Canal's volume in cubic kilometres, as the lesson's estimate gives it. */
export const VOLUME_KM3 = 20;

/** The oxygen new water brings over the sill, in mg/L (upwelled water is not full). */
export const O_IN = 7;

/** The level below which water is called hypoxic, mg/L. */
export const HYPOXIC = 2;

/** Days a basin of `km3` cubic kilometres keeps its water when `q` cubic metres a second are exchanged. */
export function residenceDays(km3: number, q: number): number {
  return (km3 * 1e9) / q / 86400;
}

/** Oxygen left in water that came in with `oIn` mg/L and loses `use` mg/L a day, after `days`. */
export function oxygenLeft(oIn: number, use: number, days: number): number {
  return Math.max(0, oIn - use * days);
}

const flushFigure = figure(['hypoxic'], (_ctx, t) => {
  const f = frame(W, 210, 3);
  const g = svg('g');
  f.svg.append(g);
  let q = 6000;
  let use = 0.03;
  const ax = axes({ x: 44, y: 26, w: 336, h: 140, xmin: 0, xmax: 365, ymin: 0, ymax: 10, xticks: [0, 60, 120, 180, 240, 300, 365], yticks: [0, 2, 4, 6, 8, 10], xlabel: 'days since the water crossed the sill', ylabel: 'oxygen, mg/L', ink: COL.ink, grid: COL.grid });
  const paint = () => {
    const tau = residenceDays(VOLUME_KM3, q);
    const left = oxygenLeft(O_IN, use, tau);
    const pts: [number, number][] = [];
    for (let d = 0; d <= 365; d += 5) pts.push([d, oxygenLeft(O_IN, use, d)]);
    const tx = Math.min(365, tau);
    const shown = tau <= 365;
    redraw(g,
      svg('rect', { x: ax.X(0), y: ax.Y(HYPOXIC), width: ax.o.w, height: ax.Y(0) - ax.Y(HYPOXIC), fill: tint(COL.bad, 0.12) }),
      small(ax.X(365) - 4, ax.Y(0) - 5, 'hypoxic', { anchor: 'end', fill: COL.bad, bold: true }),
      ...ax.parts,
      ax.path(pts, COL.oxygen, 2.5),
      line(ax.X(tx), ax.Y(0), ax.X(tx), ax.Y(10), COL.flow, 1.2, { 'stroke-dasharray': '4 3' }),
      svg('circle', { cx: ax.X(tx), cy: ax.Y(shown ? left : oxygenLeft(O_IN, use, 365)), r: 5, fill: left < HYPOXIC ? COL.bad : COL.oxygen, stroke: COL.paper, 'stroke-width': 1.5 }),
      small(Math.min(ax.X(tx) + 5, 372), ax.Y(10) + 10, shown ? `replaced after ${Math.round(tau)} days` : 'replaced after more than a year', { anchor: ax.X(tx) > 260 ? 'end' : undefined, fill: COL.flow, bold: true }),
    );
    const months = tau / 30.4;
    const say = tau < 45 ? `${Math.round(tau)} days` : tau < 365 ? `about ${months.toFixed(1)} months` : `about ${(tau / 365).toFixed(1)} years`;
    f.readout.textContent = left < HYPOXIC
      ? `Residence time ${say}. The deep water is down to ${left.toFixed(1)} mg/L before it is replaced: hypoxic. Fish leave or die.`
      : left < 4.5
        ? `Residence time ${say}. The deep water keeps ${left.toFixed(1)} mg/L: low enough to stress fish.`
        : `Residence time ${say}. The deep water is replaced while it still has ${left.toFixed(1)} mg/L of oxygen.`;
    if (left < HYPOXIC) t.done();
  };
  const ex = slider('Exchange', { min: 300, max: 20000, scale: 'log', step: 10, value: q, color: 'salt', show: (v) => `${Math.round(v).toLocaleString('en-US')} m³/s`, onInput: (v) => { q = v; paint(); } });
  const dec = slider('Decay', 0.01, 0.05, 0.005, use, (v) => `${v.toFixed(3)} mg/L a day`, (v) => { use = v; paint(); }, 'leaf');
  f.controls.append(ex.node, dec.node);
  paint();
  return f.node;
});

// ---- A year along the canal -------------------------------------------------------------------

/** The floor along the canal, x from 0 at the mouth to 1 at Lynch Cove: [x, depth in metres]. A simplified profile. */
const BED: readonly [number, number][] = [[0, 80], [0.06, 50], [0.15, 120], [0.3, 175], [0.5, 180], [0.68, 150], [0.8, 120], [0.9, 60], [1, 20]];

/** Where along the section the places sit. */
export const PLACES = { sill: 0.06, hoodsport: 0.72, greatBend: 0.88, lynch: 1 } as const;

/** Depth of the floor at x (0 the mouth, 1 Lynch Cove), metres. */
export function bedDepth(x: number): number {
  for (let i = 1; i < BED.length; i++) {
    const [x0, d0] = BED[i - 1];
    const [x1, d1] = BED[i];
    if (x <= x1) return d0 + ((x - x0) / (x1 - x0)) * (d1 - d0);
  }
  return BED[BED.length - 1][1];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const k = clamp01((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};

/** Thickness of the fresh surface layer in week `w`, metres: thin in winter, thicker in summer. */
export const lidDepth = (w: number) => 5 + 6 * smooth(12, 22, w) * (1 - smooth(42, 50, w));

/** The south wind's strength in week `w` (0 to 1): an event in mid-September. */
export const windAt = (w: number) => smooth(35.5, 36.2, w) * (1 - smooth(37.8, 38.5, w));

/** How far the new dense water has lifted the old at x in week `w`, metres. */
export function liftAt(x: number, w: number): number {
  const most = Math.min(70, 0.5 * bedDepth(x));
  return most * smooth(0, 3, w - 31 - 3 * x);
}

/** Oxygen of the old bottom water that sat at depth z0 at x, by week `w`, mg/L. Decay starts with the spring bloom. */
function oldWater(x: number, z0: number, w: number): number {
  const d = clamp01(z0 / 180);
  const start = 7 - d;
  const rate = 0.004 + 0.034 * Math.sqrt(d) * (0.4 + 0.8 * x);
  return Math.max(0.2, start - rate * Math.max(0, w - 12) * 7);
}

/** New ocean water's oxygen, mg/L: upwelled, so not full. */
export const O_NEW = 5.5;

/**
 * Oxygen at x (0 the mouth, 1 Lynch Cove) and depth z metres in week `w`,
 * mg/L: a model. Decay draws the deep water down through summer; with
 * `inflow`, dense water arrives from week 31 and lifts the old water; with
 * `wind`, a south wind in mid-September pushes the surface layer north and
 * water from below wells up at the south end; autumn storms restore it.
 */
export function oxygenAt(x: number, z: number, w: number, inflow: boolean, wind: boolean): number {
  const bed = bedDepth(x);
  const blow = wind ? windAt(w) : 0;
  const south = clamp01((x - 0.5) / 0.3) * blow;
  const lid = lidDepth(w) * (1 - south) * (1 + 0.6 * blow * clamp01((0.5 - x) / 0.5));
  let o: number;
  if (z < lid) o = 9;
  else {
    const zz = Math.min(bed, z + 35 * south);
    const lift = inflow ? liftAt(x, w) : 0;
    if (zz > bed - lift) o = O_NEW;
    else o = oldWater(x, Math.min(bed, zz + lift), w);
  }
  const rec = smooth(42, 50, w) * (inflow ? 1 : clamp01((60 - z) / 40));
  return o * (1 - rec) + 7.5 * rec;
}

/** The least oxygen at the surface along the south end (Hoodsport to the Great Bend) in week `w`. */
export function southSurface(w: number, inflow: boolean, wind: boolean): number {
  let least = Infinity;
  for (let x = 0.66; x <= 0.86; x += 0.02) least = Math.min(least, oxygenAt(x, 0.5, w, inflow, wind));
  return least;
}

/** The oxygen just under the lid at Hoodsport: where the fish are squeezed. */
export function underLid(w: number, inflow: boolean): number {
  return oxygenAt(PLACES.hoodsport, lidDepth(w) + 3, w, inflow, false);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOf = (w: number) => MONTHS[Math.min(11, Math.floor((w / 52) * 12))];

/** A colour for an oxygen level, from the palette: bad (none) through paper to oxygen (full). */
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a: string, b: string, k: number) => {
  const p = hex(a);
  const q = hex(b);
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * clamp01(k))).join(',')})`;
};
export const oxygenColor = (o: number) => (o < 3 ? mix(COL.bad, '#f3eedc', o / 3) : mix('#f3eedc', COL.oxygen, (o - 3) / 5.5));

const yearFigure = figure(['kill'], (ctx, t) => {
  const H = 242;
  const f = frame(W, H, 3);
  const X0 = 30;
  const X1 = 390;
  const Y0 = 52;
  const DEPTH = 190;
  const SCALE = 150 / DEPTH;
  const NX = 45;
  const NZ = 38;
  const xs = (x: number) => X0 + x * (X1 - X0);
  const ys = (z: number) => Y0 + z * SCALE;
  const cells = svg('g', { 'shape-rendering': 'crispEdges' });
  const rects: SVGElement[][] = [];
  for (let i = 0; i < NX; i++) {
    rects.push([]);
    for (let j = 0; j < NZ; j++) {
      const r = svg('rect', { x: xs(i / NX), y: ys((j * DEPTH) / NZ), width: (X1 - X0) / NX + 0.4, height: (DEPTH / NZ) * SCALE + 0.4 });
      rects[i].push(r);
      cells.append(r);
    }
  }
  const bedPts: string[] = [];
  for (let k = 0; k <= 60; k++) bedPts.push(`${xs(k / 60)},${ys(bedDepth(k / 60))}`);
  const floor = svg('polygon', { points: `${xs(0)},${ys(DEPTH) + 2} ${bedPts.join(' ')} ${xs(1)},${ys(DEPTH) + 2}`, fill: COL.rock });
  const key: SVGElement[] = [small(X0, H - 8, 'Oxygen, mg/L', { bold: true })];
  [0, 2, 4, 6, 8].forEach((o, i) => {
    const kx = 120 + i * 46;
    key.push(svg('rect', { x: kx, y: H - 17, width: 14, height: 11, fill: oxygenColor(o), stroke: COL.grid }), small(kx + 18, H - 8, String(o)));
  });
  const places = [
    small(xs(PLACES.sill), Y0 - 6, 'Sill', { anchor: 'middle', soft: true }),
    small(xs(PLACES.hoodsport), Y0 - 6, 'Hoodsport', { anchor: 'middle', soft: true }),
    small(xs(PLACES.lynch) - 2, Y0 - 6, 'Lynch Cove', { anchor: 'end', soft: true }),
    small(X0, 16, '◀ North', { soft: true }),
    small(X1, 16, 'South ▶', { anchor: 'end', soft: true }),
  ];
  const live = svg('g');
  f.svg.append(cells, floor, ...places, ...key, live);
  let week = 0;
  let inflow = true;
  let wind = false;
  const fish = (x: number, y: number, dead: boolean) => svg('g', { transform: `translate(${x} ${y})${dead ? ' scale(1 -1)' : ''}` },
    svg('ellipse', { cx: 0, cy: 0, rx: 5, ry: 2.4, fill: dead ? COL.bad : COL.ink }),
    svg('path', { d: 'M 4.5 0 l 4 -2.6 l 0 5.2 z', fill: dead ? COL.bad : COL.ink }));
  const paint = () => {
    for (let i = 0; i < NX; i++) {
      const x = (i + 0.5) / NX;
      for (let j = 0; j < NZ; j++) {
        const z = ((j + 0.5) * DEPTH) / NZ;
        rects[i][j].setAttribute('fill', oxygenColor(oxygenAt(x, z, week, inflow, wind)));
      }
    }
    const surf = southSurface(week, inflow, wind);
    const squeezed = inflow && underLid(week, true) < 3;
    const kill = surf < HYPOXIC;
    // Where the fish at Hoodsport can be: the deepest water with 4 mg/L or more, near the top.
    let deep = 0;
    for (let z = 1; z < 40; z += 1) if (oxygenAt(PLACES.hoodsport, z, week, inflow, wind) >= 4) deep = z; else break;
    const fy = kill ? Y0 + 3 : ys(Math.min(24, Math.max(2, deep * 0.6)));
    const parts: SVGElement[] = [
      label(W / 2, 16, `${monthOf(week)}, week ${Math.floor(week) + 1}`, { anchor: 'middle', bold: true }),
      line(X0, Y0, X1, Y0, COL.salt, 1.2),
      fish(xs(0.68), fy, kill), fish(xs(0.74), fy + (kill ? 0 : 4), kill), fish(xs(0.79), fy - (kill ? 0 : 2), kill),
    ];
    const coming = inflow && week >= 30.5 && week <= 38;
    if (coming) {
      parts.push(
        svg('path', { d: `M ${xs(0.005)} ${ys(48)} L ${xs(0.06)} ${ys(48)} Q ${xs(0.12)} ${ys(70)} ${xs(0.2)} ${ys(130)}`, fill: 'none', stroke: COL.salt, 'stroke-width': 3, 'marker-end': '' }),
        svg('path', { d: `M ${xs(0.2) - 6} ${ys(124)} L ${xs(0.2) + 1} ${ys(132)} L ${xs(0.2) + 4} ${ys(122)} z`, fill: COL.salt }),
        small(xs(0.13), ys(150), 'dense inflow', { anchor: 'middle', fill: COL.paper, bold: true }),
      );
    }
    const blow = wind ? windAt(week) : 0;
    if (blow > 0.05) {
      parts.push(
        line(xs(0.86), Y0 - 18, xs(0.56), Y0 - 18, COL.wind, 2.5),
        svg('path', { d: `M ${xs(0.56)} ${Y0 - 18} l 7 -4 l 0 8 z`, fill: COL.wind }),
        small(xs(0.58), Y0 - 24, 'south wind', { fill: COL.wind, bold: true }),
      );
    }
    redraw(live, ...parts);
    if (!open()) return;
    f.readout.textContent = kill
      ? `The south wind has pushed the surface layer north, and the lifted old water wells up at the south end: ${surf.toFixed(1)} mg/L at the surface. The fish have nowhere to go.`
      : blow > 0.05 && !inflow
        ? 'A south wind pushes the surface layer north and water from below wells up at the south end. Without an inflow it is water from mid-depth that still holds some oxygen, and the fish survive.'
        : squeezed && week < 44
          ? 'The new water has lifted the old water to just under the fresh lid. At the south end the fish are squeezed into the top few metres.'
          : coming
            ? 'Dense ocean water spills over the sill, sinks and runs south along the floor, lifting the old water above it.'
            : week >= 42 && !inflow
              ? 'No new water came this year. Storms refresh the top, but the old water stays on the floor, still losing oxygen.'
              : week >= 42
                ? 'Autumn storms stir the canal, the old water is carried out, and the new water on the floor holds the oxygen it brought.'
                : week >= 13
                  ? 'Spring and summer: plankton bloom, die and sink, and their decay draws the deep water down, worst at the bottom and toward the south.'
                  : 'Winter: the canal holds its oxygen. A thin fresh layer from the rivers lies on top.';
    if (kill && t.goal === 'kill') t.done();
  };
  const tg = toggles(['Dense inflow', 'South wind'], [inflow, wind], (on) => { inflow = on[0]; wind = on[1]; paint(); });
  const wk = slider('Week', 0, 52, 0.25, week, (v) => monthOf(v).slice(0, 3), (v) => { week = v; paint(); }, 'ink');
  const play = player(wk, ctx, { seconds: 16 });
  const row = document.createElement('div');
  row.className = 'fig-row';
  row.append(wk.node, play.node);
  f.controls.append(tg.node, row);
  const open = guessFirst(t, f, {
    ask: 'In late summer, dense new ocean water spills over the sill. That week, does it help or hurt the fish at the south end, near Hoodsport?',
    options: ['Helps: it brings oxygen', 'Hurts: it lifts the old water', 'Neither: it stays at the sill'],
    answer: 1,
    sliders: [wk],
    buttons: tg.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'hoodcanal-flush': flushFigure,
  'hoodcanal-year': yearFigure,
};
