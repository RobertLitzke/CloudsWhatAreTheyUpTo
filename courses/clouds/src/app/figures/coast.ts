// Figures for the Pacific coast's weather: a north wind along the coast that
// drags cold water up from below, the great high offshore and the lid it
// presses down, the summer grey pulled inland by the hot valleys, a bubble
// rising off the sea into the lid (or, over warm water or under cold air,
// through it), and how many days a year it thunders, coast to Gulf.

import { el, svg } from 'didactics/dom';
import { CEILING_M, coastBubble, coastEnvTemp, hasLid } from '../../core/coast';
import { parcelAt } from '../../core/air';
import { arrow, heading, label, line, note, points, polyline, redraw, small, still, type P } from './draw';
import { COL, choices, deg, figure, frame, height, lock, lockIn, slider, tint, type FigureFactory } from './kit';
import { pacificX, pacificY, westCoast } from './wind';

const SEA = '#9cc3dc';
const DEEP = '#4f79a8';
const LAND = '#a39150';

/** A grey deck of stratus between two heights on the page, from x0 to x1, with a ragged edge at x1. */
function deck(x0: number, x1: number, yTop: number, yBottom: number, fill = '#f4f4f8'): SVGElement {
  if (x1 <= x0 + 2) return svg('g');
  const edge: P[] = [];
  for (let y = yTop; y <= yBottom; y += 4) edge.push([x1 - 6 + 6 * Math.sin(y * 0.7), y]);
  return svg('polygon', { points: points([[x0, yTop], ...edge, [x0, yBottom]]), fill, stroke: COL.cloudShade, 'stroke-width': 1 });
}

// ---- Upwelling --------------------------------------------------------------

/**
 * The sea at the shore, °C, after a few days of summer wind blowing along the
 * coast at `kmh`: from the north when positive (upwelling, colder), from the
 * south when negative (the warm top water piled against the shore).
 */
export const shoreSea = (kmh: number) => (kmh >= 0 ? 15 - 0.15 * kmh : 15 - 0.05 * kmh);
/** The summer air off the sea: its dew point, °C. */
const SEA_AIR_DEW = 13;

