// Branch F1, Reading a tide table and a current table. One made-up but
// realistic week of Seattle tides, built the way NOAA builds a prediction (a
// sum of regular waves, lesson 9) and read as a table: the datum and a minus
// tide on a beach, the rule of twelfths against the curve, a current table for
// a fast pass and a slow inlet, and picking the day for a noon walk.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, pick, player, slider, tint, type FigureFactory } from './kit';

// ---------------------------------------------------------------------------
// The model tide: Seattle's six largest constituents, sizes from NOAA's
// harmonic constants (rounded), phases chosen so the week below looks like a
// late-May week there. Heights in feet above the model's own MLLW.

export interface Constituent { name: string; /** degrees an hour */ speed: number; /** ft */ amp: number; /** degrees */ phase: number }

export const CONSTITUENTS: readonly Constituent[] = [
  { name: 'M2', speed: 28.9841042, amp: 3.51, phase: 48 },
  { name: 'S2', speed: 30.0, amp: 0.85, phase: 305 },
  { name: 'N2', speed: 28.4397295, amp: 0.69, phase: 275 },
  { name: 'K1', speed: 15.0410686, amp: 2.72, phase: 92 },
  { name: 'O1', speed: 13.9430356, amp: 1.51, phase: 178 },
  { name: 'P1', speed: 14.9589314, amp: 0.85, phase: 162 },
];

/** Mean water level above the model's MLLW, ft: set so a year's lower lows average zero (tested). */
export const Z0 = 6.17;
/** Model hour of 00:00 on the week's first day. */
const START = 24 * 9 + 6.75;
export const DAYS = ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday'] as const;
const SHORT = DAYS.map((d) => d.slice(0, 3));
/** Saturday, the day of the twelfths and the current figures. */
export const SATURDAY = 3;

const RAD = Math.PI / 180;
/** The model's sea level, without the datum, at a model hour. */
const wave = (t: number) => CONSTITUENTS.reduce((s, c) => s + c.amp * Math.cos((c.speed * t - c.phase) * RAD), 0);

/** Tide height in feet above MLLW, `hour` hours after 00:00 on the week's Wednesday. */
export const tideFt = (hour: number) => Z0 + wave(START + hour);

/** Rate of rise, ft an hour. */
export const riseRate = (hour: number) => (tideFt(hour + 0.01) - tideFt(hour - 0.01)) / 0.02;

export interface Turn { hour: number; ft: number; kind: 'H' | 'L' }

/** The highs and lows between two hours, as a tide table lists them, found to the minute. */
export function turns(from: number, to: number, f: (h: number) => number = tideFt): Turn[] {
  const out: Turn[] = [];
  const dt = 1 / 60;
  let a = f(from - dt);
  let b = f(from);
  for (let h = from; h < to; h += dt) {
    const c = f(h + dt);
    if (b > a && b >= c) out.push({ hour: h, ft: b, kind: 'H' });
    else if (b < a && b <= c) out.push({ hour: h, ft: b, kind: 'L' });
    a = b;
    b = c;
  }
  return out;
}

/** The turns on day `d` of the week (hours from that day's midnight). */
export const dayTurns = (d: number): Turn[] => turns(24 * d, 24 * d + 24).map((x) => ({ ...x, hour: x.hour - 24 * d }));

/** Where a model year's lower lows average, ft (the datum's definition); about zero. */
export function meanLowerLow(days = 365): number {
  const lows: number[] = [];
  const f = (h: number) => Z0 + wave(h);
  const tl = turns(0, 24 * days, f).filter((x) => x.kind === 'L');
  // Group lows by tidal day (24.84 h) and keep the lower of each.
  const by = new Map<number, number>();
  for (const l of tl) {
    const k = Math.floor(l.hour / 24.8412);
    by.set(k, Math.min(by.get(k) ?? Infinity, l.ft));
  }
  for (const v of by.values()) lows.push(v);
  return lows.reduce((s, v) => s + v, 0) / lows.length;
}

/** The rule of twelfths: the fall (or rise) in each sixth of the time between turns is 1, 2, 3, 3, 2, 1 twelfths of the range. */
const CUM = [0, 1, 3, 6, 9, 11, 12];

