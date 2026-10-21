// Figures for reading an approaching front: a storm seen from above, what a
// barometer weighs, a whole storm going over a town hour by hour with the
// barograph tracing it, how a front's steepness sets its cloud and rain, the
// crossed-winds rule, and what the Cascades wring out of a Pacific storm.

import { DRY_RATE } from '../../core/air';
import { compass, crossRange, frontLift, stormSky, stormWeather, BASIN_M, COAST_C, coldSurfaceM, warmSurfaceM, WARM_SECTOR_H } from '../../core/storm';
import { genus, type GenusId } from '../../core/clouds';
import {  svg } from '../dom';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { arrow, curve, heading, label, line, note, points, polyline, redraw, still, type P } from './draw';
import { COL, animate, figure, frame, height, slider, type FigureFactory } from './kit';

// ---- Shared bits ------------------------------------------------------------

/** The land on a weather map, and an occluded front on it. */
const MAP = '#eef0e6';
const OCCLUDED = '#8a3fa0';

/**
 * A front as drawn on a weather map: a line with half-moons (warm) or
 * triangles (cold) on the side it is moving towards. `side` is 1 or -1, for
 * the left or right of the line's direction of drawing.
 */
function frontOnMap(pts: P[], kind: 'warm' | 'cold', side: 1 | -1, tint?: string): SVGElement {
  const color = tint ?? (kind === 'warm' ? COL.red : COL.blue);
  const g = svg('g', {}, polyline(pts, color, 3));
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    run += Math.hypot(x1 - x0, y1 - y0);
    if (run < 18) continue;
    run = 0;
    const a = Math.atan2(y1 - y0, x1 - x0);
    const nx = -Math.sin(a) * side;
    const ny = Math.cos(a) * side;
    if (kind === 'warm') {
      const r = 6;
      g.append(svg('path', {
        d: `M${x1 - r * Math.cos(a)},${y1 - r * Math.sin(a)} A${r},${r} 0 0 ${side === 1 ? 0 : 1} ${x1 + r * Math.cos(a)},${y1 + r * Math.sin(a)} Z`,
        fill: color,
      }));
    } else {
      const s = 6;
      g.append(svg('polygon', { points: `${x1 - s * Math.cos(a)},${y1 - s * Math.sin(a)} ${x1 + s * Math.cos(a)},${y1 + s * Math.sin(a)} ${x1 + nx * 9},${y1 + ny * 9}`, fill: color }));
    }
  }
  return g;
}

/** A little wheat town: a grain elevator and two houses, standing on y. */
function town(x: number, y: number, color: string = COL.ink): SVGElement {
  return svg('g', {},
    svg('rect', { x: x - 3, y: y - 20, width: 7, height: 20, fill: color }),
    svg('polygon', { points: `${x - 4},${y - 20} ${x + 0.5},${y - 26} ${x + 5},${y - 20}`, fill: color }),
    svg('rect', { x: x - 13, y: y - 7, width: 8, height: 7, fill: color }),
    svg('polygon', { points: `${x - 14},${y - 7} ${x - 9},${y - 11} ${x - 4},${y - 7}`, fill: color }),
    svg('rect', { x: x + 7, y: y - 6, width: 7, height: 6, fill: color }),
  );
}

// ---- A storm seen from above ------------------------------------------------

export const lowMapDiagram: FigureFactory = () => {
  const d = still(400, 290);
  const L: P = [150, 92];
  const warm = curve([L[0] + 4, L[1] + 2], [235, 100], [312, 176]);
  const cold = curve([L[0] - 2, L[1] + 6], [150, 170], [84, 236]);
  const sector = [...warm, [300, 258], [100, 258], ...[...cold].reverse()] as P[];
  const ring = (rx: number, ry: number) => svg('ellipse', { cx: L[0] + 10, cy: L[1] + 8, rx, ry, fill: 'none', stroke: COL.env, 'stroke-width': 1, opacity: 0.45 });
  // Winds blow anticlockwise round a low (in the northern half of the world), a little in towards it.
  const winds: SVGElement[] = [];
  for (const [a, r] of [[0.3, 112], [1.4, 96], [2.5, 104], [3.6, 110], [4.6, 92], [5.5, 100]] as [number, number][]) {
    const x = L[0] + 10 + Math.cos(a) * r * 1.3;
    const y = L[1] + 8 + Math.sin(a) * r * 0.85;
    const tx = Math.sin(a) * 1.3;
    const ty = -Math.cos(a) * 0.85;
    const len = 22 / Math.hypot(tx, ty);
    winds.push(arrow(x, y, x + (tx - Math.cos(a) * 0.5) * len, y + (ty - Math.sin(a) * 0.45) * len, COL.soft, 1.4));
  }
  // The town's path through the storm: the storm drifts east over it, so the
  // town meets the storm's parts from east to west.
  const trackY = 150;
  const stop = (x: number, n: string, text: string) => svg('g', {},
    svg('circle', { cx: x, cy: trackY, r: 7, fill: COL.ink }),
    heading(x, trackY + 3.5, n, { fill: '#fff' }),
    note(x, trackY + 19, text, { anchor: 'middle', fill: COL.ink }),
  );
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 258, fill: MAP }),
    svg('polygon', { points: points(sector), fill: '#f8d9c6', opacity: 0.8 }),
    // The cloud shield: wide ahead of the warm front, a narrow band along the cold one.
    svg('path', { d: `M150,70 Q260,40 370,110 Q380,170 320,190 Q270,150 230,112 Q190,96 150,92 Z`, fill: '#ffffff', opacity: 0.85, stroke: COL.cloudShade }),
    svg('path', { d: `M150,92 Q160,170 92,240 L74,232 Q136,170 138,96 Z`, fill: '#ffffff', opacity: 0.85, stroke: COL.cloudShade }),
    ring(40, 28), ring(78, 54), ring(120, 82), ring(165, 112),
    ...winds,
    frontOnMap(warm, 'warm', 1),
    frontOnMap(cold, 'cold', -1),
    label(L[0] - 18, L[1] + 4, 'L', { bold: true, fill: COL.red, attrs: { 'font-size': 18 } }),
    note(L[0] - 50, L[1] - 26, 'low pressure', { fill: COL.redInk }),
    note(8, 250, 'rings: isobars, lines of equal pressure', { soft: true }),
    note(262, 64, 'cloud shield', { soft: true, anchor: 'middle' }),
    note(300, 196, 'warm front', { fill: COL.redInk }),
    note(118, 214, 'cold front', { fill: COL.blue }),
    note(196, 236, 'warm sector', { anchor: 'middle', fill: COL.warmInk }),
    note(26, 120, 'cold air', { fill: COL.blue }),
    note(336, 234, 'cold air', { fill: COL.blue }),
    line(368, trackY, 70, trackY, COL.ink, 1.3, { 'stroke-dasharray': '4 3' }),
    stop(330, '1', 'ahead'), stop(222, '2', 'warm sector'), stop(100, '3', 'behind'),
    town(380, trackY - 6),
    note(392, trackY + 8, 'town', { anchor: 'end' }),
    note(392, 22, 'N ↑', { anchor: 'end' }),
    // A key strip.
    svg('rect', { x: 0, y: 258, width: 400, height: 32, fill: COL.paper }),
    frontOnMap([[10, 278], [24, 278], [38, 278], [52, 278]], 'warm', 1),
    note(58, 281, 'warm front'),
    frontOnMap([[120, 278], [134, 278], [148, 278], [162, 278]], 'cold', 1),
    note(168, 281, 'cold front'),
    arrow(232, 277, 262, 277, COL.ink, 2),
    note(268, 274, 'the storm drifts east,'),
    note(268, 286, 'about 30 km an hour'),
  );
  return { node: d.node };
};

