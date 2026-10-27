// Figures for a week of winter rain on the Pacific Northwest: the jet stream
// and the Pacific High swinging north and south through the year, and
// Seattle's rain with them; a river of vapour reaching from the tropics to the
// coast; a wind off the sea wringing rain out on a mountain slope; the rain
// across Washington from the ocean to the dry interior; the snow level on a
// mountain river's basin; and the band of showers where the wind meets itself
// behind the Olympics.

import { svg } from 'lesson-kit/dom';
import type { Units } from 'lesson-kit/progress';
import { BASIN_TOP_M, FLOOD_MM, MONTHS, SEATTLE_MM, SNOWPACK_FROM_M, basinDay, jetLatitude, pacificHigh, windwardRain } from '../../core/rivers';
import { arrow, curve, flake, label, line, note, points, polyline, redraw, small, still, type P } from './draw';
import { COL, figure, frame, height, slider, tint, type FigureFactory } from './kit';
import { MAP, SEA, head, pacificX, pacificY, westCoast } from './wind';

const LAND = '#a39150';
const OCEAN = '#9cc3dc';
const PEAK = '#8a7a48';

/** A year's or a day's rain, in millimetres or inches as the reader likes. */
function rain(mm: number, units: Units): string {
  if (units === 'metric') return `${mm.toLocaleString()} mm`;
  const inches = mm / 25.4;
  return `${inches < 10 ? inches.toFixed(1) : Math.round(inches)} in`;
}

// ---- The storm track through the year ---------------------------------------

export const stormTrackFigure = figure(['seasons'], (ctx, t) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 3);
  const top = 10;
  const h = 170;
  const g = svg('g');
  const barTop = 200;
  const barBase = 276;
  const bx = (i: number) => 44 + i * 29;
  f.svg.append(
    svg('rect', { x: 0, y: top, width: W, height: h, fill: SEA }),
    westCoast(top, h),
    svg('circle', { cx: pacificX(122.3), cy: pacificY(47.6, top, h), r: 3.5, fill: COL.ink }),
    small(pacificX(122.3) + 6, pacificY(47.6, top, h) + 3, 'Seattle'),
    g,
    line(36, barBase, W - 8, barBase, COL.ink, 1),
    small(4, barTop + 4, 'Seattle', { soft: true }),
    small(4, barTop + 15, 'rain', { soft: true }),
    ...MONTHS.map((m, i) => small(bx(i) + 10, barBase + 12, m[0], { anchor: 'middle', soft: true })),
  );
  let month = 7;
  const seen = { dry: false, wet: false };
  const paint = () => {
    const jet = jetLatitude(month);
    const hi = pacificHigh(month);
    const path: P[] = Array.from({ length: 37 }, (_, i) => {
      const lon = 205 - i * 2.5;
      return [pacificX(lon), pacificY(jet + 3 * Math.sin(i / 5.5), top, h)];
    });
    const hx = pacificX(142);
    const hy = pacificY(hi.lat, top, h);
    const mm = SEATTLE_MM[month - 1];
    redraw(g,
      svg('ellipse', { cx: hx, cy: hy, rx: 26 + 46 * hi.size, ry: 14 + 26 * hi.size, fill: tint(COL.sun, 0.18), stroke: COL.sunInk, 'stroke-width': 1.2, 'stroke-dasharray': '5 3' }),
      label(hx - 5, hy + 5, 'H', { bold: true, fill: COL.blue }),
      polyline(path, COL.env, 7, { opacity: 0.5 }),
      head(path, COL.env, 13),
      ...[8, 20, 32].map((i) => label(path[i][0] - 5, path[i][1] + 18, 'L', { bold: true, fill: COL.red })),
      small(path[2][0], path[2][1] - 10, 'jet stream', { fill: COL.env, bold: true, halo: SEA }),
      ...SEATTLE_MM.map((v, i) => svg('rect', { x: bx(i), y: barBase - v * 0.45, width: 20, height: v * 0.45, rx: 2, fill: i === month - 1 ? COL.rain : COL.cloudShade })),
      small(bx(month - 1) + 10, barBase - mm * 0.45 - 4, rain(mm, ctx.save.units), { anchor: 'middle', bold: true, fill: COL.coldInk, halo: COL.paper }),
    );
    if (mm < 30) seen.dry = true;
    if (mm > 140) seen.wet = true;
    const w = (1 + Math.cos(((month - 1) / 12) * 2 * Math.PI)) / 2;
    const why = w > 0.7
      ? 'The jet stream has swung south and runs straight at the coast, bringing a new low every day or two. The High has shrunk and slipped south, out of the way.'
      : w < 0.3
        ? 'The High is big and has moved north, and the jet stream and its lows pass far to the north, over Alaska. The coast is dry.'
        : month < 7
          ? 'The High is growing and moving north, nudging the jet stream and its lows away from the coast.'
          : 'The High is shrinking and the jet stream is sliding south again, and the lows with it.';
    f.readout.textContent = `${MONTHS[month - 1]}: about ${rain(mm, ctx.save.units)} of rain in Seattle. ${why}`;
    if (t.goal === 'seasons' && seen.dry && seen.wet) t.done();
  };
  f.controls.append(slider('Month', 1, 12, 1, month, (v) => MONTHS[v - 1], (v) => { month = v; paint(); }, 'ink').node);
  paint();
  return f.node;
});

