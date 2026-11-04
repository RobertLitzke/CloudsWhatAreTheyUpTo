// Lesson 12, The spiral in the pine cone: a shoot tip seen from above that
// puts each new leaf in the biggest gap (Douady and Couder's rule), and a
// bean root marked with ink dots that spread only near its tip.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, player, slider, wrapped } from './kit';

const W = 400;

/**
 * Leaves made one at a time on the rim of a growing tip, each where it is
 * least crowded by the leaves before it (the sum of 1/d³ is smallest), as
 * Hofmeister's rule and Douady and Couder's drops have it. Between one leaf
 * and the next, every leaf drifts outward by a factor e^g: a big `g` means
 * the tip grows a lot before it makes another leaf. Like a seedling's, the
 * tip starts out small, with `g` near 1 (leaves alternate), and settles to
 * the `g` given as it grows. Returns each leaf's angle (degrees) and distance
 * from the centre (the rim is 1), oldest first.
 */
export function shoot(g: number, n = 160): { angle: number; r: number }[] {
  const leaves: { angle: number; r: number }[] = [{ angle: 0, r: 1 }];
  for (let k = 1; k < n; k++) {
    const gk = g + Math.max(0, 1 - g) * Math.exp(-k / 15);
    for (const l of leaves) l.r *= Math.exp(gk);
    // Only leaves near the rim crowd a new one; the rest are far away.
    const near = leaves.filter((l) => l.r < 6);
    let best = 0;
    let bestE = Infinity;
    for (let a = 0; a < 360; a += 0.5) {
      const x = Math.cos((a * Math.PI) / 180);
      const y = Math.sin((a * Math.PI) / 180);
      let e = 0;
      for (const l of near) {
        const dx = x - l.r * Math.cos((l.angle * Math.PI) / 180);
        const dy = y - l.r * Math.sin((l.angle * Math.PI) / 180);
        e += 1 / Math.pow(dx * dx + dy * dy, 1.5);
      }
      if (e < bestE) {
        bestE = e;
        best = a;
      }
    }
    leaves.push({ angle: best, r: 1 });
  }
  return leaves;
}

/** The angle from one leaf to the next, averaged over the last ten, folded to 0 to 180°. */
export function divergence(leaves: readonly { angle: number }[]): number {
  const last = leaves.slice(-11);
  let sum = 0;
  for (let i = 1; i < last.length; i++) {
    const d = (((last[i].angle - last[i - 1].angle) % 360) + 360) % 360;
    sum += d > 180 ? 360 - d : d;
  }
  return sum / Math.max(1, last.length - 1);
}


