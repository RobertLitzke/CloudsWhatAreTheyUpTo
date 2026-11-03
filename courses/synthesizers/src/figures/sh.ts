// Lesson 13, The computer that burbles: sample and hold. A clock ticks; at
// each tick the circuit takes the noise's value and holds it until the next.
// A slow clock gives a few big random steps; a fast one hugs the noise. The
// staircase is sent to a resonant filter's cutoff, so each step is a blip.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { Rng } from '../core/rng';
import { COL, figure, frame, slider } from './kit';

const W = 400;
const H = 200;
const X0 = 30;
const X1 = 380;
const MID = 100;
const AMP = 70;
/** Noise points across the window: one bar. */
const N = 512;

/** One bar of noise, fixed so the picture is the same every time: lightly smoothed, so it can be drawn. */
const NOISE: number[] = (() => {
  const rng = new Rng(0x5348);
  const raw = Array.from({ length: N }, () => rng.next() * 2 - 1);
  return raw.map((_, i) => (raw[i] + raw[(i + 1) % N] + raw[(i + 2) % N]) / 2.2);
})();

/** The held value at position `i` of the bar, with `ticks` clock ticks in the bar. */
export function held(i: number, ticks: number): number {
  const step = N / ticks;
  return NOISE[Math.floor(Math.floor(i / step) * step)];
}

const CLOCKS = [2, 4, 8, 16, 32, 64];

export const shFigure = figure(['fast'], (ctx, t) => {
  const f = frame(W, H, 2);
  const g = svg('g');
  f.svg.append(g);
  let pick = 2;
  const ticks = () => CLOCKS[pick];
  const BAR = 2; // seconds

  const sound = sounder(ctx, (ac, out) => {
    // A saw on A2 through a resonant low-pass whose cutoff follows the staircase.
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 12;
    filter.frequency.value = 800;
    const level = ac.createGain();
    level.gain.value = 0.5;
    osc.connect(filter).connect(level).connect(out);
    osc.start();
    let next = ac.currentTime + 0.05;
    let tick = 0;
    const timer = setInterval(() => {
      while (next < ac.currentTime + 0.25) {
        const v = held(Math.floor(((tick % ticks()) / ticks()) * N), ticks());
        filter.frequency.setValueAtTime(800 * Math.pow(2, v * 2), next);
        tick++;
        next += BAR / ticks();
      }
    }, 50);
    return { update: () => {}, stop: () => { clearInterval(timer); osc.stop(); } };
  }, 'Hear it on a filter');

  const x = (i: number) => X0 + (i / N) * (X1 - X0);
  const paint = () => {
    const k = ticks();
    let noise = '';
    let stairs = '';
    for (let i = 0; i < N; i++) {
      noise += `${i ? 'L' : 'M'}${x(i).toFixed(1)},${(MID - NOISE[i] * AMP).toFixed(1)}`;
      const v = held(i, k);
      const y = (MID - v * AMP).toFixed(1);
      stairs += `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y}L${x(i + 1).toFixed(1)},${y}`;
    }
    const tickLines = Array.from({ length: k }, (_, j) => line(x((j * N) / k), MID + AMP + 6, x((j * N) / k), MID + AMP + 14, COL.ink, 1));
    redraw(g,
      svg('line', { x1: X0, y1: MID, x2: X1, y2: MID, stroke: COL.grid }),
      svg('path', { d: noise, fill: 'none', stroke: COL.soft, 'stroke-width': 0.8, opacity: 0.6 }),
      svg('path', { d: stairs, fill: 'none', stroke: COL.filter, 'stroke-width': 2.2 }),
      ...tickLines,
      small(X0, MID + AMP + 28, `clock: ${k} ticks a bar`, { bold: true }),
      small(X1, 18, 'noise (grey), held value (violet)', { anchor: 'end', soft: true }),
    );
    f.readout.textContent = k <= 4
      ? `${k} ticks a bar: a few big, slow random steps. On a filter, each is a new vowel held for a while.`
      : k <= 16
        ? `${k} ticks a bar: a new random value every ${k === 8 ? 'eighth note' : 'sixteenth note'}. On a filter this is the classic burble of a film computer.`
        : `${k} ticks a bar: the steps are so close together that the staircase follows the noise itself, and the sound turns to a gargle.`;
    if (k >= 32) t.done();
  };
  const s = slider('Clock', 0, CLOCKS.length - 1, 1, pick, (v) => `${CLOCKS[v]} a bar`, (v) => { pick = v; paint(); }, 'filter');
  f.controls.append(s.node, sound.button);
  paint();
  return f.node;
});
