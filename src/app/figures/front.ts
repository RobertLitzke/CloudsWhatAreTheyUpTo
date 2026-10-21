// Figures for reading an approaching front: a storm seen from above, what a
// barometer weighs, a whole storm going over a town hour by hour with the
// barograph tracing it, how a front's steepness sets its cloud and rain, the
// crossed-winds rule, and what the Cascades wring out of a Pacific storm.

import { compass, crossRange, frontLift, stormSky, stormWeather, BASIN_M, COAST_C, coldSurfaceM, warmSurfaceM, WARM_SECTOR_H } from '../../core/storm';
import { genus, type GenusId } from '../../core/clouds';
import { el, svg } from '../dom';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { COL, animate, frame, height, label, line, polyline, redraw, slider, task, type FigureFactory } from './kit';

// ---- Shared bits ---------------------------------------------------------------

type P = [number, number];

export function arrow(x1: number, y1: number, x2: number, y2: number, color: string, width = 2): SVGElement {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = 5 + width * 1.5;
  const tip = (da: number) => `${x2 - head * Math.cos(a + da)},${y2 - head * Math.sin(a + da)}`;
  return svg('g', {},
    line(x1, y1, x2 - head * 0.7 * Math.cos(a), y2 - head * 0.7 * Math.sin(a), color, width),
    svg('polygon', { points: `${x2},${y2} ${tip(0.45)} ${tip(-0.45)}`, fill: color }));
}

export function still(w: number, h: number): { node: HTMLElement; svg: SVGSVGElement } {
  const s = svg('svg', { viewBox: `0 0 ${w} ${h}`, class: 'fig-svg', role: 'img' }) as SVGSVGElement;
  return { node: el('div.fig-body.fig-still', {}, s), svg: s };
}

export const small = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => label(x, y, s, { class: 'fig-label small', ...attrs });
export const heading = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => label(x, y, s, { class: 'fig-label bold', 'text-anchor': 'middle', ...attrs });

/** Points along a quadratic curve. */
function curve(a: P, c: P, b: P, n = 40): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as P;
  });
}

/**
 * A front as drawn on a weather map: a line with half-moons (warm) or
 * triangles (cold) on the side it is moving towards. `side` is 1 or -1, for
 * the left or right of the line's direction of drawing.
 */
