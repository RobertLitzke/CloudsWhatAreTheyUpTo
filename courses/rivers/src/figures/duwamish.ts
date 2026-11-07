// Branch S3, Straightening the Duwamish: the lower river as it wound across
// its tideflats in 1900 and as the dredged waterway it is now, with how far
// salt water creeps up its bed as the river's flow changes.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { length } from 'didactics/units';
import { big, COL, figure, frame, guessFirst, pick, sig, slider, type FigureFactory } from './kit';

const W = 400;

/** How far up the valley the figure runs, km: from Elliott Bay to about Tukwila. */
export const VALLEY = 12;

/** Mean tide in Elliott Bay, metres above low tide (the river's surface near the mouth, in the model). */
export const MEAN_TIDE = 2;

/** The river's height at the top of the figure, m, for its fall. */
export const HEAD = 5;

export type Era = 'old' | 'now';

/**
 * The model channel at `s` km up the valley: how much longer the channel is
 * than the valley there (its sinuosity), its bed's height in metres above low
 * tide, and its width in metres. In 1900 the river wound across the lower
 * 8 km of valley in meanders, its bed shallow. The waterway runs straight
 * over that stretch, dredged to about 9 m below low tide at the mouth and
 * wider, then climbs back to the river's own bed by about 9.5 km.
 */
export function channelAt(era: Era, s: number): { sinuosity: number; bed: number; width: number } {
  const natural = -1 + (5 * s) / VALLEY;
  if (era === 'old') return { sinuosity: s < 8 ? 1.8 : 1.3, bed: natural, width: s < 8 ? 60 : 50 };
  if (s < 8) return { sinuosity: 1, bed: -9 + (4.5 * s) / 8, width: 120 };
  if (s < 9.5) {
    const top = -1 + (5 * 9.5) / VALLEY;
    return { sinuosity: 1.3, bed: -4.5 + ((top + 4.5) * (s - 8)) / 1.5, width: 50 };
  }
  return { sinuosity: 1.3, bed: natural, width: 50 };
}

/** The channel's length, km, from the mouth to `s` km up the valley. */
export function channelLength(era: Era, s: number = VALLEY): number {
  let km = 0;
  const ds = 0.01;
  for (let x = 0; x < s - 1e-9; x += ds) km += channelAt(era, x + ds / 2).sinuosity * Math.min(ds, s - x);
  return km;
}

/** The river's fall along its channel, metres per km, from HEAD at the top of the figure to mean tide at the mouth. */
export const fallPerKm = (era: Era) => (HEAD - MEAN_TIDE) / channelLength(era);

/**
 * How far up the valley salt water reaches along the bed, km, with the river
 * running `flow` m³/s. Sea water is heavier than river water (lesson 12) and
 * slides upstream under it wherever the river is too slow to push it back. In
 * this model it stops where the channel has grown too shallow: where the
 * river, squeezed into the depth left, would run faster than about a third of
 * the speed a wave runs along the boundary between the two layers. That speed
 * is √(g′d), with g′ the pull of gravity scaled by the difference in density.
 */
export function saltReach(era: Era, flow: number): number {
  const gPrime = 0.15;
  const ds = 0.01;
  for (let s = 0; s <= VALLEY; s += ds) {
    const c = channelAt(era, s);
    const depth = MEAN_TIDE - c.bed;
    if (depth <= 0) return s;
    const speed = flow / (c.width * depth);
    if (speed > 0.3 * Math.sqrt(gPrime * depth)) return s;
  }
  return VALLEY;
}

