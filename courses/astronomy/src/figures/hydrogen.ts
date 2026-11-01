// Lesson 8, Mostly hydrogen: how strong each kind of line is in a star's
// spectrum depends on temperature (Saha's ionisation and Boltzmann's
// excitation), not on how much of the element there is.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import { big, COL, figure, frame, guessFirst, slider } from './kit';
import { glowColour, planck, wavelengthColour } from './light';

const W = 400;

/** Boltzmann's constant in eV per kelvin, and the Saha factor's constant (2πmₑk/h²)^1.5 in m⁻³ K^-1.5. */
const KEV = 8.617e-5;
const SAHA = 2.415e21;
const K_J = 1.380649e-23;
/** Electron pressure in a star's atmosphere, pascals (a textbook round value). */
const PE = 20;

/** Ions to neutral atoms, N(next)/N(this), at `t` kelvin, for ionisation energy `chi` eV and partition functions z0, z1. */
const ratio = (t: number, chi: number, z0: number, z1: number) => ((2 * z1) / z0) * ((SAHA * t ** 1.5 * K_J * t) / PE) * Math.exp(-chi / (KEV * t));

/** Raw strengths of each family of lines at `t` kelvin, before scaling. */
function raw(t: number) {
  // Hydrogen's visible (Balmer) lines start from its second level, 10.2 eV up.
  const hIon = ratio(t, 13.6, 2, 1);
  const n2 = (4 * Math.exp(-10.2 / (KEV * t))) / (1 + 4 * Math.exp(-10.2 / (KEV * t)));
  const hydrogen = n2 / (1 + hIon);
  // Neutral helium's visible lines start about 21 eV up.
  const heIon = ratio(t, 24.6, 1, 2);
  const helium = Math.exp(-20.9 / (KEV * t)) / (1 + heIon);
  // Ionised calcium's H and K lines start from its ground state.
  const c1 = ratio(t, 6.11, 1, 2);
  const c2 = ratio(t, 11.87, 2, 1);
  const calcium = c1 / (1 + c1 + c1 * c2);
  // Neutral iron, about 2.5 eV up.
  const fe1 = ratio(t, 7.9, 25, 30);
  const iron = Math.exp(-2.5 / (KEV * t)) / (1 + fe1);
  // Molecules such as titanium oxide survive only in the coolest atmospheres.
  const tio = t < 3000 ? 1 : Math.exp(-(((t - 3000) / 400) ** 2));
  return { hydrogen, helium, calcium, iron, tio };
}
type Family = keyof ReturnType<typeof raw>;

const FAMILIES: { id: Family; name: string; color: string }[] = [
  { id: 'hydrogen', name: 'Hydrogen', color: '#7a4fc0' },
  { id: 'helium', name: 'Helium', color: '#c98a00' },
  { id: 'calcium', name: 'Ionised calcium', color: '#3d6fb0' },
  { id: 'iron', name: 'Iron and other metals', color: '#a33a3a' },
  { id: 'tio', name: 'Molecules (titanium oxide)', color: '#5d6b3a' },
];

const TMIN = 2800;
const TMAX = 40000;
/** Each family's strongest, over the temperatures the figure spans. */
const PEAKS = (() => {
  const best: Record<string, number> = {};
  for (let lt = Math.log10(TMIN); lt <= Math.log10(TMAX); lt += 0.002) {
    const r = raw(10 ** lt);
    for (const k of Object.keys(r) as Family[]) best[k] = Math.max(best[k] ?? 0, r[k]);
  }
  return best as Record<Family, number>;
})();

/**
 * Each family's strength at `t`, 0 to 1, against its own strongest. A line's
 * darkness grows far more slowly than the number of atoms absorbing it (once
 * the centre is black, only the wings widen), so a thousandth of the atoms
 * still leaves a visible line: strength runs with the logarithm, over four
 * powers of ten.
 */
export function strengths(t: number): Record<Family, number> {
  const r = raw(t);
  return Object.fromEntries((Object.keys(r) as Family[]).map((k) => [k, Math.max(0, 1 + Math.log10(r[k] / PEAKS[k] + 1e-12) / 4)])) as Record<Family, number>;
}

/** Where hydrogen's lines are strongest, kelvin. */
export const H_PEAK = (() => {
  let best = 0;
  let at = 0;
  for (let t = 5000; t <= 20000; t += 50) {
    const v = raw(t).hydrogen;
    if (v > best) { best = v; at = t; }
  }
  return at;
})();

/** Annie Jump Cannon's class for a surface temperature. */
export const classOf = (t: number) => (t >= 30000 ? 'O' : t >= 10000 ? 'B' : t >= 7500 ? 'A' : t >= 6000 ? 'F' : t >= 5200 ? 'G' : t >= 3700 ? 'K' : 'M');

const LINE_NM: Record<Family, number[]> = {
  hydrogen: [656.3, 486.1, 434.0, 410.2],
  helium: [587.6, 501.6, 471.3, 447.1],
  calcium: [393.4, 396.8],
  iron: [527.0, 495.7, 438.4, 430.8, 404.6],
  tio: [],
};

