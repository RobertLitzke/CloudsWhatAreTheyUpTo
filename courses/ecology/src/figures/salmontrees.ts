// Branch W1, Salmon in the trees: carcasses carried from a spawning stream
// into the forest, and the ocean nitrogen and faster growth they bring to the
// trees, by distance from the bank.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, legend, slider, toggles } from './kit';

const W = 400;
export const FAR = 200;

export interface Run {
  /** Salmon spawning, as a share of a full run. */
  run: number;
  /** Bears (and eagles) carry carcasses into the forest. */
  bears: boolean;
}

/** Ocean nitrogen reaching the soil at `m` metres from the bank, relative to the soil's own supply. */
export const oceanN = (o: Run, m: number) => o.run * 0.333 * Math.exp(-m / (o.bears ? 50 : 8));
/** Share of the nitrogen in a tree's needles that came from the sea. */
export const fromSea = (o: Run, m: number) => oceanN(o, m) / (oceanN(o, m) + 1);
/** Tree growth, times that of a tree by a stream with no salmon. */
export const growth = (o: Run, m: number) => 1 + 6 * oceanN(o, m);

export const salmonTreesFigure = figure(['ocean'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const o: Run = { run: 1, bears: true };
  const tried = new Set<string>();
  const paint = () => {
    const a = axes({ x: 44, y: 20, w: 340, h: 150, xmin: 0, xmax: FAR, ymin: 0, ymax: 3, xticks: [0, 50, 100, 150, 200], yticks: [0, 1, 2, 3], xlabel: 'metres from the stream bank', ylabel: 'tree growth, × a stream with no salmon', ink: COL.ink, grid: COL.grid });
    const pts = (fn: (m: number) => number) => Array.from({ length: 81 }, (_, i) => [i * 2.5, fn(i * 2.5)] as [number, number]);
    const carcasses = Array.from({ length: Math.round(o.run * 24) }, (_, i) => {
      const m = (o.bears ? 50 : 8) * -Math.log(1 - (i + 0.5) / 25);
      return m < FAR ? svg('ellipse', { cx: a.X(m), cy: a.Y(0) - 6 - (i % 3) * 5, rx: 4, ry: 1.6, fill: COL.rose, opacity: 0.8 }) : null;
    });
    redraw(g,
      svg('rect', { x: 26, y: 20, width: 16, height: 150, fill: COL.water, opacity: 0.5 }),
      small(34, 197, 'stream', { anchor: 'middle', soft: true }),
      ...a.parts,
      ...carcasses,
      a.path(pts((m) => growth(o, m)), COL.plant, 2.4),
      a.path(pts((m) => fromSea(o, m) * 10), COL.sea, 1.8, { 'stroke-dasharray': '5 3' }),
      ...legend(44, 212, [{ text: 'tree growth', color: COL.plant }, { text: 'needle nitrogen from the sea, % ÷ 10', color: COL.sea, dash: true }, { text: 'carcass', color: COL.rose, dot: true }]),
    );
    if (o.run > 0.8 && o.bears) tried.add('full');
    if (o.run < 0.1 || !o.bears) tried.add('none');
    f.readout.textContent = o.run < 0.05
      ? 'No salmon: the trees grow on the soil’s own nitrogen, the same at every distance.'
      : `At the bank, ${Math.round(fromSea(o, 0) * 100)}% of the needles' nitrogen came from the sea and trees grow ${growth(o, 0).toFixed(1)} times as fast; 100 m in, ${Math.round(fromSea(o, 100) * 100)}% and ${growth(o, 100).toFixed(1)} times. ${o.bears ? 'Bears carry carcasses well into the forest.' : 'Without bears, carcasses stay near the water.'}`;
    if (tried.size === 2) t.done();
  };
  const rs = slider('Salmon run, share of a full one', 0, 1, 0.05, o.run, (v) => `${Math.round(v * 100)}%`, (v) => { o.run = v; paint(); }, 'rose');
  const sw = toggles(['Bears carry carcasses inland'], [true], (on) => { o.bears = on[0]; paint(); });
  f.controls.append(rs.node, sw.node);
  paint();
  return f.node;
});