function frontOnMap(pts: P[], kind: 'warm' | 'cold', side: 1 | -1): SVGElement {
  const color = kind === 'warm' ? '#d0472f' : '#2f62b0';
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

// ---- A storm seen from above -------------------------------------------------------

export const lowMapDiagram: FigureFactory = () => {
  const d = still(400, 260);
  const L: P = [150, 92];
  const warm = curve([L[0] + 4, L[1] + 2], [235, 100], [312, 176]);
  const cold = curve([L[0] - 2, L[1] + 6], [150, 170], [84, 236]);
  const sector = [...warm, [300, 260], [100, 260], ...[...cold].reverse()] as P[];
  const ring = (rx: number, ry: number) => svg('ellipse', { cx: L[0] + 10, cy: L[1] + 8, rx, ry, fill: 'none', stroke: COL.env, 'stroke-width': 1, opacity: 0.45 });
  // Winds blow anticlockwise round a low (in the northern half of the world), a little in towards it.
  const winds: SVGElement[] = [];
  for (const [a, r] of [[0.3, 112], [1.4, 96], [2.5, 104], [3.6, 110], [4.6, 92], [5.5, 100]] as [number, number][]) {
    const x = L[0] + 10 + Math.cos(a) * r * 1.3;
    const y = L[1] + 8 + Math.sin(a) * r * 0.85;
    const tx = Math.sin(a) * 1.3;
    const ty = -Math.cos(a) * 0.85;
    const len = 22 / Math.hypot(tx, ty);
    winds.push(arrow(x, y, x + (tx - Math.cos(a) * 0.35) * len, y + (ty - Math.sin(a) * 0.3) * len, COL.soft, 1.4));
  }
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 260, fill: '#eef0e6' }),
    svg('polygon', { points: sector.map((p) => p.join(',')).join(' '), fill: '#f8d9c6', opacity: 0.8 }),
    // The cloud shield: wide ahead of the warm front, a narrow band along the cold one.
    svg('path', { d: `M150,70 Q260,40 370,110 Q380,170 320,190 Q270,150 230,112 Q190,96 150,92 Z`, fill: '#ffffff', opacity: 0.85, stroke: COL.cloudShade }),
    svg('path', { d: `M150,92 Q160,170 92,240 L74,232 Q136,170 138,96 Z`, fill: '#ffffff', opacity: 0.85, stroke: COL.cloudShade }),
    ring(40, 28), ring(78, 54), ring(120, 82), ring(165, 112),
    ...winds,
    frontOnMap(warm, 'warm', 1),
    frontOnMap(cold, 'cold', -1),
    label(L[0] - 18, L[1] + 4, 'L', { class: 'fig-label bold', fill: '#d0472f', 'font-size': 18 }),
    small(L[0] - 46, L[1] - 26, 'low pressure', { fill: '#b03a25' }),
    small(250, 70, 'cloud shield', { class: 'fig-label small soft', 'text-anchor': 'middle' }),
    small(316, 196, 'warm front', { fill: '#b03a25' }),
    small(18, 232, 'cold front', { fill: '#2f62b0' }),
    small(190, 216, 'warm air', { fill: '#b0583a', 'text-anchor': 'middle' }),
    small(40, 140, 'cold air', { fill: '#2f62b0' }),
    small(330, 236, 'cool air', { fill: '#2f62b0' }),
    town(356, 150),
    small(356, 164, 'a town ahead', { 'text-anchor': 'middle' }),
    arrow(14, 22, 74, 22, COL.ink, 2),
    small(80, 26, 'the whole storm drifts east, about 30 km an hour'),
    small(392, 22, 'N ↑', { 'text-anchor': 'end' }),
  );
  return { node: d.node };
};

// ---- What a barometer weighs -----------------------------------------------------

export const barometerDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const ground = 214;
  const tubeX = 268;
  const top = 34;
  const hg = 112; // the mercury's top
  const dish = 196;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 240, fill: '#eef3f8' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 26, fill: COL.ground }),
    // A column of air standing on a patch of ground, thinning upward.
    ...Array.from({ length: 9 }, (_, i) => svg('rect', { x: 50, y: 20 + i * 21, width: 60, height: 21, fill: COL.env, opacity: 0.06 + i * 0.045 })),
    svg('rect', { x: 50, y: 20, width: 60, height: ground - 20, fill: 'none', stroke: COL.env, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
    arrow(80, 150, 80, ground - 4, COL.env, 2.5),
    small(80, 14, 'all the air above, to the top', { 'text-anchor': 'middle', fill: COL.env }),
    small(118, 80, 'thin up high', { class: 'fig-label small soft' }),
    small(118, 190, 'squeezed dense', { class: 'fig-label small soft' }),
    small(118, 202, 'near the ground', { class: 'fig-label small soft' }),
    small(80, ground + 16, 'about 10 tonnes on each square metre', { 'text-anchor': 'middle', fill: '#fff' }),
    // A mercury barometer: a glass tube, closed at the top, standing in a dish.
    svg('rect', { x: tubeX - 8, y: top, width: 16, height: dish - top + 6, rx: 7, fill: '#ffffff', stroke: COL.soft, 'stroke-width': 1.5 }),
    svg('rect', { x: tubeX - 5, y: hg, width: 10, height: dish - hg + 4, fill: '#9aa3ad' }),
    svg('rect', { x: tubeX - 40, y: dish - 4, width: 80, height: 16, rx: 3, fill: '#9aa3ad', stroke: COL.soft }),
    small(tubeX + 14, top + 10, 'empty: nothing'),
    small(tubeX + 14, top + 22, 'presses down here'),
    line(tubeX + 10, hg, tubeX + 22, hg, COL.ink, 1),
    small(tubeX + 26, hg + 3, 'mercury, 760 mm high'),
    small(tubeX + 26, hg + 15, '29.92 in, 1013 hPa', { class: 'fig-label small soft' }),
    arrow(tubeX - 74, dish - 34, tubeX - 44, dish - 8, COL.env, 2),
    arrow(tubeX + 74, dish - 34, tubeX + 44, dish - 8, COL.env, 2),
    small(tubeX - 78, dish - 52, 'the air presses on', { 'text-anchor': 'middle', fill: COL.env }),
    small(tubeX - 78, dish - 40, 'the open dish', { 'text-anchor': 'middle', fill: COL.env }),
    small(tubeX + 74, dish - 52, 'and holds the', { 'text-anchor': 'middle', fill: COL.env }),
    small(tubeX + 74, dish - 40, 'column up', { 'text-anchor': 'middle', fill: COL.env }),
  );
  return { node: d.node };
};