// ---- What a barometer weighs ------------------------------------------------

export const barometerDiagram: FigureFactory = () => {
  const d = still(400, 250);
  const ground = 222;
  const tubeX = 236;
  const top = 34;
  const hg = 104; // the mercury's top
  const dish = 200; // the mercury's surface in the dish
  // A magnified scale beside the top of the column, as on a real barometer.
  const sx = 262;
  const yOfP = (p: number) => hg - (p - 1013) * 1.2;
  const mark = (p: number, word: string) => svg('g', {},
    line(sx, yOfP(p), sx + 8, yOfP(p), COL.ink, 1),
    note(sx + 12, yOfP(p) + 3.5, `${p}`, { bold: true }),
    note(sx + 40, yOfP(p) + 3.5, word, { soft: true }),
  );
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 250, fill: COL.air }),
    svg('rect', { x: 0, y: ground, width: 400, height: 28, fill: COL.ground }),
    // A column of air standing on a patch of ground, thinning upward.
    ...Array.from({ length: 9 }, (_, i) => svg('rect', { x: 30, y: 24 + i * 22, width: 60, height: 22, fill: COL.env, opacity: 0.06 + i * 0.045 })),
    svg('rect', { x: 30, y: 24, width: 60, height: ground - 24, fill: 'none', stroke: COL.env, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
    arrow(60, 150, 60, ground - 4, COL.env, 2.5),
    note(60, 10, 'all the air above,', { anchor: 'middle', fill: COL.env }),
    note(60, 21, 'up to the top', { anchor: 'middle', fill: COL.env }),
    note(96, 60, 'thin up high', { soft: true }),
    note(96, 198, 'squeezed', { soft: true }),
    note(96, 210, 'dense', { soft: true }),
    note(30, ground + 18, 'each square metre: about 10 tonnes of air', { fill: '#fff' }),
    // The two weigh the same.
    heading(150, 118, '=', { fill: COL.env, attrs: { 'font-size': 30 } }),
    note(150, 136, 'weigh', { anchor: 'middle', fill: COL.env }),
    note(150, 148, 'the same', { anchor: 'middle', fill: COL.env }),
    // A mercury barometer: a glass tube, closed at the top, standing in a dish of mercury.
    svg('path', { d: `M${tubeX - 44},${dish - 10} L${tubeX - 44},${dish + 16} Q${tubeX - 44},${dish + 20} ${tubeX - 40},${dish + 20} L${tubeX + 40},${dish + 20} Q${tubeX + 44},${dish + 20} ${tubeX + 44},${dish + 16} L${tubeX + 44},${dish - 10}`, fill: 'none', stroke: COL.soft, 'stroke-width': 2 }),
    svg('rect', { x: tubeX - 43, y: dish, width: 86, height: 19, fill: '#9aa3ad' }),
    svg('rect', { x: tubeX - 8, y: top, width: 16, height: dish + 10 - top, rx: 7, fill: '#ffffff', stroke: COL.soft, 'stroke-width': 1.5 }),
    svg('rect', { x: tubeX - 5, y: hg, width: 10, height: dish + 10 - hg, fill: '#9aa3ad' }),
    note(tubeX - 12, top + 10, 'empty:', { anchor: 'end' }),
    note(tubeX - 12, top + 22, 'nothing', { anchor: 'end' }),
    note(tubeX - 12, top + 34, 'pressing', { anchor: 'end' }),
    note(tubeX - 12, hg + 18, 'mercury', { anchor: 'end' }),
    note(tubeX - 12, hg + 30, '760 mm', { bold: true, anchor: 'end' }),
    note(tubeX - 12, hg + 42, '(29.92 in)', { anchor: 'end' }),
    arrow(tubeX - 58, dish - 26, tubeX - 30, dish - 2, COL.env, 2),
    arrow(tubeX + 62, dish - 22, tubeX + 30, dish - 2, COL.env, 2),
    note(tubeX + 52, dish - 52, 'the air presses on the', { fill: COL.env }),
    note(tubeX + 52, dish - 40, 'open dish and holds', { fill: COL.env }),
    note(tubeX + 52, dish - 28, 'the column up', { fill: COL.env }),
    // The scale.
    svg('rect', { x: sx - 2, y: yOfP(1040) - 22, width: 136, height: yOfP(975) - yOfP(1040) + 30, rx: 5, fill: '#ffffff', stroke: COL.cloudShade }),
    note(sx + 4, yOfP(1040) - 10, 'hPa, magnified 12 times', { soft: true }),
    line(tubeX + 5, hg, sx, yOfP(1013), COL.ink, 1, { 'stroke-dasharray': '2 2' }),
    mark(1035, 'fair: a high'), mark(1013, 'average'), mark(995, 'rain'), mark(980, 'a deep storm'),
  );
  return { node: d.node };
};

export const barographDiagram: FigureFactory = () => {
  const d = still(400, 200);
  const drum = { x: 230, y: 40, w: 150, h: 110 };
  // A week of pressure on the chart: steady, then a storm's fall and sharp rise.
  const trace: P[] = [];
  for (let i = 0; i <= 60; i++) {
    const k = i / 60;
    const p = k < 0.35 ? 1018 : k < 0.7 ? 1018 - ((k - 0.35) / 0.35) * 14 : k < 0.78 ? 1004 + ((k - 0.7) / 0.08) * 8 : 1012 + (k - 0.78) * 12;
    trace.push([drum.x + 8 + k * (drum.w - 16), drum.y + drum.h / 2 - (p - 1010) * 2.6]);
  }
  const penX = drum.x + 8 + 0.62 * (drum.w - 16);
  const penY = trace[Math.round(0.62 * 60)][1];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 200, fill: '#f2ede2' }),
    svg('rect', { x: 20, y: 160, width: 370, height: 12, rx: 3, fill: '#8a6a45' }),
    // The drum, with its chart.
    svg('rect', { x: drum.x, y: drum.y, width: drum.w, height: drum.h, rx: 6, fill: '#ffffff', stroke: COL.soft, 'stroke-width': 1.5 }),
    ...[0.25, 0.5, 0.75].map((k) => line(drum.x + 4, drum.y + drum.h * k, drum.x + drum.w - 4, drum.y + drum.h * k, COL.grid, 1)),
    ...[1, 2, 3, 4, 5, 6].map((k) => line(drum.x + (drum.w * k) / 7, drum.y + 4, drum.x + (drum.w * k) / 7, drum.y + drum.h - 4, COL.grid, 1)),
    polyline(trace.slice(0, Math.round(0.62 * 60) + 1), COL.env, 2),
    svg('rect', { x: drum.x + drum.w / 2 - 10, y: drum.y + drum.h, width: 20, height: 10, fill: COL.soft }),
    // The capsules, the lever and the pen.
    ...[0, 1, 2, 3].map((i) => svg('ellipse', { cx: 70, cy: 148 - i * 12, rx: 30, ry: 6, fill: '#c9c2b0', stroke: COL.soft })),
    line(70, 112, 70, 98, COL.ink, 2.5),
    svg('circle', { cx: 40, cy: 98, r: 4, fill: COL.ink }),
    line(40, 98, penX, penY, COL.ink, 2),
    svg('polygon', { points: `${penX - 2},${penY - 5} ${penX + 4},${penY} ${penX - 2},${penY + 5}`, fill: COL.env }),
    note(108, 146, 'sealed, emptied capsules:', { bold: true }),
    note(108, 157, 'squeezed thinner as pressure rises'),
    note(drum.x + 6, drum.y + 14, 'high', { soft: true }),
    note(drum.x + 6, drum.y + drum.h - 20, 'low', { soft: true }),
    note(drum.x + 6, drum.y + drum.h - 6, 'Mon', { soft: true }),
    note(drum.x + drum.w - 6, drum.y + drum.h - 6, 'Sun', { soft: true, anchor: 'end' }),
    note(56, 84, 'a long lever magnifies the movement'),
    note(drum.x + drum.w, drum.y - 8, 'paper drum: clockwork turns it once a week', { anchor: 'end' }),
    note(drum.x + drum.w / 2, 190, 'the pen draws the week’s pressure', { anchor: 'middle', fill: COL.env }),
  );
  return { node: d.node };
};

