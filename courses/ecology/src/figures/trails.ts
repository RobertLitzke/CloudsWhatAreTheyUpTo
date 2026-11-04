// Branch N1, Trails that fade: a colony choosing between a long path it
// already uses and a short one that opens later, as in Goss and Deneubourg's
// double bridge. How fast the trail fades decides whether it can switch.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, player, slider } from './kit';

const W = 400;

/** Ants setting out each minute. */
const ANTS = 10;
/** Trip times on the long and the short path, minutes. */
const LONG = 2;
const SHORT = 1;
/** Share of ants that ignore the trail and choose at random. */
const WANDER = 0.15;
/** How much trail it takes to sway an ant (Deneubourg's choice rule). */
const K = 5;
/** The minute the short path opens. */
export const OPENS = 15;
export const MINUTES = 60;

/**
 * Share of the ants taking the short path, minute by minute. Each ant picks a
 * path by the square of its trail (plus a little), a few at random, and marks
 * the path it returns along; a short path is walked more often, so it is
 * marked faster. Each minute a share `fade` of the trail evaporates. A model.
 */
export function shortShare(fade: number): number[] {
  let long = 0;
  let short = 0;
  const out: number[] = [];
  for (let m = 0; m < MINUTES; m++) {
    let s = 0;
    if (m >= OPENS) {
      const wl = (K + long) ** 2;
      const ws = (K + short) ** 2;
      s = WANDER / 2 + (1 - WANDER) * (ws / (wl + ws));
    }
    long = long * (1 - fade) + (ANTS * (1 - s)) / LONG;
    short = short * (1 - fade) + (ANTS * s) / SHORT;
    out.push(s);
  }
  return out;
}

export const trailFigure = figure(['switch'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let fade = 0.02;
  let minute = 0;
  const paint = () => {
    const run = shortShare(fade);
    const m = Math.min(MINUTES - 1, Math.round(minute));
    const s = run[m];
    const open = m >= OPENS;
    const a = axes({ x: 210, y: 24, w: 176, h: 140, xmin: 0, xmax: MINUTES, ymin: 0, ymax: 100, xticks: [0, 15, 30, 45, 60], yticks: [0, 50, 100], xlabel: 'minutes', ylabel: 'ants on the short path, %', ink: COL.ink, grid: COL.grid });
    redraw(g,
      svg('path', { d: 'M 30 140 C 40 30, 160 30, 170 140', fill: 'none', stroke: COL.soil, 'stroke-width': 1 + 10 * (1 - s), 'stroke-linecap': 'round', opacity: 0.8 }),
      open ? svg('path', { d: 'M 30 140 L 170 140', fill: 'none', stroke: COL.rose, 'stroke-width': 1 + 10 * s, 'stroke-linecap': 'round', opacity: 0.85 }) : null,
      svg('circle', { cx: 30, cy: 140, r: 9, fill: COL.ink }),
      small(30, 166, 'nest', { anchor: 'middle' }),
      svg('circle', { cx: 170, cy: 140, r: 9, fill: COL.sun }),
      small(170, 166, 'food', { anchor: 'middle' }),
      small(100, 44, 'long path', { anchor: 'middle', soft: true }),
      open ? small(100, 126, 'short path', { anchor: 'middle', soft: true }) : small(100, 126, `short path opens at minute ${OPENS}`, { anchor: 'middle', soft: true }),
      ...a.parts,
      a.path(run.slice(0, m + 1).map((v, i) => [i, v * 100] as [number, number]), COL.rose, 2),
      ...legend(10, 212, [{ text: 'width of each path: ants using it', color: COL.soil }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    if (!opened()) return;
    f.readout.textContent = m < OPENS
      ? `Minute ${m}: only the long path exists, and every ant that comes back marks it.`
      : `Minute ${m}: ${Math.round(s * 100)}% of the ants take the short path. ${s > 0.7 ? 'The colony has switched: the old trail faded while the new one grew.' : fade < 0.05 ? 'The old trail is so strong that few ants try the new path, so it never builds up.' : 'The new trail is building.'}`;
    if (m >= 50 && s > 0.7) t.done();
  };
  const ms = slider('Minute', 0, MINUTES - 1, 1, 0, (v) => String(v), (v) => { minute = v; paint(); }, 'model');
  const play = player(ms, ctx, { seconds: 10 });
  const fs = slider('Trail lost each minute', 0, 0.3, 0.01, fade, (v) => `${Math.round(v * 100)}%`, (v) => { fade = v; paint(); }, 'rose');
  f.controls.append(play.node, ms.node, fs.node);
  const opened = guessFirst(t, f, {
    ask: 'Ants have marked a long path to food for fifteen minutes. Then a path half as long opens. Their trail hardly fades. What does the colony do?',
    options: ['Switches to the short path within minutes', 'Mostly stays on the long path', 'Splits evenly between them'],
    answer: 1,
    sliders: [ms, fs],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});
