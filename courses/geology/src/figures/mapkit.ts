// Small helpers for the branch figures that work on a relief: where water
// rises to from a seed, what lies inside a drawn outline, and a min-heap for
// both. Shared by floods.ts and cascadia.ts.

import { fromCell, toCell, type Relief } from 'didactics/maps';

/** A min-heap of cell indexes by key. */
export class Heap {
  private keys: number[] = [];
  private items: number[] = [];
  get size() {
    return this.items.length;
  }
  push(key: number, item: number) {
    const k = this.keys;
    const it = this.items;
    k.push(key);
    it.push(item);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [it[p], it[i]] = [it[i], it[p]];
      i = p;
    }
  }
  pop(): [number, number] {
    const k = this.keys;
    const it = this.items;
    const top: [number, number] = [k[0], it[0]];
    const lk = k.pop()!;
    const li = it.pop()!;
    if (k.length) {
      k[0] = lk;
      it[0] = li;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [it[m], it[i]] = [it[i], it[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Whether (x, y) lies inside the polygon `poly` of [x, y] points. */
export function inside(x: number, y: number, poly: readonly (readonly [number, number])[]): boolean {
  let c = false;
  for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) {
    const [x1, y1] = poly[k];
    const [x2, y2] = poly[j];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) c = !c;
  }
  return c;
}

/** The cell index of a place. */
export function cellOf(r: Relief, lon: number, lat: number): number {
  const [c, row] = toCell(r, lon, lat);
  const col = Math.max(0, Math.min(r.width - 1, Math.floor(c)));
  const rr = Math.max(0, Math.min(r.height - 1, Math.floor(row)));
  return rr * r.width + col;
}

/** Each cell's [lon, lat]. */
export function lonLats(r: Relief): Float64Array {
  const out = new Float64Array(r.width * r.height * 2);
  for (let row = 0; row < r.height; row++)
    for (let col = 0; col < r.width; col++) {
      const [lon, lat] = fromCell(r, col + 0.5, row + 0.5);
      out[(row * r.width + col) * 2] = lon;
      out[(row * r.width + col) * 2 + 1] = lat;
    }
  return out;
}

/**
 * For every cell, the water level a lake started at `seed` must reach to
 * spread to it (the lowest possible highest point on a path from the seed).
 * `ground` may differ from the relief, with ice dams built in, say.
 */
export function fillLevels(r: Relief, ground: Float32Array, seed: number): Float32Array {
  const W = r.width;
  const H = r.height;
  const need = new Float32Array(W * H).fill(Infinity);
  const heap = new Heap();
  need[seed] = ground[seed];
  heap.push(ground[seed], seed);
  while (heap.size) {
    const [d, i] = heap.pop();
    if (d > need[i]) continue;
    const x = i % W;
    const y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if ((dx || dy) && xx >= 0 && yy >= 0 && xx < W && yy < H) {
          const j = yy * W + xx;
          const nd = Math.max(d, ground[j]);
          if (nd < need[j]) {
            need[j] = nd;
            heap.push(nd, j);
          }
        }
      }
  }
  return need;
}
