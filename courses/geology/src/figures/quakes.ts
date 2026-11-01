// Lesson 10, Where the Earth shakes: the plate boundaries on a world map; and a
// subduction zone in section, where the slab's dip sets how far behind the
// trench its earthquakes reach down and its volcanoes rise.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, type P } from 'didactics/draw';
import { mapOptionsProblems, maps } from 'didactics/maps';
import type { FigureFactory, Options } from 'didactics/figure';
import { makeRng } from 'didactics/rng';
import { asset } from '../asset';
import plates from '../data/plates.json';
import { COL, figure, frame, guessFirst, slider } from './kit';

// ---- The plate boundaries -----------------------------------------------------------

const KINDS: Record<string, { color: string; width: number; dashed?: boolean }> = {
  ridge: { color: COL.young, width: 1.4 },
  rift: { color: COL.young, width: 1.4, dashed: true },
  transform: { color: COL.soft, width: 1 },
  trench: { color: COL.heat, width: 2 },
  collision: { color: COL.rose, width: 2 },
};

const PLATE_LINES = Object.entries(plates as Record<string, number[][][]>).flatMap(([kind, lines]) =>
  lines.map((points) => ({ points: points as [number, number][], ...KINDS[kind] })));

const mapFigure = maps({ palette: COL, asset }).map;

/** The world map with every plate boundary drawn, coloured by kind; the block gives the rest of the map's options. */
export const platesMap: FigureFactory = Object.assign(
  (ctx: Parameters<FigureFactory>[0], goal?: string, options?: Options) => mapFigure(ctx, goal, { ...options, lines: [...PLATE_LINES, ...((options?.lines as []) ?? [])] }),
  { options: mapOptionsProblems, each: true as const },
);

// ---- A subduction zone in section -----------------------------------------------------

const W = 400;
const H = 230;
// Distance from the trench and depth, km, at the same scale: 0.66 px a km.
const KM_X = (km: number) => 40 + km * 0.66;
const KM_Y = (km: number) => 42 + km * 0.66;
const DEEP = 285;
/** The slab's top, depth in km at each km from the trench, bending from flat to `dip` over the first 120 km. */
function slabTop(dip: number): P[] {
  const pts: P[] = [];
  let z = 0;
  for (let x = 0; x <= 560 && z < DEEP + 10; x += 4) {
    const d = (Math.min(1, x / 120) * dip * Math.PI) / 180;
    pts.push([x, z]);
    z += Math.tan(d) * 4;
  }
  return pts;
}
/** Where the slab's top is 100 km down: under the volcanoes. */
const arcAt = (dip: number) => slabTop(dip).find(([, z]) => z >= 100)?.[0] ?? 560;

const QUAKES = (() => {
  const rng = makeRng(10);
  return Array.from({ length: 70 }, () => ({ s: rng() ** 1.6, off: rng() * 22 + 2 }));
})();

export const slabFigure = figure(['close'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let dip = 30;
  const paint = () => {
    const top = slabTop(dip);
    const arc = arcAt(dip);
    const xy = ([x, z]: P): P => [KM_X(x), KM_Y(z)];
    // The slab: its top line and a band 90 km thick under it.
    const under = top.map(([x, z]) => [x, z + 90] as P);
    const slab = [...top.map(xy), ...under.reverse().map(xy)].map((p) => p.join(',')).join(' ');
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: H, fill: COL.paper }),
      svg('rect', { x: 0, y: KM_Y(0), width: W, height: H - KM_Y(0), fill: '#e9d9c2' }),
      svg('rect', { x: 0, y: KM_Y(0) - 10, width: KM_X(0), height: 10, fill: COL.water, opacity: 0.35 }),
      svg('polygon', { points: slab, fill: '#6f7f99', opacity: 0.75 }),
      svg('rect', { x: 0, y: KM_Y(0), width: KM_X(0), height: KM_Y(90) - KM_Y(0), fill: '#6f7f99', opacity: 0.75 }),
      line(0, KM_Y(100), W, KM_Y(100), COL.heat, 0.8, { 'stroke-dasharray': '2 3', opacity: 0.7 }),
      small(W - 4, KM_Y(100) - 3, '100 km down', { fill: COL.heat, anchor: 'end' }),
    ];
    // Earthquakes in the top of the slab.
    for (const q of QUAKES) {
      const i = Math.min(top.length - 1, Math.floor(q.s * (top.length - 1)));
      parts.push(svg('circle', { cx: KM_X(top[i][0]), cy: KM_Y(top[i][1] + q.off), r: 2.2, fill: COL.bad, opacity: 0.8 }));
    }
    // Melt rising from where the slab is 100 km down, and the volcano above it.
    const ax = KM_X(arc);
    parts.push(
      svg('path', { d: `M${ax},${KM_Y(100)} C${ax - 6},${KM_Y(70)} ${ax + 6},${KM_Y(35)} ${ax},${KM_Y(0)}`, fill: 'none', stroke: COL.heat, 'stroke-width': 2.5, 'stroke-dasharray': '4 3' }),
      svg('polygon', { points: `${ax - 14},${KM_Y(0)} ${ax},${KM_Y(0) - 18} ${ax + 14},${KM_Y(0)}`, fill: '#7a5f52' }),
      svg('polygon', { points: `${KM_X(0) - 5},${KM_Y(0)} ${KM_X(0)},${KM_Y(0) + 7} ${KM_X(0) + 5},${KM_Y(0)}`, fill: COL.ink }),
      small(KM_X(0), KM_Y(0) - 14, 'trench', { anchor: 'middle', bold: true }),
      label(ax, KM_Y(0) - 22, 'volcanoes', { size: 'note', anchor: 'middle', bold: true, fill: '#7a5f52' }),
      line(KM_X(0), 8, ax, 8, COL.ink, 1), line(KM_X(0), 4, KM_X(0), 12, COL.ink, 1), line(ax, 4, ax, 12, COL.ink, 1),
      small((KM_X(0) + ax) / 2, 20, `${Math.round(arc)} km`, { anchor: 'middle', bold: true }),
      small(4, KM_Y(0) + 12, 'ocean plate', { fill: COL.paper, bold: true }),
      small(W - 4, KM_Y(0) + 12, 'continent', { anchor: 'end', bold: true }),
    );
    redraw(g, ...parts);
    f.readout.textContent = `The slab sinks at ${dip}°. It is 100 km down, where water driven out of it melts the rock above, ${Math.round(arc)} km behind the trench, so the volcanoes stand there. Earthquakes (red dots) follow the slab down: shallow near the trench, deeper inland, in places as deep as 670 km.`;
    if (arc <= 160 && t.goal === 'close') t.done();
  };
  const ds = slider('Slab dip', 12, 70, 1, dip, (v) => `${v}°`, (v) => { dip = v; paint(); }, 'pressure');
  f.controls.append(ds.node);
  paint();
  guessFirst(t, f, {
    ask: 'An ocean plate sinks under a continent, and a line of volcanoes rises above it. If the plate sank more steeply, where would the volcanoes stand? Guess first.',
    options: ['Closer to the trench', 'Farther from the trench', 'In the same place'],
    answer: 0, reveal: 'done',
    sliders: [ds],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['closer to the trench', 'farther from the trench', 'in the same place'][guess]}. Steepen the slab and watch where it reaches 100 km.`;
    },
  });
  return f.node;
});
