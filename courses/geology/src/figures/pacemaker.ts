// Lesson 15, The pacemaker of the ice ages: how tilt, the orbit's stretch and
// the timing of the closest approach set the summer sunshine at 65° N; and the
// deep-sea record (LR04), tested against cycles of a chosen length.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, type P } from 'didactics/draw';
import { segmented } from 'didactics/ui';
import lr04 from '../data/lr04.json';
import orbit from '../data/orbit.json';
import { COL, figure, frame, player, slider } from './kit';

const W = 400;

// ---- Summer sunshine at 65° N ---------------------------------------------------------

const S0 = 1361;
const LAT = (65 * Math.PI) / 180;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Average sunshine over the day of the June solstice at 65° N, W/m², for an
 * axial tilt `tilt` (degrees), eccentricity `e`, and the Earth closest to the
 * Sun in month `peri` (0 = January).
 */
export function juneSun(tilt: number, e: number, peri: number): number {
  const d = (tilt * Math.PI) / 180;
  const h0 = Math.acos(Math.max(-1, Math.min(1, -Math.tan(LAT) * Math.tan(d))));
  // Angle around the orbit from the closest approach to the June solstice.
  const v = ((5.6 - peri) / 12) * 2 * Math.PI;
  const near = ((1 + e * Math.cos(v)) / (1 - e * e)) ** 2;
  return (S0 / Math.PI) * near * (h0 * Math.sin(LAT) * Math.sin(d) + Math.cos(LAT) * Math.cos(d) * Math.sin(h0));
}
export const TODAY = juneSun(23.44, 0.0167, 0);

