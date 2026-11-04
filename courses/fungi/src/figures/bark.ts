// Branch L1, The lichens that left the city: a tree trunk in a city over the
// years, with the lichens that the year's sulphur dioxide and nitrogen allow.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, player, slider } from './kit';

const W = 400;

/** Rough yearly mean sulphur dioxide in central London, micrograms per cubic metre. */
const SO2_POINTS: [number, number][] = [[1900, 330], [1950, 320], [1960, 290], [1970, 200], [1980, 100], [1990, 40], [2000, 15], [2010, 5], [2020, 3]];

export function so2(year: number): number {
  for (let i = 1; i < SO2_POINTS.length; i++) {
    const [y0, v0] = SO2_POINTS[i - 1];
    const [y1, v1] = SO2_POINTS[i];
    if (year <= y1) return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
  }
  return SO2_POINTS[SO2_POINTS.length - 1][1];
}

/** Nitrogen in the air from traffic and farms, rising late in the century (0 to 1). */
export const nitrogen = (year: number) => Math.max(0, Math.min(1, (year - 1970) / 40));

/** The kinds of lichen, the sulphur dioxide above which each is lost, and how long each takes to come back. */
export const KINDS = [
  { name: 'Grey crust', limit: 150, lag: 3, colour: '#b7bcae', shape: 'crust' },
  { name: 'Leafy lichens', limit: 60, lag: 8, colour: '#9fb59a', shape: 'leaf' },
  { name: 'Bushy beards', limit: 35, lag: 15, colour: '#b9c79a', shape: 'beard' },
  { name: 'Orange, nitrogen-loving', limit: 80, lag: 3, colour: '#e3a33c', shape: 'leaf' },
] as const;

/** Cover (0 to 1) of each kind on a city tree in a given year. */
export function cover(year: number): number[] {
  return KINDS.map((k, i) => {
    // Clean enough since when? Returns need years of clean air.
    let clean = 0;
    for (let y = year; y >= 1900 && so2(y) < k.limit; y--) clean++;
    let c = Math.min(1, clean / (k.lag * 2));
    if (i === 3) c *= nitrogen(year);
    if (i === 2) c *= 1 - 0.6 * nitrogen(year);
    return c;
  });
}

export const barkFigure = figure(['clean'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let year = 1950;
  const paint = () => {
    const c = cover(year);
    const parts: SVGElement[] = [
      svg('rect', { x: 40, y: 10, width: 90, height: 200, fill: '#5d4c3f', rx: 6 }),
    ];
    // Lichens on the trunk, placed at fixed spots and shown by cover.
    const spots = Array.from({ length: 44 }, (_, i) => [52 + ((i * 29) % 11) * 6.6, 22 + ((i * 17) % 44) * 4, i % 4] as const);
    for (const [x, y, k] of spots) {
      if ((k === 0 ? c[0] : k === 1 ? c[1] : k === 2 ? c[2] : c[3]) * 9 < (x * 7 + y) % 9) continue;
      const kd = KINDS[k];
      if (kd.shape === 'crust') parts.push(svg('ellipse', { cx: x, cy: y, rx: 9, ry: 6, fill: kd.colour }));
      else if (kd.shape === 'leaf') parts.push(svg('path', { d: `M${x - 8},${y} q4,-9 8,-2 q4,-8 8,2 q-4,8 -8,4 q-4,4 -8,-4z`, fill: kd.colour }));
      else parts.push(...[-3, 0, 3].map((dx) => svg('path', { d: `M${x},${y} q${dx},10 ${dx * 2},20`, stroke: kd.colour, 'stroke-width': 2, fill: 'none' })));
    }
    // The sulphur curve.
    const ax = axes({ x: 186, y: 26, w: 196, h: 90, xmin: 1900, xmax: 2020, ymin: 0, ymax: 350, xticks: [1900, 1960, 2020], yticks: [0, 150, 300], ylabel: 'sulphur dioxide, µg per m³', ink: COL.ink, grid: COL.grid });
    const pts = Array.from({ length: 121 }, (_, i) => [1900 + i, so2(1900 + i)] as [number, number]);
    parts.push(...ax.parts, ax.path(pts, COL.toxin, 2), line(ax.X(year), 26, ax.X(year), 116, COL.ink, 1.2, { 'stroke-dasharray': '3 3' }));
    KINDS.forEach((k, i) => {
      const y = 150 + i * 16;
      parts.push(svg('rect', { x: 186, y: y - 9, width: 10, height: 10, fill: k.colour }), small(202, y, k.name), svg('rect', { x: 330, y: y - 8, width: 52, height: 8, fill: COL.grid, rx: 2 }), svg('rect', { x: 330, y: y - 8, width: 52 * c[i], height: 8, fill: k.colour, rx: 2 }));
    });
    parts.push(label(85, 218, `${year}`, { anchor: 'middle', bold: true }));
    redraw(g, ...parts);
    if (!open()) return;
    const s = so2(year);
    f.readout.textContent = s > 150
      ? `About ${Math.round(s)} µg of sulphur dioxide in each cubic metre. Rain on the bark turns acid, and only a thin green film of single algae grows: a lichen desert.`
      : c[2] > 0.3
        ? 'Clean air for years now: the bushy beards are back, the slowest to return. Nitrogen from traffic and farms now feeds the orange lichens.'
        : c[0] > 0.3 && c[1] < 0.3
          ? 'The air is cleaner, and the tough grey crust comes back first. The leafy and bushy kinds need cleaner air and more years.'
          : 'Sulphur keeps falling, and the leafy lichens spread back over the trunk.';
    if (year >= 2010) t.done();
  };
  const ys = slider('Year', 1900, 2020, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'leaf');
  const play = player(ys, ctx, { seconds: 10 });
  f.controls.append(play.node, ys.node);
  const open = guessFirst(t, f, {
    ask: 'In the smoky air of a 1950s city, which kind of lichen could still grow on a tree?',
    options: ['Only a few flat crusts, or none', 'Bushy beards', 'All kinds equally'],
    answer: 0,
    sliders: [ys],
    after: () => paint(),
  });
  paint();
  return f.node;
});