// ---- A whole storm goes by ----------------------------------------------------------

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

export const frontPassFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 5);
  const t = task();
  const ground = 196;
  const kmPx = 14.5; // vertical: 12 km in 174 px
  const hourPx = 4.4;
  const townX = 300;
  const yOf = (m: number) => ground - (m / 1000) * kmPx;
  const xs = Array.from({ length: 135 }, (_, i) => i * 3);
  const g = svg('g');
  const baro = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: ground, fill: '#e3ecf4' }), g, baro);
  const units = ctx.save.units;
  // The barograph: the pen traces pressure against time as the storm goes by.
  const bx0 = 34;
  const bx1 = 392;
  const by0 = 286;
  const by1 = 222;
  const H0 = -40;
  const H1 = 24;
  const bxOf = (h: number) => bx0 + ((h - H0) / (H1 - H0)) * (bx1 - bx0);
  const byOf = (p: number) => by0 - ((p - 1000) / 22) * (by0 - by1);
  const paint = (h: number) => {
    const tau = (x: number) => h + (townX - x) / hourPx;
    const parts: SVGElement[] = [];
    // The air masses: cold under the warm front's ramp and behind the cold front, warm between.
    const warmTop: P[] = xs.map((x) => [x, yOf(Math.min(11000, warmSurfaceM(tau(x))))]);
    const coldTop: P[] = xs.map((x) => [x, yOf(coldSurfaceM(tau(x)))]);
    parts.push(svg('rect', { x: 0, y: 0, width: W, height: ground, fill: '#f7e2d4', opacity: 0.55 }));
    parts.push(svg('polygon', { points: `0,${ground} ${warmTop.map((p) => p.join(',')).join(' ')} ${W},${ground}`, fill: COL.cold, opacity: 0.3 }));
    parts.push(svg('polygon', { points: `0,${ground} ${coldTop.map((p) => p.join(',')).join(' ')} ${W},${ground}`, fill: COL.cold, opacity: 0.3 }));
    parts.push(polyline(warmTop, COL.warm, 2));
    parts.push(polyline(coldTop, '#4f79a8', 2));
    // Sheets of cloud, as one shape for each stretch of the same kind.
    interface Run { genus: GenusId; top: P[]; base: P[] }
    let run: Run | null = null;
    const runs: Run[] = [];
    for (const x of xs) {
      const sky = stormSky(tau(x));
      const sheet = sky.genus === 'cirrostratus' || sky.genus === 'altostratus' || sky.genus === 'nimbostratus' || sky.genus === 'stratocumulus';
      if (!sheet) {
        run = null;
        continue;
      }
      if (!run || run.genus !== sky.genus) {
        run = { genus: sky.genus as GenusId, top: [], base: [] };
        runs.push(run);
      }
      run.top.push([x, yOf(sky.topM)]);
      run.base.push([x, yOf(sky.baseM)]);
    }
    for (const r of runs) {
      const last = r.top[r.top.length - 1][0] + 3;
      r.top.push([last, r.top[r.top.length - 1][1]]);
      r.base.push([last, r.base[r.base.length - 1][1]]);
      parts.push(svg('polygon', { points: [...r.top, ...[...r.base].reverse()].map((p) => p.join(',')).join(' '), fill: SKY_FILL[r.genus] ?? '#fff', stroke: COL.cloudShade, 'stroke-width': 0.8, opacity: 0.95 }));
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
      parts.push(svg('g', {}, ...[[-6, -4, 5], [0, -9, 7], [6, -4, 5], [0, -3, 6]].map(([dx, dy, r]) => svg('circle', { cx: x + dx, cy: y + dy, r, fill: '#ffffff' }))));
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
        ...[-10, -5, 0, 5, 10].map((dx) => line(c + dx, b0, c + dx - 4, ground, COL.rain, 1.8, { opacity: 0.75 })),
      );
    }
    const wfX = townX - (0 - h) * hourPx;
    if (wfX > 0 && wfX < W) parts.push(small(wfX + 4, ground - 6, 'warm front', { fill: '#b03a25' }));
    if (cfX > 0 && cfX < W) parts.push(small(cfX - 4, ground - 6, 'cold front', { fill: '#2f62b0', 'text-anchor': 'end' }));
    parts.push(
      line(townX, 10, townX, ground, COL.ink, 1, { 'stroke-dasharray': '3 4', opacity: 0.5 }),
      small(townX, 12, 'overhead', { 'text-anchor': 'middle' }),
      svg('rect', { x: 0, y: ground, width: W, height: 14, fill: COL.ground }),
      town(townX, ground),
      small(6, ground + 11, '← west: what is coming', { fill: '#fff' }),
      small(W - 6, ground + 11, 'what has gone by →', { fill: '#fff', 'text-anchor': 'end' }),
    );
    redraw(g, ...parts);
    // The barograph.
    const trace: P[] = [];
    for (let k = H0; k <= h; k += 0.5) trace.push([bxOf(k), byOf(stormWeather(k).hPa)]);
    redraw(baro,
      svg('rect', { x: 0, y: ground + 14, width: W, height: H - ground - 14, fill: COL.paper }),
      ...[1000, 1010, 1020].map((p) => line(bx0, byOf(p), bx1, byOf(p), COL.grid, 1)),
      ...[1000, 1010, 1020].map((p) => small(bx0 - 3, byOf(p) + 3, String(p), { 'text-anchor': 'end', class: 'fig-label small soft' })),
      small(bx0, ground + 25, 'barograph, hPa', { class: 'fig-label small soft' }),
      line(bxOf(0), by1 - 4, bxOf(0), by0, COL.warm, 1, { 'stroke-dasharray': '2 3' }),
      line(bxOf(WARM_SECTOR_H), by1 - 4, bxOf(WARM_SECTOR_H), by0, '#4f79a8', 1, { 'stroke-dasharray': '2 3' }),
      trace.length > 1 ? polyline(trace, COL.env, 2.2) : null,
      svg('circle', { cx: bxOf(h), cy: byOf(stormWeather(h).hPa), r: 3.5, fill: COL.env }),
    );
    const w = stormWeather(h);
    const inHg = (w.hPa / 33.864).toFixed(2);
    const trend = w.tendency < -0.5 ? 'falling' : w.tendency > 0.5 ? (w.tendency > 3 ? 'rising fast' : 'rising') : 'steady';
    const wind = units === 'metric' ? `${Math.round(w.windKmh)} km/h` : `${Math.round(w.windKmh / 1.609)} mph`;
    f.readout.textContent = `${hoursText(h)}. ${skyText(h)} Barometer ${w.hPa.toFixed(0)} hPa (${inHg} in), ${trend}. Wind from the ${compass(w.windFrom)}, ${wind}. ${w.tempC.toFixed(0)} °C, dew point ${w.dewC.toFixed(0)} °C.`;
    if (goal === 'pass' && h >= WARM_SECTOR_H + 3) t.resolve();
  };
  f.controls.append(slider('Hour', H0, H1, 1, H0, (v) => (v < 0 ? `${v} h` : `+${v} h`), paint, 'env').node);
  paint(H0);
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- How steep a front is ----------------------------------------------------------

