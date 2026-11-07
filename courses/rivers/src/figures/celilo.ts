// C1, The falls that went under: the Columbia from Canada to the sea turned
// into a stair of reservoirs (a time lapse of the dams, 1930 to 1975); Celilo
// Falls at low water, in the June flood and under the lake (a still); and what
// storage does to the year's hydrograph at The Dalles (live, guess first).

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still, type P } from 'didactics/draw';
import { COL, axes, big, figure, frame, guessFirst, legend, player, slider, tint, type FigureFactory } from './kit';

const W = 400;

// ---- The stair of reservoirs -------------------------------------------------------------------------

/** A dam on the main stem of the Columbia in the United States. */
export interface Dam {
  name: string;
  /** River kilometres from the mouth. */
  km: number;
  /** The year its reservoir first filled (rounded to the year it began to hold water). */
  year: number;
  /** Full-pool height of the reservoir, metres above sea level (rounded). */
  pool: number;
  /** Height of the river just below it, metres above sea level (rounded). */
  tail: number;
  /** Label it on the drawing. */
  named?: boolean;
}

/**
 * The main-stem dams from the sea to Grand Coulee, with their pools and
 * tailwaters rounded from published full-pool levels. Each tailwater is the
 * pool of the dam below it, as on the real river.
 */
export const DAMS: readonly Dam[] = [
  { name: 'Bonneville', km: 235, year: 1938, pool: 23, tail: 4, named: true },
  { name: 'The Dalles', km: 309, year: 1957, pool: 49, tail: 23, named: true },
  { name: 'John Day', km: 348, year: 1968, pool: 81, tail: 49 },
  { name: 'McNary', km: 470, year: 1953, pool: 104, tail: 81, named: true },
  { name: 'Priest Rapids', km: 639, year: 1959, pool: 149, tail: 122 },
  { name: 'Wanapum', km: 668, year: 1963, pool: 174, tail: 149 },
  { name: 'Rock Island', km: 729, year: 1933, pool: 187, tail: 174 },
  { name: 'Rocky Reach', km: 763, year: 1961, pool: 215, tail: 187 },
  { name: 'Wells', km: 830, year: 1967, pool: 238, tail: 215 },
  { name: 'Chief Joseph', km: 877, year: 1955, pool: 291, tail: 238 },
  { name: 'Grand Coulee', km: 961, year: 1942, pool: 393, tail: 291, named: true },
];

/** Where Celilo Falls stood, km from the mouth, and the low-water levels above and below it. */
export const CELILO = { km: 324, above: 40, below: 33 };
/** The Canadian border, km from the mouth. */
export const BORDER = 1199;

/** The river's own low-water surface before the dams: through each dam site's tailwater, with the step at Celilo. */
const NATURAL: readonly P[] = [
  [0, 0],
  ...DAMS.slice(0, 2).map((d): P => [d.km, d.tail]),
  [CELILO.km - 1, CELILO.below],
  [CELILO.km + 1, CELILO.above],
  ...DAMS.slice(2).map((d): P => [d.km, d.tail]),
  [BORDER, 393],
];

/** The undammed river's surface at `km` from the mouth, metres above sea level. */
export function natural(km: number): number {
  for (let i = 1; i < NATURAL.length; i++) {
    const [x0, y0] = NATURAL[i - 1];
    const [x1, y1] = NATURAL[i];
    if (km <= x1) return y0 + ((km - x0) / (x1 - x0)) * (y1 - y0);
  }
  return NATURAL[NATURAL.length - 1][1];
}

/** The dams holding water in `year`. */
export const damsBy = (year: number) => DAMS.filter((d) => d.year <= year);

/**
 * The surface at `km` in `year`: a reservoir is flat at its dam's pool and
 * reaches upstream until the river's own surface climbs above it.
 */
export function surface(km: number, year: number): number {
  let s = natural(km);
  for (const d of damsBy(year)) if (d.km < km && d.pool > s) s = d.pool;
  return s;
}

/** Kilometres of river between Bonneville's site and the border still running free of a reservoir in `year`. */
export function freeKm(year: number, from = DAMS[0].km): number {
  let free = 0;
  for (let km = from; km < BORDER; km += 1) if (surface(km + 0.5, year) - natural(km + 0.5) < 0.5) free += 1;
  return free;
}