export const channelFigure = figure(['compare'], (ctx, t) => {
  const units = ctx.save.units;
  const f = frame(W, 256, 3);
  const g = svg('g');
  f.svg.append(g);
  let era: Era = 'old';
  let flow = 15;
  const seen = { old: false, now: false };
  const x0 = 22;
  const perKm = (W - x0 - 14) / VALLEY;
  const X = (s: number) => x0 + s * perKm;
  const mid = 70;
  // The plan: a wavy line whose sinuosity matches the model's.
  const planY = (e: Era, s: number) => {
    const c = channelAt(e, s);
    const amp = c.sinuosity > 1.5 ? 20 : c.sinuosity > 1.05 ? 10 : 0;
    return mid + amp * Math.sin((2 * Math.PI * s) / 1.6);
  };
  const Z = (z: number) => 146 + (5.5 - z) * 6.8;
  const paint = () => {
    const reach = saltReach(era, flow);
    const plan: SVGElement[] = [];
    const steps = 360;
    let prev: [number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * VALLEY;
      const p: [number, number] = [X(s), planY(era, s)];
      if (prev) plan.push(line(prev[0], prev[1], p[0], p[1], s <= reach ? COL.salt : COL.water, era === 'now' && s < 8 ? 6 : 3.2));
      prev = p;
    }
    // The profile along the valley.
    const bed: [number, number][] = [];
    for (let i = 0; i <= 120; i++) {
      const s = (i / 120) * VALLEY;
      bed.push([X(s), Z(channelAt(era, s).bed)]);
    }
    const surfaceAt = (s: number) => MEAN_TIDE + ((HEAD - MEAN_TIDE) * Math.max(0, s - 6)) / (VALLEY - 6);
    const surf: [number, number][] = bed.map(([x], i) => [x, Z(surfaceAt((i / 120) * VALLEY))]);
    const wet = [...surf, ...bed.slice().reverse()];
    const wedge: [number, number][] = [[X(0), Z(MEAN_TIDE - 1)]];
    for (let i = 0; i <= 60; i++) {
      const s = (i / 60) * reach;
      const b = channelAt(era, s).bed;
      const top = MEAN_TIDE - 1 - (s / Math.max(reach, 0.01)) * (MEAN_TIDE - 1 - b);
      wedge.push([X(s), Z(Math.max(b, top))]);
    }
    for (let i = 60; i >= 0; i--) {
      const s = (i / 60) * reach;
      wedge.push([X(s), Z(channelAt(era, s).bed)]);
    }
    redraw(g,
      // Plan.
      svg('rect', { x: x0, y: 22, width: W - x0 - 14, height: 96, fill: COL.land, opacity: 0.18, rx: 4 }),
      svg('rect', { x: 0, y: 22, width: x0, height: 96, fill: COL.salt, opacity: 0.9 }),
      ...(era === 'now' ? [svg('rect', { x: x0, y: 30, width: 26, height: 30, fill: COL.works, opacity: 0.5 }), small(x0 + 2, 26, 'Harbor Island (fill)', { fill: COL.works })] : [small(x0 + 2, 26, 'tideflats', { soft: true })]),
      ...plan,
      small(6, 16, 'Elliott Bay', { bold: true, fill: COL.salt }),
      small(W - 8, 16, 'up the valley, toward Tukwila', { anchor: 'end', bold: true }),
      ...[0, 4, 8, 12].map((s) => small(X(s), 130, units === 'metric' ? `${s} km` : `${sig(s * 0.621, 2)} mi`, { anchor: s === 12 ? 'end' : s === 0 ? undefined : 'middle', soft: true })),
      // Profile.
      svg('polygon', { points: [...bed, [X(VALLEY), 252], [X(0), 252]].map((p) => p.join(',')).join(' '), fill: COL.sediment, opacity: 0.45 }),
      svg('polygon', { points: wet.map((p) => p.join(',')).join(' '), fill: COL.water, opacity: 0.8 }),
      ...(reach > 0.02 ? [svg('polygon', { points: wedge.map((p) => p.join(',')).join(' '), fill: COL.salt, opacity: 0.95 })] : []),
      svg('rect', { x: 0, y: Z(MEAN_TIDE), width: x0, height: 252 - Z(MEAN_TIDE), fill: COL.salt, opacity: 0.9 }),
      small(x0 + 4, 144, 'Along the bed: river water (light) over sea water (dark)', { bold: true }),
      line(X(reach), Z(MEAN_TIDE) - 4, X(reach), 252, COL.flow, 1.2, { 'stroke-dasharray': '3 2' }),
    );
    if (!open()) return;
    if (flow <= 20) seen[era] = true;
    const name = era === 'old' ? 'The river in 1900' : 'Today’s waterway';
    const lenWords = length(channelLength(era) * 1000, units);
    const fall = fallPerKm(era);
    const fallWords = units === 'metric' ? `${sig(fall * 100, 2)} cm per km` : `${sig(fall * 63.36, 2)} inches per mile`;
    const flowWords = units === 'metric' ? `${Math.round(flow)} m³/s` : `${big(flow * 35.31)} ft³/s`;
    f.readout.textContent = `${name}, carrying ${flowWords}: ${lenWords} of channel for ${length(VALLEY * 1000, units)} of valley, falling ${fallWords}. Salt water creeps ${reach < 0.05 ? 'no way up it; the river holds it at the mouth' : `${length(reach * 1000, units)} up the valley along the bed`}.`;
    if (t.goal === 'compare' && seen.old && seen.now) t.done();
  };
  const which = pick(['1900: meanders', 'Today: the waterway'], 0, (i) => { era = i === 0 ? 'old' : 'now'; paint(); });
  const fs = slider('River flow', { min: 5, max: 400, scale: 'log', value: flow, show: (v) => (units === 'metric' ? `${Math.round(v)} m³/s` : `${big(v * 35.31)} ft³/s`), onInput: (v) => { flow = v; paint(); }, color: 'water' });
  f.controls.append(which.node, fs.node);
  const open = guessFirst(t, f, {
    ask: 'Late summer, the river at its lowest. Compared with the winding river of 1900, how far up the valley does salt water creep along the bed of today’s straight, dredged waterway?',
    options: ['Less far', 'About as far', 'Much farther'],
    answer: 2,
    reveal: 'done',
    sliders: [fs],
    buttons: which.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'duwamish-channel': channelFigure,
};
