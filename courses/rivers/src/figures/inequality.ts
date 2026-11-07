// Lesson 9, Why one low tide is lower: the Moon's tilt seen side on, two waves
// adding to a pattern, the tide as a sum of four constituents (guess first),
// Kelvin's machine that adds them with pulleys and a wire, and a year of
// Seattle's lowest lows against daylight.
//
// The tide model is harmonic, as the tide tables are: each constituent is a
// cosine at its own speed, with its astronomical argument from the mean
// longitudes of the Sun (h) and Moon (s) and the mean Sun's hour angle (T).
// Amplitudes are Seattle's (approximate); the phase lags are chosen so the
// model's lows look like Seattle's (an inequality mostly in the lows, summer's
// lowest lows near midday), not taken from NOAA's table.

import { svg } from 'didactics/dom';
import { label, line, polyline, redraw, small, still, type P } from 'didactics/draw';
import { COL, axes, button, figure, frame, guessFirst, legend, player, slider, tint, type ColorKey, type FigureFactory } from './kit';

const W = 400;
const RAD = Math.PI / 180;

// ---- The model --------------------------------------------------------------------------------

/** Seattle's latitude, degrees north. */
export const SEATTLE_LAT = 47.6;

export type Name = 'M2' | 'S2' | 'K1' | 'O1' | 'P1';

export interface Constituent {
  name: Name;
  /** Hours from one crest to the next. */
  period: number;
  /** Seattle's amplitude in metres (about). */
  seattle: number;
  /** What it stands for, in a few words. */
  what: string;
}

export const CONSTITUENTS: readonly Constituent[] = [
  { name: 'M2', period: 12.4206, seattle: 1.07, what: "the Moon's twice-daily wave" },
  { name: 'S2', period: 12, seattle: 0.26, what: "the Sun's twice-daily wave" },
  { name: 'K1', period: 23.9345, seattle: 0.83, what: 'a daily wave from the tilt of Moon and Sun' },
  { name: 'O1', period: 25.8193, seattle: 0.46, what: "a daily wave from the Moon's tilt" },
  { name: 'P1', period: 24.0659, seattle: 0.26, what: "a daily wave from the Sun's tilt" },
];

export type Amps = Partial<Record<Name, number>>;

/** Seattle's four main constituents, in metres. */
export const SEATTLE: Required<Pick<Amps, 'M2' | 'S2' | 'K1' | 'O1'>> = { M2: 1.07, S2: 0.26, K1: 0.83, O1: 0.46 };

// Mean longitudes at the model's hour 0, 1 January 2026 at local midnight (sun time).
const S0 = 67.96;
const H0 = 280.66;
/** Phase lags of the model (degrees): twice-daily and daily waves. */
const G2 = 180;
const G1 = 0;

/** The astronomical argument of each constituent, degrees, `t` hours from the model's start. */
function argument(name: Name, t: number): number {
  const T = 15 * t + 180;
  const s = S0 + 0.5490165 * t;
  const h = H0 + 0.0410686 * t;
  switch (name) {
    case 'M2': return 2 * T - 2 * s + 2 * h - G2;
    case 'S2': return 2 * T - G2 - 25;
    case 'K1': return T + h + 90 - G1;
    case 'O1': return T - 2 * s + h - 90 - G1 + 15;
    case 'P1': return T - h - 90 - G1 + 3;
  }
}

/** The tide in metres above mean sea level, `t` hours after the model's start (sun time). */
export function tideAt(t: number, amps: Amps): number {
  let sum = 0;
  for (const c of CONSTITUENTS) {
    const a = amps[c.name];
    if (a) sum += a * Math.cos(argument(c.name, t) * RAD);
  }
  return sum;
}

/** One constituent alone, metres. */
export const waveAt = (name: Name, t: number, amp: number) => amp * Math.cos(argument(name, t) * RAD);