// ---- An atmospheric river ---------------------------------------------------

export const atmosphericRiverDiagram: FigureFactory = () => {
  const W = 400;
  const H = 216;
  const d = still(W, H);
  const top = 16;
  // Down to 15° N, to fit Hawaii in.
  const h = 180;
  const at = (lon: number, lat: number): P => [pacificX(lon), pacificY(lat, top, h)];
  const mid = curve(at(158, 22), at(140, 31), at(124.5, 46), 30);
  // The band: wider out at sea, narrowing as it reaches the coast.
  const side = (s: number) => mid.map(([x, y], i): P => {
    const [nx, ny] = mid[Math.min(i + 1, mid.length - 1)];
    const [px, py] = mid[Math.max(i - 1, 0)];
    const len = Math.hypot(nx - px, ny - py) || 1;
    const wdt = 16 - 6 * (i / mid.length);
    return [x - (s * (ny - py) * wdt) / len, y + (s * (nx - px) * wdt) / len];
  });
  const low = at(142, 50);
  d.svg.append(
    svg('rect', { x: 0, y: top, width: W, height: h, fill: SEA }),
    westCoast(top, h),
    ...[30, 40, 50, 60].map((lat) => small(4, pacificY(lat, top, h) - 2, `${lat}° N`, { soft: true })),
    svg('polygon', { points: points([...side(1), ...side(-1).reverse()]), fill: tint(COL.dew, 0.4), stroke: COL.dew, 'stroke-width': 1 }),
    polyline(mid.slice(0, -2), COL.dew, 1.5, { 'stroke-dasharray': '3 4' }),
    head(mid, COL.dew, 11),
    svg('circle', { cx: at(157, 20.5)[0], cy: at(157, 20.5)[1], r: 3, fill: COL.ink }),
    small(at(157, 20.5)[0] - 7, at(157, 20.5)[1] + 4, 'Hawaii', { anchor: 'end' }),
    label(low[0] - 5, low[1] + 5, 'L', { bold: true, fill: COL.red }),
    small(low[0] + 10, low[1] + 3, 'a deep low', { fill: COL.redInk }),
    note(36, pacificY(41, top, h), 'a river of water vapour', { fill: COL.dew, bold: true, halo: SEA }),
    small(36, pacificY(41, top, h) + 12, 'about 2,000 km long, 400 km wide', { fill: COL.dew, halo: SEA }),
    svg('circle', { cx: pacificX(122.3), cy: pacificY(47.6, top, h), r: 3.5, fill: COL.ink }),
    small(pacificX(122.3) + 6, pacificY(47.6, top, h) + 3, 'Seattle'),
    note(4, H - 6, 'Warm, damp air drawn up from the tropics ahead of a low’s cold front.', { soft: true }),
  );
  return { node: d.node };
};

// ---- Rain wrung out on the windward slope ------------------------------------

