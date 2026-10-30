// Lesson 2, where water and air live: what the pores of a soil hold once it
// has drained, rain soaking in or pooling, and a bed drying out in summer.

import { el, svg } from 'didactics/dom';
import { label, redraw, small, still } from 'didactics/draw';
import { mixOf, type Mix } from '../../core/soil';
import { available, availableMm, daysOfWater, hydraulics, storm } from '../../core/water';
import { COL, figure, frame, slider, tint } from './kit';

const f1 = (n: number) => n.toFixed(1);

/** The three soils the chips offer. */
const SOILS: { name: string; mix: Mix }[] = [
  { name: 'Sandy', mix: mixOf(85, 5) },
  { name: 'Loam', mix: mixOf(40, 20) },
  { name: 'Clay', mix: mixOf(25, 50) },
];

/** A row of chips, one picked, that calls `onPick` with the index. */
function chipRow(names: string[], at: number, onPick: (i: number) => void): HTMLElement {
  const chips = names.map((n, i) => el('button.chip', { type: 'button', className: i === at ? 'chip on' : 'chip', onclick: () => {
    chips.forEach((c, k) => c.classList.toggle('on', k === i));
    onPick(i);
  } }, n));
  return el('div.chips', {}, chips);
}

/** A seedling standing at (x, y), its leaves drooping by `droop` (0 fresh to 1 wilted). */
export function plant(x: number, y: number, droop: number, scale = 1): SVGElement {
  const g = svg('g', { transform: `translate(${x} ${y}) scale(${scale})` });
  const lean = droop * 18;
  g.append(svg('path', { d: `M0,0 q${f1(lean / 3)},-24 ${f1(lean)},-46`, stroke: COL.leaf, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }));
  const leaf = (side: number, h: number) => {
    const tipX = side * 22;
    const tipY = -h + droop * 22;
    return svg('path', { d: `M${f1(lean * (h / 46))},${-h} q${f1(tipX / 2)},${f1(-10 + droop * 12)} ${f1(tipX)},${f1(tipY + h)} q${f1(-tipX / 2)},${f1(6)} ${f1(-tipX)},${f1(-(tipY + h))} z`, fill: droop > 0.6 ? '#a9a85a' : COL.leaf });
  };
  g.append(leaf(-1, 20), leaf(1, 30), leaf(-1, 40), leaf(1, 46));
  return g;
}

// ---- What the pores hold ---------------------------------------------------------

/**
 * A 30 cm column of root zone in each of the three soils, as one bar each:
 * solid grains, water held too tightly for roots, water a plant can use, and
 * the big pores that drain and fill with air. Texture can't be changed, so
 * the one control is what a gardener can change: organic matter.
 */
export const poresFigure = figure(['more'], (_ctx, t) => {
  const W = 400;
  const H = 262;
  const f = frame(W, H, 3);
  const g = svg('g');
  const PARTS = [
    { name: 'solid grains', fill: COL.mineral, text: COL.mineral },
    { name: 'water held too tight', fill: tint(COL.water, 0.45), text: COL.water },
    { name: 'water a plant can use', fill: COL.water, text: COL.water },
    { name: 'drains, then holds air', fill: COL.airPale, text: '#3f7f97' },
  ];
  // The key, two by two along the top.
  const key = svg('g', {}, ...PARTS.flatMap((p, i) => {
    const x = 20 + (i % 2) * 190;
    const y = 16 + Math.floor(i / 2) * 16;
    return [svg('rect', { x, y: y - 9, width: 11, height: 11, rx: 2, fill: p.fill, stroke: COL.grid }), small(x + 16, y, p.name, { fill: p.text, bold: i === 2 })];
  }));
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), key, g);
  let om = 1;
  const paint = () => {
    const shapes: SVGElement[] = [];
    const by = 48;
    const bh = 150;
    const bw = 64;
    const results = SOILS.map((soil, i) => {
      const h = hydraulics(soil.mix, om);
      const shares = [1 - h.saturated, h.wilt, available(h), h.saturated - h.field];
      const bx = 36 + i * 128;
      let y = by + bh;
      shares.forEach((share, k) => {
        const ph = bh * share;
        y -= ph;
        shapes.push(svg('rect', { x: bx, y: f1(y), width: bw, height: f1(ph), fill: PARTS[k].fill }));
      });
      shapes.push(svg('rect', { x: bx, y: by, width: bw, height: bh, fill: 'none', stroke: COL.ink, 'stroke-width': 1.5 }));
      const mm = availableMm(h, 300);
      shapes.push(
        label(bx + bw / 2, by + bh + 16, soil.name, { anchor: 'middle', bold: true }),
        small(bx + bw / 2, by + bh + 30, `${Math.round(mm)} mm to drink`, { anchor: 'middle', fill: COL.water, bold: true }),
        small(bx + bw / 2, by + bh + 43, `drains ${h.ksat < 10 ? h.ksat.toFixed(1) : Math.round(h.ksat)} mm/h`, { anchor: 'middle', soft: true }),
      );
      return { mm, ksat: h.ksat };
    });
    redraw(g, ...shapes);
    const [sandy, , clay] = results;
    f.readout.textContent = om <= 1
      ? `Three soils, 30 cm deep, with little organic matter. The sandy bed stores ${Math.round(sandy.mm)} mm of usable water (roughly ${Math.round(sandy.mm / 5)} hot summer days), while the clay bed drains at under a millimetre an hour.`
      : `At ${om}% organic matter, the sandy bed stores ${Math.round(sandy.mm)} mm of usable water and the clay bed drains at ${clay.ksat.toFixed(1)} mm an hour, shoring up each soil's weak spot.`;
    if (t.goal === 'more' && om >= 5) t.done();
  };
  f.controls.append(slider('Organic matter', 1, 8, 0.5, om, (v) => `${v}%`, (v) => { om = v; paint(); }, 'organic').node);
  paint();
  return f.node;
});

