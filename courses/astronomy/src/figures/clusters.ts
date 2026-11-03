// Lesson 12, Clusters as clocks: a cluster of stars born together on the
// Hertzsprung–Russell diagram, aged with a slider until it matches the
// Pleiades or M67; and the life of a Sun-like star as a track on the diagram.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider, toggles } from './kit';
import { glowColour } from './light';

const W = 400;
const H = 250;
const X0 = 60;
const X1 = 390;
const Y0 = 14;
const Y1 = 214;
const LT0 = Math.log10(40000);
const LT1 = Math.log10(2500);
const LL0 = -4;
const LL1 = 6;
const hx = (t: number) => X0 + ((LT0 - Math.log10(t)) / (LT0 - LT1)) * (X1 - X0);
const hy = (l: number) => Y1 - ((Math.log10(Math.max(l, 1e-4)) - LL0) / (LL1 - LL0)) * (Y1 - Y0);

/** Main-sequence life of a star of `m` Suns, years: ten billion for the Sun, falling as mass to the 2.5. */
export const lifetime = (m: number) => 1e10 * m ** -2.5;
/** Light on the main sequence, Suns. */
const msL = (m: number) => (m < 0.43 ? 0.23 * m ** 2.3 : m ** 3.6);
/** Surface temperature on the main sequence, kelvin (a rough fit). */
const msT = (m: number) => 5772 * m ** (m < 1 ? 0.55 : 0.6);

/** Where a star of `m` Suns is at `age` years: temperature, light, and what it is. */
export function starAt(m: number, age: number): { t: number; l: number; stage: 'main' | 'giant' | 'dwarf' | 'gone' } {
  const life = lifetime(m);
  if (age < life) {
    // A star brightens a little through its life on the main sequence.
    const k = age / life;
    return { t: msT(m) * (1 - 0.06 * k), l: msL(m) * (1 + 0.8 * k), stage: 'main' };
  }
  const k = (age - life) / (0.12 * life);
  if (k < 1) {
    // Off the main sequence: across to the right, then up the giant branch.
    const across = Math.min(1, k * 2.5);
    const up = Math.max(0, k * 2.5 - 1) / 1.5;
    const tGiant = m > 8 ? 3600 : 4300;
    const t = 10 ** (Math.log10(msT(m)) + (Math.log10(tGiant) - Math.log10(msT(m))) * across);
    const l = msL(m) * 1.8 * (m > 8 ? 1.3 : 1 + up * (2000 / msL(m)) ** 0.8);
    return { t, l, stage: 'giant' };
  }
  if (m > 8) return { t: 0, l: 0, stage: 'gone' };
  // A white dwarf, fading as it cools.
  const cool = (age - 1.12 * life) / 1e9 + 0.01;
  return { t: Math.max(5000, 30000 * cool ** -0.3), l: 0.01 * cool ** -1.2, stage: 'dwarf' };
}

/** The two clusters to match, with their ages, years. */
export const TARGETS = [
  { name: 'Pleiades', age: 1.1e8 },
  { name: 'M67', age: 4e9 },
].map((c) => ({ ...c, turnoff: (1e10 / c.age) ** 0.4 }));

/** A cluster's stars, as masses: many small, few big. */
function masses(n: number): [number, number][] {
  const rnd = makeRng(67);
  return Array.from({ length: n }, () => [0.35 * (1 - rnd()) ** -0.75, rnd() - 0.5] as [number, number]).filter(([m]) => m < 14);
}

/** Each star's mass, and a small scatter so the main sequence has some width, as real ones do. */
const MASSES = masses(260);