/** Every low (and high) in a run of hours, found by stepping `step` hours: [hour, metres]. */
export function turns(amps: Amps, from: number, to: number, step = 0.1): { lows: [number, number][]; highs: [number, number][] } {
  const lows: [number, number][] = [];
  const highs: [number, number][] = [];
  let a = tideAt(from - step, amps);
  let b = tideAt(from, amps);
  for (let t = from + step; t <= to + 1e-9; t += step) {
    const c = tideAt(t, amps);
    if (b < a && b <= c) lows.push([t - step, b]);
    if (b > a && b >= c) highs.push([t - step, b]);
    a = b;
    b = c;
  }
  return { lows, highs };
}

/** The longest gap between one low and the next, hours: about 12.4 when every day has two lows. */
export function longestGap(lows: readonly [number, number][]): number {
  let gap = 0;
  for (let i = 1; i < lows.length; i++) gap = Math.max(gap, lows[i][0] - lows[i - 1][0]);
  return gap;
}

/** Whether some day in the run has only one low (a gap of more than 18 hours between lows). */
export const hasSingleLowDay = (amps: Amps, from: number, to: number) => longestGap(turns(amps, from, to, 0.2).lows) > 18;

/** The form number (K1 + O1) / (M2 + S2), and what it makes of the tide. */
export function formNumber(amps: Amps): { F: number; kind: string } {
  const F = ((amps.K1 ?? 0) + (amps.O1 ?? 0)) / Math.max(1e-9, (amps.M2 ?? 0) + (amps.S2 ?? 0));
  const kind = F < 0.25 ? 'twice a day, highs and lows nearly equal'
    : F < 1.5 ? 'mixed, mainly twice a day'
    : F < 3 ? 'mixed, mainly once a day'
    : 'once a day';
  return { F, kind };
}

/** Days until two waves of these periods (hours) fall back into step. */
export const beatDays = (a: number, b: number) => 1 / Math.abs(1 / a - 1 / b) / 24;

/**
 * Newton's picture: the water's height at latitude `lat` under a bulge tilted
 * by the Moon's declination `dec`, the Moon `hour` degrees past the meridian.
 * Relative units: cos²θ − 1/3, from −1/3 (the thin waist) to 2/3 (the top of a bulge).
 */
export function equilibrium(lat: number, dec: number, hour: number): number {
  const c = Math.sin(lat * RAD) * Math.sin(dec * RAD) + Math.cos(lat * RAD) * Math.cos(dec * RAD) * Math.cos(hour * RAD);
  return c * c - 1 / 3;
}

/** The two high waters of a lunar day in Newton's picture: under the near bulge and under the far one. */
export const twoHighs = (lat: number, dec: number): [number, number] => [equilibrium(lat, dec, 0), equilibrium(lat, dec, 180)];

/** Sunrise and sunset, hours of sun time, on day `d` of the year at latitude `lat`. */
export function daylight(d: number, lat = SEATTLE_LAT): [number, number] {
  const dec = 23.44 * Math.sin((2 * Math.PI * (d - 80)) / 365.25);
  const x = -Math.tan(lat * RAD) * Math.tan(dec * RAD) + Math.sin(-0.83 * RAD) / (Math.cos(lat * RAD) * Math.cos(dec * RAD));
  const half = Math.acos(Math.max(-1, Math.min(1, x))) / RAD / 15;
  return [12 - half, 12 + half];
}

const ALL: Amps = Object.fromEntries(CONSTITUENTS.map((c) => [c.name, c.seattle]));

/**
 * A year of the model with all five constituents: each day's lowest low, as
 * [day, hour of the day in sun time, metres above the year's mean lower low
 * water]. Mean lower low water is the zero of Seattle's tide tables.
 */
