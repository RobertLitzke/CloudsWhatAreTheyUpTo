// Lesson 21, Brighter than a galaxy: a flickering source, smeared by the time
// light takes to cross it; and S2's orbit round the centre of our galaxy, timed
// for the central mass the reader chooses.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;

// ---- The flicker (live) ----------------------------------------------------------------------

/** Days shown, the step, and how far back the hidden flickering goes so a big source has a past to average. */
const SHOW = 120;
const STEP = 0.5;
const BACK = 1000;
/** The true size, light-days, of the source whose light curve is drawn as dots. */
export const QUASAR_SIZE = 4;

/** The flickering at the source itself: sharp bursts at random times, many patches adding up. */
const BURSTS = (() => {
  const rnd = makeRng(273);
  return Array.from({ length: 260 }, () => ({ at: -BACK + rnd() * (BACK + SHOW), size: rnd() ** 2, width: 0.5 + rnd() * 2 }));
})();
const N = Math.round((BACK + SHOW) / STEP);
const RAW = Float64Array.from({ length: N }, (_, i) => {
  const t = -BACK + i * STEP;
  let b = 1;
  for (const u of BURSTS) b += u.size * Math.exp(-(((t - u.at) / u.width) ** 2));
  return b;
});
const SUM = (() => {
  const s = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) s[i + 1] = s[i] + RAW[i];
  return s;
})();

/** What we see at day `t` from a source `days` light-days across: light from its far side left earlier, so it is an average over that time. */
export function seen(t: number, days: number): number {
  const i1 = Math.round((t + BACK) / STEP);
  const i0 = Math.max(0, i1 - Math.max(1, Math.round(days / STEP)));
  return (SUM[i1] - SUM[i0]) / (i1 - i0);
}

/** How much a source of `days` light-days changes over the days shown: the spread of what we see. */
export function flicker(days: number): number {
  const v: number[] = [];
  for (let t = 0; t <= SHOW; t += 1) v.push(seen(t, days));
  return Math.max(...v) / Math.min(...v) - 1;
}

