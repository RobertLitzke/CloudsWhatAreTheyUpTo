// Branch lesson O3, A string from a delay line: Karplus and Strong's string.
// The delay line holds one period of sound. At the pluck it is filled with
// noise; each trip round, every sample is averaged a little with the one
// before it and turned down a touch. The figure draws what is in the line
// after a chosen number of trips, with the sound's level over time below, and
// plays the same string computed here sample by sample (worklets.ts runs the
// same loop in the synth).

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { COL, figure, frame, slider } from './kit';

const W = 400;
const H = 250;
const N = 120;
const TRIPS = 80;
const F0 = 196;
const LOSE = 0.996;

/** A deterministic burst of noise, the same every time. */
function burst(n: number, seed = 7): Float32Array {
  let s = seed;
  return Float32Array.from({ length: n }, () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  });
}

/**
 * Run the string for `samples` samples with a line `period` long and a loop
 * filter of strength `b` (0 bright to about 0.65 dark). Returns everything it played.
 */
export function runString(period: number, b: number, samples: number, lose = LOSE): Float32Array {
  const line = burst(period);
  const out = new Float32Array(samples);
  let last = 0;
  for (let i = 0; i < samples; i++) {
    const k = i % period;
    const y = line[k];
    out[i] = y;
    last = (1 - b) * y + b * last;
    line[k] = last * lose;
  }
  return out;
}

const damp = (v: number) => 0.05 + 0.6 * v;

export const stringFigure = figure(['string-settled'], (ctx, t) => {
  const f = frame(W, H, 1.6);
  const g = svg('g');
  f.svg.append(g);
  let trips = 0;
  let timbre = 0.5;
  let sawLate = false;

  const sound = sounder(ctx, (ac, out) => {
    let src: AudioBufferSourceNode | null = null;
    const level = ac.createGain();
    level.gain.value = 0.5;
    level.connect(out);
    const make = () => {
      const period = Math.round(ac.sampleRate / F0);
      const len = Math.round(ac.sampleRate * 1.6);
      const data = runString(period, damp(timbre), len);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      buf.getChannelData(0).set(data);
      src?.stop();
      src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(level);
      src.start();
    };
    make();
    return { update: make, stop: () => src?.stop() };
  }, 'Pluck');

  const paint = () => {
    const b = damp(timbre);
    const all = runString(N, b, N * (TRIPS + 1));
    const now = all.subarray(trips * N, (trips + 1) * N);
    const peak = Math.max(0.05, ...Array.from(all.subarray(0, N), Math.abs));
    // Drawn at full height whatever its level: the strip below shows the level.
    const shown = Math.max(1e-6, ...Array.from(now, Math.abs));
    let d = '';
    now.forEach((v, i) => (d += `${i ? 'L' : 'M'}${(20 + (i / (N - 1)) * 360).toFixed(1)},${(70 - (v / shown) * 42).toFixed(1)}`));
    // The level, trip by trip: the line's loudness, in a strip below.
    const bars = Array.from({ length: TRIPS + 1 }, (_, k) => {
      const seg = all.subarray(k * N, (k + 1) * N);
      const rms = Math.sqrt(seg.reduce((a, v) => a + v * v, 0) / N) / (peak * 0.6);
      const h = Math.min(60, rms * 60);
      return svg('rect', { x: 20 + k * (360 / (TRIPS + 1)), y: 220 - h, width: 360 / (TRIPS + 1) - 1, height: h, fill: k === trips ? COL.harmonic : COL.soft, opacity: k === trips ? 1 : 0.35 });
    });
    redraw(g,
      label(20, 16, trips === 0 ? 'In the line at the pluck: noise' : `In the line after ${trips} trip${trips > 1 ? 's' : ''} round`, { bold: true }),
      svg('line', { x1: 20, y1: 70, x2: 380, y2: 70, stroke: COL.grid }),
      svg('path', { d, fill: 'none', stroke: COL.wave, 'stroke-width': 1.8 }),
      svg('line', { x1: 20, y1: 220, x2: 380, y2: 220, stroke: COL.ink }),
      ...bars,
      small(20, 236, 'level, trip by trip', { soft: true }),
      small(380, 236, `${TRIPS} trips ≈ ${Math.round((TRIPS / F0) * 1000)} ms at ${F0} Hz`, { anchor: 'end', soft: true }),
    );
    f.readout.textContent = trips === 0
      ? 'A burst of noise, one period long. Every trip round, each sample is averaged a little with its neighbour.'
      : trips < 10
        ? 'The sharpest wiggles go first: averaging smooths the high harmonics away fastest.'
        : 'What is left repeats every trip, so it is a tone at the line’s pitch, getting rounder and quieter.';
    sound.update();
    if (trips >= 40) sawLate = true;
    if (sawLate) t.done();
  };
  const st = slider('Trips round', 0, TRIPS, 1, trips, (v) => String(v), (v) => { trips = v; paint(); }, 'wave');
  const sd = slider('Timbre', 0, 10, 1, 5, (v) => `${v * 10} %`, (v) => { timbre = v / 10; paint(); }, 'harmonic');
  f.controls.append(st.node, sd.node, sound.button);
  paint();
  return f.node;
});