export const windwardFigure = figure(['flood'], (ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 3);
  const ground = 200;
  const shore = 130;
  const peakX = 300;
  const peakY = 70;
  const groundAt = (x: number) => (x < shore ? ground : x < peakX ? ground - ((x - shore) / (peakX - shore)) ** 1.3 * (ground - peakY) : peakY + ((x - peakX) / 80) * (ground - peakY) * 0.7);
  const terrain: P[] = [];
  for (let x = shore; x <= W; x += 5) terrain.push([x, groundAt(x)]);
  let wind = 20;
  let vapour = 12;
  const g = svg('g');
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }),
    svg('rect', { x: 0, y: ground, width: shore, height: H - ground, fill: OCEAN }),
    g,
    svg('polygon', { points: points([[shore, H], ...terrain, [W, H]]), fill: LAND }),
    small(8, ground + 18, 'the ocean', { fill: COL.coldInk }),
    small(peakX, peakY + 40, 'coast range', { anchor: 'middle', fill: '#fff', bold: true }),
  );
  const paint = () => {
    const mm = windwardRain(wind, vapour);
    // The cloud: its base lower with more vapour, reaching further out to sea with more wind, and hugging the slope up to the top.
    const base = 150 - vapour * 1.4;
    const from = Math.max(16, shore - 30 - wind * 0.8);
    const under: P[] = [];
    for (let x = from; x <= peakX; x += 10) under.push([x, Math.min(base, groundAt(x) - 2)]);
    const cloud = svg('polygon', {
      points: points([...under, [peakX + 22, peakY + 14], [peakX + 14, 34], [peakX - 60, 26], [from + 40, 34], [from, base - 26]]),
      fill: '#ffffff', opacity: 0.9, stroke: COL.cloudShade,
    });
    // Rain: most of it on the slope, where the lift is.
    const streaks: SVGElement[] = [];
    const n = Math.min(70, Math.round(mm / 3));
    for (let i = 0; i < n; i++) {
      const x = from + 8 + ((i * 37) % Math.max(1, peakX - from - 8));
      if (x < shore && i % 3) continue;
      const floor = groundAt(x) - 1;
      const y0 = Math.min(base, floor - 26) + ((i * 7) % 10);
      const y1 = Math.min(floor, y0 + 10 + mm / 12);
      if (y1 > y0 + 3) streaks.push(line(x, y0, x - 3, y1, COL.rain, 1.3));
    }
    const flow = [0, 1].map((k) => {
      const pts: P[] = [];
      for (let x = 10; x <= W - 10; x += 10) pts.push([x, Math.max(10, groundAt(x) - 22 - k * 28)]);
      return polyline(pts, COL.ink, 1 + wind / 60, { opacity: 0.25 + wind / 300, fill: 'none' });
    });
    redraw(g,
      cloud,
      ...streaks,
      ...(wind > 0 ? flow : []),
      arrow(20, 30, 70, 30, COL.ink, 1.5 + wind / 30),
      small(20, 22, `wind ${wind} km/h`, { bold: true }),
      small(W - 6, 16, `rain on the slope: ${rain(mm, ctx.save.units)} a day`, { anchor: 'end', bold: true, fill: mm >= 150 ? COL.redInk : COL.coldInk, halo: COL.sky }),
    );
    const kind = mm < 30 ? 'an ordinary showery day' : mm < 90 ? 'a wet day, a steady soaking' : mm < 150 ? 'heavy rain: the streams are rising fast' : 'a deluge: the rivers off these slopes will flood within a day';
    f.readout.textContent = `The wind lifts the damp sea air up the slope; it cools, and the vapour it carries is wrung out as rain. ${rain(mm, ctx.save.units)} a day: ${kind}. Double the wind, or the vapour, and the rain doubles.`;
    if (t.goal === 'flood' && mm >= 150) t.done();
  };
  f.controls.append(
    slider('Wind towards the mountains', 0, 100, 5, wind, (v) => `${v} km/h`, (v) => { wind = v; paint(); }, 'ink').node,
    slider('Water vapour in the air', 5, 40, 1, vapour, (v) => `${v} mm`, (v) => { vapour = v; paint(); }, 'dew').node,
  );
  paint();
  return f.node;
});

// ---- Across Washington ------------------------------------------------------

/** A walk across Washington with a winter storm's wind, schematically: x on the page, ground height in m, and a year's rain where marked. */
const ACROSS: { x: number; m: number; place?: string; mm?: number }[] = [
  { x: 0, m: 0 },
  { x: 40, m: 0 },
  { x: 62, m: 150, place: 'Hoh rainforest', mm: 3600 },
  { x: 100, m: 900 },
  { x: 125, m: 2430 },
  { x: 150, m: 900 },
  { x: 178, m: 30, place: 'Sequim', mm: 400 },
  { x: 196, m: 0 },
  { x: 224, m: 0 },
  { x: 236, m: 60, place: 'Seattle', mm: 950 },
  { x: 280, m: 800 },
  { x: 312, m: 1200, place: 'Cascades', mm: 2300 },
  { x: 326, m: 2000 },
  { x: 342, m: 1000 },
  { x: 372, m: 400, place: 'Columbia Basin', mm: 200 },
  { x: 400, m: 400 },
];

