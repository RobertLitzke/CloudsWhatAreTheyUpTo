// Lesson 2, The buzz in your throat: a voice is a buzz (the vocal folds)
// through a filter (the mouth). Two resonances, the formants, pick out the
// vowel; move them and the same buzz says a different vowel.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { VOWELS } from '../core/vowels';
import { choices, COL, figure, frame, hz, slider } from './kit';

export { VOWELS };

const W = 400;
const H = 220;
/** The buzz: a low man's voice. */
const F0 = 110;
/** How sharp each formant is. */
const Q = 6;

/** The vowel nearest these two formants, measured by ratio. */
export function nearestVowel(f1: number, f2: number): (typeof VOWELS)[number] {
  const d = (v: (typeof VOWELS)[number]) => Math.hypot(Math.log(f1 / v.f1) * 2, Math.log(f2 / v.f2));
  return VOWELS.reduce((a, b) => (d(b) < d(a) ? b : a));
}

/** How much a resonance at `fc` passes a frequency `f` (a band-pass's height, peak 1). */
export function peak(f: number, fc: number, q = Q): number {
  const r = f / fc - fc / f;
  return 1 / Math.sqrt(1 + q * q * r * r);
}

const X0 = 30;
const X1 = 385;
const FMAX = 3000;
const xOf = (f: number) => X0 + ((X1 - X0) * f) / FMAX;

export const vowelFigure = figure(['ee'], (ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let f1 = 750;
  let f2 = 1100;
  const sound = sounder(ctx, (ac, out) => {
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = F0;
    const a = ac.createBiquadFilter();
    const b = ac.createBiquadFilter();
    a.type = b.type = 'bandpass';
    a.Q.value = b.Q.value = Q;
    const bGain = ac.createGain();
    bGain.gain.value = 0.6;
    const set = () => {
      a.frequency.setTargetAtTime(f1, ac.currentTime, 0.03);
      b.frequency.setTargetAtTime(f2, ac.currentTime, 0.03);
    };
    set();
    osc.connect(a).connect(out);
    osc.connect(b).connect(bGain).connect(out);
    osc.start();
    return { update: set, stop: () => osc.stop() };
  }, 'Hear it');
  const paint = () => {
    const lines: SVGElement[] = [];
    for (let n = 1; n * F0 < FMAX; n++) {
      const fr = n * F0;
      const h = (1 / Math.sqrt(n)) * Math.max(peak(fr, f1), 0.6 * peak(fr, f2), 0.03) * 130;
      lines.push(svg('line', { x1: xOf(fr), y1: 180, x2: xOf(fr), y2: 180 - h, stroke: COL.harmonic, 'stroke-width': 2.5 }));
    }
    let curve = '';
    for (let i = 0; i <= 200; i++) {
      const fr = 40 + (i / 200) * (FMAX - 40);
      const y = 180 - Math.max(peak(fr, f1), 0.6 * peak(fr, f2)) * 140;
      curve += `${i ? 'L' : 'M'}${xOf(fr).toFixed(1)},${y.toFixed(1)}`;
    }
    const v = nearestVowel(f1, f2);
    redraw(g,
      svg('path', { d: curve, fill: 'none', stroke: COL.filter, 'stroke-width': 2, 'stroke-dasharray': '5 3' }),
      ...lines,
      svg('line', { x1: X0, y1: 180, x2: X1, y2: 180, stroke: COL.ink }),
      small(xOf(f1), 30, 'F1', { anchor: 'middle', bold: true, fill: COL.filter }),
      small(xOf(f2), 30, 'F2', { anchor: 'middle', bold: true, fill: COL.filter }),
      small(X0, 198, '0', { soft: true }),
      small(X1, 198, hz(FMAX), { soft: true, anchor: 'end' }),
      small((X0 + X1) / 2, 214, `the buzz: every harmonic of ${F0} Hz, then the mouth’s two peaks`, { anchor: 'middle', soft: true }),
      label(X1, 16, `“${v.name}” as in ${v.as}`, { anchor: 'end', bold: true }),
    );
    f.readout.textContent = `The buzz never changes: the same ${F0} Hz and its harmonics. Only the two peaks move, at ${hz(f1)} and ${hz(f2)}, and the harmonics near them come through loudest. Your ear reads that pattern as a vowel.`;
    sound.update();
    if (f1 < 360 && f2 > 2000) t.done();
  };
  const s1 = slider('F1, the jaw', 250, 900, 10, f1, hz, (v) => { f1 = v; paint(); }, 'filter');
  const s2 = slider('F2, the tongue', 700, 2500, 10, f2, hz, (v) => { f2 = v; paint(); }, 'filter');
  const pick = choices(VOWELS.map((v) => v.name), (i) => {
    f1 = VOWELS[i].f1;
    f2 = VOWELS[i].f2;
    s1.set(f1);
    s2.set(f2);
    paint();
  });
  f.controls.append(pick.node, s1.node, s2.node, sound.button);
  paint();
  return f.node;
});
