// Lesson 3, Eating from the outside: a hyphal tip digesting bread, a leaf or
// wood with the enzymes the reader switches on, and a mycelium searching a
// tray of soil for blocks of wood (the mycelium grower, ./mycelium).

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { grow, strength, type Food } from './mycelium';
import { COL, figure, frame, pick, player, slider, toggles } from './kit';

const W = 400;

export const FOODS = ['Bread', 'A dead leaf', 'Wood'] as const;
export const ENZYMES = ['Starch cutters', 'Cellulose cutters', 'Lignin breakers'] as const;

/**
 * How fast a tip can grow into `food` (0 to 1) with the enzymes switched on
 * (in ENZYMES order): the share of the food it can turn into sugars it can absorb.
 * Bread is mostly starch. A leaf is mostly cellulose with a little lignin and
 * some sugar. Wood is cellulose wrapped in lignin, which keeps cellulose cutters
 * out until something breaks the lignin open.
 */
export function digest(food: number, on: readonly boolean[]): number {
  const [starch, cellulose, lignin] = on;
  if (food === 0) return (starch ? 0.75 : 0) + 0.05;
  if (food === 1) return 0.1 + (cellulose ? (lignin ? 0.55 : 0.4) : 0);
  return 0.01 + (cellulose ? (lignin ? 0.6 : 0.04) : 0);
}

export const digestFigure = figure(['wood'], (_ctx, t) => {
  const f = frame(W, 190, 3);
  const g = svg('g');
  f.svg.append(g);
  let food = 2;
  let on = [false, true, false];
  const paint = () => {
    const rate = digest(food, on);
    const fx = 120;
    const reach = 18 + rate * 230;
    const tone = food === 0 ? '#e9c98f' : food === 1 ? '#b98f4a' : COL.wood;
    const bits: SVGElement[] = [];
    // The food's texture: crumbs, leaf veins or wood grain.
    for (let i = 0; i < 26; i++) {
      const x = fx + 8 + ((i * 53) % 260);
      const y = 40 + ((i * 29) % 110);
      bits.push(food === 2
        ? line(x - 14, y, x + 14, y + 2, COL.lignin, 1.2)
        : food === 1 ? line(x - 8, y - 5, x + 8, y + 5, '#8a6a34', 1) : svg('circle', { cx: x, cy: y, r: 2, fill: '#d4a960' }));
    }
    const tipX = fx + reach;
    const enz = on.some(Boolean)
      ? [[10, -14], [18, 4], [12, 16], [24, -6], [28, 12], [6, -24], [6, 24]].map(([dx, dy]) => svg('circle', { cx: tipX + dx, cy: 95 + dy, r: 2.2, fill: COL.enzyme }))
      : [];
    // Dissolved sugar flowing back into the hypha, in proportion to what it can digest.
    const sugar = Array.from({ length: Math.round(rate * 10) }, (_, k) => svg('circle', { cx: tipX - 12 - k * 16, cy: 95 + (k % 2 ? 2 : -2), r: 1.8, fill: COL.food }));
    redraw(g,
      svg('rect', { x: fx, y: 26, width: W - fx - 6, height: 138, rx: 6, fill: tone, opacity: 0.35 }),
      ...bits,
      // The hypha, coming in from the left.
      svg('rect', { x: 0, y: 88, width: tipX, height: 14, fill: '#f6eedb', stroke: COL.hypha, 'stroke-width': 2 }),
      svg('circle', { cx: tipX, cy: 95, r: 7, fill: '#f6eedb', stroke: COL.hypha, 'stroke-width': 2 }),
      svg('rect', { x: tipX - 9, y: 89, width: 4, height: 12, fill: '#f6eedb' }),
      ...enz,
      ...sugar,
      label(fx, 18, FOODS[food], { bold: true }),
      small(W - 6, 18, `growth: ${Math.round(rate * 100)}% of its best`, { anchor: 'end', soft: true }),
      small(6, 182, 'hypha', { fill: '#8a7650' }),
      small(80, 182, 'pink: enzymes going out', { fill: COL.enzyme }),
      small(230, 182, 'gold: sugars coming back', { fill: COL.food }),
    );
    const names = ENZYMES.filter((_, i) => on[i]).map((n) => n.toLowerCase());
    f.readout.textContent = food === 2 && on[1] && on[2]
      ? 'With lignin broken open, the cellulose cutters reach the wood’s cellulose, and the tip has sugar to grow on. Few fungi can do this; the ones that can are lesson 8’s white rots.'
      : food === 2 && on[1]
        ? 'Cellulose cutters alone barely touch wood: the cellulose fibres are sealed in lignin, which they cannot get through. The tip stalls.'
        : rate < 0.1
          ? `${names.length ? `With ${names.join(' and ')}, the` : 'With no enzymes out, the'} tip finds almost nothing it can absorb in ${FOODS[food].toLowerCase()}. It can only take in molecules small enough to pass its wall.`
          : `${FOODS[food]}: the enzymes cut it into sugars small enough to pass through the wall, and the tip grows into its food as fast as it can digest it.`;
    if (food === 2 && on[1] && on[2]) t.done();
  };
  const foods = pick(FOODS, food, (i) => { food = i; paint(); });
  const enz = toggles(ENZYMES, on, (v) => { on = v; paint(); });
  f.controls.append(foods.node, enz.node);
  paint();
  return f.node;
});