export const flickerFigure = figure(['size'], (_ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let logDays = 2.5;
  let guessed = false;
  const tx = (d: number) => 30 + (d / SHOW) * 360;
  const paint = () => {
    const days = 10 ** logDays;
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    // Scale both curves to their own mean, on a shared axis.
    const mean = (d: number) => {
      let s = 0;
      for (let x = 0; x <= SHOW; x += 2) s += seen(x, d);
      return s / (SHOW / 2 + 1);
    };
    const mq = mean(QUASAR_SIZE);
    const mm = mean(days);
    const by = (rel: number) => 150 - (rel - 1) * 100;
    parts.push(line(30, 150, 390, 150, COL.skyLine, 1), small(392, 146, 'average', { anchor: 'end', fill: '#a9adc2' }));
    for (let d = 0; d <= SHOW; d += 20) parts.push(small(tx(d), 204, `${d}`, { anchor: 'middle', fill: '#a9adc2' }));
    parts.push(small(390, 218, 'days', { anchor: 'end', fill: '#a9adc2' }));
    for (let d = 0; d <= SHOW; d += 3) parts.push(svg('circle', { cx: tx(d), cy: Math.max(30, by(seen(d, QUASAR_SIZE) / mq)), r: 2.2, fill: '#ece6d8' }));
    const curve: P[] = [];
    for (let d = 0; d <= SHOW; d += 0.5) curve.push([tx(d), Math.max(30, by(seen(d, days) / mm))]);
    parts.push(polyline(curve, COL.light, 2));
    parts.push(note(14, 20, 'Brightness of a quasar (dots) and of your source (line)', { bold: true, fill: '#ece6d8' }));
    redraw(g, ...parts);
    if (!guessed) return;
    const match = Math.abs(Math.log10(days / QUASAR_SIZE)) < 0.3;
    f.readout.textContent = match
      ? `About ${sig(days, 1)} light-days across, about ten times the width of Neptune’s orbit, and the curves match. Something smaller than that is outshining a whole galaxy.`
      : `${sig(days, 2)} light-days across: light from the far side left ${sig(days, 2)} days before light from the near side, so every flicker is smeared over ${sig(days, 2)} days. ${days > QUASAR_SIZE ? 'Too smooth: make it smaller.' : 'Sharper than the quasar: a little bigger.'}`;
    if (match && t.goal === 'size') t.done();
  };
  const s = slider('Size of the source', 0, 3, 0.01, logDays, (v) => `${sig(10 ** v, 2)} light-days`, (v) => { logDays = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'A source made of many glowing patches nearly doubles in brightness within a few days. How big can it be? Guess first.',
    options: ['No more than a few light-days across', 'Any size, if it is bright enough', 'At least a light-year across'],
    answer: 0,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 0 ? 'Right. ' : ''}Change the source’s size until its flickering matches the quasar’s.`;
    },
  });
  return f.node;
});

// ---- S2 round the galaxy's centre (live) ----------------------------------------------------

/** S2's orbit: size of its long half-axis in Earth–Sun distances, its stretch, its last closest pass, and the true central mass in millions of Suns. */
export const S2 = { a: 1031, e: 0.884, peri: 2018.38, mass: 4.3 };
/** S2's period, years, for a central mass of `millions` of Suns (Kepler's third law). */
export const period = (millions: number) => Math.sqrt(S2.a ** 3 / (millions * 1e6));

/** Where S2 is at `year` for a period of `p` years: [along, across] in units of the long half-axis, the centre at [0, 0]. */
function at(year: number, p: number): [number, number] {
  const m = (2 * Math.PI * (year - S2.peri)) / p;
  let e = m;
  for (let i = 0; i < 30; i++) e -= (e - S2.e * Math.sin(e) - m) / (1 - S2.e * Math.cos(e));
  return [Math.cos(e) - S2.e, Math.sqrt(1 - S2.e ** 2) * Math.sin(e)];
}

export const s2Figure = figure(['mass'], (_ctx, t) => {
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let millions = 1;
  let guessed = false;
  const years = Array.from({ length: 31 }, (_, i) => 1994 + i);
  // The ellipse on the page: long axis across, the centre of mass near the right end.
  const k = 155;
  const ox = 330;
  const oy = 120;
  const px = ([a, b]: [number, number]): P => [ox + a * k, oy + b * k];
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    const ring: P[] = [];
    for (let i = 0; i <= 200; i++) {
      const e = (i / 200) * Math.PI * 2;
      ring.push(px([Math.cos(e) - S2.e, Math.sqrt(1 - S2.e ** 2) * Math.sin(e)]));
    }
    parts.push(polyline(ring, COL.skyLine, 1.2));
    parts.push(svg('circle', { cx: ox, cy: oy, r: 3, fill: '#000', stroke: COL.light, 'stroke-width': 1.5 }), small(ox - 4, oy + 18, 'Sgr A*', { anchor: 'end', fill: COL.light }));
    const p = period(millions);
    for (const y of years) {
      const [sx, sy] = px(at(y, period(S2.mass)));
      const [mx, my] = px(at(y, p));
      parts.push(svg('circle', { cx: sx, cy: sy, r: 2.5, fill: '#ece6d8' }), svg('circle', { cx: mx, cy: my, r: 4, fill: 'none', stroke: COL.light, 'stroke-width': 1.3 }));
    }
    for (const [y, text, dy] of [[2018.4, 'closest, 2018', -12], [2010.4, 'furthest, 2010', 4]] as const) {
      const [sx, sy] = px(at(y, period(S2.mass)));
      parts.push(small(sx + (dy < 0 ? -6 : 8), sy + dy, text, { anchor: dy < 0 ? 'end' : undefined, fill: '#a9adc2' }));
    }
    parts.push(note(14, 20, 'S2, 1994 to 2024: measured (dots) and your prediction (rings)', { bold: true, fill: '#ece6d8' }), small(14, 228, 'The orbit is about thirty times as wide as Neptune’s.', { fill: '#a9adc2' }));
    redraw(g, ...parts);
    if (!guessed) return;
    const ok = Math.abs(millions / S2.mass - 1) < 0.08;
    f.readout.textContent = ok
      ? `${sig(millions, 2)} million Suns: one lap every ${sig(p, 3)} years, and the rings sit on the measured dots. Nothing in the middle shines. It is a black hole.`
      : `With ${sig(millions, 2)} million Suns in the middle, S2 would go round every ${sig(p, 3)} years. The measured lap is 16 years. ${p > 16.05 ? 'More mass.' : 'Less mass.'}`;
    if (ok && t.goal === 'mass') t.done();
  };
  const s = slider('Mass at the centre', 0.5, 10, 0.05, millions, (v) => `${sig(v, 2)} million Suns`, (v) => { millions = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'S2 goes round an empty-looking point every 16 years, on an orbit about thirty times as wide as Neptune’s. How heavy is the point? Guess first.',
    options: ['About as heavy as the Sun', 'A few million Suns', 'A few billion Suns'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Set the central mass until your predicted positions land on the measured ones.`;
    },
  });
  return f.node;
});