export const upwellingFigure = figure(['fog'], (_ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const surf = 112;
  const shore = 300;
  let wind = 0;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }), g);
  const paint = () => {
    const sst = shoreSea(wind);
    const k = Math.max(0, wind) / 40;
    const parts: SVGElement[] = [
      svg('rect', { x: 0, y: surf, width: shore, height: H - surf, fill: SEA }),
    ];
    // Bands of colder water from below, bowed up towards the shore by the upwelling.
    for (let i = 0; i < 4; i++) {
      const depth = 150 + i * 28;
      const lift = k * (depth - surf - 4) * (0.9 - i * 0.12);
      const pts: P[] = [];
      for (let x = 0; x <= shore; x += 10) {
        const near = Math.exp(-(((shore - x) / 90) ** 2));
        pts.push([x, Math.max(surf + 2, depth - lift * near)]);
      }
      parts.push(svg('polygon', { points: points([...pts, [shore, H], [0, H]]), fill: DEEP, opacity: 0.16 + i * 0.05 }));
    }
    parts.push(
      // The land: a beach and the coast hills.
      svg('polygon', { points: points([[shore, H], [shore, surf], [shore + 20, surf - 6], [W, surf - 40], [W, H]]), fill: LAND }),
      line(0, surf, shore, surf, '#5a8fd8', 1.5),
    );
    // A south wind, into the page: the surface water drifts towards the shore and piles up there.
    if (wind < 0) {
      parts.push(
        svg('circle', { cx: 210, cy: 46, r: 12, fill: '#fff', stroke: COL.ink, 'stroke-width': 1.5 }),
        line(203, 39, 217, 53, COL.ink, 2), line(217, 39, 203, 53, COL.ink, 2),
        note(228, 44, `wind from the south, ${Math.round(-wind)} km/h,`, { bold: true }),
        note(228, 56, 'along the coast, into the page', { soft: true }),
        ...[60, 150, 240].map((x) => arrow(x, surf + 10, x + 18 - wind * 0.8, surf + 10, COL.blue, 2)),
        arrow(shore - 18, surf + 22, shore - 18, surf + 70, COL.warmInk, 2),
        small(shore - 26, surf + 84, 'warm top water pushed down', { anchor: 'end', fill: COL.warmInk }),
      );
    }
    // The wind: from the north, along the coast, out of the page.
    if (wind > 0) {
      parts.push(
        svg('circle', { cx: 210, cy: 46, r: 12, fill: '#fff', stroke: COL.ink, 'stroke-width': 1.5 }),
        svg('circle', { cx: 210, cy: 46, r: 3, fill: COL.ink }),
        note(228, 44, `wind from the north, ${Math.round(wind)} km/h,`, { bold: true }),
        note(228, 56, 'along the coast, out of the page', { soft: true }),
      );
      // Surface water drifts to the right of the wind: away from the shore.
      const len = 18 + k * 60;
      for (const x of [250, 160, 70]) parts.push(arrow(x, surf + 10, x - len, surf + 10, COL.blue, 2));
      // Water rising from below to replace it.
      parts.push(arrow(shore - 18, H - 20, shore - 18, surf + 22 + (1 - k) * 60, COL.blue, 2 + k * 1.5));
      parts.push(small(shore - 26, H - 8, 'cold water from 100 m down', { anchor: 'end', fill: COL.blue }));
    }
    // Fog over the cold water at the shore, when the sea is below the air's dew point.
    const fogDepth = Math.max(0, SEA_AIR_DEW - sst) * 14;
    if (fogDepth > 0) parts.push(deck(shore - 60 - fogDepth * 4, shore + 70, surf - fogDepth - 10, surf - 1, '#f4f4f8'));
    parts.push(
      note(8, surf + 34, `sea at the shore: ${deg(Math.round(sst))}`, { bold: true, fill: COL.ink, halo: SEA }),
      note(8, 20, `air off the sea: dew point ${deg(Math.round(SEA_AIR_DEW))}`, { fill: COL.dew }),
      small(W - 6, surf - 46, 'coast', { anchor: 'end' }),
    );
    redraw(g, ...parts);
    const what = sst <= SEA_AIR_DEW
      ? `The sea is now colder than the air’s dew point, so the air lying on it is chilled to saturation: fog and low grey cloud along the shore.`
      : wind > 0
        ? 'The air on the sea is cooled, but not yet to its dew point.'
        : wind < 0
          ? 'The warm top water stays at the shore, and the air over it stays clear.'
          : 'No wind: the sea stays as the summer left it.';
    f.readout.textContent = (wind > 0 ? `The surface water drifts away from the shore, to the right of the wind, and cold water rises from below to replace it. ` : wind < 0 ? 'Now the surface water drifts to the right of a south wind: east, towards the shore, where it piles up and sinks. ' : '') + what;
    if (t.goal === 'fog' && sst <= SEA_AIR_DEW - 1) t.done();
  };
  f.controls.append(slider('Wind along the coast', -20, 40, 5, 0, (v) => (v > 0 ? `${v} km/h from the north` : v < 0 ? `${-v} km/h from the south` : 'calm'), (v) => { wind = v; paint(); }, 'ink').node);
  paint();
  return f.node;
});

// ---- The Pacific High and its lid -------------------------------------------

