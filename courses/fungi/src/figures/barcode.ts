// Branch M2, Names written in DNA: barcode reads from a spoonful of soil,
// grouped into kinds by how alike they must be, and how many of the kinds
// have a name.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';

const W = 400;

const rnd = (i: number, salt: number) => {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * The true kinds in the sample: where each sits on a map where one unit is
 * one per cent difference in the barcode, how many reads it gave, and whether
 * a reference collection has it under a name.
 */
export const KINDS: readonly { x: number; y: number; reads: number; named: boolean }[] = [
  { x: 4, y: 4, reads: 12, named: true }, { x: 9, y: 4.5, reads: 6, named: true },
  { x: 16, y: 3, reads: 9, named: false }, { x: 24, y: 5, reads: 5, named: false },
  { x: 31, y: 3.5, reads: 8, named: true }, { x: 35, y: 6, reads: 4, named: false },
  { x: 5, y: 13, reads: 7, named: false }, { x: 12, y: 15, reads: 10, named: false },
  { x: 15.5, y: 12, reads: 4, named: false }, { x: 22, y: 14, reads: 6, named: true },
  { x: 29, y: 16, reads: 3, named: false }, { x: 36, y: 13, reads: 7, named: false },
  { x: 8, y: 22, reads: 5, named: false }, { x: 19, y: 22, reads: 8, named: false },
  { x: 27, y: 22.5, reads: 4, named: false }, { x: 34, y: 21, reads: 6, named: false },
];

/** Every read: its kind and its place, scattered up to about a per cent from its kind's centre. */
export const READS: readonly { kind: number; x: number; y: number }[] = KINDS.flatMap((k, ki) =>
  Array.from({ length: k.reads }, (_, j) => {
    const i = ki * 20 + j;
    const a = rnd(i, 1) * Math.PI * 2;
    const r = 0.25 + rnd(i, 2) * 0.75;
    return { kind: ki, x: k.x + r * Math.cos(a), y: k.y + r * Math.sin(a) };
  }),
);

/** Group the reads: two reads join a group if they differ by less than (100 - similarity) per cent. Returns a group id per read. */
export function cluster(similarity: number): number[] {
  const cut = 100 - similarity;
  const parent = READS.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < READS.length; i++) {
    for (let j = i + 1; j < READS.length; j++) {
      if (Math.hypot(READS[i].x - READS[j].x, READS[i].y - READS[j].y) < cut) parent[find(i)] = find(j);
    }
  }
  return READS.map((_, i) => find(i));
}

/** Groups found, and how many of them contain a named kind. */
export function tally(similarity: number): { groups: number; named: number } {
  const ids = cluster(similarity);
  const groups = new Map<number, boolean>();
  ids.forEach((id, i) => groups.set(id, (groups.get(id) ?? false) || KINDS[READS[i].kind].named));
  return { groups: groups.size, named: [...groups.values()].filter(Boolean).length };
}

const PALETTE = ['#a8643a', '#7a4e8a', '#3d7ea6', '#4f8a3c', '#c98a2e', '#d0507a', '#3156a8', '#5e4130', '#6f9f5a', '#b9975b', '#3f9a9a', '#8b6f4e'];

export const barcodeFigure = figure(['groups'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let sim = 97;
  let sawSplit = false;
  let sawLump = false;
  const X = (u: number) => 16 + u * 6.4;
  const Y = (u: number) => 20 + u * 6.2;
  const paint = () => {
    const ids = cluster(sim);
    const order = [...new Set(ids)];
    const { groups, named } = tally(sim);
    const parts: SVGElement[] = [svg('rect', { x: 6, y: 8, width: 262, height: 176, fill: COL.paper, stroke: COL.grid, rx: 4 })];
    READS.forEach((r, i) => {
      const c = PALETTE[order.indexOf(ids[i]) % PALETTE.length];
      parts.push(svg('circle', { cx: X(r.x), cy: Y(r.y), r: 2.6, fill: c }));
    });
    KINDS.forEach((k) => { if (k.named) parts.push(svg('circle', { cx: X(k.x), cy: Y(k.y), r: 9, fill: 'none', stroke: COL.ink, 'stroke-width': 1, 'stroke-dasharray': '2 2' })); });
    parts.push(
      small(137, 196, 'each dot one read; colour shows its group', { anchor: 'middle', fill: COL.soft }),
      small(282, 40, `${groups} groups`, { bold: true }),
      small(282, 56, `true kinds in the soil: ${KINDS.length}`, {}),
      small(282, 84, `with a name: ${named}`, { bold: true }),
      svg('circle', { cx: 287, cy: 100, r: 6, fill: 'none', stroke: COL.ink, 'stroke-dasharray': '2 2' }),
      small(298, 104, 'a named kind', {}),
      small(282, 132, `without a name: ${groups - named}`, { bold: true }),
    );
    redraw(g, ...parts);
    if (sim >= 99.5) sawSplit = true;
    if (sim <= 91) sawLump = true;
    f.readout.textContent = sim >= 99
      ? 'Asking for near-identical barcodes splits every kind into many groups, because reads differ a little within a kind and through reading errors.'
      : sim <= 93
        ? 'A loose rule lumps closely related kinds together, and the count falls below the truth.'
        : 'Around 97 per cent, the usual rule of thumb for fungal barcodes, the groups match the true kinds fairly well. Most of them have no name.';
    if (sawSplit && sawLump) t.done();
  };
  const ss = slider('Alike enough to be one kind', 88, 100, 0.5, sim, (v) => `${v}%`, (v) => { sim = v; paint(); }, 'spore');
  f.controls.append(ss.node);
  paint();
  return f.node;
});
