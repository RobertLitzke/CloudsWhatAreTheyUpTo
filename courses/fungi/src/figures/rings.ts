// Lesson 1, The ring in the meadow: a fairy ring spreading year by year with
// its bands of lush and dead grass, two rings that meet, and a still of the
// hidden body under an apple tree and under a mushroom.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, player, slider, toggles } from './kit';

const W = 400;

/** The meadow, in cells of CELL drawing units; each cell is a metre square. */
const CELL = 5;
const COLS = 80;
const ROWS = 40;

/** A fungus starting at (x, y) metres in year `start`, spreading `speed` metres a year. */
export interface Ring { x: number; y: number; start: number; speed: number }

/**
 * Which fungus holds a patch of meadow at (x, y) by year `year`, and how many
 * years since it arrived, or null. A fungus can only spread into soil no
 * other fungus has used: each patch goes to whichever reaches it first, so
 * two rings that meet both stop along the line between them.
 */
export function holder(rings: readonly Ring[], x: number, y: number, year: number): { ring: number; since: number } | null {
  let best = -1;
  let first = Infinity;
  rings.forEach((r, i) => {
    if (r.start > year) return;
    const at = r.start + Math.hypot(x - r.x, y - r.y) / r.speed;
    if (at < first) {
      first = at;
      best = i;
    }
  });
  return best >= 0 && first <= year ? { ring: best, since: year - first } : null;
}

/** The grass in a patch `behind` metres inside the fungus's front (null: the fungus has not reached it). */
export function grass(behind: number | null): 'lush' | 'dead' | 'recovered' | 'plain' {
  if (behind === null) return 'plain';
  if (behind < 1.2) return 'lush';
  if (behind < 2.6) return 'dead';
  return 'recovered';
}

const GRASS = { plain: '#9dbb6a', lush: '#4f7f2e', dead: '#c8b27a', recovered: '#b3c77c' } as const;

