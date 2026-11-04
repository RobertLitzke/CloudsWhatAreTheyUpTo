// A small family-tree drawer for figures that change their tree (a guess,
// a toggle between two classifications): leaves in a column on the right,
// branches joined by square elbows, tips in the leaf's colour.

import { svg } from 'didactics/dom';
import { line, small } from 'didactics/draw';

export interface Clade {
  label?: string;
  /** A second line under a leaf's label. */
  note?: string;
  color?: string;
  bold?: boolean;
  kids?: Clade[];
}

export interface CladoOptions {
  x: number; y: number; w: number;
  /** Space between leaves. */
  gap: number;
  ink: string;
  /** Where the leaves' labels start, from x. Default w - 120. */
  labelAt?: number;
}

const depth = (c: Clade): number => (c.kids?.length ? 1 + Math.max(...c.kids.map(depth)) : 0);

/** The tree drawn from its root on the left; returns its parts and the y of each leaf by label. */
export function clado(root: Clade, o: CladoOptions): { parts: SVGElement[]; at: Map<string, number> } {
  const parts: SVGElement[] = [];
  const at = new Map<string, number>();
  const labelX = o.x + (o.labelAt ?? o.w - 120);
  const levels = depth(root);
  const colX = (d: number) => o.x + ((labelX - 8 - o.x) * d) / Math.max(1, levels);
  let leaf = 0;
  // Returns the y of the node; leaves are placed at the right edge whatever their depth.
  const place = (c: Clade, d: number): number => {
    if (!c.kids?.length) {
      const y = o.y + leaf++ * o.gap;
      at.set(c.label ?? '', y);
      parts.push(
        line(colX(d), y, labelX - 4, y, c.color ?? o.ink, 2),
        svg('circle', { cx: labelX - 4, cy: y, r: 3, fill: c.color ?? o.ink }),
        small(labelX + 2, y + 3, c.label ?? '', { bold: c.bold ?? true, fill: c.color }),
      );
      if (c.note) parts.push(small(labelX + 2, y + 14, c.note, { soft: true }));
      return y;
    }
    const ys = c.kids.map((k) => place(k, d + 1));
    const x = colX(d);
    const xk = colX(d + 1);
    parts.push(line(x, Math.min(...ys), x, Math.max(...ys), o.ink, 1.5));
    for (const yk of ys) parts.push(line(x, yk, xk, yk, o.ink, 1.5));
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    if (c.label) parts.push(small(x + 3, Math.min(...ys) - 4, c.label, { soft: true }));
    return y;
  };
  const y0 = place(root, 0);
  parts.push(line(o.x - 8, y0, o.x, y0, o.ink, 1.5));
  return { parts, at };
}
