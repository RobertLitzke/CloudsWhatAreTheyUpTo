// Lesson 16, Rings that tell time: a trunk's parts (still), a trunk that
// lays down a ring a year from the rain the reader sets, and cross-dating an
// old beam against a master series of ring widths.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { button, COL, figure, frame, slider, wrapped } from './kit';

const W = 400;

// ---- A trunk's parts (still) -------------------------------------------------------------------------

export const trunkStill = () => {
  const s = still(W, 220);
  const cx = 120;
  const cy = 110;
  const parts: SVGElement[] = [
    svg('circle', { cx, cy, r: 100, fill: COL.bark }),
    svg('circle', { cx, cy, r: 92, fill: '#b98b5c' }),
    svg('circle', { cx, cy, r: 89, fill: '#e7d3a6' }),
  ];
  // Sapwood rings, then heartwood rings, then the pith.
  for (let r = 86; r > 4; r -= 7) {
    const heart = r < 52;
    parts.push(svg('circle', { cx, cy, r, fill: heart ? '#9a6a3c' : '#e7d3a6', stroke: heart ? '#6e4824' : '#b9925a', 'stroke-width': 1.6 }));
  }
  parts.push(svg('circle', { cx, cy, r: 3, fill: '#4a3420' }));
  parts.push(svg('circle', { cx, cy, r: 90.5, fill: 'none', stroke: COL.leaf, 'stroke-width': 1.5 }));
  const tags: [number, string, string][] = [
    [96, 'Bark: dead cork outside', COL.bark],
    [91, 'Phloem: carries sugar down', '#8a5a2c'],
    [90, 'Cambium: the growing layer', COL.leaf],
    [70, 'Sapwood: carries water', '#9a7a4a'],
    [30, 'Heartwood: old, plugged wood', '#6e4824'],
    [0, 'Pith: the first year’s centre', '#4a3420'],
  ];
  tags.forEach(([r, text, color], i) => {
    const y = 26 + i * 34;
    parts.push(line(cx + r * 0.7, cy - r * 0.7 * (i < 3 ? 1 : 0.2), 236, y - 4, COL.soft, 0.8), small(240, y, text, { fill: color, bold: i === 2 }));
  });
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- Growing rings ----------------------------------------------------------------------------------

/** A ring's width (mm) from a year's rain (cm): wider in wet years, never quite nothing. */
export const ringWidth = (rain: number) => 0.3 + 0.05 * rain;

export const growFigure = figure(['grow'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let rain = 30;
  const years: number[] = [];
  const paint = () => {
    const cx = 110;
    const cy = 110;
    const widths = years.map(ringWidth);
    const total = 6 + widths.reduce((a, b) => a + b, 0);
    const k = Math.min(10, 92 / total);
    const parts: SVGElement[] = [svg('circle', { cx, cy, r: total * k + 6, fill: COL.bark })];
    let r = total * k;
    for (let i = years.length - 1; i >= 0; i--) {
      const w = widths[i] * k;
      // Each ring: pale early wood, then a dark band of late wood at its outer edge.
      parts.push(svg('circle', { cx, cy, r, fill: '#ab7e4c' }), svg('circle', { cx, cy, r: r - Math.max(1.2, w * 0.25), fill: '#ead8ae' }));
      r -= w;
    }
    parts.push(svg('circle', { cx, cy, r: Math.max(2, r), fill: '#ead8ae' }), svg('circle', { cx, cy, r: 2.5, fill: '#4a3420' }));
    parts.push(svg('circle', { cx, cy, r: total * k + 0.8, fill: 'none', stroke: COL.leaf, 'stroke-width': 1.4 }));
    const bars = years.slice(-14).map((v, i) => svg('rect', { x: 240 + i * 10, y: 150 - v * 1.6, width: 7, height: v * 1.6, fill: COL.water }));
    redraw(g,
      ...parts,
      label(240, 30, `${years.length} rings`, { bold: true }),
      small(240, 48, 'Green ring: the cambium', { fill: COL.leaf }),
      small(240, 66, 'Rain each year, latest on the right', { soft: true }),
      ...bars,
      line(240, 150, 384, 150, COL.ink, 1),
      ...wrapped(240, 172, 'A model of a pine in a dry climate, where water limits growth.', 28, { soft: true }),
    );
    const dry = years.some((v) => v <= 15);
    const wet = years.some((v) => v >= 45);
    f.readout.textContent = !years.length
      ? 'A seedling’s first-year stem. Set the year’s rain, then grow a year.'
      : `Each year the cambium adds a ring: wide pale wood in spring, a dark narrow band of dense wood in late summer. ${dry && wet ? 'Dry years leave thin rings and wet years thick ones, a pattern any tree in the same valley shares.' : 'Try a dry year and a wet one.'}`;
    if (years.length >= 8 && dry && wet) t.done();
  };
  const rs = slider('Rain this year', 5, 60, 1, rain, (v) => `${v} cm`, (v) => { rain = v; }, 'water');
  const grow = button('Grow a year', () => { years.push(rain); paint(); }, false);
  const reset = button('Cut it down', () => { years.length = 0; paint(); });
  f.controls.append(rs.node, grow, reset);
  paint();
  return f.node;
});

// ---- Cross-dating ------------------------------------------------------------------------------------

export const MASTER_START = 1150;
export const MASTER_END = 1299;
/** The beam's outermost ring grew in this year. */
export const BEAM_END = 1258;
export const BEAM_RINGS = 36;

/** A master series of ring widths (1 = an average year), year by year from MASTER_START. Made up, with a drier run from 1276 to 1299 like the Southwest’s Great Drought. */
export function master(): number[] {
  const rng = makeRng(1929);
  const out: number[] = [];
  for (let y = MASTER_START; y <= MASTER_END; y++) {
    let w = 1 + (rng() - 0.5) * 0.9;
    if (rng() < 0.12) w = 0.15 + rng() * 0.2; // a drought year: a very thin ring
    if (y >= 1276 && y <= 1299) w *= 0.6;
    out.push(Math.max(0.1, w));
  }
  return out;
}

/** The old beam: the master's rings for the years it grew, with a little noise of its own. */
export function beam(): number[] {
  const m = master();
  const rng = makeRng(39);
  const end = BEAM_END - MASTER_START;
  return m.slice(end - BEAM_RINGS + 1, end + 1).map((w) => Math.max(0.1, w * (0.85 + rng() * 0.3)));
}

/** How well the beam matches the master with its outer ring at `year`: the correlation of their widths. */
export function match(year: number): number {
  const m = master();
  const b = beam();
  const end = year - MASTER_START;
  const seg = m.slice(end - b.length + 1, end + 1);
  if (seg.length < b.length) return 0;
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const ma = mean(seg);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < b.length; i++) {
    num += (seg[i] - ma) * (b[i] - mb);
    da += (seg[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

export const crossdateFigure = figure(['dated'], (_ctx, t) => {
  const f = frame(W, 210, 3);
  const g = svg('g');
  f.svg.append(g);
  const m = master();
  const b = beam();
  let year = 1225;
  const first = 1200;
  const last = 1299;
  const X = (y: number) => 14 + ((y - first) / (last - first + 1)) * 372;
  const bw = 372 / (last - first + 1);
  const paint = () => {
    const r = match(year);
    const masterBars = m.slice(first - MASTER_START).map((w, i) => svg('rect', { x: X(first + i), y: 80 - w * 36, width: bw - 0.6, height: w * 36, fill: w < 0.4 ? COL.bad : COL.wood }));
    const beamBars = b.map((w, i) => {
      const y = year - b.length + 1 + i;
      return svg('rect', { x: X(y), y: 120, width: bw - 0.6, height: w * 36, fill: w < 0.4 ? COL.bad : COL.sugar });
    });
    redraw(g,
      small(14, 18, 'Master series from living trees and dated timbers, ring width by year', { soft: true }),
      ...masterBars,
      line(14, 80, 386, 80, COL.ink, 1),
      ...[1200, 1225, 1250, 1275].map((y) => small(X(y), 96, String(y), { anchor: 'middle', soft: true })),
      line(14, 120, 386, 120, COL.ink, 1),
      ...beamBars,
      small(14, 172, 'The undated beam, drawn hanging down; red: very thin rings', { soft: true }),
      label(14, 196, `Beam’s outer ring placed at ${year}`, { bold: true }),
      label(386, 196, `match ${r.toFixed(2)}`, { anchor: 'end', bold: true, fill: r > 0.8 ? COL.good : COL.soft }),
    );
    f.readout.textContent = r > 0.8
      ? `At ${year} the thin rings line up one for one, and the match jumps. The beam’s outermost ring grew in ${year}, so its tree was felled in ${year} or later.`
      : 'Slide the beam along the master until its pattern of thin rings lines up. Only one place fits well.';
    if (r > 0.8) t.done();
  };
  const ys = slider('Beam’s outer ring', first + BEAM_RINGS, last, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'wood');
  f.controls.append(ys.node);
  paint();
  return f.node;
});