export const phyllotaxisFigure = figure(['golden'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let growth = 0.08;
  let spirals = 0;
  let sawHalf = false;
  let sawGolden = false;
  const cache = new Map<number, { angle: number; r: number }[]>();
  const leavesFor = (v: number) => {
    if (!cache.has(v)) cache.set(v, shoot(v));
    return cache.get(v)!;
  };
  const paint = () => {
    // The seedling's first leaves are left out: only the last 110, made once the tip has settled.
    const leaves = leavesFor(growth).slice(-110);
    const d = divergence(leaves);
    const cx = 125;
    const cy = 125;
    // Drawn as a sunflower is: the oldest leaf outermost, distances squeezed so all of them fit.
    const N = leaves.length;
    const place = (k: number): [number, number] => {
      const rr = 10 + 104 * Math.sqrt((N - 1 - k) / (N - 1));
      return [cx + rr * Math.cos((leaves[k].angle * Math.PI) / 180), cy + rr * Math.sin((leaves[k].angle * Math.PI) / 180)];
    };
    const dots = leaves.map((_, k) => {
      const [x, y] = place(k);
      return svg('circle', { cx: x, cy: y, r: 2.5 + 3.5 * Math.sqrt((N - 1 - k) / (N - 1)), fill: COL.leaf, opacity: 0.9, stroke: COL.paper, 'stroke-width': 0.6 });
    });
    // Each leaf joined to the one `spirals` leaves after it: the joins run along the spirals.
    const joins: SVGElement[] = [];
    if (spirals) for (let k = 0; k + spirals < N; k++) {
      const [x1, y1] = place(k);
      const [x2, y2] = place(k + spirals);
      joins.push(line(x1, y1, x2, y2, COL.sugar, 1.6));
    }
    const newest = leaves[leaves.length - 1];
    const prev = leaves[leaves.length - 2];
    redraw(g,
      svg('circle', { cx, cy, r: 118, fill: '#eef3e2' }),
      ...joins,
      ...dots,
      svg('circle', { cx, cy, r: 8, fill: 'none', stroke: COL.ink, 'stroke-dasharray': '2 2' }),
      line(cx, cy, cx + 16 * Math.cos((prev.angle * Math.PI) / 180), cy + 16 * Math.sin((prev.angle * Math.PI) / 180), COL.soft, 1),
      line(cx, cy, cx + 16 * Math.cos((newest.angle * Math.PI) / 180), cy + 16 * Math.sin((newest.angle * Math.PI) / 180), COL.ink, 1.5),
      label(262, 34, 'Angle from one', { bold: true }),
      label(262, 50, 'leaf to the next', { bold: true }),
      label(262, 84, `${d.toFixed(1)}°`, { bold: true }),
      ...wrapped(262, 120, d > 170 ? 'Every leaf opposite the last: two straight ranks, and no spirals to join.' : spirals ? `Each leaf joined to the leaf made ${spirals} after it. The joins run along ${spirals} spirals.` : 'The tip seen from above. Dashed: its rim, where new leaves form. Older leaves have drifted out and grown (distances squeezed).', 26, { soft: true }),
      small(262, 238, 'A model of Hofmeister’s rule.', { soft: true }),
    );
    if (!open()) return;
    if (d > 170) sawHalf = true;
    if (Math.abs(d - 137.5) < 2.5) sawGolden = true;
    f.readout.textContent = d > 170
      ? `The older leaves drift far out between new ones, so each new leaf is crowded only by the one before it, and forms on the far side from it: ${d.toFixed(0)}°, as in grasses and irises.`
      : Math.abs(d - 137.5) < 2.5
        ? `Each new leaf lands ${d.toFixed(1)}° round from the last, close to 137.5°, and the leaves fall into spirals. Join leaves 5, 8, 13 or 21 apart to see them.`
        : `The angle is ${d.toFixed(0)}°, partway between alternating and the spiral angle. Very few plants sit here for long.`;
    if (sawHalf && sawGolden) t.done();
  };
  const gs = slider('How far leaves drift out between new ones', 0.03, 1.2, 0.01, growth, (v) => (v > 0.8 ? 'a lot' : v > 0.25 ? 'some' : 'little'), (v) => { growth = v; paint(); }, 'leaf');
  const colour = pick(['No joins', 'Join 5 apart', 'Join 8 apart', 'Join 13 apart', 'Join 21 apart'], 0, (i) => { spirals = [0, 5, 8, 13, 21][i]; paint(); });
  f.controls.append(gs.node, colour.node);
  const open = guessFirst(t, f, {
    ask: 'Each new leaf forms on the rim of the tip, as far as it can get from the leaves before it. What angle will there be from one leaf to the next?',
    options: ['Half a turn, 180°', 'A third of a turn, 120°', 'An odd angle, near 137.5°'],
    answer: 2,
    reveal: 'lock',
    sliders: [gs],
    buttons: colour.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Sachs's ink dots --------------------------------------------------------------------------------

/**
 * A root marked with ink every millimetre from its tip, after `hours`: the
 * marks' distances from the tip (mm). Cells divide in the first millimetre
 * and stretch from about 1 to 8 mm back; behind that they have stopped.
 */
export function inkDots(hours: number, marks = 12): number[] {
  // Speed of a point relative to the tip: rises across the stretching zone, then constant.
  const speed = (x: number) => 0.6 * Math.min(1, Math.max(0, (x - 0.8) / 7));
  return Array.from({ length: marks }, (_, i) => {
    let x = i + 0.5;
    for (let s = 0; s < hours * 10; s++) x += speed(x) * 0.1;
    return x;
  });
}

export const rootFigure = figure(['tip'], (ctx, t) => {
  const f = frame(W, 216, 3);
  const g = svg('g');
  f.svg.append(g);
  let hours = 0;
  const paint = () => {
    const now = inkDots(hours);
    const start = inkDots(0);
    const mm = 9;
    const tipX = 380;
    const total = now[now.length - 1] + 1.5;
    const y = 90;
    redraw(g,
      small(16, 22, 'A bean root lying on wet paper, its tip to the right', { soft: true }),
      // The root body, longer as it grows (the seed end at the left edge).
      svg('rect', { x: Math.max(8, tipX - total * mm), y: y - 9, width: Math.min(tipX - 8, total * mm), height: 18, rx: 4, fill: '#efe2c0', stroke: '#c9a36a' }),
      svg('path', { d: `M${tipX},${y - 9} q18,9 0,18 Z`, fill: '#d8c08a' }),
      small(tipX + 4, y + 26, 'tip', { anchor: 'end', soft: true }),
      ...now.map((x) => line(tipX - x * mm, y - 9, tipX - x * mm, y + 9, COL.ink, 2)),
      // Where each mark started, below.
      ...start.map((x) => line(tipX - x * mm, y + 40, tipX - x * mm, y + 50, COL.soft, 1.5)),
      small(16, y + 64, 'marks as made, a millimetre apart', { soft: true }),
      svg('rect', { x: tipX - 1 * mm, y: y + 80, width: 1 * mm, height: 8, fill: COL.leaf, opacity: 0.6 }),
      svg('rect', { x: tipX - 8 * mm, y: y + 80, width: 7 * mm, height: 8, fill: COL.sugar, opacity: 0.5 }),
      small(tipX + 4, y + 114, 'dividing', { anchor: 'end', fill: COL.leaf }),
      small(tipX - 4.5 * mm, y + 100, 'stretching', { anchor: 'middle', fill: COL.sugar }),
      label(16, 46, `${hours} hours later`, { bold: true }),
    );
    if (!open()) return;
    f.readout.textContent = hours === 0
      ? 'Ink marks a millimetre apart along a growing root. Press Play.'
      : `After ${hours} hours, the marks near the seed haven’t moved apart at all. Only the ones a few millimetres behind the tip have spread: that is the only place the root grows longer.`;
    if (hours >= 18) t.done();
  };
  const hs = slider('Hours', 0, 24, 1, 0, (v) => `${v}`, (v) => { hours = v; paint(); }, 'soil');
  const play = player(hs, ctx, { seconds: 6 });
  f.controls.append(play.node, hs.node);
  const open = guessFirst(t, f, {
    ask: 'A growing root is marked with ink every millimetre. A day later, where will the marks have spread apart?',
    options: ['Evenly all along', 'Just behind the tip', 'Near the seed'],
    answer: 1,
    reveal: 'done',
    sliders: [hs],
    after: () => paint(),
  });
  paint();
  return f.node;
});
