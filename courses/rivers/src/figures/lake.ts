// Lesson 6, Why the bottom of the lake stays cold: the density of fresh water
// by temperature (a still), Lake Washington's temperatures by depth through a
// year with the wind as a cause, and a seiche: the surface and the thermocline
// tilted by the wind and sloshing after it drops.

import { svg } from 'didactics/dom';
import { arrow, line, redraw, small, still } from 'didactics/draw';
import { COL, axes, figure, frame, guessFirst, pick, player, slider, tint, type FigureFactory } from './kit';

const W = 400;

/**
 * The density of fresh water at `t` °C, in kilograms per cubic metre (grams
 * per litre): the Thiesen, Scheel and Diesselhorst formula, good from 0 to
 * 40 °C. Densest at 3.98 °C.
 */
export function density(t: number): number {
  return 999.972 * (1 - ((t + 288.9414) / (508929.2 * (t + 68.12963))) * (t - 3.9863) ** 2);
}

/** A colour from cold (6 °C and below) to warm (22 °C and above). */
export function tempColor(t: number): string {
  const k = Math.max(0, Math.min(1, (t - 6) / 16));
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(COL.cold), p(COL.warm)];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
}

const F = (c: number) => Math.round((c * 9) / 5 + 32);

// ---- Density by temperature (still) -----------------------------------------------------------------

export const densityStill = () => {
  const s = still(W, 250);
  const ax = axes({
    x: 58, y: 24, w: 320, h: 180, xmin: 0, xmax: 25, ymin: 997, ymax: 1000.2,
    xticks: [0, 4, 10, 15, 20, 25], yticks: [997, 998, 999, 1000],
    xfmt: (v) => `${v} °C`, yfmt: (v) => `${v}`,
    ylabel: 'grams per litre', xlabel: 'temperature', ink: COL.ink, grid: COL.grid,
  });
  const pts: [number, number][] = Array.from({ length: 101 }, (_, i) => [i / 4, density(i / 4)]);
  const mark = (t: number, text: string, color: string, dy: number, end = false) => [
    svg('circle', { cx: ax.X(t), cy: ax.Y(density(t)), r: 4.5, fill: color, stroke: '#fff', 'stroke-width': 1.2 }),
    small(ax.X(t) + (end ? -8 : 8), ax.Y(density(t)) + dy, text, { anchor: end ? 'end' : undefined, bold: true, fill: color }),
  ];
  s.svg.append(
    ...ax.parts,
    ax.path(pts, COL.water, 2.5),
    ...mark(3.98, 'densest, 4 °C', COL.ink, -8),
    ...mark(7, 'bottom, 7 °C', COL.cold, 20, true),
    ...mark(22, 'top, 22 °C', COL.warm, 4, true),
    line(ax.X(4), ax.Y(density(4)), ax.X(5), ax.Y(density(5)), COL.ink, 1),
    small(ax.X(0.3), ax.Y(997.2), 'ice: 917, far below', { soft: true }),
    small(ax.X(12.5), 244, 'Each degree matters more the warmer the water: the curve steepens.', { anchor: 'middle', soft: true }),
  );
  return { node: s.node };
};

// ---- Lake Washington through a year -------------------------------------------------------------------

/** The lake's greatest depth, metres. */
export const DEPTH = 65;

/** The surface temperature (°C) in the middle of each month, January first: a rough fit to Lake Washington. */
export const SURFACE = [7.4, 6.9, 7.3, 9.5, 13.5, 17.5, 20.5, 22, 19.5, 15.5, 11.5, 8.8];

/** The surface temperature at month `m` (0 = 1 January, 12 = 31 December), smoothly between the monthly values. */
export function surfaceTemp(m: number): number {
  const x = ((m - 0.5) % 12 + 12) % 12;
  const i = Math.floor(x);
  const k = x - i;
  const a = SURFACE[i];
  const b = SURFACE[(i + 1) % 12];
  return a + (b - a) * (1 - Math.cos(Math.PI * k)) / 2;
}

