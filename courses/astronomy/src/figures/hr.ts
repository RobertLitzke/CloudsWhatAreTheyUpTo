// Lesson 9, Giants and dwarfs: the nearby stars on Hertzsprung and Russell's
// diagram of brightness against temperature, with a test star whose size and
// temperature the reader sets; and two stars of one colour and two sizes.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import data from '../data/stars.json';
import { big, COL, figure, frame, guessFirst, sig, slider } from './kit';
import { glowColour, SUN_T } from './light';

const W = 400;

/** Light given off, compared with the Sun, by a star of `r` Sun radii at `t` kelvin. */
export const luminosity = (r: number, t: number) => r * r * (t / SUN_T) ** 4;

/** Stars within 20 parsecs: [log T × 1000, log L × 100]. */
const NEAR = data.stars as unknown as [number, number][];

/** Bright stars beyond 20 parsecs, for their labels: temperature, kelvin, and luminosity, Suns (from the literature). */
export const FAMOUS: { name: string; t: number; l: number }[] = [
  { name: 'Betelgeuse', t: 3600, l: 100000 },
  { name: 'Rigel', t: 12100, l: 120000 },
  { name: 'Deneb', t: 8500, l: 200000 },
  { name: 'Antares', t: 3500, l: 75000 },
  { name: 'Aldebaran', t: 3900, l: 440 },
  { name: 'Arcturus', t: 4300, l: 170 },
  { name: 'Sirius B', t: 25000, l: 0.056 },
  { name: 'Sun', t: SUN_T, l: 1 },
];

const LT0 = Math.log10(40000);
const LT1 = Math.log10(2500);
const LL0 = -5;
const LL1 = 6;
const X0 = 40;
const X1 = 390;
const Y0 = 16;
const Y1 = 214;
/** Hot on the left, as Hertzsprung and Russell drew it. */
const tx = (lt: number) => X0 + ((LT0 - lt) / (LT0 - LT1)) * (X1 - X0);
const ly = (ll: number) => Y1 - ((ll - LL0) / (LL1 - LL0)) * (Y1 - Y0);

