// Lesson 16, A log's afterlife: the fungi that follow one another through a
// fallen log, year by year, with the wood that is left, for an oak or a
// Douglas-fir, lying on the ground or held off it.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, pick, player, slider, toggles } from './kit';

const W = 400;
const YEARS = 120;

export const TREES = [
  { name: 'Oak', k: 0.035 },
  { name: 'Douglas-fir', k: 0.012 },
] as const;

/** Share of the log's wood left after `years`. Off the ground it stays drier and rots far slower. */
export function woodLeft(tree: number, years: number, ground = true): number {
  return Math.exp(-TREES[tree].k * (ground ? 1 : 0.35) * years);
}

const bump = (x: number, at: number, w: number) => Math.exp(-(((x - at) / w) ** 2));

/** Relative activity of four groups of fungi in the log, by how far decay has gone and how long it has lain. */
export function stages(tree: number, years: number, ground = true): { pioneers: number; rotters: number; fighters: number; late: number } {
  const done = 1 - woodLeft(tree, years, ground);
  const pioneers = Math.exp(-years / 2.5) * 1.2;
  const rotters = bump(done, 0.22, 0.2) * Math.min(1, years / 2);
  const fighters = bump(done, 0.55, 0.2);
  const late = 1 / (1 + Math.exp(-(done - 0.72) / 0.07));
  const sum = pioneers + rotters + fighters + late || 1;
  return { pioneers: pioneers / sum, rotters: rotters / sum, fighters: fighters / sum, late: late / sum };
}

const GROUP_COL = { pioneers: '#d0507a', rotters: '#a8643a', fighters: '#7a4e8a', late: '#3f9a9a' } as const;

