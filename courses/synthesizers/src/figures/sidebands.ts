// Lesson 6, The accidental bell: FM. A sine (the carrier) has its pitch swung
// by another sine (the modulator) hundreds of times a second. The spectrum
// grows sidebands either side of the carrier, spaced by the modulator's
// frequency, with heights from Bessel functions of the index (how far it swings).

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { choices, COL, figure, frame, hz, slider } from './kit';

const W = 400;
const H = 220;
const CARRIER = 220;
export const RATIOS = [1, 2, 3.5, 1.4];

/** The Bessel function of the first kind, J_n(x), by its series (plenty for x up to 8). */
export function bessel(n: number, x: number): number {
  const m = Math.abs(n);
  let sum = 0;
  let term = Math.pow(x / 2, m);
  for (let k = 1; k <= m; k++) term /= k;
  for (let k = 0; k < 40; k++) {
    sum += term;
    term *= (-(x * x) / 4) / ((k + 1) * (k + 1 + m));
  }
  return n < 0 && m % 2 ? -sum : sum;
}

/** The spectrum of FM: each line's frequency (as a multiple of the carrier) and size, sidebands folded from below zero and added where they land together. */
export function fmSpectrum(ratio: number, index: number): { at: number; size: number }[] {
  const lines = new Map<string, number>();
  for (let k = -12; k <= 12; k++) {
    const at = Math.abs(1 + k * ratio);
    const amp = bessel(k, index) * (1 + k * ratio < 0 ? -1 : 1);
    const key = at.toFixed(3);
    lines.set(key, (lines.get(key) ?? 0) + amp);
  }
  return [...lines].map(([at, a]) => ({ at: Number(at), size: Math.abs(a) })).filter((l) => l.size > 0.01 && l.at > 0 && l.at <= 8);
}

/** Do all the lines sit on harmonics of one note? A whole-number ratio, near enough. */
export const harmonic = (ratio: number) => Math.abs(ratio - Math.round(ratio)) < 1e-6;

const X0 = 30;
const X1 = 385;
const xOf = (m: number) => X0 + ((X1 - X0) * m) / 8;

export const sidebandsFigure = figure(['clang'], (ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let ratio = 1;
  let index = 0;
  const sound = sounder(ctx, (ac, out) => {
    const car = ac.createOscillator();
    const mod = ac.createOscillator();
    const depth = ac.createGain();
    car.frequency.value = CARRIER;
    const set = () => {
      mod.frequency.setTargetAtTime(CARRIER * ratio, ac.currentTime, 0.02);
      // The index is the swing in hertz over the modulator's frequency.
      depth.gain.setTargetAtTime(index * CARRIER * ratio, ac.currentTime, 0.02);
    };
    set();
    mod.connect(depth).connect(car.frequency);
    car.connect(out);
    mod.start();
    car.start();
    return { update: set, stop: () => { car.stop(); mod.stop(); } };
  });
  const paint = () => {
    const spec = fmSpectrum(ratio, index);
    const grid = Array.from({ length: 8 }, (_, i) => svg('line', { x1: xOf(i + 1), y1: 60, x2: xOf(i + 1), y2: 180, stroke: COL.grid, 'stroke-dasharray': '2 3' }));
    redraw(g,
      ...grid,
      ...spec.map((l) => svg('line', { x1: xOf(l.at), y1: 180, x2: xOf(l.at), y2: 180 - l.size * 120, stroke: Math.abs(l.at - 1) < 1e-6 ? COL.wave : COL.harmonic, 'stroke-width': 4 })),
      svg('line', { x1: X0, y1: 180, x2: X1, y2: 180, stroke: COL.ink }),
      ...[1, 2, 3, 4, 6, 8].map((m) => small(xOf(m), 196, hz(CARRIER * m), { anchor: m === 8 ? 'end' : 'middle', soft: true })),
      label(X0, 18, `Carrier ${hz(CARRIER)}, modulator ×${ratio}, index ${index}`, { bold: true }),
      small(X0, 40, 'dotted lines: the harmonics of the note', { soft: true }),
      small(200, 214, 'frequency', { anchor: 'middle', soft: true }),
    );
    f.readout.textContent = index === 0
      ? 'With no modulation the carrier is a plain sine: one line. Turn up the index.'
      : harmonic(ratio)
        ? `The sidebands sit ${hz(CARRIER * ratio)} apart, so with a whole-number ratio they land on the dotted harmonics: it still sounds like a note${ratio === 2 ? ', and a hollow one, with only the odd harmonics' : ''}. More index, more lines: brighter.`
        : `At ×${ratio} the sidebands fall between the harmonics, and some fold back from below zero. No single note has all these lines: the ear hears a clang, the sound of a bell or a struck bar.`;
    sound.update();
    if (!harmonic(ratio) && index >= 2) t.done();
  };
  const idx = slider('Index (how far it swings)', 0, 6, 0.5, index, (v) => `${v}`, (v) => { index = v; paint(); }, 'harmonic');
  const pick = choices(RATIOS.map((r) => `×${r}`), (i) => { ratio = RATIOS[i]; paint(); });
  pick.pick(0);
  f.controls.append(pick.node, idx.node, sound.button);
  paint();
  return f.node;
});
