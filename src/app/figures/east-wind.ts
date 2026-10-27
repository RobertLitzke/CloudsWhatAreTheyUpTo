// Figures for dust and dry winds: a high-based storm whose rain never lands
// blowing a wall of dust off the fields, a parcel of air warming and drying as
// it sinks down a slope, the wind through the one sea-level gap in the
// Cascades, and the Santa Ana pouring down to the California coast.

import { el, svg } from 'lesson-kit/dom';
import { downdraftChill, dustWall, gapWind, outflowKmh, rainLands, sinkTo, type Soil } from '../../core/east-wind';
import { arrow, heapAt, label, line, note, points, polyline, redraw, small, still, type P } from './draw';
import { COL, choices, deg, figure, frame, height, lock, lockIn, slider, tint, type FigureFactory } from './kit';

const SOILS: readonly Soil[] = ['ploughed', 'stubble', 'wet'];
const SOIL_NAMES = ['Dry, ploughed', 'Stubble', 'Wet after rain'] as const;
const OCEAN = '#9cc3dc';
const PEAK = '#8a7a48';

// ---- A wall of dust -----------------------------------------------------------------------

const DUST_GUESSES = ['Weaker: less rain reaches the ground', 'Stronger', 'The same: it is the same storm'] as const;
const DUST_RIGHT = 1;

