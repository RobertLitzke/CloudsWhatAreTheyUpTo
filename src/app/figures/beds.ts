// Lesson 10, raised beds: a freshly filled bed in cross-section and how far its
// surface sinks over three years, from the share of compost in the mix and
// the logs and branches buried under it.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sunk, type Fill } from '../../core/beds';
import { COL, figure, frame, slider, tint } from './kit';

const f1 = (n: number) => n.toFixed(1);

/** A 30 cm bed, its fill drawn as it went in, with a line where the surface sits after each of three years. */
export const settleFigure = figure(['firm'], (_ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  const fill: Fill = { depth: 30, compost: 1, wood: 0 };

  const paint = () => {
    // The bed: 30 cm drawn 150 units deep, its boards 6 cm proud of the fill.
    const bx = 40;
    const bw = 220;
    const top = 40;
    const cm = 5;
    const floor = top + 6 * cm + fill.depth * cm;
    const rim = top + 6 * cm;
    const woodTop = floor - fill.depth * fill.wood * cm;
    const shapes: SVGElement[] = [
      svg('rect', { x: 0, y: floor, width: W, height: H - floor, fill: tint(COL.soil, 0.55) }),
      svg('rect', { x: bx, y: f1(rim), width: bw, height: f1(woodTop - rim), fill: fill.compost > 0.5 ? COL.organic : tint(COL.soil, 0.8 + 0.2 * fill.compost) }),
    ];
    if (fill.wood > 0) {
      shapes.push(svg('rect', { x: bx, y: f1(woodTop), width: bw, height: f1(floor - woodTop), fill: '#8a6440' }));
      for (let x = bx + 18; x < bx + bw - 10; x += 34) shapes.push(svg('circle', { cx: x, cy: f1((woodTop + floor) / 2), r: f1(Math.min(14, (floor - woodTop) / 2 - 2)), fill: '#c49a6c', stroke: '#6b4a2a' }));
    }
    shapes.push(
      svg('rect', { x: bx - 10, y: top, width: 10, height: floor - top, fill: '#a07a4f', stroke: '#7a5a38' }),
      svg('rect', { x: bx + bw, y: top, width: 10, height: floor - top, fill: '#a07a4f', stroke: '#7a5a38' }),
      label(bx + bw / 2, rim - 6, 'filled to here', { anchor: 'middle', soft: true }),
    );
    const drops = [1, 2, 3].map((y) => sunk(fill, y));
    drops.forEach((d, i) => {
      const y = rim + d * cm;
      shapes.push(
        svg('line', { x1: bx, y1: f1(y), x2: bx + bw, y2: f1(y), stroke: COL.paper, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }),
        small(bx + bw + 18, y + 3, `year ${i + 1}: down ${f1(d)} cm`, { bold: i === 0 }),
      );
    });
    redraw(g, ...shapes);
    const first = drops[0];
    f.readout.textContent = `A 30 cm bed filled with ${Math.round(fill.compost * 100)}% compost${fill.wood ? ` over ${Math.round(fill.wood * 100)}% buried wood` : ''} sinks ${f1(first)} cm in its first year and ${f1(drops[2])} cm by the end of its third.` +
      (fill.wood ? ' The logs rot from the inside and the soil above falls into the gaps, so the bed keeps sinking for years.' : first > 6 ? ' Soil life eats compost every year, so a bed made mostly of compost keeps shrinking.' : ' Mineral topsoil does not rot, so after the first season this bed barely moves.');
    if (t.goal === 'firm' && first < 5) t.done();
  };

  f.controls.append(
    slider('Compost in the mix', 0, 100, 10, 100, (v) => `${v}%, the rest topsoil`, (v) => { fill.compost = v / 100; paint(); }, 'organic').node,
    slider('Logs and branches underneath', 0, 50, 10, 0, (v) => (v ? `${v}% of the depth` : 'none'), (v) => { fill.wood = v / 100; paint(); }, 'mineral').node,
  );
  paint();
  return f.node;
});
