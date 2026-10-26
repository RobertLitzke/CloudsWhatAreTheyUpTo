// Lesson 3, the living soil: how many live in a teaspoon, and the web of who
// eats whom, with each member to tap and to take out.

import { el, svg } from 'lesson-kit/dom';
import { arrow, label, redraw, small, still } from 'lesson-kit/draw';
import { DWELLERS, EATS, INFO, PEOPLE, sayCount, starves, TEASPOON, type Dweller } from '../../core/life';
import { COL, figure, frame, tint } from './kit';

const f1 = (n: number) => n.toFixed(1);

// ---- A teaspoon ---------------------------------------------------------------

/** Counts in a teaspoon on a log scale, from one to ten billion, against the number of people on Earth. */
export function teaspoonDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 200;
  const s = still(W, H);
  const x0 = 100;
  const x1 = 380;
  const X = (n: number) => x0 + ((x1 - x0) * Math.log10(Math.max(1, n))) / 10;
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }));
  for (let p = 0; p <= 10; p += 2) {
    s.svg.append(
      svg('line', { x1: f1(X(10 ** p)), y1: 18, x2: f1(X(10 ** p)), y2: 150, stroke: COL.grid }),
      small(X(10 ** p), 164, p === 0 ? '1' : p < 6 ? sayCount(10 ** p) : sayCount(10 ** p).replace(' ', ' '), { anchor: 'middle', soft: true }),
    );
  }
  const rows = TEASPOON.filter((r) => r.unit !== 'metres of thread');
  const colours: Record<string, string> = { bacteria: COL.clay, protozoa: COL.water, nematodes: COL.silt };
  rows.forEach((r, i) => {
    const y = 34 + i * 34;
    s.svg.append(
      label(x0 - 8, y + 9, r.who, { anchor: 'end', bold: true, fill: colours[r.who] }),
      svg('rect', { x: x0, y, width: f1(X(r.low) - x0), height: 14, rx: 3, fill: colours[r.who] }),
      svg('rect', { x: f1(X(r.low)), y, width: f1(X(r.high) - X(r.low)), height: 14, rx: 3, fill: tint(colours[r.who], 0.35) }),
    );
  });
  s.svg.append(
    svg('line', { x1: f1(X(PEOPLE)), y1: 22, x2: f1(X(PEOPLE)), y2: 150, stroke: COL.ink, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }),
    small(X(PEOPLE) - 5, 24, 'people', { anchor: 'end', bold: true }),
    small(X(PEOPLE) - 5, 35, 'on Earth', { anchor: 'end', bold: true }),
    small(x0, 188, 'how many in one teaspoon of healthy soil (pale: the range)', { soft: true }),
  );
  return { node: s.node };
}

// ---- The web ------------------------------------------------------------------

/** Where each member sits: food at the bottom, hunters higher up. */
const AT: Record<Dweller, [number, number]> = {
  roots: [110, 236],
  litter: [290, 236],
  bacteria: [130, 168],
  fungi: [270, 168],
  protozoa: [50, 96],
  nematodes: [160, 96],
  arthropods: [260, 96],
  worms: [350, 120],
  birds: [300, 30],
};

const SHORT: Record<Dweller, string> = {
  roots: 'roots', litter: 'dead plants', bacteria: 'bacteria', fungi: 'fungi', protozoa: 'protozoa',
  nematodes: 'nematodes', arthropods: 'mites & co', worms: 'earthworms', birds: 'birds, moles',
};

export const webFigure = figure(['explore'], (_ctx, t) => {
  const W = 400;
  const H = 260;
  const f = frame(W, H, 4);
  const edges = svg('g');
  const nodes = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), edges, nodes);
  let picked: Dweller | null = null;
  let out: Dweller | null = null;
  const seen = new Set<Dweller>();
  const remove = el('button.btn.btn-small.btn-ghost', { type: 'button', disabled: true }, 'Take it out') as HTMLButtonElement;

  const paint = () => {
    const lost = new Set(out ? [out, ...starves(out)] : []);
    redraw(edges, ...EATS.map(([eater, food]) => {
      const [x1, y1] = AT[food];
      const [x2, y2] = AT[eater];
      const on = picked === eater || picked === food;
      const dead = lost.has(eater) || lost.has(food);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      const a = arrow(x1 + ux * 22, y1 + uy * 16, x2 - ux * 24, y2 - uy * 16, on && !dead ? COL.ink : COL.grid, on ? 2 : 1.2);
      return a;
    }));
    redraw(nodes, ...DWELLERS.map((d) => {
      const [x, y] = AT[d];
      const dead = lost.has(d);
      const fill = d === 'roots' || d === 'litter' ? COL.leafPale : COL.sandPale;
      const g = svg('g', { class: 'web-node', role: 'button', tabindex: 0, 'aria-label': INFO[d].name, style: 'cursor: pointer' },
        svg('rect', { x: x - 40, y: y - 13, width: 80, height: 26, rx: 13, fill: dead ? '#e7e2d6' : fill, stroke: picked === d ? COL.ink : COL.soft, 'stroke-width': picked === d ? 2 : 1 }),
        label(x, y + 4, SHORT[d], { anchor: 'middle', bold: picked === d, fill: dead ? '#a59c8a' : COL.ink }),
      );
      const pick = () => {
        picked = d;
        seen.add(d);
        remove.disabled = false;
        remove.textContent = out === d ? 'Put it back' : 'Take it out';
        paint();
        if (t.goal === 'explore' && seen.size >= 4) t.done();
      };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && pick());
      return g;
    }));
    if (!picked) f.readout.textContent = 'Tap any member of the web to see what it eats and what eats it. Arrows point from food to eater.';
    else if (out && out === picked) {
      const also = starves(out).map((d) => SHORT[d]);
      f.readout.textContent = `${INFO[out].without}${also.length ? ` Gone with it: ${also.join(', ')}.` : ''}`;
    } else f.readout.textContent = `${INFO[picked].name}. ${INFO[picked].does}`;
  };
  remove.addEventListener('click', () => {
    if (!picked) return;
    out = out === picked ? null : picked;
    remove.textContent = out === picked ? 'Put it back' : 'Take it out';
    paint();
  });
  f.controls.append(remove);
  paint();
  return f.node;
});
