// Lesson 22, Same knob, different job: one engine selector and the same three
// knobs, Wave, Timbre and Shape. Each engine gives them different jobs. The
// figure draws two cycles of the wave and its spectrum, and plays it.
//
// The waves are worked out here the way the synth's voice makes them (see
// audio/voice.ts): morph blends saw, pulse, triangle and sine and adds a square
// an octave down; fold pushes a sine (or triangle) into a sine-shaped curve,
// so past full height it folds back; supersaw adds detuned saws around the
// note. The engines' constants are the voice's.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { harmonicWave, sounder } from '../audio/tone';
import { ENGINE_JOBS } from '../core/params';
import { choices, COL, figure, frame, slider } from './kit';

const W = 400;
const H = 250;
const X0 = 20;
const X1 = 380;
const WAVE_Y = 72;
const WAVE_H = 44;
const BASE = 222;
const BAR_H = 70;
const F0 = 110;
/** Samples over the two cycles drawn and analysed. */
const N = 1024;
/** Spectrum bins: half-harmonics, so the sub-octave has a place. */
const BINS = 96;
const SHOWN = 16;
const SUPER_SPREAD = [-1, 1, -0.55, 0.55, -0.2, 0.2];
const ENGINES = ['Morph', 'Fold', 'Supersaw'] as const;
const SPREAD_DRAWN = 4;

const frac = (x: number) => x - Math.floor(x);
const saw = (x: number) => 2 * frac(x) - 1;
const tri = (x: number) => 1 - 4 * Math.abs(frac(x + 0.25) - 0.5);
const sine = (x: number) => Math.sin(2 * Math.PI * x);

export interface Knobs {
  /** 1 morph, 2 fold, 3 supersaw (ENGINE). */
  engine: number;
  wave: number;
  timbre: number;
  shape: number;
}

/** The supersaw's extra saws, as cents from the note. */
function superCents(k: Knobs): number[] {
  const n = 2 + 2 * Math.round(k.shape * 2);
  const d = 3 + 52 * k.wave;
  return SUPER_SPREAD.slice(0, n).map((f) => f * d);
}

/** The wave at `x` cycles of the note, from the engine and knobs. */
export function engineAt(k: Knobs, x: number): number {
  if (k.engine === 1) {
    const at = 3 * k.wave;
    const w = (i: number) => Math.max(0, 1 - Math.abs(at - i));
    const width = 0.5 - 0.45 * k.timbre;
    return (
      w(0) * 0.8 * saw(x) +
      w(1) * 0.5 * (saw(x) - saw(x - width)) +
      w(2) * 1.1 * tri(x) +
      w(3) * sine(x) +
      0.45 * k.shape * (frac(x / 2) < 0.5 ? 1 : -1)
    );
  }
  if (k.engine === 2) {
    const input = (1 - k.shape) * sine(x) + k.shape * tri(x);
    return 0.85 * (1 - 0.5 * Math.sqrt(k.wave)) * Math.sin((Math.PI / 2) * ((1 + 7 * k.wave) * input + 1.2 * k.timbre));
  }
  // A snapshot some way in, where the saws have drifted apart.
  const cents = superCents(k);
  const t = x + 40;
  let y = saw(t);
  for (const c of cents) y += k.timbre * saw(t * Math.pow(2, c / 1200));
  return (0.8 * y) / Math.sqrt(1 + cents.length * k.timbre * k.timbre);
}

/** Two cycles of the wave, mean removed (the voice's high-pass does the same). */
function samples(k: Knobs): Float64Array {
  const y = Float64Array.from({ length: N }, (_, i) => engineAt(k, (2 * i) / N));
  const mean = y.reduce((a, b) => a + b, 0) / N;
  return y.map((v) => v - mean);
}

/** The size of each half-harmonic (bin b is b/2 times the note). */
function spectrum(y: Float64Array): number[] {
  return Array.from({ length: BINS }, (_, b) => {
    let re = 0;
    let im = 0;
    for (let i = 0; i < N; i++) {
      const a = (2 * Math.PI * (b + 1) * i) / N;
      re += y[i] * Math.cos(a);
      im += y[i] * Math.sin(a);
    }
    return (2 * Math.hypot(re, im)) / N;
  });
}