export const pacificHighDiagram: FigureFactory = () => {
  const W = 400;
  const H = 250;
  const d = still(W, H);
  // Left: the map. Right: a slice down through the air off the coast.
  const top = 20;
  const h = 210;
  const mapW = 230;
  const sx = (x: number) => (x / 400) * mapW;
  const hc: P = [sx(pacificX(140)), pacificY(38, top, h)];
  const ring = (rx: number, ry: number) => svg('ellipse', { cx: hc[0], cy: hc[1], rx, ry, fill: 'none', stroke: COL.blue, 'stroke-width': 1, opacity: 0.4 });
  const clockwise = (r: number, a0: number): SVGElement[] => {
    const pts: P[] = Array.from({ length: 14 }, (_, i) => {
      const a = a0 + (i / 13) * 1.1;
      return [hc[0] + Math.cos(a) * r * 1.35, hc[1] + Math.sin(a) * r];
    });
    return [polyline(pts, COL.blue, 2), arrowHead(pts)];
  };
  const coast = westCoast(top, h);
  coast.setAttribute('transform', `scale(${mapW / 400} 1)`);
  // The slice: sinking air warming as it comes down onto a cool sea-chilled layer.
  const x0 = 254;
  const ground = 222;
  const yOf = (km: number) => ground - km * 46;
  d.svg.append(
    svg('rect', { x: 0, y: top, width: mapW, height: h, fill: '#dbe9f2' }),
    coast,
    ring(36, 26), ring(62, 44),
    ...clockwise(52, -0.4), ...clockwise(52, 1.7), ...clockwise(52, 3.8),
    label(hc[0] - 6, hc[1] + 6, 'H', { bold: true, fill: COL.blue, attrs: { 'font-size': 18 } }),
    // The north wind along the coast.
    ...[44, 40, 36].map((lat) => arrow(sx(pacificX(127.5)), pacificY(lat + 2, top, h), sx(pacificX(126.5)), pacificY(lat - 1.5, top, h), COL.ink, 1.8)),
    small(sx(pacificX(150)), top + h - 6, 'the Pacific High, summer', { fill: COL.blue }),
    // The slice.
    svg('rect', { x: x0, y: yOf(4.4), width: W - x0, height: ground - yOf(4.4), fill: tint(COL.warm, 0.18) }),
    svg('rect', { x: x0, y: yOf(0.5), width: W - x0, height: ground - yOf(0.5), fill: tint(COL.cold, 0.35) }),
    deck(x0, W, yOf(0.5), yOf(0.28)),
    svg('rect', { x: x0, y: ground, width: W - x0, height: H - ground, fill: SEA }),
    ...[326, 362, 392].map((x) => arrow(x, yOf(4.1), x, yOf(0.75), COL.redInk, 2)),
    line(x0, yOf(0.5), W, yOf(0.5), COL.redInk, 2, { 'stroke-dasharray': '5 3' }),
    small(W - 4, yOf(0.5) - 4, 'the lid', { anchor: 'end', fill: COL.redInk, bold: true }),
    small(x0 + 4, yOf(3), 'sinking air,', { fill: COL.redInk }),
    small(x0 + 4, yOf(3) + 11, 'warming as', { fill: COL.redInk }),
    small(x0 + 4, yOf(3) + 22, 'it is squeezed', { fill: COL.redInk }),
    small(x0 + 4, ground - 6, 'cool, damp air', { fill: COL.blue }),
    small(x0 + 4, ground + 14, 'cold sea', { fill: '#fff' }),
    heading((x0 + W) / 2, 14, 'off the coast'),
    heading(mapW / 2, 14, 'from above'),
  );
  return { node: d.node };
};

function arrowHead(path: P[]): SVGElement {
  const [x1, y1] = path[path.length - 1];
  const [x0, y0] = path[path.length - 3];
  const a = Math.atan2(y1 - y0, x1 - x0);
  const pt = (da: number): P => [x1 - Math.cos(a + da) * 7, y1 - Math.sin(a + da) * 7];
  return svg('polygon', { points: points([[x1, y1], pt(0.45), pt(-0.45)]), fill: COL.blue });
}

// ---- The summer grey and the hot valley -------------------------------------

/**
 * The marine layer on a summer day: how deep it is (m) and how far inland it
 * reaches (0 at the beach, 1 deep into the valley), by hour of the day, given
 * how hot the valley gets in the afternoon.
 */
export function marineLayer(hour: number, valleyHighC: number): { depthM: number; reach: number } {
  const pull = Math.max(0, Math.min(1, (valleyHighC - 18) / 20));
  // Night and morning: pulled in by the heat of the day before. Afternoon: burned back towards the beach.
  const night = hour >= 20 || hour < 9;
  const sinceDusk = hour >= 20 ? hour - 20 : hour + 4; // 0 at 8 p.m., 13 at 9 a.m.
  const burn = hour >= 9 && hour < 20 ? Math.min(1, (hour - 9) / 6) : 0;
  const reachMax = 0.25 + 0.75 * pull;
  const reach = night ? reachMax * Math.min(1, 0.35 + sinceDusk / 8) : reachMax * (1 - burn) + 0.2 * burn;
  const depthM = 250 + 550 * pull;
  return { depthM, reach };
}

