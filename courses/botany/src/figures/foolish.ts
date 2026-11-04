// Lesson 14, The foolish seedling: tall and semi-dwarf wheat given more and
// more fertiliser, with a summer storm; and two kinds of dwarf, one that
// makes too little gibberellin and one that can't respond to it.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider, toggles, wrapped } from './kit';

const W = 400;

export type Wheat = 'tall' | 'semi';

/**
 * A wheat field given `n` kg of nitrogen fertiliser a hectare: its height
 * (cm), the grain it could make (tonnes a hectare), the share flattened by a
 * summer storm, and the grain harvested. Fertiliser makes heavier heads and
 * taller straw; a tall stalk with a heavy head is a long lever, and falls.
 * Semi-dwarfs put less into straw and more into grain.
 */
export function field(kind: Wheat, n: number, storm: boolean): { height: number; potential: number; lodged: number; grain: number } {
  const grow = 2 + 6 * (1 - Math.exp(-n / 80));
  const potential = kind === 'tall' ? 0.8 * grow : grow;
  const height = kind === 'tall' ? 120 + 0.15 * n : 80 + 0.05 * n;
  const lodged = storm ? Math.min(1, Math.max(0, (height * potential - 700) / 300)) : 0;
  return { height, potential, lodged, grain: potential * (1 - 0.6 * lodged) };
}