function axes(parts: SVGElement[]) {
  parts.push(
    svg('clipPath', { id: 'hr-clip' }, svg('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0 })),
    svg('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: COL.sky }),
    ...[30000, 10000, 6000, 4000, 3000].map((t) => small(tx(Math.log10(t)), Y1 + 13, big(t), { anchor: 'middle', soft: true })),
    small((X0 + X1) / 2, Y1 + 27, 'surface temperature, K (hotter to the left)', { anchor: 'middle' }),
    ...[-4, -2, 0, 2, 4, 6].map((l) => small(X0 - 4, ly(l) + 4, l === 0 ? '1' : `10${l < 0 ? '⁻' : ''}${'⁰¹²³⁴⁵⁶'[Math.abs(l)]}`, { anchor: 'end', soft: true })),
    small(X0, Y0 - 5, 'light given out, in Suns', { soft: true }),
  );
  // Lines of equal size: radius 0.01 to 1,000 Suns.
  for (const r of [0.01, 0.1, 1, 10, 100, 1000]) {
    const a = Math.log10(luminosity(r, 40000));
    const b = Math.log10(luminosity(r, 2500));
    parts.push(line(tx(LT0), ly(a), tx(LT1), ly(b), '#3a4363', 1, { 'stroke-dasharray': '3 4', 'clip-path': 'url(#hr-clip)' }));
    const lab = Math.log10(luminosity(r, 25000));
    if (lab > LL0 + 0.4 && lab < LL1 - 0.3) parts.push(small(tx(Math.log10(25000)) + 2, ly(lab) - 3, `${r < 1 ? r : big(r)} R☉`, { fill: '#7c84a8' }));
  }
}

export const hrFigure = figure(['betelgeuse'], (_ctx, t) => {
  const f = frame(W, 256, 4);
  const g = svg('g');
  f.svg.append(g);
  let logT = Math.log10(SUN_T);
  let logR = 0;
  const dots = NEAR.map(([lt, ll]) => svg('circle', { cx: tx(lt / 1000), cy: ly(ll / 100), r: 1.4, fill: glowColour(10 ** (lt / 1000)), opacity: 0.85 }));
  const paint = () => {
    const T = 10 ** logT;
    const R = 10 ** logR;
    const L = luminosity(R, T);
    const parts: SVGElement[] = [svg('rect', { width: W, height: 256, fill: COL.paper })];
    axes(parts);
    parts.push(...dots);
    for (const s of FAMOUS) {
      const x = tx(Math.log10(s.t));
      const y = ly(Math.log10(s.l));
      const below = s.name === 'Antares' || s.name === 'Sun';
      const left = s.name === 'Betelgeuse' || s.name === 'Antares';
      parts.push(svg('circle', { cx: x, cy: y, r: 2.6, fill: glowColour(s.t), stroke: '#ece6d8', 'stroke-width': 0.6 }), small(left ? x - 5 : x + 5, y + (below ? 12 : 3), s.name, { fill: '#ece6d8', anchor: left ? 'end' : undefined, bold: s.name === 'Sun' }));
    }
    const x = tx(logT);
    const y = ly(Math.log10(L));
    parts.push(
      svg('circle', { cx: x, cy: y, r: 6, fill: 'none', stroke: COL.light, 'stroke-width': 2.2 }),
      line(x - 10, y, x - 7, y, COL.light, 2), line(x + 7, y, x + 10, y, COL.light, 2),
      small(X0 + 6, Y1 - 8, 'most stars lie on the diagonal band, the main sequence', { fill: '#a9adc2' }),
    );
    redraw(g, ...parts);
    const bet = Math.abs(T - 3600) < 250 && L > 50000 && L < 200000;
    const where = L > 1000 && T < 5000 ? 'among the red giants and supergiants, top right' : R < 0.05 ? 'down with the white dwarfs, bottom left' : Math.abs(Math.log10(L) - 7.2 * (logT - Math.log10(SUN_T))) < 0.8 ? 'on the main sequence, like most stars' : 'off the main band';
    f.readout.textContent = `Your star: ${big(T)} K and ${R < 1 ? sig(R, 2) : big(R)} times the Sun’s radius, so ${L < 1 ? sig(L, 2) : big(L)} times as bright as the Sun, ${where}.${bet ? ' That is Betelgeuse: a red supergiant that would reach past Mars’s orbit if it sat where the Sun is.' : ''}`;
    if (bet && t.goal === 'betelgeuse') t.done();
  };
  const st = slider('Surface temperature', Math.log10(2500), Math.log10(40000), 0.004, logT, (v) => `${big(10 ** v)} K`, (v) => { logT = v; paint(); }, 'heat');
  const sr = slider('Radius', -2, 3.2, 0.01, logR, (v) => `${10 ** v < 1 ? sig(10 ** v, 2) : big(10 ** v)} × the Sun’s`, (v) => { logR = v; paint(); }, 'light');
  f.controls.append(st.node, sr.node);
  paint();
  guessFirst(t, f, {
    ask: 'Betelgeuse is about 3,600 K, cooler than the Sun, yet gives out about 100,000 times as much light. How big must it be? Guess first.',
    options: ['Smaller than the Sun', 'About the Sun’s size', 'Hundreds of times wider than the Sun'],
    sliders: [st, sr],
    after: () => {
      logT = Math.log10(3600);
      st.set(logT);
      paint();
      f.readout.textContent = `${f.readout.textContent} Now grow it until it is as bright as Betelgeuse.`;
    },
  });
  return f.node;
});

/** Two stars of the same colour and different sizes: a still. */
export const sameColourStill = () => {
  const s = svg('svg', { viewBox: `0 0 ${W} 170`, class: 'fig-svg', role: 'img' });
  const c = glowColour(4300);
  s.append(
    svg('rect', { width: W, height: 170, rx: 6, fill: COL.sky }),
    svg('circle', { cx: 70, cy: 80, r: 2.5, fill: c }),
    small(70, 130, 'orange dwarf', { anchor: 'middle', fill: '#ece6d8', bold: true }),
    small(70, 145, 'radius 0.7 Suns, light 0.15', { anchor: 'middle', fill: '#a9adc2' }),
    svg('circle', { cx: 270, cy: 80, r: 62, fill: c, opacity: 0.95 }),
    small(270, 158, 'orange giant (Arcturus): 25 Suns wide, 170 Suns of light', { anchor: 'middle', fill: '#ece6d8', bold: true }),
    note(200, 18, 'Both 4,300 K, so each square metre shines the same. The giant just has far more square metres.', { anchor: 'middle', fill: '#ece6d8' }),
  );
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