/**
 * How deep the wind mixes, metres, when the stirred top layer is at `top` °C
 * and the water under it at `bottom` °C, for a wind of `wind` metres a second.
 * The wind's stirring goes with its speed to the 3/2 power, and the work of
 * lifting the cold water with the square root of the density difference, so
 * depth ∝ wind^1.5 / √Δρ; calibrated to about 10 m in August at 5 m/s. Mixed
 * through (the full depth) when the top is as dense as the bottom or denser.
 */
export function mixedDepth(top: number, bottom: number, wind: number): number {
  const d = density(bottom) - density(top);
  if (d <= 0) return DEPTH;
  return Math.max(1.5, Math.min(DEPTH, (1.25 * wind ** 1.5) / Math.sqrt(d)));
}

export interface LakeState {
  month: number;
  top: number;
  bottom: number;
  /** Depth of the stirred layer, metres; DEPTH when the lake is mixed through. */
  mixed: number;
}

/**
 * A year of the lake in steps of `dt` months, starting mixed on 1 January.
 * While mixed, the whole lake follows the surface; once layered, the bottom
 * keeps its temperature, warming only very slowly.
 */
export function lakeYear(wind: number, dt = 0.02): LakeState[] {
  const out: LakeState[] = [];
  let bottom = surfaceTemp(0);
  let last = bottom;
  for (let i = 0; i * dt <= 12 + 1e-9; i++) {
    const m = i * dt;
    const top = surfaceTemp(m);
    let mixed = mixedDepth(top, bottom, wind);
    if (mixed >= DEPTH) {
      // Mixed through: cooling sinks to the bottom at once, while warming is
      // shared with the whole depth, so the deep water warms only a seventh as fast.
      bottom = top <= bottom ? top : bottom + Math.max(0, top - last) / 7;
      mixed = top - bottom < 0.05 ? DEPTH : mixedDepth(top, bottom, wind);
    } else bottom += 0.12 * dt;
    last = top;
    out.push({ month: m, top: mixed >= DEPTH ? bottom : top, bottom, mixed });
  }
  return out;
}

/** The temperature at depth `z` metres. */
export function tempAt(s: LakeState, z: number): number {
  if (s.mixed >= DEPTH) return s.top;
  const w = Math.max(1.5, 0.25 * s.mixed);
  return s.bottom + (s.top - s.bottom) * 0.5 * (1 - Math.tanh((z - s.mixed) / w));
}