const EVENTS: Record<number, string> = {
  1933: 'Rock Island, the first dam across the main stem, near Wenatchee.',
  1938: 'Bonneville, at the Cascade Rapids in the Gorge, with fish ladders for salmon.',
  1942: 'Grand Coulee, the tallest step, with no way past for salmon. Its lake drowned Kettle Falls upstream in 1940 as it filled.',
  1953: 'McNary: its lake backs past the mouth of the Snake.',
  1955: 'Chief Joseph, below Grand Coulee.',
  1957: 'The Dalles. Its gates close on 10 March, and within hours Celilo Falls is under the new lake.',
  1959: 'Priest Rapids: the rapids it was named for go under.',
  1961: 'Rocky Reach, above Wenatchee.',
  1963: 'Wanapum.',
  1967: 'Wells.',
  1968: 'John Day, the last step between the Gorge and the Snake.',
};

export const stairFigure = figure(['end'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  const ax = axes({
    x: 34, y: 22, w: 340, h: 176, xmin: 0, xmax: 1200, ymin: 0, ymax: 420,
    xticks: [0, 200, 400, 600, 800, 1000, 1200], yticks: [0, 100, 200, 300, 400],
    xfmt: (v) => (v === 0 ? 'sea' : `${v}`), xlabel: 'km from the mouth', ylabel: 'metres above sea level',
    ink: COL.ink, grid: COL.grid,
  });
  let year = 1930;
  const paint = () => {
    const pts: P[] = [];
    for (let km = 0; km <= BORDER; km += 2) pts.push([km, surface(km, year)]);
    const nat: P[] = [];
    for (let km = 0; km <= BORDER; km += 2) nat.push([km, natural(km)]);
    const lake = pts.map(([x, y]): P => [ax.X(x), ax.Y(y)]);
    const bed = nat.map(([x, y]): P => [ax.X(x), ax.Y(y)]);
    const fill = svg('polygon', { points: [...lake, ...bed.slice().reverse()].map((p) => p.join(',')).join(' '), fill: tint(COL.water, 0.35) });
    const built = damsBy(year);
    const parts: SVGElement[] = [
      ...ax.parts,
      svg('rect', { x: ax.X(0), y: ax.Y(420), width: ax.X(BORDER) - ax.X(0), height: ax.Y(0) - ax.Y(420), fill: 'none' }),
      fill,
      ax.path(nat, COL.water, 1.2, { 'stroke-dasharray': '3 2' }),
      ax.path(pts, COL.water, 2),
    ];
    // Celilo: a dot on the old river, open once it is drowned.
    const drowned = year >= 1957;
    parts.push(
      svg('circle', { cx: ax.X(CELILO.km), cy: ax.Y(CELILO.above), r: 3.2, fill: drowned ? COL.paper : COL.flow, stroke: COL.flow, 'stroke-width': 1.4 }),
      line(ax.X(CELILO.km) + 2, ax.Y(CELILO.above) + 3, ax.X(CELILO.km) + 18, ax.Y(10) - 4, COL.soft, 0.7),
      small(ax.X(CELILO.km) + 20, ax.Y(10), drowned ? 'Celilo Falls (under the lake)' : 'Celilo Falls', { fill: COL.flow, bold: true }),
    );
    // The dams: a bar from tailwater to pool.
    let row = 0;
    for (const d of built) {
      const x = ax.X(d.km);
      parts.push(svg('rect', { x: x - 2, y: ax.Y(d.pool) - 2, width: 4, height: ax.Y(d.tail) - ax.Y(d.pool) + 4, fill: COL.works }));
    }
    for (const d of DAMS.filter((x) => x.named)) {
      if (!built.includes(d)) continue;
      const x = ax.X(d.km);
      const y = d.name === 'Grand Coulee' ? ax.Y(d.pool) - 6 : d.name === 'McNary' ? ax.Y(d.pool) - 26 : ax.Y(d.pool) - 14 - (row++ % 2) * 26;
      parts.push(line(x, y + 2, x, ax.Y(d.pool) - 3, COL.works, 0.7), small(x, y, d.name, { anchor: d.name === 'Grand Coulee' ? 'end' : 'middle', fill: COL.works, bold: true }));
    }
    const free = freeKm(year);
    const hanford = year >= 1959;
    if (hanford) {
      const a = ax.X(565);
      const b = ax.X(639);
      parts.push(line(a, ax.Y(85), b, ax.Y(85), COL.flow, 1.2), small((a + b) / 2, ax.Y(85) + 11, 'Hanford Reach', { anchor: 'middle', fill: COL.flow }));
    }
    parts.push(
      small(ax.X(BORDER) - 2, ax.Y(393) + 14, 'Canada', { anchor: 'end', soft: true }),
      label(ax.X(0) + 8, 64, String(year), { bold: true }),
      ...legend(42, 42, [{ text: 'the river before the dams', color: COL.water, dash: true }, { text: 'with the dams so far', color: COL.water }]),
    );
    redraw(g, ...parts);
    if (!open()) return;
    const news = Object.entries(EVENTS).filter(([y]) => Number(y) <= year).pop();
    const n = built.length;
    f.readout.textContent = `${news ? `${news[0]}: ${news[1]} ` : 'Before the dams: rapids and falls the whole way, and salmon running to Canada. '}${n} dam${n === 1 ? '' : 's'}; ${big(free)} of the ${big(BORDER - DAMS[0].km)} km above the tide still run free.`;
    if (year >= 1968) t.done();
  };
  const years = slider('Year', 1930, 1975, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'works');
  const play = player(years, ctx, { seconds: 14 });
  f.controls.append(play.node, years.node);
  const open = guessFirst(t, f, {
    ask: 'Above the reach of the tide, the Columbia in the United States runs about 960 km. How much of it still runs free of a reservoir today?',
    options: ['About half', 'About a quarter', 'Less than a tenth'],
    answer: 2,
    reveal: 'done',
    sliders: [years],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Celilo at low water, in flood, and under the lake (still) ------------------------------------------

export const fallsStill = () => {
  const s = still(W, 222);
  const parts: SVGElement[] = [];
  // Levels in drawing units (down is larger): the water above the ledge and below it.
  const panels = [
    { title: 'Low water, autumn', note: 'a drop of several metres', above: 110, below: 150 },
    { title: 'June flood', note: 'backwater from the narrows', above: 86, below: 93 },
    { title: 'Since 1957', note: 'under Lake Celilo', above: 58, below: 58 },
  ];
  const pw = 128;
  panels.forEach((p, i) => {
    const x0 = 4 + i * (pw + 4);
    const X = (x: number) => x0 + x;
    const ledge = 60;
    parts.push(
      svg('rect', { x: X(0), y: 36, width: pw, height: 170, fill: COL.paper }),
      svg('rect', { x: X(0), y: p.below, width: p.above === p.below ? pw : ledge, height: 206 - p.below, fill: tint(COL.water, 0.5) }),
      ...(p.above === p.below ? [] : [svg('rect', { x: X(ledge), y: p.above, width: pw - ledge, height: 206 - p.above, fill: tint(COL.water, 0.5) })]),
      line(X(0), p.below, X(ledge - 6), p.below, COL.water, 1.6),
      line(X(ledge), p.above, X(pw), p.above, COL.water, 1.6),
    );
    if (p.above !== p.below) parts.push(svg('path', { d: `M${X(ledge)},${p.above} Q${X(ledge - 4)},${p.above + 2} ${X(ledge - 7)},${p.below}`, fill: 'none', stroke: COL.water, 'stroke-width': 1.6 }));
    // Basalt: a ledge with a plunge pool below it.
    parts.push(svg('polygon', { points: [[X(0), 206], [X(0), 182], [X(ledge - 8), 184], [X(ledge - 2), 124], [X(ledge + 4), 120], [X(pw), 117], [X(pw), 206]].map((q) => q.join(',')).join(' '), fill: COL.rock }));
    // The current over the ledge.
    parts.push(arrow(X(pw - 6), p.above - 7, X(pw - 30), p.above - 7, COL.flow, 1.3), small(X(pw - 34), p.above - 4, 'flow', { anchor: 'end', fill: COL.flow }));
    if (i === 0) {
      // A fishing platform out over the water below the falls, and a dip net.
      parts.push(
        line(X(ledge + 6), 112, X(ledge - 26), 112, COL.land, 2.4),
        line(X(ledge + 2), 112, X(ledge + 2), 121, COL.land, 1.4),
        line(X(ledge - 22), 112, X(ledge - 34), 156, COL.ink, 0.9),
        svg('ellipse', { cx: X(ledge - 35), cy: 160, rx: 5, ry: 3.5, fill: 'none', stroke: COL.ink, 'stroke-width': 0.8 }),
        line(X(10), p.above, X(10), p.below, COL.flow, 1),
        line(X(6), p.above, X(14), p.above, COL.flow, 1),
        line(X(6), p.below, X(14), p.below, COL.flow, 1),
        line(X(14), p.above, X(ledge - 28), p.above, COL.flow, 0.6, { 'stroke-dasharray': '2 2' }),
        small(X(3), p.above - 6, 'the drop', { fill: COL.flow }),
      );
    }
    if (i === 1) parts.push(small(X(26), p.below + 22, 'step', { anchor: 'middle', fill: COL.salt }), small(X(26), p.below + 33, 'nearly gone', { anchor: 'middle', fill: COL.salt }));
    if (i === 2) parts.push(small(X(pw / 2), 92, 'the ledge is still here,', { anchor: 'middle', fill: COL.salt }), small(X(pw / 2), 103, 'under still water', { anchor: 'middle', fill: COL.salt }));
    parts.push(
      label(X(pw / 2), 14, p.title, { anchor: 'middle', bold: true }),
      small(X(pw / 2), 27, p.note, { anchor: 'middle', soft: true }),
    );
  });
  parts.push(small(W / 2, 218, 'Side views of the river at the falls, not to scale. The river runs right to left.', { anchor: 'middle', soft: true }));
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- What storage does to the year (live) ----------------------------------------------------------------

/** A typical year at The Dalles before the dams, monthly mean flows in m³/s from October (a model rounded from the old record). */
export const NATURAL_MONTHS = [2300, 2400, 2500, 2500, 2700, 3100, 5700, 11300, 13600, 8500, 4200, 2700] as const;
const MONTHS = ['O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S'];
const DAYS = 365;
const SECONDS = 86400;
/** m³/s to cubic feet a second. */
export const CFS = 35.3147;

/** The natural flow on each day of the water year (from 1 October), by straight lines between mid-month means. */
export function naturalYear(months: readonly number[] = NATURAL_MONTHS): number[] {
  const out: number[] = [];
  for (let d = 0; d < DAYS; d++) {
    const m = (d / DAYS) * 12 - 0.5;
    const i = Math.floor(m);
    const a = months[(i + 12) % 12];
    const b = months[(i + 1) % 12];
    out.push(a + (b - a) * (m - i));
  }
  return out;
}

/** Cubic kilometres of water a year of daily flows carries. */
export const yearVolume = (q: readonly number[]) => (q.reduce((s, v) => s + v, 0) * SECONDS) / 1e9;

/** km³ held back by cutting every flow above `cap` to `cap`. */
const cutAbove = (q: readonly number[], cap: number) => (q.reduce((s, v) => s + Math.max(0, v - cap), 0) * SECONDS) / 1e9;
/** km³ needed to raise every flow below `floor` to `floor`. */
const addBelow = (q: readonly number[], floor: number) => (q.reduce((s, v) => s + Math.max(0, floor - v), 0) * SECONDS) / 1e9;

/**
 * The year with `storage` km³ of reservoirs run to even out the flow: the
 * highest flows are cut to a cap while the lakes fill, and the same volume is
 * let out to lift the lowest flows to a floor. Returns the regulated flows,
 * the cap and the floor, and the volume moved.
 */
export function regulate(q: readonly number[], storage: number): { flows: number[]; cap: number; floor: number; moved: number } {
  const mean = q.reduce((s, v) => s + v, 0) / q.length;
  const most = cutAbove(q, mean);
  const moved = Math.min(storage, most, addBelow(q, mean));
  const solve = (f: (x: number) => number, lo: number, hi: number, increasing: boolean) => {
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if ((f(mid) < moved) === increasing) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const top = Math.max(...q);
  const bottom = Math.min(...q);
  const cap = moved <= 0 ? top : solve((c) => cutAbove(q, c), mean, top, false);
  const floor = moved <= 0 ? bottom : solve((c) => addBelow(q, c), bottom, mean, true);
  return { flows: q.map((v) => Math.min(cap, Math.max(floor, v))), cap, floor, moved };
}

/**
 * Roughly how much the dams hold back from an ordinary spring today, km³. The
 * reservoirs could hold over twice this; the rest is kept for floods, dry
 * years, power in winter and water for fish.
 */
export const TODAY = 20;

export const damsFigure = figure(['today'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  const nat = naturalYear();
  const total = yearVolume(nat);
  const ax = axes({
    x: 44, y: 20, w: 346, h: 156, xmin: 0, xmax: DAYS, ymin: 0, ymax: 15000,
    yticks: [0, 5000, 10000, 15000], yfmt: (v) => big(v), ylabel: 'flow at The Dalles, m³/s', ink: COL.ink, grid: COL.grid,
  });
  let storage = 0;
  const paint = () => {
    const r = regulate(nat, storage);
    const at = (q: readonly number[]) => q.map((v, d): [number, number] => [d, v]);
    const band = (from: number[], to: number[], color: string) => {
      const top = from.map((v, d): P => [ax.X(d), ax.Y(v)]);
      const bot = to.map((v, d): P => [ax.X(d), ax.Y(v)]).reverse();
      return svg('polygon', { points: [...top, ...bot].map((p) => p.join(',')).join(' '), fill: color });
    };
    const months = MONTHS.map((m, i) => small(ax.X((i + 0.5) * (DAYS / 12)), ax.Y(0) + 13, m, { anchor: 'middle', soft: true }));
    redraw(g,
      ...ax.parts,
      ...months,
      band(nat, nat.map((v, d) => Math.min(v, r.flows[d])), tint(COL.water, 0.35)),
      band(nat.map((v, d) => Math.max(v, r.flows[d])), nat, tint(COL.works, 0.3)),
      ax.path(at(nat), COL.water, 1.6, { 'stroke-dasharray': '4 2' }),
      ax.path(at(r.flows), COL.works, 2.4),
      ...(storage > 0 ? [
        small(ax.X(292), ax.Y(11500), 'held in the lakes', { fill: COL.water }),
        small(ax.X(60), ax.Y(r.floor) - 6, 'let out in winter', { anchor: 'middle', fill: COL.works }),
      ] : []),
      ...legend(52, 34, [{ text: 'before the dams', color: COL.water, dash: true }, { text: 'with the lakes', color: COL.works }]),
    );
    if (!open()) return;
    const r100 = (v: number) => Math.round(v / 100) * 100;
    const peak = r100(Math.max(...r.flows));
    const low = r100(Math.min(...r.flows));
    const natPeak = r100(Math.max(...nat));
    const natLow = r100(Math.min(...nat));
    const share = Math.round((100 * r.moved) / total);
    f.readout.textContent = storage === 0
      ? `No storage: the river runs as the snow melts, from about ${big(natLow)} m³/s in winter to ${big(natPeak)} m³/s (${big((natPeak * CFS) / 1000)},000 cfs) in June.`
      : `${big(r.moved)} km³ moved, ${share}% of a year's flow. June peak ${big(peak)} m³/s instead of ${big(natPeak)}; the lowest flow ${big(low)} instead of ${big(natLow)}.${storage >= TODAY && storage < TODAY + 10 ? ' About what the dams hold back in an ordinary year now.' : ''}`;
    if (storage >= TODAY) t.done();
  };
  const store = slider('Held back in spring', 0, 45, 5, storage, (v) => `${v} km³`, (v) => { storage = v; paint(); }, 'works');
  f.controls.append(store.node);
  const open = guessFirst(t, f, {
    ask: 'Lakes behind the dams fill in spring and are drawn down later. Once they are working, in which part of the year does the river at The Dalles run higher than it used to?',
    options: ['June, at the snowmelt', 'Winter', 'No part: dams only hold water back'],
    answer: 1,
    sliders: [store],
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'celilo-stair': stairFigure,
  'celilo-falls': fallsStill,
  'celilo-dams': damsFigure,
};
