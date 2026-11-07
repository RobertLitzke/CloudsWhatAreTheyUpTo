// Branch S2, The summer Lake Washington fell: the lake with its old outlet
// (the Black River, south) and its new one (the Montlake Cut, north), falling
// day by day after the cut opens in 1916; and a still of the salt water at the
// locks, with the barrier and the drain that keep it out of the lake.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still } from 'didactics/draw';
import { height } from 'didactics/units';
import { COL, figure, frame, guessFirst, player, sig, slider, type FigureFactory } from './kit';

const W = 400;

/**
 * The model lake. Heights are metres above low tide in the Sound (the datum
 * the locks gauge uses). Before the cut the lake stood about 9.1 m in late
 * summer, spilling over the Black River's bed at Renton; Lake Union, held by
 * the locks, stands at about 6.4 m.
 */
export const LAKE = {
  /** Lake Washington's area, m². */
  area: 88e6,
  /** What runs into the lake in late summer, m³/s. */
  inflow: 15,
  /** The lake's level before the cut, m. */
  before: 9.1,
  /** The top of the Black River's bed where it left the lake, m. */
  sill: 8.4,
  /** Lake Union's level, held by the locks, m. */
  union: 6.4,
  /** The Black River's outflow over its sill: k (L − sill)^1.5, set so the late-summer inflow just spills at 9.1 m. */
  kBlack: 15 / Math.pow(0.7, 1.5),
  /** The cut's flow, k √(L − union): a channel's flow grows as the root of the fall along it. */
  kCut: 55,
} as const;

/** The two outlets' flows, m³/s, when the lake stands at `level` and the locks hold Lake Union at `union`. */
export function outflows(level: number, union: number = LAKE.union, cut = true): { black: number; cut: number } {
  const black = LAKE.kBlack * Math.pow(Math.max(0, level - LAKE.sill), 1.5);
  const head = level - union;
  const c = cut ? Math.sign(head) * LAKE.kCut * Math.sqrt(Math.abs(head)) : 0;
  return { black, cut: c };
}

/** The lake's level `days` after the cut opens, stepping the water balance a tenth of a day at a time. */
export function lakeLevel(days: number, union: number = LAKE.union): number {
  let level: number = LAKE.before;
  const dt = 0.1;
  for (let d = 0; d < days - 1e-9; d += dt) {
    const o = outflows(level, union);
    level += ((LAKE.inflow - o.black - o.cut) * 86400 * Math.min(dt, days - d)) / LAKE.area;
  }
  return level;
}

const flow = (q: number, units: 'metric' | 'imperial') =>
  units === 'metric' ? `${q < 0.05 ? '0' : sig(q, 2)} m³/s` : `${q < 0.05 ? '0' : sig(q * 35.31, 2)} ft³/s`;

const metresOrFeet = (m: number, units: 'metric' | 'imperial') =>
  units === 'metric' ? `${m.toFixed(1)} m` : `${(m * 3.28084).toFixed(1)} ft`;

