// Lesson 14, Boulders where they don't belong: the Rhône glacier on a long
// section from its source to the Jura, grown or shrunk to balance snowfall
// against melting; it leaves a moraine and its boulders at its farthest reach.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';

const W = 400;

/** The valley floor along the ice's path: [km from the source, metres above sea level]. */
const BED: P[] = [
  [0, 3300], [6, 2400], [14, 1750], [40, 680], [80, 500], [105, 470], [130, 372],
  [160, 430], [190, 440], [205, 432], [212, 640], [218, 950], [226, 1150], [240, 1000],
];
const PLACES: [number, string][] = [[8, 'Rhône glacier'], [40, 'Brig'], [105, 'Martigny'], [140, 'Lake Geneva'], [200, 'Neuchâtel'], [222, 'Jura']];
export const JURA_KM = 210;

export function bedAt(x: number): number {
  for (let i = 1; i < BED.length; i++) {
    if (x <= BED[i][0]) {
      const [x0, z0] = BED[i - 1];
      const [x1, z1] = BED[i];
      return z0 + ((x - x0) / (x1 - x0)) * (z1 - z0);
    }
  }
  return BED[BED.length - 1][1];
}

/** Ice thickness at x for a glacier `len` km long: a perfectly plastic ice sheet (Nye), thickest at the head. */
export const thickness = (x: number, len: number) => (x >= len ? 0 : Math.sqrt(22.7 * (len - x) * 1000) * 0.85);
/** Ice-covered width relative to the trunk valley: many tributaries high up, a spreading lobe on the plateau. */
const width = (x: number) => (x < 14 ? 8 : x < 130 ? 1.6 : 1.6 + (x - 130) * 0.045);

/** The equilibrium line: snow falls faster than it melts above it. Today about 2,950 m; 150 m lower for each °C cooler; lower with more snow. */
export const elaFor = (cooling: number, snow: number) => 2950 + 150 * cooling - 300 * Math.log2(snow);

/** Net mass balance of a glacier `len` km long, in units of ice per year (arbitrary scale). */
function balance(len: number, ela: number, snow: number): number {
  let net = 0;
  for (let x = 0; x < len; x += 0.5) {
    const s = bedAt(x) + thickness(x, len);
    const b = s > ela ? Math.min(0.008 * (s - ela) * snow, 2.5 * snow) : 0.006 * (s - ela);
    net += b * width(x) * 0.5;
  }
  return net;
}

/** The glacier's steady length, km: where the snow it gathers equals what melts. */
export function glacierLength(cooling: number, snow: number): number {
  const ela = elaFor(cooling, snow);
  let len = 0.5;
  for (; len < 224; len += 0.5) if (balance(len + 0.5, ela, snow) < 0) break;
  return len;
}

export const glacierFigure = figure(['jura'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let cooling = 0;
  let snow = 1;
  let farthest = 0;
  const X = (km: number) => 12 + (km / 240) * 380;
  const Z = (m: number) => 196 - (m / 4200) * 176;
  const paint = () => {
    const len = glacierLength(cooling, snow);
    farthest = Math.max(farthest, len);
    const ela = elaFor(cooling, snow);
    const bed: P[] = [];
    const ice: P[] = [];
    for (let x = 0; x <= 240; x += 1) bed.push([X(x), Z(bedAt(x))]);
    for (let x = 0; x <= len; x += 1) ice.push([X(x), Z(bedAt(x) + thickness(x, len))]);
    ice.push([X(len), Z(bedAt(len))]);
    const iceBase = bed.filter(([x]) => x <= X(len)).reverse();
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 220, fill: '#eef2f4' }),
      svg('polygon', { points: [...ice, ...iceBase].map((p) => p.join(',')).join(' '), fill: '#cfe3ef', stroke: '#8bb2c9', 'stroke-width': 1 }),
      svg('polygon', { points: `${X(0)},${Z(0)} ${bed.map((p) => p.join(',')).join(' ')} ${X(240)},${Z(0)}`, fill: '#a99683' }),
      svg('rect', { x: X(130), y: Z(372), width: X(150) - X(130), height: 3, fill: COL.water, opacity: len > 140 ? 0 : 0.8 }),
      line(0, Z(ela), W, Z(ela), COL.heat, 1, { 'stroke-dasharray': '5 3' }),
      small(W - 4, Z(ela) - 4, `snowline ${Math.round(ela).toLocaleString('en')} m`, { anchor: 'end', fill: COL.heat, bold: true }),
    ];
    // The moraine at the farthest the ice has reached, with a boulder from the Alps on it.
    const mx = X(farthest);
    const mz = Z(bedAt(farthest));
    parts.push(
      svg('path', { d: `M${mx - 7},${mz} Q${mx},${mz - 9} ${mx + 7},${mz} Z`, fill: '#7d6b5a' }),
      svg('polygon', { points: `${mx - 3},${mz - 6} ${mx - 1},${mz - 12} ${mx + 4},${mz - 11} ${mx + 5},${mz - 6}`, fill: '#d8d2c8', stroke: COL.ink, 'stroke-width': 0.6 }),
    );
    for (const [km, name] of PLACES) {
      const y = Z(bedAt(km)) + 12;
      parts.push(small(X(km), Math.min(214, y), name, { anchor: km < 10 ? undefined : 'middle', soft: true, halo: '#a99683' }));
    }
    parts.push(label(10, 16, `${cooling === 0 ? 'Today’s climate' : `${Math.abs(cooling).toFixed(1)} °C ${cooling < 0 ? 'colder' : 'warmer'}`}, ${snow === 1 ? 'today’s snowfall' : `snowfall ×${snow.toFixed(2)}`}`, { size: 'note', bold: true, soft: true }));
    redraw(g, ...parts);
    const at = PLACES.filter(([km]) => km <= len + 3).pop()?.[1] ?? 'its source';
    f.readout.textContent = `The glacier is ${Math.round(len)} km long, reaching about as far as ${at === 'Rhône glacier' ? 'it does today' : at}. Above the snowline more snow falls each year than melts; below it, the ice melts faster than snow falls. It grows until the two balance.${farthest >= JURA_KM ? ' Its moraine and boulders now sit on the Jura, 200 km from the Alps.' : ''}`;
    if (len >= JURA_KM && t.goal === 'jura') t.done();
  };
  const cs = slider('Climate', -10, 3, 0.1, 0, (v) => (v === 0 ? 'today' : `${Math.abs(v).toFixed(1)} °C ${v < 0 ? 'colder' : 'warmer'}`), (v) => { cooling = v; paint(); }, 'water');
  const ss = slider('Snowfall', 0.5, 1.5, 0.05, 1, (v) => `${Math.round(v * 100)}% of today’s`, (v) => { snow = v; paint(); }, 'old');
  f.controls.append(cs.node, ss.node);
  paint();
  return f.node;
});