export const acrossWashingtonDiagram: FigureFactory = (ctx) => {
  const W = 400;
  const H = 270;
  const d = still(W, H);
  const base = 250;
  const yOf = (m: number) => base - (m / 2500) * 80;
  const barBase = 140;
  const bar = (mm: number) => (mm / 3600) * 96;
  const groundPts = ACROSS.map((p): P => [p.x, yOf(p.m)]);
  const water = (x: number, w: number, name: string) => [
    svg('rect', { x, y: yOf(0) - 1, width: w, height: H - yOf(0) + 1, fill: OCEAN }),
    small(x + w / 2, H - 6, name, { anchor: 'middle', fill: COL.coldInk, bold: true }),
  ];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }),
    svg('polygon', { points: points([[0, H], ...groundPts, [W, H]]), fill: LAND }),
    ...water(0, 42, 'Pacific'),
    ...water(192, 36, 'Sound'),
    line(0, barBase, W, barBase, COL.grid, 1),
    arrow(8, 14, 70, 14, COL.ink, 2),
    small(76, 18, 'storm wind off the ocean', { bold: true }),
    small(W - 4, 18, 'a year’s rain and snow', { anchor: 'end', soft: true }),
    small(125, yOf(2430) - 6, 'Mount Olympus', { anchor: 'middle', bold: true }),
    ...ACROSS.flatMap((p) => {
      if (!p.mm || !p.place) return [];
      const bh = bar(p.mm);
      const end = p.x > 360;
      return [
        svg('rect', { x: p.x - 9, y: barBase - bh, width: 18, height: bh, rx: 2, fill: p.mm > 2000 ? COL.rain : p.mm > 600 ? tint(COL.rain, 0.6) : tint(COL.rain, 0.3) }),
        small(p.x, barBase - bh - 4, rain(p.mm, ctx.save.units), { anchor: 'middle', bold: true, fill: COL.coldInk, halo: COL.sky }),
        small(end ? p.x + 12 : p.x, barBase + (end ? 24 : 12), p.place, { anchor: end ? 'end' : 'middle', fill: COL.ink }),
        line(p.x, barBase + 16, p.x, yOf(p.m) - 3, COL.grid, 1, { 'stroke-dasharray': '2 3' }),
      ];
    }),
  );
  return { node: d.node };
};

// ---- The snow level on a mountain river ------------------------------------

export const snowLevelFigure = figure(['flood'], (ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const x0 = 20;
  const x1 = 320;
  const ground = 228;
  const yOf = (m: number) => ground - (m / BASIN_TOP_M) * 190;
  const mAt = (x: number) => BASIN_TOP_M * ((x - x0) / (x1 - x0)) ** 1.15 + 60 * Math.sin(x / 13) * ((x - x0) / (x1 - x0));
  const slope: P[] = [];
  for (let x = x0; x <= x1; x += 4) slope.push([x, yOf(Math.max(0, mAt(x)))]);
  const gx = 350;
  const gTop = 40;
  const gBottom = 210;
  const gy = (mm: number) => gBottom - (mm / 140) * (gBottom - gTop);
  let level = 900;
  const g = svg('g');
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: 330, height: H, fill: COL.sky }),
    svg('rect', { x: gx - 12, y: gTop, width: 24, height: gBottom - gTop, rx: 4, fill: COL.paper }),
    g,
    svg('rect', { x: gx - 12, y: gTop, width: 24, height: gBottom - gTop, rx: 4, fill: 'none', stroke: COL.ink }),
    line(gx - 18, gy(FLOOD_MM), gx + 18, gy(FLOOD_MM), COL.redInk, 2, { 'stroke-dasharray': '4 2' }),
    small(gx - 20, gy(FLOOD_MM) + 3, 'flood', { anchor: 'end', fill: COL.redInk, bold: true }),
    small(gx, gBottom + 14, 'the river', { anchor: 'middle' }),
    small(x0 + 4, ground + 16, 'the town at the river mouth', { fill: COL.ink }),
  );
  const paint = () => {
    const { rainShare, meltMm, runoffMm } = basinDay(level);
    const sl = yOf(Math.min(level, BASIN_TOP_M + 200));
    const snowpack: P[] = slope.filter(([x]) => mAt(x) >= SNOWPACK_FROM_M);
    const melting: P[] = snowpack.filter(([x]) => mAt(x) < level);
    const fall: SVGElement[] = [];
    for (let i = 0; i < 26; i++) {
      const x = x0 + 10 + ((i * 47) % (x1 - x0 - 10));
      const y = 30 + ((i * 29) % 150);
      if (y > yOf(Math.max(0, mAt(x))) - 6) continue;
      fall.push(y < sl ? flake(x, y, 4) : line(x, y, x - 3, y + 11, COL.rain, 1.4));
    }
    redraw(g,
      svg('polygon', { points: points([[x0, ground], ...slope, [x1, H], [x0, H]]), fill: LAND }),
      svg('rect', { x: 0, y: ground, width: x0, height: H - ground, fill: OCEAN }),
      snowpack.length > 1 ? polyline(snowpack, '#ffffff', 7, { 'stroke-linecap': 'round' }) : null,
      melting.length > 1 ? polyline(melting, '#b7c7d9', 7, { 'stroke-linecap': 'round' }) : null,
      ...fall,
      ...(level <= BASIN_TOP_M ? [line(0, sl, 330, sl, COL.ice, 1.5, { 'stroke-dasharray': '6 3' }), small(6, sl - 5, `snow level ${height(level, ctx.save.units)}`, { fill: COL.ice, bold: true, halo: COL.sky })] : [small(6, 14, 'rain right to the top', { fill: COL.ice, bold: true })]),
      svg('rect', { x: gx - 10, y: gy(Math.min(140, runoffMm)), width: 20, height: gBottom - gy(Math.min(140, runoffMm)), rx: 3, fill: runoffMm >= FLOOD_MM ? COL.red : COL.rain }),
    );
    const pct = Math.round(rainShare * 100);
    const meltNote = meltMm >= 1 ? `, and melts the old snow it falls on (grey), adding ${Math.round(meltMm)} mm more` : '';
    f.readout.textContent = `The same 100 mm of water falls on the whole basin. Below the snow level it falls as rain, on ${pct}% of the basin, and runs straight off${meltNote}. Above, it falls as snow and stays put. The river carries off ${runoffMm} mm a day: ${runoffMm >= FLOOD_MM ? 'it floods.' : 'high, but in its banks.'}`;
    if (t.goal === 'flood' && runoffMm >= FLOOD_MM) t.done();
  };
  f.controls.append(slider('Snow level', 300, 3000, 100, level, (v) => height(v, ctx.save.units), (v) => { level = v; paint(); }, 'ice').node);
  paint();
  return f.node;
});

