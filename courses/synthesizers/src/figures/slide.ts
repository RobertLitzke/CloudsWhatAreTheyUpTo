// Lesson 17, The slide: four notes drawn as a pitch line, with the loudness
// under them. The second note is held into the third (the bar joins them).
// Glide bends each jump into a curve. In Retrig mode every note glides and
// every note starts its envelope again; in Legato mode only the joined pair
// glides, and the third note carries on from the second without a new start.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';

const W = 400;
const H = 230;
const X0 = 30;
const X1 = 385;
const SPAN = 2;
const P_TOP = 22;
const P_BOT = 110;
const E_TOP = 140;
const E_BOT = 192;

/** On, off (seconds), pitch (semitones), and whether it was played over the note before. */
const NOTES = [
  { on: 0, off: 0.42, p: 0, over: false },
  { on: 0.5, off: 1.0, p: 7, over: false },
  { on: 1.0, off: 1.42, p: 3, over: true },
  { on: 1.5, off: 1.92, p: 10, over: false },
];
const GLIDES = [0, 0.03, 0.08, 0.2, 0.5];
const MODES = ['Retrig', 'Legato'] as const;
const SUSTAIN = 0.6;

/** The pitch and loudness at `t`, for a glide time and a mode (0 retrig, 1 legato). */
export function slideAt(t: number, glide: number, mode: number): { p: number; level: number } {
  let p = NOTES[0].p;
  let level = 0;
  for (let i = 0; i < NOTES.length; i++) {
    const n = NOTES[i];
    if (n.on > t) break;
    // Carry the pitch and loudness from this note's start to `until`: now, or the next note.
    const until = Math.min(t, NOTES[i + 1]?.on ?? Infinity);
    const slide = mode === 1 && n.over;
    const glides = glide > 0 && (mode === 0 || slide);
    p = glides ? n.p + (p - n.p) * Math.exp(-(until - n.on) / (glide / 3)) : n.p;
    const held = Math.min(until, n.off) - n.on;
    if (slide) level = SUSTAIN + (level - SUSTAIN) * Math.exp(-held / 0.1);
    else level = held < 0.01 ? level + ((1 - level) * held) / 0.01 : SUSTAIN + (1 - SUSTAIN) * Math.exp(-(held - 0.01) / 0.1);
    if (until > n.off) level *= Math.exp(-(until - n.off) / 0.03);
  }
  return { p, level };
}

export const slideFigure = figure(['legato-glide'], (_ctx, t) => {
  const f = frame(W, H, 1.75);
  const g = svg('g');
  f.svg.append(g);
  let glide = 2;
  let mode = 0;
  const seen = new Set<string>();

  const x = (s: number) => X0 + (s / SPAN) * (X1 - X0);
  const py = (p: number) => P_BOT - (p / 10) * (P_BOT - P_TOP);
  const ey = (v: number) => E_BOT - v * (E_BOT - E_TOP);
  const paint = () => {
    const gl = GLIDES[glide];
    let pitch = '';
    let env = '';
    const n = 600;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * SPAN;
      const at = slideAt(s, gl, mode);
      pitch += `${i ? 'L' : 'M'}${x(s).toFixed(1)},${py(at.p).toFixed(1)}`;
      env += `${i ? 'L' : 'M'}${x(s).toFixed(1)},${ey(at.level).toFixed(1)}`;
    }
    redraw(g,
      // The keys as played: a bar per note, the joined pair drawn touching.
      ...NOTES.map((note) => svg('rect', { x: x(note.on), y: py(note.p) - 3, width: x(note.off) - x(note.on) - 1, height: 6, fill: COL.soft, opacity: 0.35, rx: 2 })),
      svg('path', { d: pitch, fill: 'none', stroke: COL.filter, 'stroke-width': 2.2 }),
      small(X0, 12, 'pitch', { bold: true, fill: COL.filter }),
      svg('line', { x1: X0, y1: E_BOT, x2: X1, y2: E_BOT, stroke: COL.grid }),
      svg('path', { d: env, fill: 'none', stroke: COL.ink, 'stroke-width': 1.6 }),
      small(X0, E_TOP - 8, 'loudness', { bold: true }),
      small(x(1.0), E_BOT + 18, 'held into the next', { anchor: 'middle', soft: true }),
    );
    f.readout.textContent =
      mode === 0
        ? gl === 0
          ? 'Retrig, no glide: every note jumps to its pitch and starts its envelope again.'
          : `Retrig: every note slides from the last over about ${Math.round(gl * 1000)} ms, and every note starts again.`
        : gl === 0
          ? 'Legato, no glide: the third note, played over the second, does not start again. The pitch still jumps.'
          : `Legato: only the note played over a held one slides, and it carries on without a new start. The others jump.`;
    seen.add(`${mode}:${glide}`);
    if (mode === 1 && glide >= 2) t.done();
  };
  const sg = slider('Glide', 0, GLIDES.length - 1, 1, glide, (v) => (GLIDES[v] === 0 ? 'Off' : `${Math.round(GLIDES[v] * 1000)} ms`), (v) => { glide = v; paint(); }, 'filter');
  const sm = slider('Mode', 0, 1, 1, mode, (v) => MODES[v], (v) => { mode = v; paint(); }, 'filter');
  f.controls.append(sm.node, sg.node);
  paint();
  return f.node;
});
