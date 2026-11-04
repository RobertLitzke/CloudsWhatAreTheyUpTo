// Lesson 15, Is a forest an organism?: Whittaker's species along a mountainside
// against Clements's tidy communities, and a strip of forest grown gap by gap.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, COL, figure, frame, guessFirst, legend, pick, player, slider, toggles } from './kit';

const W = 400;

/** Trees of the Great Smoky Mountains along elevation on moist slopes, simplified after Whittaker (1956): peak height and spread, m. */
export const SLOPE = [
  { name: 'Tulip tree', peak: 700, spread: 230, color: '#c98a2e' },
  { name: 'Hemlock', peak: 950, spread: 300, color: '#2f7f9a' },
  { name: 'Sugar maple', peak: 1150, spread: 240, color: '#b4553a' },
  { name: 'Yellow birch', peak: 1380, spread: 260, color: '#a3b36a' },
  { name: 'Beech', peak: 1450, spread: 300, color: '#7a3b6e' },
  { name: 'Red spruce', peak: 1650, spread: 200, color: '#4f8a3c' },
  { name: 'Fraser fir', peak: 1880, spread: 110, color: '#1f2a28' },
] as const;

/** Clements's view: the same slope as three communities with sharp edges. */
const ZONES = [
  { name: 'Cove forest', from: 500, to: 1050, has: [0, 1] },
  { name: 'Northern hardwoods', from: 1050, to: 1550, has: [2, 3, 4] },
  { name: 'Spruce-fir forest', from: 1550, to: 2000, has: [5, 6] },
];

export const abundance = (i: number, m: number) => Math.exp(-0.5 * ((m - SLOPE[i].peak) / SLOPE[i].spread) ** 2);

export const whittakerFigure = figure(['compare'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let view = 0;
  const seen = new Set<number>();
  const paint = () => {
    const a = axes({ x: 30, y: 26, w: 360, h: 150, xmin: 500, xmax: 2000, ymin: 0, ymax: 1.1, xticks: [500, 1000, 1500, 2000], yticks: [], xlabel: 'height above sea level, m', ylabel: 'share of the trees', ink: COL.ink, grid: COL.grid });
    const ms = Array.from({ length: 61 }, (_, i) => 500 + i * 25);
    const curves = view === 0
      ? SLOPE.map((s, i) => a.path(ms.map((m) => [m, abundance(i, m)]), s.color, 2.2))
      : ZONES.map((z) => [
        svg('rect', { x: a.X(z.from), y: a.Y(1), width: a.X(z.to) - a.X(z.from) - 2, height: a.Y(0) - a.Y(1), fill: COL.plant, opacity: 0.12, stroke: COL.plant, 'stroke-width': 1.5 }),
        label((a.X(z.from) + a.X(z.to)) / 2, a.Y(1) + 16, z.name, { anchor: 'middle', bold: true, size: 'small' }),
        ...z.has.map((k, j) => small((a.X(z.from) + a.X(z.to)) / 2, a.Y(1) + 34 + j * 14, SLOPE[k].name, { anchor: 'middle', fill: SLOPE[k].color })),
      ]).flat();
    redraw(g,
      ...a.parts,
      ...curves,
      ...(view === 0 ? legend(30, 212, SLOPE.slice(0, 4).map((s) => ({ text: s.name, color: s.color }))).concat(legend(30, 228, SLOPE.slice(4).map((s) => ({ text: s.name, color: s.color })))) : []),
    );
    seen.add(view);
    f.readout.textContent = view === 0
      ? 'Whittaker’s slope, simplified: each species rises and falls on its own, with its own peak and spread. The curves overlap, and no edge is shared by a whole group.'
      : 'Clements’s picture: the slope divided into three communities, each a set of species that belong together, with sharp edges where one community gives way to the next.';
    if (seen.size === 2) t.done();
  };
  const p = pick(['Whittaker’s counts', 'Clements’s communities'], 0, (i) => { view = i; paint(); });
  f.controls.append(p.node);
  paint();
  return f.node;
});

// ---- The gap model ---------------------------------------------------------------------

export const TREES = [
  { name: 'Birch', color: '#a3b36a', life: 90, tall: 0.7 },
  { name: 'Maple', color: '#b4553a', life: 220, tall: 0.9 },
  { name: 'Beech', color: '#7a3b6e', life: 320, tall: 1 },
] as const;

export interface Forest {
  /** Birch seed raining in, relative to the others. */
  seed: number;
  /** Every species equally able to grow in shade. */
  equal: boolean;
}

export const PLOTS = 40;
export const YEARS = 400;
/** Years a storm flattens a stretch of the strip: first plot and width. */
export const STORMS: readonly (readonly [number, number, number])[] = [[60, 4, 12], [210, 22, 14], [330, 10, 6]];

