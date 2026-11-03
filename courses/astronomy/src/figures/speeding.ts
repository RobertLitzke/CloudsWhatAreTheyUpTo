// Lesson 24, The speeding universe: how faint distant exploding white dwarfs
// look for a given share of dark energy, against 1998-style measurements; and
// the universe's size through time, slowing and then speeding up.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;

/** How fast the universe expanded when it was 1/(1+z) of its present size, relative to today, in a flat universe with dark-energy share `de`. */
const rate = (z: number, de: number) => Math.sqrt((1 - de) * (1 + z) ** 3 + de);

/** Distance, in units of light's speed over today's expansion rate, at which a source of redshift `z` looks as faint as it does. */
export function faintDistance(z: number, de: number): number {
  const n = 200;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const x = (z * i) / n;
    s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) / rate(x, de);
  }
  return (1 + z) * ((z / n / 3) * s);
}
/** The same for an empty universe that neither slows nor speeds up. */
const coasting = (z: number) => z * (1 + z / 2);

/** How much fainter than in a coasting universe a source at `z` looks: the ratio of brightnesses, below 1 if fainter. */
export const brightnessVsCoasting = (z: number, de: number) => (coasting(z) / faintDistance(z, de)) ** 2;

const POINTS = (() => {
  const rnd = makeRng(1998);
  return Array.from({ length: 34 }, () => {
    const z = 0.03 + rnd() ** 0.7 * 0.95;
    return [z, Math.log10(brightnessVsCoasting(z, 0.7)) + (rnd() - 0.5) * 0.09] as [number, number];
  });
})();