export function yearOfLows(amps: Amps = ALL): { day: number; hour: number; height: number }[] {
  const { lows } = turns(amps, 0, 365 * 24, 0.1);
  const byDay = new Map<number, [number, number]>();
  for (const l of lows) {
    const d = Math.floor(l[0] / 24);
    const was = byDay.get(d);
    if (!was || l[1] < was[1]) byDay.set(d, l);
  }
  // Mean lower low water: the mean of the lower of each pair of lows.
  let sum = 0;
  let n = 0;
  for (let i = 0; i + 1 < lows.length; i += 2) {
    sum += Math.min(lows[i][1], lows[i + 1][1]);
    n++;
  }
  const mllw = sum / n;
  return [...byDay.entries()].filter(([d]) => d < 365).map(([d, l]) => ({ day: d, hour: l[0] - d * 24, height: l[1] - mllw }));
}

const ft = (m: number) => m * 3.28084;
const say = (m: number, d = 1) => `${m.toFixed(d)} m (${ft(m).toFixed(d === 2 ? 1 : 0)} ft)`;

// ---- Newton's bulge, tilted (live) ------------------------------------------------------------

export const tiltFigure = figure(['tilted'], (ctx, t) => {
  const f = frame(W, 300, 3);
  const g = svg('g');
  f.svg.append(g);
  let dec = 0;
  let hour = 0; // hours of a lunar day, 0 to 24.84
  const cx = 150;
  const cy = 98;
  const r = 62;
  const lat = SEATTLE_LAT;
  const plot = axes({ x: 40, y: 196, w: 340, h: 70, xmin: 0, xmax: 24.84, ymin: -0.36, ymax: 0.7, xticks: [0, 6, 12, 18, 24], xfmt: (v) => `${v} h`, ink: COL.ink, grid: COL.grid });
  const paint = () => {
    const H = (hour / 24.84) * 360;
    // The water shell: thick along the line to the Moon, thin around the waist.
    const shell: P[] = [];
    for (let a = 0; a <= 360; a += 4) {
      const fromAxis = (a - dec) * RAD;
      const thick = 10 + 30 * (Math.cos(fromAxis) ** 2);
      shell.push([cx + (r + thick) * Math.cos(a * RAD), cy - (r + thick) * Math.sin(a * RAD)]);
    }
    const y = cy - r * Math.sin(lat * RAD);
    const half = r * Math.cos(lat * RAD);
    const px = cx + half * Math.cos(H * RAD);
    const front = Math.sin(H * RAD) < 0; // the half of the day it faces us
    const here = equilibrium(lat, dec, H);
    const curve: P[] = [];
    for (let h = 0; h <= 24.84; h += 0.12) curve.push([h, equilibrium(lat, dec, (h / 24.84) * 360)]);
    const mx = cx + 140 * Math.cos(dec * RAD);
    const my = cy - 140 * Math.sin(dec * RAD);
    const [h1, h2] = twoHighs(lat, dec);
    redraw(g,
      svg('path', { d: `M${shell.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L')}Z`, fill: tint(COL.salt, 0.35), stroke: COL.salt, 'stroke-width': 1 }),
      svg('circle', { cx, cy, r, fill: COL.land }),
      line(cx, cy - r - 30, cx, cy + r + 18, COL.soft, 1, { 'stroke-dasharray': '3 3' }),
      small(cx + 4, cy - r - 22, 'axis', { soft: true, halo: COL.paper }),
      line(cx - r - 8, cy, cx + r + 8, cy, COL.paper, 1, { 'stroke-dasharray': '2 3' }),
      small(cx - r + 4, cy + 12, 'equator', { fill: COL.paper }),
      line(cx, cy, mx, my, COL.moon, 1.2, { 'stroke-dasharray': '4 3' }),
      svg('circle', { cx: Math.min(W - 14, mx), cy: my, r: 9, fill: COL.moon }),
      small(Math.min(W - 14, mx) + 9, my - 14, `Moon, ${Math.abs(dec)}° ${dec >= 0 ? 'N' : 'S'}`, { anchor: 'end', fill: COL.moon, halo: COL.paper }),
      line(cx - half, y, cx + half, y, COL.paper, 1.4),
      svg('circle', { cx: px, cy: y, r: 4.5, fill: front ? COL.ink : COL.paper, stroke: COL.ink, 'stroke-width': 1.5 }),
      small(cx - half - 4, y + 3, 'Seattle', { anchor: 'end', bold: true, halo: COL.paper }),
      ...plot.parts,
      plot.path(curve, COL.salt, 2),
      line(plot.X(hour), plot.o.y, plot.X(hour), plot.o.y + plot.o.h, COL.ink, 1, { 'stroke-dasharray': '2 2' }),
      svg('circle', { cx: plot.X(hour), cy: plot.Y(here), r: 4, fill: COL.ink }),
      small(40, 186, 'Water at Seattle through one turn of the Earth (Newton\'s picture)'),
    );
    const moon = dec === 0 ? 'The Moon is over the equator.' : `The Moon is ${Math.abs(dec)}° ${dec > 0 ? 'north' : 'south'} of the equator.`;
    const verdict = Math.abs(h1 - h2) < 0.02
      ? 'Seattle passes under both bulges at the same depth: two equal high waters.'
      : `Seattle passes under the ${h1 > h2 ? 'near' : 'far'} bulge's thick part, then the other's thin edge: high waters ${Math.round((Math.max(h1, h2) + 1 / 3) * 100)}% and ${Math.round((Math.min(h1, h2) + 1 / 3) * 100)}% of a full bulge.`;
    f.readout.textContent = `${moon} ${verdict}`;
    if (Math.abs(dec) >= 20 && t.goal === 'tilted') t.done();
  };
  const tilt = slider('Moon north or south', -28, 28, 1, dec, (v) => (v === 0 ? '0°' : `${Math.abs(v)}° ${v > 0 ? 'N' : 'S'}`), (v) => { dec = v; paint(); }, 'moon');
  const clock = slider('Hours', 0, 24.84, 0.04, hour, (v) => `${v.toFixed(1)} h`, (v) => { hour = v; paint(); }, 'ink');
  const play = player(clock, ctx, { seconds: 8 });
  f.controls.append(tilt.node, play.node, clock.node);
  paint();
  return f.node;
});

