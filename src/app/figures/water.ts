// Lesson 2, where water and air live: what the pores of a soil hold once it
// has drained, rain soaking in or pooling, and a bed drying out in summer.

import { el, svg } from 'lesson-kit/dom';
import { label, redraw, small } from 'lesson-kit/draw';
import { mixOf, textureOf, type Mix } from '../../core/soil';
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
 * A 30 cm column of root zone as one bar: solid grains, water held too tightly
 * for roots, water a plant can use, and the big pores that drain and fill with
 * air. Sliders for sand, clay and organic matter.
 */
export const poresFigure = figure(['balance'], (_ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  let sand = 85;
  let clay = 5;
  let om = 2;
  const paint = () => {
    const mix = mixOf(sand, clay);
    const h = hydraulics(mix, om);
    const bx = 40;
    const by = 20;
    const bw = 70;
    const bh = 190;
    const parts = [
      { name: 'solid grains', share: 1 - h.saturated, fill: COL.mineral, text: COL.mineral },
      { name: 'water held too tight for roots', share: h.wilt, fill: tint(COL.water, 0.45), text: COL.water },
      { name: 'water a plant can use', share: available(h), fill: COL.water, text: COL.water },
      { name: 'drains away, then holds air', share: h.saturated - h.field, fill: COL.airPale, text: '#3f7f97' },
    ];
    const shapes: SVGElement[] = [];
    let y = by + bh;
    // Labels sit beside their layer, nudged apart when layers are thin, with a tick to the layer.
    let lastLabel = Infinity;
    for (const p of parts) {
      const ph = bh * p.share;
      y -= ph;
      shapes.push(svg('rect', { x: bx, y: f1(y), width: bw, height: f1(ph), fill: p.fill }));
      const mid = y + ph / 2;
      const ly = Math.min(mid, lastLabel - 16);
      lastLabel = ly;
      shapes.push(svg('path', { d: `M${bx + bw + 2},${f1(mid)} L${bx + bw + 10},${f1(ly)}`, stroke: COL.soft, fill: 'none' }));
      shapes.push(label(bx + bw + 14, ly + 4, `${Math.round(p.share * 100)}% ${p.name}`, { fill: p.text, bold: p.name.startsWith('water a') }));
    }
    shapes.push(svg('rect', { x: bx, y: by, width: bw, height: bh, fill: 'none', stroke: COL.ink, 'stroke-width': 1.5 }));
    shapes.push(small(bx + bw / 2, by + bh + 14, '30 cm of bed', { anchor: 'middle', soft: true }));
    redraw(g, ...shapes);
    const mm = availableMm(h, 300);
    const days = daysOfWater(h, 300, 5);
    f.readout.textContent = `A ${textureOf(mix)}. Holds ${Math.round(mm)} mm a plant can use, about ${Math.round(days)} hot summer days; when soaked, water drains through at ${Math.round(h.ksat)} mm an hour.`;
    if (t.goal === 'balance' && mm >= 40 && h.ksat >= 10) t.done();
  };
  const sandS = slider('Sand', 0, 100, 1, sand, (v) => `${v}%`, (v) => {
    sand = v;
    if (sand + clay > 100) {
      clay = 100 - sand;
      claySet(clay);
    }
    paint();
  }, 'sand');
  const clayS = slider('Clay', 0, 60, 1, clay, (v) => `${v}%`, (v) => {
    clay = v;
    if (sand + clay > 100) {
      sand = 100 - clay;
      sandS.input.value = String(sand);
      sandS.node.querySelector('output')!.textContent = `${sand}%`;
    }
    paint();
  }, 'clay');
  const claySet = (v: number) => {
    clayS.input.value = String(v);
    clayS.node.querySelector('output')!.textContent = `${v}%`;
  };
  const omS = slider('Organic matter', 1, 8, 0.5, om, (v) => `${v}%`, (v) => { om = v; paint(); }, 'organic');
  f.controls.append(sandS.node, clayS.node, omS.node);
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
      ? `${SOILS[soil].name}: rain came faster than the soil could take it. Of ${rate} mm, ${Math.round(s.soaked)} soaked in and ${Math.round(s.pooled)} pooled on the top or ran off.`
      : `${SOILS[soil].name}: all ${rate} mm of the hour's rain soaked in, wetting the bed ${Math.round(s.front / 10)} cm down.`;
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

/** Days after a good soaking, on a warm summer week: how much water is left for a crop, and when it wilts. */
export const dryingFigure = figure(['wilt'], (_ctx, t) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  let day = 0;
  const paint = () => {
    const shapes: SVGElement[] = [];
    const wilted: string[] = [];
    SOILS.forEach((s, i) => {
      const h = hydraulics(s.mix, 3);
      const last = daysOfWater(h, 300, 5);
      const left = Math.max(0, 1 - day / last);
      const x = 70 + i * 130;
      const base = 150;
      // The tank of usable water, emptying.
      shapes.push(svg('rect', { x: x - 20, y: base - 70, width: 40, height: 70, fill: tint(COL.water, 0.1), stroke: COL.grid }));
      shapes.push(svg('rect', { x: x - 20, y: f1(base - 70 * left * Math.min(1, last / 10)), width: 40, height: f1(70 * left * Math.min(1, last / 10)), fill: COL.water }));
      shapes.push(plant(x + 36, base, left > 0.15 ? 0 : 1 - left / 0.15, 0.8));
      shapes.push(svg('line', { x1: x - 30, y1: base, x2: x + 60, y2: base, stroke: COL.soil, 'stroke-width': 3 }));
      shapes.push(label(x + 10, base + 22, s.name, { anchor: 'middle', bold: true }));
      shapes.push(small(x + 10, base + 36, `lasts ${Math.round(last)} days`, { anchor: 'middle', soft: true }));
      if (left === 0) wilted.push(s.name.toLowerCase());
    });
    redraw(g, ...shapes);
    f.readout.textContent = wilted.length === 0
      ? `Day ${day}. Every bed still has water a plant can reach.`
      : `Day ${day}. The ${wilted.join(' and the ')} bed${wilted.length > 1 ? 's have' : ' has'} run out: its plants wilt, though there is still water in the soil, held too tightly to pull out.`;
    if (t.goal === 'wilt' && wilted.length) t.done();
  };
  f.controls.append(slider('Days without rain', 0, 14, 1, 0, (v) => `${v}`, (v) => { day = v; paint(); }, 'water').node);
  paint();
  return f.node;
});
