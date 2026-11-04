// Lesson 17, Plants without leaves: the life cycles of a moss, a fern and a
// pine, with their two generations drawn to scale; and a moss and a lettuce
// leaf dried out in the sun and then rained on.

import { svg } from 'didactics/dom';
import { arrow, label, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, player, slider, wrapped } from './kit';

const W = 400;

export type Group = 'moss' | 'fern' | 'pine';

/** The two generations of each group: what the reader sees of each, how big, and which lives on which. */
export const CYCLES: Record<Group, { name: string; spore: string; gamete: string; big: 'spore' | 'gamete'; water: boolean; says: string }> = {
  moss: {
    name: 'Moss',
    spore: 'a stalk and capsule, a few cm, living on the green moss',
    gamete: 'the green moss itself, making eggs and swimming sperm',
    big: 'gamete',
    water: true,
    says: 'In a moss the green plant you see is the egg-and-sperm generation. The spore generation is the brown stalk and capsule growing out of it, fed by it. Sperm swim to the eggs through rain or dew.',
  },
  fern: {
    name: 'Fern',
    spore: 'the fern itself, with brown spore dots under its fronds',
    gamete: 'a green heart a few millimetres across, on damp ground',
    big: 'spore',
    water: true,
    says: 'In a fern the plant you see is the spore generation. Each spore grows into a separate tiny green heart on the ground, which makes eggs and sperm; the sperm swim to the eggs in a film of water, and the new fern grows from the heart.',
  },
  pine: {
    name: 'Pine',
    spore: 'the tree',
    gamete: 'a pollen grain, and a few cells inside a cone scale',
    big: 'spore',
    water: false,
    says: 'In a pine the egg-and-sperm generation has shrunk to a pollen grain and a speck of tissue in the cone. Pollen travels on the wind, so no swimming is needed; the fertilised egg becomes a seed. From pollen landing to ripe seed takes about two years.',
  },
};

export const cycleFigure = figure(['all'], (_ctx, t) => {
  const f = frame(W, 236, 4);
  const g = svg('g');
  f.svg.append(g);
  let which: Group = 'moss';
  const seen = new Set<Group>();
  const paint = () => {
    const c = CYCLES[which];
    const cx = 200;
    const cy = 112;
    const big = 34;
    const tiny = 10;
    const sporeR = c.big === 'spore' ? big : tiny + 6;
    const gameteR = c.big === 'gamete' ? big : which === 'pine' ? 6 : tiny;
    redraw(g,
      svg('circle', { cx, cy, r: 82, fill: 'none', stroke: COL.grid, 'stroke-width': 10 }),
      arrow(cx + 70, cy - 42, cx + 42, cy - 72, COL.soft, 1.5),
      arrow(cx - 70, cy + 42, cx - 42, cy + 72, COL.soft, 1.5),
      // Spore generation at the left, egg-and-sperm generation at the right.
      svg('circle', { cx: cx - 82, cy, r: sporeR, fill: COL.leaf, opacity: 0.85 }),
      svg('circle', { cx: cx + 82, cy, r: gameteR, fill: COL.light, opacity: 0.9 }),
      small(cx, cy - 92, 'spores, carried by wind', { anchor: 'middle', soft: true }),
      small(cx, cy + 102, c.water ? 'sperm swim to eggs in water' : 'pollen carried by wind', { anchor: 'middle', fill: c.water ? COL.water : COL.soft }),
      label(cx, cy - 4, c.name, { anchor: 'middle', bold: true }),
      small(cx, cy + 12, 'one life cycle', { anchor: 'middle', soft: true }),
      label(16, 22, 'Spore generation', { bold: true, fill: COL.leaf }),
      ...wrapped(16, 36, c.spore, 22, { soft: true }),
      label(384, 22, 'Egg-and-sperm generation', { anchor: 'end', bold: true, fill: '#a8822e' }),
      ...wrapped(270, 36, c.gamete, 22, { soft: true }),
      small(200, 230, 'Circle size: which generation is the big, long-lived plant.', { anchor: 'middle', soft: true }),
    );
    seen.add(which);
    f.readout.textContent = c.says;
    if (seen.size === 3) t.done();
  };
  const choose = pick(['Moss', 'Fern', 'Pine'], 0, (i) => { which = (['moss', 'fern', 'pine'] as const)[i]; paint(); });
  f.controls.append(choose.node);
  paint();
  return f.node;
});

// ---- Drying out --------------------------------------------------------------------------------------

export type Leaf = 'moss' | 'lettuce';

