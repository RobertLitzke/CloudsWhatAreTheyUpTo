// Lesson 7, The torn speaker: a wave pushed past what an amplifier can give
// is clipped flat at the top. The flattened wave carries new harmonics. A
// clipper that treats both halves alike adds only odd ones; a lopsided one
// (a valve driven hard) adds even ones too.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { choices, COL, figure, frame, slider, trace } from './kit';

const W = 400;
const H = 230;
const F0 = 147;

/** The clipper's curve: in to out, with `gain` in front and an optional lopsidedness. */
export function clipCurve(x: number, gain: number, lopsided: boolean): number {
  const y = gain * x + (lopsided ? 0.35 * gain : 0);
  const out = Math.tanh(y);
  // Take the shift back off, so silence stays silence.
  return lopsided ? out - Math.tanh(0.35 * gain) : out;
}

/** The first `n` harmonics' sizes of a clipped sine, by a discrete Fourier sum over one cycle. */
export function clipHarmonics(gain: number, lopsided: boolean, n = 10): number[] {
  const N = 512;
  const out: number[] = [];
  for (let k = 1; k <= n; k++) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < N; i++) {
      const ph = (2 * Math.PI * i) / N;
      const y = clipCurve(Math.sin(ph), gain, lopsided);
      re += y * Math.cos(k * ph);
      im += y * Math.sin(k * ph);
    }
    out.push((2 * Math.hypot(re, im)) / N);
  }
  return out;
}

export const clipFigure = figure(['even'], (ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let gain = 1;
  let lopsided = false;
  const sound = sounder(ctx, (ac, out) => {
    const osc = ac.createOscillator();
    osc.frequency.value = F0;
    const shaper = ac.createWaveShaper();
    const level = ac.createGain();
    const set = () => {
      shaper.curve = Float32Array.from({ length: 2049 }, (_, i) => clipCurve(i / 1024 - 1, gain, lopsided));
      // Keep the loudness about level, so what changes is the tone.
      level.gain.value = 0.8 / Math.max(0.3, clipHarmonics(gain, lopsided, 1)[0]);
    };
    set();
    osc.connect(shaper).connect(level).connect(out);
    osc.start();
    return { update: set, stop: () => osc.stop() };
  });
  const paint = () => {
    const h = clipHarmonics(gain, lopsided);
    const peakOut = Math.max(...Array.from({ length: 64 }, (_, i) => Math.abs(clipCurve(Math.sin((2 * Math.PI * i) / 64), gain, lopsided))));
    redraw(g,
      label(20, 18, 'In: a sine', { bold: true, fill: COL.wave }),
      svg('path', { d: trace((x) => Math.sin(4 * Math.PI * x), 20, 75, 160, 42), fill: 'none', stroke: COL.wave, 'stroke-width': 2 }),
      label(210, 18, `Out, driven ×${gain}`, { bold: true, fill: COL.grit }),
      svg('path', { d: trace((x) => clipCurve(Math.sin(4 * Math.PI * x), gain, lopsided) / Math.max(peakOut, 0.01), 210, 75, 170, 42), fill: 'none', stroke: COL.grit, 'stroke-width': 2 }),
      svg('line', { x1: 20, y1: 75, x2: 380, y2: 75, stroke: COL.grid }),
      ...h.map((a, i) => svg('rect', { x: 40 + i * 33, y: 205 - (a / h[0]) * 70, width: 18, height: (a / h[0]) * 70, fill: i === 0 ? COL.wave : (i + 1) % 2 === 0 ? COL.filter : COL.harmonic, rx: 2 })),
      ...h.map((_, i) => small(49 + i * 33, 222, String(i + 1), { anchor: 'middle', soft: true })),
      svg('line', { x1: 30, y1: 205, x2: 380, y2: 205, stroke: COL.ink }),
      small(380, 130, 'harmonics of what comes out', { anchor: 'end', soft: true }),
    );
    const evens = h.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / h[0];
    const odds = h.filter((_, i) => i % 2 === 0 && i > 0).reduce((a, b) => a + b, 0) / h[0];
    f.readout.textContent = gain <= 1.2
      ? 'Barely pushed, the curve is nearly straight: a sine goes in, a sine comes out. Turn up the drive.'
      : lopsided
        ? `Lopsided, the top is squashed more than the bottom, and even harmonics (purple) appear beside the odd ones: the 2nd is an octave up, the 4th two octaves. It sounds rounder and warmer than the symmetrical kind.`
        : `Squashed equally top and bottom, the wave turns squarer, and a square has only odd harmonics (orange): ${odds > 0.3 ? 'a hard, buzzy edge' : 'a buzz begins'}. The even bars stay empty${evens < 0.01 ? ' however hard you push' : ''}.`;
    sound.update();
    if (lopsided && gain >= 4) t.done();
  };
  const s = slider('Drive', 1, 12, 0.5, gain, (v) => `×${v}`, (v) => { gain = v; paint(); }, 'grit');
  const kind = choices(['Symmetrical', 'Lopsided'], (i) => { lopsided = i === 1; paint(); });
  kind.pick(0);
  f.controls.append(kind.node, s.node, sound.button);
  paint();
  return f.node;
});
