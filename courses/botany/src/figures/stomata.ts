// Lesson 7, The pores on old herbarium sheets: a stoma trading water for
// carbon dioxide, and Woodward's falling pore counts.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, slider, wrapped } from './kit';

const W = 400;

export interface Weather {
  /** 0 dark to 1 full sun. */
  light: number;
  /** 0 cool, humid air to 1 hot, very dry air. */
  dryAir: number;
  /** 0 dry to 1 wet soil. */
  soil: number;
  /** Carbon dioxide outside, ppm. */
  co2: number;
}

/** How open the pore is (0 to 1), and the water lost per carbon dioxide gained. */
export function stoma(w: Weather) {
  const open = Math.max(0.03, (0.1 + 0.9 * w.light) * Math.min(1, w.soil * 1.6) * (1 - 0.6 * w.dryAir) * Math.min(1.3, Math.sqrt(400 / w.co2)));
  // Water vapour: the leaf's inside is saturated (2.3% at 20 °C, more on a hot day); outside air holds less the drier it is.
  const vapourGap = 2.3 + 2 * w.dryAir - (1.8 - 1.4 * w.dryAir);
  // Carbon dioxide: inside the leaf it is drawn down to about 65% of outside, in light.
  const co2Gap = (w.co2 / 1e4) * (w.light > 0.05 ? 0.35 : 0.01);
  const ratio = (1.6 * vapourGap) / co2Gap;
  return { open, water: open * 1.6 * vapourGap, carbon: open * co2Gap * 40, ratio };
}

export const stomaFigure = figure(['trade'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const w: Weather = { light: 0.8, dryAir: 0.3, soil: 0.8, co2: 400 };
  const paint = () => {
    const s = stoma(w);
    const cx = 110;
    const cy = 110;
    const gap = 3 + s.open * 22;
    const guard = (side: number) => svg('ellipse', { cx: cx + side * (gap / 2 + 18), cy, rx: 20, ry: 62, fill: '#9cc77e', stroke: COL.leaf, 'stroke-width': 2 });
    const rng = makeRng(1987);
    const arrows: SVGElement[] = [];
    const nOut = Math.round(Math.min(12, s.water * 6));
    const nIn = Math.round(Math.min(6, s.carbon * 3));
    for (let i = 0; i < nOut; i++) arrows.push(svg('circle', { cx: cx + (rng() - 0.5) * gap * 0.8, cy: cy - 60 - rng() * 22, r: 2.5, fill: COL.water }));
    for (let i = 0; i < nIn; i++) arrows.push(svg('circle', { cx: cx + (rng() - 0.5) * gap * 0.8, cy: cy + 60 + rng() * 22, r: 3.5, fill: COL.co2 }));
    redraw(g,
      svg('rect', { x: 20, y: 20, width: 180, height: 180, fill: '#dbe9cc', rx: 8 }),
      svg('ellipse', { cx, cy, rx: gap / 2, ry: 52, fill: '#3b4a33' }),
      guard(-1), guard(1),
      ...arrows,
      small(cx, 16, `water vapour out`, { anchor: 'middle', fill: COL.water, bold: true }),
      small(cx, 214, `carbon dioxide in`, { anchor: 'middle', fill: COL.co2, bold: true }),
      label(220, 40, 'Pore', { bold: true }),
      label(380, 40, s.open > 0.6 ? 'open' : s.open > 0.25 ? 'half shut' : 'nearly shut', { anchor: 'end', bold: true, fill: s.open > 0.6 ? COL.leaf : COL.sugar }),
      label(220, 80, 'Water lost for each', { bold: true }),
      label(220, 96, 'CO₂ molecule gained', { bold: true }),
      label(380, 130, w.light > 0.05 ? `${Math.round(s.ratio)}` : '–', { anchor: 'end', bold: true, fill: COL.water, attrs: { style: 'font-size: 30px' } }),
      ...wrapped(220, 160, 'Both gases use the same hole; water has more to lose and moves faster. A model.', 28, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = w.light <= 0.05
      ? 'In the dark there is no sugar to make, so the guard cells close the pore and the leaf loses little water.'
      : w.soil < 0.4
        ? 'Dry soil: the roots signal the leaf, and the pore closes to save water, even though that starves the leaf of carbon dioxide.'
        : `The leaf loses about ${Math.round(s.ratio)} molecules of water for every molecule of carbon dioxide it gains${w.dryAir > 0.6 ? '. In dry air the pore narrows, but every molecule of carbon dioxide still costs more water' : ''}.`;
    if (w.light > 0.05 && s.ratio >= 300) t.done();
  };
  const l = slider('Light', 0, 1, 0.05, w.light, (v) => `${Math.round(v * 100)}%`, (v) => { w.light = v; paint(); }, 'light');
  const d = slider('Hot, dry air', 0, 1, 0.05, w.dryAir, (v) => `${Math.round(v * 100)}%`, (v) => { w.dryAir = v; paint(); }, 'heat');
  const s = slider('Soil water', 0, 1, 0.05, w.soil, (v) => `${Math.round(v * 100)}%`, (v) => { w.soil = v; paint(); }, 'water');
  const c = slider('CO₂ outside', 200, 800, 10, w.co2, (v) => `${v} ppm`, (v) => { w.co2 = v; paint(); }, 'co2');
  f.controls.append(l.node, d.node, s.node, c.node);
  const open = guessFirst(t, f, {
    ask: 'The air turns hot and very dry. Does the leaf open its pores wider to get more carbon dioxide, or close them?',
    options: ['Opens them wider', 'Closes them partly', 'Leaves them as they are'],
    answer: 1,
    reveal: 'done',
    sliders: [l, d, s, c],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Woodward's counts ---------------------------------------------------------------------------

export const woodwardStill = () => {
  const s = still(W, 220);
  const patch = (x: number, n: number, seed: number) => {
    const rng = makeRng(seed);
    const out: SVGElement[] = [svg('rect', { x, y: 40, width: 150, height: 110, fill: '#dbe9cc', rx: 6 })];
    for (let i = 0; i < n; i++) {
      const px = x + 10 + rng() * 130;
      const py = 50 + rng() * 90;
      out.push(svg('ellipse', { cx: px, cy: py, rx: 3.2, ry: 5, fill: '#9cc77e', stroke: COL.leaf, 'stroke-width': 0.8 }), line(px, py - 3, px, py + 3, '#3b4a33', 0.8));
    }
    return out;
  };
  s.svg.append(
    svg('rect', { width: W, height: 220, fill: COL.paper }),
    label(30, 26, 'Herbarium leaves, about 200 years old', { bold: true, size: 'small' }),
    label(220, 26, 'The same species, 1980s', { bold: true, size: 'small' }),
    ...patch(30, 40, 1),
    ...patch(220, 24, 2),
    small(105, 168, 'Pores: 100%', { anchor: 'middle', bold: true }),
    small(295, 168, 'Pores: about 60%', { anchor: 'middle', bold: true }),
    small(105, 184, 'CO₂ about 280 ppm', { anchor: 'middle', fill: COL.co2 }),
    small(295, 184, 'CO₂ about 340 ppm', { anchor: 'middle', fill: COL.co2 }),
    small(200, 210, 'Pores per area of leaf, average of eight tree species, after Woodward (1987).', { anchor: 'middle', soft: true }),
  );
  return { node: s.node };
};