export const meadowFigure = figure(['meet'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let year = 20;
  let speed = 0.3;
  let second = false;
  let met = false;
  const rings = (): Ring[] => [
    { x: 24, y: 20, start: 0, speed },
    ...(second ? [{ x: 62, y: 18, start: 0, speed }] : []),
  ];
  const paint = () => {
    const rs = rings();
    const cells: SVGElement[] = [];
    const caps: SVGElement[] = [];
    let touching = false;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const h = holder(rs, c + 0.5, r + 0.5, year);
      const kind = grass(h ? h.since * speed : null);
      if (kind !== 'plain') cells.push(svg('rect', { x: c * CELL, y: r * CELL, width: CELL + 0.3, height: CELL + 0.3, fill: GRASS[kind] }));
      if (kind === 'lush' && (r * 7 + c * 3) % 5 === 0) caps.push(svg('circle', { cx: c * CELL + 2.5, cy: r * CELL + 2.5, r: 1.6, fill: COL.paper, stroke: COL.cap, 'stroke-width': 0.6 }));
      // Where the two fungi hold neighbouring patches, they have met.
      if (h && c + 1 < COLS) {
        const n = holder(rs, c + 1.5, r + 0.5, year);
        if (n && n.ring !== h.ring) touching = true;
      }
    }
    if (second && touching) met = true;
    const across = Math.round(2 * speed * year);
    redraw(g,
      svg('rect', { x: 0, y: 0, width: COLS * CELL, height: ROWS * CELL, fill: GRASS.plain }),
      ...cells,
      ...caps,
      svg('rect', { x: 0, y: ROWS * CELL, width: W, height: 36, fill: COL.paper }),
      ...(['lush', 'dead', 'recovered'] as const).map((k, i) => svg('rect', { x: 6 + i * 128, y: ROWS * CELL + 12, width: 12, height: 10, fill: GRASS[k], rx: 2 })),
      small(22, ROWS * CELL + 21, 'lush: nitrogen freed'),
      small(150, ROWS * CELL + 21, 'dead: soil kept dry'),
      small(278, ROWS * CELL + 21, 'recovered'),
      small(6, ROWS * CELL + 33, 'One square is a metre. White dots: mushrooms at the front.', { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = second && touching
        ? `Year ${year}. Where the two rings meet, both stop: neither fungus can grow into soil the other has already used, so the meeting line stays bare of mushrooms, as Wollaston saw in 1807.`
        : `Year ${year}. The ring is about ${across} metres across. Its mushrooms stand only at the edge, where the fungus is reaching fresh soil; behind it the grass dies back, then recovers.`;
    if (met) t.done();
  };
  const years = slider('Years', 1, 120, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'cap');
  const play = player(years, ctx, { seconds: 10 });
  const sp = slider('Spread each year', 0.1, 0.5, 0.05, speed, (v) => `${Math.round(v * 100)} cm`, (v) => { speed = v; paint(); }, 'hypha');
  const two = toggles(['A second fungus nearby'], [false], (on) => { second = on[0]; paint(); });
  f.controls.append(play.node, years.node, sp.node, two.node);
  const open = guessFirst(t, f, {
    ask: 'Two fairy rings are growing toward each other across a lawn. What happens where they meet?',
    options: ['They cross and carry on', 'Both stop where they meet', 'The bigger one swallows the smaller'],
    answer: 1,
    reveal: 'done',
    sliders: [years, sp],
    buttons: [...two.buttons, play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The hidden body (still) ------------------------------------------------------------------------

export const fruitStill = () => {
  const s = still(W, 224);
  const ground = 120;
  const parts: SVGElement[] = [
    svg('rect', { x: 0, y: ground, width: W, height: 100, fill: COL.soil, opacity: 0.25 }),
    line(0, ground, W, ground, COL.soil, 1.5),
    // An apple tree: trunk, crown, a few apples, and roots.
    svg('rect', { x: 92, y: 50, width: 12, height: ground - 50, fill: COL.wood }),
    svg('ellipse', { cx: 98, cy: 46, rx: 60, ry: 36, fill: COL.leaf, opacity: 0.85 }),
    ...[[70, 40], [112, 30], [126, 58], [84, 64], [100, 48]].map(([x, y]) => svg('circle', { cx: x, cy: y, r: 5, fill: COL.bad })),
    ...[-40, -18, 0, 20, 44].map((dx) => svg('path', { d: `M98,${ground} q${dx * 0.4},30 ${dx},${60 + Math.abs(dx) * 0.2}`, stroke: COL.wood, 'stroke-width': 3, fill: 'none' })),
    label(98, 218, 'An apple is the fruit of a tree', { anchor: 'middle', bold: true }),
  ];
  // A mushroom with its mycelium spread wide below.
  const cx = 280;
  for (let k = 0; k < 16; k++) {
    const a = (k / 15) * Math.PI;
    const len = 50 + ((k * 37) % 40);
    const ex = cx + Math.cos(a) * len * 1.2;
    const ey = ground + 8 + Math.sin(a) * len * 0.7;
    parts.push(svg('path', { d: `M${cx},${ground + 6} q${(ex - cx) * 0.4},${(ey - ground) * 0.7} ${ex - cx},${ey - ground - 6}`, stroke: COL.hypha, 'stroke-width': 0.9, fill: 'none' }));
    parts.push(svg('path', { d: `M${(cx + ex) / 2},${(ground + ey) / 2} l${8 - (k % 3) * 8},${10}`, stroke: COL.hypha, 'stroke-width': 0.6, fill: 'none' }));
  }
  parts.push(
    svg('rect', { x: cx - 4, y: ground - 36, width: 8, height: 40, fill: '#efe6cf', stroke: COL.cap, 'stroke-width': 0.8 }),
    svg('path', { d: `M${cx - 26},${ground - 34} Q${cx},${ground - 66} ${cx + 26},${ground - 34} Z`, fill: COL.cap }),
    small(cx - 32, ground - 46, 'mushroom: the fruit', { bold: true, anchor: 'end' }),
    small(cx, 204, 'mycelium: the fungus itself', { bold: true, anchor: 'middle', fill: '#7a6238' }),
    label(cx, 218, 'A mushroom is the fruit of a fungus', { anchor: 'middle', bold: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};