export const slopeFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 4);
  const t = task();
  const ground = 196;
  const kmPx = 20; // vertical; horizontally 1 px is 1 km, so heights are stretched 20 times
  const nose = 330;
  const g = svg('g');
  const dots = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: ground, fill: '#f6ece4' }), g, dots, svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.ground }));
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
    const parts: SVGElement[] = [
      svg('polygon', { points: `${nose},${ground} ${top.map((p) => p.join(',')).join(' ')} -4,${ground}`, fill: COL.cold, opacity: 0.4 }),
      polyline(top, '#4f79a8', 2.5),
      small(8, ground - 8, 'cold air', { fill: '#2f62b0' }),
      small(W - 8, 60, 'warm, moist air', { fill: COL.parcel, 'text-anchor': 'end' }),
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
      parts.push(svg('polygon', { points: [...sheet, ...under.reverse()].map((p) => p.join(',')).join(' '), fill: lift.kind === 'thick' ? '#cfcade' : '#ffffff', stroke: COL.cloudShade, 'stroke-linejoin': 'round' }));
    }
    const step = Math.max(4, 16 - lift.mmPerHour * 3);
    for (let x = Math.max(0, beltX); x < nose; x += step) parts.push(line(x, Math.max(20, yBase(x) - 2), x - 4, ground, COL.rain, 1.1 + lift.mmPerHour * 0.2, { opacity: 0.6 }));
    parts.push(
      line(Math.max(0, beltX), ground + 6, nose, ground + 6, COL.rain, 3),
      small((Math.max(0, beltX) + nose) / 2, ground + 18, beltX < 0 ? 'rain belt: wider than the picture' : 'rain belt', { fill: '#fff', 'text-anchor': 'middle' }),
    );
    redraw(g, ...parts);
    const speed = ctx.save.units === 'metric' ? `${lift.cmPerS.toFixed(0)} cm` : `${(lift.cmPerS / 2.54).toFixed(0)} inches`;
    const kind = lift.kind === 'layers'
      ? 'Gentle lifting: the air spreads into wide, smooth layers.'
      : lift.kind === 'thick'
        ? 'Brisker lifting: a thick, dark deck, with a few lumps.'
        : 'Abrupt lifting: the air is shoved up into towers.';
    f.readout.textContent = `1 in ${slope.toFixed(0)}: the warm air climbs ${speed} a second. ${kind} Rain on any one spot lasts about ${lift.rainHours < 3 ? lift.rainHours.toFixed(1) : lift.rainHours.toFixed(0)} hours, ${lift.mmPerHour.toFixed(1)} mm an hour.`;
    if (goal === 'towers' && lift.kind === 'towers') t.resolve();
  };
  // Steeper to the right: the slider runs over the logarithm of the slope.
  f.controls.append(slider('Steepness', 0, 1, 0.01, 0.33, (v) => `1 in ${Math.round(200 * Math.pow(25 / 200, v))}`, (v) => {
    slope = 200 * Math.pow(25 / 200, v);
    paint();
  }, 'parcel').node);
  slope = 200 * Math.pow(25 / 200, 0.33);
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- Crossed winds ------------------------------------------------------------------

