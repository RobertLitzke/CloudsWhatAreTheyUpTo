// Lesson 5, Counting beats: two tones a few hertz apart drift in and out of
// step, and the sum swells and fades that many times a second. A piano tuner
// turns a peg until the beating stops.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { COL, figure, frame, guessFirst, slider, trace } from './kit';

const W = 400;
const H = 220;
const A = 440;
/** One second across the drawing. */
const SECONDS = 1;

/** How loud the sum is at time `s`: the slow swell the ear hears, between 0 and 1. */
export const beatEnvelope = (a: number, b: number, s: number) => Math.abs(Math.cos(Math.PI * (a - b) * s));

export const beatsFigure = figure(['tuned'], (ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let off = 3;
  let wasOff = false;
  const sound = sounder(ctx, (ac, out) => {
    const one = ac.createOscillator();
    const two = ac.createOscillator();
    one.frequency.value = A;
    const set = () => two.frequency.setTargetAtTime(A + off, ac.currentTime, 0.05);
    two.frequency.value = A + off;
    one.connect(out);
    two.connect(out);
    one.start();
    two.start();
    return { update: set, stop: () => { one.stop(); two.stop(); } };
  });
  const paint = () => {
    // The waves themselves are far too fast to draw over a whole second, so
    // the drawing shows the swell the ear hears.
    const env = (x: number) => beatEnvelope(A, A + off, x * SECONDS);
    redraw(g,
      label(20, 18, `${A} Hz and ${A + off} Hz together, over one second`, { bold: true }),
      svg('path', { d: `${trace(env, 20, 110, 360, 70)} ${trace((x) => -env(1 - x), 380, 110, -360, 70).replace(/^M/, 'L')} Z`, fill: COL.wave, opacity: 0.25 }),
      svg('path', { d: trace(env, 20, 110, 360, 70), fill: 'none', stroke: COL.wave, 'stroke-width': 2 }),
      svg('path', { d: trace((x) => -env(x), 20, 110, 360, 70), fill: 'none', stroke: COL.wave, 'stroke-width': 2 }),
      svg('line', { x1: 20, y1: 110, x2: 380, y2: 110, stroke: COL.grid }),
      small(20, 200, '0 s', { soft: true }),
      small(380, 200, '1 s', { soft: true, anchor: 'end' }),
      open() ? small(200, 200, off === 0 ? 'one steady tone' : `${off} swell${off === 1 ? '' : 's'} a second`, { anchor: 'middle', bold: true, fill: COL.second }) : null,
    );
    // Until the guess is in, the readout holds the question.
    if (!open()) return;
    f.readout.textContent = off === 0
      ? 'In tune: the two stay in step for ever, and you hear one steady note, louder than either. This is what a tuner listens for.'
      : `${off} hertz apart, the second tone gains one whole cycle on the first ${off === 1 ? 'every second' : `${off} times a second`}. Each time they line up the sound swells; half a cycle later they cancel and it fades.`;
    sound.update();
    if (off !== 0) wasOff = true;
    if (wasOff && off === 0) t.done();
  };
  const s = slider('Second tone', 0, 8, 0.5, off, (v) => `${A + v} Hz`, (v) => { off = v; paint(); }, 'second');
  f.controls.append(s.node, sound.button);
  const open = guessFirst(t, f, {
    ask: `Two tuning forks, ${A} Hz and ${A + 3} Hz, struck together. What do you hear?`,
    options: ['One note that swells 3 times a second', 'Two separate notes', 'A low hum at 3 Hz'],
    answer: 0,
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});
