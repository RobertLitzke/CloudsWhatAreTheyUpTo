// Lesson 10, A lichen is two (or three): a slice through a leafy lichen (a
// still), and a day in the life of a lichen that works only while it is wet,
// gaining in the light and losing in the dark.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, slider, wrapped } from './kit';

const W = 400;

// ---- The layers (still) ----------------------------------------------------------------------------

export const layersStill = () => {
  const s = still(W, 196);
  const parts: SVGElement[] = [];
  const x0 = 20;
  const x1 = 250;
  // Upper skin: tightly packed fungal threads.
  parts.push(svg('rect', { x: x0, y: 30, width: x1 - x0, height: 22, fill: '#c9b48a' }));
  for (let x = x0 + 4; x < x1; x += 7) parts.push(line(x, 32, x + 3, 50, '#a38c5f', 1));
  // Algal layer: green cells among threads.
  let k = 0;
  for (let x = x0 + 8; x < x1 - 4; x += 13) {
    for (const y of [62, 74]) {
      parts.push(svg('circle', { cx: x + ((k++ % 3) - 1) * 2, cy: y, r: 4.2, fill: COL.leaf }));
    }
  }
  // Medulla: loose threads.
  for (let i = 0; i < 26; i++) {
    const x = x0 + 6 + i * 9;
    parts.push(svg('path', { d: `M${x},86 q${i % 2 ? 8 : -6},14 ${i % 3 ? 3 : -4},28 t${i % 2 ? -3 : 5},18`, stroke: COL.hypha, 'stroke-width': 1.2, fill: 'none' }));
  }
  // Lower skin and anchoring threads.
  parts.push(svg('rect', { x: x0, y: 134, width: x1 - x0, height: 12, fill: '#6e5a3e' }));
  for (let x = x0 + 20; x < x1; x += 44) parts.push(line(x, 146, x + 2, 170, '#6e5a3e', 2), line(x + 2, 170, x - 4, 176, '#6e5a3e', 1.2), line(x + 2, 170, x + 8, 175, '#6e5a3e', 1.2));
  parts.push(svg('rect', { x: x0 - 6, y: 172, width: x1 - x0 + 12, height: 14, fill: '#8a8178', rx: 3 }));
  // Labels on the right.
  const tag = (y: number, name: string, body: string) => {
    parts.push(line(x1 + 2, y, x1 + 14, y, COL.soft, 1), label(x1 + 18, y + 4, name, { bold: true }), ...wrapped(x1 + 18, y + 17, body, 22, { soft: true }, 11));
  };
  tag(40, 'Skin', 'tightly packed threads');
  tag(70, 'Algae', 'make sugar from light');
  tag(108, 'Core', 'loose threads hold air and water');
  tag(150, 'Holdfasts', 'grip bark or rock');
  parts.push(small(x0, 20, 'A slice through a leafy lichen, about a fifth of a millimetre thick', { soft: true }));
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- A day of wet and dry ---------------------------------------------------------------------------

/** Daylight from 0 (night) to 1 (noon), for an equinox day. */
export const light = (h: number) => Math.max(0, Math.sin((Math.PI * (h - 6)) / 12));

const P = 3;
const R = 0.6;

/** Carbon gained by the end of each hour of a day in which the lichen is wet for `hours` from `from`. */
export function lichenDay(from: number, hours: number): number[] {
  const out = [0];
  let c = 0;
  for (let h = 0; h < 24; h++) {
    const wet = ((h - from + 24) % 24) < hours;
    if (wet) c += P * light(h + 0.5) - R;
    out.push(c);
  }
  return out;
}

export const dayFigure = figure(['timing'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let from = 20;
  let hours = 4;
  let sawLoss = false;
  let sawGain = false;
  const paint = () => {
    const day = lichenDay(from, hours);
    const net = day[24];
    const ax = axes({ x: 44, y: 46, w: 336, h: 110, xmin: 0, xmax: 24, ymin: -8, ymax: 16, xticks: [0, 6, 12, 18, 24], yticks: [-8, 0, 8, 16], xlabel: 'hour of the day', ylabel: 'carbon gained since midnight', ink: COL.ink, grid: COL.grid });
    const bands: SVGElement[] = [];
    // Daylight strip and the hours the lichen is wet.
    for (let h = 0; h < 24; h++) {
      const l = light(h + 0.5);
      bands.push(svg('rect', { x: ax.X(h), y: 18, width: ax.X(1) - ax.X(0) + 0.5, height: 8, fill: l > 0 ? '#f0c95a' : '#3a3550', opacity: l > 0 ? 0.3 + 0.7 * l : 0.8 }));
      if (((h - from + 24) % 24) < hours) bands.push(svg('rect', { x: ax.X(h), y: 46, width: ax.X(1) - ax.X(0) + 0.5, height: 110, fill: COL.water, opacity: 0.18 }));
    }
    redraw(g,
      ...bands,
      small(40, 25, 'sun', { anchor: 'end', soft: true }),
      ...ax.parts,
      line(44, ax.Y(0), 380, ax.Y(0), COL.ink, 1.2),
      ax.path(day.map((c, h) => [h, c]), net >= 0 ? COL.good : COL.bad, 2.5),
      small(380, 192, `Net for the day: ${net >= 0 ? '+' : ''}${net.toFixed(1)}`, { anchor: 'end', bold: true, fill: net >= 0 ? COL.good : COL.bad }),
      small(44, 192, 'Blue: hours the lichen is wet', { fill: COL.water, bold: true }),
    );
    if (!open()) return;
    const lit = Array.from({ length: 24 }, (_, h) => h).filter((h) => ((h - from + 24) % 24) < hours && light(h + 0.5) > 0).length;
    if (hours > 0 && net < 0) sawLoss = true;
    if (net > 0) sawGain = true;
    f.readout.textContent = hours === 0
      ? 'Dry all day, the lichen does nothing at all: no gain, and no loss. It can wait like this for months.'
      : lit === 0
        ? 'Wet only in the dark, the lichen wakes and breathes but cannot make sugar, so it ends the day poorer than it began.'
        : net > 0
          ? `Wet in daylight, its algae make more sugar than the partners burn, and it gains. The morning after a damp night is a lichen's best time.`
          : 'Wet in daylight for too short a time, or mostly in the dark: what the algae make does not cover the cost of being awake.';
    if (sawLoss && sawGain) t.done();
  };
  const fs = slider('Wet from', 0, 23, 1, from, (v) => `${v}:00`, (v) => { from = v; paint(); }, 'water');
  const hs = slider('Hours wet', 0, 12, 1, hours, (v) => `${v}`, (v) => { hours = v; paint(); }, 'water');
  f.controls.append(fs.node, hs.node);
  const open = guessFirst(t, f, {
    ask: 'A shower at 8 in the evening wets a lichen for four hours, all in the dark. Over the day, does it gain carbon or lose it?',
    options: ['It loses', 'It gains', 'Neither'],
    answer: 0,
    sliders: [fs, hs],
    after: () => paint(),
  });
  paint();
  return f.node;
});
