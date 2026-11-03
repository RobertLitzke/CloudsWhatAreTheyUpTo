// Lesson 16, Leaning on a note: the velocity curve. How hard a key is struck
// becomes a number from 1 to 127, and a setting decides how: a soft curve
// gives big numbers for gentle playing, a hard one makes you work for them.
// The strike slider is your hand; the dot is the number the synth gets, and
// the bar is what that number does to the brightness of a pluck.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { COL, figure, frame, slider } from './kit';

const W = 400;
const H = 210;
const X0 = 46;
const X1 = 260;
const TOP = 24;
const BOT = 170;
const CURVES = [
  { name: 'Soft', gamma: 0.5 },
  { name: 'Linear', gamma: 1 },
  { name: 'Hard', gamma: 2 },
] as const;
const STRIKES = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1];

/** The velocity, 0 to 1, a strike of `s` gives on a curve. */
export function velocityOf(s: number, gamma: number): number {
  return Math.pow(s, gamma);
}

export const curveFigure = figure(['curves'], (ctx, t) => {
  const f = frame(W, H, 1.9);
  const g = svg('g');
  f.svg.append(g);
  let curve = 1;
  let strike = 2;
  const seen = new Set<number>();
  const vel = () => velocityOf(STRIKES[strike], CURVES[curve].gamma);

  // A pluck every half second, as bright and as loud as the velocity says.
  const sound = sounder(ctx, (ac, out) => {
    let next = ac.currentTime + 0.05;
    const nodes: AudioScheduledSourceNode[] = [];
    const timer = setInterval(() => {
      while (next < ac.currentTime + 0.2) {
        const v = vel();
        const osc = ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 220;
        const lp = ac.createBiquadFilter();
        lp.frequency.value = 300 * Math.pow(2, 4 * v);
        const amp = ac.createGain();
        amp.gain.setValueAtTime(0, next);
        amp.gain.linearRampToValueAtTime(0.2 + 0.8 * v, next + 0.004);
        amp.gain.setTargetAtTime(0, next + 0.004, 0.12);
        osc.connect(lp).connect(amp).connect(out);
        osc.start(next);
        osc.stop(next + 0.5);
        nodes.push(osc);
        osc.onended = () => {
          osc.disconnect();
          nodes.splice(nodes.indexOf(osc), 1);
        };
        next += 0.5;
      }
    }, 40);
    return { update: () => {}, stop: () => { clearInterval(timer); for (const n of nodes) n.stop(); } };
  }, 'Hear it');

  const x = (s: number) => X0 + s * (X1 - X0);
  const y = (v: number) => BOT - v * (BOT - TOP);
  const paint = () => {
    const v = vel();
    const s = STRIKES[strike];
    const line = (gamma: number) => {
      let d = '';
      for (let i = 0; i <= 60; i++) d += `${i ? 'L' : 'M'}${x(i / 60).toFixed(1)},${y(velocityOf(i / 60, gamma)).toFixed(1)}`;
      return d;
    };
    const midi = Math.max(1, Math.round(v * 127));
    const barH = (BOT - TOP) * v;
    redraw(g,
      svg('line', { x1: X0, y1: BOT, x2: X1, y2: BOT, stroke: COL.grid }),
      svg('line', { x1: X0, y1: TOP, x2: X0, y2: BOT, stroke: COL.grid }),
      ...CURVES.map((c, i) => svg('path', { d: line(c.gamma), fill: 'none', stroke: i === curve ? COL.filter : COL.soft, 'stroke-width': i === curve ? 2.4 : 1, opacity: i === curve ? 1 : 0.45 })),
      svg('line', { x1: x(s), y1: BOT, x2: x(s), y2: y(v), stroke: COL.ink, 'stroke-dasharray': '3 3' }),
      svg('line', { x1: X0, y1: y(v), x2: x(s), y2: y(v), stroke: COL.ink, 'stroke-dasharray': '3 3' }),
      svg('circle', { cx: x(s), cy: y(v), r: 5, fill: COL.filter }),
      small(X0 - 6, y(v) + 4, String(midi), { anchor: 'end', bold: true }),
      small((X0 + X1) / 2, BOT + 22, 'how hard you strike', { anchor: 'middle', soft: true }),
      small(X0, TOP - 10, 'velocity sent (1-127)', { soft: true }),
      // What the number does: the cutoff of a pluck, two octaves for the full range.
      svg('rect', { x: 320, y: BOT - barH, width: 34, height: Math.max(1, barH), fill: COL.filter, opacity: 0.8 }),
      svg('rect', { x: 320, y: TOP, width: 34, height: BOT - TOP, fill: 'none', stroke: COL.grid }),
      small(337, BOT + 22, 'brightness', { anchor: 'middle', soft: true }),
    );
    f.readout.textContent =
      curve === 0
        ? `Soft curve: a ${Math.round(s * 100)} % strike already sends ${midi}. Easy to play loud, hard to play quietly.`
        : curve === 1
          ? `Linear: the number follows your hand, ${midi} for a ${Math.round(s * 100)} % strike.`
          : `Hard curve: a ${Math.round(s * 100)} % strike sends only ${midi}. Quiet playing is easy; loud takes a real strike.`;
    seen.add(curve);
    if (seen.size === 3) t.done();
  };
  const sc = slider('Curve', 0, 2, 1, curve, (v) => CURVES[v].name, (v) => { curve = v; paint(); }, 'filter');
  const ss = slider('Strike', 0, STRIKES.length - 1, 1, strike, (v) => `${Math.round(STRIKES[v] * 100)} %`, (v) => { strike = v; paint(); }, 'filter');
  f.controls.append(sc.node, ss.node, sound.button);
  paint();
  return f.node;
});
