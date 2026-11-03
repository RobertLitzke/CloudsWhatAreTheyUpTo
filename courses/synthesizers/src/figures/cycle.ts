// Lesson 14, The envelope that wouldn't stop: envelope 2 drawn over two bars
// of notes. Rise and fall set one shape; the mode says when it starts. Once a
// note, it fires at each note and rests; looping, each note restarts a run of
// cycles; running free, it ignores the notes and is an LFO with its up and its
// down set apart.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';

const W = 400;
const H = 190;
const X0 = 30;
const X1 = 385;
const TOP = 40;
const BOT = 140;
/** Two bars at 120 a minute. */
const SPAN = 4;
/** Note starts, in seconds: an uneven little rhythm, so the modes differ. */
const NOTES = [0, 0.75, 1.5, 2.5, 3.0];

const RISES = [0, 0.03, 0.1, 0.3, 1];
const FALLS = [0.01, 0.03, 0.08, 0.2, 0.5];
const MODES = ['Once a note', 'Loop', 'Run free'] as const;

/** Envelope 2's level at time `t`, for a rise, a fall time constant and a mode (0 once, 1 loop, 2 run). */
export function env2At(t: number, rise: number, fall: number, mode: number): number {
  const period = rise + 3 * fall;
  const shape = (u: number) => (u < rise ? u / Math.max(rise, 1e-6) : Math.exp(-(u - rise) / fall));
  if (mode === 2) return shape(t % period);
  let start = -Infinity;
  for (const n of NOTES) if (n <= t) start = n;
  if (start === -Infinity) return 0;
  const u = t - start;
  return mode === 1 ? shape(u % period) : shape(u);
}

export const cycleFigure = figure(['loop-slow'], (_ctx, t) => {
  const f = frame(W, H, 2);
  const g = svg('g');
  f.svg.append(g);
  let rise = 3;
  let fall = 2;
  let mode = 0;
  const seen = new Set<number>();

  const x = (s: number) => X0 + (s / SPAN) * (X1 - X0);
  const y = (v: number) => BOT - v * (BOT - TOP);
  const paint = () => {
    const r = RISES[rise];
    const fl = FALLS[fall];
    let d = '';
    const n = 800;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * SPAN;
      d += `${i ? 'L' : 'M'}${x(s).toFixed(1)},${y(env2At(s, r, fl, mode)).toFixed(1)}`;
    }
    redraw(g,
      svg('line', { x1: X0, y1: BOT, x2: X1, y2: BOT, stroke: COL.grid }),
      ...NOTES.map((s) => svg('rect', { x: x(s) - 1, y: BOT + 8, width: 3, height: 12, fill: mode === 2 ? COL.soft : COL.ink, opacity: mode === 2 ? 0.4 : 1 })),
      small(X0, BOT + 36, mode === 2 ? 'notes (ignored)' : 'notes', { soft: true }),
      small(X1, BOT + 36, '2 bars', { soft: true, anchor: 'end' }),
      svg('path', { d, fill: 'none', stroke: COL.filter, 'stroke-width': 2 }),
      small(X0, TOP - 10, 'envelope 2', { bold: true, fill: COL.filter }),
    );
    const period = r + 3 * fl;
    f.readout.textContent =
      mode === 0
        ? 'Once a note: each note fires it from the bottom, it rises, falls, and waits for the next note. A pluck, a drum, a swell.'
        : mode === 1
          ? `Looping: each note restarts it, and it keeps cycling, about ${(1 / period).toFixed(1)} times a second, until the next note.`
          : `Running free: the notes don't touch it. It is an LFO, but with its rise and fall set separately: about ${(1 / period).toFixed(1)} cycles a second.`;
    seen.add(mode);
    if (seen.has(1) && seen.has(2) && r >= 0.3) t.done();
  };
  const sr = slider('Rise', 0, RISES.length - 1, 1, rise, (v) => (RISES[v] === 0 ? 'instant' : `${Math.round(RISES[v] * 1000)} ms`), (v) => { rise = v; paint(); }, 'filter');
  const sf = slider('Fall', 0, FALLS.length - 1, 1, fall, (v) => `${Math.round(FALLS[v] * 1000)} ms`, (v) => { fall = v; paint(); }, 'filter');
  const sm = slider('Mode', 0, 2, 1, mode, (v) => MODES[v], (v) => { mode = v; paint(); }, 'filter');
  f.controls.append(sm.node, sr.node, sf.node);
  paint();
  return f.node;
});
