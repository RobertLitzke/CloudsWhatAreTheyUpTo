// A jar of soil shaken up in water, `t` seconds after it was set down: layers
// of sand, silt and clay on the bottom as each size settles, and the water as
// cloudy as what is still hanging in it. The jar figure and the drawn stand-in
// for a jar-test photo both draw it.

import { svg } from 'didactics/dom';
import { settled, type Mix } from '../../core/soil';
import { COL, tint } from '../figures/kit';

export interface JarBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How tall the soil stands once it has all settled, as a share of the jar. */
export const SOIL_SHARE = 0.36;

/** The tops of the three layers (sand at the bottom), in drawing units, `t` seconds after shaking. */
export function layerTops(box: JarBox, mix: Mix, t: number): { sand: number; silt: number; clay: number } {
  const full = box.h * SOIL_SHARE;
  const floor = box.y + box.h - 6;
  const sand = floor - (full * mix.sand * settled('sand', t)) / 100;
  const silt = sand - (full * mix.silt * settled('silt', t)) / 100;
  const clay = silt - (full * mix.clay * settled('clay', t)) / 100;
  return { sand, silt, clay };
}

export function drawJar(box: JarBox, mix: Mix, t: number): SVGElement {
  const { x, y, w, h } = box;
  const floor = y + h - 6;
  const tops = layerTops(box, mix, t);
  // What is still in the water: silt is yellow-grey, clay reddish; together a muddy brown.
  const hanging = (mix.sand * (1 - settled('sand', t)) + mix.silt * (1 - settled('silt', t)) + mix.clay * (1 - settled('clay', t))) / 100;
  const clayShare = mix.clay * (1 - settled('clay', t));
  const siltShare = mix.silt * (1 - settled('silt', t));
  const murk = clayShare > siltShare ? COL.clay : COL.mineral;
  const water = y + 16;
  const g = svg('g', {},
    // Water, then the murk in it.
    svg('rect', { x: x + 4, y: water, width: w - 8, height: floor - water, fill: COL.waterPale }),
    svg('rect', { x: x + 4, y: water, width: w - 8, height: tops.clay - water, fill: tint(murk, Math.min(0.85, 0.12 + hanging * 1.6)) }),
    svg('rect', { x: x + 4, y: tops.sand, width: w - 8, height: floor - tops.sand, fill: COL.sand }),
    svg('rect', { x: x + 4, y: tops.silt, width: w - 8, height: tops.sand - tops.silt, fill: COL.silt }),
    svg('rect', { x: x + 4, y: tops.clay, width: w - 8, height: tops.silt - tops.clay, fill: COL.clay }),
  );
  // Grit in the sand layer.
  for (let i = 0; i < 26; i++) {
    const gx = x + 8 + ((i * 37) % (w - 16));
    const gy = tops.sand + 2 + ((i * 13) % Math.max(1, floor - tops.sand - 3));
    if (gy < floor - 1) g.append(svg('circle', { cx: gx, cy: gy, r: 1.1, fill: '#e5bd6a' }));
  }
  // A few bits of leaf floating at the top.
  for (const [dx, dw] of [[0.2, 8], [0.55, 6], [0.75, 9]]) g.append(svg('rect', { x: x + w * dx, y: water - 1, width: dw, height: 2.2, rx: 1, fill: COL.organic }));
  // The glass: a lid, the walls, and a shine.
  g.append(
    svg('rect', { x: x + 6, y: y - 2, width: w - 12, height: 10, rx: 2, fill: '#8a8f7a' }),
    svg('path', { d: `M${x + 2},${y + 10} L${x + 2},${y + h - 8} Q${x + 2},${y + h} ${x + 10},${y + h} L${x + w - 10},${y + h} Q${x + w - 2},${y + h} ${x + w - 2},${y + h - 8} L${x + w - 2},${y + 10}`, fill: 'none', stroke: COL.ink, 'stroke-width': 2, 'stroke-linejoin': 'round' }),
    svg('line', { x1: x + 12, y1: y + 22, x2: x + 12, y2: y + h - 20, stroke: '#fff', 'stroke-width': 3, opacity: 0.55, 'stroke-linecap': 'round' }),
  );
  return g;
}