export const lodgingFigure = figure(['lodge'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 40;
  let storm = true;
  let sawTallDown = false;
  let sawSemiHigh = false;
  const paint = () => {
    const shown = open();
    const ground = 190;
    const parts: SVGElement[] = [];
    (['tall', 'semi'] as const).forEach((kind, i) => {
      const r = field(kind, shown ? n : 0, storm && shown);
      const x0 = 20 + i * 190;
      const scale = 0.7;
      for (let k = 0; k < 9; k++) {
        const x = x0 + 12 + k * 18;
        const down = k / 9 < r.lodged;
        const h = r.height * scale;
        const head = 3 + r.potential * 0.9;
        const tip: [number, number] = down ? [x + h * 0.8, ground - h * 0.35] : [x + 4, ground - h];
        parts.push(
          svg('path', { d: `M${x},${ground} Q${down ? x + h * 0.4 : x + 2},${down ? ground - h * 0.5 : ground - h * 0.5} ${tip[0]},${tip[1]}`, stroke: '#c8a64a', 'stroke-width': 2, fill: 'none' }),
          svg('ellipse', { cx: tip[0], cy: tip[1], rx: down ? head * 2 : head, ry: down ? head : head * 2, fill: '#d9b24c', stroke: '#a8822e', 'stroke-width': 0.8 }),
        );
      }
      parts.push(
        label(x0, 22, kind === 'tall' ? 'Tall wheat' : 'Semi-dwarf wheat', { bold: true }),
        small(x0, 38, shown ? `${Math.round(r.height)} cm, ${Math.round(r.lodged * 100)}% flattened` : 'sown', { soft: true }),
        small(x0, 52, shown ? `grain: ${r.grain.toFixed(1)} tonnes a hectare` : '', { fill: COL.sugar, bold: true }),
      );
    });
    redraw(g,
      svg('rect', { x: 0, y: ground, width: W, height: 40, fill: COL.soil, opacity: 0.3 }),
      line(200, 60, 200, ground, COL.grid, 1),
      ...parts,
      small(200, 222, `Nitrogen: ${n} kg a hectare${storm ? ', with a summer storm' : ''}. A model.`, { anchor: 'middle', soft: true }),
    );
    if (!shown) return;
    const tall = field('tall', n, storm);
    const semi = field('semi', n, storm);
    if (storm && tall.lodged > 0.3) sawTallDown = true;
    if (storm && n >= 150 && semi.lodged < 0.05) sawSemiHigh = true;
    f.readout.textContent = !storm
      ? `No storm, nothing falls. The semi-dwarf still gives more grain, ${semi.grain.toFixed(1)} t against ${tall.grain.toFixed(1)} t, because less of what it makes goes into straw.`
      : tall.lodged > 0.3
        ? `More fertiliser made taller straw and heavier heads, and the storm laid ${Math.round(tall.lodged * 100)}% of the tall wheat flat, where its grain rots or can’t be harvested. The short straw holds its heads up: ${semi.grain.toFixed(1)} t against ${tall.grain.toFixed(1)} t.`
        : `At this much fertiliser the tall wheat still stands. Add more and see what the storm does.`;
    if (sawTallDown && sawSemiHigh) t.done();
  };
  const ns = slider('Nitrogen fertiliser', 0, 200, 10, n, (v) => `${v} kg/ha`, (v) => { n = v; paint(); }, 'nitrogen');
  const st = toggles(['Summer storm'], [true], (on) => { storm = on[0]; paint(); });
  f.controls.append(ns.node, st.node);
  const open = guessFirst(t, f, {
    ask: 'Two wheat fields, one tall and one semi-dwarf, are given lots of fertiliser, and a summer storm comes. Which gives more grain?',
    options: ['The tall wheat', 'The semi-dwarf', 'About the same'],
    answer: 1,
    reveal: 'done',
    sliders: [ns],
    buttons: st.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Two kinds of dwarf ----------------------------------------------------------------------------------

export type Plant = 'pea' | 'dwarfPea' | 'dwarfWheat';

/** Height (as a share of a normal plant's) with and without gibberellin sprayed on. */
export function sprayed(p: Plant, ga: boolean): number {
  if (p === 'pea') return ga ? 1.2 : 1;
  if (p === 'dwarfPea') return ga ? 1.15 : 0.35;
  return 0.65; // Norin 10's gene: the plant can't respond to the hormone, so spraying does nothing.
}

const PLANTS: { id: Plant; name: string; why: string }[] = [
  { id: 'pea', name: 'Tall pea', why: 'makes gibberellin' },
  { id: 'dwarfPea', name: 'Mendel’s short pea', why: 'makes too little' },
  { id: 'dwarfWheat', name: 'Semi-dwarf wheat', why: 'can’t respond to it' },
];

export const dwarfsFigure = figure(['spray'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let ga = false;
  const paint = () => {
    const ground = 170;
    const parts: SVGElement[] = [];
    PLANTS.forEach((p, i) => {
      const x = 70 + i * 130;
      const h = 130 * sprayed(p.id, ga);
      if (p.id === 'dwarfWheat') {
        for (const dx of [-8, 0, 8]) parts.push(svg('path', { d: `M${x + dx},${ground} q${dx * 0.3},${-h * 0.5} ${dx * 0.6},${-h}`, stroke: '#c8a64a', 'stroke-width': 2.5, fill: 'none' }));
        for (const dx of [-8, 0, 8]) parts.push(svg('ellipse', { cx: x + dx * 1.6, cy: ground - h - 6, rx: 4, ry: 9, fill: '#d9b24c' }));
      } else {
        parts.push(line(x, ground, x, ground - h, COL.leaf, 3));
        const nodes = 6;
        for (let k = 1; k <= nodes; k++) {
          const y = ground - (h * k) / (nodes + 0.5);
          parts.push(svg('ellipse', { cx: x - 9, cy: y, rx: 8, ry: 4, fill: COL.leaf }), svg('ellipse', { cx: x + 9, cy: y - 3, rx: 8, ry: 4, fill: COL.leaf }));
        }
      }
      parts.push(
        label(x, ground + 20, p.name, { anchor: 'middle', bold: true }),
        small(x, ground + 34, p.why, { anchor: 'middle', soft: true }),
      );
      if (ga) for (let k = 0; k < 5; k++) parts.push(svg('circle', { cx: x - 20 + k * 10, cy: 24 + (k % 2) * 6, r: 2, fill: COL.hormone }));
    });
    redraw(g, svg('rect', { x: 0, y: ground, width: W, height: 6, fill: COL.soil, opacity: 0.4 }), ...parts, ...wrapped(10, 14, ga ? 'Sprayed with gibberellin (pink).' : '', 40, { soft: true }));
    f.readout.textContent = ga
      ? 'The short pea shoots up to full height: it was only short of the hormone. The wheat stays short: its stems get the signal but its cells don’t act on it.'
      : 'Two dwarfs, both short for want of one working gene. Spray them with gibberellin.';
    if (ga) t.done();
  };
  const sp = toggles(['Spray with gibberellin'], [false], (on) => { ga = on[0]; paint(); });
  f.controls.append(sp.node);
  paint();
  return f.node;
});
