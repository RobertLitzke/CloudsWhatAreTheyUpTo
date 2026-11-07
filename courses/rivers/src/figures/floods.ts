// Lesson 2, The same storm, twice the flood: discharge as width times depth
// times speed, the gauge and its rating curve (a still), the hydrograph of a
// storm on a basin the size of the Snoqualmie's (rain, soil, freezing level,
// snow, pavement), and a century of 1-in-100 dice.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { button, COL, type FigureFactory, figure, frame, guessFirst, player, slider, tint, toggles, wrapped } from './kit';

const W = 400;

/** Cubic feet a second in a cubic metre a second. */
export const CFS = 35.315;

const both = (q: number) => `${Math.round(q).toLocaleString('en-US')} m³/s (${(Math.round((q * CFS) / 100) * 100).toLocaleString('en-US')} cubic feet a second)`;

// ---- Discharge ------------------------------------------------------------------------------------

/** Discharge, m³ a second, of a channel `width` m wide and `depth` m deep flowing at an average `speed` m/s. */
export const discharge = (width: number, depth: number, speed: number) => width * depth * speed;

export const dischargeFigure = figure(['flood'], (_ctx, t) => {
  const f = frame(W, 212, 4);
  const g = svg('g');
  f.svg.append(g);
  let width = 40;
  let depth = 1;
  let speed = 1;
  const paint = () => {
    const q = discharge(width, depth, speed);
    // An oblique box: the front face is the cross-section, its length the distance the water goes in one second.
    const px = 2.0; // per metre across
    const pz = 12; // per metre deep (drawn 6 times deeper than wide)
    const ps = 26; // per metre along the river, drawn at a slant
    const x0 = 34;
    const y0 = 102;
    const w = width * px;
    const d = depth * pz;
    const ox = speed * ps * 0.8;
    const oy = -speed * ps * 0.5;
    const face = `M${x0},${y0} h${w} v${d} h${-w} Z`;
    const topFace = `M${x0},${y0} l${ox},${oy} h${w} l${-ox},${-oy} Z`;
    const side = `M${x0 + w},${y0} l${ox},${oy} v${d} l${-ox},${-oy} Z`;
    redraw(g,
      svg('path', { d: side, fill: tint(COL.water, 0.55), stroke: COL.water, 'stroke-width': 1 }),
      svg('path', { d: topFace, fill: tint(COL.water, 0.3), stroke: COL.water, 'stroke-width': 1 }),
      svg('path', { d: face, fill: COL.water, opacity: 0.85 }),
      small(x0 + w / 2, y0 + d + 13, `${width} m wide`, { anchor: 'middle', soft: true }),
      small(x0 - 4, y0 + d / 2 + 3, `${depth} m`, { anchor: 'end', soft: true }),
      arrow(x0 + w + 6, y0 + d + 6, x0 + w + 6 + ox, y0 + d + 6 + oy, COL.flow, 1.5),
      small(Math.min(392, x0 + w + 6 + ox), y0 + d + 18, `${speed.toFixed(1)} m in 1 s`, { fill: COL.flow, anchor: 'end' }),
      label(x0, 22, `${width} × ${depth} × ${speed.toFixed(1)} = ${Math.round(q)} m³ every second`, { bold: true }),
      small(x0, 38, 'The block is the water that passes one spot on the bank in one second.', { soft: true }),
      small(x0, 206, 'Depth drawn six times larger than width, so a shallow river shows.', { soft: true }),
    );
    if (!open()) return;
    const pools = 2500 / q;
    f.readout.textContent = `${both(q)}. That would fill an Olympic swimming pool in ${pools >= 10 ? Math.round(pools) : pools.toFixed(1)} seconds.${q >= 290 && width === 40 ? ' Three times as deep and two and a half times as fast: 7.5 times the water.' : ''}`;
    if (q >= 290) t.done();
  };
  const ws = slider('Width', 10, 120, 5, width, (v) => `${v} m`, (v) => { width = v; paint(); }, 'water');
  const ds = slider('Depth', 0.5, 6, 0.5, depth, (v) => `${v} m`, (v) => { depth = v; paint(); }, 'water');
  const ss = slider('Speed', 0.2, 4, 0.1, speed, (v) => `${v.toFixed(1)} m/s`, (v) => { speed = Math.round(v * 10) / 10; paint(); }, 'flow');
  f.controls.append(ws.node, ds.node, ss.node);
  const open = guessFirst(t, f, {
    ask: 'A river 40 m wide and 1 m deep, flowing at 1 m/s, carries 40 m³ a second. In a flood it is 3 m deep and flows at 2.5 m/s. How many times more water passes?',
    options: ['About 3 times', 'About 5 times', 'About 7 or 8 times'],
    answer: 2,
    sliders: [ws, ds, ss],
    reveal: 'done',
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The gauge and its rating curve (still) ----------------------------------------------------------

/** A made-up rating curve: discharge in cubic feet a second at a stage in feet. */
export const rating = (stage: number) => (stage <= 2 ? 0 : 160 * (stage - 2) ** 1.8);

export const ratingStill = () => {
  const s = still(W, 220);
  const parts: SVGElement[] = [];
  // Left: the bank, the river and the gauge house with its well.
  const river = 150;
  parts.push(
    svg('path', { d: 'M0,60 L70,60 L120,200 L160,200 L160,220 L0,220 Z', fill: tint(COL.land, 0.45) }),
    svg('rect', { x: 92, y: river, width: 78, height: 70, fill: COL.water, opacity: 0.8 }),
    svg('rect', { x: 20, y: 20, width: 36, height: 40, fill: COL.paper, stroke: COL.works, 'stroke-width': 1.5 }),
    svg('path', { d: 'M16,22 L38,6 L60,22', fill: 'none', stroke: COL.works, 'stroke-width': 1.5 }),
    svg('rect', { x: 30, y: 60, width: 16, height: 140, fill: COL.paper, stroke: COL.works, 'stroke-width': 1.5 }),
    svg('rect', { x: 31, y: river, width: 14, height: 49, fill: COL.water, opacity: 0.8 }),
    line(46, 190, 120, 190, COL.works, 3),
    svg('rect', { x: 32, y: river - 6, width: 12, height: 6, fill: COL.sun }),
    line(38, river - 6, 38, 34, COL.ink, 1),
    small(62, 34, 'recorder', { soft: true }),
    small(62, 118, 'well', { soft: true }),
    small(62, 130, 'and float', { soft: true }),
    small(98, 208, 'intake pipe', { soft: true, fill: COL.paper }),
    line(80, river, 176, river, COL.ink, 1, { 'stroke-dasharray': '3 2' }),
    small(176, river - 4, 'stage', { anchor: 'end', bold: true }),
  );
  // Right: stage against discharge, measured points and the curve through them.
  const X = (cfs: number) => 214 + (cfs / 12000) * 170;
  const Y = (ft: number) => 190 - ((ft - 2) / 14) * 160;
  parts.push(line(214, 190, 388, 190, COL.ink, 1), line(214, 30, 214, 190, COL.ink, 1));
  for (const ft of [4, 8, 12, 16]) parts.push(small(210, Y(ft) + 3, `${ft}`, { anchor: 'end', soft: true }));
  for (const c of [4000, 8000, 12000]) parts.push(small(X(c), 202, `${c / 1000},000`, { anchor: c === 12000 ? 'end' : 'middle', soft: true }));
  parts.push(
    small(214, 22, 'Stage, feet', { bold: true }),
    small(388, 214, 'Discharge, cubic feet a second', { anchor: 'end', bold: true }),
  );
  const curve: string[] = [];
  for (let ft = 2; ft <= 16; ft += 0.25) if (rating(ft) <= 12000) curve.push(`${X(rating(ft))},${Y(ft)}`);
  parts.push(svg('polyline', { points: curve.join(' '), fill: 'none', stroke: COL.model, 'stroke-width': 2 }));
  const measured = [[3.2, 0.06], [4.1, -0.05], [5.5, 0.08], [6.8, -0.04], [8.3, 0.05], [9.9, -0.07], [12.6, 0.04]];
  for (const [ft, e] of measured) parts.push(svg('circle', { cx: X(rating(ft) * (1 + e)), cy: Y(ft), r: 3, fill: COL.data }));
  const fs = 12;
  parts.push(
    line(214, Y(fs), 388, Y(fs), COL.bad, 1, { 'stroke-dasharray': '4 3' }),
    small(218, Y(fs) - 4, 'flood stage', { fill: COL.bad, halo: COL.paper }),
    ...wrapped(300, 140, 'Dots: flows measured by hand. Line: the rating curve drawn through them.', 20, { soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The hydrograph -----------------------------------------------------------------------------------

/** The model basin: about the Snoqualmie's above Carnation, km², in bands by height (metres, share of the area). */
export const BASIN = { area: 1560, bands: [[150, 0.15], [450, 0.2], [750, 0.2], [1050, 0.2], [1350, 0.15], [1700, 0.1]] as const, base: 60 } as const;

/** Flood stage in the model, m³/s. */
export const FLOOD = 1200;

/** Hours the hydrograph runs. */
export const HOURS = 120;

export interface Storm {
  /** Rain over two days, mm. */
  rain: number;
  /** How wet the soil is before the storm, 0 (dry) to 1 (soaked). */
  soil: number;
  /** Freezing level, m: rain below it, snow above. */
  freezing: number;
  /** Fresh snow lying down to the valley floor. */
  snow: boolean;
  /** Share of the basin paved, 0 to 1. */
  paved: number;
}

/** Each hour's rain, mm: a two-day storm heaviest at hour 36. */
export const rainHours = (total: number) => {
  const w = Array.from({ length: HOURS }, (_, h) => Math.max(0, 1 - Math.abs(h - 36) / 24));
  const sum = w.reduce((s, v) => s + v, 0);
  return w.map((v) => (total * v) / sum);
};

const kernel = (lag: number) => {
  const k = Array.from({ length: HOURS }, (_, t) => (t / lag) ** 2 * Math.exp((-2 * t) / lag));
  const s = k.reduce((a, b) => a + b, 0);
  return k.map((v) => v / s);
};
const SLOW = kernel(14);
const FAST = kernel(4);

/**
 * A model hydrograph, m³/s each hour. In each height band, precipitation
 * falls as rain below the freezing level (with a 300 m band of mixed rain
 * and snow) and is held as snow above it. Warm rain on fresh snow melts some
 * of it, more the further the band lies below the freezing level, up to
 * 60 mm. The soil soaks up its first 15 mm (soaked) to 90 mm (dry) of water;
 * on unpaved ground 85% of the rest runs off and reaches the gauge over about
 * a day, while 95% of everything on pavement reaches it within hours.
 */
export function hydrograph(s: Storm): { q: number[]; peak: number; peakHour: number; rainShare: number; melt: number } {
  const rain = rainHours(s.rain);
  const holds = 90 - 75 * s.soil;
  const nat = new Array<number>(HOURS).fill(0);
  const urb = new Array<number>(HOURS).fill(0);
  let rainShare = 0;
  let melt = 0;
  for (const [z, a] of BASIN.bands) {
    const asRain = z < s.freezing - 150 ? 1 : z > s.freezing + 150 ? 0 : (s.freezing + 150 - z) / 300;
    rainShare += a * asRain;
    const melts = s.snow && asRain > 0 ? Math.min(60, Math.max(0, s.freezing - z) * 0.03) : 0;
    melt += a * melts;
    let cum = 0;
    for (let h = 0; h < HOURS; h++) {
      const w = rain[h] * asRain + (s.rain > 0 ? (melts * rain[h]) / s.rain : 0);
      const excess = Math.max(0, cum + w - holds) - Math.max(0, cum - holds);
      cum += w;
      nat[h] += a * (1 - s.paved) * 0.85 * excess;
      urb[h] += a * s.paved * 0.95 * w;
    }
  }
  const toFlow = (BASIN.area * 1000) / 3600; // mm an hour over the basin, as m³/s
  const q = Array.from({ length: HOURS }, (_, h) => {
    let v = 0;
    for (let j = 0; j <= h; j++) v += nat[j] * SLOW[h - j] + urb[j] * FAST[h - j];
    return BASIN.base + v * toFlow;
  });
  const peak = Math.max(...q);
  return { q, peak, peakHour: q.indexOf(peak), rainShare, melt };
}

const START: Storm = { rain: 150, soil: 0.85, freezing: 1000, snow: true, paved: 0.05 };

export const hydrographFigure = figure(['flood'], (_ctx, t) => {
  const f = frame(W, 236, 4);
  const g = svg('g');
  f.svg.append(g);
  const s: Storm = { ...START };
  const first = hydrograph(START);
  const x0 = 46;
  const x1 = 386;
  const X = (h: number) => x0 + ((x1 - x0) * h) / HOURS;
  const top = 18;
  const Yr = (mm: number) => top + (mm / 8) * 40; // rain hangs from the top
  const Yq = (q: number) => 206 - (Math.min(q, 2600) / 2600) * 130;
  const paint = () => {
    const r = hydrograph(s);
    const rain = rainHours(s.rain);
    const parts: SVGElement[] = [];
    rain.forEach((mm, h) => {
      if (mm > 0) parts.push(svg('rect', { x: X(h), y: top, width: (x1 - x0) / HOURS, height: Yr(mm) - top, fill: COL.rain }));
    });
    parts.push(line(x0, top, x1, top, COL.ink, 1), small(x0, top - 6, `Rain, ${s.rain} mm in two days`, { bold: true, fill: COL.rain }));
    for (const q of [500, 1000, 1500, 2000, 2500]) parts.push(line(x0, Yq(q), x1, Yq(q), COL.grid, 1), small(x0 - 4, Yq(q) + 3, `${q / 1000 >= 1 ? (q / 1000).toFixed(1) + 'k' : q}`, { anchor: 'end', soft: true }));
    for (let d = 0; d <= 5; d++) parts.push(small(X(d * 24), 220, d === 0 ? 'day 0' : `${d}`, { anchor: 'middle', soft: true }));
    parts.push(
      line(x0, 206, x1, 206, COL.ink, 1),
      small(x0, 70, 'River at the gauge, m³/s', { bold: true }),
      line(x0, Yq(FLOOD), x1, Yq(FLOOD), COL.bad, 1.2, { 'stroke-dasharray': '5 3' }),
      small(x1, Yq(FLOOD) - 4, 'flood stage', { anchor: 'end', fill: COL.bad }),
      svg('polyline', { points: first.q.map((q, h) => `${X(h)},${Yq(q)}`).join(' '), fill: 'none', stroke: COL.soft, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
      svg('path', { d: `M${X(0)},206 ${r.q.map((q, h) => `L${X(h)},${Yq(q)}`).join(' ')} L${X(HOURS - 1)},206 Z`, fill: tint(COL.water, 0.18) }),
      svg('polyline', { points: r.q.map((q, h) => `${X(h)},${Yq(q)}`).join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2.2 }),
      svg('circle', { cx: X(r.peakHour), cy: Yq(r.peak), r: 3.5, fill: r.peak > FLOOD ? COL.bad : COL.water }),
      small(x0, 234, 'Dashed: the storm as it started.', { soft: true }),
    );
    redraw(g, ...parts);
    if (!open()) return;
    const over = r.peak > FLOOD;
    const lag = r.peakHour - 36;
    f.readout.textContent = `Peak ${both(r.peak)}, ${lag} hours after the heaviest rain: ${over ? 'over flood stage' : 'below flood stage'}. Rain fell on ${Math.round(r.rainShare * 100)}% of the basin${r.melt >= 1 ? `, and melting snow added ${Math.round(r.melt)} mm` : ''}.`;
    if (over && s.rain <= START.rain) t.done();
  };
  const rs = slider('Rain in two days', 50, 300, 10, s.rain, (v) => `${v} mm`, (v) => { s.rain = v; paint(); }, 'rain');
  const ws = slider('Soil before the storm', 0, 1, 0.05, s.soil, (v) => (v < 0.3 ? 'dry' : v < 0.7 ? 'damp' : 'soaked'), (v) => { s.soil = v; paint(); }, 'ground');
  const fs = slider('Freezing level', 500, 2500, 100, s.freezing, (v) => `${v.toLocaleString('en-US')} m`, (v) => { s.freezing = v; paint(); }, 'cold');
  const ps = slider('Basin paved', 0, 0.6, 0.05, s.paved, (v) => `${Math.round(v * 100)}%`, (v) => { s.paved = v; paint(); }, 'works');
  const sn = toggles(['Fresh snow down to the valleys'], [s.snow], (on) => { s.snow = on[0]; paint(); });
  f.controls.append(rs.node, ws.node, fs.node, sn.node, ps.node);
  const open = guessFirst(t, f, {
    ask: 'Snow lies down to the valleys, and 150 mm of rain is coming with the freezing level at 1,000 m: below flood stage. Now the storm turns warm, the freezing level rising to 2,000 m. Does the river flood?',
    options: ['Yes, well over flood stage', 'It just reaches flood stage', 'No: the snow soaks up the rain'],
    answer: 0,
    sliders: [rs, ws, fs, ps],
    buttons: sn.buttons,
    reveal: 'done',
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A century of dice --------------------------------------------------------------------------------

/** The chance of at least one flood in `years` years when each year has a chance `p`. */
export const atLeastOne = (p: number, years: number) => 1 - (1 - p) ** years;

/** The chance of two or more floods in `years` years. */
export const twoOrMore = (p: number, years: number) => 1 - (1 - p) ** years - years * p * (1 - p) ** (years - 1);

/** A century of years, true where a 1-in-100 flood came. */
export const century = (seed: number) => {
  const rng = makeRng(seed);
  return Array.from({ length: 100 }, () => rng() < 0.01);
};

/** How often each of a century's three 30-year mortgages (years 1 to 30, 31 to 60, 61 to 90) sees a flood. */
export const mortgages = (years: readonly boolean[]) => [0, 30, 60].map((a) => years.slice(a, a + 30).some(Boolean));

export const diceFigure = figure(['roll'], (ctx, t) => {
  const f = frame(W, 236, 4);
  const g = svg('g');
  f.svg.append(g);
  let seed = 7;
  let years = century(seed);
  let year = 0;
  const tally = { centuries: 0, floods: 0, mortgages: 0, flooded: 0 };
  let counted = false;
  const count = (ys: readonly boolean[]) => {
    tally.centuries += 1;
    tally.floods += ys.filter(Boolean).length;
    const m = mortgages(ys);
    tally.mortgages += m.length;
    tally.flooded += m.filter(Boolean).length;
  };
  const paint = () => {
    if (year >= 100 && !counted) {
      count(years);
      counted = true;
    }
    const parts: SVGElement[] = [];
    const cell = 19;
    const gx = 14;
    const gy = 26;
    years.forEach((flood, i) => {
      const x = gx + (i % 10) * cell;
      const y = gy + Math.floor(i / 10) * cell;
      const seen = i < year;
      parts.push(svg('rect', { x, y, width: cell - 3, height: cell - 3, rx: 3, fill: seen ? (flood ? COL.water : tint(COL.land, 0.35)) : COL.paper, stroke: COL.grid, 'stroke-width': 1 }));
      if (seen && flood) parts.push(small(x + (cell - 3) / 2, y + cell - 7, '●', { anchor: 'middle', fill: COL.paper }));
    });
    parts.push(small(gx, 16, `Year ${Math.min(year, 100)} of a century`, { bold: true }));
    // The three mortgages, as brackets beside rows 1–3, 4–6 and 7–9.
    mortgages(years).forEach((hit, k) => {
      const y = gy + k * 3 * cell;
      const doneYet = year >= (k + 1) * 30;
      parts.push(
        line(gx + 10 * cell + 2, y, gx + 10 * cell + 2, y + 3 * cell - 3, COL.works, 2),
        small(gx + 10 * cell + 8, y + 1.5 * cell + 3, doneYet ? (hit ? 'flooded' : 'dry') : `mortgage ${k + 1}`, { fill: doneYet && hit ? COL.water : COL.soft, bold: doneYet }),
      );
    });
    const tx = 268;
    const pct = tally.mortgages ? Math.round((tally.flooded / tally.mortgages) * 100) : 0;
    parts.push(
      small(tx, 40, 'All centuries rolled', { bold: true }),
      small(tx, 58, `${tally.centuries.toLocaleString('en-US')} ${tally.centuries === 1 ? 'century' : 'centuries'}`),
      small(tx, 74, `${tally.floods.toLocaleString('en-US')} floods`),
      small(tx, 90, tally.centuries ? `${(tally.floods / tally.centuries).toFixed(2)} a century` : '', { soft: true }),
      small(tx, 116, 'Mortgages with a flood', { bold: true }),
      small(tx, 134, tally.mortgages ? `${tally.flooded.toLocaleString('en-US')} of ${tally.mortgages.toLocaleString('en-US')}: ${pct}%` : 'none finished yet'),
      small(tx, 150, `the sums say ${Math.round(atLeastOne(0.01, 30) * 100)}%`, { soft: true }),
      ...wrapped(gx, 222, 'Each square is a year, with a 1 in 100 chance of a flood. Filled: a flood came.', 70, { soft: true }),
    );
    redraw(g, ...parts);
    if (!open()) return;
    const n = years.slice(0, year).filter(Boolean).length;
    f.readout.textContent = year < 100
      ? `${n === 0 ? 'No flood yet' : n === 1 ? 'One flood so far' : `${n} floods so far`} this century. Every year is a fresh roll: a flood last year makes one this year no more and no less likely.`
      : `This century had ${n === 0 ? 'no 100-year flood at all' : n === 1 ? 'one 100-year flood' : `${n} 100-year floods`}. Over many centuries they average one each, but any one century can have none, or several.`;
    if (tally.centuries >= 3) t.done();
  };
  const ys = slider('Year', 0, 100, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'water');
  const play = player(ys, ctx, { seconds: 8 });
  const again = button('New century', () => {
    seed += 1;
    years = century(seed);
    counted = false;
    ys.set(0);
    play.play();
  });
  const many = button('Roll 1,000 centuries', () => {
    for (let k = 0; k < 1000; k++) count(century(1000 + seed * 1000 + k));
    seed += 1;
    paint();
  });
  f.controls.append(play.node, ys.node, again, many);
  const open = guessFirst(t, f, {
    ask: 'A house sits on the edge of the 100-year floodplain. What is the chance of at least one 100-year flood during its owners’ 30-year mortgage?',
    options: ['About 3 in 100', 'About 1 in 4', 'About 1 in 2'],
    answer: 1,
    sliders: [ys],
    buttons: [again, many],
    reveal: 'done',
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'floods-discharge': dischargeFigure,
  'floods-rating': ratingStill,
  'floods-hydrograph': hydrographFigure,
  'floods-dice': diceFigure,
};