// ---- The convergence zone ---------------------------------------------------

export const convergenceZoneDiagram: FigureFactory = () => {
  const W = 400;
  const H = 260;
  const d = still(W, H);
  const land = (pts: P[]) => svg('polygon', { points: points(pts), fill: MAP, stroke: '#b9b28a', 'stroke-width': 1.2 });
  const north: P[] = [[60, 62], [130, 64], [215, 68], [244, 84], [248, 118], [250, 132]];
  const south: P[] = [[18, 84], [20, 200], [40, 238], [120, 244], [200, 240], [240, 220], [252, 154]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: SEA }),
    land([[0, 0], [250, 0], [270, 30], [190, 40], [90, 20], [0, 30]]),
    land([[40, 70], [200, 74], [232, 92], [228, 222], [40, 222]]),
    land([[262, 70], [400, 50], [400, H], [262, H], [270, 200], [258, 120]]),
    svg('ellipse', { cx: 130, cy: 145, rx: 62, ry: 46, fill: tint(PEAK, 0.5), stroke: PEAK }),
    label(130, 142, 'Olympic', { anchor: 'middle', bold: true, fill: '#4d4428' }),
    label(130, 156, 'Mountains', { anchor: 'middle', bold: true, fill: '#4d4428' }),
    svg('rect', { x: 366, y: 50, width: 34, height: H - 50, fill: tint(PEAK, 0.4) }),
    small(383, 250, 'Cascades', { anchor: 'middle', attrs: { transform: '' } }),
    small(150, 52, 'Strait of Juan de Fuca', { anchor: 'middle', soft: true }),
    small(258, 254, 'Puget Sound', { soft: true }),
    polyline(north, COL.ink, 2.5),
    head(north, COL.ink, 10),
    polyline(south, COL.ink, 2.5),
    head(south, COL.ink, 10),
    svg('ellipse', { cx: 296, cy: 142, rx: 60, ry: 15, fill: tint(COL.rain, 0.45), stroke: COL.rain }),
    note(318, 120, 'a band of heavy showers', { anchor: 'middle', bold: true, fill: COL.coldInk, halo: MAP }),
    svg('circle', { cx: 284, cy: 142, r: 3, fill: COL.ink }),
    small(290, 146, 'Everett'),
    svg('circle', { cx: 276, cy: 196, r: 3.5, fill: COL.ink }),
    small(283, 200, 'Seattle'),
    arrow(10, 12, 34, 30, COL.ink, 2.5),
    small(8, 46, 'wind from', { bold: true }),
    small(8, 57, 'the north-west', { bold: true }),
  );
  return { node: d.node };
};