export const clustersFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let logAge = 7;
  let target = 0;
  const matched = [false, false];
  const paint = () => {
    const age = 10 ** logAge;
    const tg = TARGETS[target];
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    for (const l of [1e-4, 1e-2, 1, 100, 1e4, 1e6]) parts.push(line(X0, hy(l), X1, hy(l), COL.skyLine, 0.6), small(X0 - 4, hy(l) + 3, l >= 1 ? sig(l) : l === 1e-2 ? '1/100' : '1/10,000', { anchor: 'end', fill: '#a9adc2' }));
    for (const temp of [30000, 10000, 6000, 3500]) parts.push(small(hx(temp), Y1 + 13, temp.toLocaleString('en-US'), { anchor: 'middle', fill: '#a9adc2' }));
    parts.push(small(X1, Y1 + 26, 'surface temperature, K (hot on the left)', { anchor: 'end', fill: '#a9adc2' }), small(X0 + 4, Y0 + 8, 'light, Suns', { fill: '#a9adc2' }));
    // The real cluster's main sequence ends at its turnoff: drawn as a band to match.
    const tT = msT(tg.turnoff);
    parts.push(svg('rect', { x: hx(tT) - 7, y: hy(msL(tg.turnoff)) - 7, width: 14, height: 14, fill: 'none', stroke: COL.light, 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }), small(hx(tT) + 10, hy(msL(tg.turnoff)) - 8, `${tg.name}’s turnoff`, { fill: COL.light }));
    let gone = 0;
    let topMain = 0;
    for (const [m, wobble] of MASSES) {
      const s = starAt(m, age);
      if (s.stage === 'gone') { gone++; continue; }
      if (s.stage === 'main') topMain = Math.max(topMain, m);
      const x = hx(s.t);
      const y = hy(s.l) + wobble * 5;
      if (x < X0 - 2 || x > X1 + 2 || y < Y0 - 2 || y > Y1 + 2) continue;
      parts.push(svg('circle', { cx: x, cy: y, r: s.stage === 'giant' ? 2.6 : 1.8, fill: glowColour(Math.max(2500, s.t)) }));
    }
    redraw(g, ...parts);
    const near = Math.abs(Math.log10(age / tg.age)) < 0.18;
    if (near) matched[target] = true;
    const say = age >= 1e9 ? `${sig(age / 1e9, 2)} billion years` : `${sig(age / 1e6, 2)} million years`;
    f.readout.textContent = `At ${say}, the heaviest star still burning hydrogen in its core is about ${sig(topMain, 2)} Suns.${gone ? ` ${gone} of the heaviest have already exploded.` : ''} ${near ? `That matches ${tg.name}.` : `Match ${tg.name}’s turnoff.`}${matched.every(Boolean) ? ' Both matched.' : ''}`;
    if (matched.every(Boolean) && t.goal === 'both') t.done();
  };
  const s = slider('Cluster age', 6, 10.1, 0.01, logAge, (v) => (v >= 9 ? `${sig(10 ** (v - 9), 2)} billion yr` : `${sig(10 ** (v - 6), 2)} million yr`), (v) => { logAge = v; paint(); }, 'ink');
  const which = toggles(TARGETS.map((x) => `Match ${x.name === 'Pleiades' ? 'the Pleiades' : x.name}`), [true, false], (on) => {
    const k = on.findIndex((v, i) => v && i !== target);
    target = k >= 0 ? k : target;
    which.set(0, target === 0);
    which.set(1, target === 1);
    paint();
  });
  f.controls.append(s.node, which.node);
  paint();
  guessFirst(t, f, {
    ask: 'The Pleiades still have bright blue stars at the top of the main sequence. M67 has none, but it has red giants. Which cluster is older? Guess first.',
    options: ['The Pleiades', 'M67', 'You can’t tell from the diagram'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Age the cluster. Heavy stars leave first. Match the Pleiades, then switch to M67 and match it.`;
    },
  });
  return f.node;
});

// ---- The Sun's life (a still) --------------------------------------------------------------

export const sunLifeStill = () => {
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.sky }));
  for (const temp of [30000, 10000, 6000, 3500]) s.append(small(hx(temp), Y1 + 13, temp.toLocaleString('en-US'), { anchor: 'middle', fill: '#a9adc2' }));
  s.append(small(X1, Y1 + 26, 'surface temperature, K', { anchor: 'end', fill: '#a9adc2' }));
  // A faint main sequence for reference.
  const ms: P[] = [];
  for (let m = 0.2; m <= 15; m *= 1.15) ms.push([hx(msT(m)), hy(msL(m))]);
  s.append(polyline(ms, COL.skyLine, 6, { 'stroke-linecap': 'round', opacity: 0.8 }), small(hx(msT(0.5)), hy(msL(0.5)) + 18, 'main sequence', { anchor: 'end', fill: '#a9adc2' }));
  const track: [number, number, string, string?][] = [
    [5772, 1, 'now, 4.6 billion years', 'start'],
    [5900, 1.6, ''],
    [5000, 2.5, ''],
    [4600, 15, ''],
    [4100, 300, ''],
    [3300, 2700, 'red giant, at 11 billion years: a hundred times wider'],
    [4800, 50, 'burns helium to carbon'],
    [3300, 4000, 'swells again'],
    [20000, 3000, ''],
    [32000, 400, ''],
  ];
  const pts = track.map(([tt, l]) => [hx(Math.min(tt, 40000)), hy(l)] as P);
  s.append(polyline(pts, COL.light, 2, { 'stroke-dasharray': '5 3' }));
  s.append(svg('circle', { cx: hx(5772), cy: hy(1), r: 5, fill: COL.sun }), small(hx(5772) + 8, hy(1) + 14, 'the Sun now', { fill: '#ece6d8', bold: true }));
  s.append(svg('circle', { cx: hx(3300), cy: hy(2700), r: 9, fill: glowColour(3300) }), small(hx(3300) - 4, hy(2700) + 24, 'red giant: Mercury and Venus swallowed', { anchor: 'end', fill: '#ece6d8' }));
  s.append(svg('circle', { cx: hx(4800), cy: hy(50), r: 4, fill: glowColour(4800) }), small(hx(4800) - 8, hy(50) + 4, 'helium burning', { anchor: 'end', fill: '#ece6d8' }));
  s.append(small(hx(20000) - 10, hy(3000) - 10, 'sheds its outer layers', { fill: '#ece6d8' }));
  s.append(svg('circle', { cx: hx(25000), cy: hy(0.005), r: 3, fill: glowColour(25000) }), small(hx(25000) + 8, hy(0.005) + 4, 'white dwarf, cooling for ever', { fill: '#ece6d8' }));
  s.append(line(hx(32000), hy(400), hx(25000), hy(0.006), COL.light, 1.5, { 'stroke-dasharray': '5 3' }));
  s.append(note(X0, Y0 + 2, 'The Sun’s life, roughly', { fill: '#ece6d8', bold: true }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
