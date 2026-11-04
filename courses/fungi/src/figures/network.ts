// Lesson 9, Do trees share through fungi?: the two kinds of root fungus (a
// still), and a model of Simard's 1997 labelling experiment, with a shade
// cloth over the fir, a trench that cuts the fungal links, and the scatter
// between plots that later critics stressed.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, slider, toggles, wrapped } from './kit';

const W = 400;

// ---- Two kinds of root fungus (still) ---------------------------------------------------------------

export const rootsStill = () => {
  const s = still(W, 200);
  const parts: SVGElement[] = [];
  const cellRow = (x0: number, y: number, n: number, w: number, h: number) => {
    for (let i = 0; i < n; i++) parts.push(svg('rect', { x: x0 + i * w, y, width: w, height: h, fill: '#efe3c4', stroke: '#b9a77c', 'stroke-width': 1 }));
  };
  // Left: a root tip sheathed by an ectomycorrhizal fungus, cut lengthwise.
  const L = 20;
  for (let r = 0; r < 4; r++) cellRow(L + 14, 56 + r * 22, 6, 24, 22);
  parts.push(svg('rect', { x: L, y: 44, width: 172, height: 12, fill: COL.hypha, opacity: 0.85 }));
  parts.push(svg('rect', { x: L, y: 144, width: 172, height: 12, fill: COL.hypha, opacity: 0.85 }));
  // The net between the outer cells.
  for (let i = 0; i <= 6; i++) parts.push(line(L + 14 + i * 24, 56, L + 14 + i * 24, 78, COL.hypha, 2.2), line(L + 14 + i * 24, 122, L + 14 + i * 24, 144, COL.hypha, 2.2));
  parts.push(line(L + 14, 78, L + 158, 78, COL.hypha, 1.4), line(L + 14, 122, L + 158, 122, COL.hypha, 1.4));
  // Threads out into the soil.
  for (const [x, d] of [[40, -1], [90, -1], [150, -1], [60, 1], [130, 1], [176, 1]] as const) {
    const y = d < 0 ? 44 : 156;
    parts.push(svg('path', { d: `M${x},${y} q${4 * d},${6 * d} ${-2 * d},${11 * d} t${3},${5 * d}`, stroke: COL.hypha, 'stroke-width': 1.4, fill: 'none' }));
  }
  parts.push(
    label(L + 86, 18, 'Sheath fungus (ectomycorrhiza)', { anchor: 'middle', bold: true }),
    small(L + 86, 192, 'a sheath round the root tip, a net between its cells', { anchor: 'middle', soft: true }),
  );
  // Right: arbuscular fungus inside the cells.
  const R = 214;
  for (let r = 0; r < 4; r++) cellRow(R, 56 + r * 22, 7, 24, 22);
  parts.push(svg('rect', { x: R, y: 50, width: 168, height: 6, fill: '#c7b98f' }), svg('rect', { x: R, y: 144, width: 168, height: 6, fill: '#c7b98f' }));
  // A hypha entering, running between cells, and branching into tiny trees inside two of them.
  parts.push(svg('path', { d: `M${R + 30},20 L${R + 34},50 L${R + 36},78 L${R + 120},78`, stroke: COL.hypha, 'stroke-width': 2, fill: 'none' }));
  const tree = (cx: number, cy: number) => {
    parts.push(line(cx, cy + 9, cx, cy - 2, COL.hypha, 1.6));
    for (const dx of [-6, -3, 0, 3, 6]) parts.push(line(cx, cy + 2, cx + dx, cy - 7, COL.hypha, 1));
  };
  tree(R + 60, 89); tree(R + 108, 89);
  parts.push(svg('circle', { cx: R + 110, cy: 34, r: 7, fill: COL.spore }), small(R + 122, 38, 'spore in soil', { soft: true }));
  parts.push(
    label(R + 84, 18, 'Arbuscular fungus', { anchor: 'middle', bold: true }),
    small(R + 84, 192, 'tiny branched trees inside the cells', { anchor: 'middle', soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The labelling experiment ------------------------------------------------------------------------

/** Fixed scatter for eight plots, so the dots move smoothly as the settings change. */
const SCATTER = [-1.4, -0.7, -0.3, 0.1, 0.4, 0.8, 1.2, -0.1];

/**
 * Net carbon passed from birch to fir, as a percentage of the carbon the fir
 * fixed itself, in each of eight plots. Through fungal links it grows as
 * shade makes the fir a stronger sink; a trench cuts those links but leaves
 * a smaller route through the soil. The plots scatter by `noise`.
 */
export function transfer(shade: number, trench: boolean, noise = 2): number[] {
  const fungus = trench ? 0 : 0.5 + 5 * shade;
  const soil = 0.5 + 0.5 * shade;
  return SCATTER.map((z) => fungus + soil + noise * z);
}

/** Mean and the half-width of a rough 95% range for the mean. */
export function meanRange(xs: readonly number[]): { mean: number; half: number } {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
  return { mean, half: (2 * sd) / Math.sqrt(n) };
}

export const transferFigure = figure(['plots'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let shade = 0;
  let trench = false;
  let sawTrench = false;
  let sawShade = false;
  const paint = () => {
    const plots = transfer(shade, trench);
    const { mean, half } = meanRange(plots);
    // Left: birch and fir seedlings, the shade cloth, the links and the trench.
    const scene: SVGElement[] = [
      svg('rect', { x: 10, y: 120, width: 170, height: 70, fill: COL.soil, opacity: 0.35 }),
      // Birch: a thin pale stem with rounded leaves.
      line(50, 120, 50, 60, '#cfc7b5', 4),
      ...[[40, 66], [60, 70], [44, 82], [58, 90], [50, 54]].map(([x, y]) => svg('ellipse', { cx: x, cy: y, rx: 8, ry: 6, fill: COL.leaf })),
      // Fir: a dark cone.
      line(140, 120, 140, 62, '#6b4a2e', 4),
      svg('path', { d: 'M140,50 L118,112 L162,112 Z', fill: '#2f5d3f' }),
      small(50, 136, 'birch', { anchor: 'middle', bold: true }),
      small(140, 136, 'fir', { anchor: 'middle', bold: true }),
    ];
    if (shade > 0) scene.push(svg('rect', { x: 110, y: 30, width: 60, height: 90, fill: '#1c1a1e', opacity: 0.12 + 0.6 * shade }), small(140, 26, `shade ${Math.round(shade * 100)}%`, { anchor: 'middle' }));
    // Fungal links under the soil, and the trench if cut.
    for (const dy of [0, 10, 20]) scene.push(svg('path', { d: `M52,${150 + dy} C80,${140 + dy} 110,${170 + dy} 138,${152 + dy}`, stroke: COL.hypha, 'stroke-width': 1.6, fill: 'none', opacity: trench ? 0.35 : 1 }));
    if (trench) scene.push(svg('rect', { x: 90, y: 120, width: 8, height: 70, fill: COL.ink }), small(94, 202, 'trench', { anchor: 'middle', bold: true }));
    // Right: the plots.
    const ax = axes({ x: 226, y: 26, w: 160, h: 150, xmin: 0, xmax: 1, ymin: -4, ymax: 12, yticks: [-4, 0, 4, 8, 12], ylabel: 'carbon from birch, % of fir’s own', ink: COL.ink, grid: COL.grid });
    const xs = plots.map((_, i) => 0.18 + (i % 4) * 0.08 + (i >= 4 ? 0.04 : 0));
    const clear = mean - half > 0;
    redraw(g,
      ...scene,
      ...ax.parts,
      line(226, ax.Y(0), 386, ax.Y(0), COL.ink, 1.5),
      ...ax.dots(plots.map((v, i) => [xs[i], v]), COL.data, 3.4),
      line(ax.X(0.72), ax.Y(mean - half), ax.X(0.72), ax.Y(mean + half), COL.model, 2),
      line(ax.X(0.66), ax.Y(mean - half), ax.X(0.78), ax.Y(mean - half), COL.model, 2),
      line(ax.X(0.66), ax.Y(mean + half), ax.X(0.78), ax.Y(mean + half), COL.model, 2),
      svg('circle', { cx: ax.X(0.72), cy: ax.Y(mean), r: 4, fill: COL.model }),
      small(ax.X(0.86), ax.Y(mean) + 4, `${mean.toFixed(1)}%`, { bold: true }),
      ...wrapped(232, 196, clear ? 'Average clearly above zero' : 'Average within the scatter of zero', 30, { bold: true, fill: clear ? COL.good : COL.bad }),
    );
    if (!open()) return;
    if (trench) sawTrench = true;
    if (!trench && shade >= 0.6) sawShade = true;
    f.readout.textContent = trench
      ? `With the links cut, a little carbon still crosses, ${mean.toFixed(1)}% on average, through the soil and roots; the dots now straddle zero. Any study has to rule out this route.`
      : shade < 0.3
        ? `Each dot is one pair of seedlings. In full sun the fir gets ${mean.toFixed(1)}% of its carbon from the birch on average, and the plots scatter widely around that.`
        : `Shaded, the fir makes less sugar of its own and draws more from the birch: ${mean.toFixed(1)}% on average. This is the pattern Simard reported in 1997.`;
    if (sawTrench && sawShade) t.done();
  };
  const sh = slider('Shade on the fir', 0, 0.9, 0.05, shade, (v) => `${Math.round(v * 100)}%`, (v) => { shade = v; paint(); }, 'leaf');
  const tr = toggles(['Dig a trench between them'], [false], (v) => { trench = v[0]; paint(); });
  f.controls.append(tr.node, sh.node);
  const open = guessFirst(t, f, {
    ask: 'Shade the fir so it makes less sugar of its own. Does more birch carbon end up in it, less, or the same?',
    options: ['More', 'Less', 'The same'],
    answer: 0,
    sliders: [sh],
    buttons: tr.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