export const marineLayerFigure = figure(['burn'], (ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 3);
  const ground = 200;
  const kmPx = 100;
  const beach = 70;
  const gap = 170;
  const valley = 230;
  const yOf = (m: number) => ground - (m / 1000) * kmPx;
  let hour = 6;
  let hot = 32;
  const g = svg('g');
  f.svg.append(g);
  const landAt = (x: number) => (x < beach ? -1 : x < gap ? ((x - beach) / (gap - beach)) * 300 : x < valley ? 300 * (1 - (x - gap) / (valley - gap)) + 20 : 20);
  const paint = () => {
    const { depthM, reach } = marineLayer(hour, hot);
    const day = hour >= 6 && hour < 20;
    const edge = beach - 40 + reach * (W - beach + 40);
    const terrain: P[] = [];
    for (let x = beach; x <= W; x += 5) terrain.push([x, yOf(Math.max(0, landAt(x)))]);
    // The valley's temperature through the day, and the beach's.
    const valleyC = Math.round(hot - 12 + 12 * Math.max(0, Math.sin(((hour - 8) / 14) * Math.PI)));
    const beachC = 15 + (day ? 2 : 0);
    const valleyUnder = edge > valley + 20;
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: H, fill: day ? COL.sky : '#3b3a66' }),
      svg('rect', { x: 0, y: ground - 2, width: beach, height: H - ground + 2, fill: SEA }),
      deck(0, edge, yOf(depthM), ground, '#eceaf2'),
      svg('polygon', { points: points([[beach, H], ...terrain, [W, H]]), fill: LAND }),
      line(0, yOf(depthM) - 2, Math.max(0, edge), yOf(depthM) - 2, COL.redInk, 1.5, { 'stroke-dasharray': '4 3' }),
      small(4, yOf(depthM) - 6, `lid, ${height(depthM, ctx.save.units)}`, { fill: day ? COL.redInk : '#f7c9b8' }),
      note(4, ground + 30, `beach ${deg(Math.round(beachC))}`, { fill: '#fff', bold: true }),
      note(W - 4, ground + 30, `valley ${deg(Math.round(valleyUnder ? Math.min(valleyC, 19) : valleyC))}`, { fill: '#fff', bold: true, anchor: 'end' }),
      small(gap, yOf(330), 'coast hills', { anchor: 'middle', fill: day ? COL.ink : '#fff' }),
      ...(day && !valleyUnder ? [svg('circle', { cx: W - 40, cy: 30, r: 12, fill: COL.sun })] : []),
      ...(day && !valleyUnder && hour >= 11 ? [arrow(beach + 40, ground - 16, gap - 20, ground - 40, COL.cold, 2), small(beach + 46, ground - 4, 'sea breeze', { fill: COL.coldInk })] : []),
    );
    const clock = `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'a.m.' : 'p.m.'}`;
    const where = valleyUnder ? 'The grey reaches right into the valley.' : edge > gap ? 'The grey has spilled through the gap in the hills.' : edge > beach ? 'The grey sits over the beach and the coast hills; the valley is clear.' : 'Only a thin band of grey hangs offshore.';
    f.readout.textContent = `${clock} ${where} ${day && hour >= 12 && !valleyUnder ? `The hot valley air rises and pulls the cool sea air in after it: the sea breeze.` : !day ? 'At night the land cools, and the cool sea air creeps inland under the lid.' : ''}`;
    if (t.goal === 'burn' && hot >= 30 && hour >= 13 && hour <= 17 && edge > beach - 30 && edge < gap) t.done();
  };
  f.controls.append(
    slider('Time of day', 0, 23, 1, hour, (v) => `${v % 12 === 0 ? 12 : v % 12} ${v < 12 ? 'a.m.' : 'p.m.'}`, (v) => { hour = v; paint(); }, 'ink').node,
    slider('Valley’s afternoon high', 20, 40, 2, hot, (v) => deg(Math.round(v)), (v) => { hot = v; paint(); }, 'parcel').node,
  );
  paint();
  return f.node;
});

// ---- A bubble off the sea ---------------------------------------------------

const BUBBLE_GUESSES = ['Up to the lid, a few hundred metres', 'Halfway up the sky', 'All the way: a thunderstorm'] as const;
const BUBBLE_RIGHT = 0;

