// Lesson 8, Continents that fit: South America turned about Bullard's pole to
// meet Africa, by its coastline or by the edge of its continental shelf (the
// 1000 m depth line); and the fitted pair with the fossils and old rocks that
// match across the join.

import { svg } from 'didactics/dom';
import { label, redraw, small, still } from 'didactics/draw';
import { segmented } from 'didactics/ui';
import data from '../data/atlantic.json';
import { COL, figure, frame, guessFirst, slider } from './kit';

type LL = [number, number];
type V3 = [number, number, number];

const W = 400;
const H = 300;
/** Bullard, Everett and Smith (1965): South America to Africa about 44° N 30.6° W, by 57°. */
const POLE: LL = [-30.6, 44.0];
const ANGLE = 57;

const rad = (d: number) => (d * Math.PI) / 180;
const xyz = ([lon, lat]: LL): V3 => [Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat))];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** `v` turned by `deg` about the axis through `pole` (right-handed). */
function turn(v: V3, pole: LL, deg: number): V3 {
  const k = xyz(pole);
  const a = rad(deg);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = dot(k, v);
  const cross: V3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return [0, 1, 2].map((i) => v[i] * c + cross[i] * s + k[i] * kv * (1 - c)) as V3;
}

/** An orthographic view centred on the South Atlantic. */
const CENTRE: LL = [-15, -10];
const R = 190;
function project(v: V3): [number, number, boolean] {
  const [lon0, lat0] = [rad(CENTRE[0]), rad(CENTRE[1])];
  const lon = Math.atan2(v[1], v[0]);
  const lat = Math.asin(Math.max(-1, Math.min(1, v[2])));
  const cosc = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(lon - lon0);
  const x = Math.cos(lat) * Math.sin(lon - lon0);
  const y = Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(lon - lon0);
  return [W / 2 + R * x, H / 2 - R * y, cosc > 0];
}

type Edge = 'coast' | 'shelf';
const D = data as unknown as Record<string, number[][]>;
const outline = (c: 'sa' | 'af', e: Edge) => D[`${c}_${e}`].map((p) => xyz(p as LL));
const fitIdx = (c: 'sa' | 'af', e: Edge) => D[`${c}_${e}_fit`] as unknown as number[];

/** Path through points, broken where the outline jumps (where it was cut at the data's edge). */
function path(pts: V3[]): string {
  let d = '';
  let prev: V3 | null = null;
  for (const v of pts) {
    const [x, y, front] = project(v);
    const jump = !prev || Math.acos(Math.max(-1, Math.min(1, dot(prev, v)))) > rad(3);
    d += `${jump || !front ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    prev = v;
  }
  return d;
}

/** The typical gap, km, from South America's Atlantic edge to Africa's. */
function gap(sa: V3[], af: V3[]): number {
  const d = sa.map((p) => Math.min(...af.map((q) => Math.acos(Math.max(-1, Math.min(1, dot(p, q)))))) * 6371).sort((a, b) => a - b);
  return d[Math.floor(d.length / 2)];
}

function graticule(): SVGElement[] {
  const out: SVGElement[] = [svg('circle', { cx: W / 2, cy: H / 2, r: R, fill: '#dfeaf0' })];
  for (let lon = -90; lon <= 60; lon += 30) {
    const pts: V3[] = [];
    for (let lat = -80; lat <= 80; lat += 4) pts.push(xyz([lon, lat]));
    out.push(svg('path', { d: path(pts), fill: 'none', stroke: '#fff', 'stroke-width': 0.8 }));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: V3[] = [];
    for (let lon = -110; lon <= 80; lon += 4) pts.push(xyz([lon, lat]));
    out.push(svg('path', { d: path(pts), fill: 'none', stroke: '#fff', 'stroke-width': 0.8 }));
  }
  return out;
}

export const fitFigure = figure(['fitted'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let close = 0;
  let edge: Edge = 'coast';
  const paint = () => {
    const deg = (close / 100) * ANGLE;
    const sa = outline('sa', edge).map((v) => turn(v, POLE, deg));
    const af = outline('af', edge);
    const g2 = gap(fitIdx('sa', edge).map((i) => sa[i]), fitIdx('af', edge).map((i) => af[i]));
    const color = edge === 'shelf' ? COL.water : COL.ink;
    const [lx, ly] = project(turn(xyz([-58, -12]), POLE, deg));
    redraw(g,
      ...graticule(),
      svg('path', { d: path(af), fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
      svg('path', { d: path(sa), fill: 'none', stroke: COL.heat, 'stroke-width': 1.7, 'stroke-linejoin': 'round' }),
      label(project(xyz([20, 5]))[0], project(xyz([20, 5]))[1], 'Africa', { bold: true, anchor: 'middle', halo: '#dfeaf0' }),
      label(lx, ly, 'South America', { bold: true, anchor: 'middle', fill: COL.heat, halo: '#dfeaf0' }),
      small(8, H - 8, edge === 'shelf' ? 'Edge of the continental shelf (1000 m deep)' : 'Coastline (sea level)', { bold: true, fill: color }),
    );
    f.readout.textContent = close < 2
      ? `The continents where they are now, ${edge === 'shelf' ? 'drawn by the edges of their shelves' : 'drawn by their coastlines'}.`
      : `South America turned ${Math.round(deg)}° about a pole near the Azores. Along the Atlantic edges, the typical gap or overlap is now about ${Math.round(g2 / 10) * 10} km.${close >= 97 ? (edge === 'shelf' ? ' This is Bullard’s 1965 fit: the shelf edges meet closely along most of their length.' : ' The coastlines meet only roughly. Switch to the shelf edges.') : ''}`;
    if (close >= 97 && edge === 'shelf' && t.goal === 'fitted') t.done();
  };
  const move = slider('Close the Atlantic', 0, 100, 1, 0, (v) => `${v}%`, (v) => { close = v; paint(); }, 'heat');
  const which = segmented([{ value: 'coast', label: 'Coastlines' }, { value: 'shelf', label: 'Shelf edges' }] as const, 'coast', (v) => { edge = v; paint(); });
  f.controls.append(which, move.node);
  paint();
  guessFirst(t, f, {
    ask: 'Close the Atlantic and fit South America against Africa. Which outline do you expect to fit better: the coastlines, or the edges of the continental shelves, where the sea floor drops to the deep ocean? Guess first.',
    options: ['The coastlines', 'The shelf edges', 'Neither fits well'],
    answer: 1, reveal: 'done',
    sliders: [move],
    hidden: [which],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['the coastlines', 'the shelf edges', 'neither'][guess]}. Close the ocean, then compare the two outlines.`;
    },
  });
  return f.node;
});

