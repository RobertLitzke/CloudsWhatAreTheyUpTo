// Lesson 3, The falling Moon: how far the Moon falls in a second against an
// apple; Newton's cannon on a mountain; and why the inverse square law, and
// no other, closes an orbit on itself.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { big, COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;
const TAU = Math.PI * 2;

// ---- The Moon falls: a still ----------------------------------------------------------------

export const moonDropStill = () => {
  const s = svg('svg', { viewBox: `0 0 ${W} 200`, class: 'fig-svg', role: 'img' });
  const e: P = [70, 150];
  const R = 300;
  const arc: P[] = [];
  for (let k = -14; k <= 14; k++) {
    const u = -Math.PI / 2 + (k / 100) * 2;
    arc.push([e[0] + R * Math.cos(u) * 0.92 + 230, e[1] + R * Math.sin(u) * 0.36 + 60]);
  }
  const m: P = [300, 54];
  s.append(
    svg('rect', { width: W, height: 200, fill: COL.paper }),
    svg('circle', { cx: e[0], cy: e[1], r: 22, fill: COL.earth }),
    note(e[0], e[1] + 38, 'Earth', { anchor: 'middle', bold: true }),
    // The apple near the ground.
    svg('circle', { cx: e[0] + 30, cy: e[1] - 40, r: 4, fill: COL.planet }),
    line(e[0] + 30, e[1] - 34, e[0] + 30, e[1] - 26, COL.planet, 1.5),
    small(e[0] + 38, e[1] - 38, 'apple: 4.9 m', { fill: COL.planet, bold: true }),
    small(e[0] + 38, e[1] - 26, 'in the first second', { soft: true }),
    line(m[0] - 130, m[1] - 2, m[0] + 90, m[1] + 2, COL.soft, 1.2, { 'stroke-dasharray': '5 4' }),
    small(m[0] + 92, m[1] - 4, 'straight on', { soft: true, anchor: 'end' }),
    svg('path', { d: `M${m[0] - 130},${m[1] + 4} Q${m[0]},${m[1] - 2} ${m[0] + 90},${m[1] + 30}`, fill: 'none', stroke: COL.moon, 'stroke-width': 2 }),
    svg('circle', { cx: m[0] - 40, cy: m[1] + 1, r: 9, fill: COL.moon }),
    note(m[0] - 40, m[1] - 14, 'Moon', { anchor: 'middle', bold: true }),
    line(m[0] + 70, m[1] + 2, m[0] + 70, m[1] + 24, COL.planet, 2),
    small(m[0] + 66, m[1] + 40, 'falls 1.4 mm in a second', { anchor: 'end', fill: COL.planet, bold: true }),
    small(m[0] + 66, m[1] + 52, '(drawn hugely larger)', { anchor: 'end', soft: true }),
    line(e[0], e[1], m[0] - 40, m[1] + 1, COL.ink, 1, { 'stroke-dasharray': '2 3' }),
    small(176, 118, '60 Earth radii', { soft: true }),
    note(200, 190, '60 × 60 = 3,600, and 4.9 m ÷ 3,600 ≈ 1.4 mm', { anchor: 'middle', bold: true }),
  );
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};

// ---- Newton's cannon ------------------------------------------------------------------------

/** The Earth's pull, km³/s², and radius, km. */
const GM = 398600;
const RE = 6371;
/** The mountain-top cannon fires from this far above the ground, km (above the air). */
export const UP = 400;
const R0 = RE + UP;
export const circular = Math.sqrt(GM / R0);
export const escape = Math.sqrt((2 * GM) / R0);

/** The shot's path, km, until it lands, closes a loop or leaves the drawing. */
export function shot(v: number): { path: P[]; landed: boolean; around: number } {
  let x = 0;
  let y = R0;
  let vx = v;
  let vy = 0;
  const path: P[] = [[x, y]];
  const dt = 8;
  let angle = 0;
  let last = Math.atan2(x, y);
  for (let k = 0; k < 40000; k++) {
    const r3 = Math.hypot(x, y) ** 3;
    vx -= (GM * x * dt) / r3 / 2;
    vy -= (GM * y * dt) / r3 / 2;
    x += vx * dt;
    y += vy * dt;
    const r3b = Math.hypot(x, y) ** 3;
    vx -= (GM * x * dt) / r3b / 2;
    vy -= (GM * y * dt) / r3b / 2;
    const a = Math.atan2(x, y);
    let d = a - last;
    if (d < -Math.PI) d += TAU;
    angle += d;
    last = a;
    if (k % 4 === 0) path.push([x, y]);
    const r = Math.hypot(x, y);
    if (r < RE) return { path, landed: true, around: angle * RE };
    if (angle >= TAU || r > 4 * RE) break;
  }
  return { path, landed: false, around: angle * RE };
}

