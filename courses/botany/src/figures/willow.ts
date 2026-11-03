// Lesson 1, The willow in the tub: van Helmont's five years, a dry log taken
// apart by where each part came from, and a plant in a sealed bell jar.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, player, slider, toggles, wrapped } from './kit';

const W = 400;

/** Van Helmont's numbers, in pounds: the willow and the dried soil, at the start and after five years. */
export const HELMONT = { willow: [5, 169.2], soil: [200, 199.875] } as const;

/** What a fresh willow is: about half water held in it; the dry half is carbon, oxygen and hydrogen, with a pinch of minerals. */
export const FRESH = [
  { what: 'water held in the wood and leaves', share: 0.5, from: 'water', color: COL.water },
  { what: 'carbon and oxygen, from carbon dioxide', share: 0.465, from: 'air', color: COL.co2 },
  { what: 'hydrogen, from water', share: 0.03, from: 'water', color: COL.water },
  { what: 'minerals', share: 0.005, from: 'soil', color: COL.soil },
] as const;

const lb = (v: number) => `${v.toFixed(v < 10 ? 1 : 0)} lb`;

export const tubFigure = figure(['split'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let year = 0;
  let dried = false;
  const paint = () => {
    const k = year / 5;
    const willow = HELMONT.willow[0] + (HELMONT.willow[1] - HELMONT.willow[0]) * k ** 1.6;
    const soil = HELMONT.soil[0] - (HELMONT.soil[0] - HELMONT.soil[1]) * k;
    // The tub and the tree, the tree growing with its weight.
    const h = 30 + 92 * Math.sqrt(willow / HELMONT.willow[1]);
    const crown = 10 + 36 * Math.sqrt(willow / HELMONT.willow[1]);
    const tub = [
      svg('path', { d: 'M40,170 L52,222 L148,222 L160,170 Z', fill: COL.wood }),
      svg('rect', { x: 40, y: 166, width: 120, height: 8, fill: COL.bark, rx: 2 }),
      svg('rect', { x: 50, y: 174, width: 100, height: 14, fill: COL.soil }),
      line(100, 174, 100, 174 - h, COL.bark, 3 + 4 * k),
      svg('ellipse', { cx: 100, cy: 174 - h, rx: crown, ry: crown * 0.8, fill: COL.leaf, opacity: 0.85 }),
      small(100, 234, `Year ${year}`, { anchor: 'middle', soft: true }),
    ];
    const bars: SVGElement[] = [];
    const bx = 190;
    const scale = (v: number) => (v / 200) * 190;
    bars.push(
      label(bx, 26, 'Willow', { bold: true }), small(bx + 190, 26, lb(willow), { anchor: 'end' }),
      label(bx, 92, 'Soil, dried', { bold: true }), small(bx + 190, 92, `${lb(soil)}${year > 0 ? `  (lost ${Math.round((HELMONT.soil[0] - soil) * 16 * 10) / 10} oz)` : ''}`, { anchor: 'end' }),
      svg('rect', { x: bx, y: 98, width: scale(soil), height: 18, fill: COL.soil, rx: 2 }),
    );
    if (dried && year === 5) {
      let x = bx;
      FRESH.forEach((p) => {
        const w = Math.max(1.5, scale(willow) * p.share);
        bars.push(svg('rect', { x, y: 32, width: w, height: 18, fill: p.color, opacity: p.from === 'water' && p.share < 0.1 ? 0.6 : 1 }));
        x += w;
      });
      FRESH.forEach((p, i) => bars.push(
        svg('rect', { x: bx, y: 132 + i * 18, width: 10, height: 10, fill: p.color, rx: 2 }),
        small(bx + 16, 141 + i * 18, `${Math.round(p.share * 1000) / 10}% ${p.what}`),
      ));
    } else {
      bars.push(svg('rect', { x: bx, y: 32, width: scale(willow), height: 18, fill: COL.leaf, rx: 2 }));
    }
    redraw(g, ...tub, ...bars);
    if (!open()) return;
    f.readout.textContent = year < 5
      ? `Year ${year}: the willow weighs ${lb(willow)}; the soil has hardly changed. Only rainwater has been added.`
      : dried
        ? 'Half of the fresh willow is water held in it. Nearly all the rest, the dry wood and leaves, is carbon and oxygen taken from carbon dioxide in the air. The soil gave about two ounces.'
        : `Five years: the willow weighs ${lb(willow)}, a gain of ${lb(willow - 5)}. The soil lost about two ounces. Now take the willow apart.`;
    if (year === 5 && dried) t.done();
  };
  const years = slider('Year', 0, 5, 1, 0, (v) => `${v}`, (v) => { year = v; paint(); }, 'leaf');
  const play = player(years, ctx, { seconds: 6 });
  const sw = toggles(['Take the willow apart'], [false], (on) => { dried = on[0]; if (dried) years.set(5); else paint(); });
  f.controls.append(play.node, years.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'Dry the five-year willow in an oven, so only solid wood and leaf are left. Where did most of that dry matter come from?',
    options: ['The soil', 'The rainwater', 'The air', 'Sunlight'],
    answer: 2,
    reveal: 'done',
    sliders: [years],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A dry log ---------------------------------------------------------------------------------

export const logStill = () => {
  const s = still(W, 200);
  const parts = [
    { name: 'Carbon', share: 0.5, from: 'from carbon dioxide in the air', color: COL.ink },
    { name: 'Oxygen', share: 0.43, from: 'from carbon dioxide in the air', color: COL.co2 },
    { name: 'Hydrogen', share: 0.06, from: 'from water', color: COL.water },
    { name: 'Minerals', share: 0.01, from: 'from the soil: the ash', color: COL.soil },
  ];
  const x0 = 30;
  const w = 340;
  let x = x0;
  const out: SVGElement[] = [svg('rect', { width: W, height: 200, fill: COL.paper }), label(x0, 24, 'One kilogram of dry wood, by the atoms in it', { bold: true })];
  parts.forEach((p, i) => {
    const pw = Math.max(4, w * p.share);
    out.push(svg('rect', { x, y: 40, width: pw, height: 54, fill: p.color, opacity: 0.85 }));
    if (i < 2) {
      out.push(label(x + pw / 2, 72, `${p.name} ${Math.round(p.share * 100)}%`, { anchor: 'middle', bold: true, fill: COL.paper }));
    }
    x += pw;
  });
  // The rings at the log's end.
  out.push(svg('ellipse', { cx: x0 + w, cy: 67, rx: 10, ry: 27, fill: '#d9b98a', stroke: COL.wood, 'stroke-width': 1.5 }));
  out.push(
    line(x0 + w * 0.965, 98, x0 + w * 0.965, 118, COL.water, 1), small(x0 + w * 0.965, 130, 'Hydrogen 6%', { anchor: 'end', fill: COL.water, bold: true }),
    line(x0 + w * 0.995, 98, x0 + w * 0.995, 140, COL.soil, 1), small(x0 + w * 0.995, 152, 'Minerals about 1%', { anchor: 'end', fill: COL.soil, bold: true }),
    line(x0, 108, x0 + w * 0.93, 108, COL.co2, 2), small(x0, 122, '93% from carbon dioxide in the air', { fill: COL.co2, bold: true }),
    ...wrapped(x0, 168, 'Burn the log and the carbon, oxygen and hydrogen go back to the air as carbon dioxide and water vapour. The minerals stay behind as ash.', 62, { soft: true }),
  );
  s.svg.append(...out);
  return { node: s.node };
};

// ---- A plant in a sealed jar ---------------------------------------------------------------------

/** Carbon dioxide in the jar (parts per million) and the plant's growth (grams), day by day, sealed or open. */
export function jar(sealed: boolean, days: number, openAfter = Infinity): { co2: number; grown: number }[] {
  let co2 = 420;
  let grown = 0;
  const out = [{ co2, grown }];
  for (let d = 1; d <= days; d++) {
    const shut = sealed && d <= openAfter;
    // Uptake slows as the gas thins, and stops near 50 ppm, where the leaf's own breathing gives back as much as it takes.
    const gain = Math.max(0, 0.6 * (co2 - 50) / 370);
    grown += gain;
    co2 = shut ? Math.max(50, co2 - gain * 210) : 420;
    out.push({ co2, grown });
  }
  return out;
}

export const bellJarFigure = figure(['stall'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let sealed = false;
  let day = 0;
  const DAYS = 20;
  const paint = () => {
    const run = jar(sealed, DAYS);
    const now = run[day];
    const ax = axes({ x: 200, y: 20, w: 180, h: 150, xmin: 0, xmax: DAYS, ymin: 0, ymax: 450, xticks: [0, 10, 20], yticks: [0, 200, 400], xlabel: 'days', ylabel: 'CO₂ in the jar, ppm', ink: COL.ink, grid: COL.grid });
    const plantH = 30 + now.grown * 9;
    redraw(g,
      // The jar, sealed or lifted.
      svg('path', { d: `M30,${sealed ? 190 : 150} L30,60 Q30,30 60,30 L120,30 Q150,30 150,60 L150,${sealed ? 190 : 150}`, fill: COL.o2, 'fill-opacity': 0.08, stroke: COL.o2, 'stroke-width': 2, transform: sealed ? '' : 'translate(0,-24)' }),
      svg('rect', { x: 20, y: 190, width: 140, height: 10, fill: COL.wood }),
      svg('rect', { x: 70, y: 170, width: 40, height: 20, fill: COL.soil }),
      line(90, 170, 90, 170 - plantH, COL.leaf, 2.5),
      ...[0.35, 0.6, 0.85].map((k, i) => svg('ellipse', { cx: 90 + (i % 2 ? 9 : -9), cy: 170 - plantH * k, rx: 9, ry: 4, fill: COL.leaf })),
      small(90, 214, sealed ? 'Sealed' : 'Open to the room', { anchor: 'middle', bold: true, fill: sealed ? COL.o2 : COL.soft }),
      ...ax.parts,
      line(ax.X(0), ax.Y(50), ax.X(DAYS), ax.Y(50), COL.heat, 1, { 'stroke-dasharray': '3 3' }),
      small(ax.X(DAYS), ax.Y(50) + 13, 'where taking in = giving out', { anchor: 'end', fill: COL.heat }),
      ax.path(run.slice(0, day + 1).map((r, i) => [i, r.co2] as const), COL.co2, 2.4),
    );
    const stalled = sealed && now.co2 < 70;
    f.readout.textContent = day === 0
      ? `A seedling ${sealed ? 'under a sealed glass jar' : 'in the open'}. Press Play.`
      : stalled
        ? `Day ${day}: the plant has used up nearly all the carbon dioxide it can reach. Growth has stopped, though it has light, water and soil.`
        : `Day ${day}: carbon dioxide at ${Math.round(now.co2)} parts per million; the plant has put on ${now.grown.toFixed(1)} g.`;
    if (stalled) t.done();
  };
  const days = slider('Day', 0, DAYS, 1, 0, (v) => `${v}`, (v) => { day = v; paint(); }, 'leaf');
  const play = player(days, ctx, { seconds: 6 });
  const sw = toggles(['Seal the jar'], [false], (on) => { sealed = on[0]; days.set(0); });
  f.controls.append(sw.node, play.node, days.node);
  paint();
  return f.node;
});
