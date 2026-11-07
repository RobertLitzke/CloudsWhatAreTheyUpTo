// Branch S1, The hill that drained a reservoir: water seeping from the
// reservoir behind the Masonry Dam through the glacial moraine beside it, by
// Darcy's law, as the reservoir rises and the gravel gets coarser.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small } from 'didactics/draw';
import { height } from 'didactics/units';
import { COL, figure, frame, guessFirst, sig, slider, tint, type FigureFactory } from './kit';

const W = 400;

/** How easily water passes through each kind of ground, in metres a second (lesson 3's conductivity). */
export const GROUNDS: readonly { name: string; k: number }[] = [
  { name: 'clay', k: 1e-9 },
  { name: 'silt', k: 1e-7 },
  { name: 'fine sand', k: 1e-5 },
  { name: 'sand and gravel', k: 1e-4 },
  { name: 'clean gravel', k: 1e-3 },
];

/** The model moraine: the path from the reservoir to the springs on the far side, and how long a front of shore it runs along, in metres. */
export const MORAINE = { path: 1500, front: 3000 } as const;

/** Seattle's average draw from both its rivers, m³/s (about 120 million gallons a day). */
export const CITY_DRAW = 5;

/**
 * Water seeping through a bank of gravel from a reservoir standing `depth`
 * metres up its face (above the gravel's floor, where the springs come out on
 * the far side), in m³/s: Darcy's
 * law for water flowing with a free surface over a level floor (Dupuit's
 * form), q = K (h₁² − h₂²) / 2L for each metre of shore, with h₂ = 0 at the
 * springs. Both the push (the head) and the wet thickness the water flows
 * through grow with the depth, so the seepage goes as its square.
 */
export function seepage(depth: number, k: number, path: number = MORAINE.path, front: number = MORAINE.front): number {
  const h = Math.max(0, depth);
  return (k * h * h) / (2 * path) * front;
}

/** The height of the water table a fraction `s` (0 at the reservoir, 1 at the springs) of the way through the bank. */
export const waterTable = (depth: number, s: number) => Math.sqrt(Math.max(0, depth * depth * (1 - s)));

const flowWords = (q: number, units: 'metric' | 'imperial') =>
  units === 'metric' ? `${q < 0.001 ? 'under 0.001' : sig(q, 2)} m³ a second` : `${q * 35.31 < 0.05 ? 'under 0.05' : sig(q * 35.31, 2)} cubic feet a second`;

