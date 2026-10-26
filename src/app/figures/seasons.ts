// Lesson 7, building soil through the year: a wheel of the four seasons, each
// with something covering the bed (or nothing), and what five years of that
// does to its organic matter.

import { el, svg } from 'lesson-kit/dom';
import { label, polyline, redraw, small } from 'lesson-kit/draw';
import { COVER_IDS, COVERS, cover, project, SEASONS, type Cover, type Plan } from '../../core/seasons';
import { DISTURBANCE, type Disturbance } from '../../core/structure';
import { COL, figure, frame, tint } from './kit';

const f1 = (n: number) => n.toFixed(1);

const FILL: Record<Cover, string> = {
  bare: '#c9b28c',
  crop: COL.leaf,
  cover: '#3f7a3a',
  mulch: '#d9b65a',
  compost: COL.organic,
};

export const yearFigure = figure(['build'], (_ctx, t) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 3);
  const wheel = svg('g');
  const chart = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), wheel, chart);
  const plan: Plan = { autumn: 'bare', winter: 'bare', spring: 'bare', summer: 'crop' };
  let dig: Disturbance = 'dig';

  const paint = () => {
    // The wheel: four quarters, autumn at the top right, going round with the year.
    const cx = 92;
    const cy = 110;
    const R = 78;
    const parts: SVGElement[] = [];
    SEASONS.forEach((s, i) => {
      const a0 = -Math.PI / 2 + (i * Math.PI) / 2;
      const a1 = a0 + Math.PI / 2;
      const p = (a: number, r: number) => `${f1(cx + Math.cos(a) * r)},${f1(cy + Math.sin(a) * r)}`;
      const c = plan[s];
      const g = svg('g', { role: 'button', tabindex: 0, 'aria-label': `${s}: ${COVERS[c].name}. Tap to change.`, style: 'cursor: pointer' },
        svg('path', { d: `M${cx},${cy} L${p(a0, R)} A${R},${R} 0 0 1 ${p(a1, R)} Z`, fill: FILL[c], stroke: COL.paper, 'stroke-width': 3 }),
      );
      const am = (a0 + a1) / 2;
      const lx = cx + Math.cos(am) * R * 0.55;
      const ly = cy + Math.sin(am) * R * 0.55;
      const ink = c === 'bare' || c === 'mulch' ? COL.ink : '#fff';
      g.append(label(lx, ly - 2, s, { anchor: 'middle', bold: true, fill: ink }), small(lx, ly + 11, COVERS[c].name.toLowerCase(), { anchor: 'middle', fill: ink }));
      const next = () => {
        plan[s] = COVER_IDS[(COVER_IDS.indexOf(plan[s]) + 1) % COVER_IDS.length];
        paint();
      };
      g.addEventListener('click', next);
      g.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && next());
      parts.push(g);
    });
    redraw(wheel, ...parts);
    // Five years of organic matter.
    const om = project(plan, dig);
    const x0 = 210;
    const x1 = 385;
    const y0 = 30;
    const y1 = 180;
    const Y = (v: number) => y1 - ((v - 1.5) / 3.5) * (y1 - y0);
    const X = (i: number) => x0 + (i / 5) * (x1 - x0);
    const pts = om.map((v, i) => [X(i), Y(v)] as [number, number]);
    const up = om[5] >= om[0];
    redraw(chart,
      ...[2, 3, 4, 5].map((v) => svg('line', { x1: x0, y1: f1(Y(v)), x2: x1, y2: f1(Y(v)), stroke: COL.grid })),
      ...[2, 3, 4, 5].map((v) => small(x0 - 4, Y(v) + 3, `${v}%`, { anchor: 'end', soft: true })),
      ...[0, 1, 2, 3, 4, 5].map((i) => small(X(i), y1 + 14, i === 0 ? 'now' : `${i}`, { anchor: 'middle', soft: true })),
      small(x1, y1 + 26, 'years', { anchor: 'end', soft: true }),
      polyline(pts, up ? COL.organic : COL.clay, 2.5),
      ...pts.map(([x, y]) => svg('circle', { cx: f1(x), cy: f1(y), r: 3, fill: up ? COL.organic : COL.clay })),
      label(x0, 18, 'organic matter', { bold: true, fill: COL.organic }),
      svg('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: tint(COL.organic, 0.03) }),
    );
    const c = cover(plan);
    const delta = om[5] - om[0];
    f.readout.textContent = `Roots in the bed ${c.roots} season${c.roots === 1 ? '' : 's'} of four, covered ${c.covered}. In five years organic matter ${Math.abs(delta) < 0.05 ? 'holds steady' : delta > 0 ? `rises from ${om[0].toFixed(1)}% to ${om[5].toFixed(1)}%` : `falls from ${om[0].toFixed(1)}% to ${om[5].toFixed(1)}%`}.`;
    if (t.goal === 'build' && delta >= 0.5) t.done();
  };
  const digs = Object.keys(DISTURBANCE) as Disturbance[];
  const chips = digs.map((d) => el('button.chip', { type: 'button', className: d === dig ? 'chip on' : 'chip', onclick: () => {
    dig = d;
    chips.forEach((c, i) => c.classList.toggle('on', digs[i] === d));
    paint();
  } }, DISTURBANCE[d].name));
  f.controls.append(el('p.fig-hint', {}, 'Tap a season on the wheel to change what covers the bed.'), el('div.chips', {}, chips));
  paint();
  return f.node;
});
