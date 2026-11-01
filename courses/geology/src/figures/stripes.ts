// Lesson 9, Stripes on the seafloor: a spreading ridge as a tape recorder.
// New crust at the axis takes the field's direction as it cools; spreading
// carries it away on both sides; the field flips on the timescale below.

import { svg } from 'didactics/dom';
import { line, polyline, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, player, slider } from './kit';

const W = 400;

/** Normal-polarity intervals of the last 5.5 million years, Ma (after Gradstein and others, 2012). */
export const NORMAL: [number, number][] = [
  [0, 0.78], [0.99, 1.07], [1.78, 1.95], [2.58, 3.03], [3.12, 3.21], [3.33, 3.6],
  [4.19, 4.3], [4.49, 4.63], [4.8, 4.9], [5.0, 5.24],
];
export const normalAt = (ma: number) => NORMAL.some(([a, b]) => ma >= a && ma < b);

/** Half-rate of spreading of the Juan de Fuca Ridge, cm a year, roughly. */
const TRUE_RATE = 2.9;
const SPAN = 150; // km each side
const DX = 1; // km

/** Magnetisation along the profile, +1 or -1 (0 where there is no crust yet). */
function crust(rate: number, myr: number): number[] {
  const out: number[] = [];
  const kmPerMyr = rate * 10;
  for (let x = -SPAN; x <= SPAN; x += DX) {
    const age = Math.abs(x) / kmPerMyr;
    if (age > myr) out.push(0);
    else out.push(normalAt(5 - myr + age) ? 1 : -1);
  }
  return out;
}

/** What a ship's magnetometer reads: the stripes blurred by the 2.5 km of water and crust between. */
function anomaly(m: number[]): number[] {
  const h = 4;
  const kernel: number[] = [];
  for (let k = -15; k <= 15; k++) kernel.push(Math.exp(-((k * DX) ** 2) / (2 * h * h)));
  const sum = kernel.reduce((a, b) => a + b, 0);
  return m.map((_, i) => kernel.reduce((acc, w, k) => acc + w * (m[i + k - 15] ?? 0), 0) / sum);
}

// The ship's profile: the true rate, with a little noise.
const SURVEY = anomaly(crust(TRUE_RATE, 5)).map((v, i) => v + 0.08 * Math.sin(i * 0.31) * Math.cos(i * 0.13));

export const ridgeFigure = figure(['matched'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let rate = 6;
  let myr = 5;
  const X = (km: number) => 200 + (km / SPAN) * 185;
  const paint = () => {
    const m = crust(rate, myr);
    const a = anomaly(m);
    const prof = (v: number[], y0: number): P[] => v.map((val, i) => [X(-SPAN + i * DX), y0 - val * 22]);
    const stripes: SVGElement[] = [];
    let start = 0;
    for (let i = 1; i <= m.length; i++) {
      if (i === m.length || m[i] !== m[start]) {
        if (m[start] !== 0) stripes.push(svg('rect', { x: X(-SPAN + start * DX), y: 112, width: X(-SPAN + i * DX) - X(-SPAN + start * DX) + 0.3, height: 26, fill: m[start] > 0 ? '#3b3a48' : '#e8e1d4' }));
        start = i;
      }
    }
    // The timescale, youngest at the left.
    const TX = (ma: number) => 30 + (ma / 5.5) * 345;
    const scale: SVGElement[] = [svg('rect', { x: TX(0), y: 192, width: TX(5.5) - TX(0), height: 12, fill: '#e8e1d4' })];
    for (const [s0, s1] of NORMAL) scale.push(svg('rect', { x: TX(s0), y: 192, width: TX(Math.min(5.5, s1)) - TX(s0), height: 12, fill: '#3b3a48' }));
    for (let ma = 0; ma <= 5; ma++) scale.push(small(TX(ma), 216, `${ma}`, { anchor: 'middle', soft: true }));
    redraw(g,
      svg('rect', { width: W, height: 236, fill: COL.paper }),
      small(10, 14, 'Magnetic field measured by a ship', { soft: true }),
      line(X(-SPAN), 50, X(SPAN), 50, COL.grid, 1),
      polyline(prof(SURVEY, 50), COL.soft, 1.3, { 'stroke-dasharray': '2 2' }),
      polyline(prof(a, 50), COL.heat, 2),
      small(X(SPAN), 92, 'dotted: survey  ·  red: your ridge', { anchor: 'end', soft: true }),
      svg('rect', { x: X(-SPAN), y: 100, width: X(SPAN) - X(-SPAN), height: 12, fill: COL.water, opacity: 0.25 }),
      ...stripes,
      svg('rect', { x: X(-SPAN), y: 138, width: X(SPAN) - X(-SPAN), height: 18, fill: '#7d6a58', opacity: 0.35 }),
      line(X(0), 104, X(0), 160, COL.heat, 1.5, { 'stroke-dasharray': '3 2' }),
      small(X(0), 170, 'ridge axis', { anchor: 'middle', fill: COL.heat, bold: true }),
      small(X(-SPAN), 170, `${SPAN} km`, { soft: true }),
      small(X(SPAN), 170, `${SPAN} km`, { anchor: 'end', soft: true }),
      small(30, 187, 'The field’s direction through time: dark, as today; pale, reversed', { soft: true }),
      ...scale,
      small(375, 228, 'million years ago', { anchor: 'end', soft: true }),
    );
    const match = myr >= 4.95 && Math.abs(rate - TRUE_RATE) <= 0.25;
    f.readout.textContent = myr < 4.95
      ? `${myr.toFixed(1)} million years of spreading at ${rate.toFixed(1)} cm a year on each side. Each band was made at the axis and carried outward; both sides are mirror images.`
      : match
        ? `At ${rate.toFixed(1)} cm a year on each side, your stripes reproduce the survey: the ridge has been spreading at about that rate for 5 million years.`
        : `At ${rate.toFixed(1)} cm a year the stripes are ${rate > TRUE_RATE ? 'too wide' : 'too narrow'} for the survey. The same flips, spread at a different rate, give the same pattern stretched or squeezed.`;
    if (match && t.goal === 'matched') t.done();
  };
  const time = slider('Time spreading', 0, 5, 0.05, myr, (v) => `${v.toFixed(1)} million years`, (v) => { myr = v; paint(); }, 'old');
  const speed = slider('Spreading on each side', 1, 8, 0.05, rate, (v) => `${v.toFixed(1)} cm a year`, (v) => { rate = v; paint(); }, 'heat');
  f.controls.append(player(time, ctx).node, time.node, speed.node);
  paint();
  return f.node;
});