export const orbitFigure = figure(['cold'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let tilt = 23.44;
  let e = 0.0167;
  let peri = 0;
  const paint = () => {
    const q = juneSun(tilt, e, peri);
    // The orbit from above, its stretch drawn five times larger than it is.
    const a = 78;
    const ee = Math.min(0.9, e * 5);
    const b = a * Math.sqrt(1 - ee * ee);
    const cx = 110;
    const cy = 96;
    const sunX = cx - a * ee; // the Sun at one focus; closest approach is at the left
    const v = ((5.6 - peri) / 12) * 2 * Math.PI;
    // Earth's position at the June solstice: angle v from the closest approach.
    const r = (a * (1 - ee * ee)) / (1 + ee * Math.cos(v));
    const ex = sunX - r * Math.cos(v);
    const ey = cy + r * Math.sin(v) * (b / a);
    // The Earth seen side-on, with its tilt, lit from the left.
    const gx = 300;
    const gy = 92;
    const R = 46;
    const tr = (tilt * Math.PI) / 180;
    // In June the north end of the axis leans toward the Sun, on the left.
    const axis: P = [-Math.sin(tr), -Math.cos(tr)];
    const equator: P = [-Math.cos(tr), Math.sin(tr)];
    const at65: P = [gx + R * (Math.cos(LAT) * equator[0] + Math.sin(LAT) * axis[0]), gy + R * (Math.cos(LAT) * equator[1] + Math.sin(LAT) * axis[1])];
    const BX = (w: number) => 30 + ((w - 400) / 200) * 340;
    redraw(g,
      svg('rect', { width: W, height: 200, fill: '#1f2433' }),
      svg('ellipse', { cx, cy, rx: a, ry: b, fill: 'none', stroke: '#8f97b3', 'stroke-width': 1 }),
      svg('circle', { cx: sunX, cy, r: 9, fill: '#f2c14e' }),
      svg('circle', { cx: ex, cy: ey, r: 5, fill: '#5d9fd0' }),
      small(ex, ey - 9, 'Earth in June', { anchor: 'middle', fill: COL.paper, bold: true }),
      small(cx - a + 2, cy + 16, 'closest', { fill: '#c9cde0' }),
      small(8, 14, 'Orbit seen from above; its stretch drawn ×5', { fill: '#8f97b3' }),
      // Side view of the Earth in June: the Sun's light comes from the left.
      svg('circle', { cx: gx, cy: gy, r: R, fill: '#2c4766' }),
      svg('path', { d: `M${gx},${gy - R} A${R},${R} 0 0 0 ${gx},${gy + R} Z`, fill: '#5d9fd0'}),
      line(gx - axis[0] * (R + 14), gy - axis[1] * (R + 14), gx + axis[0] * (R + 14), gy + axis[1] * (R + 14), COL.paper, 1.4),
      svg('circle', { cx: at65[0], cy: at65[1], r: 3.5, fill: COL.heat }),
      small(at65[0] - 6, at65[1] - 4, '65° N', { anchor: 'end', fill: COL.paper, bold: true }),
      small(gx, gy + R + 22, `tilt ${tilt.toFixed(1)}°`, { anchor: 'middle', fill: '#c9cde0' }),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => line(205, 40 + k * 14, 238, 40 + k * 14, '#f2c14e', 1, { opacity: 0.5 })),
      // The sunshine gauge.
      svg('rect', { x: BX(400), y: 166, width: BX(600) - BX(400), height: 8, fill: '#3a4158', rx: 3 }),
      svg('rect', { x: BX(400), y: 166, width: Math.max(0, Math.min(BX(600), BX(q)) - BX(400)), height: 8, fill: '#f2c14e', rx: 3 }),
      line(BX(TODAY), 162, BX(TODAY), 178, COL.paper, 1.5),
      small(BX(TODAY), 158, 'today', { anchor: 'middle', fill: COL.paper }),
      small(BX(400), 188, '400 W/m²', { fill: '#c9cde0' }),
      small(BX(600), 188, '600', { anchor: 'end', fill: '#c9cde0' }),
      label(W - 8, 18, `${Math.round(q)} W/m²`, { anchor: 'end', bold: true, fill: '#f2c14e' }),
    );
    const dq = q - TODAY;
    f.readout.textContent = `Midsummer sunshine at 65° N, averaged over the day: ${Math.round(q)} W/m², ${Math.abs(Math.round(dq))} ${dq >= 0 ? 'more' : 'less'} than today. ${
      q <= 445 ? 'A summer this weak may not melt the last winter’s snow on the northern lands, and ice sheets can start to grow.' : q >= 520 ? 'A summer this strong melts back the ice sheets.' : ''}`;
    if (q <= 445 && t.goal === 'cold') t.done();
  };
  const ts = slider('Tilt of the axis', 22.1, 24.5, 0.05, tilt, (v) => `${v.toFixed(2)}°`, (v) => { tilt = v; paint(); }, 'heat');
  const es = slider('Stretch of the orbit', 0, 0.06, 0.001, e, (v) => (v < 0.005 ? 'a circle' : `eccentricity ${v.toFixed(3)}`), (v) => { e = v; paint(); }, 'old');
  const ps = slider('Closest to the Sun in', 0, 11, 1, peri, (v) => MONTHS[v], (v) => { peri = v; paint(); }, 'water');
  f.controls.append(ts.node, es.node, ps.node);
  paint();
  return f.node;
});

// ---- The deep-sea record, against cycles of a chosen length ------------------------------

const AGE = lr04.age_ka as number[];
const D18 = lr04.d18o as number[];

type Window = 'recent' | 'older';
const WINDOWS: Record<Window, [number, number]> = { recent: [0, 800], older: [1200, 2000] };