/** What stands in each plot, by year: species and age. A seeded random forest, so a run is the same each time for the same settings. */
export function grow(o: Forest): { sp: number; age: number }[][] {
  const rng = makeRng(1966);
  let plots = Array.from({ length: PLOTS }, (_, i) => ({ sp: [2, 1, 2, 2, 1, 0][i % 6], age: 20 + Math.floor(rng() * 200) }));
  const out = [plots.map((p) => ({ ...p }))];
  for (let y = 1; y <= YEARS; y++) {
    const dead = plots.map((p) => {
      const life = TREES[p.sp].life;
      const risk = 1 / (life * 2) + (p.age > life ? 0.08 : 0);
      return rng() < risk;
    });
    for (const [at, from, width] of STORMS) if (y === at) for (let k = from; k < from + width; k++) dead[k] = true;
    plots = plots.map((p, i) => {
      if (!dead[i]) return { ...p, age: p.age + 1 };
      // Light reaching the gap: the share of the plots within two either side also opened this year.
      let open = 0;
      for (let k = i - 2; k <= i + 2; k++) if (k >= 0 && k < PLOTS && dead[k]) open++;
      const bright = open >= 4;
      const w = o.equal
        ? [o.seed, 1, 1]
        : bright ? [6 * o.seed, 1, 0.15] : [0.03 * o.seed, 0.8, 1.6];
      const r = rng() * (w[0] + w[1] + w[2]);
      return { sp: r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2, age: 0 };
    });
    out.push(plots.map((p) => ({ ...p })));
  }
  return out;
}

export const counts = (row: { sp: number }[]) => TREES.map((_, s) => row.filter((p) => p.sp === s).length);

export const gapsFigure = figure(['storm'], (ctx, t) => {
  const f = frame(W, 262, 3);
  const g = svg('g');
  f.svg.append(g);
  const o: Forest = { seed: 1, equal: false };
  let year = 0;
  let run = grow(o);
  const paint = () => {
    const row = run[Math.round(year)];
    const strip = row.map((p, i) => {
      const x = 12 + i * 9.4;
      const h = Math.min(1, p.age / 60) * 70 * TREES[p.sp].tall + 3;
      return [
        line(x + 4, 96, x + 4, 96 - h * 0.4, COL.soil, 1.4),
        svg('ellipse', { cx: x + 4, cy: 96 - h * 0.65, rx: 4.4, ry: Math.max(2, h * 0.32), fill: TREES[p.sp].color, opacity: 0.9 }),
      ];
    }).flat();
    const a = axes({ x: 36, y: 128, w: 350, h: 92, xmin: 0, xmax: YEARS, ymin: 0, ymax: PLOTS, xticks: [0, 100, 200, 300, 400], yticks: [0, 20, 40], xlabel: 'years', ylabel: 'plots held', ink: COL.ink, grid: COL.grid });
    const series = TREES.map((_, s) => run.slice(0, Math.round(year) + 1).filter((_, k) => k % 4 === 0).map((r, k) => [k * 4, counts(r)[s]] as [number, number]));
    const storm = STORMS.find(([y]) => year >= y && year < y + 60);
    redraw(g,
      line(8, 97, 392, 97, COL.soil, 2),
      ...strip,
      ...STORMS.filter(([y]) => y <= year).map(([y]) => line(a.X(y), a.Y(PLOTS), a.X(y), a.Y(0), COL.heat, 1, { 'stroke-dasharray': '3 3' })),
      storm ? svg('rect', { x: 12 + storm[1] * 9.4 - 1, y: 102, width: storm[2] * 9.4, height: 5, fill: COL.heat }) : null,
      storm ? small(12 + storm[1] * 9.4, 117, `storm, year ${storm[0]}`, { fill: COL.heat }) : null,
      ...a.parts,
      ...series.map((s, k) => a.path(s, TREES[k].color, 2)),
      ...legend(36, 256, TREES.map((tr) => ({ text: tr.name, color: tr.color }))),
      small(392, 256, 'A model', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    const c = counts(row);
    const inStorm = storm ? row.slice(storm[1], storm[1] + storm[2]) : [];
    const birchInStorm = inStorm.filter((p) => p.sp === 0).length;
    f.readout.textContent = storm && year - storm[0] < 50
      ? `Year ${Math.round(year)}: in the ${storm[2]} plots the storm flattened, ${birchInStorm} are birch. ${o.equal ? 'With every species alike in shade, the gap fills by the luck of the seed.' : 'Full sun favours the pioneer; in the shade around it, single gaps go to beech and maple.'}`
      : `Year ${Math.round(year)}: ${c[0]} birch, ${c[1]} maple, ${c[2]} beech. ${o.equal ? 'No species has an edge in shade, so the mixture drifts at random.' : 'Single trees die and their gaps go mostly to shade-tolerant beech and maple waiting beneath.'}`;
    if (year >= 230) t.done();
  };
  const ys = slider('Year', 0, YEARS, 1, 0, (v) => String(v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 16 });
  const seed = slider('Birch seed raining in', 0.2, 3, 0.1, 1, (v) => `${v.toFixed(1)}×`, (v) => { o.seed = v; run = grow(o); paint(); }, 'plant');
  const sw = toggles(['All equally shade-tolerant'], [false], (on) => { o.equal = on[0]; run = grow(o); paint(); });
  f.controls.append(play.node, ys.node, seed.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'A storm flattens a wide patch of the forest. Which tree mostly fills the middle of it?',
    options: ['Birch, which needs full sun', 'Beech, which grows in shade', 'Whatever stood there before'],
    answer: 0,
    sliders: [ys, seed],
    buttons: [play.node, ...sw.buttons],
    after: () => paint(),
  });
  paint();
  return f.node;
});