// ---- Two waves adding (live) -----------------------------------------------------------------

export const beatFigure = figure(['beat'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let pb = 13;
  const A = 0.55;
  const B = 1;
  const top = axes({ x: 22, y: 18, w: 352, h: 50, xmin: 0, xmax: 72, ymin: -1.1, ymax: 1.1, xticks: [0, 24, 48, 72], xfmt: (v) => `${v / 24} d`, ink: COL.ink, grid: COL.grid });
  const bottom = axes({ x: 22, y: 112, w: 352, h: 72, xmin: 0, xmax: 30, ymin: -1.6, ymax: 1.6, xticks: [0, 5, 10, 15, 20, 25, 30], xfmt: (v) => `${v} d`, ink: COL.ink, grid: COL.grid });
  const paint = () => {
    const a: [number, number][] = [];
    const b: [number, number][] = [];
    for (let h = 0; h <= 72; h += 0.25) {
      a.push([h, A * Math.cos((2 * Math.PI * h) / 12)]);
      b.push([h, B * Math.cos((2 * Math.PI * h) / pb)]);
    }
    const sum: [number, number][] = [];
    for (let h = 0; h <= 720; h += 0.5) sum.push([h / 24, A * Math.cos((2 * Math.PI * h) / 12) + B * Math.cos((2 * Math.PI * h) / pb)]);
    redraw(g,
      ...top.parts,
      top.path(b, COL.moon, 1.5),
      top.path(a, COL.sun, 1.5),
      ...legend(22, 12, [{ text: 'wave A, 12 h', color: COL.sun }, { text: `wave B, ${pb.toFixed(2)} h`, color: COL.moon }]),
      small(22, 104, 'A + B over a month'),
      ...bottom.parts,
      bottom.path(sum, COL.salt, 1),
    );
    const days = beatDays(12, pb);
    const m2 = Math.abs(pb - 12.42) < 0.015;
    f.readout.textContent = Math.abs(pb - 12) < 0.005
      ? 'The two waves have the same period: they stay in step for ever, and the sum is one bigger wave.'
      : `They fall back into step every ${days < 10 ? days.toFixed(1) : Math.round(days)} days. ${m2 ? 'At 12.42 hours, wave B is the Moon\'s and A the Sun\'s: this is lesson 8\'s spring and neap cycle.' : 'Big swings where they agree, small where they cancel.'}`;
    if (m2 && t.goal === 'beat') t.done();
  };
  const per = slider('Wave B every', 11.5, 13, 0.01, pb, (v) => `${v.toFixed(2)} h`, (v) => { pb = v; paint(); }, 'moon');
  f.controls.append(per.node);
  paint();
  return f.node;
});

