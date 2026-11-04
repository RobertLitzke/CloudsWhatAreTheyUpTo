// Branch lesson O2, Organs by telephone: a Hammond organ's nine drawbars.
// Each one is a sine at one harmonic of the note (or, for the brown pair,
// under it), pulled out in nine steps of about 3 dB. The figure draws the bars
// as they stand, the wave they add up to, and plays it.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { harmonicWave, sounder } from '../audio/tone';
import { COL, figure, frame, slider, trace } from './kit';

const W = 400;
const H = 250;
/** The bars: their footage, and the harmonic of the 8-foot pitch they sound. */
export const DRAWBARS = [
  { name: '16′', h: 0.5, tone: 'brown' },
  { name: '5⅓′', h: 1.5, tone: 'brown' },
  { name: '8′', h: 1, tone: 'white' },
  { name: '4′', h: 2, tone: 'white' },
  { name: '2⅔′', h: 3, tone: 'black' },
  { name: '2′', h: 4, tone: 'white' },
  { name: '1⅗′', h: 5, tone: 'black' },
  { name: '1⅓′', h: 6, tone: 'black' },
  { name: '1′', h: 8, tone: 'white' },
] as const;
const FILL = { brown: '#8a5a3c', white: '#ece6d8', black: '#2a2a2a' } as const;
const F0 = 130.8;
const BAR_TOP = 120;
const STEP = 12;

/** A drawbar position (0 to 8) as an amplitude: each step about 3 dB. */
export const barLevel = (pos: number) => (pos <= 0 ? 0 : Math.pow(10, ((pos - 8) * 3) / 20));

/** The harmonics of the 16-foot pitch that a registration sounds (index 0 is the 16′). */
export function registration(levels: readonly number[]): number[] {
  const amps = new Array(16).fill(0);
  DRAWBARS.forEach((b, i) => (amps[b.h * 2 - 1] += barLevel(levels[i])));
  return amps;
}

export const drawbarsFigure = figure(['drawbars-888'], (ctx, t) => {
  const f = frame(W, H, 1.6);
  const g = svg('g');
  f.svg.append(g);
  const levels = [0, 0, 8, 0, 0, 0, 0, 0, 0];

  const sound = sounder(ctx, (ac, out) => {
    const osc = ac.createOscillator();
    osc.frequency.value = F0 / 2;
    const level = ac.createGain();
    level.gain.value = 0.35;
    const set = () => osc.setPeriodicWave(harmonicWave(ac, registration(levels)));
    set();
    osc.connect(level).connect(out);
    osc.start();
    return { update: set, stop: () => osc.stop() };
  });

  const paint = () => {
    const amps = registration(levels);
    const peak = Math.max(0.3, amps.reduce((a, b) => a + b, 0));
    const wave = (x: number) => amps.reduce((y, a, n) => y + a * Math.sin(2 * Math.PI * (n + 1) * x), 0) / peak;
    const bars = DRAWBARS.flatMap((b, i) => {
      const x = 40 + i * 36;
      const len = levels[i] * STEP;
      return [
        svg('rect', { x: x - 2, y: BAR_TOP - 6, width: 26, height: 6, fill: COL.ink, rx: 1 }),
        svg('rect', { x, y: BAR_TOP, width: 22, height: Math.max(2, len), fill: FILL[b.tone], stroke: COL.ink, 'stroke-width': 0.8, rx: 2 }),
        small(x + 11, BAR_TOP - 12, b.name, { anchor: 'middle', soft: true }),
        small(x + 11, BAR_TOP + Math.max(2, len) + 13, String(levels[i]), { anchor: 'middle', bold: true }),
      ];
    });
    redraw(g,
      svg('line', { x1: 20, y1: 52, x2: 380, y2: 52, stroke: COL.grid }),
      svg('path', { d: trace(wave, 20, 52, 360, 30, 360), fill: 'none', stroke: COL.wave, 'stroke-width': 2 }),
      label(20, 14, 'What they add up to', { bold: true }),
      ...bars,
    );
    const reg = `${levels.slice(0, 2).join('')} ${levels.slice(2, 6).join('')} ${levels.slice(6).join('')}`;
    f.readout.textContent = `Registration ${reg}. ` + (levels.every((v) => v === 0)
      ? 'Every bar is in: silence.'
      : `Sounding: ${DRAWBARS.filter((_, i) => levels[i] > 0).map((b) => b.name).join(', ')}.`);
    sound.update();
    if (levels.slice(0, 3).every((v) => v === 8) && levels.slice(3).every((v) => v === 0)) t.done();
  };
  const sliders = DRAWBARS.map((b, i) =>
    slider(b.name, 0, 8, 1, levels[i], (v) => String(v), (v) => { levels[i] = v; paint(); }, i < 2 ? 'grit' : 'wave'));
  f.controls.append(...sliders.map((s) => s.node), sound.button);
  paint();
  return f.node;
});
