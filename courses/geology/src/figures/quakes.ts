// Lesson 11, Where the Earth shakes: the plate boundaries on a world map; and a
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
const H = 252;
/** Pixels a km, the same across and down. */
const PX = 0.66;
/** Surface heights and sea depths are drawn this many times too big, or the sea would be 3 px deep. */
const EXAG = 3;
const SEA_Y = 46;
const KM_X = (km: number) => 40 + km * PX;
/** The screen height of a point `m` km above (+) or below (−) sea level, exaggerated. */
const ELEV_Y = (km: number) => SEA_Y - km * PX * EXAG;
/** Thicknesses in km, true to scale: ocean crust, continental crust, the stiff mantle under each plate's crust. */
const OCEAN_CRUST = 7;
const LAND_CRUST = 35;
const OCEAN_PLATE = 90;
const LAND_PLATE = 70;
/** Where the shore is, km behind the trench. */
const COAST = 60;
const DEEP = 290;
/** The slab's top, depth in km below the trench at each km behind it, bending from flat to `dip` over the first 120 km. */
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

/** Height of the ground or sea floor, km, at `x` km from the trench: deep sea floor, the trench, the slope up to the shore, the land, the volcanic range. */
function ground(x: number, arc: number): number {
  if (x < -20) return -5;
  if (x < 0) return -5 - 3 * ((x + 20) / 20);
  if (x < COAST) return -8 + 8.3 * (x / COAST) ** 0.8;
  return 0.3 + 2 * Math.exp(-(((x - arc) / 35) ** 2));
}

/** The line `pts` moved `d` px along its normal, to the lower side. */
function offset(pts: P[], d: number): P[] {
  return pts.map(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    return [x - ((by - ay) / len) * d, y + ((bx - ax) / len) * d];
  });
}

const QUAKES = (() => {
  const rng = makeRng(10);
  return Array.from({ length: 70 }, () => ({ s: rng() ** 1.6, off: rng() * 22 + 2 }));
})();

const poly = (pts: P[], fill: string, extra: Record<string, string | number> = {}) =>
  svg('polygon', { points: pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), fill, ...extra });

