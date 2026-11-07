// Branch F2, Measuring a creek: the speed of the water down through its depth
// (why an orange's speed is more than the average), a creek's discharge built
// panel by panel from the reader's depths and timing, a gauge's rating curve,
// and a storm going by a small creek and a big river.

import { svg } from 'didactics/dom';
import { arrow, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, pick, player, slider, tint, toggles, type FigureFactory } from './kit';

/** Cubic feet a second in one cubic metre a second. */
export const CFS = 35.315;

const cfs = (m3: number) => {
  const v = m3 * CFS;
  return v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(v >= 10 ? 0 : 1);
};

// ---------------------------------------------------------------------------
// 1. Speed down through the depth: the log profile over a rough bed.

/** ln(depth / roughness length) for the model bed: set so the average is 0.8 of the surface speed. */
const LOGD = 5;

/** Speed at height `z` above the bed, as a fraction of the depth (0 to 1), relative to the surface speed. */
export const profileSpeed = (z: number) => Math.max(0, (LOGD + Math.log(Math.max(z, Math.exp(-LOGD)))) / LOGD);

/** The average of the profile over the whole depth, relative to the surface speed. */
export function profileMean(n = 2000): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += profileSpeed((i + 0.5) / n);
  return s / n;
}

function profileStill() {
  const s = still(400, 210);
  const top = 46;
  const bed = 186;
  const x0 = 70;
  const span = 250;
  const Y = (z: number) => bed - z * (bed - top);
  const mean = profileMean();
  const pts = Array.from({ length: 41 }, (_, i) => i / 40).map((z) => [x0 + span * profileSpeed(z), Y(z)] as [number, number]);
  const zMean = Math.exp(LOGD * (mean - 1));
  s.svg.append(
    svg('rect', { x: 20, y: top, width: 360, height: bed - top, fill: tint(COL.water, 0.18) }),
    svg('rect', { x: 20, y: bed, width: 360, height: 18, fill: tint(COL.sediment, 0.6) }),
    line(20, top, 380, top, COL.water, 2),
    line(x0, top, x0, bed, COL.ink, 1),
    ...[0.95, 0.75, 0.55, 0.35, 0.18, 0.07].map((z) => arrow(x0, Y(z), x0 + span * profileSpeed(z), Y(z), COL.flow, 1.8)),
    svg('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.flow, 'stroke-width': 1.2, 'stroke-dasharray': '3 2' }),
    line(x0 + span * mean, top, x0 + span * mean, bed, COL.ink, 1.2, { 'stroke-dasharray': '5 3' }),
    small(x0 + span * mean - 4, bed - 6, 'average', { anchor: 'end', bold: true }),
    small(x0 + span * mean + 4, bed - 6, `${mean.toFixed(2)} of the surface`, { soft: true }),
    line(x0 - 6, Y(zMean), x0 + span * mean, Y(zMean), COL.ink, 0.8, { 'stroke-dasharray': '2 2' }),
    small(x0 - 8, Y(zMean) + 4, '0.6 down', { anchor: 'end', soft: true }),
    // The orange, riding low: most of it under the surface.
    svg('circle', { cx: x0 + span + 26, cy: top + 5, r: 10, fill: tint(COL.flow, 0.35), stroke: COL.ink, 'stroke-width': 1 }),
    small(x0 + span + 26, top - 12, 'orange', { anchor: 'middle', bold: true }),
    small(x0 + 4, top - 8, 'surface: fastest', { fill: COL.flow }),
    small(x0 + 4, bed + 13, 'bed: friction holds the water back', { fill: COL.ink }),
    small(24, top + 14, 'depth', { soft: true }),
  );
  return { node: s.node };
}

// ---------------------------------------------------------------------------
// 2. A creek's discharge, panel by panel (the midsection method). Six points
// half a metre apart across a 3 m creek; the speed at each grows with its
// depth (as d^(2/3), Manning's rule), scaled so the deepest point's average
// speed is 0.8 of the orange's.

export const WIDTH = 3;
export const PANEL = 0.5;
export const STATIONS = [0.25, 0.75, 1.25, 1.75, 2.25, 2.75];
/** A summer measurement, cm: shallow at the banks, deepest just right of the middle. */
export const SUMMER_CM = [6, 16, 30, 34, 20, 8];
/** The orange's time over 10 m in summer, s. */
export const SUMMER_S = 25;

export interface Section { q: number[]; v: number[]; area: number; total: number; quick: number; middle: number }

/** Discharge through each panel (m³/s) from depths `d` (m) at the stations and the orange's surface speed (m/s). */
export function section(d: readonly number[], surface: number): Section {
  const dmax = Math.max(...d, 1e-6);
  const v = d.map((x) => 0.8 * surface * Math.pow(x / dmax, 2 / 3));
  const q = d.map((x, i) => PANEL * x * v[i]);
  const total = q.reduce((a, b) => a + b, 0);
  const area = d.reduce((a, b) => a + PANEL * b, 0);
  const meanDepth = area / WIDTH;
  return { q, v, area, total, quick: 0.8 * surface * WIDTH * meanDepth, middle: total ? (q[2] + q[3]) / total : 0 };
}

const sectionFig = figure(['storm'], (_ctx, t) => {
  const W = 400;
  const f = frame(W, 210, 4);
  const g = svg('g');
  f.svg.append(g);
  const depths = SUMMER_CM.slice();
  let rise = 0;
  let time = SUMMER_S;
  let at = 3;
  const summer = section(SUMMER_CM.map((c) => c / 100), 10 / SUMMER_S).total;
  const X = (m: number) => 40 + (m / WIDTH) * 320;
  const surf = 70;
  const per = 120; // px per metre of depth
  const paint = () => {
    const d = depths.map((c) => (c + rise) / 100);
    const sec = section(d, 10 / time);
    const level = surf - (rise / 100) * per;
    const bedPts: [number, number][] = [[X(0), level], ...STATIONS.map((s, i) => [X(s), surf + (depths[i] / 100) * per] as [number, number]), [X(WIDTH), level]];
    const bed = `M ${X(0) - 20} ${level - 10} L ${bedPts.map((p) => p.join(' ')).join(' L ')} L ${X(WIDTH) + 20} ${level - 10} L ${X(WIDTH) + 20} 200 L ${X(0) - 20} 200 Z`;
    const top = Math.max(...sec.q);
    const parts: SVGElement[] = [];
    STATIONS.forEach((s, i) => {
      const x = X(s - PANEL / 2);
      const h = d[i] * per;
      parts.push(svg('rect', { x, y: level, width: X(PANEL) - X(0), height: h, fill: tint(COL.water, 0.15 + 0.6 * (top ? sec.q[i] / top : 0)), stroke: COL.water, 'stroke-width': 0.6 }));
      parts.push(small(X(s), level - 6, `${Math.round((100 * sec.q[i]) / (sec.total || 1))}%`, { anchor: 'middle', bold: i === 2 || i === 3 }));
      parts.push(line(X(s), level, X(s), level + h, i === at ? COL.ink : tint(COL.ink, 0.4), i === at ? 2.2 : 1));
      parts.push(small(X(s), Math.min(198, level + h + 12), String(i + 1), { anchor: 'middle', bold: i === at, soft: i !== at }));
    });
    redraw(g,
      ...parts,
      svg('path', { d: bed, fill: tint(COL.sediment, 0.55), stroke: COL.sediment, 'stroke-width': 1.2 }),
      line(X(0), level, X(WIDTH), level, COL.water, 2),
      line(X(1), 22, X(2), 22, COL.ink, 1.2),
      line(X(1), 18, X(1), 26, COL.ink, 1.2),
      line(X(2), 18, X(2), 26, COL.ink, 1.2),
      small(X(1.5), 15, 'middle third', { anchor: 'middle', soft: true }),
      small(X(0), 15, '3 m across', { soft: true }),
    );
    if (!open()) return;
    const times = summer ? sec.total / summer : 0;
    f.readout.textContent = `Panel by panel: ${sec.area.toFixed(2)} m² of water, ${sec.total.toFixed(2)} m³/s (${Math.round(sec.total * 1000)} litres a second, ${cfs(sec.total)} cfs). `
      + `The middle third carries ${Math.round(sec.middle * 100)}%. `
      + `The quick rule, 0.8 × speed × width × mean depth, gives ${sec.quick.toFixed(2)} m³/s. `
      + (times > 1.05 ? `That is ${times.toFixed(1)} times the summer flow.` : '');
    if (rise >= 20 && time <= 8) t.done();
  };
  const dep = slider('Depth here', 0, 60, 1, depths[at], (v) => `${v} cm`, (v) => { depths[at] = v; paint(); }, 'water');
  const chips = pick(STATIONS.map((_, i) => `Point ${i + 1}`), at, (i) => { at = i; dep.set(depths[i]); });
  const up = slider('Water higher by', 0, 40, 1, 0, (v) => `${v} cm`, (v) => { rise = v; paint(); }, 'water');
  const tm = slider('Orange over 10 m', 4, 60, 0.5, time, (v) => `${v} s`, (v) => { time = v; paint(); }, 'flow');
  f.controls.append(chips.node, dep.node, up.node, tm.node);
  const open = guessFirst(t, f, {
    ask: 'In this creek, what share of the water goes through the middle third of its width?',
    options: ['About a third', 'About half', 'About two thirds'],
    answer: 2,
    sliders: [dep, up, tm],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// 3. A rating curve: discharge from stage, Q = C (h − e)^b, where e is the
// stage at which the water stops flowing over the gravel bar below the gauge.

export interface Rating { C: number; e: number; b: number }

/** A model river gauge, about the size of a big Puget Sound river. */
export const RIVER: Rating = { C: 120, e: 2, b: 1.9 };
/** The same gauge after a flood has built up the gravel bar that controls it. */
export const SHIFTED: Rating = { C: 120, e: 2.6, b: 1.9 };
/** A model city creek. */
export const CREEK: Rating = { C: 5, e: 0.5, b: 2.5 };

/** Discharge in cfs at stage `h` ft. */
export const rate = (r: Rating, h: number) => (h <= r.e ? 0 : r.C * Math.pow(h - r.e, r.b));
/** Stage in ft for a discharge in cfs. */
export const stageFor = (r: Rating, q: number) => r.e + Math.pow(Math.max(0, q) / r.C, 1 / r.b);

/** Field measurements, as a hydrographer's visits would leave them: stage ft, cfs. */
export const MEASURED: readonly [number, number][] = [[3.1, 140], [3.7, 330], [4.4, 610], [5.2, 1180], [6.6, 2150], [7.9, 3510], [9.8, 6200], [12.4, 10800], [15.8, 17900]];
export const MEASURED_AFTER: readonly [number, number][] = [[4.0, 240], [6.1, 1400], [8.3, 3300]];

const ratingFig = figure(['rating'], (_ctx, t) => {
  const W = 400;
  const f = frame(W, 290, 3);
  const g = svg('g');
  f.svg.append(g);
  let h = 4;
  let shifted = false;
  let high = false;
  let sawShift = false;
  const ax = axes({ x: 50, y: 112, w: 330, h: 140, xmin: 2, xmax: 20, ymin: 0, ymax: 30000, xticks: [2, 5, 8, 11, 14, 17, 20], yticks: [0, 10000, 20000, 30000], yfmt: (v) => (v ? `${v / 1000}k` : '0'), xlabel: 'stage, ft', ylabel: 'discharge, cfs', ink: COL.ink, grid: COL.grid });
  const curveOf = (r: Rating) => Array.from({ length: 181 }, (_, i) => 2 + i * 0.1).map((s) => [s, rate(r, s)] as [number, number]);
  const sy = (ft: number) => 92 - ft * 3.6;
  const paint = () => {
    const r = shifted ? SHIFTED : RIVER;
    const q = rate(r, h);
    // The channel at the gauge: a bed, banks and a floodplain.
    const chan: [number, number][] = [[0, 22], [28, 21], [40, 14], [52, 2.6], [60, 2], [86, 2.4], [96, 14], [108, 15], [136, 16]];
    const cx = (m: number) => 40 + m * 2.4;
    const ground = `M ${cx(0)} ${sy(-1)} ` + chan.map(([m, ft]) => `L ${cx(m)} ${sy(ft)}`).join(' ') + ` L ${cx(136)} ${sy(-1)} Z`;
    redraw(g,
      svg('rect', { x: cx(0), y: sy(h), width: cx(136) - cx(0), height: sy(-1) - sy(h), fill: tint(COL.water, 0.5) }),
      svg('path', { d: ground, fill: tint(COL.sediment, 0.7), stroke: COL.sediment, 'stroke-width': 1 }),
      line(cx(0), sy(h), cx(136), sy(h), COL.water, 1.8),
      small(cx(136), sy(h) - 4, `stage ${h.toFixed(1)} ft`, { anchor: 'end', bold: true, fill: COL.water }),
      small(cx(0), 12, 'The channel at the gauge', { soft: true }),
      ...ax.parts,
      ax.path(curveOf(RIVER), COL.model, shifted ? 1.2 : 2.2, shifted ? { 'stroke-dasharray': '4 3' } : {}),
      ...(shifted ? [ax.path(curveOf(SHIFTED), COL.model, 2.2)] : []),
      ...ax.dots(MEASURED.slice(), COL.data, 3),
      ...(shifted ? ax.dots(MEASURED_AFTER.slice(), COL.flow, 3.5) : []),
      line(ax.X(h), ax.Y(0), ax.X(h), ax.Y(Math.min(q, 30000)), COL.water, 1, { 'stroke-dasharray': '2 2' }),
      svg('circle', { cx: ax.X(h), cy: ax.Y(Math.min(q, 30000)), r: 4.5, fill: COL.water }),
      small(58, 126, 'dots: measured by hand', { soft: true }),
      shifted ? small(58, 140, 'orange dots: measured after the flood', { fill: COL.flow }) : null,
    );
    if (!open()) return;
    if (h >= 8) high = true;
    if (shifted) sawShift = true;
    const old = rate(RIVER, h);
    f.readout.textContent = `Stage ${h.toFixed(1)} ft: ${Math.round(q).toLocaleString('en-US')} cfs (${Math.round(q / CFS)} m³/s). `
      + (shifted
        ? `With the gravel bar built up, the old curve would say ${Math.round(old).toLocaleString('en-US')} cfs, ${Math.round((old / q - 1) * 100)}% too much, until a hydrographer measures again.`
        : `That is ${(q / rate(RIVER, 4)).toFixed(1)} times the flow at 4 ft. Each dot is a day a hydrographer measured the flow by hand.`);
    if (high && sawShift) t.done();
  };
  const s = slider('Stage', 2.5, 20, 0.1, h, (v) => `${v.toFixed(1)} ft`, (v) => { h = v; paint(); }, 'water');
  const sh = toggles(['After a flood: gravel bar built up'], [false], (v) => { shifted = v[0]; paint(); });
  f.controls.append(s.node, sh.node);
  const open = guessFirst(t, f, {
    ask: 'The river at this gauge rises from 4 ft to 8 ft. How does its discharge change?',
    options: ['About double', 'About eight times', 'The same added for every foot'],
    answer: 1,
    sliders: [s],
    buttons: sh.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// 4. A storm going by: rain over three days, and the flow at a gauge on a
// small city creek and on a big river. Each basin is a cascade of linear
// reservoirs (Nash's unit hydrograph): the water from the far parts of a big
// basin takes many hours to arrive.

export interface Basin { name: string; /** km² */ area: number; /** share of rain that runs off */ runoff: number; /** reservoirs */ n: number; /** hours each */ k: number; /** cfs between storms */ base: number; rating: Rating }

export const BASINS: readonly Basin[] = [
  { name: 'City creek', area: 30, runoff: 0.12, n: 2, k: 0.7, base: 6, rating: CREEK },
  { name: 'Big river', area: 1500, runoff: 0.5, n: 3, k: 5, base: 1200, rating: RIVER },
];

/** Hours on the chart: 00:00 Monday to 00:00 Thursday. */
export const HOURS = 72;
/** Rain over the basin, mm an hour, at hour `h`: a front on Monday night, then the heaviest rain on Tuesday evening. */
export const rainAt = (h: number) => 6 * Math.exp(-(((h - 44) / 6) ** 2)) + 2.5 * Math.exp(-(((h - 33) / 3) ** 2));

/** Flow at the gauge in cfs, hour by hour from 0 to HOURS. */
export function hydrograph(b: Basin, step = 0.25): number[] {
  const n = Math.round(HOURS / step) + 1;
  // Nash kernel: t^(n-1) e^(-t/k) / (k^n (n-1)!), in 1/h.
  const fact = [1, 1, 2, 6, 24][b.n - 1];
  const kern = Array.from({ length: n }, (_, i) => {
    const tt = i * step;
    return (Math.pow(tt, b.n - 1) * Math.exp(-tt / b.k)) / (Math.pow(b.k, b.n) * fact);
  });
  const rain = Array.from({ length: n }, (_, i) => rainAt(i * step));
  return Array.from({ length: n }, (_, i) => {
    let s = 0;
    for (let j = 0; j <= i; j++) s += rain[j] * kern[i - j] * step;
    // mm/h over km² → m³/s: × 1000 / 3600.
    return b.base + (b.runoff * s * b.area * 1000) / 3600 * CFS;
  });
}

/** The hour of the peak flow. */
export function peakHour(b: Basin): number {
  const q = hydrograph(b);
  return (q.indexOf(Math.max(...q)) * HOURS) / (q.length - 1);
}

const DAYNAMES = ['Mon', 'Tue', 'Wed', 'Thu'];
const when = (h: number) => `${DAYNAMES[Math.min(3, Math.floor(h / 24))]} ${String(Math.floor(h % 24)).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;

const stormFig = figure(['storm'], (ctx, t) => {
  const W = 400;
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let which = 1;
  let now = 24;
  const ended = new Set<number>();
  const series = BASINS.map((b) => hydrograph(b));
  const peaks = BASINS.map((b) => peakHour(b));
  const rainAx = axes({ x: 46, y: 18, w: 334, h: 46, xmin: 0, xmax: HOURS, ymin: 0, ymax: 7, xticks: [], yticks: [0, 6], ylabel: 'rain, mm an hour', ink: COL.ink, grid: COL.grid });
  const paint = () => {
    const b = BASINS[which];
    const q = series[which];
    const top = Math.max(...q) * 1.15;
    const nice = top > 5000 ? Math.ceil(top / 10000) * 10000 : top > 100 ? Math.ceil(top / 100) * 100 : Math.ceil(top / 10) * 10;
    const ax = axes({ x: 46, y: 96, w: 334, h: 118, xmin: 0, xmax: HOURS, ymin: 0, ymax: nice, xticks: [0, 24, 48, 72], xfmt: (v) => DAYNAMES[v / 24], yticks: [0, nice / 2, nice], yfmt: (v) => (v >= 1000 ? `${v / 1000}k` : String(v)), ylabel: 'discharge at the gauge, cfs', ink: COL.ink, grid: COL.grid });
    const step = HOURS / (q.length - 1);
    const upto = Math.floor(now / step);
    const bars: SVGElement[] = [];
    for (let h = 0; h < HOURS; h += 1) {
      const r = rainAt(h + 0.5);
      bars.push(svg('rect', { x: rainAx.X(h), y: rainAx.Y(r), width: rainAx.X(1) - rainAx.X(0) - 0.4, height: rainAx.Y(0) - rainAx.Y(r), fill: h < now ? COL.rain : tint(COL.rain, 0.3) }));
    }
    const qNow = q[Math.min(upto, q.length - 1)];
    redraw(g,
      ...rainAx.parts,
      ...bars,
      ...ax.parts,
      ax.path(q.slice(0, upto + 1).map((v, i) => [i * step, v]), COL.water, 2.2),
      line(ax.X(now), rainAx.Y(7), ax.X(now), ax.Y(0), COL.ink, 1),
      svg('circle', { cx: ax.X(now), cy: ax.Y(qNow), r: 4, fill: COL.water }),
      small(380, 246, b.name + ' (model)', { anchor: 'end', bold: true }),
    );
    if (!open()) return;
    const rising = q[Math.min(upto + 2, q.length - 1)] > qNow;
    const passed = now >= peaks[which];
    f.readout.textContent = `${when(now)}. Rain ${rainAt(now).toFixed(1)} mm an hour. ${b.name}: ${Math.round(qNow).toLocaleString('en-US')} cfs, stage ${stageFor(b.rating, qNow).toFixed(1)} ft, ${rising ? 'rising' : 'falling'}. `
      + (passed ? `It peaked at ${when(peaks[which])}, ${Math.round(peaks[which] - 44)} hours after the heaviest rain.` : '');
    if (now >= HOURS - 0.5) ended.add(which);
    if (ended.has(1) && ended.has(0)) t.done();
  };
  const s = slider('Time', 0, HOURS, 0.25, now, when, (v) => { now = v; paint(); }, 'water');
  const p = player(s, ctx, { seconds: 15 });
  const chips = pick(BASINS.map((b) => b.name), which, (i) => { which = i; paint(); });
  f.controls.append(chips.node, p.node, s.node);
  const open = guessFirst(t, f, {
    ask: 'The rain is heaviest on Tuesday at 20:00. When does the big river peak at its gauge?',
    options: ['With the rain', 'Half a day later', 'Three days later'],
    answer: 1,
    sliders: [s],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'gauge-profile': profileStill,
  'gauge-section': sectionFig,
  'gauge-rating': ratingFig,
  'gauge-storm': stormFig,
};
