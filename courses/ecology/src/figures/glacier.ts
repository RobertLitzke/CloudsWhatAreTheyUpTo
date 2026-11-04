// Lesson 14, Walking back in time: Glacier Bay's ice pulling back up the bay,
// with plants filling in behind it, and a plot of bare till with or without alder.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, player, slider, toggles } from './kit';

const W = 400;

/** Distance of the ice front from the mouth of the bay, km, by year: Vancouver 1794, Muir 1879, Cooper 1916, and the West Arm since. Rounded. */
export const FRONT: readonly (readonly [number, number])[] = [
  [1760, 0], [1794, 8], [1820, 30], [1860, 60], [1879, 77], [1892, 85], [1916, 100], [1950, 104], [2020, 106],
];

/** How far up the bay the ice front stood in a year. */
export function front(year: number): number {
  if (year <= FRONT[0][0]) return 0;
  for (let i = 1; i < FRONT.length; i++) {
    if (year <= FRONT[i][0]) {
      const [x0, y0] = FRONT[i - 1];
      const [x1, y1] = FRONT[i];
      return y0 + ((year - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return FRONT[FRONT.length - 1][1];
}

/** The year the ice left a place `km` up the bay. */
export function freed(km: number): number {
  for (let i = 1; i < FRONT.length; i++) {
    const [x0, y0] = FRONT[i - 1];
    const [x1, y1] = FRONT[i];
    if (km <= y1) return y1 === y0 ? x0 : x0 + ((km - y0) / (y1 - y0)) * (x1 - x0);
  }
  return Infinity;
}

/** The stages of plant life on new ground at Glacier Bay, by years free of ice. */
export const STAGES = [
  { from: 0, name: 'Bare till', plants: 'rock flour and gravel; a little moss', color: '#cfc8b6' },
  { from: 5, name: 'Pioneers', plants: 'fireweed, horsetail, mats of mountain avens (Dryas)', color: '#c7c98f' },
  { from: 25, name: 'Alder thicket', plants: 'Sitka alder and willow, head high and dense', color: '#8fb36a' },
  { from: 70, name: 'Young spruce', plants: 'Sitka spruce through the alder, cottonwood', color: '#4f8a3c' },
  { from: 140, name: 'Spruce-hemlock forest', plants: 'tall spruce, western hemlock coming in, deep moss', color: '#2f5f2c' },
] as const;

export const stageAt = (age: number) => [...STAGES].reverse().find((s) => age >= s.from) ?? STAGES[0];

// The bay drawn as a long channel running north from Icy Strait, bending at its head.
const bayPath = (km: number): [number, number] => {
  // Mouth at the bottom, head at the top left; 106 km of bay along a gentle S.
  const t = km / 106;
  return [150 - 70 * Math.sin(t * Math.PI * 0.9) + 40 * t, 214 - t * 190];
};

export const glacierFigure = figure(['walk'], (ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let year = 1760;
  let at = 20;
  const seen = new Set<string>();
  const paint = () => {
    const ice = front(year);
    const steps = Array.from({ length: 107 }, (_, i) => i);
    const segs = steps.slice(0, -1).map((k) => {
      const [x0, y0] = bayPath(k);
      const [x1, y1] = bayPath(k + 1);
      const age = year - freed(k + 0.5);
      const colour = k + 0.5 > ice ? '#e8f1f6' : stageAt(age).color;
      return [
        line(x0, y0, x1, y1, colour, 34, { 'stroke-linecap': 'round' }),
      ];
    }).flat();
    const water = steps.slice(0, -1).filter((k) => k + 0.5 <= ice).map((k) => {
      const [x0, y0] = bayPath(k);
      const [x1, y1] = bayPath(k + 1);
      return line(x0, y0, x1, y1, COL.water, 12, { 'stroke-linecap': 'round', opacity: 0.8 });
    });
    const [ix, iy] = bayPath(Math.min(ice, 106));
    const [px, py] = bayPath(at);
    const age = year - freed(at);
    const here = at > ice ? null : stageAt(age);
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: 240, fill: '#f4f1e6' }),
      ...segs,
      ...water,
      ice < 106 ? line(ix - 22, iy, ix + 22, iy, COL.ink, 2) : null,
      ice < 106 ? small(ix + 26, iy + 4, `ice front, ${year}`, { bold: true }) : null,
      ...[[1794, 'Vancouver, 1794'], [1879, 'Muir, 1879'], [1916, 'Cooper, 1916']].filter(([y]) => year >= (y as number)).map(([y, words]) => {
        const [x, yy] = bayPath(front(y as number));
        return small(x + 22, yy + 3, words as string, { soft: true });
      }),
      svg('circle', { cx: px, cy: py, r: 6, fill: 'none', stroke: COL.heat, 'stroke-width': 2.5 }),
      label(150, 234, 'Icy Strait', { anchor: 'middle', size: 'small', soft: true }),
      ...STAGES.map((s, i) => [
        svg('rect', { x: 274, y: 30 + i * 30, width: 14, height: 14, fill: s.color, rx: 2 }),
        small(292, 41 + i * 30, s.name),
      ]).flat(),
      small(274, 20, 'Years free of ice:', { bold: true }),
      small(392, 210, 'Distances simplified;', { anchor: 'end', soft: true }),
      small(392, 222, 'stages after Cooper and Chapin', { anchor: 'end', soft: true }),
    );
    if (here) seen.add(here.name);
    f.readout.textContent = here
      ? `${Math.round(at)} km up the bay, ${year}: free of ice since about ${Math.round(freed(at))}, ${Math.round(age)} years. ${here.name}: ${here.plants}.`
      : `${Math.round(at)} km up the bay, ${year}: still under ice.`;
    if (seen.size >= 4) t.done();
  };
  const ys = slider('Year', 1760, 2020, 1, 1760, (v) => String(v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 14 });
  const ps = slider('Walk up the bay', 0, 105, 1, at, (v) => `${v} km from the mouth`, (v) => { at = v; paint(); }, 'heat');
  f.controls.append(play.node, ys.node, ps.node);
  paint();
  return f.node;
});

// ---- Alder and spruce on bare till ---------------------------------------------------------------

export interface Till {
  alder: boolean;
  /** Spruce seed arrives early (a forest nearby) rather than late. */
  seedNear: boolean;
}

export interface Plot {
  year: number;
  /** Nitrogen in the soil, kg per hectare. */
  nitrogen: number;
  /** Alder cover, 0 to 1. */
  alderCover: number;
  /** Height of the tallest spruce, m. */
  spruce: number;
}

/**
 * A plot of fresh till, stepped a year at a time for 150 years. Alder comes in
 * after about 10 years and fixes nitrogen while it lives; spruce grows at a rate
 * set by the soil's nitrogen and, while it is shorter than the alder, by shade.
 * Once spruce tops the alder, the alder dies back in its shade. A model.
 */
export function till(o: Till): Plot[] {
  const out: Plot[] = [];
  let n = 20;
  let a = 0;
  let h = 0;
  const arrive = o.seedNear ? 10 : 45;
  for (let y = 0; y <= 150; y++) {
    out.push({ year: y, nitrogen: n, alderCover: a, spruce: h });
    const alderTall = 5;
    if (o.alder && y >= 8) a += h < alderTall ? 0.12 * a * (1 - a) + (a < 0.02 ? 0.02 : 0) : -0.06 * a;
    a = Math.max(0, Math.min(1, a));
    n += (o.alder ? 45 * a : 0) + 3 - 0.004 * n;
    if (y >= arrive) {
      const food = n / (n + 400);
      const shade = h < alderTall ? 1 - 0.45 * a : 1;
      h += 0.75 * food * shade * (1 - h / 40);
    }
  }
  return out;
}

export const alderFigure = figure(['grown'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  const o: Till = { alder: true, seedNear: true };
  let year = 0;
  const paint = () => {
    const run = till(o);
    const other = till({ ...o, alder: !o.alder });
    const now = run[Math.round(year)];
    const a = axes({ x: 40, y: 20, w: 200, h: 170, xmin: 0, xmax: 150, ymin: 0, ymax: 30, xticks: [0, 50, 100, 150], yticks: [0, 10, 20, 30], xlabel: 'years since the ice left', ylabel: 'tallest spruce, m', ink: COL.ink, grid: COL.grid });
    const upto = run.slice(0, Math.round(year) + 1);
    // A cartoon of the plot now: alder bushes and a spruce.
    const ground = 196;
    const bushes = Array.from({ length: 8 }, (_, i) => svg('ellipse', { cx: 268 + i * 16, cy: ground - 10 * now.alderCover, rx: 9, ry: 12 * now.alderCover, fill: COL.lichen, opacity: now.alderCover > 0.02 ? 0.9 : 0 }));
    const sh = now.spruce * 5.6;
    redraw(g,
      ...a.parts,
      a.path(other.map((p) => [p.year, p.spruce]), COL.grid, 1.6),
      a.path(upto.map((p) => [p.year, p.spruce]), COL.plant, 2.4),
      line(256, ground, 396, ground, COL.soil, 3),
      ...bushes,
      sh > 1 ? svg('polygon', { points: `326,${ground - sh} ${326 - Math.max(3, sh / 5)},${ground} ${326 + Math.max(3, sh / 5)},${ground}`, fill: '#2f5f2c' }) : null,
      small(326, 212, `${Math.round(now.nitrogen)} kg N/ha in the soil`, { anchor: 'middle' }),
      ...legend(40, 228, [{ text: o.alder ? 'with alder' : 'without alder', color: COL.plant }, { text: o.alder ? 'without' : 'with', color: COL.grid }]),
      label(396, 24, 'A model', { anchor: 'end', size: 'small', soft: true }),
    );
    if (!open()) return;
    const at100 = run[100].spruce;
    const vs = other[100].spruce;
    f.readout.textContent = year < 10
      ? 'Fresh till: gravel and rock flour with almost no nitrogen. Play the years.'
      : `Year ${Math.round(year)}: spruce ${now.spruce.toFixed(1)} m tall, alder cover ${Math.round(now.alderCover * 100)}%, soil nitrogen ${Math.round(now.nitrogen)} kg/ha. ${year >= 100 ? `At 100 years the spruce is ${at100.toFixed(0)} m ${o.alder ? 'with' : 'without'} alder against ${vs.toFixed(0)} m ${o.alder ? 'without' : 'with'}.` : now.alderCover > 0.3 && now.spruce < 5 ? 'The alder shades the young spruce but feeds its soil.' : ''}`;
    if (year >= 100) t.done();
  };
  const ys = slider('Years since the ice left', 0, 150, 1, 0, (v) => String(v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 10 });
  const sw = toggles(['Alder', 'Spruce seed nearby'], [true, true], (on) => { o.alder = on[0]; o.seedNear = on[1]; paint(); });
  f.controls.append(play.node, ys.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'Alder shades young spruce but adds nitrogen to the soil. After a hundred years, is the spruce taller with alder or without it?',
    options: ['Taller with alder', 'Taller without alder', 'About the same'],
    answer: 0,
    sliders: [ys],
    buttons: [play.node, ...sw.buttons],
    after: () => paint(),
  });
  paint();
  return f.node;
});