/** The record in a window, evened out to 1,000-year steps, with its mean and trend removed. */
function windowed(w: Window): { t: number[]; y: number[] } {
  const [a, b] = WINDOWS[w];
  const t: number[] = [];
  const y: number[] = [];
  let j = 0;
  for (let k = a; k <= b; k += 1) {
    while (j + 1 < AGE.length && AGE[j + 1] < k) j++;
    const f = AGE[j + 1] === AGE[j] ? 0 : (k - AGE[j]) / (AGE[j + 1] - AGE[j]);
    t.push(k);
    y.push(D18[j] + f * (D18[j + 1] - D18[j]));
  }
  const n = t.length;
  const mt = t.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (t[i] - mt) * (y[i] - my); sxx += (t[i] - mt) ** 2; }
  const slope = sxy / sxx;
  return { t, y: y.map((v, i) => v - my - slope * (t[i] - mt)) };
}

/** How well a cycle of `period` thousand years fits the record, 0 to 1, and its phase. */
export function cycleFit(w: Window, period: number): { fit: number; phase: number; amp: number } {
  const { t, y } = windowed(w);
  let c = 0;
  let s = 0;
  let yy = 0;
  for (let i = 0; i < t.length; i++) {
    const a = (2 * Math.PI * t[i]) / period;
    c += y[i] * Math.cos(a);
    s += y[i] * Math.sin(a);
    yy += y[i] * y[i];
  }
  const amp = (2 * Math.hypot(c, s)) / t.length;
  return { fit: Math.min(1, Math.hypot(c, s) / Math.sqrt((yy * t.length) / 2)), phase: Math.atan2(s, c), amp };
}

export const recordFigure = figure(['beat'], (_ctx, t) => {
  const f = frame(W, 190, 3);
  const g = svg('g');
  f.svg.append(g);
  let w: Window = 'recent';
  let period = 60;
  const Y = (d: number) => 30 + ((d - 2.8) / (5.2 - 2.8)) * 120;
  const paint = () => {
    const [a, b] = WINDOWS[w];
    const X = (ka: number) => 30 + ((ka - a) / (b - a)) * 360;
    const pts: string[] = [];
    for (let i = 0; i < AGE.length; i++) if (AGE[i] >= a && AGE[i] <= b) pts.push(`${X(AGE[i]).toFixed(1)},${Y(D18[i]).toFixed(1)}`);
    const { fit, phase, amp } = cycleFit(w, period);
    const mean = D18.filter((_, i) => AGE[i] >= a && AGE[i] <= b).reduce((s, v, _, arr) => s + v / arr.length, 0);
    const wave: string[] = [];
    for (let k = a; k <= b; k += 2) wave.push(`${X(k).toFixed(1)},${Y(mean + amp * Math.cos((2 * Math.PI * k) / period - phase)).toFixed(1)}`);
    const ticks: SVGElement[] = [];
    // A mark at each peak of ice in the fitted cycle.
    for (let n = Math.ceil(((a * 2 * Math.PI) / period - phase) / (2 * Math.PI)); ; n++) {
      const k = ((2 * Math.PI * n + phase) * period) / (2 * Math.PI);
      if (k > b) break;
      if (k >= a) ticks.push(line(X(k), 26, X(k), 156, COL.heat, 0.8, { opacity: 0.35 }));
    }
    redraw(g,
      svg('rect', { width: W, height: 190, fill: COL.paper }),
      ...ticks,
      svg('polyline', { points: wave.join(' '), fill: 'none', stroke: COL.heat, 'stroke-width': 1.5, opacity: 0.7 }),
      svg('polyline', { points: pts.join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 1.3 }),
      small(30, 16, '↑ less ice, warmer', { soft: true }),
      small(30, 172, '↓ more ice, colder', { soft: true }),
      ...[0, 0.25, 0.5, 0.75, 1].map((k) => small(X(a + k * (b - a)), 186, `${Math.round(a + k * (b - a))}`, { anchor: 'middle', soft: true })),
      small(390, 172, 'thousand years ago', { anchor: 'end', soft: true }),
      label(390, 16, `fit ${Math.round(fit * 100)}%`, { anchor: 'end', bold: true, fill: COL.heat, size: 'note' }),
    );
    f.readout.textContent = `A cycle ${period} thousand years long (red) against the oxygen-isotope record from the shells of foraminifera in deep-sea mud (blue). ${fit > 0.45 ? 'A strong fit: the record swings to this beat.' : fit > 0.25 ? 'A partial fit.' : 'A poor fit.'}`;
    if (w === 'older' && Math.abs(period - 41) <= 3 && t.goal === 'beat') t.done();
  };
  const ws = segmented([{ value: 'recent', label: 'Last 800,000 years' }, { value: 'older', label: '1.2 to 2 million years ago' }] as const, 'recent', (v) => { w = v; paint(); });
  const ps = slider('Length of the cycle', 15, 150, 1, period, (v) => `${v} thousand years`, (v) => { period = v; paint(); }, 'heat');
  f.controls.append(ws, ps.node);
  paint();
  return f.node;
});