export const supernovaFigure = figure(['match'], (_ctx, t) => {
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let de = 0;
  let guessed = false;
  const zx = (z: number) => 50 + (z / 1) * 335;
  // Up: brighter than coasting; down: fainter. log10 of the ratio, ±0.3 (a factor of two).
  const by = (lg: number) => 118 - (lg / 0.3) * 80;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    parts.push(line(50, by(0), 385, by(0), COL.soft, 1, { 'stroke-dasharray': '4 3' }), small(385, by(0) - 4, 'neither slowing nor speeding', { anchor: 'end', soft: true }));
    parts.push(small(46, by(0.2), 'brighter', { anchor: 'end', soft: true }), small(46, by(-0.2), 'fainter', { anchor: 'end', soft: true }), line(50, 36, 50, 200, COL.soft, 1), line(50, 200, 385, 200, COL.soft, 1));
    for (const z of [0, 0.25, 0.5, 0.75, 1]) parts.push(small(zx(z), 214, `${sig(z * 100 / 100, 2)}`, { anchor: 'middle', soft: true }));
    parts.push(small(385, 228, 'redshift (how much the light is stretched; further away →)', { anchor: 'end', soft: true }));
    const curve = (d: number): P[] => Array.from({ length: 60 }, (_, i) => {
      const z = 0.01 + (i / 59) * 0.99;
      return [zx(z), by(Math.log10(brightnessVsCoasting(z, d)))];
    });
    parts.push(polyline(curve(0), COL.soft, 1.2), small(zx(0.98), by(Math.log10(brightnessVsCoasting(0.98, 0))) - 6, 'slowing, no dark energy', { anchor: 'end', soft: true }));
    parts.push(polyline(curve(de), COL.model, 2.5));
    for (const [z, lg] of POINTS) parts.push(svg('circle', { cx: zx(z), cy: by(lg), r: 2.7, fill: COL.ink }));
    parts.push(note(14, 20, 'Exploding white dwarfs: how bright they look, against a steady expansion', { bold: true }));
    redraw(g, ...parts);
    if (!guessed) return;
    const ok = de >= 0.62 && de <= 0.78;
    f.readout.textContent = ok
      ? `With about ${Math.round(de * 100)}% of the universe’s mass and energy in dark energy, the line runs through the measurements. The distant supernovae are further away than a slowing universe allows: the expansion is speeding up.`
      : de < 0.62
        ? `With ${Math.round(de * 100)}% dark energy, the expansion has slowed so much that distant supernovae should look brighter than they do. Add dark energy.`
        : `Too much: now they should look fainter than they do.`;
    if (ok && t.goal === 'match') t.done();
  };
  const s = slider('Dark energy’s share', 0, 0.9, 0.01, de, (v) => `${Math.round(v * 100)}%`, (v) => { de = v; paint(); }, 'model');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Distant exploding white dwarfs turned out fainter, so further away, than a slowing expansion allows. What does that say? Guess first.',
    options: ['The expansion is slowing faster than expected', 'The expansion is speeding up', 'The expansion has stopped'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}The grey line is a universe of matter alone, slowing down. Add dark energy until the prediction runs through the measurements.`;
    },
  });
  return f.node;
});

// ---- The expansion history (a still) ---------------------------------------------------------

/** The universe's size against time, today's size 1, for dark-energy share `de` and an expansion rate of 20.8 km/s per million ly (the afterglow's value): [billions of years since the start, size]. */
export function history(de: number): [number, number][] {
  const hubbleTime = 9.461e18 / 20.8 / 3.156e7 / 1e9; // Gyr
  const out: [number, number][] = [];
  let tt = 0;
  let prev = 1e-4;
  for (let a = 1e-4; a <= 2.2; a *= 1.002) {
    // dt = da / (a·H(a)), with H(a) = H0·sqrt(matter/a³ + de)
    const h = Math.sqrt((1 - de) / a ** 3 + de);
    tt += ((a - prev) / (a * h)) * hubbleTime;
    prev = a;
    out.push([tt, a]);
  }
  return out;
}

export const historyStill = () => {
  const H = 220;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.paper }));
  const tx = (gyr: number) => 40 + (gyr / 24) * 345;
  const ay = (a: number) => 190 - (a / 2) * 160;
  s.append(line(40, 190, 385, 190, COL.soft, 1), line(40, 30, 40, 190, COL.soft, 1));
  for (const gyr of [0, 5, 10, 15, 20]) s.append(small(tx(gyr), 204, `${gyr}`, { anchor: 'middle', soft: true }));
  s.append(small(385, 216, 'billions of years since the start', { anchor: 'end', soft: true }), small(44, 38, 'size of the universe (today = 1)', { soft: true }));
  const real = history(0.69).filter(([gyr, a]) => gyr <= 24 && a <= 2);
  const slow = history(0).filter(([gyr, a]) => gyr <= 24 && a <= 2);
  s.append(polyline(slow.map(([gyr, a]) => [tx(gyr), ay(a)] as P), COL.soft, 1.5, { 'stroke-dasharray': '4 3' }), polyline(real.map(([gyr, a]) => [tx(gyr), ay(a)] as P), COL.model, 2.5));
  // Today, and the turn from slowing to speeding up.
  const now = real.reduce((b, p) => (Math.abs(p[1] - 1) < Math.abs(b[1] - 1) ? p : b));
  s.append(svg('circle', { cx: tx(now[0]), cy: ay(1), r: 4, fill: COL.ink }), small(tx(now[0]) + 6, ay(1) + 14, `today, ${sig(now[0], 3)} billion years`, { bold: true }));
  const turn = real.reduce((b, p) => (Math.abs(p[1] - 0.6) < Math.abs(b[1] - 0.6) ? p : b));
  s.append(svg('circle', { cx: tx(turn[0]), cy: ay(turn[1]), r: 3, fill: COL.model }), small(tx(turn[0]) + 6, ay(turn[1]) + 14, 'slowing turns to speeding up', { fill: COL.model }));
  s.append(small(tx(12), ay(1.25), 'matter only: always slowing', { anchor: 'end', soft: true }));
  s.append(note(14, 20, 'How the universe has grown', { bold: true }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