export const coastSoundingFigure = figure(['storm'], (ctx, t) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 3);
  const bottom = 280;
  const top = 12000;
  const yOf = (m: number) => bottom - (m / top) * 264;
  const cx0 = 40;
  const cx1 = 290;
  const tMin = -60;
  const tMax = 35;
  const xOf = (c: number) => cx0 + ((c - tMin) / (tMax - tMin)) * (cx1 - cx0);
  let sea = 13;
  let aloft = 20;
  const grid = svg('g');
  for (let m = 0; m <= top; m += 2000) grid.append(line(cx0, yOf(m), cx1, yOf(m), COL.grid, 1), small(cx0 - 4, yOf(m) + 3, height(m, ctx.save.units), { anchor: 'end' }));
  for (let c = -60; c <= 30; c += 30) grid.append(line(xOf(c), yOf(0), xOf(c), yOf(top), COL.grid, 1), small(xOf(c), bottom + 14, deg(Math.round(c)), { anchor: 'middle' }));
  const live = svg('g');
  f.svg.append(svg('rect', { x: 300, y: 0, width: W - 300, height: bottom, fill: COL.sky }), svg('rect', { x: 300, y: bottom, width: W - 300, height: H - bottom, fill: SEA }), grid, live);
  const paint = () => {
    const a = { seaC: sea, aloftC: aloft };
    const { baseM, topM } = coastBubble(a);
    const envPts: P[] = [];
    const parcelPts: P[] = [];
    const warm: P[] = [];
    for (let h = 0; h <= CEILING_M; h += 100) {
      envPts.push([xOf(coastEnvTemp(h, a)), yOf(h)]);
      const p = parcelAt(h, sea + 1.5, sea).tempC;
      if (h <= topM + 50) parcelPts.push([xOf(p), yOf(h)]);
      if (h <= topM) warm.push([xOf(p), yOf(h)]);
    }
    const envUpTo = envPts.slice(0, warm.length).reverse();
    // The cloud the bubble makes, drawn beside the chart.
    const cloudTop = yOf(Math.max(topM, baseM + 80));
    const cloud = topM < baseM + 50 ? null
      : topM < 1200 ? svg('rect', { x: 304, y: cloudTop, width: W - 308, height: yOf(baseM) - cloudTop, fill: '#f4f4f8', stroke: COL.cloudShade })
        : svg('path', { d: `M310,${yOf(baseM)} C306,${cloudTop + 40} 330,${cloudTop} 350,${cloudTop} C370,${cloudTop} 394,${cloudTop + 40} 390,${yOf(baseM)} Z`, fill: '#ffffff', stroke: COL.cloudShade, 'stroke-width': 1.2 });
    redraw(live,
      warm.length > 1 ? svg('polygon', { points: points([...warm, ...envUpTo]), fill: tint(COL.parcel, 0.3) }) : null,
      polyline(envPts, COL.env, 2.5),
      polyline(parcelPts, COL.parcel, 2.5),
      line(cx0, yOf(topM), 300, yOf(topM), COL.parcel, 1, { 'stroke-dasharray': '4 3' }),
      small(cx1 - 2, yOf(topM) - 4, `the bubble stops: ${height(topM, ctx.save.units)}`, { anchor: 'end', fill: COL.warmInk, halo: COL.paper }),
      cloud,
      small(xOf(coastEnvTemp(6000, a)) + 4, yOf(6000), 'the air', { fill: COL.env }),
      ...(hasLid(a) ? [small(xOf(aloft) + 6, yOf(1500) + 4, 'lid', { fill: COL.env, bold: true })] : []),
    );
    const kind = topM < 1200 ? 'a flat grey deck under the lid, and nothing more' : topM < 4000 ? 'heaps that stop well short of the ice: no thunder' : topM < 7500 ? 'deep showers, with ice and hail in their tops: thunder is possible' : 'a towering thunderstorm';
    if (asking) f.readout.textContent = `A summer day on the coast: a ${deg(Math.round(sea))} sea, and air ${deg(Math.round(aloft))} a kilometre and a half up, kept warm by the sinking air. How high will a bubble off the sea get?`;
    else f.readout.textContent = `The bubble rises while it is warmer than the air around it (orange shading: its fuel), and stops at ${height(topM, ctx.save.units)}: ${kind}.${pick.picked() < 0 ? '' : topM < 1200 && sea === 13 && aloft === 20 ? (pick.picked() === BUBBLE_RIGHT ? ' As you guessed.' : ' Not what you guessed.') : ''}`;
    if (!asking && pick.picked() >= 0 && topM < 1200 && sea === 13 && aloft === 20) pick.mark(BUBBLE_RIGHT);
    if (t.goal === 'storm' && !asking && topM >= 8000) t.done();
  };
  let asking = t.goal === 'storm';
  const seaS = slider('Sea temperature', 8, 30, 1, sea, (v) => deg(Math.round(v)), (v) => { sea = v; paint(); }, 'dew');
  const aloftS = slider('Air 1.5 km up', -10, 25, 1, aloft, (v) => deg(Math.round(v)), (v) => { aloft = v; paint(); }, 'env');
  const pick = choices(BUBBLE_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Let it rise', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([seaS, aloftS], false);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(seaS.node, aloftS.node);
  lock([seaS, aloftS], asking);
  if (asking && typeof t.kept === 'number' && BUBBLE_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- Days of thunder --------------------------------------------------------

/** Days a year with thunder heard, roughly, from long-term records. */