export const seepFigure = figure(['double'], (ctx, t) => {
  const units = ctx.save.units;
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let depth = 20;
  let kind = 4;
  let low = true;
  let high = false;
  // The section: reservoir on the left, the moraine, the springs on the right.
  const base = 196;
  const perM = 1.9;
  const x0 = 120;
  const x1 = 320;
  const Y = (m: number) => base - m * perM;
  const paint = () => {
    const k = GROUNDS[kind].k;
    const q = seepage(depth, k);
    const top = (u: number) => (u < 0.3 ? 80 - 14 * ((0.3 - u) / 0.3) ** 2 : 80 * (1 - ((u - 0.3) / 0.7) ** 2));
    const hill: [number, number][] = [[x0 - 14, base]];
    for (let i = 0; i <= 40; i++) hill.push([x0 + (i / 40) * (x1 - x0), Y(top(i / 40))]);
    const table: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const s = i / 40;
      table.push([x0 + s * (x1 - x0), Y(Math.min(waterTable(depth, s), top(s)))]);
    }
    const wet = [[x0, base] as [number, number], ...table, [x1, base] as [number, number]];
    const dots: SVGElement[] = [];
    for (let i = 0; i < 90; i++) {
      const u = 0.02 + 0.96 * ((i * 0.6180339 + 0.31) % 1);
      const v = ((i * 0.7548777 + 0.17) % 1) * 0.9;
      dots.push(svg('circle', { cx: x0 + u * (x1 - x0), cy: Y(2 + v * (top(u) - 4)), r: kind >= 3 ? 1.8 : 0.9, fill: COL.rock, opacity: 0.45 }));
    }
    const width = q <= 0 ? 0 : Math.min(9, 1 + 2.4 * Math.log10(1 + q * 400));
    const arrows: SVGElement[] = [];
    if (width > 0 && depth > 2) {
      for (const s of [0.18, 0.5, 0.8]) {
        const yy = Y(waterTable(depth, s) * 0.45);
        arrows.push(arrow(x0 + s * (x1 - x0) - 22, yy, x0 + s * (x1 - x0) + 18, yy + 2, COL.flow, Math.max(1, width * 0.5)));
      }
    }
    const springs = q > 0.002
      ? [svg('path', { d: `M${x1},${base - 2} q 14,4 30,2 t 40,2`, fill: 'none', stroke: COL.water, 'stroke-width': Math.max(1.2, width * 0.7), 'stroke-linecap': 'round' })]
      : [];
    redraw(g,
      // Ground under everything.
      svg('rect', { x: 0, y: base, width: W, height: 40, fill: COL.rock, opacity: 0.35 }),
      // The reservoir.
      svg('rect', { x: 0, y: Y(depth), width: x0 - 14 + (depth / 66) * 14 + 1, height: depth * perM, fill: COL.water, opacity: 0.8 }),
      // The moraine.
      svg('polygon', { points: hill.map((p) => p.join(',')).join(' '), fill: COL.sediment, opacity: 0.55 }),
      ...dots,
      svg('polygon', { points: wet.map((p) => p.join(',')).join(' '), fill: tint(COL.ground, 0.5) }),
      svg('polyline', { points: table.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.ground, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }),
      ...arrows,
      ...springs,
      line(x1, base, W, base, COL.ink, 1),
      line(0, base, x0 - 14, base, COL.ink, 1),
      small(8, 20, 'Reservoir', { bold: true, fill: COL.water }),
      small(8, 32, 'behind the dam'),
      label(200, Y(84) - 6, 'Moraine: sand and gravel left by the ice', { size: 'small', anchor: 'middle', bold: true }),
      small(W - 6, base - 30, 'Springs on the', { anchor: 'end' }),
      small(W - 6, base - 18, 'far side', { anchor: 'end' }),
      small(x0 + 4, base + 14, 'water table (dashed); the wet gravel below it in green', { fill: COL.ground }),
      small(8, base + 30, `Reservoir ${height(depth, units)} up the face of the moraine; ground: ${GROUNDS[kind].name}`, { soft: true }),
    );
    if (!open()) return;
    if (depth <= 20) low = true;
    if (depth >= 40 && low) high = true;
    const share = (q / CITY_DRAW) * 100;
    const compare = share < 1 ? 'a trickle beside what Seattle draws.' : share < 100 ? `about ${Math.round(share)}% of what all Seattle draws on an average day.` : `more than all Seattle draws on an average day.`;
    f.readout.textContent = `Seepage through the model moraine: ${flowWords(q, units)}, ${compare} ${depth >= 40 ? 'Deeper water pushes harder and soaks a thicker layer of gravel, so the flow goes as the depth squared.' : 'Raise the reservoir, or make the gravel coarser.'}`;
    if (high && t.goal === 'double') t.done();
  };
  const ds = slider('Reservoir up the moraine', 0, 60, 1, depth, (v) => height(v, units), (v) => { depth = v; paint(); }, 'water');
  const ks = slider('The moraine is', { steps: GROUNDS.map((_, i) => i), value: kind, show: (i) => GROUNDS[i].name, onInput: (i) => { kind = i; paint(); }, color: 'sediment' });
  f.controls.append(ds.node, ks.node);
  const open = guessFirst(t, f, {
    ask: `The reservoir rises from ${height(20, units)} to ${height(40, units)} up the face of a bank of gravel, with springs at the bank's foot on the far side. How much more water seeps through?`,
    options: ['About the same', 'About twice as much', 'About four times as much'],
    answer: 2,
    reveal: 'done',
    sliders: [ds, ks],
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'cedar-seep': seepFigure,
};
