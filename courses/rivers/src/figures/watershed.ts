// Lesson 1, Which sea does a raindrop reach?: where rain goes once it lands
// on a forested hillside (a still), and a year of water in Seattle's Cedar
// River watershed, with a warm winter like 2015's that turns the snow to rain.

import { svg } from 'didactics/dom';
import { arrow, line, redraw, small, still } from 'didactics/draw';
import { COL, type FigureFactory, figure, frame, guessFirst, player, slider, tint, toggles } from './kit';

const W = 400;

// ---- Where rain goes (still) ----------------------------------------------------------------------

export const pathsStill = () => {
  const s = still(W, 236);
  const ground = (x: number) => 66 + x * 0.24; // the hillside falls to the right, to a stream at 368
  const table = (x: number) => 156 + x * 0.03;
  const parts: SVGElement[] = [];
  const top = [...Array.from({ length: 18 }, (_, i) => [i * 20, ground(i * 20)] as const), [344, 149], [356, 168], [380, 168], [392, 150], [400, 150]] as const;
  parts.push(
    svg('path', { d: `M0,236 L${top.map(([x, y]) => `${x},${y}`).join(' L')} L400,236 Z`, fill: tint(COL.land, 0.35) }),
    svg('path', { d: `M0,236 L0,${table(0)} L340,${table(340)} L400,${table(400)} L400,236 Z`, fill: tint(COL.ground, 0.35) }),
    svg('path', { d: 'M347,158 L356,168 L380,168 L389,158 Z', fill: COL.water }),
    svg('polyline', { points: top.map(([x, y]) => `${x},${y}`).join(' '), fill: 'none', stroke: COL.land, 'stroke-width': 2 }),
    line(0, table(0), 340, table(340), COL.ground, 1, { 'stroke-dasharray': '4 3' }),
  );
  // Rain.
  for (let k = 0; k < 14; k++) {
    const x = 14 + k * 27;
    parts.push(line(x, 6 + (k % 3) * 5, x - 5, 22 + (k % 3) * 5, COL.rain, 1.5));
  }
  // A tree, its crown catching rain, and water going back to the air.
  const tx = 70;
  parts.push(
    line(tx, ground(tx), tx, ground(tx) - 40, COL.rock, 4),
    svg('path', { d: `M${tx - 24},${ground(tx) - 34} L${tx},${ground(tx) - 86} L${tx + 24},${ground(tx) - 34} Z`, fill: COL.leaf }),
    svg('path', { d: `M${tx},${ground(tx)} l-14,18 M${tx},${ground(tx)} l12,20 M${tx},${ground(tx) + 4} l0,22`, stroke: COL.rock, 'stroke-width': 1.5, fill: 'none' }),
  );
  const up = (x: number, y: number) => svg('path', { d: `M${x},${y} q-5,-8 0,-16 q5,-8 0,-16`, fill: 'none', stroke: COL.soft, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' });
  parts.push(up(tx - 32, 62), up(tx + 32, 60), up(134, ground(134) - 6));
  parts.push(small(146, 46, 'back to the air, from', { soft: true }), small(146, 57, 'wet leaves, soil and trees', { soft: true }));
  // Over the surface: rare under forest, the rule on pavement.
  parts.push(
    arrow(236, ground(236) - 6, 300, ground(300) - 6, COL.water, 2),
    small(262, ground(262) - 28, 'over the top, only', { fill: COL.water, anchor: 'middle' }),
    small(262, ground(262) - 17, 'when the soil is full', { fill: COL.water, anchor: 'middle' }),
  );
  // Into the soil, through it to the stream, and down to the groundwater.
  parts.push(
    arrow(150, ground(150) + 4, 150, ground(150) + 26, COL.ground, 1.5),
    small(144, ground(150) + 20, 'soaks in', { fill: COL.ground, bold: true, anchor: 'end' }),
    arrow(196, ground(196) + 12, 334, ground(334) + 6, COL.ground, 1.5),
    small(112, ground(150) + 40, 'flows through the soil', { fill: COL.ground }),
    arrow(40, table(40) + 26, 340, table(340) + 10, COL.ground, 1.5),
    small(40, table(40) + 44, 'groundwater: weeks to years (lesson 3)', { fill: COL.ground }),
    small(4, table(4) - 4, 'water table', { soft: true }),
    small(368, 182, 'stream', { anchor: 'middle', bold: true, fill: COL.water }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- A year of water on the Cedar --------------------------------------------------------------------

/** The Cedar River municipal watershed: its area in km², and roughly how much rain and snow falls on it in a year, in mm. */
export const CEDAR = { area: 370, precip: 2400 } as const;

/** Seattle's supply in km³ a year (about 120 million US gallons a day), and the Cedar's share of it. */
export const SEATTLE = { use: 0.17, cedarShare: 2 / 3 } as const;

/** Rain and snow on the watershed in a year, in km³. */
export const fallsOnCedar = () => (CEDAR.area * 1e6 * (CEDAR.precip / 1000)) / 1e9;

/** The share of what falls on the Cedar watershed that Seattle drinks. */
export const seattleShare = () => (SEATTLE.use * SEATTLE.cedarShare) / fallsOnCedar();

const MONTHS = ['October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'];
/** Each month's share of the year's rain and snow (sums to 1). */
const PRECIP = [0.075, 0.15, 0.15, 0.14, 0.11, 0.105, 0.075, 0.055, 0.045, 0.02, 0.025, 0.05];
/** Mean air temperature at 600 m, °C, October to September. */
const TEMP = [8, 4, 2, 1.5, 2.5, 3.5, 5.5, 9, 12, 15.5, 15.5, 12.5];
/** How much warmer a winter like 2015's was, °C. */
const WARMER = [1, 2.5, 3, 3, 3, 2.5, 1.5, 0, 0, 0, 0, 0];
/** What leaves and soil could send back to the air each month if never short of water, mm. */
const PET = [30, 12, 6, 6, 12, 25, 45, 70, 85, 100, 85, 50];
/** The watershed in bands by height: metres, share of the area. */
const BANDS = [[300, 0.15], [600, 0.25], [900, 0.27], [1200, 0.21], [1500, 0.12]] as const;

const monthOf = (w: number) => Math.min(11, Math.floor((w * 12) / 52));
const weeksIn = (m: number) => Array.from({ length: 52 }, (_, w) => monthOf(w)).filter((x) => x === m).length;

export interface Week {
  /** 0 is October. */
  month: number;
  /** Fell this week as rain and as snow, mm over the watershed. */
  rain: number;
  snowfall: number;
  /** Lying as snow at the week's end, mm of water. */
  snow: number;
  /** Back to the air, and out down the river, this week, mm. */
  air: number;
  river: number;
  /** Held in the soil and ground, mm. */
  ground: number;
}

/**
 * A model of a water year on the Cedar, week by week from 1 October: rain or
 * snow by the temperature in each height band (6 °C colder a kilometre up),
 * snow melting at 3.5 mm a day for each degree above freezing, rain and melt
 * going partly straight to the river and partly into the ground, which
 * drains a tenth of what it holds each week and gives water back to the air
 * as leaves and soil demand it. Calibrated to about 2.4 m of rain and snow a
 * year, about a fifth of it back to the air.
 */
export function waterYear(warm: boolean): Week[] {
  const snow = BANDS.map(() => 0);
  let ground = 70;
  const out: Week[] = [];
  for (let w = 0; w < 52; w++) {
    const m = monthOf(w);
    const p = (CEDAR.precip * PRECIP[m]) / weeksIn(m);
    let rain = 0;
    let snowfall = 0;
    let melt = 0;
    BANDS.forEach(([z, a], i) => {
      const T = TEMP[m] - (z - 600) * 0.006 + (warm ? WARMER[m] : 0);
      const asSnow = T <= -0.5 ? 1 : T >= 2.5 ? 0 : (2.5 - T) / 3;
      snow[i] += p * asSnow;
      snowfall += p * asSnow * a;
      rain += p * (1 - asSnow) * a;
      const mm = T > 0 ? Math.min(snow[i], T * 3.5 * 7) : 0;
      snow[i] -= mm;
      melt += mm * a;
    });
    const wet = rain + melt;
    const quick = 0.45 * wet;
    ground += wet - quick;
    const air = Math.min(ground, (PET[m] / weeksIn(m)) * Math.min(1, ground / 150));
    ground -= air;
    const slow = 0.1 * ground;
    ground -= slow;
    out.push({ month: m, rain, snowfall, snow: snow.reduce((s, v, i) => s + v * BANDS[i][1], 0), air, river: quick + slow, ground });
  }
  return out;
}

/** Millimetres a week over the watershed, as cubic metres a second. */
export const flowOf = (mmPerWeek: number) => (mmPerWeek * CEDAR.area * 1000) / (7 * 86400);

/** The river's mean flow through a month (0 is October), m³/s. */
export function monthFlow(year: readonly Week[], month: number): number {
  const ws = year.filter((w) => w.month === month);
  return flowOf(ws.reduce((s, w) => s + w.river, 0) / ws.length);
}

const season = (m: number, warm: boolean) => {
  if (m <= 1) return 'The autumn rains return, soaking the dry ground first. Snow starts to build on the high ridges.';
  if (m <= 5) return warm
    ? 'Warm storms bring rain even to the ridges, and it runs to the river: high winter flow, thin snow.'
    : 'On the upper slopes most of what falls stays as snow. The river carries the rain from the lower slopes.';
  if (m <= 8) return warm
    ? 'There is little snow left to melt, and the river is already dropping as the rains ease.'
    : 'The snow melts, and the river runs high long after the rains have eased.';
  return warm
    ? 'A low river: the water that would have melted out in June went down the river in January.'
    : 'Rain has nearly stopped. The river runs on the last of the melt and on water seeping from the ground.';
};

export const yearFigure = figure(['warm'], (ctx, t) => {
  const f = frame(W, 262, 4);
  const g = svg('g');
  f.svg.append(g);
  const years = { normal: waterYear(false), warm: waterYear(true) };
  let week = 0;
  let warm = false;
  const x0 = 34;
  const x1 = 266;
  const X = (w: number) => x0 + ((x1 - x0) * w) / 52;
  const panel = (top: number, h: number, max: number) => (v: number) => top + h - (Math.min(v, max) / max) * h;
  const P1 = { top: 26, h: 40, max: 90 };
  const P2 = { top: 92, h: 48, max: 700 };
  const P3 = { top: 166, h: 52, max: 50 };
  const y1 = panel(P1.top, P1.h, P1.max);
  const y2 = panel(P2.top, P2.h, P2.max);
  const y3 = panel(P3.top, P3.h, P3.max);
  const paint = () => {
    const yr = warm ? years.warm : years.normal;
    const other = warm ? years.normal : years.warm;
    const shown = yr.slice(0, Math.max(1, week));
    const parts: (SVGElement | null)[] = [];
    // Frames and titles.
    for (const [p, title] of [[P1, 'Falling, mm a week'], [P2, 'Lying as snow, mm of water'], [P3, 'The river, m³ a second']] as const) {
      parts.push(line(x0, p.top + p.h, x1, p.top + p.h, COL.ink, 1), small(x0, p.top - 5, title, { bold: true }));
    }
    parts.push(small(x0 - 3, y2(600) + 3, '600', { anchor: 'end', soft: true }), line(x0, y2(600), x1, y2(600), COL.grid, 1));
    parts.push(small(x0 - 3, y3(40) + 3, '40', { anchor: 'end', soft: true }), line(x0, y3(40), x1, y3(40), COL.grid, 1));
    parts.push(small(x0 - 3, y1(80) + 3, '80', { anchor: 'end', soft: true }), line(x0, y1(80), x1, y1(80), COL.grid, 1));
    // Rain and snow falling, as bars.
    shown.forEach((w, i) => {
      const bw = (x1 - x0) / 52 - 1;
      parts.push(
        svg('rect', { x: X(i) + 0.5, y: y1(w.rain), width: bw, height: P1.top + P1.h - y1(w.rain), fill: COL.rain }),
        svg('rect', { x: X(i) + 0.5, y: y1(w.rain + w.snowfall), width: bw, height: y1(w.rain) - y1(w.rain + w.snowfall), fill: COL.snow, stroke: COL.rain, 'stroke-width': 0.3 }),
      );
    });
    // The other year, faint, for comparison.
    parts.push(
      svg('polyline', { points: other.map((w, i) => `${X(i + 0.5)},${y2(w.snow)}`).join(' '), fill: 'none', stroke: COL.soft, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
      svg('polyline', { points: other.map((w, i) => `${X(i + 0.5)},${y3(flowOf(w.river))}`).join(' '), fill: 'none', stroke: COL.soft, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
    );
    // This year: the snow as an area, the river as a line.
    parts.push(
      svg('path', { d: `M${X(0.5)},${y2(0)} ${shown.map((w, i) => `L${X(i + 0.5)},${y2(w.snow)}`).join(' ')} L${X(shown.length - 0.5)},${y2(0)} Z`, fill: COL.snow, stroke: COL.rain, 'stroke-width': 1 }),
      svg('polyline', { points: shown.map((w, i) => `${X(i + 0.5)},${y3(flowOf(w.river))}`).join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2.2 }),
    );
    // Months along the bottom, and where we are.
    MONTHS.forEach((m, i) => parts.push(small(X((i * 52) / 12 + 2.2), 232, m[0], { anchor: 'middle', soft: true })));
    parts.push(line(X(week), 20, X(week), 222, COL.ink, 1, { opacity: 0.5 }));
    parts.push(small(x0, 250, warm ? 'Warm winter, like 2015 (dashed: an ordinary year)' : 'An ordinary year (dashed: a warm winter like 2015)', { soft: true }));
    // Where the water that has fallen since 1 October is now.
    const fell = shown.reduce((s, w) => s + w.rain + w.snowfall, 0);
    const gone = { air: shown.reduce((s, w) => s + w.air, 0), river: shown.reduce((s, w) => s + w.river, 0) };
    const last = shown[shown.length - 1];
    const held = { snow: last.snow, ground: Math.max(0, last.ground - 70) };
    const bx = 284;
    const scale = 196 / 2500;
    let y = 222;
    parts.push(small(bx - 4, 14, 'Since 1 October:', { bold: true }));
    for (const [v, col, name] of [[gone.river, COL.water, 'river'], [gone.air, COL.soft, 'air'], [held.ground, COL.ground, 'ground'], [held.snow, COL.snow, 'snow']] as const) {
      const h = v * scale;
      y -= h;
      parts.push(svg('rect', { x: bx, y, width: 16, height: h, fill: col, stroke: col === COL.snow ? COL.rain : 'none', 'stroke-width': 0.5 }));
      if (h > 9) parts.push(small(bx + 20, y + h / 2 + 3, `${Math.round(v)} ${name}`, { fill: col === COL.snow ? COL.ink : col }));
    }
    parts.push(small(bx - 4, 26, `${Math.round(fell)} mm fell, now in`, { soft: true }));
    redraw(g, ...parts);
    if (!open()) return;
    const m = last.month;
    f.readout.textContent = week >= 52
      ? `The year: ${Math.round((gone.river / fell) * 100)}% went down the river and ${Math.round((gone.air / fell) * 100)}% back to the air. June's river: ${Math.round(monthFlow(yr, 8))} m³/s, against ${Math.round(monthFlow(other, 8))} in ${warm ? 'an ordinary year' : 'a warm one'}.`
      : `${MONTHS[m]}. ${season(m, warm)}`;
    if (warm && week >= 40) t.done();
  };
  const ws = slider('Week', 0, 52, 1, week, (v) => (v >= 52 ? 'end' : MONTHS[Math.min(11, Math.floor((Math.max(0, v - 0.5) * 12) / 52))].slice(0, 3)), (v) => { week = v; paint(); }, 'water');
  const play = player(ws, ctx, { seconds: 14 });
  const sw = toggles(['Warm winter, like 2015'], [false], (on) => { warm = on[0]; paint(); });
  f.controls.append(play.node, ws.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'A winter as wet as usual but a few degrees warmer, like 2015. What happens to the river in June?',
    options: ['More water than usual', 'About the same', 'Less water than usual'],
    answer: 2,
    sliders: [ws],
    buttons: sw.buttons,
    reveal: 'done',
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'watershed-paths': pathsStill,
  'watershed-year': yearFigure,
};