export const cannonFigure = figure(['circle'], (_ctx, t) => {
  const f = frame(W, 260, 3);
  const g = svg('g');
  f.svg.append(g);
  let v = 4;
  const paint = () => {
    const c: P = [200, 140];
    const k = 68 / RE;
    const at = (p: P): P => [c[0] + p[0] * k, c[1] - p[1] * k];
    const s = shot(v);
    const top = at([0, R0]);
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 260, fill: COL.sky }),
      svg('circle', { cx: c[0], cy: c[1], r: RE * k + 4, fill: '#9cc0dd', opacity: 0.25 }),
      svg('circle', { cx: c[0], cy: c[1], r: RE * k, fill: COL.earth }),
      svg('polygon', { points: `${c[0] - 12},${c[1] - RE * k + 4} ${top[0]},${top[1]} ${c[0] + 12},${c[1] - RE * k + 4}`, fill: '#8b8f80' }),
      polyline(s.path.map(at), COL.light, 2),
      svg('circle', { cx: top[0], cy: top[1], r: 3, fill: COL.paper }),
      small(10, 16, 'Mountain drawn far too tall: the cannon is 400 km up, above the air', { fill: '#cfd3e6' }),
    ];
    redraw(g, ...parts);
    const a = 1 / (2 / R0 - (v * v) / GM);
    const near = Math.abs(v - circular) < 0.12;
    f.readout.textContent = v >= escape
      ? `At ${v.toFixed(1)} km/s the ball never comes back. Gravity keeps slowing it, but it weakens so fast with distance that it can never stop the ball. Leaving for good takes ${escape.toFixed(1)} km/s from here.`
      : s.landed
        ? `At ${v.toFixed(1)} km/s the ball falls back to the ground ${big(s.around)} km around the curve. Faster, and the ground curves away beneath it before it lands.`
        : near
          ? `At ${v.toFixed(1)} km/s the ball falls exactly as fast as the ground curves away below it. It never lands: an orbit, once round every ${Math.round((TAU * R0) / v / 60)} minutes.`
          : v > circular
            ? `At ${v.toFixed(1)} km/s the ball swings out on an ellipse, ${big(2 * a - R0 - RE)} km up at its highest, then falls back round to the mountain top and repeats.`
            : `At ${v.toFixed(1)} km/s the ball clears the ground on the far side, dipping to ${big(2 * a - R0 - RE)} km: an ellipse with the mountain at its high point.`;
    if (near && t.goal === 'circle') t.done();
  };
  const s = slider('Speed of the shot', 0, 12, 0.05, v, (x) => `${x.toFixed(2)} km/s`, (x) => { v = x; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: `From 400 km up, a ball fired sideways at ${circular.toFixed(1)} km/s falls round the Earth in a circle. Fire it at 12 km/s, about half as fast again. What happens? Guess first.`,
    options: ['A bigger circle', 'A long ellipse that comes back', 'It leaves for good'],
    answer: 2,
    sliders: [s],
    after: () => {
      v = 12;
      s.set(12);
      paint();
      f.readout.textContent = `${f.readout.textContent} Now find the speed for a circle.`;
    },
  });
  return f.node;
});

// ---- Why the inverse square -----------------------------------------------------------------

/** An orbit when the pull weakens as 1/rⁿ, starting at r = 1 sideways at 0.75 of circular speed. */
export function orbit(n: number): { path: P[]; turn: number | null; fate: 'closed' | 'turns' | 'in' | 'out' } {
  let x = 1;
  let y = 0;
  let vx = 0;
  let vy = 0.75;
  const dt = 0.002;
  const path: P[] = [[x, y]];
  const far: number[] = [];
  let r1 = 1;
  let r2 = 1;
  for (let k = 0; k < 30000; k++) {
    const r = Math.hypot(x, y);
    const acc = 1 / r ** n;
    vx -= (acc * x * dt) / r;
    vy -= (acc * y * dt) / r;
    x += vx * dt;
    y += vy * dt;
    const rn = Math.hypot(x, y);
    if (k % 6 === 0) path.push([x, y]);
    if (rn < 0.06) return { path, turn: null, fate: 'in' };
    if (rn > 3) return { path, turn: null, fate: 'out' };
    if (r1 < r2 && r2 > rn && k > 2) far.push(Math.atan2(y, x));
    r1 = r2;
    r2 = rn;
    if (far.length >= 6) break;
  }
  if (far.length < 2) return { path, turn: null, fate: 'turns' };
  let d = ((far[1] - far[0]) * 180) / Math.PI;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return { path, turn: d, fate: Math.abs(d) < 1.5 ? 'closed' : 'turns' };
}

export const lawFigure = figure(['closed'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 2;
  let tried = false;
  const paint = () => {
    const o = orbit(n);
    const c: P = [200, 120];
    const k = 95;
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 240, fill: COL.paper }),
      polyline(o.path.map(([x, y]) => [c[0] + x * k, c[1] - y * k] as P), COL.planet, 1.4),
      svg('circle', { cx: c[0], cy: c[1], r: 7, fill: COL.sun }),
      svg('circle', { cx: c[0] + k, cy: c[1], r: 3.5, fill: COL.ink }),
      small(c[0] + k + 6, c[1] + 4, 'start', { soft: true }),
    ];
    redraw(g, ...parts);
    const how = Math.abs(n - 2) < 0.03 ? 'the inverse square: twice as far, a quarter the pull' : `twice as far, ${sig(2 ** n, 2)} times weaker`;
    f.readout.textContent = o.fate === 'closed'
      ? `Pull falling off as 1/r${n === 2 ? '²' : `^${n.toFixed(1)}`} (${how}). The planet retraces the same ellipse every time round.`
      : o.fate === 'in'
        ? `Pull falling off as 1/r^${n.toFixed(1)} (${how}). Close in, the pull grows so fast that the planet spirals into the centre.`
        : o.fate === 'out'
          ? `Pull falling off as 1/r^${n.toFixed(1)}: the planet drifts away.`
          : `Pull falling off as 1/r^${n.toFixed(1)} (${how}). The orbit never closes: its far point swings ${sig(Math.abs(o.turn ?? 0), 2)}° ${(o.turn ?? 0) > 0 ? 'forward' : 'back'} each time round, tracing a rosette.`;
    if (Math.abs(n - 2) > 0.2) tried = true;
    if (tried && o.fate === 'closed' && t.goal === 'closed') t.done();
  };
  const s = slider('How fast the pull weakens with distance, n in 1/rⁿ', 1, 3.2, 0.05, n, (v) => v.toFixed(2), (v) => { n = v; paint(); }, 'planet');
  f.controls.append(s.node);
  paint();
  return f.node;
});