export const dustWallFigure = figure(['dust'], (ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const ground = 226;
  const yOf = (km: number) => ground - km * 50;
  const g = svg('g');
  f.svg.append(g);
  let base = 1;
  let soil = 0;
  const paint = () => {
    const lands = rainLands(base);
    const chill = downdraftChill(base);
    const gust = outflowKmh(chill);
    const wall = dustWall(gust, SOILS[soil]);
    const by = yOf(base);
    const front = 150 + gust * 2.6;
    const rain: SVGElement[] = [];
    for (let i = 0; i < 9; i++) {
      const x = 76 + i * 9;
      const end = by + (ground - by) * Math.max(0.12, lands) * (0.85 + (i % 3) * 0.07);
      rain.push(line(x, by + 4, x - 4, end, COL.rain, 1.4, { opacity: 0.8 }));
    }
    const wallPx = (wall / 1000) * 50;
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.sky }),
      ...rain,
      heapAt(100, by, 60, Math.max(30, by - 14)),
      base >= 2 ? polyline([[96, by + 4], [88, by + 30], [98, by + 30], [86, by + 60]], COL.sun, 2.5) : null,
      // The cold outflow along the ground, and the dust it raises at its leading edge.
      svg('path', { d: `M110,${ground} L110,${ground - 30} Q${front - 30},${ground - 34} ${front},${ground} Z`, fill: tint(COL.cold, 0.45) }),
      wall > 0 ? svg('path', { d: `M${front - 50},${ground} L${front - 40},${ground - wallPx} Q${front},${ground - wallPx - 6} ${front + 8},${ground} Z`, fill: COL.dust, opacity: 0.85 }) : null,
      arrow(126, by + 20, 126, ground - 36, COL.coldInk, 2.5),
      arrow(front - 60, ground - 12, front - 10, ground - 12, COL.coldInk, 1.5 + gust / 25),
      svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: soil === 2 ? '#7a6a3a' : COL.field }),
      small(W - 8, 16, `cloud base ${height(base * 1000, ctx.save.units)}`, { anchor: 'end', bold: true }),
      small(W - 8, 30, `rain reaching the ground: ${Math.round(lands * 100)}%`, { anchor: 'end', fill: COL.blue, bold: true }),
      small(W - 8, 44, `downdraft ${deg(chill)} colder than the air`, { anchor: 'end', fill: COL.coldInk, bold: true }),
      small(W - 8, 58, `gust front ${gust} km/h`, { anchor: 'end', bold: true }),
      small(W - 8, 72, wall > 0 ? `dust ${height(wall, ctx.save.units)} high` : 'no dust lifted', { anchor: 'end', bold: true, fill: '#6a5a40' }),
      small(W / 2, H - 6, SOIL_NAMES[soil].toLowerCase(), { anchor: 'middle', bold: true, fill: '#fff' }),
    );
    if (asking) {
      f.readout.textContent = `A storm with its base ${height(1000, ctx.save.units)} up: most of its rain lands, and its gust front blows ${gust} km/h. Raise its base to ${height(3000, ctx.save.units)}, over the same dry fields. What happens to the gust?`;
      return;
    }
    const verdict = pick.picked() < 0 || base < 2.9 ? '' : pick.picked() === DUST_RIGHT ? 'As you guessed. ' : 'Not what you guessed. ';
    f.readout.textContent = verdict + (lands < 0.25
      ? `Almost none of the rain lands: it evaporates on the way down through the dry air, chilling the downdraft ${deg(chill)} below the air round it. That cold, heavy air slams down and spreads out at ${gust} km/h. Lightning with little or no rain: dry lightning.`
      : `${Math.round(lands * 100)}% of the rain lands. What evaporates on the way down chills the downdraft ${deg(chill)}, and it spreads out along the ground at ${gust} km/h.`)
      + (wall > 0 ? ` Over ${SOIL_NAMES[soil].toLowerCase()} fields it lifts a wall of dust ${height(wall, ctx.save.units)} high.` : ' It lifts no dust off these fields.');
    if (t.goal === 'dust' && !asking && wall >= 1000) t.done();
  };
  let asking = t.goal === 'dust';
  const baseS = slider('Cloud base', 0.5, 3.5, 0.1, base, (v) => height(v * 1000, ctx.save.units), (v) => { base = v; paint(); }, 'ink');
  const soilC = choices(SOIL_NAMES, (i) => { soil = i; paint(); });
  const pick = choices(DUST_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Raise the base', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([baseS], false);
    soilC.freeze(false);
    base = 3;
    baseS.set(3);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(el('div.fig-guess', {}, soilC.node), baseS.node);
  soilC.pick(0);
  soilC.freeze(asking);
  lock([baseS], asking);
  if (asking && typeof t.kept === 'number' && DUST_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- Down the slope ------------------------------------------------------------------------

const TOP_M = 1500;
const TOP_C = 15;
const TOP_DEW = -2;
const SLOPE_GUESSES = ['About the same, 15 °C', 'About 20 °C', 'About 30 °C'] as const;
const SLOPE_RIGHT = 2;

export const downslopeFigure = figure(['sink'], (ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 3);
  const yOf = (m: number) => 200 - m * 0.11;
  // The slope: a plateau on the left, falling away to the lowlands on the right.
  const xAt = (m: number) => 60 + ((TOP_M - m) / TOP_M) * 300;
  const slope: P[] = [[0, yOf(TOP_M)], [60, yOf(TOP_M)]];
  for (let m = TOP_M; m >= 0; m -= 50) slope.push([xAt(m) + 12 * Math.sin(m / 160), yOf(m)]);
  slope.push([W, yOf(0)]);
  const g = svg('g');
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }),
    svg('polygon', { points: points([...slope, [W, H], [0, H]]), fill: COL.field }),
    small(10, yOf(TOP_M) + 18, 'the plateau', { fill: '#fff', bold: true }),
    small(W - 10, yOf(0) + 18, 'the lowlands', { anchor: 'end', fill: '#fff', bold: true }),
    g,
  );
  let at = TOP_M;
  const paint = () => {
    const p = sinkTo(TOP_M, TOP_C, TOP_DEW, at);
    const px = xAt(at) + 12 * Math.sin(at / 160);
    const py = yOf(at) - 14;
    redraw(g,
      at < TOP_M ? arrow(xAt(TOP_M) + 4, yOf(TOP_M) - 14, px - 12, py - 4, COL.parcel, 1.5) : null,
      svg('circle', { cx: px, cy: py, r: 11, fill: tint(COL.parcel, 0.85), stroke: COL.warmInk }),
      label(Math.min(px + 16, W - 110), py - 22, deg(Math.round(p.c)), { bold: true, fill: COL.warmInk, halo: COL.sky }),
      small(Math.min(px + 16, W - 110), py - 8, `humidity ${p.humidity}%`, { bold: true, fill: COL.dew, halo: COL.sky }),
      small(10, 16, `${height(at, ctx.save.units)} up`, { bold: true }),
    );
    if (asking) {
      f.readout.textContent = `Air on the plateau, ${height(TOP_M, ctx.save.units)} up: ${deg(TOP_C)}, humidity ${p.humidity}%. The wind carries it down the slope to the lowlands near sea level. How warm is it at the bottom?`;
      return;
    }
    const verdict = pick.picked() < 0 || at > 0 ? '' : pick.picked() === SLOPE_RIGHT ? 'As you guessed. ' : 'Not what you guessed. ';
    f.readout.textContent = verdict + (at >= TOP_M
      ? 'On the plateau. Drag it down the slope.'
      : `Sunk ${height(TOP_M - at, ctx.save.units)}: squeezed by the heavier air below, it has warmed ${deg(Math.round(p.c - TOP_C))}, about 10 °C a kilometre, with no heat added. It holds the same vapour, but warmer air could hold much more, so its humidity has fallen to ${p.humidity}%.`);
    if (t.goal === 'sink' && !asking && at <= 100) t.done();
  };
  let asking = t.goal === 'sink';
  const atS = slider('Height', 0, TOP_M, 50, at, (v) => height(v, ctx.save.units), (v) => { at = v; paint(); }, 'parcel');
  const pick = choices(SLOPE_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Let it sink', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([atS], false);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(atS.node);
  lock([atS], asking);
  if (asking && typeof t.kept === 'number' && SLOPE_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- Through the gap -----------------------------------------------------------------------

export const gorgeGapFigure = figure(['gap'], (_ctx, t) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 3);
  const g = svg('g');
  const gapTop = 98;
  const gapBottom = 122;
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#cfd9b8' }),
    svg('rect', { x: 0, y: 0, width: 40, height: H, fill: OCEAN }),
    small(20, 16, 'Pacific', { anchor: 'middle', bold: true, fill: '#fff' }),
    // The Cascades, broken by the Gorge.
    svg('rect', { x: 180, y: 0, width: 46, height: gapTop, fill: PEAK }),
    svg('rect', { x: 180, y: gapBottom, width: 46, height: H - gapBottom, fill: PEAK }),
    small(203, 16, 'Cascades', { anchor: 'middle', bold: true, fill: '#fff' }),
    line(0, 110, W, 110, COL.rain, 3, { opacity: 0.7 }),
    small(203, gapBottom + 14, 'the Gorge', { anchor: 'middle', bold: true, fill: '#fff' }),
    small(110, H - 10, 'west: the lowlands', { anchor: 'middle', bold: true }),
    small(310, H - 10, 'east: the basin', { anchor: 'middle', bold: true }),
    g,
  );
  let dp = 2;
  let season = 0;
  const paint = () => {
    const v = gapWind(dp);
    const len = 20 + v * 1.2;
    const fans: SVGElement[] = [-1, 0, 1].map((k) => arrow(176, 110, 176 - len * 0.7, 110 + k * len * 0.45, season ? COL.parcel : COL.coldInk, 1.5 + v / 40));
    redraw(g,
      label(320, 60, 'H', { anchor: 'middle', bold: true, fill: COL.blue, size: 'note' }),
      small(320, 76, `${dp} hPa higher`, { anchor: 'middle', bold: true, fill: COL.blue }),
      label(100, 60, 'L', { anchor: 'middle', bold: true, fill: COL.red, size: 'note' }),
      arrow(290, 110, 232, 110, season ? COL.parcel : COL.coldInk, 2 + v / 30),
      ...(v > 10 ? fans : []),
      small(310, 150, season ? `${deg(32)}, humidity 15%` : `${deg(-6)}: a cold pool`, { anchor: 'middle', bold: true, fill: season ? COL.warmInk : COL.coldInk }),
      note(110, 196, `${v} km/h`, { anchor: 'middle', bold: true }),
    );
    f.readout.textContent = season
      ? `${v} km/h out of the Gorge. Late summer: hot, dry air from the interior pours west through the gap, sinking and drying further as it comes off the mountains. A spark in that wind becomes a fire that runs.`
      : `${v} km/h out of the Gorge. Winter: the cold pool east of the mountains pours west through the gap as a bitter wind${v >= 40 ? ', and a Pacific storm riding over it brings freezing rain to the mouth of the Gorge' : ''}.`;
    if (t.goal === 'gap' && v >= 60) t.done();
  };
  const dpS = slider('Pressure difference, east minus west', 0, 12, 0.5, dp, (v) => `${v} hPa`, (v) => { dp = v; paint(); }, 'ink');
  const seasonC = choices(['Winter', 'Late summer'], (i) => { season = i; paint(); });
  f.controls.append(el('div.fig-guess', {}, seasonC.node), dpS.node);
  seasonC.pick(0);
  paint();
  return f.node;
});