// ---- A whole storm goes by --------------------------------------------------

const SKY_FILL: Partial<Record<GenusId, string>> = {
  cirrus: '#ffffff',
  cirrostratus: '#eef0f7',
  altostratus: '#c6c3d6',
  nimbostratus: '#8f8aa6',
  stratocumulus: '#f4f2f8',
  cumulus: '#ffffff',
  cumulonimbus: '#f4f2f8',
};

function hoursText(h: number): string {
  if (h < 0) return `${-h} hour${h === -1 ? '' : 's'} before the warm front`;
  if (h === 0) return 'The warm front is here';
  if (h < WARM_SECTOR_H) return `${h} hour${h === 1 ? '' : 's'} after the warm front`;
  if (h === WARM_SECTOR_H) return 'The cold front is here';
  return `${h - WARM_SECTOR_H} hour${h - WARM_SECTOR_H === 1 ? '' : 's'} after the cold front`;
}

function skyText(h: number): string {
  const s = stormSky(h);
  if (s.genus === 'clear') return h > 0 ? 'Clearing from the west, crisp and gusty.' : 'Blue sky.';
  const name = genus(s.genus).name.toLowerCase();
  switch (s.genus) {
    case 'cirrus': return 'Cirrus hooks spreading in from the west.';
    case 'cirrostratus': return 'A milky cirrostratus veil, with a halo.';
    case 'altostratus': return 'Altostratus: the sun a dim disc, no shadows.';
    case 'nimbostratus': return 'Nimbostratus: steady rain.';
    case 'stratocumulus': return 'Muggy, with grey stratocumulus.';
    case 'cumulonimbus': return 'A line of cumulonimbus: a squall of heavy showers.';
    case 'cumulus': return 'Cool, with bright heaps of cumulus.';
    default: return `${name}.`;
  }
}

const SKY_INK: Partial<Record<GenusId, string>> = { nimbostratus: '#ffffff', altostratus: COL.ink };