// ---- Rain ---------------------------------------------------------------------

/** An hour of rain on a bed: how deep it soaks, and how much pools on top and runs off. */
export const rainFigure = figure(['puddle'], (_ctx, t) => {
  const W = 400;
  const H = 236;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  let soil = 0;
  let rate = 10;
  const paint = () => {
    const h = hydraulics(SOILS[soil].mix, 3);
    const s = storm(h, rate, 1);
    const top = 70;
    const depth = 140; // drawing units for 300 mm of soil
    const front = Math.min(depth, (s.front / 300) * depth);
    const shapes: SVGElement[] = [];
    // Rain.
    for (let i = 0; i < Math.round(rate / 2); i++) {
      const x = 20 + ((i * 53) % 360);
      const y = 10 + ((i * 29) % 40);
      shapes.push(svg('line', { x1: x, y1: y, x2: x - 3, y2: y + 9, stroke: COL.water, 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
    }
    shapes.push(svg('rect', { x: 20, y: top, width: 360, height: depth, fill: tint(COL.soil, 0.75) }));
    shapes.push(svg('rect', { x: 20, y: top, width: 360, height: f1(front), fill: tint(COL.water, 0.5) }));
    shapes.push(svg('line', { x1: 20, y1: f1(top + front), x2: 380, y2: f1(top + front), stroke: COL.water, 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
    shapes.push(small(376, top + front - 5, `wet to ${Math.round(s.front / 10)} cm`, { anchor: 'end', fill: '#fff', bold: true }));
    // A puddle, as deep as what pooled, and an arrow for runoff.
    if (s.pooled > 0.5) {
      const ph = Math.min(18, 2 + s.pooled / 2);
      shapes.push(svg('path', { d: `M60,${top} q120,${-ph * 2} 280,0 z`, fill: COL.water, opacity: 0.85 }));
      shapes.push(label(200, top - ph - 6, `${Math.round(s.pooled)} mm pooled or ran off`, { anchor: 'middle', bold: true, fill: COL.water }));
    }
    shapes.push(small(24, top + depth + 14, '30 cm', { soft: true }));
    redraw(g, ...shapes);
    f.readout.textContent = s.pooled > 0.5
      ? `${SOILS[soil].name}: rain fell faster than the pores could take it in. Out of ${rate} mm, ${Math.round(s.soaked)} mm soaked in while ${Math.round(s.pooled)} mm pooled on top or ran off.`
      : `${SOILS[soil].name}: all ${rate} mm of the hour's rain soaked in, wetting the bed ${Math.round(s.front / 10)} cm deep.`;
    if (t.goal === 'puddle' && s.pooled > 0.5) t.done();
  };
  f.controls.append(
    chipRow(SOILS.map((s) => s.name), soil, (i) => { soil = i; paint(); }),
    slider('Rain', 2, 60, 1, rate, (v) => `${v} mm/h`, (v) => { rate = v; paint(); }, 'water').node,
  );
  paint();
  return f.node;
});

// ---- Drying out ---------------------------------------------------------------

/**
 * Three beds soaked once and then drunk at 5 mm a day on a warm summer week:
 * the water a crop can still use in each, falling to nothing on the day it wilts.
 */
export function dryingDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 220;
  const s = still(W, H);
  const x0 = 44;
  const x1 = 380;
  const y0 = 20;
  const y1 = 180;
  const X = (d: number) => x0 + (d / 14) * (x1 - x0);
  const Y = (mm: number) => y1 - (mm / 50) * (y1 - y0);
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }));
  for (const mm of [0, 10, 20, 30, 40, 50]) {
    s.svg.append(svg('line', { x1: x0, y1: Y(mm), x2: x1, y2: Y(mm), stroke: COL.grid }), small(x0 - 5, Y(mm) + 3, String(mm), { anchor: 'end', soft: true }));
  }
  for (let d = 0; d <= 14; d += 2) s.svg.append(small(X(d), y1 + 14, String(d), { anchor: 'middle', soft: true }));
  s.svg.append(
    small(x1, y1 + 28, 'days without rain', { anchor: 'end', soft: true }),
    small(x0 - 36, y1 + 28, 'runs dry on', { soft: true }),
    small(x0 - 36, y0 - 6, 'mm a plant can still use', { soft: true }),
  );
  const ink: Record<string, string> = { Sandy: COL.sand, Loam: COL.leaf, Clay: COL.clay };
  // Each line named where it starts, and the day it runs dry under its dot.
  for (const soil of SOILS) {
    const h = hydraulics(soil.mix, 3);
    const mm = availableMm(h, 300);
    const last = daysOfWater(h, 300, 5);
    const c = ink[soil.name];
    s.svg.append(
      svg('path', { d: `M${X(0)},${f1(Y(mm))} L${f1(X(last))},${Y(0)}`, stroke: c, 'stroke-width': 2.5, fill: 'none' }),
      svg('circle', { cx: f1(X(last)), cy: Y(0), r: 4, fill: c }),
      // Clay's name goes under its line, clear of the loam's just above.
      label(X(0) + 6, soil.name === 'Clay' ? Y(mm) + 18 : Y(mm) - 6, soil.name, { fill: c, bold: true }),
      small(X(last), y1 + 28, `day ${Math.round(last)}`, { anchor: 'middle', fill: c, bold: true }),
    );
  }
  return { node: s.node };
}
