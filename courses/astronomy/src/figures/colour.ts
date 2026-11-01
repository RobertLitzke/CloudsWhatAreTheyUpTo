// Lesson 7, Why are there no green stars?: the glow of a hot body as its
// temperature changes, and the colours of real stars from the same physics.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { big, COL, figure, frame, guessFirst, sig, slider } from './kit';
import { colourName, glowColour, peakNm, perArea, planck, SUN_T, wavelengthColour } from './light';

const W = 400;

export const glowFigure = figure(['no-green'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let logT = Math.log10(3000);
  let sawRed = false;
  let sawBlue = false;
  const paint = () => {
    const T = 10 ** logT;
    const parts: SVGElement[] = [svg('rect', { width: W, height: 240, fill: COL.paper })];
    // The star.
    const col = glowColour(T);
    parts.push(
      svg('rect', { x: 10, y: 20, width: 110, height: 170, rx: 6, fill: COL.sky }),
      svg('circle', { cx: 65, cy: 95, r: 40, fill: col, opacity: 0.25 }),
      svg('circle', { cx: 65, cy: 95, r: 30, fill: col }),
      small(65, 160, colourName(T), { anchor: 'middle', fill: '#ece6d8', bold: true }),
      small(65, 176, `${big(T)} K`, { anchor: 'middle', fill: '#a9adc2' }),
    );
    // The glow by wavelength, 100 to 2,500 nm; scaled to its own peak so the shape shows.
    const x0 = 140;
    const x1 = 390;
    const lo = 100;
    const hi = 2500;
    const nx = (nm: number) => x0 + ((nm - lo) / (hi - lo)) * (x1 - x0);
    const peak = planck(Math.min(Math.max(peakNm(T), lo), hi), T);
    const ny = (v: number) => 190 - (v / peak) * 150;
    for (let nm = 380; nm < 750; nm += 5) {
      const a = nx(nm);
      const b = nx(nm + 5);
      const v = planck(nm + 2.5, T);
      parts.push(svg('rect', { x: a, y: ny(v), width: b - a + 0.2, height: 190 - ny(v), fill: wavelengthColour(nm + 2.5), opacity: 0.9 }));
    }
    const curve: P[] = [];
    for (let nm = lo; nm <= hi; nm += 10) curve.push([nx(nm), ny(planck(nm, T))]);
    const pk = peakNm(T);
    parts.push(
      polyline(curve, COL.ink, 2),
      line(x0, 190, x1, 190, COL.ink, 1),
      small(nx(380), 204, 'visible', { soft: true }),
      small(x0, 220, '100 nm', { soft: true }),
      small(nx(1000), 220, '1,000', { anchor: 'middle', soft: true }),
      small(x1, 220, '2,500 nm', { anchor: 'end', soft: true }),
      small(x0, 30, 'Glow at each wavelength, scaled to its peak', { bold: true }),
    );
    if (pk >= lo && pk <= hi) parts.push(line(nx(pk), 40, nx(pk), 190, COL.soft, 1, { 'stroke-dasharray': '3 3' }), small(nx(pk) + 3, 50, `peak ${big(pk)} nm`, { soft: true }));
    redraw(g, ...parts);
    if (T < 4000) sawRed = true;
    if (T > 9000) sawBlue = true;
    const where = pk < 380 ? 'in the ultraviolet, beyond violet' : pk > 750 ? 'in the infrared, beyond red' : pk < 450 ? 'in the blue-violet' : pk < 495 ? 'in the blue' : pk < 570 ? 'in the green' : pk < 590 ? 'in the yellow' : pk < 620 ? 'in the orange' : 'in the red';
    f.readout.textContent = `At ${big(T)} K the glow peaks ${where}, and each square metre gives off ${sig(perArea(T), 2)} times as much light as the Sun’s surface. The eye sees ${colourName(T)}${pk >= 495 && pk < 570 ? ': the curve is so broad that every colour is there, and together they look white' : ''}.`;
    if (sawRed && sawBlue && t.goal === 'no-green') t.done();
  };
  const s = slider('Temperature', Math.log10(1500), Math.log10(40000), 0.005, logT, (v) => `${big(10 ** v)} K`, (v) => { logT = v; paint(); }, 'heat');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Near 5,800 K, about the Sun’s temperature, the glow is brightest in green light. What colour does the star look? Guess first.',
    options: ['Green', 'White', 'Yellow'],
    answer: 1,
    sliders: [s],
    after: () => {
      logT = Math.log10(5800);
      s.set(logT);
      paint();
      f.readout.textContent = `${f.readout.textContent} Now take it down to red and up to blue.`;
    },
  });
  return f.node;
});

/** Bright stars and their surface temperatures, kelvin. */
export const STAR_COLOURS: { name: string; t: number }[] = [
  { name: 'Antares', t: 3500 },
  { name: 'Betelgeuse', t: 3600 },
  { name: 'Arcturus', t: 4300 },
  { name: 'Sun', t: SUN_T },
  { name: 'Procyon', t: 6500 },
  { name: 'Sirius', t: 9900 },
  { name: 'Rigel', t: 12100 },
  { name: 'Spica', t: 22000 },
];

export const starColoursStill = () => {
  const s = svg('svg', { viewBox: `0 0 ${W} 140`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: 140, rx: 6, fill: COL.sky }));
  STAR_COLOURS.forEach((st, i) => {
    const x = 30 + i * 48.5;
    const c = glowColour(st.t);
    s.append(
      svg('circle', { cx: x, cy: 56, r: 19, fill: c, opacity: 0.25 }),
      svg('circle', { cx: x, cy: 56, r: 14, fill: c }),
      small(x, 98, st.name, { anchor: 'middle', fill: '#ece6d8', bold: true }),
      small(x, 112, `${big(st.t)} K`, { anchor: 'middle', fill: '#a9adc2' }),
    );
  });
  s.append(note(14, 22, '← cooler', { fill: '#a9adc2' }), note(386, 22, 'hotter →', { anchor: 'end', fill: '#a9adc2' }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