export const crossedWindsDiagram: FigureFactory = () => {
  const d = still(400, 230);
  const panel = (cx: number, fromLeft: boolean) => {
    const dir = fromLeft ? 1 : -1;
    const wisp = (x: number, y: number) => svg('g', { transform: `translate(${x} ${y}) scale(0.32)` }, drawCloud('cirrus', PALETTES.day, 3));
    return svg('g', {},
      svg('rect', { x: cx - 95, y: 30, width: 190, height: 150, rx: 10, fill: '#5d8fc0', opacity: 0.18 }),
      // High cloud crossing.
      wisp(cx - 40 * dir, 64), wisp(cx + 20 * dir, 82),
      arrow(cx - 80 * dir, 54, cx + 80 * dir, 54, COL.ice, 2.2),
      small(cx, 46, 'high cloud moving', { 'text-anchor': 'middle', fill: COL.ice }),
      // The surface wind, from behind.
      arrow(cx, 178, cx, 136, COL.soft, 3),
      small(cx + 8, 172, 'surface wind', { fill: COL.soft }),
      small(cx + 8, 183, 'at your back', { fill: COL.soft }),
      // You, seen from above: head and shoulders, facing up the page.
      svg('ellipse', { cx, cy: 124, rx: 16, ry: 7, fill: COL.ink }),
      svg('circle', { cx, cy: 122, r: 6.5, fill: COL.warm, stroke: COL.ink, 'stroke-width': 1.5 }),
      small(cx, 110, 'you', { 'text-anchor': 'middle' }),
      heading(cx, 204, fromLeft ? 'From your left:' : 'From your right:'),
      small(cx, 218, fromLeft ? 'a low is coming; weather worsening' : 'the low is going; weather improving', { 'text-anchor': 'middle' }),
    );
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 230, fill: COL.paper }),
    heading(200, 18, 'Stand with your back to the wind and watch the high cloud'),
    panel(100, true),
    panel(300, false),
  );
  return { node: d.node };
};