/** The rule of twelfths' height at `hour`, between turn `a` and the next turn `b`. */
export function twelfths(a: Turn, b: Turn, hour: number): number {
  const s = Math.max(0, Math.min(6, ((hour - a.hour) / (b.hour - a.hour)) * 6));
  const i = Math.min(5, Math.floor(s));
  const frac = (CUM[i] + (CUM[i + 1] - CUM[i]) * (s - i)) / 12;
  return a.ft + (b.ft - a.ft) * frac;
}

/** A clock time from hours after midnight: 7.5 → "07:30". */
export function clock(h: number): string {
  const m = Math.round(((h % 24) + 24) % 24 * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const ftm = (ft: number) => `${ft < 0 ? '−' : ''}${Math.abs(ft).toFixed(1)} ft`;
const signed = (ft: number) => `${ft < -0.05 ? '−' : '+'}${Math.abs(ft).toFixed(1)}`;

// ---------------------------------------------------------------------------
// 1. A model beach, from the top of the beach out to deep water: a steep upper
// beach of gravel, then a wide, nearly flat low-tide terrace.

/** Beach height in feet above MLLW at `x` metres from the foot of the bluff. */
export function beachFt(x: number): number {
  const pts: [number, number][] = [[0, 16], [4, 12.5], [28, 3], [148, -3], [200, -12]];
  if (x <= 0) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

/** Where the water's edge stands, metres out, for a tide of `ft`. */
export function edgeAt(ft: number): number {
  let lo = 0;
  let hi = 200;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (beachFt(m) > ft) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/** The average higher high at Seattle, ft above MLLW (NOAA, rounded). */
export const MHHW = 11.4;

const beach = figure(['minus'], (_ctx, t) => {
  const W = 400;
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  const X = (m: number) => 20 + m * 1.85;
  const Y = (ft: number) => 30 + (15 - ft) * 6.2;
  let level = 10;
  const paint = () => {
    const ground = [[0, 16], [4, 12.5], [28, 3], [148, -3], [200, -12]] as const;
    const land = `M ${X(0)} ${Y(-16)} ` + ground.map(([x, y]) => `L ${X(x)} ${Y(y)}`).join(' ') + ` L ${X(200)} ${Y(-16)} Z`;
    const edge = edgeAt(level);
    const high = edgeAt(MHHW);
    const water = `M ${X(edge)} ${Y(level)} L ${X(200)} ${Y(level)} L ${X(200)} ${Y(-16)} L ${X(edge)} ${Y(-16)} Z`;
    redraw(g,
      svg('path', { d: water, fill: tint(COL.salt, 0.45) }),
      svg('path', { d: land, fill: tint(COL.sediment, 0.75), stroke: COL.sediment, 'stroke-width': 1.5 }),
      line(X(edge), Y(level), X(200), Y(level), COL.salt, 2),
      line(X(0), Y(0), X(200), Y(0), COL.ink, 1, { 'stroke-dasharray': '4 3' }),
      small(X(200), Y(0) - 4, '0 ft: MLLW, the average lower low', { anchor: 'end', soft: true }),
      line(X(0), Y(MHHW), X(200), Y(MHHW), COL.ink, 1, { 'stroke-dasharray': '2 3' }),
      small(X(200), Y(MHHW) - 4, `${MHHW} ft: the average higher high`, { anchor: 'end', soft: true }),
      small(X(88), Y(-7), 'low-tide terrace', { anchor: 'middle' }),
      small(X(3), Y(-7), 'upper beach'),
      // The strip uncovered since the average high tide.
      edge > high ? line(X(high), Y(-12.5), X(edge), Y(-12.5), COL.ink, 1.5) : null,
      edge > high ? small(Math.max(70, (X(high) + X(edge)) / 2), Y(-12.5) - 4, `${Math.round(edge - high)} m uncovered`, { anchor: 'middle', bold: true }) : null,
      small(Math.max(X(edge) + 6, 48), Y(level) - 6, `${signed(level)} ft`, { bold: true, fill: COL.salt }),
    );
    if (!open()) return;
    const steep = level > 3;
    f.readout.textContent = `A tide of ${ftm(level)} (${(level * 0.3048).toFixed(2)} m) above MLLW ${edge > high ? `puts the water's edge ${Math.round(edge - high)} m out from the average high-tide line` : 'is above the average high-tide line'}. `
      + (steep
        ? 'On the steep upper beach each foot of falling tide uncovers only two or three metres.'
        : level >= 0
          ? 'Below about +3 ft the water drains off the flat terrace: each foot uncovers some 20 m.'
          : 'A minus tide: the water stands below the datum, and the outer terrace, under water on most days, is bare.');
    if (level <= -2) t.done();
  };
  const s = slider('Tide height', -4, 14, 0.1, level, (v) => `${signed(v)} ft`, (v) => { level = v; paint(); }, 'salt');
  f.controls.append(s.node);
  const open = guessFirst(t, f, {
    ask: 'A tide falling from +10 ft to +6 ft uncovers a strip of this beach. How much does a fall from +2 ft to −2 ft uncover?',
    options: ['Less than that', 'About the same', 'Several times as much'],
    answer: 2,
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// 2. Saturday's tide: the curve the table's four turns come from, and the rule
// of twelfths between them.

/** The fastest fall on Saturday's big ebb, ft an hour (a negative number). */
export function fastestFall(day = SATURDAY): { hour: number; rate: number } {
  const tl = dayTurns(day);
  const i = tl.findIndex((x, k) => x.kind === 'H' && tl[k + 1]?.kind === 'L' && x.ft - tl[k + 1].ft > 8);
  let best = { hour: tl[i].hour, rate: 0 };
  for (let h = tl[i].hour; h <= tl[i + 1].hour; h += 1 / 60) {
    const r = riseRate(24 * day + h);
    if (r < best.rate) best = { hour: h, rate: r };
  }
  return best;
}

const twelfthsFig = figure(['fastest'], (ctx, t) => {
  const W = 400;
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  const day = SATURDAY;
  const tl = dayTurns(day);
  // The turns either side of the day, so the rule works at midnight too.
  const all = turns(24 * day - 8, 24 * day + 32).map((x) => ({ ...x, hour: x.hour - 24 * day }));
  const ax = axes({ x: 34, y: 48, w: 340, h: 160, xmin: 0, xmax: 24, ymin: -4, ymax: 15, xticks: [0, 6, 12, 18, 24], xfmt: (v) => clock(v), yticks: [-3, 0, 3, 6, 9, 12, 15], ylabel: 'ft above MLLW', ink: COL.ink, grid: COL.grid });
  const curve = Array.from({ length: 24 * 12 + 1 }, (_, i) => [i / 12, tideFt(24 * day + i / 12)] as [number, number]);
  const ruleAt = (h: number) => {
    const i = all.findIndex((x) => x.hour > h);
    return twelfths(all[i - 1], all[i], h);
  };
  const rule = Array.from({ length: 24 * 12 + 1 }, (_, i) => [i / 12, ruleAt(i / 12)] as [number, number]);
  const fast = fastestFall(day);
  let now = 9;
  const paint = () => {
    const h = tideFt(24 * day + now);
    const r = ruleAt(now);
    const rate = riseRate(24 * day + now);
    redraw(g,
      ...tl.map((x, i) => small(34 + i * 92, 14, `${clock(x.hour)} ${x.kind} ${signed(x.ft)}`, { bold: true })),
      small(34, 30, "Saturday's table (made up, Seattle-like)", { soft: true }),
      ...ax.parts,
      line(ax.X(0), ax.Y(0), ax.X(24), ax.Y(0), COL.ink, 0.8, { 'stroke-dasharray': '4 3' }),
      ax.path(curve, COL.salt, 2.2),
      ax.path(rule, COL.model, 1.6, { 'stroke-dasharray': '5 3' }),
      ...ax.dots(tl.map((x) => [x.hour, x.ft]), COL.data, 3.5),
      line(ax.X(now), ax.Y(15), ax.X(now), ax.Y(-4), COL.ink, 1),
      svg('circle', { cx: ax.X(now), cy: ax.Y(h), r: 4, fill: COL.salt }),
      svg('circle', { cx: ax.X(now), cy: ax.Y(r), r: 3.5, fill: 'none', stroke: COL.model, 'stroke-width': 1.8 }),
      line(40, 240, 54, 240, COL.salt, 2.5), small(58, 243, 'the tide (model)'),
      line(160, 240, 174, 240, COL.model, 2, { 'stroke-dasharray': '5 3' }), small(178, 243, 'rule of twelfths'),
      svg('circle', { cx: 300, cy: 240, r: 3.5, fill: COL.data }), small(307, 243, 'table entries'),
    );
    const off = Math.abs(h - r);
    f.readout.textContent = `${clock(now)}. The curve says ${ftm(h)}; the rule of twelfths says ${ftm(r)} (${off < 0.05 ? 'the same' : `${off.toFixed(1)} ft off`}). `
      + `The water is ${Math.abs(rate) < 0.15 ? 'nearly still, at the turn' : `${rate < 0 ? 'falling' : 'rising'} ${Math.abs(rate).toFixed(1)} ft an hour`}.`;
    if (now >= fast.hour - 0.5 && now <= fast.hour + 0.5) t.done();
  };
  const s = slider('Time', 0, 24, 0.05, now, clock, (v) => { now = v; paint(); }, 'salt');
  const p = player(s, ctx, { seconds: 16 });
  f.controls.append(p.node, s.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// 3. A current table: the current in a fast pass and in a wide inlet, made in
// the model from the same tide. Each follows the tide's rate of rise, turned
// to knots and delayed: in the pass slack comes over an hour after the turn of
// the tide outside (lesson 11), in the inlet sooner.

export interface Channel { name: string; /** knots per (ft an hour) */ k: number; /** hours slack lags the tide's turn */ lag: number; flood: string; ebb: string }

export const CHANNELS: readonly Channel[] = [
  { name: 'Deception Pass', k: 2.2, lag: 1.25, flood: 'east into Skagit Bay', ebb: 'west into Rosario Strait' },
  { name: 'A wide inlet', k: 0.85, lag: 0.5, flood: 'into the Sound', ebb: 'out to the Strait' },
];

/** Current in knots in a channel, positive for flood, at `hour` after Wednesday's midnight. */
export const currentKn = (c: Channel, hour: number) => c.k * riseRate(hour - c.lag);

export interface CurrentEvent { hour: number; kind: 'slack' | 'flood' | 'ebb'; kn: number }

/** A current table for one day: each slack, and the greatest flood and ebb between them. */
export function currentTable(c: Channel, day: number): CurrentEvent[] {
  const u = (h: number) => currentKn(c, 24 * day + h);
  const out: CurrentEvent[] = [];
  const dt = 1 / 60;
  let a = u(-dt);
  let b = u(0);
  for (let h = 0; h < 24; h += dt) {
    const n = u(h + dt);
    if ((b <= 0 && n > 0) || (b >= 0 && n < 0)) out.push({ hour: h + dt * (Math.abs(b) / (Math.abs(b) + Math.abs(n))), kind: 'slack', kn: 0 });
    else if (b > 0 && b > a && b >= n) out.push({ hour: h, kind: 'flood', kn: b });
    else if (b < 0 && b < a && b <= n) out.push({ hour: h, kind: 'ebb', kn: b });
    a = b;
    b = n;
  }
  return out;
}

/** How long the current runs slower than `under` knots around the slack nearest `hour`: [from, to] in hours. */
export function slackWindow(c: Channel, day: number, hour: number, under = 1): [number, number] {
  const ev = currentTable(c, day).filter((e) => e.kind === 'slack');
  const s = ev.reduce((best, e) => (Math.abs(e.hour - hour) < Math.abs(best.hour - hour) ? e : best), ev[0]).hour;
  const u = (h: number) => Math.abs(currentKn(c, 24 * day + h));
  let from = s;
  let to = s;
  while (u(from - 1 / 120) < under && from > s - 6) from -= 1 / 120;
  while (u(to + 1 / 120) < under && to < s + 6) to += 1 / 120;
  return [from, to];
}

const currentFig = figure(['slack'], (ctx, t) => {
  const W = 400;
  const f = frame(W, 330, 3);
  const g = svg('g');
  f.svg.append(g);
  const day = SATURDAY;
  let which = 0;
  let now = 6;
  const found = new Set<number>();
  const tide = axes({ x: 34, y: 92, w: 340, h: 62, xmin: 0, xmax: 24, ymin: -4, ymax: 15, yticks: [0, 12], xticks: [], ylabel: 'tide outside, ft', ink: COL.ink, grid: COL.grid });
  const cur = axes({ x: 34, y: 186, w: 340, h: 110, xmin: 0, xmax: 24, ymin: -8, ymax: 8, yticks: [-8, -4, 0, 4, 8], xticks: [0, 6, 12, 18, 24], xfmt: (v) => clock(v), ylabel: 'current, knots', ink: COL.ink, grid: COL.grid });
  const tideLine = Array.from({ length: 24 * 12 + 1 }, (_, i) => [i / 12, tideFt(24 * day + i / 12)] as [number, number]);
  const highs = dayTurns(day).filter((x) => x.kind === 'H');
  const paint = () => {
    const c = CHANNELS[which];
    const ev = currentTable(c, day);
    const u = currentKn(c, 24 * day + now);
    const curLine = Array.from({ length: 24 * 12 + 1 }, (_, i) => [i / 12, currentKn(c, 24 * day + i / 12)] as [number, number]);
    const rows = ev.map((e) => `${clock(e.hour)}  ${e.kind === 'slack' ? 'slack' : `max ${e.kind} ${Math.abs(e.kn).toFixed(1)} kn`}`);
    const half = Math.ceil(rows.length / 2);
    const band = svg('rect', { x: cur.X(0), y: cur.Y(1), width: cur.X(24) - cur.X(0), height: cur.Y(-1) - cur.Y(1), fill: tint(COL.flow, 0.12) });
    redraw(g,
      small(10, 14, `${c.name}, Saturday: current table (model)`, { bold: true }),
      ...rows.map((r, i) => small(i < half ? 10 : 205, 32 + (i % half) * 13, r)),
      ...tide.parts,
      tide.path(tideLine, COL.salt, 2),
      ...highs.flatMap((x) => [
        line(tide.X(x.hour), tide.Y(x.ft), tide.X(x.hour), cur.Y(-8), COL.salt, 0.8, { 'stroke-dasharray': '2 3' }),
        small(tide.X(x.hour) + 3, tide.Y(-1), `HW ${clock(x.hour)}`, { fill: COL.salt }),
      ]),
      band,
      ...cur.parts,
      line(cur.X(0), cur.Y(0), cur.X(24), cur.Y(0), COL.ink, 1),
      small(cur.X(24) - 2, cur.Y(7) + 3, 'flood', { anchor: 'end', fill: COL.flow }),
      small(cur.X(24) - 2, cur.Y(-7) + 3, 'ebb', { anchor: 'end', fill: COL.flow }),
      cur.path(curLine, COL.flow, 2.2),
      ...cur.dots(ev.filter((e) => e.kind === 'slack').map((e) => [e.hour, 0]), COL.data, 3.2),
      line(cur.X(now), tide.Y(15), cur.X(now), cur.Y(-8), COL.ink, 1),
      svg('circle', { cx: cur.X(now), cy: cur.Y(Math.max(-8, Math.min(8, u))), r: 4, fill: COL.flow }),
    );
    if (!open()) return;
    const [a, b] = slackWindow(c, day, now);
    const dir = u >= 0 ? `flood ${c.flood}` : `ebb ${c.ebb}`;
    f.readout.textContent = `${clock(now)}. ${Math.abs(u) < 0.2 ? 'Slack: the current is turning.' : `${dir}, ${Math.abs(u).toFixed(1)} knots (${(Math.abs(u) * 0.514).toFixed(1)} m/s).`} `
      + `Around the nearest slack the water runs under 1 knot from ${clock(a)} to ${clock(b)}, ${Math.round((b - a) * 60)} minutes.`;
    if (Math.abs(u) < 0.5) found.add(which);
    if (found.size === CHANNELS.length) t.done();
  };
  const chips = pick(CHANNELS.map((c) => `${c.name} (model)`), 0, (i) => { which = i; paint(); });
  const s = slider('Time', 0, 24, 0.05, now, clock, (v) => { now = v; paint(); }, 'flow');
  const p = player(s, ctx, { seconds: 18 });
  f.controls.append(chips.node, p.node, s.node);
  const open = guessFirst(t, f, {
    ask: 'In a pass where the biggest tides run at 7 knots, for how long around each slack does the water run slower than 1 knot?',
    options: ['Two hours or more', 'Under an hour', 'A minute or two'],
    answer: 1,
    sliders: [s],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// 4. A week's table: which day suits a walk at noon?

/** The height at noon on each day of the week, ft. */
export const noonHeights = () => DAYS.map((_, d) => tideFt(24 * d + 12));

/** The day whose noon tide is lowest: the answer to the week's question. */
export const bestNoon = () => {
  const n = noonHeights();
  return n.indexOf(Math.min(...n));
};

/** The day with the week's lowest low, whatever its hour. */
export const lowestLowDay = () => {
  const lows = DAYS.map((_, d) => Math.min(...dayTurns(d).filter((x) => x.kind === 'L').map((x) => x.ft)));
  return lows.indexOf(Math.min(...lows));
};

/** Hours of the day the water stands below `ft`, as [from, to] pairs. */
export function below(day: number, ft: number): [number, number][] {
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let h = 0; h <= 24; h += 1 / 60) {
    const under = tideFt(24 * day + h) < ft;
    if (under && start === null) start = h;
    if (!under && start !== null) {
      out.push([start, h]);
      start = null;
    }
  }
  if (start !== null) out.push([start, 24]);
  return out;
}

const week = figure(['week'], (ctx, t) => {
  const W = 400;
  const f = frame(W, 290, 3);
  const g = svg('g');
  f.svg.append(g);
  const answer = bestNoon();
  const ax = axes({ x: 34, y: 152, w: 340, h: 100, xmin: 0, xmax: 24, ymin: -4, ymax: 15, xticks: [0, 6, 12, 18, 24], xfmt: (v) => clock(v), yticks: [0, 6, 12], ylabel: 'ft above MLLW', ink: COL.ink, grid: COL.grid });
  let day = 0;
  const seen = new Set<number>();
  const rows = DAYS.map((_, d) => dayTurns(d));
  const paint = () => {
    const parts: SVGElement[] = [small(10, 12, 'Seattle, a week in late May (made-up predictions, ft)', { soft: true })];
    rows.forEach((tl, d) => {
      const y = 28 + d * 15;
      if (open() && d === day) parts.push(svg('rect', { x: 4, y: y - 11, width: 392, height: 14, fill: tint(COL.salt, 0.12) }));
      parts.push(small(10, y, SHORT[d], { bold: true }));
      tl.forEach((x, i) => parts.push(small(46 + i * 88, y, `${clock(x.hour)} ${x.kind} ${signed(x.ft)}`, x.kind === 'L' && x.ft < 0 ? { bold: true, fill: COL.salt } : {})));
    });
    if (!open()) {
      parts.push(small(200, 200, 'The day’s curve appears after your guess.', { anchor: 'middle', soft: true }));
      redraw(g, ...parts);
      return;
    }
    const curve = Array.from({ length: 24 * 12 + 1 }, (_, i) => [i / 12, tideFt(24 * day + i / 12)] as [number, number]);
    const noon = tideFt(24 * day + 12);
    parts.push(
      svg('rect', { x: ax.X(11.5), y: ax.Y(15), width: ax.X(12.5) - ax.X(11.5), height: ax.Y(-4) - ax.Y(15), fill: tint(COL.ink, 0.08) }),
      small(ax.X(12), ax.Y(15) - 3, 'free hour', { anchor: 'middle', soft: true }),
      ...ax.parts,
      line(ax.X(0), ax.Y(0), ax.X(24), ax.Y(0), COL.ink, 0.8, { 'stroke-dasharray': '4 3' }),
      ax.path(curve, COL.salt, 2.2),
      svg('circle', { cx: ax.X(12), cy: ax.Y(noon), r: 4, fill: COL.salt }),
      small(ax.X(12) + 7, ax.Y(noon) + 4, `${signed(noon)} ft at noon`, { bold: true, fill: COL.salt }),
      small(ax.X(24), 282, DAYS[day], { anchor: 'end', bold: true }),
    );
    redraw(g, ...parts);
    const low = rows[day].filter((x) => x.kind === 'L').reduce((a, b) => (b.ft < a.ft ? b : a));
    const bare = below(day, 0).filter(([a, b]) => b - a > 0.1);
    f.readout.textContent = `${DAYS[day]}: ${ftm(noon)} at noon; the day's lower low is ${ftm(low.ft)} at ${clock(low.hour)}. `
      + (bare.length ? `The water is below zero from ${bare.map(([a, b]) => `${clock(a)} to ${clock(b)}`).join(' and ')}.` : 'The water never drops below zero.');
    seen.add(day);
    if (seen.has(answer) && seen.size >= 3) t.done();
  };
  const s = slider('Day', 0, 6, 1, 0, (v) => SHORT[v], (v) => { day = v; paint(); }, 'salt');
  const p = player(s, ctx, { seconds: 8 });
  f.controls.append(p.node, s.node);
  const open = guessFirst(t, f, {
    ask: 'Your free hour is 11:30 to 12:30. From the table alone, which day puts the lowest water in it?',
    options: SHORT,
    answer,
    sliders: [s],
    after: (i) => s.set(i),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'tables-beach': beach,
  'tables-twelfths': twelfthsFig,
  'tables-current': currentFig,
  'tables-week': week,
};