// ---- The tide as a sum (live, guess first) ----------------------------------------------------

/** Where the sum figure's two weeks start: hour of the model (mid May). */
export const SUM_FROM = 135 * 24;
export const SUM_DAYS = 15;

export const sumFigure = figure(['oneLow'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  const amps: Amps = { M2: SEATTLE.M2, S2: SEATTLE.S2, K1: 0, O1: 0 };
  const plot = axes({ x: 34, y: 18, w: 352, h: 188, xmin: 0, xmax: SUM_DAYS, ymin: -4, ymax: 4, xticks: [0, 3, 6, 9, 12, 15], yticks: [-4, -2, 0, 2, 4], xfmt: (v) => `${v}`, yfmt: (v) => `${v} m`, xlabel: 'days', ylabel: 'height above mean sea level', ink: COL.ink, grid: COL.grid });
  let reached = false;
  const paint = () => {
    const pts: [number, number][] = [];
    for (let h = 0; h <= SUM_DAYS * 24; h += 0.25) pts.push([h / 24, tideAt(SUM_FROM + h, amps)]);
    const { lows } = turns(amps, SUM_FROM, SUM_FROM + SUM_DAYS * 24, 0.2);
    const gap = longestGap(lows);
    const single = gap > 18;
    const lowest = Math.min(...lows.map((l) => l[1]));
    redraw(g,
      ...plot.parts,
      plot.path(pts, COL.salt, 1.4),
      ...lows.map((l) => svg('circle', { cx: plot.X((l[0] - SUM_FROM) / 24), cy: plot.Y(l[1]), r: 2.2, fill: COL.ink })),
    );
    if (!open()) return;
    const { F, kind } = formNumber(amps);
    f.readout.textContent = `Form number (K1 + O1) ÷ (M2 + S2) = ${F.toFixed(2)}: ${kind}. ${single ? 'On some days the higher low has climbed into the high and vanished: one low that day.' : `Lowest low ${say(-lowest)} below mean sea level.`}`;
    if (single) reached = true;
    if (reached && t.goal === 'oneLow') t.done();
  };
  const make = (n: 'M2' | 'S2' | 'K1' | 'O1', color: ColorKey, max: number) => slider(n, 0, max, 0.01, amps[n] ?? 0, (v) => `${v.toFixed(2)} m`, (v) => { amps[n] = v; paint(); }, color);
  const sl = [make('M2', 'moon', 1.4), make('S2', 'sun', 1.4), make('K1', 'moon', 2), make('O1', 'moon', 2)];
  const seattle = button('Seattle', () => {
    sl[0].set(SEATTLE.M2);
    sl[1].set(SEATTLE.S2);
    sl[2].set(SEATTLE.K1);
    sl[3].set(SEATTLE.O1);
  });
  f.controls.append(...sl.map((s) => s.node), seattle);
  const open = guessFirst(t, f, {
    ask: 'K1 and O1 start at zero: no tilt. As you raise them, what happens to the two lows of each day?',
    options: ['Both sink deeper together', 'One deepens, the other climbs until it vanishes', 'The lows stay equal; only the highs change'],
    answer: 1,
    reveal: 'done',
    sliders: sl,
    buttons: [seattle],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Kelvin's machine (live) -----------------------------------------------------------------

export const machineFigure = figure(['turned'], (ctx, t) => {
  const f = frame(W, 286, 3);
  const g = svg('g');
  f.svg.append(g);
  let hour = 0;
  const four: Name[] = ['M2', 'S2', 'K1', 'O1'];
  const xs = [56, 124, 192, 260];
  const k = 15; // drawing units per metre
  const guideY = 176;
  const penX = 352;
  const penBase = 232;
  const T0 = SUM_FROM;
  const paint = () => {
    const parts: SVGElement[] = [];
    const wire: P[] = [[16, guideY + 8]];
    four.forEach((n, i) => {
      const c = CONSTITUENTS.find((x) => x.name === n)!;
      const a = argument(n, T0 + hour) * RAD;
      const R = Math.max(4, c.seattle * k * 1.6);
      const cy = 60;
      const pinX = xs[i] + R * Math.sin(a);
      const pinY = cy - R * Math.cos(a);
      const py = 124 - c.seattle * k * Math.cos(a) * 1.6;
      parts.push(
        svg('circle', { cx: xs[i], cy, r: R + 3, fill: 'none', stroke: COL.works, 'stroke-width': 1.5 }),
        svg('circle', { cx: xs[i], cy, r: 2, fill: COL.works }),
        line(xs[i], cy, pinX, pinY, COL.works, 2),
        svg('circle', { cx: pinX, cy: pinY, r: 3, fill: COL.works }),
        line(pinX, pinY, xs[i], py, COL.soft, 1.2),
        svg('circle', { cx: xs[i], cy: py, r: 8, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.5 }),
        small(xs[i], 12, n, { anchor: 'middle', bold: true, fill: n === 'S2' ? COL.sun : COL.moon }),
        small(xs[i], 22, `${c.period.toFixed(2)} h`, { anchor: 'middle', soft: true }),
      );
      wire.push([xs[i] - 8, py], [xs[i] + 8, py]);
      if (i < 3) wire.push([(xs[i] + xs[i + 1]) / 2 - 6, guideY + 8], [(xs[i] + xs[i + 1]) / 2 + 6, guideY + 8]);
    });
    const sum = tideAt(T0 + hour, { M2: SEATTLE.M2, S2: SEATTLE.S2, K1: SEATTLE.K1, O1: SEATTLE.O1 });
    const penY = penBase - sum * 11;
    wire.push([penX - 8, 30], [penX, 22], [penX + 8, 30], [penX + 8, penY]);
    // Fixed guide pulleys under the wire, and the guide over the pen.
    for (let i = 0; i < 3; i++) parts.push(svg('circle', { cx: (xs[i] + xs[i + 1]) / 2, cy: guideY, r: 7, fill: COL.paper, stroke: COL.soft, 'stroke-width': 1.2 }));
    parts.push(svg('circle', { cx: penX, cy: 30, r: 8, fill: COL.paper, stroke: COL.soft, 'stroke-width': 1.2 }));
    // The paper, moving left, with the trace so far.
    const trace: P[] = [];
    const span = 72;
    for (let h = Math.max(0, hour - span); h <= hour + 1e-9; h += 0.25) trace.push([penX + 8 - ((hour - h) / span) * 330, penBase - tideAt(T0 + h, SEATTLE) * 11]);
    redraw(g,
      svg('rect', { x: 14, y: 196, width: penX - 4, height: 76, fill: COL.paper, stroke: COL.grid }),
      line(14, penBase, penX + 4, penBase, COL.grid, 1),
      polyline(trace, COL.salt, 1.6),
      ...parts,
      polyline(wire, COL.ink, 1.1, { 'stroke-linejoin': 'round' }),
      line(8, guideY + 8, 16, guideY + 8, COL.ink, 3),
      svg('path', { d: `M${penX + 8},${penY} l-4,8 l8,0 z`, fill: COL.ink }),
      small(18, 282, 'the paper moves left; the pen draws the sum', { soft: true }),
    );
    f.readout.textContent = `Hour ${Math.round(hour)}. One wire runs over every pulley, so the pen moves by the sum of the four waves: ${say(sum)} from mean sea level.`;
    if (hour >= 48 && t.goal === 'turned') t.done();
  };
  const clock = slider('Turn the handle', 0, 96, 0.1, hour, (v) => `${Math.round(v)} h`, (v) => { hour = v; paint(); }, 'works');
  const play = player(clock, ctx, { seconds: 16 });
  f.controls.append(play.node, clock.node);
  paint();
  return f.node;
});

// ---- A year of lowest lows (still) -----------------------------------------------------------

export const yearStill = () => {
  const s = still(W, 286);
  const x0 = 50;
  const w = 340;
  const y0 = 22;
  const h = 210;
  const X = (d: number) => x0 + (d / 365) * w;
  const Y = (hr: number) => y0 + h - (hr / 24) * h;
  const days = yearOfLows();
  const band: P[] = [];
  for (let d = 0; d <= 365; d += 5) band.push([X(d), Y(daylight(d)[1])]);
  for (let d = 365; d >= 0; d -= 5) band.push([X(d), Y(daylight(d)[0])]);
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const parts: SVGElement[] = [
    svg('rect', { x: x0, y: y0, width: w, height: h, fill: tint(COL.salt, 0.12) }),
    svg('path', { d: `M${band.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L')}Z`, fill: tint(COL.sun, 0.3) }),
    ...[0, 6, 12, 18, 24].map((hr) => small(x0 - 4, Y(hr) + 3, hr === 0 || hr === 24 ? 'midnight' : hr === 12 ? 'noon' : `${hr}:00`, { anchor: 'end', soft: true })),
    ...[0, 12].map((hr) => line(x0, Y(hr), x0 + w, Y(hr), COL.grid, 1)),
    ...months.map((m, i) => small(X(i * 30.4 + 15), y0 + h + 13, m, { anchor: 'middle', soft: true })),
    ...days.map((d) => d.height < 0
      ? svg('circle', { cx: X(d.day + 0.5), cy: Y(d.hour), r: 1.6 + Math.min(3, -d.height * 4), fill: COL.salt })
      : svg('circle', { cx: X(d.day + 0.5), cy: Y(d.hour), r: 1.2, fill: COL.soft, opacity: 0.6 })),
    label(x0, 14, "Each day's lowest low at Seattle, by time of day", { bold: true }),
    svg('circle', { cx: x0 + 4, cy: 262, r: 4, fill: COL.salt }),
    small(x0 + 12, 265, 'minus tide (below the tables\' zero)'),
    svg('circle', { cx: x0 + 4, cy: 278, r: 1.4, fill: COL.soft }),
    small(x0 + 12, 281, 'other days'),
    svg('rect', { x: x0 + 196, y: 257, width: 12, height: 9, fill: tint(COL.sun, 0.45) }),
    small(x0 + 212, 265, 'daylight'),
    small(x0 + 196, 281, 'sun time: noon = Sun highest', { soft: true }),
  ];
  s.svg.append(...parts);
  return { node: s.node };
};

export const figures: Record<string, FigureFactory> = {
  'inequality-tilt': tiltFigure,
  'inequality-beat': beatFigure,
  'inequality-sum': sumFigure,
  'inequality-machine': machineFigure,
  'inequality-year': yearStill,
};
