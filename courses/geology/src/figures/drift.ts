// Lesson 9, Continents that fit: South America turned about Bullard's pole to
// meet Africa, by its coastline or by the edge of its continental shelf (the
// 1000 m depth line); and the fitted pair with the fossils and old rocks that
// match across the join.

import { svg } from 'didactics/dom';
import { label, redraw, small, still } from 'didactics/draw';
import { segmented } from 'didactics/ui';
import data from '../data/atlantic.json';
import { COL, figure, frame, guessFirst, player, rgbOf, slider } from './kit';
import { PALEOMAP_CREDIT, drawn, globeView, km, lonLat, onPlateModel, rotate, rotationAt, xyz as xyzP, type V3 as V3P } from './paleomap';

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

// ---- The South Atlantic opening, played (lesson 10) ----------------------------------------

/** When the South Atlantic began to open, million years ago (simplified: one pole, a steady rate). */
export const OPENED = 130;
/** South America's turn back toward Africa about Bullard's pole, `ma` million years ago: 0 today, the full fit before the opening. */
export const turnAt = (ma: number) => (ANGLE * Math.max(0, Math.min(OPENED, ma))) / OPENED;

/** Ocean floor's colour by its age: red at the ridge, through sand, to blue at the oldest. */
const AGE_RAMP: readonly [number, string][] = [[0, '#c4462f'], [35, '#e3a23d'], [70, '#e3d27a'], [100, '#7fb3a8'], [OPENED, '#3d6ea6']];
function ageColor(ma: number): string {
  let i = 1;
  while (i < AGE_RAMP.length - 1 && ma > AGE_RAMP[i][0]) i++;
  const [a0, c0] = AGE_RAMP[i - 1];
  const [a1, c1] = AGE_RAMP[i];
  const k = Math.max(0, Math.min(1, (ma - a0) / (a1 - a0)));
  const p = rgbOf(c0);
  const q = rgbOf(c1);
  return `rgb(${p.map((v, j) => Math.round(v + k * (q[j] - v))).join(',')})`;
}

