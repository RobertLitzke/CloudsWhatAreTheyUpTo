// The pieces Clouds' figures are drawn with. Lines, arrows, text and plain
// shapes are Didactics' draw.ts, re-exported here; this file adds the ones
// only clouds need: an ice crystal, a puff of cloud, and the radar's pieces.

import { svg } from 'didactics/dom';
import { celCumulus, celHeap } from '../clouds/flat';
import { FIGURE } from '../clouds/tones';
import { hexagon, line, small } from 'didactics/draw';
import { COL, RADAR, radarColor } from './kit';

export * from 'didactics/draw';

/** A snowflake: three strokes crossing at the centre. */
export function flake(x: number, y: number, r: number, color: string = COL.ice, width = 1.4): SVGElement {
  return svg('g', {}, ...[0, 1, 2].map((k) => line(x - r * Math.cos((k * Math.PI) / 3), y - r * Math.sin((k * Math.PI) / 3), x + r * Math.cos((k * Math.PI) / 3), y + r * Math.sin((k * Math.PI) / 3), color, width)));
}

/** An ice crystal: six arms round a solid hexagon. */
export function crystal(cx: number, cy: number, r: number): SVGElement {
  const g = svg('g');
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    g.append(line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a), COL.ice, Math.max(1.5, r / 6)));
  }
  g.append(hexagon(cx, cy, Math.max(2, r * 0.3), { fill: COL.ice }));
  return g;
}

/** A cumulus-like puff of lobes in flat, cel-shaded vector, cut flat at `base` when given. */
export function puff(cx: number, cy: number, s: number, cut?: { base: number; sky: string }): SVGElement {
  const blobs: [number, number, number][] = [[-22, 6, 16], [0, -8, 22], [22, 4, 17], [-8, -24, 14], [12, -22, 15], [0, 10, 18]];
  const puffs = blobs.map(([dx, dy, r]) => ({ x: cx + dx * s, y: cy + dy * s, z: 0, r: r * s, flat: 1 }));
  return celHeap(puffs, FIGURE, { base: cut?.base, seed: Math.round(cx) });
}

/** A heap with a flat base at `baseY`, about `w` * 1.6 wide and `h` tall, in flat, cel-shaded vector: a dome, or a tower of turrets when tall. */
export function heapAt(cx: number, baseY: number, w: number, h: number): SVGElement {
  return celCumulus(cx, baseY, w * 1.6, h + 6, FIGURE, Math.round(cx));
}

// ---- Radar ------------------------------------------------------------------

/**
 * A radar picture: the box `w` by `h` at x, y cut into bins `bin` units
 * square, each coloured by the echo `dbzAt` gives at its centre, in drawing
 * units. Bins too faint to show are left clear.
 */
export function radarImage(x: number, y: number, w: number, h: number, bin: number, dbzAt: (x: number, y: number) => number): SVGElement {
  const image = svg('image', { x, y, width: w, height: h, preserveAspectRatio: 'none', style: 'image-rendering: pixelated' });
  const cw = Math.ceil(w / bin);
  const ch = Math.ceil(h / bin);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext?.('2d');
  if (!g) return image;
  const px = g.createImageData(cw, ch);
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      const c = radarColor(dbzAt(x + (i + 0.5) * bin, y + (j + 0.5) * bin));
      if (!c) continue;
      const n = parseInt(c.slice(1), 16);
      const k = (j * cw + i) * 4;
      px.data[k] = n >> 16;
      px.data[k + 1] = (n >> 8) & 255;
      px.data[k + 2] = n & 255;
      px.data[k + 3] = 255;
    }
  }
  g.putImageData(px, 0, 0);
  image.setAttribute('href', canvas.toDataURL());
  return image;
}

/**
 * The radar colour key, `w` wide at x, y: a strip from 5 dBZ up, in steps of
 * 5, with the words for light rain, heavy rain and hail under it. With
 * `from` below 5 the strip starts with a blank stretch for echoes too faint to
 * show. `mark` puts a pointer at that many dBZ. The key needs 22 units below y
 * and 12 above.
 */
export function radarKey(x: number, y: number, w: number, from = 5, mark?: number): SVGElement {
  const to = 5 + 5 * RADAR.length;
  const at = (d: number) => x + ((d - from) / (to - from)) * w;
  const g = svg('g');
  if (from < 5) {
    g.append(
      svg('rect', { x, y, width: at(5) - x, height: 8, fill: 'none', stroke: COL.grid }),
      small((x + at(5)) / 2, y + 19, 'too faint to show', { anchor: 'middle', soft: true }),
    );
  }
  RADAR.forEach((c, k) => g.append(svg('rect', { x: at(5 + 5 * k), y, width: at(10) - at(5) + 0.3, height: 8, fill: c })));
  for (const d of from < 5 ? [20, 40, 60] : [10, 20, 40, 60]) {
    g.append(line(at(d), y + 8, at(d), y + 11, COL.soft, 1), small(at(d), y + 19, String(d), { anchor: 'middle', soft: true }));
  }
  g.append(small(x + w, y - 3, 'dBZ', { anchor: 'end', soft: true }));
  // Words over the strip, unless a pointer will sit there.
  if (mark === undefined) for (const [d, text] of [[25, 'light'], [45, 'heavy'], [65, 'hail']] as const) g.append(small(at(d), y - 3, text, { anchor: 'middle', soft: true }));
  if (mark !== undefined) {
    const mx = Math.max(x, Math.min(x + w, at(mark)));
    g.append(svg('polygon', { points: `${mx},${y - 1} ${mx - 5},${y - 8} ${mx + 5},${y - 8}`, fill: COL.ink }));
  }
  return g;
}

/** A radar dish on a short mast, standing on y, tilted up towards `toward` (degrees above the horizon). */
export function radarDish(x: number, y: number, toward = 30): SVGElement {
  return svg('g', {},
    svg('rect', { x: x - 2, y: y - 12, width: 4, height: 12, fill: COL.ink }),
    svg('g', { transform: `translate(${x} ${y - 13}) rotate(${-toward})` },
      svg('path', { d: 'M-3,-11 Q6,0 -3,11', fill: 'none', stroke: COL.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      line(-1, 0, 9, 0, COL.ink, 1.4),
      svg('circle', { cx: 9, cy: 0, r: 1.6, fill: COL.ink })),
  );
}