export const slabFigure = figure(['close'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A cross-section of a subduction zone. On the left the sea lies over an ocean plate: thin dark ocean crust over stiff mantle rock, about 90 km thick in all. At the trench the plate bends down and sinks as a slab through the hot mantle, carrying earthquakes with it. On the right the continent rises out of the sea; its crust is about 35 km thick, with stiff mantle under it, and hot solid mantle fills the wedge between it and the slab. Where the slab is 100 km down, melt rises to the volcanoes.');
  let dip = 30;
  const paint = () => {
    const top = slabTop(dip);
    const arc = arcAt(dip);
    const trenchY = ELEV_Y(ground(0, arc));
    // The top of the ocean plate in px: the sea floor out to the left edge, then down the slab.
    const plateTop: P[] = [
      ...[-62, -40, -20, -10].map((x): P => [KM_X(x), ELEV_Y(ground(x, arc))]),
      ...top.map(([x, z]): P => [KM_X(x), trenchY + z * PX]),
    ];
    const crustBase = offset(plateTop, OCEAN_CRUST * PX);
    const plateBase = offset(plateTop, OCEAN_PLATE * PX);
    /** The slab's top under `x` px, or below the picture past its end. */
    const slabAt = (x: number) => {
      for (let i = 1; i < plateTop.length; i++) {
        const [x0, y0] = plateTop[i - 1];
        const [x1, y1] = plateTop[i];
        if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
      }
      return H + 50;
    };
    // The overriding plate: the ground, the base of its crust, the base of its stiff mantle, each stopped by the slab.
    const xs: number[] = [];
    for (let x = 0; x <= 600; x += 3) xs.push(x);
    const land = xs.map((x): P => [KM_X(x), ELEV_Y(ground(x, arc))]);
    const under = (d: number) => land.map(([x, y]): P => [x, Math.min(y + d * PX, slabAt(x))]);
    const landCrustBase = under(LAND_CRUST);
    const landPlateBase = under(LAND_PLATE);
    const sea: P[] = [[0, SEA_Y], [KM_X(COAST), SEA_Y], ...[...plateTop.filter(([x]) => x < KM_X(0)), ...land.filter(([x]) => x <= KM_X(COAST))].reverse()];
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: H, fill: COL.paper }),
      svg('rect', { x: 0, y: SEA_Y, width: W, height: H - SEA_Y, fill: COL.mantle }),
      poly(sea, '#a9c8dc'),
      poly([...land, ...landPlateBase.slice().reverse()], COL.lid, { opacity: 0.8 }),
      poly([...land, ...landCrustBase.slice().reverse()], COL.landCrust),
      poly([...plateTop, ...plateBase.slice().reverse()], COL.lid),
      poly([...plateTop, ...crustBase.slice().reverse()], COL.oceanCrust),
      line(0, trenchY + 100 * PX, W, trenchY + 100 * PX, COL.heat, 0.8, { 'stroke-dasharray': '2 3', opacity: 0.7 }),
      small(3, trenchY + 100 * PX - 3, '100 km down', { fill: COL.heat }),
    ];
    // Earthquakes in the top of the slab.
    const inSlab = (s: number, off: number): P => {
      const i = Math.min(top.length - 1, Math.floor(s * (top.length - 1)));
      return offset(plateTop, off * PX)[i + 4];
    };
    for (const q of QUAKES) {
      const [cx, cy] = inSlab(q.s, q.off);
      if (cy < H) parts.push(svg('circle', { cx, cy, r: 2.2, fill: COL.bad, opacity: 0.85 }));
    }
    // Melt rising from where the slab is 100 km down, and the volcano above it.
    const ax = KM_X(arc);
    const ay = ELEV_Y(ground(arc, arc));
    const meltY = trenchY + 100 * PX;
    parts.push(
      svg('path', { d: `M${ax},${meltY} C${ax - 6},${meltY - 25} ${ax + 6},${ay + 30} ${ax},${ay}`, fill: 'none', stroke: COL.heat, 'stroke-width': 2.5, 'stroke-dasharray': '4 3' }),
      svg('polygon', { points: `${ax - 12},${ay + 1} ${ax},${ay - 15} ${ax + 12},${ay + 1}`, fill: '#7a5f52' }),
      small(KM_X(0), SEA_Y - 8, 'trench', { anchor: 'middle', bold: true }),
      line(KM_X(0), SEA_Y - 4, KM_X(0), trenchY - 1, COL.ink, 0.8),
      label(ax > W - 90 ? ax - 14 : ax + 14, ay - 8, 'volcanoes', { size: 'note', ...(ax > W - 90 ? { anchor: 'end' as const } : {}), bold: true, fill: '#7a5f52' }),
      line(KM_X(0), 6, ax, 6, COL.ink, 1), line(KM_X(0), 2, KM_X(0), 10, COL.ink, 1), line(ax, 2, ax, 10, COL.ink, 1),
      small((KM_X(0) + ax) / 2, 17, `${Math.round(arc)} km`, { anchor: 'middle', bold: true }),
      small(3, SEA_Y - 4, 'sea', { fill: COL.water, bold: true }),
      small(3, ELEV_Y(-5) + 20, 'ocean plate', { fill: COL.paper, bold: true }),
      small(3, ELEV_Y(-5) + OCEAN_PLATE * PX + 40, 'hot solid mantle', { fill: '#8a4f36', bold: true }),
      small(3, H - 5, `heights and sea depths ×${EXAG}`, { fill: '#8a4f36' }),
      small(W - 4, ELEV_Y(0.3) + 14, 'continental crust', { anchor: 'end', bold: true }),
      small(W - 4, ELEV_Y(0.3) + (LAND_CRUST + 22) * PX, 'stiff mantle', { anchor: 'end', bold: true, fill: COL.paper }),
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