export const outletFigure = figure(['dry'], (ctx, t) => {
  const units = ctx.save.units;
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let day = 0;
  let union: number = LAKE.union;
  const Y = (h: number) => 204 - h * 15;
  const paint = () => {
    const L = lakeLevel(day, union);
    const o = outflows(L, union);
    const blackW = o.black > 0.05 ? Math.min(6, 1 + o.black / 6) : 0;
    const cutW = Math.min(8, 1 + Math.abs(o.cut) / 12);
    // The ground along the water route, south (left) to north and west (right).
    const ground: [number, number][] = [
      [0, Y(0.6)], [40, Y(1)], [104, Y(LAKE.sill)], [118, Y(LAKE.sill)], [124, 236],
      [226, 236], [230, Y(5)], [246, Y(5)], [250, Y(5.2)], [300, Y(5.2)], [302, Y(-2)], [400, Y(-2)], [400, 240], [0, 240],
    ];
    const parts: SVGElement[] = [
      svg('polygon', { points: ground.map((p) => p.join(',')).join(' '), fill: COL.land, opacity: 0.5 }),
      // The Duwamish, low on the left.
      svg('rect', { x: 0, y: Y(1.4), width: 40, height: Y(0.8) - Y(1.4), fill: COL.water }),
      // Lake Washington.
      svg('polygon', { points: `${Math.min(118 + (L - LAKE.sill) * 6, 122)},${Y(L)} 230,${Y(L)} 226,236 124,236`, fill: COL.water, opacity: 0.85 }),
      // The old level and a dock built for it.
      line(112, Y(LAKE.before), 232, Y(LAKE.before), COL.soft, 1, { 'stroke-dasharray': '4 3' }),
      small(196, Y(LAKE.before) - 5, 'the lake before 1916', { anchor: 'middle', soft: true }),
      svg('rect', { x: 132, y: Y(LAKE.before + 0.4), width: 34, height: 3, fill: COL.works }),
      ...[136, 152, 164].map((x) => line(x, Y(LAKE.before + 0.4), x, Y(4.6), COL.works, 1.6)),
      small(130, Y(LAKE.before + 0.4) - 18, 'dock', { fill: COL.works }),
      // Lake Union and Salmon Bay, held by the locks.
      svg('rect', { x: 248, y: Y(union), width: 54, height: Y(5.2) - Y(union), fill: COL.water, opacity: 0.85 }),
      svg('polygon', { points: `230,${Y(L)} 248,${Y(union)} 248,${Y(5)} 230,${Y(5)}`, fill: COL.water, opacity: 0.85 }),
      // The locks' gate and the Sound.
      svg('rect', { x: 300, y: Y(union + 0.6), width: 6, height: Y(-2) - Y(union + 0.6), fill: COL.works }),
      svg('rect', { x: 306, y: Y(1.5), width: 94, height: Y(-2) - Y(1.5), fill: COL.salt, opacity: 0.85 }),
      // The scale.
      ...[4, 8].map((h) => small(392, Y(h) + 3, units === 'metric' ? `${h} m` : `${Math.round(h * 3.28)} ft`, { anchor: 'end', soft: true })),
      small(6, 16, 'South', { bold: true }),
      small(392, 16, 'North and west', { bold: true, anchor: 'end' }),
      small(6, Y(1.4) - 30, 'Duwamish'),
      small(52, Y(LAKE.sill) - 18, 'Black River', { fill: COL.water, bold: true }),
      small(170, Y(L) + 22, 'Lake Washington', { anchor: 'middle', bold: true, fill: COL.paper }),
      small(176, 228, 'goes on down to 65 m', { anchor: 'middle', fill: COL.paper }),
      small(222, Y(5) + 14, 'Montlake', { anchor: 'middle' }),
      small(222, Y(5) + 25, 'Cut', { anchor: 'middle' }),
      small(274, Y(5.2) + 14, 'Lake Union', { anchor: 'middle' }),
      small(303, Y(union + 0.6) - 6, 'locks', { anchor: 'middle', fill: COL.works, bold: true }),
      small(352, Y(1.5) + 16, 'the Sound', { anchor: 'middle', fill: COL.paper }),
    ];
    if (blackW > 0) {
      parts.push(svg('polyline', { points: `118,${Y(L) + 1} 104,${Y(LAKE.sill) - 1} 40,${Y(1.2)}`, fill: 'none', stroke: COL.water, 'stroke-width': blackW, 'stroke-linejoin': 'round' }));
      parts.push(arrow(98, Y(7.4), 70, Y(4.9), COL.flow, 1.4));
    } else {
      parts.push(small(68, Y(5.8), 'dry bed', { anchor: 'middle', fill: COL.bad }));
    }
    if (o.cut > 0.05) parts.push(arrow(218, Y(L) + 8, 262, Y(union) + 8, COL.flow, Math.min(5, cutW / 1.6)));
    redraw(g, ...parts);
    if (!open()) return;
    const fell = LAKE.before - L;
    f.readout.textContent = `Day ${day} after the cut opens. Lake Washington stands ${height(L, units)} above low tide in the Sound, ${metresOrFeet(Math.max(0, fell), units)} ${fell >= 0 ? 'lower' : 'higher'} than before. Black River: ${flow(o.black, units)}. Montlake Cut: ${flow(Math.max(0, o.cut), units)}.${o.black < 0.05 && day > 0 ? ' The lake has fallen below the Black River’s bed, and the river has nothing to carry.' : ''}`;
    if (t.goal === 'dry' && day > 0 && o.black < 0.05) t.done();
  };
  const days = slider('Days after the cut opens', 0, 120, 1, day, (v) => `${v}`, (v) => { day = v; paint(); }, 'flow');
  const play = player(days, ctx, { seconds: 10 });
  const locks = slider('Locks hold Lake Union at', 5.5, 9, 0.1, union, (v) => height(v, units), (v) => { union = v; paint(); }, 'works');
  f.controls.append(play.node, days.node, locks.node);
  const open = guessFirst(t, f, {
    ask: 'A new outlet opens at the north end of the lake, lower than the old one at the south end. What happens to the Black River, the old outlet?',
    options: ['It keeps running, a little weaker', 'It stops running altogether', 'It turns round and runs into the lake'],
    answer: 1,
    sliders: [days, locks],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The salt water at the locks (still) -----------------------------------------------------

export const locksStill = () => {
  const s = still(W, 216);
  const Y = (h: number) => 40 + (8 - h) * 7;
  const floor = Y(-14);
  const gateD = 134;
  const gateU = 238;
  const fresh = 6.4;
  const tide = 1;
  const pipe = 209;
  const parts: SVGElement[] = [
    svg('rect', { x: 0, y: floor, width: W, height: 216 - floor, fill: COL.land, opacity: 0.5 }),
    // The Sound below the locks, at a low tide.
    svg('rect', { x: 0, y: Y(tide), width: gateD, height: floor - Y(tide), fill: COL.salt, opacity: 0.9 }),
    // The chamber, raised to the lake's level, with sea water still on its floor.
    svg('rect', { x: gateD, y: Y(fresh), width: gateU - gateD, height: floor - Y(fresh), fill: COL.water, opacity: 0.85 }),
    svg('rect', { x: gateD, y: Y(-9.6), width: gateU - gateD - 18, height: floor - Y(-9.6), fill: COL.salt, opacity: 0.95 }),
    // Salmon Bay, with the salt wedge along its floor.
    svg('rect', { x: gateU, y: Y(fresh), width: W - gateU, height: floor - Y(fresh), fill: COL.water, opacity: 0.85 }),
    svg('polygon', { points: `${gateU},${floor} ${gateU},${Y(-11.2)} 320,${Y(-12.6)} ${W},${Y(-13.4)} ${W},${floor}`, fill: COL.salt, opacity: 0.95 }),
    // A boat just lifted.
    svg('polygon', { points: `158,${Y(fresh)} 214,${Y(fresh)} 207,${Y(fresh) + 7} 165,${Y(fresh) + 7}`, fill: COL.ink }),
    svg('rect', { x: 176, y: Y(fresh) - 8, width: 18, height: 8, fill: COL.ink }),
    // The lower gates shut; the upper gates open, folded back against the wall.
    svg('rect', { x: gateD - 4, y: Y(8), width: 8, height: floor - Y(8), fill: COL.works }),
    svg('rect', { x: gateU - 3, y: Y(8), width: 6, height: 14, fill: COL.works, opacity: 0.5 }),
    // The barrier on the chamber's floor, near the upper gates.
    svg('rect', { x: gateU - 20, y: Y(-8), width: 6, height: floor - Y(-8), fill: COL.works }),
    // The drain: an intake on the bay's floor, piped back below the locks.
    svg('rect', { x: 290, y: floor - 5, width: 24, height: 5, fill: COL.works }),
    svg('polyline', { points: `302,${floor} 302,${pipe} 60,${pipe} 60,${floor}`, fill: 'none', stroke: COL.works, 'stroke-width': 4 }),
    arrow(210, pipe, 130, pipe, COL.flow, 1.4),
    arrow(60, pipe - 4, 60, floor - 12, COL.flow, 1.4),
    arrow(296, Y(-12.2) + 3, 372, Y(-13.2) + 3, COL.flow, 1.2),
    // The lift.
    line(gateD - 12, Y(fresh), gateD - 12, Y(tide), COL.soft, 0.8, { 'stroke-dasharray': '2 2' }),
    line(gateD - 16, Y(fresh), gateD - 8, Y(fresh), COL.soft, 0.8),
    small(gateD - 18, (Y(fresh) + Y(tide)) / 2 + 3, 'the lift', { anchor: 'end', soft: true }),
    // Words.
    small(8, Y(tide) + 16, 'Puget Sound', { bold: true, fill: COL.paper }),
    small(8, Y(tide) + 28, 'at low tide', { fill: COL.paper }),
    label(186, 30, 'Lock chamber', { size: 'small', anchor: 'middle', bold: true }),
    small(W - 6, 30, 'Salmon Bay, at the lake\u2019s level', { anchor: 'end', bold: true, fill: COL.water }),
    small(gateD + 6, floor - 8, 'sea water left behind', { fill: COL.paper }),
    small(gateU - 17, Y(-8) - 5, 'barrier', { anchor: 'middle', fill: COL.paper, bold: true }),
    small(W - 6, Y(-11) - 4, 'salt wedge creeping upstream', { anchor: 'end', fill: COL.paper }),
    small(310, pipe - 6, 'drain', { fill: COL.works, bold: true }),
    small(130, pipe - 7, 'back to the Sound', { anchor: 'middle', fill: COL.works }),
  ];
  s.svg.append(...parts);
  return { node: s.node };
};

export const figures: Record<string, FigureFactory> = {
  'lowering-outlet': outletFigure,
  'lowering-locks': locksStill,
};