/**
 * Hour by hour through a day of hot sun (hours 0 to 24) and then rain: the
 * water held (share of full) and photosynthesis (share of its best). A moss
 * dries to a crisp and switches off; when wetted it switches back on within
 * hours. A lettuce leaf wilts, its cells are torn as they shrink, and it dies.
 */
export function drying(kind: Leaf, hours: number): { water: number; working: number; dead: boolean } {
  let water = 1;
  let dead = false;
  let working = 1;
  for (let h = 1; h <= hours; h++) {
    if (h <= 24) water = Math.max(kind === 'moss' ? 0.05 : 0.1, water - (kind === 'moss' ? 0.12 : 0.06));
    else if (!dead) water = Math.min(1, water + (kind === 'moss' ? 0.5 : 0.2));
    if (kind === 'lettuce' && water < 0.3) dead = true;
    if (dead) working = 0;
    else if (kind === 'moss') working = h <= 24 ? (water > 0.5 ? 1 : water * 2) : Math.min(0.95, working + (water > 0.8 ? 0.25 : 0));
    else working = water > 0.6 ? 1 : water;
  }
  return { water, working, dead };
}

export const dryFigure = figure(['revive'], (ctx, t) => {
  const f = frame(W, 210, 3);
  const g = svg('g');
  f.svg.append(g);
  let hour = 0;
  let sawMoss = false;
  let sawLettuce = false;
  const paint = () => {
    const shown = open();
    const parts: SVGElement[] = [];
    (['moss', 'lettuce'] as const).forEach((kind, i) => {
      const s = drying(kind, shown ? hour : 0);
      const x0 = 20 + i * 190;
      const green = s.dead ? '#9a7b4f' : s.water > 0.5 ? COL.leaf : '#8f9a52';
      if (kind === 'moss') {
        for (let k = 0; k < 9; k++) {
          const x = x0 + 30 + k * 12;
          const h = 30 * (0.5 + 0.5 * s.water);
          parts.push(svg('path', { d: `M${x},150 q${(k % 2 ? 3 : -3) * (1.5 - s.water)},${-h / 2} 0,${-h}`, stroke: green, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }));
        }
      } else {
        const droop = (1 - s.water) * 40;
        parts.push(svg('path', { d: `M${x0 + 80},150 q${-10 - droop},-40 ${-40 - droop},${-60 + droop * 1.4} q30,0 40,${60 - droop * 1.4} Z`, fill: green }));
      }
      parts.push(
        label(x0, 26, kind === 'moss' ? 'A moss' : 'A lettuce leaf', { bold: true }),
        small(x0, 46, `water held: ${Math.round(s.water * 100)}%`, { fill: COL.water }),
        small(x0, 62, s.dead ? 'dead' : `photosynthesis: ${Math.round(s.working * 100)}%`, { fill: s.dead ? COL.bad : COL.leaf }),
        svg('rect', { x: x0, y: 150, width: 160, height: 8, fill: COL.soil, opacity: 0.4 }),
      );
    });
    redraw(g,
      ...parts,
      hour > 24 && shown ? small(200, 186, `Rain since hour 24`, { anchor: 'middle', fill: COL.water }) : small(200, 186, 'Hot sun', { anchor: 'middle', fill: COL.light }),
      small(200, 204, `Hour ${shown ? hour : 0}. A model.`, { anchor: 'middle', soft: true }),
    );
    if (!shown) return;
    const m = drying('moss', hour);
    const l = drying('lettuce', hour);
    if (hour >= 30 && m.working > 0.7) sawMoss = true;
    if (l.dead) sawLettuce = true;
    f.readout.textContent = hour <= 24
      ? `Both dry out in the sun. ${l.dead ? 'The lettuce leaf has gone past wilting: as its cells shrank, their membranes tore.' : 'The lettuce leaf wilts as it loses its turgor.'} The moss curls up, crisp and grey-green, and stops photosynthesising.`
      : `It rains. The moss soaks water up like a sponge and within a few hours is photosynthesising again; mosses can do this after months or years dry. The lettuce leaf stays dead.`;
    if (sawMoss && sawLettuce) t.done();
  };
  const hs = slider('Hours', 0, 36, 1, 0, (v) => `${v}`, (v) => { hour = v; paint(); }, 'water');
  const play = player(hs, ctx, { seconds: 8 });
  f.controls.append(play.node, hs.node);
  const open = guessFirst(t, f, {
    ask: 'A moss and a lettuce leaf both dry out completely in a day of hot sun. Then it rains. Which recovers?',
    options: ['Both', 'Only the moss', 'Only the lettuce leaf'],
    answer: 1,
    reveal: 'done',
    sliders: [hs],
    after: () => paint(),
  });
  paint();
  return f.node;
});
