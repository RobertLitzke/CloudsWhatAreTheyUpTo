// Branch N2, Gophers on the pumice: plots of bare pumice after the 1980
// eruption, with or without a day of gopher digging, and the plants that
// take hold in the years after.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { figure, frame, guessFirst, player, slider } from './kit';

const W = 400;

/** Mounds a day of gopher digging leaves in a plot, at fixed spots (x, y in a 0..1 square). */
export const MOUNDS: readonly [number, number][] = [[0.22, 0.3], [0.62, 0.22], [0.4, 0.68], [0.78, 0.7]];

/** Fixed candidate spots for seedlings. */
const SPOTS: readonly [number, number][] = Array.from({ length: 140 }, (_, i) => [((i * 0.618034) % 1), ((i * 0.381966 * 1.7 + 0.13) % 1)] as [number, number]);

/**
 * Plants established in a plot after `years`. A seedling needs a root fungus
 * to survive the bare pumice, except the lupines, which fix their own
 * nitrogen. Fungal spores come up with soil in gopher mounds and spread a
 * little each year from plants that already have them.
 */
export function plants(years: number, gophers: boolean): { fungal: number; lupines: number; spots: { x: number; y: number; kind: 'fungal' | 'lupine' }[] } {
  const reach = gophers ? 0.08 + 0.035 * years : 0;
  const spots: { x: number; y: number; kind: 'fungal' | 'lupine' }[] = [];
  SPOTS.forEach(([x, y], i) => {
    const near = MOUNDS.some(([mx, my]) => Math.hypot(x - mx, y - my) < reach);
    if (near && i % 3 !== 0 && years >= 1) spots.push({ x, y, kind: 'fungal' });
    else if (i % 17 === 0 && years >= 2) spots.push({ x, y, kind: 'lupine' });
  });
  return { fungal: spots.filter((s) => s.kind === 'fungal').length, lupines: spots.filter((s) => s.kind === 'lupine').length, spots };
}

export const pumiceFigure = figure(['years'], (ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let years = 0;
  const plot = (x0: number, gophers: boolean): SVGElement[] => {
    const size = 150;
    const p = plants(years, gophers);
    const out: SVGElement[] = [svg('rect', { x: x0, y: 30, width: size, height: size, fill: '#d9d2c3', rx: 4 })];
    if (gophers) for (const [mx, my] of MOUNDS) out.push(svg('ellipse', { cx: x0 + mx * size, cy: 30 + my * size, rx: 10, ry: 7, fill: '#6e5a3e' }));
    for (const s of p.spots) {
      const cx = x0 + s.x * size;
      const cy = 30 + s.y * size;
      out.push(s.kind === 'lupine' ? svg('circle', { cx, cy, r: 3.4, fill: '#7a6ac0' }) : svg('path', { d: `M${cx},${cy + 3} l-3,-6 l3,2 l3,-2 z`, fill: '#4f8a3a' }));
    }
    out.push(small(x0 + size / 2, 22, gophers ? 'one day of gophers, 1982' : 'no gophers', { anchor: 'middle', bold: true }), small(x0 + size / 2, 194, `${p.fungal + p.lupines} plants`, { anchor: 'middle' }));
    return out;
  };
  const paint = () => {
    redraw(g, ...plot(30, true), ...plot(220, false));
    if (!open()) return;
    f.readout.textContent = years === 0
      ? 'Two plots of bare pumice, the year after the eruption. In one, gophers were let dig for a single day; their mounds (brown) bring up old soil.'
      : years < 3
        ? 'Seeds blow onto both plots alike. Only near the mounds do seedlings find root fungi, and only those survive, along with a few lupines (purple), which need none.'
        : `Year ${years}: the plants around the mounds spread their fungi outward, and more seedlings take hold. The plot without gophers still has only scattered lupines.`;
    if (years >= 6) t.done();
  };
  const ys = slider('Years after the gophers', 0, 10, 1, years, (v) => `${v}`, (v) => { years = v; paint(); }, 'leaf');
  const play = player(ys, ctx, { seconds: 6 });
  f.controls.append(play.node, ys.node);
  const open = guessFirst(t, f, {
    ask: 'Seeds blow onto bare volcanic pumice. What stops most seedlings from surviving?',
    options: ['No root fungi in the pumice', 'Too much sunlight', 'Animals eat them all'],
    answer: 0,
    sliders: [ys],
    after: () => paint(),
  });
  paint();
  return f.node;
});