export const frontPassFigure = figure(['pass'], (ctx, t) => {
  const W = 400;
  const H = 326;
  const f = frame(W, H, 5);
  const ground = 196;
  const kmPx = 14.5; // vertical: 12 km in 174 px
  const hourPx = 4.4; // horizontal: 30 km in 4.4 px, so heights are stretched about 100 times
  const townX = 300;
  const yOf = (m: number) => ground - (m / 1000) * kmPx;
  const xs = Array.from({ length: 135 }, (_, i) => i * 3);
  const g = svg('g');
  const baro = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.air }), g, baro);
  const units = ctx.save.units;
  // The barograph: the pen traces pressure against time as the storm goes by.
  const bx0 = 34;
  const bx1 = 392;
  const by0 = 300;
  const by1 = 248;
  const H0 = -40;
  const H1 = 24;
  const bxOf = (h: number) => bx0 + ((h - H0) / (H1 - H0)) * (bx1 - bx0);
  const byOf = (p: number) => by0 - ((p - 1000) / 22) * (by0 - by1);
  const paint = (h: number) => {
    const tau = (x: number) => h + (townX - x) / hourPx;
    const parts: SVGElement[] = [];
    const tags: SVGElement[] = [];
    // The air masses: cold under the warm front's ramp and behind the cold front, warm between.
    const warmTop: P[] = xs.map((x) => [x, yOf(Math.min(11000, warmSurfaceM(tau(x))))]);
    const coldTop: P[] = xs.map((x) => [x, yOf(coldSurfaceM(tau(x)))]);
    parts.push(svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.warmAir, opacity: 0.55 }));
    parts.push(svg('polygon', { points: `0,${ground} ${points(warmTop)} ${W},${ground}`, fill: COL.cold, opacity: 0.3 }));
    parts.push(svg('polygon', { points: `0,${ground} ${points(coldTop)} ${W},${ground}`, fill: COL.cold, opacity: 0.45 }));
    parts.push(polyline(warmTop, COL.warm, 2));
    parts.push(polyline(coldTop, COL.coldInk, 2));
    // Stretches of the same cloud, for drawing sheets as one shape and naming each.
    interface Run { genus: GenusId; x0: number; x1: number; top: P[]; base: P[] }
    let run: Run | null = null;
    const runs: Run[] = [];
    for (const x of xs) {
      const sky = stormSky(tau(x));
      if (sky.genus === 'clear') {
        run = null;
        continue;
      }
      if (!run || run.genus !== sky.genus) {
        run = { genus: sky.genus, x0: x, x1: x, top: [], base: [] };
        runs.push(run);
      }
      run.x1 = x;
      run.top.push([x, yOf(sky.topM)]);
      run.base.push([x, yOf(sky.baseM)]);
    }
    const sheet = (id: GenusId) => id === 'cirrostratus' || id === 'altostratus' || id === 'nimbostratus' || id === 'stratocumulus';
    for (const r of runs.filter((r) => sheet(r.genus))) {
      const last = r.top[r.top.length - 1][0] + 3;
      r.top.push([last, r.top[r.top.length - 1][1]]);
      r.base.push([last, r.base[r.base.length - 1][1]]);
      parts.push(svg('polygon', { points: points([...r.top, ...[...r.base].reverse()]), fill: SKY_FILL[r.genus] ?? '#fff', stroke: COL.cloudShade, 'stroke-width': 0.8, opacity: 0.95 }));
      if (r.genus === 'nimbostratus') for (const [x, y] of r.base.filter((_, i) => i % 2 === 0)) parts.push(line(x, y, x - 3, ground, COL.rain, 1, { opacity: 0.7 }));
    }
    // Cirrus as streaks of falling ice, cumulus as separate heaps.
    for (const x of xs.filter((x) => x % 9 === 0)) {
      const sky = stormSky(tau(x));
      if (sky.genus === 'cirrus') parts.push(line(x + 4, yOf(sky.baseM + 900), x - 3, yOf(sky.baseM), '#ffffff', 2.4, { opacity: 0.95 }));
    }
    for (const x of xs.filter((x) => x % 33 === 0)) {
      const sky = stormSky(tau(x));
      if (sky.genus !== 'cumulus') continue;
      const y = yOf(sky.baseM);
      parts.push(svg('g', {}, ...[[-6, -4, 5], [0, -9, 7], [6, -4, 5], [0, -3, 6]].map(([dx, dy, r]) => svg('circle', { cx: x + dx, cy: y + dy, r, fill: '#ffffff', stroke: COL.cloudShade, 'stroke-width': 0.6 }))));
    }
    // The cold front's line of towers, with its anvil spread ahead (east) by the winds aloft.
    const cfX = townX - (WARM_SECTOR_H - h) * hourPx;
    if (cfX > -60 && cfX < W + 80) {
      const b0 = yOf(1000);
      const t0 = yOf(9800);
      const c = cfX + 2;
      parts.push(
        svg('path', {
          d: `M${c - 14},${b0} L${c - 15},${yOf(5000)} Q${c - 20},${yOf(7500)} ${c - 10},${yOf(8800)} Q${c - 26},${yOf(10400)} ${c - 4},${t0 - 6} Q${c + 30},${yOf(11000)} ${c + 62},${yOf(10300)} L${c + 14},${yOf(9600)} Q${c + 18},${yOf(7000)} ${c + 14},${yOf(5000)} L${c + 13},${b0} Z`,
          fill: '#f7f5fb', stroke: COL.cloudShade, 'stroke-width': 1,
        }),
        ...[-8, -3, 2, 7].map((dx) => line(c + dx, b0, c + dx - 4, ground, COL.rain, 1.8, { opacity: 0.75 })),
      );
      if (c > 92 && c < W + 10) tags.push(note(c - 20, yOf(6200), 'cumulonimbus', { bold: true, anchor: 'end', fill: COL.ink }));
    }
    // Name each stretch of cloud wide enough to hold its name.
    for (const r of runs) {
      if (r.genus === 'cumulonimbus') continue;
      const name = genus(r.genus).name.toLowerCase();
      const width = r.x1 - r.x0;
      const mid = r.top.length >> 1;
      if (width < name.length * 5.4 + 4) {
        // A narrow stretch of a deep sheet takes its name upright.
        const deep = r.base[mid][1] - r.top[mid][1];
        if (!sheet(r.genus) || deep < name.length * 5.4 + 8 || width < 12 || r.x0 < 4 || r.x1 > W - 8) continue;
        const x = (r.x0 + r.x1) / 2 + 3.5;
        const y = (r.top[mid][1] + r.base[mid][1]) / 2;
        tags.push(note(x, y, name, { bold: true, anchor: 'middle', fill: SKY_INK[r.genus] ?? COL.ink, attrs: { transform: `rotate(-90 ${x} ${y})` } }));
        continue;
      }
      const x = Math.max(4 + name.length * 2.7, Math.min(W - 4 - name.length * 2.7, (r.x0 + r.x1) / 2));
      const top = r.top[mid][1];
      const base = r.base[mid][1];
      const y = r.genus === 'cirrus' ? base + 12 : r.genus === 'cumulus' ? base + 12 : base - top < 16 ? top - 4 : (top + base) / 2 + 3.5;
      tags.push(note(x, y, name, { bold: true, anchor: 'middle', fill: SKY_INK[r.genus] ?? COL.ink }));
    }
    // The air masses and the fronts, named where they are; kept clear of the town.
    const wfX = townX - (0 - h) * hourPx;
    const nearTown = (x: number) => Math.abs(x - townX) < 44;
    const frontTag = (x: number, text: string, color: string, lift = 0) => {
      if (x < 6 || x > W - 6) return;
      const y = (nearTown(x) ? ground - 34 : ground - 6) - lift;
      const right = x > W - 60;
      tags.push(note(right ? x - 4 : x + 4, y, text, { bold: true, fill: color, anchor: right ? 'end' : undefined }));
    };
    frontTag(wfX, 'warm front', COL.redInk);
    frontTag(cfX, 'cold front', COL.blue, Math.abs(wfX - cfX) < 80 ? 14 : 0);
    const mass = (x0: number, x1: number, text: string, color: string, y: number) => {
      const a = Math.max(0, x0);
      const b = Math.min(W, x1);
      if (b - a < 70) return;
      let x = (a + b) / 2;
      if (nearTown(x)) x = x < townX ? Math.max(a + 34, townX - 74) : Math.min(b - 34, townX + 74);
      if (b - a < 70 || nearTown(x)) return;
      tags.push(note(x, y, text, { anchor: 'middle', fill: color }));
    };
    mass(wfX, W + 200, 'cold air', COL.blue, ground - 20);
    mass(cfX, wfX, 'warm sector', COL.warmInk, ground - 48);
    mass(-200, cfX, 'colder air', COL.blue, ground - 64);
    parts.push(
      line(townX, 16, townX, ground, COL.ink, 1, { 'stroke-dasharray': '3 4', opacity: 0.5 }),
      note(townX, 12, 'over the town', { anchor: 'middle' }),
      arrow(8, 9, 40, 9, COL.ink, 1.6),
      note(44, 13, 'the storm moves east'),
      ...tags,
      svg('rect', { x: 0, y: ground, width: W, height: 14, fill: COL.ground }),
      town(townX, ground),
      note(6, ground + 11, '← west', { fill: '#fff' }),
      note(W - 6, ground + 11, 'east →', { anchor: 'end', fill: '#fff' }),
    );
    redraw(g, ...parts);
    // The town's instruments, then the barograph.
    const w = stormWeather(h);
    const toward = ((w.windFrom + 180) * Math.PI) / 180; // the way the wind blows, on a map with north up
    const ax = 20;
    const ay = 233;
    const trace: P[] = [];
    for (let k = H0; k <= h; k += 0.5) trace.push([bxOf(k), byOf(stormWeather(k).hPa)]);
    const wind = units === 'metric' ? `${Math.round(w.windKmh)} km/h` : `${Math.round(w.windKmh / 1.609)} mph`;
    redraw(baro,
      svg('rect', { x: 0, y: ground + 14, width: W, height: H - ground - 14, fill: COL.paper }),
      svg('circle', { cx: ax, cy: ay, r: 11, fill: 'none', stroke: COL.grid, 'stroke-width': 1.2 }),
      note(ax + 14, ay - 7, 'N', { soft: true, anchor: 'middle' }),
      arrow(ax - Math.sin(toward) * 10, ay + Math.cos(toward) * 10, ax + Math.sin(toward) * 10, ay - Math.cos(toward) * 10, COL.soft, 2),
      note(38, ay - 1, `wind from the ${compass(w.windFrom)}, ${wind}`, { bold: true }),
      note(38, ay + 11, `${w.tempC.toFixed(0)} °C, dew point ${w.dewC.toFixed(0)} °C`, { fill: COL.dew }),
      note(W - 6, ay - 1, `${w.hPa.toFixed(0)} hPa`, { bold: true, anchor: 'end', fill: COL.env }),
      ...[1000, 1010, 1020].map((p) => line(bx0, byOf(p), bx1, byOf(p), COL.grid, 1)),
      ...[1000, 1010, 1020].map((p) => note(bx0 - 3, byOf(p) + 3, String(p), { soft: true, anchor: 'end' })),
      line(bxOf(0), by1 - 4, bxOf(0), by0, COL.warm, 1.2, { 'stroke-dasharray': '2 3' }),
      line(bxOf(WARM_SECTOR_H), by1 - 4, bxOf(WARM_SECTOR_H), by0, COL.coldInk, 1.2, { 'stroke-dasharray': '2 3' }),
      note(bxOf(0) - 3, by1 + 4, 'warm front', { anchor: 'end', fill: COL.redInk }),
      note(bxOf(WARM_SECTOR_H) + 3, by1 + 4, 'cold front', { fill: COL.blue }),
      line(bx0, by0, bx1, by0, COL.ink, 1),
      ...[-36, -24, -12, 0, 12, 24].map((k) => note(bxOf(k), by0 + 13, k === 0 ? '0 h' : k < 0 ? `${k} h` : `+${k} h`, { soft: true, anchor: 'middle' })),
      note(bx0, by0 + 24, 'hours from the warm front', { soft: true }),
      trace.length > 1 ? polyline(trace, COL.env, 2.2) : null,
      svg('circle', { cx: bxOf(h), cy: byOf(w.hPa), r: 3.5, fill: COL.env }),
    );
    const inHg = (w.hPa / 33.864).toFixed(2);
    const trend = w.tendency < -0.8 ? 'falling' : w.tendency > 0.8 ? (w.tendency > 3 ? 'rising fast' : 'rising') : 'nearly steady';
    f.readout.textContent = `${hoursText(h)}. ${skyText(h)} Barometer ${w.hPa.toFixed(0)} hPa (${inHg} in), ${trend}. Wind from the ${compass(w.windFrom)}, ${wind}. ${w.tempC.toFixed(0)} °C, dew point ${w.dewC.toFixed(0)} °C.`;
    if (t.goal === 'pass' && h >= WARM_SECTOR_H + 3) t.done();
  };
  f.controls.append(slider('Hour', H0, H1, 1, H0, (v) => (v < 0 ? `${v} h` : `+${v} h`), paint, 'env').node);
  paint(H0);
  return f.node;
});