/** A spectrum strip for a star at `t`: its glow with each family's lines taken out by their strength. */
function spectrum(x0: number, x1: number, y: number, h: number, t: number): SVGElement[] {
  const s = strengths(t);
  const out: SVGElement[] = [svg('rect', { x: x0, y, width: x1 - x0, height: h, fill: '#000' })];
  let top = 0;
  for (let nm = 390; nm <= 700; nm += 5) top = Math.max(top, planck(nm, t));
  const lo = 390;
  const hi = 700;
  const step = 0.6;
  for (let nm = lo; nm < hi; nm += step) {
    const c = nm + step / 2;
    let depth = 0;
    for (const k of Object.keys(LINE_NM) as Family[]) for (const l of LINE_NM[k]) depth = Math.max(depth, s[k] * Math.exp(-(((c - l) / (k === 'hydrogen' ? 1.4 : 0.8)) ** 2)));
    // Titanium oxide darkens broad bands in the yellow, orange and red.
    for (const [a, b] of [[545, 565], [585, 600], [615, 640], [665, 690]]) if (c > a && c < b) depth = Math.max(depth, s.tio * 0.75 * (1 - (c - a) / (b - a) * 0.6));
    const bright = (0.25 + 0.75 * (planck(c, t) / top) ** 0.5) * (1 - 0.92 * depth);
    const x = x0 + ((nm - lo) / (hi - lo)) * (x1 - x0);
    out.push(svg('rect', { x, y, width: ((step / (hi - lo)) * (x1 - x0)) + 0.3, height: h, fill: wavelengthColour(c), opacity: Math.max(0, Math.min(1, bright)) }));
  }
  return out;
}

export const linesFigure = figure(['peak'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let logT = Math.log10(5772);
  const paint = () => {
    const T = 10 ** logT;
    const s = strengths(T);
    const parts: SVGElement[] = [svg('rect', { width: W, height: 250, fill: COL.paper })];
    parts.push(
      svg('circle', { cx: 34, cy: 40, r: 18, fill: glowColour(T) }),
      svg('circle', { cx: 34, cy: 40, r: 22, fill: 'none', stroke: COL.sky, 'stroke-width': 6 }),
      note(64, 36, `Class ${classOf(T)}`, { bold: true }),
      small(64, 52, `${big(T)} K at the surface`, { soft: true }),
      ...spectrum(150, 390, 22, 34, T),
      small(150, 70, '390 nm', { soft: true }),
      small(390, 70, '700 nm', { anchor: 'end', soft: true }),
    );
    FAMILIES.forEach((fam, i) => {
      const y = 92 + i * 30;
      const w = 220 * s[fam.id];
      parts.push(
        small(10, y + 13, fam.name, { bold: true }),
        svg('rect', { x: 170, y, width: 220, height: 18, fill: COL.grid }),
        svg('rect', { x: 170, y, width: Math.max(1, w), height: 18, fill: fam.color }),
      );
    });
    parts.push(line(170, 88, 170, 240, COL.ink, 1), small(390, 244, 'each line’s strength, against its own strongest in any star', { anchor: 'end', soft: true }));
    redraw(g, ...parts);
    const top = FAMILIES.reduce((b, fam) => (s[fam.id] > s[b.id] ? fam : b));
    f.readout.textContent = T < 4000
      ? `At ${big(T)} K molecules survive, and their broad bands dominate. Hydrogen is still most of the star, but almost none of it is stirred up enough to absorb visible light.`
      : Math.abs(T - H_PEAK) < 900
        ? `Near ${big(H_PEAK)} K hydrogen’s lines are at their strongest: hot enough to lift many atoms to the level that absorbs visible light, not so hot that they lose their electron. Class A, like Sirius and Vega.`
        : T > 25000
          ? `At ${big(T)} K most hydrogen has lost its electron and can’t absorb at all, so its lines fade, and helium’s take over.`
          : `At ${big(T)} K the strongest lines are ${top.name.toLowerCase()}’s. The star’s make-up hasn’t changed; its temperature has.`;
    if (Math.abs(T - H_PEAK) < 900 && t.goal === 'peak') t.done();
  };
  const s = slider('Surface temperature', Math.log10(TMIN), Math.log10(TMAX), 0.004, logT, (v) => `${big(10 ** v)} K`, (v) => { logT = v; paint(); }, 'heat');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Hydrogen’s lines are weak in the Sun’s spectrum and strong in Sirius’s. Why? Guess first.',
    options: ['The Sun has little hydrogen', 'The Sun is too cool to show its hydrogen', 'The Sun is too hot to show it'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      paint();
      f.readout.textContent = `${guess === 1 ? 'Yes. ' : ''}Hydrogen only absorbs visible light from its second energy level, and at the Sun’s 5,800 K hardly any atoms are knocked up that far. Heat the star and find where hydrogen’s lines are strongest.`;
    },
  });
  return f.node;
});

/** Cannon's classes, each at a typical temperature: a still of seven spectra. */
const CLASSES: [string, number, string][] = [
  ['O', 35000, 'helium, ionised helium'],
  ['B', 18000, 'neutral helium'],
  ['A', 9500, 'hydrogen strongest'],
  ['F', 7000, 'hydrogen, calcium'],
  ['G', 5800, 'calcium, metals (the Sun)'],
  ['K', 4500, 'metals'],
  ['M', 3300, 'molecular bands'],
];

export const classesStill = () => {
  const s = svg('svg', { viewBox: `0 0 ${W} 260`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: 260, fill: COL.paper }));
  CLASSES.forEach(([c, t, says], i) => {
    const y = 12 + i * 34;
    s.append(
      svg('circle', { cx: 18, cy: y + 12, r: 9, fill: glowColour(t) }),
      note(34, y + 10, c, { bold: true }),
      small(34, y + 24, `${big(t)} K`, { soft: true }),
      ...spectrum(80, 300, y, 24, t),
      small(306, y + 16, says, { soft: true }),
    );
  });
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