export const enginesFigure = figure(['engines-tried'], (ctx, t) => {
  const f = frame(W, H, 1.6);
  const g = svg('g');
  f.svg.append(g);
  const k: Knobs = { engine: 1, wave: 0, timbre: 0, shape: 0 };
  /** Engines tried with a knob off zero. */
  const tried = new Set<number>();

  const sound = sounder(ctx, (ac, out) => {
    // Morph and fold as one periodic wave an octave under the note (room for
    // the sub); supersaw as real saws, so they drift as they do on the synth.
    const one = ac.createOscillator();
    one.frequency.value = F0 / 2;
    const oneGain = ac.createGain();
    one.connect(oneGain).connect(out);
    const saws = [0, ...SUPER_SPREAD].map(() => {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = F0;
      const gain = ac.createGain();
      gain.gain.value = 0;
      o.connect(gain).connect(out);
      return { o, gain };
    });
    const update = () => {
      const now = ac.currentTime;
      const sup = k.engine === 3;
      if (!sup) one.setPeriodicWave(harmonicWave(ac, spectrum(samples(k)).map((a) => a * 0.5)));
      oneGain.gain.setTargetAtTime(sup ? 0 : 0.5, now, 0.01);
      const cents = superCents(k);
      const level = 0.25 / Math.sqrt(1 + cents.length * k.timbre * k.timbre);
      saws.forEach((s, i) => {
        const on = sup && (i === 0 || i <= cents.length);
        s.o.detune.setTargetAtTime(i === 0 ? 0 : cents[i - 1] ?? 0, now, 0.01);
        s.gain.gain.setTargetAtTime(on ? level * (i === 0 ? 1 : k.timbre) : 0, now, 0.01);
      });
    };
    update();
    one.start();
    for (const s of saws) s.o.start();
    return {
      update,
      stop: () => {
        one.stop();
        for (const s of saws) s.o.stop();
      },
    };
  });

  const paint = () => {
    const y = samples(k);
    const path = Array.from({ length: N + 1 }, (_, i) => {
      const v = y[Math.min(i, N - 1)];
      return `${i ? 'L' : 'M'}${(X0 + (i / N) * (X1 - X0)).toFixed(1)},${(WAVE_Y - Math.max(-1.5, Math.min(1.5, v)) * WAVE_H).toFixed(1)}`;
    }).join('');
    const bx = (h: number) => X0 + 8 + (h / SHOWN) * (X1 - X0 - 16);
    let bars: SVGElement[];
    if (k.engine === 3) {
      // Each harmonic of each saw: the note's own, and the detuned ones beside
      // it. The spread is drawn four times wider than it is, to be seen.
      const cents = superCents(k);
      bars = [];
      for (let h = 1; h <= SHOWN; h++) {
        const amp = Math.min(BAR_H, ((0.8 * 2) / (Math.PI * h)) * BAR_H * 1.6);
        bars.push(svg('rect', { x: bx(h) - 1.2, y: BASE - amp, width: 2.4, height: amp, fill: COL.harmonic }));
        for (const c of cents) {
          const at = h * Math.pow(2, (SPREAD_DRAWN * c) / 1200);
          const a = amp * k.timbre;
          if (a > 0.3) bars.push(svg('rect', { x: bx(at) - 0.8, y: BASE - a, width: 1.6, height: a, fill: COL.second, opacity: 0.85 }));
        }
      }
      bars.push(small(X1, BASE - BAR_H - 6, 'detune drawn 4 × wider', { anchor: 'end', soft: true }));
    } else {
      const s = spectrum(y);
      bars = s.slice(0, SHOWN * 2).map((a, b) => {
        const h = Math.min(BAR_H, a * BAR_H * 1.6);
        return svg('rect', { x: bx((b + 1) / 2) - 3, y: BASE - h, width: 6, height: h, fill: COL.harmonic, rx: 1.5 });
      });
    }
    const jobs = ENGINE_JOBS[k.engine];
    redraw(g,
      svg('line', { x1: X0, y1: WAVE_Y, x2: X1, y2: WAVE_Y, stroke: COL.grid }),
      svg('path', { d: path, fill: 'none', stroke: COL.wave, 'stroke-width': 2 }),
      label(X0, 16, k.engine === 3 ? 'Two cycles, a moment in' : 'Two cycles', { bold: true }),
      svg('line', { x1: X0, y1: BASE, x2: X1, y2: BASE, stroke: COL.ink }),
      ...bars,
      ...(k.engine === 1 && k.shape > 0 ? [small(bx(0.5), BASE + 15, '½', { anchor: 'middle', soft: true })] : []),
      small(bx(1), BASE + 15, '1', { anchor: 'middle', soft: true }),
      small(bx(8), BASE + 15, '8', { anchor: 'middle', soft: true }),
      small(bx(16), BASE + 15, '16', { anchor: 'middle', soft: true }),
      small((X0 + X1) / 2, BASE + 28, 'harmonics of the note', { anchor: 'middle', soft: true }),
    );
    const pc = (v: number) => `${Math.round(v * 100)} %`;
    f.readout.textContent = `${jobs.name}: Wave is ${jobs.wave} (${pc(k.wave)}), Timbre is ${jobs.timbre} (${pc(k.timbre)}), Shape is ${jobs.shape} (${pc(k.shape)}).`;
    sound.update();
    if (k.wave + k.timbre + k.shape > 0) tried.add(k.engine);
    if (tried.size >= 3) t.done();
  };
  const knob = (name: string, key: 'wave' | 'timbre' | 'shape', colour: 'wave' | 'harmonic' | 'second') =>
    slider(name, 0, 10, 1, 0, (v) => `${v * 10} %`, (v) => { k[key] = v / 10; paint(); }, colour);
  const sw = knob('Wave', 'wave', 'wave');
  const st = knob('Timbre', 'timbre', 'harmonic');
  const ss = knob('Shape', 'shape', 'second');
  const pick = choices([...ENGINES], (i) => { k.engine = i + 1; paint(); });
  f.controls.append(pick.node, sw.node, st.node, ss.node, sound.button);
  pick.pick(0);
  return f.node;
});