// ---- The last 800,000 years, played: the orbit, the summer sunshine and the ice ----------

const SPAN = 800;
const ORB_E = orbit.e as number[];
const ORB_TILT = orbit.tilt as number[];
const ORB_PERI = orbit.peri as number[];

/** The orbit `ka` thousand years ago (Laskar 2004), and the midsummer sunshine at 65° N it gives. */
export function orbitAt(ka: number): { e: number; tilt: number; peri: number; sun: number } {
  const k = Math.max(0, Math.min(ORB_E.length - 1, Math.round(ka)));
  const e = ORB_E[k];
  const tilt = ORB_TILT[k];
  const peri = ORB_PERI[k];
  return { e, tilt, peri, sun: juneSun(tilt, e, peri) };
}

/** The LR04 value `ka` thousand years ago, read between its samples. */
export function iceAt(ka: number): number {
  let j = 0;
  while (j + 1 < AGE.length && AGE[j + 1] < ka) j++;
  const f = AGE[j + 1] === AGE[j] ? 0 : Math.max(0, Math.min(1, (ka - AGE[j]) / (AGE[j + 1] - AGE[j])));
  return D18[j] + f * (D18[j + 1] - D18[j]);
}

export const cyclesFigure = figure(['played'], (ctx, t) => {
  const H = 286;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let pos = 0;
  const X = (ka: number) => 30 + ((SPAN - ka) / SPAN) * 360;
  const SY = (q: number) => 196 - ((q - 420) / (570 - 420)) * 56;
  const IY = (d: number) => 214 + ((d - 3.0) / (5.1 - 3.0)) * 56;
  const today = iceAt(0);
  const paint = () => {
    const ka = SPAN - pos;
    const o = orbitAt(ka);
    // The orbit from above (stretch ×5) with the Earth in June, and the Earth side-on with its tilt.
    const a = 46;
    const ee = Math.min(0.9, o.e * 5);
    const b = a * Math.sqrt(1 - ee * ee);
    const cx = 64;
    const cy = 62;
    const sunX = cx - a * ee;
    const v = ((5.6 - o.peri) / 12) * 2 * Math.PI;
    const r = (a * (1 - ee * ee)) / (1 + ee * Math.cos(v));
    const ex = sunX - r * Math.cos(v);
    const ey = cy + r * Math.sin(v) * (b / a);
    const gx = 168;
    const gy = 62;
    const R = 30;
    const tr = (o.tilt * Math.PI) / 180;
    const axis: P = [-Math.sin(tr), -Math.cos(tr)];
    const sun: string[] = [];
    const ice: string[] = [];
    for (let k = SPAN; k >= ka; k -= 1) {
      sun.push(`${X(k).toFixed(1)},${SY(orbitAt(k).sun).toFixed(1)}`);
      ice.push(`${X(k).toFixed(1)},${IY(iceAt(k)).toFixed(1)}`);
    }
    const more = iceAt(ka) - today;
    redraw(g,
      svg('rect', { width: W, height: 124, fill: '#1f2433' }),
      svg('ellipse', { cx, cy, rx: a, ry: b, fill: 'none', stroke: '#8f97b3', 'stroke-width': 1 }),
      svg('circle', { cx: sunX, cy, r: 7, fill: '#f2c14e' }),
      svg('circle', { cx: ex, cy: ey, r: 4, fill: '#5d9fd0' }),
      small(cx, 118, 'orbit from above, ×5', { anchor: 'middle', fill: '#8f97b3' }),
      small(ex, ey - 7, 'June', { anchor: 'middle', fill: COL.paper }),
      svg('circle', { cx: gx, cy: gy, r: R, fill: '#2c4766' }),
      svg('path', { d: `M${gx},${gy - R} A${R},${R} 0 0 0 ${gx},${gy + R} Z`, fill: '#5d9fd0' }),
      line(gx - axis[0] * (R + 10), gy - axis[1] * (R + 10), gx + axis[0] * (R + 10), gy + axis[1] * (R + 10), COL.paper, 1.3),
      small(gx, 118, `tilt ${o.tilt.toFixed(1)}°`, { anchor: 'middle', fill: '#c9cde0' }),
      label(W - 10, 22, ka < 0.5 ? 'Today' : `${Math.round(ka)},000 years ago`, { anchor: 'end', bold: true, fill: COL.paper }),
      small(W - 10, 44, `closest to the Sun in ${MONTHS[Math.floor(o.peri) % 12]}`, { anchor: 'end', fill: '#c9cde0' }),
      small(W - 10, 60, `orbit’s stretch ${o.e.toFixed(3)}`, { anchor: 'end', fill: '#c9cde0' }),
      label(W - 10, 92, `${Math.round(o.sun)} W/m² at 65° N`, { anchor: 'end', bold: true, fill: '#f2c14e', size: 'note' }),
      svg('rect', { y: 124, width: W, height: H - 124, fill: COL.paper }),
      small(30, 138, 'Midsummer sunshine at 65° N (from the orbit)', { bold: true, fill: '#b8860b' }),
      small(30, 208, 'Ice on land (deep-sea record), up = less ice', { bold: true, fill: COL.water }),
      line(30, IY(today), 390, IY(today), COL.grid, 1, { dash: '3 3' }),
      svg('polyline', { points: sun.join(' '), fill: 'none', stroke: '#d4a017', 'stroke-width': 1.3 }),
      svg('polyline', { points: ice.join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 1.5 }),
      line(X(ka), 142, X(ka), 272, COL.heat, 1, { opacity: 0.6 }),
      ...[800, 600, 400, 200, 0].map((k) => small(X(k), 282, k ? `${k}` : 'today', { anchor: k ? 'middle' : 'end', soft: true })),
    );
    f.readout.textContent = ka < 0.5
      ? 'Today. The sunshine has swung up and down about every 20,000 years, fastest of all, while the ice grew slowly over about 90,000 years at a time and then melted in a few thousand: the sawtooth. The orbit sets when a melt can start; the ice and the carbon dioxide decide how big each swing is.'
      : `${Math.round(ka)},000 years ago: tilt ${o.tilt.toFixed(1)}°, closest to the Sun in ${MONTHS[Math.floor(o.peri) % 12]}, so ${Math.round(o.sun)} W/m² of midsummer sunshine at 65° N (${Math.round(TODAY)} today). The ice sheets then held ${more > 0.15 ? 'more ice than today' : more < -0.1 ? 'a little less ice than today' : 'about as much ice as today'}.`;
    if (pos >= SPAN && t.goal === 'played') t.done();
  };
  const ts = slider('Time', 0, SPAN, 1, 0, (v) => (v >= SPAN ? 'today' : `${SPAN - v},000 years ago`), (v) => { pos = v; paint(); }, 'water');
  f.controls.append(player(ts, ctx, { seconds: 24 }).node, ts.node);
  paint();
  return f.node;
});
