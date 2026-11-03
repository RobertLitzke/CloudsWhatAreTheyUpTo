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

// ---- Bradley's aberration: running through starlight --------------------------------------------

/** The Earth's speed round the Sun, km a second. */
const EARTH_KMS = 29.8;
/** The tilt Bradley measured, arcseconds. */
export const BRADLEY = 20.5;
/** The telescope's tilt, arcseconds, if light is `ratio` times as fast as the Earth. */
export const tilt = (ratio: number) => (Math.atan(1 / ratio) * 180 * 3600) / Math.PI;

export const aberrationFigure = figure(['speed'], (_ctx, t) => {
  const H = 260;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  /** log10 of light's speed over the Earth's. */
  let lg = 0.3;
  const paint = () => {
    const ratio = 10 ** lg;
    const arcsec = tilt(ratio);
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    // Strobe: the telescope at three moments as it moves right, and one packet of light falling straight down through it.
    const L = 150;
    const top = 50;
    const bottom = top + L;
    const drift = L / ratio; // how far the Earth moves while light falls the tube's length
    const xl = 150; // where the light falls
    for (let k = 0; k <= 2; k++) {
      const moved = (drift * k) / 2;
      const op = k === 2 ? 1 : 0.35;
      // The tube at this moment, its top leaning forward into the motion; the light on its axis.
      parts.push(svg('line', { x1: xl + moved, y1: top, x2: xl - drift + moved, y2: bottom, stroke: '#cfd6ea', 'stroke-width': 12, 'stroke-linecap': 'round', opacity: op * 0.5 }));
      parts.push(svg('circle', { cx: xl, cy: top + (L * k) / 2, r: 4, fill: COL.light, opacity: op }));
    }
    const x0 = xl - drift;
    parts.push(
      line(x0 + drift, 20, x0 + drift, bottom + 20, COL.light, 1, { 'stroke-dasharray': '2 4' }),
      small(xl - 6, 30, 'starlight falls straight down', { fill: COL.light, anchor: 'end' }),
      svg('path', { d: `M${x0 + drift + 30},${bottom + 26}h50l-6,-4m6,4l-6,4`, fill: 'none', stroke: '#fff', 'stroke-width': 1.5 }),
      small(x0 + drift + 30, bottom + 42, 'the Earth moves', { fill: '#fff' }),
    );
    // The star's little yearly circle, to scale in arcseconds, against Bradley's.
    const ccx = 320;
    const ccy = 120;
    const PER = 2.2; // px per arcsecond
    const r = Math.min(70, arcsec * PER);
    parts.push(
      svg('circle', { cx: ccx, cy: ccy, r: BRADLEY * PER, fill: 'none', stroke: '#fff', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.7 }),
      svg('circle', { cx: ccx, cy: ccy, r, fill: 'none', stroke: COL.light, 'stroke-width': 2 }),
      svg('circle', { cx: ccx, cy: ccy, r: 2, fill: '#fff' }),
      ...(arcsec * PER > 70 ? [small(ccx, ccy - 76, `radius ${arcsec >= 3600 ? `${(arcsec / 3600).toFixed(1)}°` : `${Math.round(arcsec)}″`}: off the scale`, { anchor: 'middle', fill: COL.light })] : []),
      small(ccx, ccy + 88, `dashed: Bradley’s, radius ${BRADLEY}″`, { anchor: 'middle', fill: '#fff' }),
      small(ccx, 18, 'A star’s path over a year', { anchor: 'middle', fill: '#fff', bold: true }),
    );
    redraw(g, ...parts);
    const kms = ratio * EARTH_KMS;
    const near = Math.abs(arcsec - BRADLEY) < 0.6;
    const fmt = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1));
    f.readout.textContent = `If light is ${fmt(ratio)} times as fast as the Earth (${fmt(kms)} km a second), the telescope must lean ${arcsec >= 3600 ? `${(arcsec / 3600).toFixed(1)}°` : `${arcsec.toFixed(1)}″`} into the motion, and every star swings round a circle of that radius each year. ${near ? `That matches Bradley. Light from the Sun would take ${Math.round((1.496e8 / kms) / 60)} minutes ${Math.round((1.496e8 / kms) % 60)} seconds to reach us.` : arcsec > BRADLEY ? 'Too slow: the circle is bigger than Bradley’s.' : 'Too fast: the circle is smaller than Bradley’s.'}`;
    if (near && t.goal === 'speed') t.done();
  };
  const s = slider('Speed of light, compared with the Earth', 0.3, 5, 0.005, lg, (v) => `${fmt10(v)} times`, (v) => { lg = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Bradley found every star swinging once a year round a little circle, 20.5 seconds of arc from its middle. Roughly how many times faster than the Earth must light be? Guess first.',
    options: ['About 100 times', 'About 10,000 times', 'About a million times'],
    answer: 1, reveal: 'done',
    sliders: [s],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['about 100', 'about 10,000', 'about a million'][guess]} times. Set light’s speed until the star’s yearly circle matches Bradley’s.`;
    },
  });
  return f.node;
});

const fmt10 = (lg: number) => {
  const v = 10 ** lg;
  return v >= 100 ? (Math.round(v / 10 ** Math.floor(Math.log10(v) - 1)) * 10 ** Math.floor(Math.log10(v) - 1)).toLocaleString('en-US') : v.toFixed(v < 10 ? 1 : 0);
};