/** The first month of autumn (after August) when the lake is mixed through, or -1. */
export function mixingMonth(year: LakeState[]): number {
  const s = year.find((x) => x.month > 8 && x.mixed >= DEPTH);
  return s ? s.month : -1;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const when = (m: number) => {
  const i = Math.min(11, Math.floor(m));
  const part = m - i;
  return `${part < 0.33 ? 'early' : part < 0.67 ? 'mid' : 'late'} ${MONTHS[i]}`;
};

export const yearFigure = figure(['mixed'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let wind = 5;
  let month = 7.5;
  let year = lakeYear(wind);
  let sawLayers = false;
  const ax = axes({
    x: 250, y: 34, w: 136, h: 190, xmin: 4, xmax: 24, ymin: -DEPTH, ymax: 0,
    xticks: [5, 10, 15, 20], yticks: [0, -20, -40, -60], xfmt: (v) => `${v}°`, yfmt: (v) => `${-v} m`,
    xlabel: '°C', ink: COL.ink, grid: COL.grid,
  });
  const paint = () => {
    const s = year[Math.min(year.length - 1, Math.round(month / 0.02))];
    const mixed = s.mixed >= DEPTH;
    // A slice down the lake: a basin, coloured in bands by temperature.
    const x0 = 8;
    const x1 = 228;
    const top = 40;
    const deep = 190;
    const Y = (z: number) => top + (z / DEPTH) * deep;
    const floor = (x: number) => DEPTH * Math.pow(Math.sin((Math.PI * (x - x0)) / (x1 - x0)), 0.6);
    const bands: SVGElement[] = [];
    for (let z = 0; z < DEPTH; z += 2.5) {
      bands.push(svg('rect', { x: x0, y: Y(z), width: x1 - x0, height: Y(2.5) - top + 0.6, fill: tempColor(tempAt(s, z + 1.25)) }));
    }
    const ground = [`M${x0 - 8},${top - 2}`];
    for (let x = x0; x <= x1; x += 4) ground.push(`L${x},${Y(floor(x)).toFixed(1)}`);
    ground.push(`L${x1 + 8},${top - 2} L${x1 + 8},${top + deep + 14} L${x0 - 8},${top + deep + 14} Z`);
    const profile: [number, number][] = Array.from({ length: 66 }, (_, z) => [tempAt(s, z), -z]);
    const windLen = 8 + wind * 6;
    const labels: SVGElement[] = mixed
      ? [small((x0 + x1) / 2, Y(30), 'mixed top to bottom', { anchor: 'middle', bold: true })]
      : [
        small(x0 + 24, Y(Math.min(s.mixed / 2, 8)) + 4, 'epilimnion', { bold: true }),
        line(x0 + 14, Y(s.mixed), x1 - 14, Y(s.mixed), COL.ink, 1, { 'stroke-dasharray': '4 3' }),
        small(x1 - 16, Y(s.mixed) - 4, 'thermocline', { anchor: 'end' }),
        small((x0 + x1) / 2, Y(Math.max(s.mixed + 14, 36)), 'hypolimnion', { anchor: 'middle', bold: true }),
      ];
    redraw(g,
      ...bands,
      svg('path', { d: ground.join(' '), fill: tint(COL.land, 0.9), 'fill-rule': 'evenodd' }),
      line(x0, top, x1, top, COL.water, 1.5),
      ...labels,
      ...(wind > 0 ? [arrow(x0 + 10, 22, x0 + 10 + windLen, 22, COL.wind, 2), small(x0 + 16 + windLen, 26, `wind ${wind} m/s`, { fill: COL.wind })] : [small(x0 + 10, 26, 'no wind', { fill: COL.wind })]),
      small(x1, 14, when(month), { anchor: 'end', bold: true }),
      ...ax.parts,
      ax.path(profile, COL.ink, 2.2),
      svg('circle', { cx: ax.X(s.top), cy: ax.Y(0), r: 3.5, fill: tempColor(s.top) }),
      svg('circle', { cx: ax.X(tempAt(s, DEPTH)), cy: ax.Y(-DEPTH), r: 3.5, fill: tempColor(tempAt(s, DEPTH)) }),
      small(250, 14, 'temperature by depth', { bold: true }),
    );
    if (!open()) return;
    const bot = tempAt(s, DEPTH);
    if (!mixed && month > 5 && month < 10) sawLayers = true;
    f.readout.textContent = mixed
      ? month > 6
        ? `${when(month)}: the top has cooled to the bottom's ${bot.toFixed(1)} °C (${F(bot)} °F), and the whole lake is one temperature. The wind now stirs all 65 metres, and will until spring.`
        : `${when(month)}: mixed top to bottom at ${s.top.toFixed(1)} °C (${F(s.top)} °F). The top and bottom weigh the same, so the wind stirs the whole lake.`
      : `${when(month)}: ${s.top.toFixed(1)} °C (${F(s.top)} °F) at the top, ${bot.toFixed(1)} °C (${F(bot)} °F) at the bottom. The wind mixes the top ${Math.round(s.mixed)} m; below the thermocline the water keeps the temperature it had when the layers set in spring.`;
    if (mixed && month > 9 && sawLayers && t.goal === 'mixed') t.done();
  };
  const ms = slider('Month', 0, 12, 0.02, month, (v) => when(v), (v) => { month = v; paint(); }, 'sun');
  const play = player(ms, ctx, { seconds: 16 });
  const ws = slider('Wind', 0, 12, 1, wind, (v) => `${v} m/s`, (v) => { wind = v; year = lakeYear(wind); paint(); }, 'wind');
  f.controls.append(play.node, ms.node, ws.node);
  const open = guessFirst(t, f, {
    ask: 'In August the lake is layered. When does it next mix from top to bottom?',
    options: ['September, as the air cools', 'Early winter, around December', 'Not until spring'],
    answer: 1,
    sliders: [ms, ws],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A seiche ---------------------------------------------------------------------------------------

/** The model lake: length, mean depth and top-layer thickness in metres, and its two layers' temperatures. */
export const BASIN = { length: 35000, depth: 33, top: 10, warm: 21, cold: 8 } as const;

const G = 9.81;

/** Reduced gravity across the thermocline, m/s²: g times the layers' difference in density over density. */
export const reducedGravity = () => (G * (density(BASIN.cold) - density(BASIN.warm))) / density(BASIN.cold);

/** Periods in hours of the surface seiche and the internal seiche (the first, one-node mode of each). */
export function seichePeriods(): { surface: number; internal: number } {
  const L = BASIN.length;
  const h1 = BASIN.top;
  const h2 = BASIN.depth - BASIN.top;
  const cs = Math.sqrt(G * BASIN.depth);
  const ci = Math.sqrt((reducedGravity() * h1 * h2) / (h1 + h2));
  return { surface: (2 * L) / cs / 3600, internal: (2 * L) / ci / 3600 };
}

/**
 * After a steady wind of `wind` m/s has blown along the lake long enough,
 * how far the surface stands above its level at the downwind end, and how far
 * the thermocline is pushed down there (and up at the other end), in metres.
 * The wind's drag (air density 1.2, drag coefficient 0.0013) balances the
 * tilt: half the lake's length times the stress over ρ g h for each.
 */
export function windSetup(wind: number): { surface: number; thermocline: number } {
  const ustar2 = (1.2 * 0.0013 * wind * wind) / 1000;
  const L = BASIN.length;
  return { surface: (L * ustar2) / (2 * G * BASIN.depth), thermocline: (L * ustar2) / (2 * reducedGravity() * BASIN.top) };
}

const VIEWS = [
  { name: 'The first 3 hours', hours: 3 },
  { name: 'The first 4 days', hours: 96 },
] as const;

export const seicheFigure = figure(['slosh'], (ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let wind = 6;
  let view = 1;
  let hours = 0;
  let sawSwing = false;
  const per = seichePeriods();
  const paint = () => {
    // Until the guess is in, the lake lies flat, so the drawing gives nothing away.
    const set = open() ? windSetup(wind) : { surface: 0, thermocline: 0 };
    const th = Math.min(BASIN.top, set.thermocline);
    const upwell = set.thermocline >= BASIN.top;
    // Each mode is a cosine along the lake, swinging with its period and dying away slowly.
    const surf = set.surface * Math.cos((2 * Math.PI * hours) / per.surface) * Math.exp(-hours / 6);
    const inner = th * Math.cos((2 * Math.PI * hours) / per.internal) * Math.exp(-hours / 80);
    const x0 = 16;
    const x1 = 384;
    const top = 60;
    const Y = (z: number) => top + (z / BASIN.depth) * 140;
    const n = 48;
    const xs = Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n);
    // Shape: up at the downwind (right) end for the surface, down there for the thermocline.
    const shape = (x: number) => -Math.cos((Math.PI * (x - x0)) / (x1 - x0));
    const surfY = (x: number) => top - 200 * surf * shape(x) * (140 / BASIN.depth);
    const thY = (x: number) => Math.max(surfY(x), Y(BASIN.top + inner * shape(x)));
    const warm = `M${xs.map((x) => `${x},${surfY(x).toFixed(1)}`).join(' L')} L${xs.slice().reverse().map((x) => `${x},${thY(x).toFixed(1)}`).join(' L')} Z`;
    const cold = `M${xs.map((x) => `${x},${thY(x).toFixed(1)}`).join(' L')} L${x1},${Y(BASIN.depth)} L${x0},${Y(BASIN.depth)} Z`;
    redraw(g,
      svg('path', { d: cold, fill: tint(COL.cold, 0.75) }),
      svg('path', { d: warm, fill: tint(COL.warm, 0.7) }),
      svg('polyline', { points: xs.map((x) => `${x},${surfY(x).toFixed(1)}`).join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2 }),
      line(x0, top, x1, top, COL.ink, 0.8, { 'stroke-dasharray': '3 3' }),
      line(x0, Y(BASIN.top), x1, Y(BASIN.top), COL.ink, 0.8, { 'stroke-dasharray': '3 3' }),
      svg('rect', { x: x0 - 6, y: Y(BASIN.depth), width: x1 - x0 + 12, height: 8, fill: COL.land }),
      line(x0 - 3, top - 30, x0 - 3, Y(BASIN.depth), COL.land, 6),
      line(x1 + 3, top - 30, x1 + 3, Y(BASIN.depth), COL.land, 6),
      ...(hours === 0 && wind > 0 && open() ? [arrow(150, 26, 150 + 12 + wind * 6, 26, COL.wind, 2.5), small(146, 30, `wind ${wind} m/s`, { anchor: 'end', fill: COL.wind })] : [small(146, 30, hours === 0 ? 'no wind' : 'wind dropped', { anchor: 'end', fill: COL.wind })]),
      small(x0 + 4, 46, 'upwind end', { soft: true }),
      small(x1 - 4, 46, 'downwind end', { anchor: 'end', soft: true }),
      small(x1 - 4, 14, hours < 48 ? `${hours.toFixed(1)} hours after` : `${(hours / 24).toFixed(1)} days after`, { anchor: 'end', bold: true }),
      small(W / 2, 224, `35 km long; surface tilt drawn 200× too big; thermocline ${BASIN.top} m down at rest`, { anchor: 'middle', soft: true }),
    );
    if (!open()) return;
    const endS = surf * 100;
    const endT = inner;
    if (view === 1 && hours >= per.internal / 2 && wind >= 3) sawSwing = true;
    f.readout.textContent = wind === 0
      ? 'No wind, no tilt: the surface and the thermocline lie flat, and nothing sloshes.'
      : hours === 0
        ? `After a day of wind the surface stands ${set.surface * 100 < 1 ? `${(set.surface * 1000).toFixed(0)} mm` : `${(set.surface * 100).toFixed(1)} cm`} higher at the downwind end, and the thermocline sits ${th.toFixed(1)} m deeper there and higher at the upwind end.${upwell ? ' At the upwind end it reaches the surface: cold water comes up.' : ''}`
        : view === 0
          ? `The surface sloshes once every ${Math.round(per.surface * 60)} minutes (now ${endS >= 0 ? '+' : ''}${endS.toFixed(1)} cm at the downwind end), but the thermocline has barely started to move.`
          : `The thermocline swings once every ${per.internal.toFixed(0)} hours or so (now ${Math.abs(endT).toFixed(1)} m ${endT >= 0 ? 'down' : 'up'} at the downwind end). The surface settled within hours.`;
    if (sawSwing && t.goal === 'slosh') t.done();
  };
  const ws = slider('Wind for a day before', 0, 12, 1, wind, (v) => `${v} m/s`, (v) => { wind = v; hours = 0; hs.set(0); }, 'wind');
  const hs = slider('Time after it drops', 0, 1, 0.002, 0, (v) => `${Math.round(v * 100)}%`, (v) => { hours = v * VIEWS[view].hours; paint(); }, 'soft');
  const play = player(hs, ctx, { seconds: 12 });
  const vp = pick(VIEWS.map((v) => v.name), view, (i) => { view = i; hs.set(0); });
  f.controls.append(vp.node, ws.node, play.node, hs.node);
  const open = guessFirst(t, f, {
    ask: 'A steady wind blows along a layered lake, piling the surface water up at the downwind end. Where does the thermocline sit deeper?',
    options: ['Deeper upwind', 'Deeper downwind', 'It stays flat'],
    answer: 1,
    sliders: [ws, hs],
    buttons: [...vp.buttons, play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'lake-density': densityStill,
  'lake-year': yearFigure,
  'lake-seiche': seicheFigure,
};
