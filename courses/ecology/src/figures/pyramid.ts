// Lesson 10, Why big fierce animals are rare: the energy pyramid, with a
// share passed up at each step, and the ocean's upside-down pyramid of mass.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { big, COL, figure, frame, guessFirst, slider, toggles } from './kit';

const W = 400;

/** Energy the plants capture in a year, in units. */
export const PLANTS = 10_000;
/** The least energy a level needs to keep a breeding population going, in the same units. */
export const ENOUGH = 5;
const NAMES = ['Plants', 'Plant-eaters', 'Meat-eaters', 'Meat-eaters’ hunters', 'A fifth level'];
const COLORS = [COL.plant, COL.prey, COL.predator, COL.heat, COL.rose];

/** Energy reaching each of five levels when `share` passes up at each step. */
export const levels = (share: number) => NAMES.map((_, i) => PLANTS * share ** i);

/** How many levels get enough energy to live on. */
export const supported = (share: number) => levels(share).filter((e) => e >= ENOUGH).length;

export const pyramidFigure = figure(['five'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let share = 0.1;
  const paint = () => {
    const e = levels(share);
    const n = supported(share);
    const cx = 130;
    const rows = e.map((v, i) => {
      const y = 190 - i * 40;
      const w = Math.max(2, (v / PLANTS) * 220);
      const alive = v >= ENOUGH;
      return [
        svg('rect', { x: cx - w / 2, y, width: w, height: 26, fill: COLORS[i], opacity: alive ? 0.9 : 0.25, rx: 2 }),
        small(cx + Math.max(w / 2, 4) + 6, y + 11, NAMES[i], { bold: true, fill: alive ? COL.ink : COL.soft }),
        small(cx + Math.max(w / 2, 4) + 6, y + 23, alive ? `${v >= 10 ? big(v) : v.toFixed(1)} units` : `${v < 0.1 ? '<0.1' : v.toFixed(1)}: too little to live on`, { soft: true }),
        i < e.length - 1 && alive ? small(392, y + 18, `heat ${big(v * (1 - share))}`, { anchor: 'end', fill: COL.heat }) : null,
      ];
    }).flat();
    redraw(g,
      ...rows,
      label(392, 22, 'lost as heat each year', { anchor: 'end', fill: COL.heat, size: 'small', bold: true }),
      small(10, 230, `Widths to scale. A level needs ${ENOUGH} units to keep its animals alive. A model.`, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = `With ${Math.round(share * 100)}% passed up at each step, ${big(PLANTS)} units of plant become ${e.slice(1, 4).map((v) => (v >= 10 ? big(v) : v.toFixed(1))).join(', then ')}. ${n} level${n === 1 ? '' : 's'} can live on it; the rest leaves as heat.`;
    if (n >= 5) t.done();
  };
  const s = slider('Share passed up each step', 0.02, 0.25, 0.01, share, (v) => `${Math.round(v * 100)}%`, (v) => { share = v; paint(); }, 'heat');
  f.controls.append(s.node);
  const open = guessFirst(t, f, {
    ask: `Plants capture ${big(PLANTS)} units of energy a year, and each step up passes on a tenth. How much reaches the fourth level, the hunters of meat-eaters?`,
    options: ['About 5,000', 'About 1,000', 'About 10'],
    answer: 2,
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Upside-down pyramids ---------------------------------------------------------------------

/** Yearly production of each level, and how long its average member lives, in years. */
const SEA = [
  { name: 'Algae', made: 1000, color: COL.plant },
  { name: 'Small animals', made: 100, life: 0.5, color: COL.prey },
  { name: 'Fish', made: 10, life: 2, color: COL.rival },
];

/** The mass standing in the water at any moment: what each level makes in a year times how long it lasts. */
export const standing = (algaeDays: number) => SEA.map((l, i) => l.made * (i === 0 ? algaeDays / 365 : l.life!));

export const standingFigure = figure(['flip'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let days = 365;
  let flows = false;
  const paint = () => {
    const mass = standing(days);
    const top = Math.max(...mass, 1);
    const side = (cx: number, values: number[], title: string, unit: string, scale: number) => [
      label(cx, 20, title, { anchor: 'middle', bold: true }),
      ...values.map((v, i) => {
        const y = 160 - i * 50;
        const w = Math.max(2, (v / scale) * 170);
        return [
          svg('rect', { x: cx - w / 2, y, width: w, height: 30, fill: SEA[i].color, opacity: 0.88, rx: 2 }),
          small(cx, y + 44, `${SEA[i].name}: ${v >= 10 ? big(v) : v.toFixed(1)} ${unit}`, { anchor: 'middle' }),
        ];
      }).flat(),
    ];
    redraw(g,
      ...(flows
        ? [...side(100, mass, 'Mass in the water now', 't', top), ...side(300, SEA.map((l) => l.made), 'Made each year', 't', 1000), line(200, 30, 200, 210, COL.grid, 1)]
        : side(200, mass, 'Mass in the water now', 'tonnes', top)),
    );
    const flipped = mass[0] < mass[1];
    f.readout.textContent = flipped
      ? `Algae that live ${Math.round(days)} days are eaten almost as fast as they grow: at any moment there is less of them (${mass[0].toFixed(1)}) than of the animals eating them (${big(mass[1])}). The pyramid of mass stands on its point; the pyramid of what's made each year doesn't.`
      : `Algae that last ${days >= 365 ? 'a year, like grass' : `${Math.round(days)} days`} pile up, and the pyramid of mass stands the right way up.`;
    if (flipped && flows) t.done();
  };
  const s = slider('How long an alga lasts', 2, 365, 1, days, (v) => (v >= 365 ? 'a year' : `${v} days`), (v) => { days = v; paint(); }, 'plant');
  const sw = toggles(['Show what each level makes in a year'], [false], (on) => { flows = on[0]; paint(); });
  f.controls.append(s.node, sw.node);
  paint();
  return f.node;
});
