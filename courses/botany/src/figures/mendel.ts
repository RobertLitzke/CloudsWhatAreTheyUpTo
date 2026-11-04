// Lesson C1, Mendel's peas: cross tall and short peas and count the
// offspring, each plant getting one copy of the height gene from each parent
// at random.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { button, COL, figure, frame, guessFirst, pick, slider } from './kit';

const W = 400;

/** A pea's two copies of the height gene: T tall, t short. */
export type Pea = 'TT' | 'Tt' | 'tt';
export const PARENTS: { pea: Pea; name: string }[] = [
  { pea: 'TT', name: 'Pure tall' },
  { pea: 'Tt', name: 'Tall hybrid' },
  { pea: 'tt', name: 'Short' },
];
export const tall = (p: Pea) => p !== 'tt';

/** `n` offspring of a cross, each taking one copy at random from each parent. */
export function cross(a: Pea, b: Pea, n: number, seed: number): Pea[] {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => {
    const x = a[rng() < 0.5 ? 0 : 1];
    const y = b[rng() < 0.5 ? 0 : 1];
    return (x === 'T' || y === 'T' ? (x === y ? 'TT' : 'Tt') : 'tt') as Pea;
  });
}

export const crossFigure = figure(['ratio'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let a = 1;
  let b = 1;
  let n = 100;
  let seed = 1;
  const paint = () => {
    const shown = open();
    const kids = cross(PARENTS[a].pea, PARENTS[b].pea, n, seed);
    const tallN = kids.filter(tall).length;
    const shortN = n - tallN;
    const parts: SVGElement[] = [];
    const show = kids.slice(0, 100);
    show.forEach((k, i) => {
      const x = 20 + (i % 20) * 13;
      const y = 60 + Math.floor(i / 20) * 34;
      const h = tall(k) ? 26 : 10;
      parts.push(line(x, y + 26, x, y + 26 - h, COL.leaf, 2), svg('circle', { cx: x + 2, cy: y + 26 - h, r: 2.2, fill: tall(k) ? COL.leaf : COL.autumn }));
    });
    const ratio = shortN ? tallN / shortN : Infinity;
    redraw(g,
      label(16, 20, `${PARENTS[a].name} × ${PARENTS[b].name}`, { bold: true }),
      small(16, 38, n > 100 ? `The first 100 of ${n} offspring:` : `${n} offspring:`, { soft: true }),
      ...parts,
      label(300, 80, `${tallN} tall`, { fill: COL.leaf, bold: true }),
      label(300, 104, `${shortN} short`, { fill: COL.autumn, bold: true }),
      small(300, 128, shortN ? `${ratio.toFixed(2)} tall to 1 short` : 'no short ones', { soft: true }),
      small(300, 150, 'Random: a model.', { soft: true }),
    );
    if (!shown) return;
    const pa = PARENTS[a].pea;
    const pb = PARENTS[b].pea;
    f.readout.textContent = pa === 'Tt' && pb === 'Tt'
      ? `Each hybrid passes on its tall copy or its short copy at random, so a quarter of the offspring get two short copies and come up short: ${shortN} of ${n}, about 3 to 1. More plants bring the ratio closer.`
      : pa === 'tt' && pb === 'tt'
        ? 'Short × short gives only short: neither parent has a tall copy to pass on.'
        : (pa === 'TT' || pb === 'TT')
          ? 'Every offspring gets a tall copy from the pure-tall parent, so all come up tall, even those carrying a short copy hidden.'
          : `Half the offspring get the hybrid's short copy alongside the short parent's: ${shortN} of ${n} short, about 1 to 1.`;
    if (pa === 'Tt' && pb === 'Tt' && n >= 400) t.done();
  };
  const pa = pick(PARENTS.map((p) => p.name), a, (i) => { a = i; paint(); });
  const pb = pick(PARENTS.map((p) => `× ${p.name.toLowerCase()}`), b, (i) => { b = i; paint(); });
  const ns = slider('Offspring grown', 10, 1000, 10, n, (v) => `${v}`, (v) => { n = v; paint(); }, 'leaf');
  const again = button('Grow another batch', () => { seed += 1; paint(); });
  f.controls.append(pa.node, pb.node, ns.node, again);
  const open = guessFirst(t, f, {
    ask: 'A pure tall pea crossed with a short one gives all tall hybrids. Cross two of those hybrids. What share of their offspring come up short?',
    options: ['None: tall has won', 'About a quarter', 'About half'],
    answer: 1,
    reveal: 'done',
    sliders: [ns],
    buttons: [...pa.buttons, ...pb.buttons, again],
    after: () => paint(),
  });
  paint();
  return f.node;
});
