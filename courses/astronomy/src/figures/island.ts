// Lesson 19, Island universes: Shapley's lopsided globular clusters; and a
// Cepheid whose period gives its true brightness, moved away until it looks as
// faint as Hubble's star in Andromeda.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;

/** A Cepheid's true brightness, Suns, from its period in days (the modern rule, for yellow light). */
export function cepheidSuns(days: number): number {
  const mag = -2.43 * (Math.log10(days) - 1) - 4.05;
  return 10 ** (-0.4 * (mag - 4.83));
}

/** Hubble's star V1 in Andromeda: its period, days, and its distance, light years (modern). */
export const V1 = { days: 31.4, ly: 2.5e6 };

/** How bright a star of `suns` looks at `ly` light years, relative to V1 as Hubble saw it. */
export const looks = (suns: number, ly: number) => (suns / ly ** 2) / (cepheidSuns(V1.days) / V1.ly ** 2);

/** A Cepheid's brightness through its cycle, 0..1: a quick rise and a slow fade. */
const wave = (phase: number) => {
  const p = phase - Math.floor(phase);
  return p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
};

const sayLy = (ly: number) => (ly >= 1e6 ? `${sig(ly / 1e6, 2)} million light years` : `${big(ly)} light years`);
const big = (n: number) => Number(n.toPrecision(2)).toLocaleString('en-US');

// ---- A standard candle (live) ----------------------------------------------------------------

export const cepheidFigure = figure(['distance'], (_ctx, t) => {
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let days = 5;
  let logLy = 4;
  let guessed = false;
  // Hubble's measurements of V1 over 90 days, scattered a little.
  const rnd = makeRng(1923);
  const marks = Array.from({ length: 22 }, () => {
    const d = rnd() * 90;
    return [d, wave(d / V1.days + 0.3) + (rnd() - 0.5) * 0.12] as [number, number];
  });
  const paint = () => {
    const ly = 10 ** logLy;
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    // The light curve: 90 days across 30..390, brightness 0..1 over 112..40.
    const dx = (d: number) => 30 + (d / 90) * 360;
    const by = (b: number) => 112 - b * 66;
    parts.push(note(14, 20, 'Brightness through the cycle: your star (line), Hubble’s V1 (dots)', { bold: true }));
    parts.push(line(30, 116, 390, 116, COL.soft, 1));
    for (let d = 0; d <= 90; d += 10) parts.push(small(dx(d), 128, `${d}`, { anchor: 'middle', soft: true }));
    parts.push(small(390, 140, 'days', { anchor: 'end', soft: true }));
    const curve: P[] = [];
    for (let d = 0; d <= 90; d += 0.25) curve.push([dx(d), by(wave(d / days + 0.3))]);
    parts.push(polyline(curve, COL.planet, 2));
    for (const [d, b] of marks) parts.push(svg('circle', { cx: dx(d), cy: by(b), r: 2.6, fill: COL.ink }));
    // How bright it looks, against V1 on Hubble's plate: two stars side by side.
    const rel = looks(cepheidSuns(days), ly);
    parts.push(svg('rect', { x: 14, y: 156, width: 372, height: 74, fill: COL.sky, rx: 4 }));
    const dot = (x: number, b: number, text: string) => {
      const r = Math.max(0.6, Math.min(16, 3.2 * Math.sqrt(b)));
      parts.push(svg('circle', { cx: x, cy: 186, r: r + 3, fill: '#fff6dc', opacity: Math.min(0.3, 0.12 * b) }), svg('circle', { cx: x, cy: 186, r, fill: '#fff6dc' }), small(x, 222, text, { anchor: 'middle', fill: '#ece6d8' }));
    };
    dot(110, 1, 'V1 on Hubble’s plate');
    dot(290, rel, `your star, ${sayLy(ly)} away`);
    redraw(g, ...parts);
    if (!guessed) return;
    const periodOk = Math.abs(days / V1.days - 1) < 0.06;
    const near = Math.abs(Math.log10(rel)) < 0.12;
    const suns = cepheidSuns(days);
    f.readout.textContent = !periodOk
      ? `A Cepheid that repeats every ${sig(days, 2)} days shines with about ${big(suns)} Suns. Match V1’s rhythm first.`
      : near
        ? `Same rhythm, same faintness: V1 is about ${sayLy(ly)} away. That is far outside our galaxy, which is about 100,000 light years across. Andromeda is another galaxy.`
        : `Matched: V1 truly shines like about ${big(suns)} Suns. Now move your star until it looks as faint as V1. ${rel > 1 ? 'Too bright: further.' : 'Too faint: nearer.'}`;
    if (periodOk && near && t.goal === 'distance') t.done();
  };
  const sp = slider('Period', 1, 60, 0.1, days, (v) => `${sig(v, 3)} days`, (v) => { days = v; paint(); }, 'planet');
  const sd = slider('Distance', 3, 7, 0.01, logLy, (v) => sayLy(10 ** v), (v) => { logLy = v; paint(); }, 'ink');
  f.controls.append(sp.node, sd.node);
  paint();
  guessFirst(t, f, {
    ask: 'Move a star twice as far away. How much dimmer does it look? Guess first.',
    options: ['Half as bright', 'A quarter as bright', 'An eighth as bright'],
    answer: 1,
    sliders: [sp, sd],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right: the inverse square. ' : 'A quarter: its light spreads over four times the area. '}First set the period so your star keeps time with V1. Then move it until it looks as faint.`;
    },
  });
  return f.node;
});

// ---- Shapley's clusters (a still) ------------------------------------------------------------

export const shapleyStill = () => {
  const H = 220;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.sky }));
  // The galaxy's disc from above, the Sun off to one side, the clusters round the true centre.
  const cx = 230;
  const cy = 112;
  s.append(svg('ellipse', { cx, cy, rx: 150, ry: 150 * 0.55, fill: '#2c3350' }), svg('ellipse', { cx, cy, rx: 40, ry: 22, fill: '#4a4f73' }));
  const rnd = makeRng(1918);
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 60 * Math.sqrt(-Math.log(1 - rnd() * 0.97)) * 0.9;
    s.append(svg('circle', { cx: cx + r * Math.cos(a), cy: cy + r * Math.sin(a) * 0.8, r: 2.2, fill: COL.light }));
  }
  const sx = cx - 100;
  s.append(svg('circle', { cx: sx, cy: cy + 8, r: 4, fill: COL.sun }), small(sx, cy + 26, 'the Sun', { anchor: 'middle', fill: '#ece6d8', bold: true }), small(cx, cy + 4, 'centre', { anchor: 'middle', fill: '#ece6d8' }));
  s.append(line(sx + 6, cy + 8, cx - 42, cy + 2, '#a9adc2', 1, { 'stroke-dasharray': '3 3' }), small((sx + cx) / 2 - 6, cy - 4, '26,000 ly', { anchor: 'middle', fill: '#a9adc2' }));
  s.append(note(14, 20, 'Globular clusters (yellow) swarm round the galaxy’s centre, not round us', { bold: true, fill: '#ece6d8' }), small(14, 212, 'Seen from the Sun, most of them lie in one half of the sky, towards Sagittarius.', { fill: '#a9adc2' }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