// ---- Searching a tray (the mycelium grower) ---------------------------------------------------------

const TRAY = { w: W, h: 200 };
const START = { x: 40, y: 100 };

/** The wood blocks on the tray: one near, and optionally one far. */
export function blocks(far: boolean): Food[] {
  return [
    { x: 170, y: 52, r: 16, name: 'near' },
    ...(far ? [{ x: 330, y: 150, r: 16, name: 'far' }] : []),
  ];
}

export const forageFigure = figure(['found'], (ctx, t) => {
  const f = frame(W, TRAY.h + 20, 3);
  const g = svg('g');
  f.svg.append(g);
  let day = 0;
  let far = true;
  let runs = grow({ ...START, ...TRAY, food: blocks(far), days: 40, seed: 11 });
  const paint = () => {
    const c = runs[day];
    const food = blocks(far);
    const any = c.found.some((d) => d !== null);
    const segs = c.segments.map((s) => {
      const k = strength(s, day, any);
      return line(s.x1, s.y1, s.x2, s.y2, s.fed ? '#8a6a34' : COL.hypha, s.fed ? 3 : 1, { opacity: k, 'stroke-linecap': 'round' });
    });
    redraw(g,
      svg('rect', { x: 0, y: 0, width: TRAY.w, height: TRAY.h, fill: COL.soil, opacity: 0.18, rx: 6 }),
      ...food.map((b) => svg('rect', { x: b.x - 14, y: b.y - 10, width: 28, height: 20, rx: 2, fill: COL.wood })),
      ...segs,
      svg('rect', { x: START.x - 10, y: START.y - 8, width: 20, height: 16, rx: 2, fill: COL.wood, stroke: '#8a6a34' }),
      small(START.x, START.y + 22, 'start', { anchor: 'middle', soft: true }),
      ...food.map((b, i) => small(b.x, b.y + 24, c.found[i] !== null ? `found, day ${c.found[i]}` : 'wood', { anchor: 'middle', bold: c.found[i] !== null })),
      small(6, TRAY.h + 14, `Day ${day}.  Thick brown: cords carrying food.  Faint: threads left to die back.`, { soft: true }),
    );
    const n = c.found.filter((d) => d !== null).length;
    f.readout.textContent = day === 0
      ? 'A block of wood with the fungus in it, set on a tray of soil. Press Play.'
      : n === 0
        ? `Day ${day}: threads fan out in every direction at once. The colony is spending the food in its starting block on the search.`
        : n < food.length
          ? `Day ${day}: one block found. The threads that reached it thicken into a cord to carry food home, and threads that found nothing are let go.`
          : `Day ${day}: both blocks found. The colony is now a few thick cords joining its food, and the fan of searching threads is gone.`;
    if (n >= 2) t.done();
  };
  const days = slider('Days', 0, 40, 1, day, (v) => `${v}`, (v) => { day = v; paint(); }, 'hypha');
  const play = player(days, ctx, { seconds: 8 });
  const farOn = toggles(['A second block farther off'], [far], (v) => { far = v[0]; runs = grow({ ...START, ...TRAY, food: blocks(far), days: 40, seed: 11 }); paint(); });
  f.controls.append(play.node, days.node, farOn.node);
  paint();
  return f.node;
});

