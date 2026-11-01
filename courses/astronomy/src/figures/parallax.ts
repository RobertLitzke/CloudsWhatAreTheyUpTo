// Lesson 5, How far are the stars?: a near star shifts against far ones as
// the Earth goes round the Sun, by an angle that shrinks with distance.

import { svg } from 'didactics/dom';
import { line, note, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;

/** The star's back-and-forth over six months, arcseconds, at `ly` light-years: twice the parallax. */
export const shift = (ly: number) => (2 * 3.2616) / ly;

const FAR = (() => {
  const rng = makeRng(5);
  return Array.from({ length: 22 }, () => [rng(), rng(), 0.6 + rng()]);
})();

const NAMED: { name: string; ly: number }[] = [
  { name: 'Proxima Centauri, the nearest star', ly: 4.25 },
  { name: 'Alpha Centauri', ly: 4.37 },
  { name: 'Sirius', ly: 8.6 },
  { name: '61 Cygni, Bessel’s star', ly: 11.4 },
  { name: 'Vega', ly: 25 },
  { name: 'Arcturus', ly: 37 },
];

export const parallaxFigure = figure(['bessel'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let ly = 2;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: 250, fill: COL.paper })];
    // From above: the Sun, the Earth in January and July, and the star, not to scale.
    const sun: P = [70, 175];
    const jan: P = [30, 175];
    const jul: P = [110, 175];
    const sy = 175 - 30 - 110 * Math.min(1, Math.log10(ly + 1) / 2);
    const star: P = [70, sy];
    parts.push(
      svg('ellipse', { cx: sun[0], cy: sun[1], rx: 40, ry: 12, fill: 'none', stroke: COL.orbit }),
      svg('circle', { cx: sun[0], cy: sun[1], r: 6, fill: COL.sun }),
      line(jan[0], jan[1], star[0] + (star[0] - jan[0]) * ((sy - 10) / (jan[1] - sy)), 10, COL.earth, 1.2, { 'stroke-dasharray': '4 3' }),
      line(jul[0], jul[1], star[0] - (jul[0] - star[0]) * ((sy - 10) / (jul[1] - sy)), 10, COL.planet, 1.2, { 'stroke-dasharray': '4 3' }),
      svg('circle', { cx: jan[0], cy: jan[1], r: 5, fill: COL.earth }),
      svg('circle', { cx: jul[0], cy: jul[1], r: 5, fill: COL.planet }),
      small(jan[0] - 4, jan[1] + 20, 'January', { anchor: 'middle', fill: COL.earth, bold: true }),
      small(jul[0] + 4, jul[1] + 20, 'July', { anchor: 'middle', fill: COL.planet, bold: true }),
      svg('circle', { cx: star[0], cy: star[1], r: 4, fill: COL.light }),
      small(star[0] + 8, star[1] + 4, 'near star', { bold: true }),
      small(14, 238, 'From above, not to scale', { soft: true }),
    );
    // The sky, magnified: the near star in January and July against far ones.
    const x0 = 160;
    const x1 = 392;
    const sh = shift(ly);
    // 1 second of arc = 70 units across the sky panel.
    const px = Math.min(200, sh * 70);
    const mid = (x0 + x1) / 2;
    parts.push(
      svg('rect', { x: x0, y: 20, width: x1 - x0, height: 180, fill: COL.sky, rx: 4 }),
      ...FAR.map(([u, v, r]) => svg('circle', { cx: x0 + 6 + u * (x1 - x0 - 12), cy: 26 + v * 168, r, fill: '#e8e6f2', opacity: 0.75 })),
      svg('circle', { cx: mid + px / 2, cy: 110, r: 5, fill: '#9cc9ff', opacity: 0.9 }),
      svg('circle', { cx: mid - px / 2, cy: 110, r: 5, fill: '#ffb39c', opacity: 0.9 }),
      line(mid - px / 2, 124, mid + px / 2, 124, '#f6dfa6', 1.5),
      small(mid - px / 2, 140, 'July', { anchor: 'middle', fill: '#ffb39c' }),
      small(mid + px / 2, 140, 'January', { anchor: 'middle', fill: '#9cc9ff' }),
      line(x0 + 12, 188, x0 + 82, 188, '#f6dfa6', 2),
      small(x0 + 47, 182, '1 second of arc', { anchor: 'middle', fill: '#f6dfa6' }),
      small(x0, 14, 'The sky through a telescope, hugely magnified', { bold: true }),
      note(276, 222, `Back and forth: ${sh >= 1 ? sig(sh, 3) : sig(sh, 2)} seconds of arc`, { anchor: 'middle', bold: true }),
    );
    redraw(g, ...parts);
    const near = NAMED.find((s) => Math.abs(s.ly - ly) / s.ly < 0.04);
    const coinKm = 0.0225 / ((sh / 3600) * (Math.PI / 180)) / 1000;
    f.readout.textContent = `${near ? `${near.name}, ` : 'A star '}${sig(ly, 3)} light-years away swings ${sig(sh, 2)}″ over half a year: the width of a coin seen from ${sig(coinKm, 2)} km.${near?.ly === 11.4 ? ' Bessel measured this in 1838.' : ''}`;
    if (Math.abs(ly - 11.4) < 0.5 && t.goal === 'bessel') t.done();
  };
  const s = slider('Distance to the star', 1, 100, 0.1, ly, (v) => `${sig(v, 3)} light-years`, (v) => { ly = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'A star 2 light-years away would swing back and forth by 3.3 seconds of arc in six months. Move it twice as far away. What happens to the swing? Guess first.',
    options: ['It halves', 'It drops to a quarter', 'It stays the same'],
    answer: 0,
    sliders: [s],
    after: (guess) => {
      paint();
      f.readout.textContent = `${guess === 0 ? 'Yes: it halves. ' : 'It halves: the angle shrinks in step with distance. '}${f.readout.textContent} Now find Bessel’s star, 61 Cygni, at 11.4 light-years.`;
    },
  });
  return f.node;
});