// ---- The Santa Ana ---------------------------------------------------------------------------

export const santaAnaDiagram: FigureFactory = (ctx) => {
  const W = 400;
  const H = 210;
  const d = still(W, H);
  const yOf = (m: number) => 180 - m * 0.075;
  const top = sinkTo(1200, 18, -6, 1200);
  const coast = sinkTo(1200, 18, -6, 0);
  const land: P[] = [[0, yOf(1200)], [150, yOf(1250)], [180, yOf(2000)], [200, yOf(1500)], [215, yOf(1900)], [250, yOf(900)], [300, yOf(300)], [340, yOf(30)], [350, yOf(0)]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }),
    svg('rect', { x: 340, y: yOf(0), width: 60, height: H - yOf(0), fill: OCEAN }),
    svg('polygon', { points: points([...land, [350, H], [0, H]]), fill: COL.field }),
    label(60, yOf(1200) - 46, 'H', { anchor: 'middle', bold: true, fill: COL.blue, size: 'note' }),
    polyline([[30, yOf(1200) - 16], [150, yOf(1250) - 16], [196, yOf(1500) - 22], [250, yOf(900) - 18], [300, yOf(300) - 16], [338, yOf(20) - 12]], COL.parcel, 2.5, { 'stroke-dasharray': '6 4' }),
    arrow(318, yOf(160) - 14, 345, yOf(0) - 12, COL.parcel, 2.5),
    small(10, yOf(1200) + 18, `high desert, ${height(1200, ctx.save.units)}`, { fill: '#fff', bold: true }),
    small(10, yOf(1200) + 32, `${deg(Math.round(top.c))}, humidity ${top.humidity}%`, { fill: '#fff', bold: true }),
    small(W - 6, yOf(0) - 40, 'the coast', { anchor: 'end', bold: true }),
    small(W - 6, yOf(0) - 26, `${deg(Math.round(coast.c))}, ${coast.humidity}%`, { anchor: 'end', bold: true, fill: COL.warmInk }),
    small(198, yOf(2000) - 8, 'mountain passes', { anchor: 'middle', soft: true }),
    note(8, H - 8, 'The same air, sinking 1,200 m: warmer and far drier.', { fill: '#fff' }),
  );
  return { node: d.node };
};
