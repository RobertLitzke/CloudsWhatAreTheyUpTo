// Lesson 11, soil in pots: a pot after watering and draining, with the
// saturated layer that perches at the bottom of its mix, for three mixes, any
// height of pot, and with or without a layer of gravel underneath.

import { el, svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { drained, MIX_IDS, MIXES, waterAt } from '../../core/pots';
import { choices, COL, figure, frame, slider } from './kit';

const f1 = (n: number) => n.toFixed(1);

/** An opaque blend from paper (0) to water blue (1), so stacked slices show no seams. */
function wetness(share: number): string {
  const a = [0xfb, 0xf7, 0xec];
  const b = [0x3a, 0x7f, 0xb4];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * share)).join(', ')})`;
}

/** A pot in cross-section, shaded by how much of its pore space holds water at each height. */
export const potFigure = figure(['air'], (_ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  let mixAt = 0;
  let height = 15;
  let gravel = 0;

  const paint = () => {
    const id = MIX_IDS[mixAt];
    const mix = MIXES[id];
    const d = drained(id, height, gravel);
    // The pot: 40 cm drawn 200 units tall, standing on the ground at y = 226.
    const cm = 5;
    const base = 226;
    const cx = 120;
    const bottomW = 90;
    const topW = 90 + height * 1.6;
    const ytop = base - height * cm;
    const shapes: SVGElement[] = [];
    // The mix, as one shape shaded from the bottom up by its water: full blue where saturated, paler where air has come in.
    const yMixTop = base - height * cm;
    const yMixBase = base - gravel * cm;
    const stops: SVGElement[] = [];
    for (let i = 0; i <= 40; i++) {
      const z = (i / 40) * d.depth;
      stops.push(svg('stop', { offset: f1((i / 40) * 100) + '%', 'stop-color': z <= mix.perched ? COL.water : wetness(0.1 + (0.55 * waterAt(mix, z)) / mix.pores) }));
    }
    const at = (y: number) => bottomW + (topW - bottomW) * ((base - y) / (height * cm));
    shapes.push(
      svg('defs', {}, svg('linearGradient', { id: 'pot-wet', gradientUnits: 'userSpaceOnUse', x1: 0, y1: yMixBase, x2: 0, y2: yMixTop }, ...stops)),
      svg('path', { d: `M${f1(cx - at(yMixBase) / 2)},${f1(yMixBase)} L${f1(cx - topW / 2)},${f1(yMixTop)} H${f1(cx + topW / 2)} L${f1(cx + at(yMixBase) / 2)},${f1(yMixBase)} z`, fill: 'url(#pot-wet)' }),
    );
    if (gravel > 0) {
      for (let z = 0.4; z < gravel; z += 0.8) {
        const w = bottomW + (topW - bottomW) * (z / height);
        const n = Math.round(w / 9);
        for (let k = 0; k < n; k++) shapes.push(svg('circle', { cx: f1(cx - w / 2 + 5 + (k * (w - 10)) / (n - 1)), cy: f1(base - z * cm), r: 2.6, fill: '#9a9486', stroke: '#6f6a5e', 'stroke-width': 0.6 }));
      }
    }
    shapes.push(svg('path', { d: `M${f1(cx - topW / 2 - 4)},${f1(ytop)} L${f1(cx - bottomW / 2)},${base} H${f1(cx + bottomW / 2)} L${f1(cx + topW / 2 + 4)},${f1(ytop)}`, fill: 'none', stroke: COL.clay, 'stroke-width': 5, 'stroke-linejoin': 'round' }));
    // The perched layer, labelled at its top.
    const wetTop = base - (gravel + Math.min(mix.perched, d.depth)) * cm;
    const lx = 250;
    shapes.push(
      svg('line', { x1: f1(cx + topW / 2 + 8), y1: f1(wetTop), x2: lx - 6, y2: f1(wetTop), stroke: COL.water, 'stroke-dasharray': '4 3' }),
      label(lx, wetTop - 2, 'top of the perched water', { fill: COL.water, bold: true }),
      small(lx, wetTop + 12, `${f1(Math.min(mix.perched, d.depth))} cm of saturated mix`, { fill: COL.water }),
      label(lx, 30, `${height} cm pot`, { bold: true }),
      small(lx, 44, `${Math.round(d.air * 100)}% of the mix is air`, { bold: true }),
    );
    if (gravel > 0) shapes.push(small(lx, base - gravel * cm / 2 + 3, `${gravel} cm of gravel`, { soft: true }));
    shapes.push(svg('line', { x1: 0, y1: base, x2: W, y2: base, stroke: COL.soft }));
    redraw(g, ...shapes);
    const wet = Math.round(d.soaked * 100);
    f.readout.textContent = d.soaked >= 1
      ? `${mix.name} in this pot holds water ${mix.perched} cm up from its base, so after watering the whole ${d.depth} cm of mix stays saturated and the roots have no air at all.`
      : `${mix.name} holds a saturated layer ${mix.perched} cm deep at the bottom of the mix, which is ${wet}% of this pot's ${d.depth} cm of mix. Above it, air fills ${Math.round(d.air * 100)}% of the mix on average.${gravel ? ' The gravel does not drain the mix any better, because the wet layer simply forms on top of it instead of on the bottom of the pot.' : ''}`;
    if (t.goal === 'air' && d.air >= 0.15) t.done();
  };

  const mixes = choices(MIX_IDS.map((m) => MIXES[m].name), (i) => { mixAt = i; paint(); });
  const layer = choices(['No gravel', '5 cm of gravel underneath'], (i) => { gravel = i ? 5 : 0; paint(); });
  mixes.node.prepend(el('span.chip-label', {}, 'Mix:'));
  f.controls.append(
    mixes.node,
    slider('Pot height', 10, 40, 5, height, (v) => `${v} cm`, (v) => { height = v; paint(); }, 'clay').node,
    layer.node,
  );
  mixes.pick(0);
  layer.pick(0);
  return f.node;
});
