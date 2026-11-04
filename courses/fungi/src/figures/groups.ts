// Lesson 6, Sacs and clubs: the four ways fungi make their spores (a still),
// and a sorting figure where the reader files six fungi by how their spores
// are made, with the family tree beside them.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, pick, wrapped } from './kit';

const W = 400;

/** The four spore-makers, drawn small at (x, y). */
function ascus(x: number, y: number): SVGElement[] {
  return [
    svg('path', { d: `M${x - 9},${y + 40} L${x - 9},${y} Q${x},${y - 12} ${x + 9},${y} L${x + 9},${y + 40} Z`, fill: '#f6eedb', stroke: COL.hypha, 'stroke-width': 1.5 }),
    ...Array.from({ length: 8 }, (_, i) => svg('ellipse', { cx: x, cy: y + 2 + i * 4.6, rx: 4, ry: 2.4, fill: COL.spore })),
    line(x - 6, y - 7, x + 6, y - 7, COL.hypha, 1.5),
  ];
}
function basidium(x: number, y: number): SVGElement[] {
  return [
    svg('path', { d: `M${x - 9},${y + 40} L${x - 9},${y + 12} Q${x},${y} ${x + 9},${y + 12} L${x + 9},${y + 40}`, fill: '#f6eedb', stroke: COL.hypha, 'stroke-width': 1.5 }),
    ...[-6, -2, 2, 6].map((dx) => line(x + dx * 0.7, y + 6, x + dx * 1.3, y - 2, COL.hypha, 1.2)),
    ...[-6, -2, 2, 6].map((dx) => svg('ellipse', { cx: x + dx * 1.6, cy: y - 7, rx: 2.4, ry: 3.6, fill: COL.spore })),
  ];
}
function sporangium(x: number, y: number): SVGElement[] {
  return [
    line(x, y + 40, x, y + 8, COL.hypha, 2),
    svg('circle', { cx: x, cy: y, r: 10, fill: '#3a3236' }),
    ...Array.from({ length: 7 }, (_, i) => svg('circle', { cx: x - 5 + (i % 4) * 3.4, cy: y - 4 + Math.floor(i / 4) * 5, r: 1.3, fill: '#d8cfc0' })),
  ];
}
function zoospore(x: number, y: number): SVGElement[] {
  return [
    svg('circle', { cx: x, cy: y + 14, r: 7, fill: COL.spore }),
    svg('path', { d: `M${x},${y + 21} q6,8 0,14 q-6,6 0,12`, stroke: COL.spore, 'stroke-width': 1.2, fill: 'none' }),
  ];
}

export const makersStill = () => {
  const s = still(W, 180);
  const parts: SVGElement[] = [];
  const cols = [
    { x: 52, draw: ascus, name: 'Sac fungi', body: 'Usually 8 spores in a sac, shot out of its tip. Cup fungi, morels, yeasts, most moulds.' },
    { x: 150, draw: basidium, name: 'Club fungi', body: 'Usually 4 spores on prongs on a club-shaped cell. Mushrooms, brackets, puffballs, rusts.' },
    { x: 248, draw: sporangium, name: 'Pin moulds', body: 'Hundreds of spores in a ball on a stalk. Black bread mould, dung fungi.' },
    { x: 346, draw: zoospore, name: 'Chytrids', body: 'Spores that swim with one tail. Water, wet soil, pollen.' },
  ];
  for (const c of cols) {
    parts.push(...c.draw(c.x, 26), label(c.x, 90, c.name, { anchor: 'middle', bold: true }), ...wrapped(c.x - 46, 106, c.body, 19, { soft: true }, 11));
  }
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- Sorting six fungi -----------------------------------------------------------------------------

export const GROUPS = ['Sac fungus', 'Club fungus', 'Older lineage'] as const;

export const SPECIMENS = [
  { name: 'A button mushroom', clue: 'Under the cap, each gill cell carries four spores on four short prongs.', group: 1 },
  { name: 'A morel', clue: 'The pitted cap is lined with long sacs, each holding eight spores in a row.', group: 0 },
  { name: 'Baker’s yeast', clue: 'Single cells; when they mate, each forms a small sac with four spores inside.', group: 0 },
  { name: 'A bracket on a log', clue: 'The pores underneath are lined with cells bearing four spores each, on prongs.', group: 1 },
  { name: 'Black bread mould', clue: 'Black pinheads on stalks, each a ball holding hundreds of spores.', group: 2 },
  { name: 'A chytrid on pollen in a pond', clue: 'It releases spores that swim off, each with a single tail.', group: 2 },
] as const;

export const sortFigure = figure(['sorted'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let at = 0;
  const placed: (number | null)[] = SPECIMENS.map(() => null);
  const paint = () => {
    // The tree on the left, with each sorted specimen filed under its branch.
    const ys = [44, 104, 164];
    const parts: SVGElement[] = [
      line(16, 74, 16, 164, COL.ink, 1.5), line(16, 164, 40, 164, COL.ink, 1.5),
      line(16, 74, 30, 74, COL.ink, 1.5), line(30, 44, 30, 104, COL.ink, 1.5),
      line(30, 44, 40, 44, COL.ink, 1.5), line(30, 104, 40, 104, COL.ink, 1.5),
      small(34, 70, 'the higher fungi', { soft: true }),
    ];
    GROUPS.forEach((name, i) => {
      parts.push(label(44, ys[i] + 4, name, { bold: true }));
      const here = SPECIMENS.map((sp, k) => ({ sp, k })).filter(({ k }) => placed[k] === i);
      here.forEach(({ sp, k }, j) => parts.push(small(52, ys[i] + 18 + j * 11, sp.name, { fill: SPECIMENS[k].group === i ? COL.good : COL.bad })));
    });
    const sp = SPECIMENS[Math.min(at, SPECIMENS.length - 1)];
    if (at < SPECIMENS.length) {
      parts.push(
        svg('rect', { x: 200, y: 24, width: 190, height: 120, rx: 8, fill: COL.paper, stroke: COL.grid }),
        label(212, 46, `${at + 1} of ${SPECIMENS.length}: ${sp.name}`, { bold: true }),
        ...wrapped(212, 66, sp.clue, 32, {}, 13),
      );
    } else {
      parts.push(label(210, 80, 'All six filed.', { bold: true }));
    }
    redraw(g, ...parts);
  };
  const choose = pick(GROUPS, -1, (i) => {
    if (at >= SPECIMENS.length) return;
    const sp = SPECIMENS[at];
    placed[at] = i;
    const right = sp.group === i;
    f.readout.textContent = right
      ? `${sp.name}: right, a ${GROUPS[i].toLowerCase()}. ${at + 1 < SPECIMENS.length ? 'Next one.' : ''}`
      : `${sp.name} is a ${GROUPS[sp.group].toLowerCase()}, not a ${GROUPS[i].toLowerCase()}: what matters is how it makes its spores, not how it looks.`;
    if (right) at++;
    if (at >= SPECIMENS.length) {
      f.readout.textContent = 'Sorted by how they make spores. The morel and the yeast are sisters, though one is a cap on a stalk and the other a single cell.';
      t.done();
    }
    choose.buttons.forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); });
    paint();
  });
  f.controls.append(choose.node);
  f.readout.textContent = 'Read the clue, then file each fungus under its group.';
  paint();
  return f.node;
});
