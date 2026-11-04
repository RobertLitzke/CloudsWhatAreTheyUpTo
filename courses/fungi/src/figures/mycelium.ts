// The mycelium grower: hyphal tips that extend, branch and die, on a tray or
// in a log, drawing food from patches. Used by lesson 3 (a mycelium searching
// a tray for wood) and lesson 16 (fungi taking turns in a log).
//
// The model is deliberately simple. Each tip moves a step a day in roughly
// the direction it was going, branches now and then, and dies when the
// mycelium behind it has no food to send. A tip that reaches a food patch
// connects that patch to the colony; segments on a path to food thicken into
// cords, and segments that lead nowhere fade after a while.

import { makeRng, type Rng } from 'didactics/rng';

export interface Food { x: number; y: number; r: number; name?: string }

export interface Segment {
  x1: number; y1: number; x2: number; y2: number;
  /** The day it was laid down. */
  day: number;
  /** The segment it grew from (-1 for the first). */
  parent: number;
  /** Set once the segment leads to food: it then thickens into a cord. */
  fed: boolean;
}

export interface Colony {
  segments: Segment[];
  /** Index of each growing tip's last segment. */
  tips: number[];
  /** Which food patches have been reached, and on what day. */
  found: (number | null)[];
  /** Stored food the colony can spend on growth. */
  reserve: number;
}

export interface GrowOptions {
  /** Where the colony starts, in drawing units. */
  x: number; y: number;
  /** The tray or space, in drawing units. */
  w: number; h: number;
  food: readonly Food[];
  /** Days to grow. */
  days: number;
  /** Step length a day. */
  step?: number;
  /** Chance a tip branches on a given day. */
  branch?: number;
  /** Food the colony starts with, counted in tip-days of growth. */
  reserve?: number;
  seed?: number;
}

const MAX_TIPS = 48;

/** Grow a colony day by day; returns the state after each day (day 0 first). */
export function grow(o: GrowOptions): Colony[] {
  const rng: Rng = makeRng(o.seed ?? 7);
  const step = o.step ?? 9;
  const branchP = o.branch ?? 0.14;
  const segs: Segment[] = [];
  const dirs: number[] = [];
  let tips: number[] = [];
  let reserve = o.reserve ?? 700;
  const found: (number | null)[] = o.food.map(() => null);
  // A starting plug sends out eight tips.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    segs.push({ x1: o.x, y1: o.y, x2: o.x + Math.cos(a) * step, y2: o.y + Math.sin(a) * step, day: 0, parent: -1, fed: false });
    dirs.push(a);
    tips.push(segs.length - 1);
  }
  const snapshot = (): Colony => ({ segments: segs.map((s) => ({ ...s })), tips: tips.slice(), found: found.slice(), reserve });
  const out = [snapshot()];
  const markFed = (i: number) => {
    for (let k = i; k >= 0 && !segs[k].fed; k = segs[k].parent) segs[k].fed = true;
  };
  for (let day = 1; day <= o.days; day++) {
    // Every patch the colony holds feeds it.
    reserve += found.filter((d) => d !== null).length * 20;
    const next: number[] = [];
    for (const t of tips) {
      if (reserve <= 0) {
        next.push(t);
        continue;
      }
      const s = segs[t];
      const a = dirs[t] + (rng() - 0.5) * 0.5;
      const x2 = s.x2 + Math.cos(a) * step;
      const y2 = s.y2 + Math.sin(a) * step;
      if (x2 < 2 || y2 < 2 || x2 > o.w - 2 || y2 > o.h - 2) continue;
      segs.push({ x1: s.x2, y1: s.y2, x2, y2, day, parent: t, fed: false });
      dirs.push(a);
      reserve -= 1;
      const i = segs.length - 1;
      let stop = false;
      o.food.forEach((f, k) => {
        if (Math.hypot(x2 - f.x, y2 - f.y) < f.r) {
          if (found[k] === null) found[k] = day;
          markFed(i);
          stop = true;
        }
      });
      if (stop) continue;
      next.push(i);
      if (rng() < branchP && next.length < MAX_TIPS) {
        const b = a + (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.5);
        segs.push({ x1: s.x2, y1: s.y2, x2: s.x2 + Math.cos(b) * step, y2: s.y2 + Math.sin(b) * step, day, parent: t, fed: false });
        dirs.push(b);
        reserve -= 1;
        next.push(segs.length - 1);
      }
    }
    // Once food is found, tips far from it are not worth feeding: the colony keeps the cords and lets the search shrink.
    tips = found.some((d) => d !== null) && next.length > 10 ? next.filter((_, k) => k % 4 !== 0) : next;
    out.push(snapshot());
  }
  return out;
}

/** How visible a segment is on `day`: cords stay, searching threads fade some days after they stop growing. */
export function strength(s: Segment, day: number, anyFound: boolean): number {
  if (s.fed) return 1;
  if (!anyFound) return 0.8;
  const age = day - s.day;
  return Math.max(0.08, 0.8 - age * 0.06);
}