// ---- How steep a front is ---------------------------------------------------

export const slopeFigure = figure(['towers'], (ctx, t) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 4);
  const ground = 196;
  const kmPx = 20; // vertical; horizontally 1 px is 1 km, so heights are stretched 20 times
  const nose = 330;
  const g = svg('g');
  const dots = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.warmSide }), g, dots);
  let slope = 100;
  // Bits of warm air carried up the ramp at the front's speed: the steeper the ramp, the faster they climb.
  const parcels = [0, 0.25, 0.5, 0.75].map((k) => ({ k }));
  const surfY = (x: number) => ground - Math.max(0, ((nose - x) / slope) * kmPx);
  animate(f.node, ctx, (dt) => {
    for (const p of parcels) p.k = (p.k + dt * 0.12) % 1;
    redraw(dots, ...parcels.map((p) => {
      // Horizontally they come in from the right and run up the ramp to the left.
      const x = W - p.k * (W + 20);
      const y = x > nose ? ground - 8 : Math.max(18, surfY(x) - 8);
      return svg('circle', { cx: x, cy: y, r: 4.5, fill: COL.parcel, stroke: '#fff', 'stroke-width': 1 });
    }));
  });
  const paint = () => {
    const lift = frontLift(slope);
    const top: P[] = [];
    for (let x = nose; x >= -4; x -= 4) top.push([x, Math.max(10, surfY(x))]);
    // The path the warm air takes: in along the ground, then up the face of the front.
    const path: P[] = [[W, ground - 8], [nose, ground - 8]];
    for (let x = nose - 8; x >= 0; x -= 8) path.push([x, Math.max(18, surfY(x) - 8)]);
    const parts: SVGElement[] = [
      svg('polygon', { points: `${nose},${ground} ${points(top)} -4,${ground}`, fill: COL.cold, opacity: 0.4 }),
      polyline(top, COL.coldInk, 2.5),
      polyline(path, COL.parcel, 1.2, { 'stroke-dasharray': '3 3', opacity: 0.8 }),
      svg('rect', { x: 10, y: 20, width: 92, height: 34, rx: 4, fill: '#ffffff', opacity: 0.85 }),
      note(16, 33, 'cold air, pushing:', { bold: true, fill: COL.blue }),
      arrow(16, 44, 70, 44, COL.blue, 2),
      note(74, 47, 'front', { fill: COL.blue }),
      note(W - 4, ground - 30, 'warm,', { anchor: 'end', fill: COL.parcel }),
      note(W - 4, ground - 18, 'moist air', { anchor: 'end', fill: COL.parcel }),
    ];
    // Rain where the lifted cloud is deep: from the nose back to where the ramp is 3 km up.
    const beltX = nose - 3 * slope;
    const yBase = (x: number) => Math.max(14, surfY(x));
    if (lift.kind === 'towers') {
      for (const [dx, hKm] of [[-14, 8.2], [-40, 6.5], [-66, 4.6]] as [number, number][]) {
        const x = nose + dx;
        const base = ground - 1 * kmPx;
        const topY = ground - hKm * kmPx;
        parts.push(
          svg('path', { d: `M${x - 13},${base} L${x - 11},${topY + 14} Q${x},${topY - 4} ${x + 11},${topY + 14} L${x + 13},${base} Z`, fill: '#ffffff', stroke: COL.cloudShade }),
          hKm > 8 ? svg('path', { d: `M${x - 10},${topY + 4} Q${x - 50},${topY - 6} ${x - 80},${topY + 2} L${x - 10},${topY + 12} Z`, fill: '#ffffff', stroke: COL.cloudShade }) : null as unknown as SVGElement,
        );
      }
    } else {
      // Layers along the ramp, a little above it; thicker near the nose.
      const sheet: P[] = [];
      const under: P[] = [];
      for (let x = nose - 6; x >= -4; x -= 4) {
        const yb = yBase(x) - 6;
        const depth = Math.max(14, (lift.kind === 'thick' ? 80 : 56) - (nose - x) * 0.1);
        sheet.push([x, Math.max(6, yb - depth)]);
        under.push([x, yb]);
      }
      parts.push(svg('polygon', { points: points([...sheet, ...under.reverse()]), fill: lift.kind === 'thick' ? '#cfcade' : '#ffffff', stroke: COL.cloudShade, 'stroke-linejoin': 'round' }));
    }
    const step = Math.max(4, 16 - lift.mmPerHour * 3);
    parts.push(svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.ground }));
    for (let x = Math.max(0, beltX); x < nose; x += step) parts.push(line(x, Math.max(20, yBase(x) - 2), x - 4, ground, COL.rain, 1.1 + lift.mmPerHour * 0.2, { opacity: 0.6 }));
    parts.push(
      line(Math.max(0, beltX), ground + 6, nose, ground + 6, COL.rain, 3),
      note((Math.max(0, beltX) + nose) / 2, ground + 18, beltX < 0 ? `rain belt ${Math.round(nose - beltX)} km wide: wider than the picture` : `rain belt ${Math.round(nose - beltX)} km wide`, { anchor: 'middle', fill: '#fff' }),
    );
    redraw(g, ...parts);
    const speed = ctx.save.units === 'metric' ? `${lift.cmPerS.toFixed(0)} cm` : `${(lift.cmPerS / 2.54).toFixed(0)} inches`;
    const kind = lift.kind === 'layers'
      ? 'Gentle lifting: the air spreads into wide, smooth layers.'
      : lift.kind === 'thick'
        ? 'Brisker lifting: a thick, dark deck, with a few lumps.'
        : 'Abrupt lifting: the air is shoved up into towers.';
    const like = slope >= 70 ? ' (as steep as a warm front)' : slope <= 55 ? ' (as steep as a cold front’s nose)' : '';
    f.readout.textContent = `1 in ${slope.toFixed(0)}${like}: the warm air climbs ${speed} a second. ${kind} Rain on any one spot lasts about ${lift.rainHours < 3 ? lift.rainHours.toFixed(1) : lift.rainHours.toFixed(0)} hours, ${lift.mmPerHour.toFixed(1)} mm an hour.`;
    if (t.goal === 'towers' && lift.kind === 'towers') t.done();
  };
  // Steeper to the right: the slider runs over the logarithm of the slope.
  f.controls.append(slider('Steepness', 0, 1, 0.01, 0.33, (v) => `1 in ${Math.round(200 * Math.pow(25 / 200, v))}`, (v) => {
    slope = 200 * Math.pow(25 / 200, v);
    paint();
  }, 'parcel').node);
  slope = 200 * Math.pow(25 / 200, 0.33);
  paint();
  return f.node;
});

