// Lesson 15, Stars that shouldn't exist: a white dwarf that gets smaller as
// it gets heavier, until it collapses at Chandrasekhar's limit; and two to a
// rung, why squeezing electrons into less room makes them push back.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;

/** Chandrasekhar's limit, Suns. */
export const LIMIT = 1.44;

/** A cold white dwarf's radius, in Earth radii, for `m` Suns (Nauenberg's fit); 0 at and above the limit. */
export function dwarfRadius(m: number): number {
  const x = m / LIMIT;
  if (x >= 1) return 0;
  return 1.22 * Math.sqrt(x ** (-2 / 3) - x ** (2 / 3));
}

/** Tonnes in a teaspoon (5 millilitres) of a white dwarf of `m` Suns. */
export function teaspoon(m: number): number {
  const r = dwarfRadius(m) * 6.371e6;
  const rho = (m * 1.989e30) / ((4 / 3) * Math.PI * r ** 3);
  return (rho * 5e-6) / 1000;
}

/**
 * How fast the most energetic electrons move, as a share of light's speed, at
 * the white dwarf's average density: their momentum grows as the cube root of
 * the density, and their speed creeps up towards light's.
 */
export function electronSpeed(m: number): number {
  const r = dwarfRadius(m) * 6.371e6;
  if (r === 0) return 1;
  const rho = (m * 1.989e30) / ((4 / 3) * Math.PI * r ** 3);
  const x = (rho / 1.95e9) ** (1 / 3);
  return x / Math.sqrt(1 + x * x);
}

// ---- Heavier is smaller (live) --------------------------------------------------------------

export const dwarfFigure = figure(['limit'], (_ctx, t) => {
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let m = 0.6;
  let guessed = false;
  const paint = () => {
    const r = dwarfRadius(m);
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    // The Earth, for scale, and the white dwarf.
    const unit = 40;
    parts.push(svg('circle', { cx: 300, cy: 112, r: unit, fill: COL.earth, opacity: 0.85 }), small(300, 112 + unit + 16, 'the Earth, for size', { anchor: 'middle', fill: '#a9adc2' }));
    if (r > 0) {
      parts.push(svg('circle', { cx: 120, cy: 112, r: r * unit, fill: '#dfe8ff' }), svg('circle', { cx: 120, cy: 112, r: r * unit + 6, fill: 'none', stroke: '#dfe8ff', opacity: 0.25, 'stroke-width': 6 }));
      parts.push(small(120, 112 + Math.max(r * unit, 8) + 18, `white dwarf, ${sig(m, 2)} Suns`, { anchor: 'middle', fill: '#ece6d8' }));
    } else {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        parts.push(line(120 + 10 * Math.cos(a), 112 + 10 * Math.sin(a), 120 + 3 * Math.cos(a), 112 + 3 * Math.sin(a), COL.light, 2));
      }
      parts.push(svg('circle', { cx: 120, cy: 112, r: 2, fill: COL.light }), small(120, 140, 'collapsing', { anchor: 'middle', fill: COL.light, bold: true }));
    }
    // How fast the top electrons move.
    const v = electronSpeed(m);
    parts.push(note(14, 204, 'Fastest electrons, share of light’s speed', { fill: '#ece6d8' }), svg('rect', { x: 14, y: 212, width: 280, height: 10, fill: '#2c3350' }), svg('rect', { x: 14, y: 212, width: 280 * v, height: 10, fill: v > 0.9 ? COL.cool : COL.light }), line(294, 208, 294, 226, '#ece6d8', 1.5), small(300, 221, 'light', { fill: '#ece6d8' }));
    parts.push(note(14, 22, 'A cold white dwarf, and the Earth', { bold: true, fill: '#ece6d8' }));
    redraw(g, ...parts);
    if (!guessed) return;
    if (r === 0) {
      f.readout.textContent = `At ${sig(m, 3)} Suns no white dwarf can exist. The electrons are already as close to light’s speed as they can get, so squeezing harder can’t make them push harder, and gravity wins.`;
      if (t.goal === 'limit') t.done();
      return;
    }
    f.readout.textContent = `${sig(m, 2)} Suns packed into ${sig(r, 2)} times the Earth’s width: a teaspoon of it weighs about ${sig(teaspoon(m), 2)} tonnes. ${m > 1.3 ? 'The electrons are nearly at light’s speed.' : 'More mass squeezes it smaller, not bigger.'}`;
  };
  const s = slider('Mass', 0.2, 1.5, 0.01, m, (v) => `${sig(v, 3)} Suns`, (v) => { m = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Pile more mass onto a white dwarf. What happens to its size? Guess first.',
    options: ['It grows, like a heap of sand', 'It gets smaller', 'It stays the same size'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Add mass and watch its size and its electrons. Keep going until something gives.`;
    },
  });
  return f.node;
});

// ---- Two to a rung (a still) ----------------------------------------------------------------

export const twoPerRungStill = () => {
  const H = 210;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.paper }), note(14, 18, 'Eight electrons, two to a rung', { bold: true }));
  // In a roomy box the rungs are close together; in a tight one they spread out, so the top pair is much faster.
  const box = (x: number, w: number, gap: number, title: string) => {
    const base = 172;
    s.append(svg('rect', { x, y: 34, width: w, height: base - 34, fill: 'none', stroke: COL.soft, 'stroke-width': 1.2 }), small(x + w / 2, base + 14, title, { anchor: 'middle', bold: true }));
    for (let k = 0; k < 4; k++) {
      const y = base - 12 - k * k * gap - k * gap;
      if (y < 40) continue;
      s.append(line(x + 6, y, x + w - 6, y, COL.orbit, 1.5));
      for (const dx of [-7, 7]) s.append(svg('circle', { cx: x + w / 2 + dx, cy: y - 4, r: 3.2, fill: COL.hot }));
    }
  };
  box(40, 130, 5, 'roomy: low rungs, slow');
  box(250, 60, 9.5, 'squeezed');
  s.append(small(318, 52, 'top pair:', { soft: true }), small(318, 64, 'much faster', { soft: true }));
  s.append(small(14, 204, 'Height shows energy. No third electron fits on a rung, so squeezing pushes them up.', { soft: true }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