// ---- The fitted pair, with what matches across the join ---------------------------------

export const gondwanaStill = () => {
  const { node, svg: s } = still(W, H);
  const sa = outline('sa', 'shelf').map((v) => turn(v, POLE, ANGLE));
  const af = outline('af', 'shelf');
  const at = (p: LL, onSA: boolean) => project(onSA ? turn(xyz(p), POLE, ANGLE) : xyz(p));
  const patch = (p: LL, onSA: boolean, rx: number, ry: number, fill: string) => {
    const [x, y] = at(p, onSA);
    return svg('ellipse', { cx: x, cy: y, rx, ry, fill, opacity: 0.55 });
  };
  const [mx, my] = at([-51, -29], true);
  const [gx, gy] = at([-45, -3], true);
  s.append(
    ...graticule(),
    patch([-51, -27], true, 16, 22, COL.fossil), patch([17, -25], false, 14, 22, COL.fossil),
    patch([-45, -3], true, 12, 9, COL.old), patch([-2, 7], false, 18, 10, COL.old),
    svg('path', { d: path(af), fill: 'none', stroke: COL.water, 'stroke-width': 1.5 }),
    svg('path', { d: path(sa), fill: 'none', stroke: COL.heat, 'stroke-width': 1.6 }),
    label(...(at([22, 2], false).slice(0, 2) as [number, number]), 'Africa', { bold: true, anchor: 'middle', halo: '#dfeaf0' }),
    label(...(at([-60, -10], true).slice(0, 2) as [number, number]), 'South America', { bold: true, anchor: 'middle', fill: COL.heat, halo: '#dfeaf0' }),
    small(mx - 30, my + 34, 'Mesosaurus', { bold: true, fill: COL.fossil, halo: '#dfeaf0', anchor: 'middle' }),
    small(gx - 40, gy - 14, '2-billion-year-old rocks', { bold: true, fill: COL.old, halo: '#dfeaf0', anchor: 'middle' }),
  );
  s.setAttribute('aria-label', 'South America fitted against Africa by the edges of their continental shelves. Fossils of the freshwater reptile Mesosaurus are found in southern Brazil and in southwestern Africa, on either side of the join; two-billion-year-old rocks near São Luís in Brazil continue into Ghana.');
  return { node };
};