/** A closed path through points (front of the globe only). */
function shape(pts: V3[]): string {
  return pts.map((v, i) => {
    const [x, y] = project(v);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join('') + 'Z';
}

export const openingFigure = figure(['opened'], (ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const START = 150;
  let pos = 0;
  const saEdge = fitIdx('sa', 'shelf').map((i) => outline('sa', 'shelf')[i]);
  const saAll = outline('sa', 'shelf');
  const afAll = outline('af', 'shelf');
  const afEdge = fitIdx('af', 'shelf').map((i) => afAll[i]);
  /** An isochron: the ridge `age` million years ago, as it sits now on Africa's side or on South America's. */
  const iso = (age: number, now: number, side: 'af' | 'sa') => {
    const deg = side === 'af' ? (ANGLE + turnAt(age)) / 2 : turnAt(now) + (ANGLE - turnAt(age)) / 2;
    return saEdge.map((v) => turn(v, POLE, deg));
  };
  const paint = () => {
    const ma = START - pos;
    const now = Math.min(OPENED, ma);
    const parts: SVGElement[] = [...graticule()];
    const STEP = 5;
    if (ma < OPENED) {
      for (let a = OPENED; a > now; a -= STEP) {
        const b = Math.max(now, a - STEP);
        const fill = ageColor((a + b) / 2);
        for (const side of ['af', 'sa'] as const) {
          const p = iso(a, now, side);
          const q = iso(b, now, side);
          parts.push(svg('path', { d: shape([...p, ...q.reverse()]), fill, stroke: fill, 'stroke-width': 0.4 }));
        }
      }
      parts.push(svg('path', { d: path(iso(now, now, 'af')), fill: 'none', stroke: COL.ink, 'stroke-width': 1.2, 'stroke-dasharray': '4 2' }));
    }
    const sa = saAll.map((v) => turn(v, POLE, turnAt(now)));
    parts.push(
      svg('path', { d: path(afAll), fill: 'none', stroke: COL.ink, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
      svg('path', { d: path(sa), fill: 'none', stroke: COL.ink, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
      label(project(xyz([20, 5]))[0], project(xyz([20, 5]))[1], 'Africa', { bold: true, anchor: 'middle', halo: '#dfeaf0' }),
      label(...(project(turn(xyz([-58, -12]), POLE, turnAt(now))).slice(0, 2) as [number, number]), 'South America', { bold: true, anchor: 'middle', halo: '#dfeaf0' }),
      label(W - 8, 18, ma < 0.5 ? 'Today' : `${Math.round(ma)} million years ago`, { anchor: 'end', bold: true }),
    );
    // The key: age of the ocean floor.
    const kx = 10;
    const ky = 24;
    for (let a = 0; a < OPENED; a += 5) parts.push(svg('rect', { x: kx + (a / OPENED) * 120, y: ky, width: 120 / 26 + 0.3, height: 8, fill: ageColor(a + 2.5) }));
    parts.push(
      small(kx, ky - 4, 'Age of the ocean floor', { bold: true }),
      small(kx, ky + 19, 'new', { soft: true }),
      small(kx + 120, ky + 19, `${OPENED} Myr`, { anchor: 'end', soft: true }),
    );
    redraw(g, ...parts);
    const width = gap(saEdge.map((v) => turn(v, POLE, turnAt(now))), afEdge);
    f.readout.textContent = ma > OPENED + 0.5
      ? `${Math.round(ma)} million years ago: South America and Africa are one continent, part of Gondwana, with the matching rocks and fossils side by side.`
      : ma >= OPENED - 6
        ? `${Math.round(ma)} million years ago: a rift splits the continent and the sea floods in. Basalt wells up in the gap and becomes the first ocean floor.`
        : `${ma < 0.5 ? 'Today' : `${Math.round(ma)} million years ago`}: the ocean is about ${Math.round(width / 100) * 100} km wide. New floor forms at the ridge (dashed) and is carried away on both sides, so the youngest floor is in the middle and the oldest lies against the continents, in matching bands on either side.${ma < 0.5 ? ` Spread over ${OPENED} million years, that is about ${(width * 1e5 / (OPENED * 1e6)).toFixed(1)} cm a year.` : ''}`;
    if (ma < 0.5 && t.goal === 'opened') t.done();
  };
  const ts = slider('Time', 0, START, 1, 0, (v) => (v >= START ? 'today' : `${START - v} million years ago`), (v) => { pos = v; paint(); }, 'heat');
  f.controls.append(player(ts, ctx, { seconds: 15 }).node, ts.node);
  paint();
  return f.node;
});

// ---- The ice of Gondwana: scratches that point to one hub (lesson 9) ------------------------

/** Places with 300-million-year-old glacial beds on scratched bedrock: present longitude, latitude, and PALEOMAP plate. */
export const ICE_SITES: { name: string; lon: number; lat: number; p: number }[] = [
  { name: 'South Africa', lon: 30.5, lat: -29.5, p: 701 },
  { name: 'Namibia', lon: 14, lat: -19, p: 701 },
  { name: 'Brazil', lon: -50, lat: -25, p: 201 },
  { name: 'India', lon: 85.2, lat: 21, p: 501 },
  { name: 'Western Australia', lon: 115.5, lat: -29, p: 801 },
  { name: 'Victoria', lon: 144.4, lat: -37.7, p: 801 },
  { name: 'Antarctica', lon: -60, lat: -84, p: 802 },
];
/** When the ice spread, million years ago. */
export const ICE_AGE = 300;

type Quat = [number, number, number, number];
const conj = ([w, x, y, z]: Quat): Quat => [w, -x, -y, -z];
const unit = (v: number[]): V3P => {
  const n = Math.hypot(...v) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};
/** Along the great circle from a to b, fraction k. */
function slerp(a: V3P, b: V3P, k: number): V3P {
  const d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  if (d < 1e-9) return a;
  const s0 = Math.sin((1 - k) * d) / Math.sin(d);
  const s1 = Math.sin(k * d) / Math.sin(d);
  return unit([0, 1, 2].map((i) => a[i] * s0 + b[i] * s1));
}

/**
 * Each site's scratches, as present-day points on its plate: the line back up
 * the ice flow (toward the ice centre of 300 million years ago) and the arrow
 * of flow, outward. Simplified: the directions are drawn radiating from one
 * centre, as the measured scratches roughly do. Worked out from the plate
 * model the first time it is asked for (the model is fetched, paleomap.ts).
 */
type IceSite = (typeof ICE_SITES)[number] & { up: V3P[]; ahead: V3P; site: V3P };
let ICE_: IceSite[] | undefined;
const ice = (): IceSite[] => (ICE_ ??= (() => {
  const then = ICE_SITES.map((s) => rotate(rotationAt(s.p, ICE_AGE), xyzP(s.lon, s.lat)));
  const hub = unit([0, 1, 2].map((i) => then.reduce((sum, v) => sum + v[i], 0)));
  return ICE_SITES.map((s, i) => {
    const back = conj(rotationAt(s.p, ICE_AGE));
    const up: V3P[] = [];
    for (let k = 0; k <= 1.0001; k += 0.05) up.push(rotate(back, slerp(then[i], hub, k)));
    // The arrow: 8 degrees onward, away from the hub.
    const d = Math.acos(Math.max(-1, Math.min(1, then[i][0] * hub[0] + then[i][1] * hub[1] + then[i][2] * hub[2])));
    const ahead = rotate(back, slerp(hub, then[i], (d + (8 * Math.PI) / 180) / d));
    return { ...s, up, ahead, site: xyzP(s.lon, s.lat) };
  });
})());

/** How far apart the ends of the lines drawn back up the ice flow lie, `ma` million years ago: mean km from their middle. */
export function iceSpread(ma: number): number {
  const ends = ice().map((s) => rotate(rotationAt(s.p, ma), s.up[s.up.length - 1]));
  const mid = unit([0, 1, 2].map((i) => ends.reduce((sum, v) => sum + v[i], 0)));
  return ends.reduce((sum, v) => sum + km(v, mid), 0) / ends.length;
}

export const gondwanaIceFigure = figure(['hub'], (ctx, t) => {
  const f = frame(W, H, 3);
  return onPlateModel(t, f, () => {
    const g = svg('g');
    f.svg.append(g);
    let ma = 0;
    const paint = () => {
      const now = ice().map((s) => ({ ...s, q: rotationAt(s.p, ma) }));
      const centre = unit([0, 1, 2].map((i) => now.reduce((sum, s) => sum + rotate(s.q, s.site)[i], 0)));
      const view = globeView(W / 2, H / 2, 140, centre);
      const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper }), svg('circle', { cx: W / 2, cy: H / 2, r: 140, fill: '#dfeaf0' })];
      for (let lat = -75; lat <= 75; lat += 15) {
        const ps: [number, number, boolean][] = [];
        for (let lon = -180; lon <= 180; lon += 3) ps.push(view.at(xyzP(lon, lat)));
        let d = '';
        ps.forEach(([x, y, front], i) => { if (front) d += `${i && ps[i - 1][2] ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; });
        parts.push(svg('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 0.8 }));
      }
      const land = drawn(view.rings, ma);
      parts.push(
        svg('path', { d: land.shelf, fill: '#e9dfc9' }),
        svg('path', { d: land.land, fill: '#bfa982', stroke: COL.ink, 'stroke-width': 0.4, 'stroke-opacity': 0.5 }),
      );
      const pole = view.at(xyzP(0, -90));
      if (pole[2]) parts.push(svg('circle', { cx: pole[0], cy: pole[1], r: 2.2, fill: 'none', stroke: COL.ink, 'stroke-width': 1 }), small(pole[0] + 5, pole[1] + 12, 'South Pole', { bold: true, halo: '#fff' }));
      for (const s of now) {
        const up = s.up.map((v) => view.at(rotate(s.q, v)));
        const [x0, y0, f0] = up[0];
        const [x1, y1, f1] = view.at(rotate(s.q, s.ahead));
        if (!f0) continue;
        let d = '';
        up.forEach(([x, y, front], i) => { if (front) d += `${i && up[i - 1][2] ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; });
        parts.push(svg('path', { d, fill: 'none', stroke: COL.water, 'stroke-width': 1.1, 'stroke-dasharray': '3 3' }));
        if (f1) {
          const a = Math.atan2(y1 - y0, x1 - x0);
          parts.push(
            svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: COL.water, 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
            svg('path', { d: `M${x1 + 5 * Math.cos(a)},${y1 + 5 * Math.sin(a)}L${x1 + 5 * Math.cos(a + 2.3)},${y1 + 5 * Math.sin(a + 2.3)}L${x1 + 5 * Math.cos(a - 2.3)},${y1 + 5 * Math.sin(a - 2.3)}Z`, fill: COL.water }),
          );
        }
        parts.push(svg('circle', { cx: x0, cy: y0, r: 2.4, fill: COL.ink }));
        if (ma < 1) parts.push(small(x0 + (x0 > W / 2 ? -5 : 5), y0 - 5, s.name, { anchor: x0 > W / 2 ? 'end' : undefined, halo: '#fff' }));
      }
      parts.push(label(W - 8, 18, ma < 1 ? 'Today' : `${Math.round(ma)} million years ago`, { anchor: 'end', bold: true }));
      redraw(g, ...parts);
      const spread = iceSpread(ma);
      const lat = lonLat(centre)[1];
      f.readout.textContent = ma < 1
        ? `Today: arrows show which way the ice moved at each site, judged from the scratches; dashed lines run back up the flow. They point every which way, some from the open ocean, and their far ends lie about ${Math.round(spread / 100) * 100} km apart on average.`
        : ma >= ICE_AGE - 3
          ? `${ICE_AGE} million years ago the southern continents sit together over the South Pole, and every dashed line ends at the same spot: one ice sheet, spreading outward like spokes from a hub.`
          : `${Math.round(ma)} million years ago, the middle of the scratched ground lay at ${Math.abs(Math.round(lat))}°${lat < 0 ? 'S' : 'N'}. The far ends of the dashed lines are about ${Math.round(spread / 100) * 100} km apart on average.`;
      if (ma >= ICE_AGE - 3 && t.goal === 'hub') t.done();
    };
    const ts = slider('Back in time', 0, ICE_AGE, 1, 0, (v) => (v < 1 ? 'today' : `${v} million years ago`), (v) => { ma = v; paint(); }, 'water');
    f.controls.append(player(ts, ctx, { seconds: 10 }).node, ts.node);
    const credit = document.createElement('p');
    credit.className = 'map-credit';
    credit.textContent = PALEOMAP_CREDIT;
    f.node.append(credit);
    paint();
    guessFirst(t, f, {
      ask: 'Today the ice scratches in Africa, India, Australia and South America point every which way. Run the continents back 300 million years. What will the arrows do? Guess first.',
      options: ['Still point every which way', 'All point the same way, like a wind', 'Spread out from one centre'],
      answer: 2, reveal: 'done',
      sliders: [ts],
      after: (guess) => {
        paint();
        f.readout.textContent = `You guessed ${['every which way', 'all the same way', 'out from one centre'][guess]}. Play the continents back to ${ICE_AGE} million years ago.`;
      },
    });
  });
});
