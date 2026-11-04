// Branch lesson O5, Wagon wheels and aliasing: a tone sampled at a fixed rate.
// The dots are the samples; the dashed curve is the lowest tone that passes
// through all of them, which is what comes back out. Below half the sample
// rate it is the tone itself; above, it folds back down. The sound is the
// same tone sampled and held at 4 kHz, so the fold can be heard.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { COL, figure, frame, hz, slider } from './kit';

const W = 400;
const H = 230;
/** Samples across the window, and the window's length in the sound (seconds). */
const SAMPLES = 16;
const RATE = 4000;
const WINDOW = SAMPLES / RATE;
const X0 = 20;
const X1 = 380;
const Y = 100;
const A = 55;

/** The tone that comes back from sampling `f` at `rate`: folded into 0 to rate/2. */
export function folded(f: number, rate: number): number {
  const r = f % rate;
  return r <= rate / 2 ? r : rate - r;
}

export const aliasFigure = figure(['alias-folded'], (ctx, t) => {
  const fr = frame(W, H, 1.75);
  const g = svg('g');
  fr.svg.append(g);
  let f = 500;

  const sound = sounder(ctx, (ac, out) => {
    let src: AudioBufferSourceNode | null = null;
    const level = ac.createGain();
    level.gain.value = 0.25;
    level.connect(out);
    const make = () => {
      const len = ac.sampleRate;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      // Sample and hold at RATE: each value held until the next sample.
      for (let i = 0; i < len; i++) {
        const k = Math.floor((i / ac.sampleRate) * RATE);
        d[i] = Math.sin((2 * Math.PI * f * k) / RATE);
      }
      // A gentle smoothing, as a converter's output filter would do.
      let lp = 0;
      for (let i = 0; i < len; i++) d[i] = lp += 0.35 * (d[i] - lp);
      src?.stop();
      src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(level);
      src.start();
    };
    make();
    return { update: make, stop: () => src?.stop() };
  });

  const paint = () => {
    const back = folded(f, RATE);
    const x = (s: number) => X0 + (s / WINDOW) * (X1 - X0);
    let tone = '';
    let alias = '';
    for (let i = 0; i <= 400; i++) {
      const s = (i / 400) * WINDOW;
      tone += `${i ? 'L' : 'M'}${x(s).toFixed(1)},${(Y - A * Math.sin(2 * Math.PI * f * s)).toFixed(1)}`;
      // The folded tone, with the sign that makes it meet the samples.
      const sign = f % RATE <= RATE / 2 ? 1 : -1;
      alias += `${i ? 'L' : 'M'}${x(s).toFixed(1)},${(Y - A * sign * Math.sin(2 * Math.PI * back * s)).toFixed(1)}`;
    }
    const dots = Array.from({ length: SAMPLES + 1 }, (_, k) => {
      const s = k / RATE;
      return svg('circle', { cx: x(s), cy: Y - A * Math.sin(2 * Math.PI * f * s), r: 4, fill: COL.ink });
    });
    redraw(g,
      label(X0, 16, `A ${hz(f)} tone, sampled ${RATE.toLocaleString('en')} times a second`, { bold: true }),
      svg('line', { x1: X0, y1: Y, x2: X1, y2: Y, stroke: COL.grid }),
      svg('path', { d: tone, fill: 'none', stroke: COL.wave, 'stroke-width': 1.4, opacity: 0.55 }),
      svg('path', { d: alias, fill: 'none', stroke: COL.grit, 'stroke-width': 2, 'stroke-dasharray': '5 4' }),
      ...dots,
      small(X0, 190, `Half the sample rate: ${hz(RATE / 2)}`, { soft: true }),
      small(X1, 190, `Comes back out as: ${hz(back)}`, { anchor: 'end', bold: true, fill: back === f ? COL.good : COL.bad }),
    );
    fr.readout.textContent = f <= RATE / 2
      ? 'Below half the sample rate, the samples catch every rise and fall: what comes back is the tone you put in.'
      : 'Above half the sample rate, the samples miss rises and falls, and the dots trace a lower tone. Turn it up and what comes out goes down.';
    sound.update();
    if (f >= 3000) t.done();
  };
  const s = slider('Tone', 1, 15, 1, f / 250, (v) => hz(v * 250), (v) => { f = v * 250; paint(); }, 'wave');
  fr.controls.append(s.node, sound.button);
  paint();
  return fr.node;
});