// ---- Over the Cascades ----------------------------------------------------------------

export const rainShadowFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 5);
  const t = task();
  const sea = 222;
  const kmPx = 48;
  const crestX = 196;
  const yOf = (m: number) => sea - (m / 1000) * kmPx;
  let crestM = 700;
  let dew = 10;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#e3ecf4' }), g);
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
        parts.push(svg('polygon', { points: [...top, ...[...bottom].reverse()].map((p) => p.join(',')).join(' '), fill: '#ffffff', stroke: COL.cloudShade, 'stroke-linejoin': 'round', opacity: 0.95 }));
        for (const [x, y] of top.filter(([x], i) => i % 2 === 0 && x < crestX)) parts.push(line(x + 2, y + 5, x - 2, yOf(land(x)) - 1, COL.rain, 1.2, { opacity: Math.min(0.9, c.wrungG / 3) }));
      }
      parts.push(
        line(36, yOf(base), crestX, yOf(base), COL.dew, 1, { 'stroke-dasharray': '4 3', opacity: 0.8 }),
        small(40, yOf(base) - 4, `cloud base ${height(base, ctx.save.units)}`, { fill: COL.dew }),
      );
    }
    parts.push(
      svg('rect', { x: 0, y: sea, width: 40, height: H - sea, fill: '#5a8fd8', opacity: 0.6 }),
      svg('polygon', { points: `0,${H} ${terrain.map((p) => p.join(',')).join(' ')} ${W},${H}`, fill: '#a39150' }),
      polyline(terrain, '#7c6b34', 1.5),
      // The air's path: up the western slopes, down into the basin.
      arrow(4, yOf(180), 84, yOf(250), COL.parcel, 2.2),
      arrow(crestX + 18, yOf(crestM + 200), 330, yOf(BASIN_M + 220), '#c2452d', 2.2),
      small(6, sea + 13, 'Pacific', { fill: '#fff' }),
      small(crestX, Math.max(40, yOf(crestM + 760)), `Cascades crest: ${c.crestC.toFixed(0)} °C`, { 'text-anchor': 'middle', fill: COL.ink }),
      small(W - 6, sea + 13, 'Columbia Basin', { 'text-anchor': 'end', fill: '#fff' }),
      small(6, 14, `coast: ${COAST_C} °C,`, { fill: COL.parcel }),
      small(6, 26, `dew point ${dew} °C`, { fill: COL.parcel }),
      small(W - 6, 14, `basin: ${c.eastC.toFixed(0)} °C, dew point ${c.eastDewC.toFixed(0)} °C:`, { 'text-anchor': 'end', fill: '#c2452d' }),
      small(W - 6, 26, `${Math.round(c.eastRH * 100)}% of the vapour it has room for`, { 'text-anchor': 'end', fill: '#c2452d' }),
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
    if (goal === 'shadow' && c.eastRH < 0.5 && c.wrungG > 0) t.resolve();
  };
  f.controls.append(
    slider('Mountains', 0.5, 3, 0.1, crestM / 1000, (v) => height(v * 1000, ctx.save.units), (v) => { crestM = v * 1000; paint(); }, 'ink').node,
    slider('Pacific air’s dew point', 4, 13, 1, dew, (v) => `${v} °C`, (v) => { dew = v; paint(); }, 'dew').node,
  );
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};
