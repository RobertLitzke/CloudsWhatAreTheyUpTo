// Branch T1, Stripes on the rocks: a month of mixed tides like the Salish
// Sea's, built from five tidal rhythms, and how long each height on the rock
// spends out of water.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';

const W = 400;

/** Five main tidal rhythms: period in hours, size in metres and a starting phase. Sizes roughly as at Port Townsend. */
export const RHYTHMS = [
  { name: 'M2', hours: 12.42, m: 0.75, phase: 0 },
  { name: 'S2', hours: 12.0, m: 0.2, phase: 0.6 },
  { name: 'N2', hours: 12.66, m: 0.15, phase: 1.9 },
  { name: 'K1', hours: 23.93, m: 0.75, phase: 0.3 },
  { name: 'O1', hours: 25.82, m: 0.42, phase: 2.4 },
] as const;

/** Mean water level above the lowest normal low tide, m. */
export const MEAN = 1.4;

/** Tide height at `h` hours into the month, metres above the lowest normal low tide. */
export const tide = (h: number) => MEAN + RHYTHMS.reduce((s, r) => s + r.m * Math.cos((2 * Math.PI * h) / r.hours + r.phase), 0);

const HOURS = 30 * 24;
const STEP = 0.25;
const series = Array.from({ length: HOURS / STEP }, (_, i) => tide(i * STEP));

/** Share of a month a point at `height` spends out of the water. */
export const dryShare = (height: number) => series.filter((v) => v < height).length / series.length;

/** The bands on a sheltered Salish Sea rock, roughly, by height above the lowest normal low tide. */
export const BANDS = [
  { name: 'Black lichen and periwinkles', from: 2.8, to: 4, color: '#2b2b2b' },
  { name: 'Acorn barnacles', from: 2.0, to: 2.8, color: '#d8d0bc' },
  { name: 'Mussels and rockweed', from: 1.0, to: 2.0, color: '#4a4f6a' },
  { name: 'Sea stars, anemones and red algae', from: 0, to: 1.0, color: '#b0506a' },
  { name: 'Kelp, surfgrass and coralline algae', from: -1, to: 0, color: '#6e7f2e' },
] as const;

export const bandAt = (h: number) => BANDS.findIndex((b) => h >= b.from && h < b.to);

export const tideFigure = figure(['zones'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let height = 2.5;
  const seen = new Set<number>();
  // Height scale shared by the rock and the tide chart.
  const Y = (m: number) => 190 - ((m + 1) / 5) * 170;
  const paint = () => {
    const b = bandAt(height);
    const dry = dryShare(height);
    const x0 = 120;
    const w = 266;
    const pts = series.filter((_, i) => i % 4 === 0).map((v, i) => `${(x0 + (i / (series.length / 4)) * w).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    redraw(g,
      ...BANDS.map((band) => svg('rect', { x: 36, y: Y(band.to), width: 60, height: Y(band.from) - Y(band.to), fill: band.color, opacity: 0.85 })),
      svg('path', { d: `M 96 ${Y(4)} L 96 ${Y(-1)}`, stroke: COL.ink, 'stroke-width': 1 }),
      ...[-1, 0, 1, 2, 3, 4].map((m) => small(32, Y(m) + 3, `${m} m`, { anchor: 'end', soft: true })),
      svg('rect', { x: x0, y: Y(4), width: w, height: Y(-1) - Y(4), fill: COL.water, opacity: 0.08 }),
      svg('polyline', { points: pts, fill: 'none', stroke: COL.sea, 'stroke-width': 1.1 }),
      line(30, Y(height), x0 + w, Y(height), COL.heat, 1.5, { 'stroke-dasharray': '5 3' }),
      svg('circle', { cx: 66, cy: Y(height), r: 5, fill: COL.heat, stroke: '#fff', 'stroke-width': 1 }),
      small(x0, Y(4) - 6, 'one month of tides', { soft: true }),
      small(x0 + w, 212, '30 days', { anchor: 'end', soft: true }),
      small(36, 212, 'the rock', { soft: true }),
      small(392, 230, 'A model', { anchor: 'end', soft: true }),
    );
    if (b >= 0) seen.add(b);
    f.readout.textContent = `${height.toFixed(1)} m above the lowest normal low tide: out of the water ${Math.round(dry * 100)}% of the month. ${b >= 0 ? `This is the band of ${BANDS[b].name.toLowerCase()}.` : ''} ${dry > 0.85 ? 'Wet only at the highest tides and in spray.' : dry < 0.03 ? 'Bared only at the lowest tides of the month.' : ''}`;
    if (seen.size >= 4) t.done();
  };
  const hs = slider('Height on the rock', -0.9, 3.9, 0.1, height, (v) => `${v.toFixed(1)} m`, (v) => { height = v; paint(); }, 'heat');
  f.controls.append(hs.node);
  paint();
  return f.node;
});