export const logFigure = figure(['decades'], (ctx, t) => {
  const f = frame(W, 242, 3);
  const g = svg('g');
  f.svg.append(g);
  let tree = 0;
  let year = 0;
  let ground = true;
  let sawOak = false;
  let sawFir = false;
  const paint = () => {
    const left = woodLeft(tree, year, ground);
    const ax = axes({ x: 40, y: 92, w: 340, h: 90, xmin: 0, xmax: YEARS, ymin: 0, ymax: 1, xticks: [0, 30, 60, 90, 120], yticks: [0, 1], yfmt: (v) => (v ? 'all' : ''), xlabel: 'years since the tree fell', ink: COL.ink, grid: COL.grid });
    // Stacked shares up to this year.
    const keys = ['pioneers', 'rotters', 'fighters', 'late'] as const;
    const cols: SVGElement[] = [];
    for (let y = 0; y <= year; y += 1) {
      const s = stages(tree, y, ground);
      let base = 0;
      for (const k of keys) {
        const h = s[k];
        cols.push(svg('rect', { x: ax.X(y), y: ax.Y(base + h), width: ax.X(1) - ax.X(0) + 0.4, height: ax.Y(base) - ax.Y(base + h), fill: GROUP_COL[k] }));
        base += h;
      }
    }
    const wood = Array.from({ length: year + 1 }, (_, y) => [y, woodLeft(tree, y, ground)] as [number, number]);
    // The log itself, shrinking and darkening.
    const len = 300;
    const thick = 34 * Math.sqrt(left);
    const shade = Math.round(150 - 70 * (1 - left));
    redraw(g,
      svg('rect', { x: 0, y: 70, width: W, height: 8, fill: COL.soil, opacity: 0.6 }),
      ...(ground ? [] : [line(70, 70, 70, 44, '#5e4130', 4), line(330, 70, 330, 44, '#5e4130', 4)]),
      svg('rect', { x: 50, y: (ground ? 70 : 44) - thick, width: len, height: thick, rx: thick / 2, fill: `rgb(${shade}, ${Math.round(shade * 0.8)}, ${Math.round(shade * 0.55)})` }),
      ...(left < 0.35 && ground ? [0, 1, 2].map((i) => svg('path', { d: `M${120 + i * 70},${70 - thick} l4,-14 l4,14 z`, fill: '#4f7a3a' })) : []),
      small(50, 16, `${TREES[tree].name}, year ${year}: ${Math.round(left * 100)}% of the wood left`, { bold: true }),
      ...cols,
      ...ax.parts,
      ax.path(wood, COL.ink, 2, { 'stroke-dasharray': '5 3' }),
      ...legend(40, 222, [
        { text: 'already inside', color: GROUP_COL.pioneers },
        { text: 'first rotters', color: GROUP_COL.rotters },
        { text: 'invaders', color: GROUP_COL.fighters },
      ]),
      ...legend(40, 236, [
        { text: 'soil and root fungi', color: GROUP_COL.late },
        { text: 'wood left', color: COL.ink, dash: true },
      ]),
    );
    if (!open()) return;
    if (tree === 0 && year >= 40) sawOak = true;
    if (tree === 1 && year >= 40) sawFir = true;
    const s = stages(tree, year, ground);
    const top = (Object.keys(s) as (keyof typeof s)[]).reduce((a, b) => (s[a] > s[b] ? a : b));
    f.readout.textContent = {
      pioneers: 'The first fungi were already in the living tree, waiting. As the wood dries they wake and take the easy sugars.',
      rotters: 'Spores land and grow in; the first wood-rotters take hold, each in its own part of the log, and brackets appear.',
      fighters: 'Stronger fungi invade the first rotters’ territory, fighting along dark lines, and the wood softens.',
      late: `The log is soft and crumbling, threaded with soil fungi and tree roots. ${tree === 1 && ground ? 'Seedlings can grow on it, as on a nurse log.' : ''}`,
    }[top] + (ground ? '' : ' Held off the ground, it stays drier and every stage comes later.');
    if (sawOak && sawFir) t.done();
  };
  const ys = slider('Years', 0, YEARS, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'wood');
  const play = player(ys, ctx, { seconds: 10 });
  const tp = pick(TREES.map((x) => x.name), 0, (i) => { tree = i; paint(); });
  const gt = toggles(['Lying on the ground'], [true], (v) => { ground = v[0]; paint(); });
  f.controls.append(tp.node, gt.node, play.node, ys.node);
  const open = guessFirst(t, f, {
    ask: 'A healthy oak falls in a storm. Which fungi start rotting it first?',
    options: ['Fungi already living inside the tree', 'Spores that land on it later', 'Mushroom fungi growing up from the soil'],
    answer: 0,
    sliders: [ys],
    buttons: [...tp.buttons, ...gt.buttons],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Territories in a cut log (still) ----------------------------------------------------------------

export const territoriesStill = () => {
  const s = still(W, 190);
  const cx = 110;
  const cy = 96;
  const r = 80;
  const parts: SVGElement[] = [svg('circle', { cx, cy, r: r + 6, fill: '#6b4a2e' })];
  const sectors = [
    { a0: -100, a1: 10, fill: '#e6d3a6', name: 'a white rot fungus' },
    { a0: 10, a1: 140, fill: '#d6b98a', name: 'a second white rot' },
    { a0: 140, a1: 260, fill: '#a8774a', name: 'a brown rot fungus' },
  ];
  const pt = (a: number, rr: number) => `${cx + rr * Math.cos((a * Math.PI) / 180)},${cy + rr * Math.sin((a * Math.PI) / 180)}`;
  for (const sct of sectors) {
    parts.push(svg('path', { d: `M${cx},${cy} L${pt(sct.a0, r)} A${r},${r} 0 0 1 ${pt(sct.a1, r)} Z`, fill: sct.fill, stroke: '#2b1d14', 'stroke-width': 2.4 }));
  }
  // A late invader eating into the first sector.
  parts.push(svg('path', { d: `M${pt(-60, r)} Q${cx + 30},${cy - 40} ${pt(-10, r)} A${r},${r} 0 0 0 ${pt(-60, r)} Z`, fill: '#efe6d0', stroke: '#2b1d14', 'stroke-width': 2.4 }));
  for (let k = 1; k < 5; k++) parts.push(svg('circle', { cx, cy, r: (r * k) / 5, fill: 'none', stroke: '#000', 'stroke-opacity': 0.08 }));
  const tag = (y: number, fill: string, text: string) => parts.push(svg('rect', { x: 226, y: y - 9, width: 12, height: 12, fill, stroke: '#2b1d14' }), small(244, y + 1, text));
  tag(40, '#e6d3a6', 'a white rot fungus');
  tag(62, '#d6b98a', 'a second white rot fungus');
  tag(84, '#a8774a', 'a brown rot fungus');
  tag(106, '#efe6d0', 'an invader taking over');
  parts.push(line(226, 128, 238, 128, '#2b1d14', 2.4), small(244, 131, 'dark lines: walls where two meet'));
  s.svg.append(...parts);
  return { node: s.node };
};