// ---- Crossed winds ----------------------------------------------------------

export const crossedWindsDiagram: FigureFactory = () => {
  const d = still(400, 252);
  const panel = (cx: number, fromLeft: boolean) => {
    const dir = fromLeft ? 1 : -1;
    const wisp = (x: number, y: number) => svg('g', { transform: `translate(${x} ${y}) scale(0.32)` }, drawCloud('cirrus', PALETTES.day, 3));
    return svg('g', {},
      svg('rect', { x: cx - 95, y: 30, width: 190, height: 160, rx: 10, fill: '#5d8fc0', opacity: 0.18 }),
      // Buys Ballot: with the wind at your back, the low is on your left.
      label(cx - 74, 116, 'L', { bold: true, fill: COL.red, attrs: { 'font-size': 16, opacity: 0.8 } }),
      note(cx - 76, 130, 'the low', { fill: COL.redInk }),
      // High cloud crossing.
      wisp(cx - 40 * dir, 64), wisp(cx + 20 * dir, 82),
      arrow(cx - 80 * dir, 54, cx + 80 * dir, 54, COL.ice, 2.2),
      note(cx, 46, fromLeft ? 'high cloud moving left to right' : 'high cloud moving right to left', { anchor: 'middle', fill: COL.ice }),
      // The surface wind, from behind.
      arrow(cx, 186, cx, 140, COL.soft, 3),
      note(cx + 8, 168, 'surface wind,', { fill: COL.soft }),
      note(cx + 8, 179, 'blowing this way', { fill: COL.soft }),
      // You, seen from above: head and shoulders, facing up the page.
      svg('ellipse', { cx, cy: 124, rx: 16, ry: 7, fill: COL.ink }),
      svg('circle', { cx, cy: 122, r: 6.5, fill: COL.warm, stroke: COL.ink, 'stroke-width': 1.5 }),
      note(cx, 110, 'you', { anchor: 'middle' }),
      heading(cx, 208, fromLeft ? 'Cloud from your left:' : 'Cloud from your right:'),
      note(cx, 222, fromLeft ? 'a low is coming; worse weather' : 'the low is going; better weather', { anchor: 'middle' }),
    );
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 252, fill: COL.paper }),
    heading(200, 18, 'Back to the wind, watch the highest cloud'),
    panel(100, true),
    panel(300, false),
    note(200, 244, 'High cloud moving straight toward you or away: little change for now.', { soft: true, anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Buys Ballot's rule, and the wind veering through a storm ---------------

export const buysBallotDiagram: FigureFactory = () => {
  const d = still(400, 220);
  const L: P = [110, 92];
  const rings = [30, 58, 86].map((r) => svg('circle', { cx: L[0], cy: L[1], r, fill: 'none', stroke: COL.env, 'stroke-width': 1, opacity: 0.45 }));
  // A person east of the low, wind blowing round the low anticlockwise and a little in.
  const you: P = [214, 128];
  d.svg.append(
      svg('rect', { x: 0, y: 0, width: 400, height: 220, fill: MAP }),
      ...rings,
      label(L[0] - 6, L[1] + 6, 'L', { bold: true, fill: COL.red, attrs: { 'font-size': 18 } }),
      note(L[0], L[1] + 22, 'low pressure', { anchor: 'middle', fill: COL.redInk }),
      // The wind at the person: from the south-southeast, curving round the low.
      arrow(you[0] + 10, you[1] + 52, you[0] + 2, you[1] + 14, COL.soft, 3),
      note(you[0] + 16, you[1] + 46, 'wind at your back', { fill: COL.soft }),
      svg('ellipse', { cx: you[0], cy: you[1], rx: 15, ry: 6.5, fill: COL.ink, transform: `rotate(-12 ${you[0]} ${you[1]})` }),
      svg('circle', { cx: you[0], cy: you[1] - 1, r: 6, fill: COL.warm, stroke: COL.ink, 'stroke-width': 1.5 }),
      note(you[0] + 14, you[1] - 6, 'you, facing', { fill: COL.ink }),
      note(you[0] + 14, you[1] + 5, 'downwind', { fill: COL.ink }),
      // Your left hand points at the low, a little ahead.
      arrow(you[0] - 16, you[1] - 4, L[0] + 32, L[1] + 2, COL.red, 1.8),
      note(150, 136, 'your left arm', { anchor: 'middle', fill: COL.redInk }),
      note(150, 148, 'points at the low', { anchor: 'middle', fill: COL.redInk }),
      note(392, 22, 'N ↑', { anchor: 'end' }),
      heading(290, 22, 'Buys Ballot’s rule'),
      note(290, 38, 'in the northern half of the world;', { soft: true, anchor: 'middle' }),
      note(290, 50, 'south of the equator, it is on your right', { soft: true, anchor: 'middle' }),
  );
  return { node: d.node };
};

export const veerDiagram: FigureFactory = () => {
  const d = still(400, 204);
  const dial = (cx: number, n: string, from: number, where: string, sky: string) => {
    const cy = 86;
    const toward = ((from + 180) * Math.PI) / 180;
    const r = 26;
    return svg('g', {},
      svg('circle', { cx, cy, r: r + 4, fill: '#ffffff', stroke: COL.cloudShade }),
      note(cx, cy - r - 8, 'N', { soft: true, anchor: 'middle' }),
      arrow(cx - Math.sin(toward) * r, cy + Math.cos(toward) * r, cx + Math.sin(toward) * r, cy - Math.cos(toward) * r, COL.soft, 3),
      svg('circle', { cx: cx - 30, cy: 40, r: 9, fill: COL.ink }),
      heading(cx - 30, 44, n, { fill: '#fff' }),
      note(cx, cy + r + 18, `from the ${compass(from)}`, { bold: true, anchor: 'middle' }),
      note(cx, cy + r + 31, where, { anchor: 'middle' }),
      note(cx, cy + r + 43, sky, { soft: true, anchor: 'middle' }),
    );
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 204, fill: COL.paper }),
    heading(200, 18, 'The wind at a town as a low passes to the north'),
    dial(52, 'A', 135, 'ahead', 'barometer falling'),
    dial(150, 'B', 195, 'warm sector', 'nearly steady'),
    dial(248, 'C', 260, 'cold front', 'lowest, turning'),
    dial(346, 'D', 315, 'behind', 'rising'),
    arrow(86, 178, 316, 178, COL.env, 1.6),
    note(200, 172, 'turning clockwise: the wind veers', { anchor: 'middle', fill: COL.env }),
    note(200, 198, 'Each arrow flies with the wind; its tail is where the wind comes from.', { soft: true, anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Warm and cold fronts side by side, and the occluded front --------------

export const twoFrontsDiagram: FigureFactory = () => {
  const d = still(400, 244);
  const ground = 168;
  const panel = (x0: number, warmFront: boolean) => {
    const w = 180;
    // Same scale in both: 1 px is 2 km across and 50 m up.
    const kmX = 0.5;
    const kmY = 20;
    const slope = warmFront ? 100 : 40;
    const nose = warmFront ? x0 + 30 : x0 + w - 30;
    const surf = (x: number) => ground - Math.max(0, (Math.abs(x - nose) / kmX / slope) * kmY);
    const pts: P[] = [];
    if (warmFront) for (let x = nose; x <= x0 + w; x += 3) pts.push([x, Math.max(30, surf(x))]);
    else for (let x = nose; x >= x0; x -= 3) pts.push([x, Math.max(30, surf(x))]);
    const coldPoly = svg('polygon', { points: `${nose},${ground} ${points(pts)} ${warmFront ? x0 + w : x0},${ground}`, fill: COL.cold, opacity: 0.4 });
    const parts: SVGElement[] = [svg('rect', { x: x0, y: 26, width: w, height: ground - 26, fill: COL.warmAir, opacity: 0.7 }), coldPoly, polyline(pts, warmFront ? COL.warm : COL.coldInk, 2.5)];
    if (warmFront) {
      // Layers riding up the ramp, ahead (to the east) of the surface front.
      const sheet = (dx0: number, dx1: number, off: number, depth: number, fill: string) => {
        const top: P[] = [];
        const base: P[] = [];
        for (let x = nose + dx0; x <= nose + dx1; x += 3) {
          base.push([x, surf(x) - off]);
          top.push([x, surf(x) - off - depth]);
        }
        return svg('polygon', { points: points([...top, ...base.reverse()]), fill, stroke: COL.cloudShade, opacity: 0.95 });
      };
      parts.push(sheet(4, 50, 2, 60, SKY_FILL.nimbostratus!), sheet(50, 100, 4, 30, SKY_FILL.altostratus!), sheet(100, 146, 4, 10, SKY_FILL.cirrostratus!));
      for (let x = nose + 4; x < nose + 50; x += 5) parts.push(line(x, surf(x) - 2, x - 3, ground, COL.rain, 1, { opacity: 0.6 }));
      parts.push(
        note(nose + 30, 104, 'nimbo-', { bold: true, anchor: 'middle', fill: '#fff' }),
        note(nose + 30, 115, 'stratus', { bold: true, anchor: 'middle', fill: '#fff' }),
        note(nose + 80, 72, 'altostratus', { bold: true, anchor: 'middle' }),
        note(nose + 116, 42, 'cirrostratus', { bold: true, anchor: 'middle' }),
        arrow(x0 + 8, 44, x0 + 30, 44, COL.warm, 2),
        note(x0 + 4, 36, 'warm air pushing', { fill: COL.warmInk }),
        line(nose, ground + 6, nose + 50, ground + 6, COL.rain, 3),
        note(nose + 25, ground + 18, 'steady rain, 300 km', { anchor: 'middle', fill: '#fff' }),
      );
    } else {
      const tower = (x: number, top: number) => svg('path', { d: `M${x - 9},${ground - 22} L${x - 9},${top + 10} Q${x},${top - 4} ${x + 9},${top + 10} L${x + 9},${ground - 22} Z`, fill: '#ffffff', stroke: COL.cloudShade });
      parts.push(
        tower(nose + 8, 40), tower(nose - 10, 62),
        svg('path', { d: `M${nose + 2},44 Q${nose + 26},30 ${nose + 30},44 Z`, fill: '#ffffff', stroke: COL.cloudShade }),
        ...[-14, -8, -2, 4, 10].map((dx) => line(nose + dx, ground - 22, nose + dx - 3, ground, COL.rain, 1.6, { opacity: 0.75 })),
        note(nose - 14, 40, 'cumulonimbus', { bold: true, anchor: 'end' }),
        arrow(x0 + 8, 140, x0 + 34, 140, COL.blue, 2),
        note(x0 + 4, 132, 'cold air pushing', { fill: COL.blue }),
        line(nose - 16, ground + 6, nose + 12, ground + 6, COL.rain, 3),
        note(nose - 2, ground + 18, 'showers, 50 km', { anchor: 'middle', fill: '#fff' }),
      );
    }
    parts.push(
      heading(x0 + w / 2, 18, warmFront ? 'Warm front: 1 in 100' : 'Cold front: about 1 in 40'),
      note(x0 + w / 2, 206, warmFront ? 'gentle ramp: wide layers,' : 'steep nose: a narrow line', { anchor: 'middle' }),
      note(x0 + w / 2, 218, warmFront ? 'hours of light rain' : 'of towers, a short, hard squall', { anchor: 'middle' }),
    );
    return svg('g', {}, ...parts);
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 244, fill: COL.paper }),
    svg('rect', { x: 0, y: ground, width: 400, height: 26, fill: COL.ground }),
    panel(10, true),
    panel(210, false),
    note(200, 238, 'Slopes to the same scale, heights stretched 40 times; widths not to scale.', { soft: true, anchor: 'middle' }),
  );
  return { node: d.node };
};

export const occlusionDiagram: FigureFactory = () => {
  const d = still(400, 170);
  const stage = (cx: number, gap: number, n: string, text: string[]) => {
    const L: P = [cx - 34, 52];
    const warmEnd: P = [cx + 40 - gap * 0.2, 112];
    const coldEnd: P = [cx + 20 - gap * 0.6, 128];
    const parts: SVGElement[] = [];
    if (gap > 0) {
      const join: P = [L[0] + 6, L[1] + 4];
      parts.push(
        svg('polygon', { points: `${join.join(',')} ${warmEnd.join(',')} ${coldEnd.join(',')}`, fill: '#f8d9c6' }),
        frontOnMap(curve(join, [cx + 10, 60], warmEnd, 14), 'warm', 1),
        frontOnMap(curve(join, [cx - 14, 96], coldEnd, 14), 'cold', -1),
      );
    } else {
      const meet: P = [cx + 16, 92];
      const occ = curve([L[0] + 6, L[1] + 4], [cx - 4, 64], meet, 12);
      parts.push(
        frontOnMap(occ.filter((_, i) => i % 2 === 0), 'warm', 1, OCCLUDED),
        frontOnMap(occ.filter((_, i) => i % 2 === 1), 'cold', 1, OCCLUDED),
        frontOnMap(curve(meet, [cx + 26, 104], [cx + 44, 124], 10), 'warm', 1),
        frontOnMap(curve(meet, [cx + 10, 112], [cx + 6, 134], 10), 'cold', -1),
        note(cx - 22, 90, 'occluded', { anchor: 'end', fill: OCCLUDED }),
        note(cx - 22, 101, 'front', { anchor: 'end', fill: OCCLUDED }),
      );
    }
    return svg('g', {},
      svg('rect', { x: cx - 62, y: 28, width: 124, height: 118, rx: 8, fill: MAP }),
      ...parts,
      label(L[0] - 6, L[1] + 6, 'L', { bold: true, fill: COL.red, attrs: { 'font-size': 15 } }),
      svg('circle', { cx: cx - 50, cy: 40, r: 8, fill: COL.ink }),
      heading(cx - 50, 44, n, { fill: '#fff' }),
      ...text.map((s, i) => note(cx, 158 + i * 11, s, { anchor: 'middle' })),
    );
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 170, fill: COL.paper }),
    heading(200, 18, 'An older storm: the cold front catches up'),
    stage(68, 90, '1', ['a young storm']),
    stage(200, 30, '2', ['the warm sector narrows']),
    stage(332, 0, '3', ['occluded: warm air lifted']),
  );
  return { node: d.node };
};

