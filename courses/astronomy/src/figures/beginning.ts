// Lesson 25, Did time have a beginning?: the paths of galaxies on a map of
// place against time, run backwards until they meet, with each galaxy's light
// cone drawn at the moment the reader picks.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;

/** The universe's size, today's being 1, at `gyr` billion years after the start (matter and dark energy, 31% and 69%). */
export function sizeAt(gyr: number): number {
  const k = (1.5 * Math.sqrt(0.69)) / (9.461e18 / 20.8 / 3.156e7 / 1e9);
  return gyr <= 0 ? 0 : (Math.sinh(k * gyr) / Math.sinh(k * 13.8)) ** (2 / 3);
}

export const convergeFigure = figure(['start'], (_ctx, t) => {
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let gyr = 13.8;
  let guessed = false;
  // Time runs up the page, 0 at y=214 to 13.8 billion years at y=40; galaxies sit at fixed places on the stretching grid.
  const ty = (gy: number) => 222 - (gy / 13.8) * 150;
  const places = [-3, -2, -1, 0, 1, 2, 3];
  const px = (k: number, gy: number) => 200 + k * 52 * sizeAt(gy);
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    for (const k of places) {
      const pts: P[] = [];
      for (let i = 0; i <= 80; i++) {
        const gy = (13.8 * i) / 80;
        pts.push([px(k, gy), ty(gy)]);
      }
      parts.push(polyline(pts, k === 0 ? COL.light : '#6b7090', k === 0 ? 2 : 1.4));
    }
    // Each galaxy's light cone at the chosen moment: where its light could go next.
    const y = ty(gyr);
    parts.push(line(14, y, 386, y, COL.skyLine, 1, { 'stroke-dasharray': '3 3' }));
    const reach = 22;
    for (const k of places) {
      const x = px(k, gyr);
      if (x < 6 || x > 394) continue;
      parts.push(svg('path', { d: `M${x} ${y} L${x - reach} ${y - reach} L${x + reach} ${y - reach} Z`, fill: COL.light, opacity: 0.18 }), svg('circle', { cx: x, cy: y, r: 2.6, fill: k === 0 ? COL.light : '#c9d4ff' }));
    }
    parts.push(small(px(0, 13.8) + 6, ty(13.8) + 4, 'us', { fill: COL.light, bold: true }));
    parts.push(small(386, 244, 'place →', { anchor: 'end', fill: '#a9adc2' }), small(14, 150, 'time ↑', { fill: '#a9adc2' }));
    if (gyr < 0.05) parts.push(svg('circle', { cx: 200, cy: ty(0), r: 5, fill: COL.cool }), small(208, ty(0) + 18, 'every path meets: a singularity', { fill: COL.cool, bold: true }));
    parts.push(note(14, 22, 'Galaxies’ paths through time, run backwards', { bold: true, fill: '#ece6d8' }));
    redraw(g, ...parts);
    if (!guessed) return;
    const start = gyr < 0.05;
    f.readout.textContent = start
      ? 'At time zero, in Einstein’s theory, every distance is zero and every path begins at once. The theory can’t say what happened there, or whether “before” means anything.'
      : `${sig(gyr, 2)} billion years after the start, the galaxies are ${sig(1 / Math.max(sizeAt(gyr), 1e-9), 2)} times closer together than now. Keep going back.`;
    if (start && t.goal === 'start') t.done();
  };
  const s = slider('Run the film back to', 0, 13.8, 0.01, gyr, (v) => (v < 0.05 ? 'the start' : `${sig(v, 3)} billion years`), (v) => { gyr = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Run the expansion backwards. According to Einstein’s general relativity, what happens to the distances between galaxies? Guess first.',
    options: ['They shrink to nothing at one moment', 'They shrink, but never quite to nothing', 'They stop shrinking at some size'],
    answer: 0,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 0 ? 'Right, in Einstein’s theory. ' : 'In Einstein’s theory they shrink to nothing. '}Run the film back and watch the paths converge.`;
    },
  });
  return f.node;
});