// ---- Over the Cascades ------------------------------------------------------

export const rainShadowFigure = figure(['shadow'], (ctx, t) => {
  const W = 400;
  const H = 278;
  const f = frame(W, H, 5);
  const sea = 222;
  const kmPx = 48;
  const crestX = 196;
  const yOf = (m: number) => sea - (m / 1000) * kmPx;
  let crestM = 700;
  let dew = 10;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.air }), g);
  /** Height of the land at x, in metres: a coastal plain, the range, then the basin. */
  const land = (x: number) => {
    if (x < 36) return -50;
    if (x < 100) return 40;
    if (x < crestX) {
      const k = (x - 100) / (crestX - 100);
      return 40 + (crestM - 40) * (0.5 - 0.5 * Math.cos(Math.PI * k));
    }
    if (x < 270) {
      const k = (x - crestX) / (270 - crestX);
      return crestM + (BASIN_M - crestM) * (0.5 - 0.5 * Math.cos(Math.PI * k));
    }
    return BASIN_M;
  };
  const paint = () => {
    const c = crossRange(crestM, dew);
    const terrain: P[] = [];
    for (let x = 0; x <= W; x += 4) terrain.push([x, yOf(Math.max(0, land(x)))]);
    const parts: SVGElement[] = [];
    // Cloud on the western slopes, from where the climbing air reaches its base up over the crest.
    const base = c.cloudBaseM;
    if (base != null && base < crestM) {
      const top: P[] = [];
      const bottom: P[] = [];
      for (let x = 100; x <= crestX + 16; x += 4) {
        const h = land(x);
        if (h < base && x < crestX) continue;
        const k = Math.min(1, (x - 100) / (crestX - 100));
        const fade = x > crestX ? 1 - (x - crestX) / 16 : 1;
        const lo = Math.max(h, base);
        bottom.push([x, yOf(lo)]);
        top.push([x, yOf(lo + (250 + 450 * k) * fade)]);
      }
      if (top.length > 1) {
        parts.push(svg('polygon', { points: points([...top, ...[...bottom].reverse()]), fill: '#ffffff', stroke: COL.cloudShade, 'stroke-linejoin': 'round', opacity: 0.95 }));
        for (const [x, y] of top.filter(([x], i) => i % 2 === 0 && x < crestX)) parts.push(line(x + 2, y + 5, x - 2, yOf(land(x)) - 1, COL.rain, 1.2, { opacity: Math.min(0.9, c.wrungG / 3) }));
      }
      parts.push(
        line(36, yOf(base), crestX, yOf(base), COL.dew, 1, { 'stroke-dasharray': '4 3', opacity: 0.8 }),
        note(40, base < 600 ? yOf(base) - 16 : yOf(base) - 4, `cloud base ${height(base, ctx.save.units)}`, { fill: COL.dew }),
      );
    }
    parts.push(
      svg('rect', { x: 0, y: sea, width: 40, height: H - sea, fill: '#5a8fd8', opacity: 0.6 }),
      svg('polygon', { points: `0,${H} ${points(terrain)} ${W},${H}`, fill: COL.field }),
      polyline(terrain, '#7c6b34', 1.5),
      // The air's path: up the western slopes, down into the basin.
      arrow(4, yOf(180), 84, yOf(250), COL.parcel, 2.2),
      arrow(crestX + 18, yOf(crestM + 200), 330, yOf(BASIN_M + 220), COL.redInk, 2.2),
      note(6, sea + 13, 'Pacific', { fill: '#fff' }),
      note(crestX, Math.max(48, yOf(crestM + 700)), `crest: ${c.crestC.toFixed(0)} °C`, { bold: true, anchor: 'middle', fill: COL.ink }),
      note(W - 6, sea + 13, `Columbia Basin, ${height(BASIN_M, ctx.save.units)} up`, { anchor: 'end', fill: '#fff' }),
      note(6, 14, `coast, sea level: ${COAST_C} °C,`, { bold: true, fill: COL.parcel }),
      note(6, 26, `dew point ${dew} °C`, { fill: COL.parcel }),
      note(W - 6, 14, `basin: ${c.eastC.toFixed(0)} °C, dew point ${c.eastDewC.toFixed(0)} °C`, { bold: true, anchor: 'end', fill: COL.redInk }),
      note(W - 6, 26, `${Math.round(c.eastRH * 100)}% of the vapour it has room for`, { anchor: 'end', fill: COL.redInk }),
      note(W - 6, 38, `(coast air simply lifted to ${height(BASIN_M, ctx.save.units)}: ${(COAST_C - DRY_RATE * BASIN_M).toFixed(0)} °C)`, { soft: true, anchor: 'end' }),
      // Rain and snow in a year, under the part of the land that gets it.
      svg('rect', { x: 0, y: 238, width: W, height: H - 238, fill: COL.paper }),
      note(6, 250, 'a year’s rain and snow:', { soft: true }),
      ...([[60, 950, 'Seattle 950 mm'], [150, 2500, 'west slopes 2,500'], [330, 220, 'basin 150 to 300']] as [number, number, string][]).flatMap(([x, mm, text]) => [
        svg('rect', { x: x - 34, y: 256, width: Math.max(2, (mm / 2500) * 68), height: 9, fill: COL.rain }),
        note(x - 34, 275, text),
      ]),
    );
    redraw(g, ...parts);
    const climb = base == null || base >= crestM
      ? `The air crosses the ${height(crestM, ctx.save.units)} range without reaching its dew point: no cloud, no rain.`
      : `Climbing the ${height(crestM, ctx.save.units)} range, the air turns to cloud at ${height(base, ctx.save.units)} and leaves ${c.wrungG.toFixed(1)} g of water from every kilogram on the western slopes.`;
    const down = c.eastRH < 0.5
      ? ' It comes down the far side warming at the dry rate, with no cloud left to slow it: warm and dry. A rain shadow.'
      : base != null && base < crestM
        ? ' It reaches the basin a little warmer and drier than it was.'
        : '';
    f.readout.textContent = climb + down;
    if (t.goal === 'shadow' && c.eastRH < 0.5 && c.wrungG > 0) t.done();
  };
  f.controls.append(
    slider('Mountains', 0.5, 3, 0.1, crestM / 1000, (v) => height(v * 1000, ctx.save.units), (v) => { crestM = v * 1000; paint(); }, 'ink').node,
    slider('Pacific air’s dew point', 4, 13, 1, dew, (v) => `${v} °C`, (v) => { dew = v; paint(); }, 'dew').node,
  );
  paint();
  return f.node;
});
