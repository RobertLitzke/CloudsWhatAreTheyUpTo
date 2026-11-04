// Lesson 12, The forest that was cut on purpose: two valleys at Hubbard Brook,
// one cut, and a nitrogen cycle the reader can break at a step.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, player, slider, toggles } from './kit';

const W = 400;

/** Nitrate in the uncut valley's stream, mg per litre. */
export const BASE_NITRATE = 1.3;
/** Stream water from the uncut valley in an average year, cm. */
export const BASE_RUNOFF = 85;
/** Wetter and drier years, the same in both valleys (the reason for a valley left uncut). */
const WEATHER: Record<number, number> = { 1963: -6, 1964: -14, 1965: -10, 1966: 4, 1967: 9, 1968: 2, 1969: 12, 1970: -3, 1971: 5, 1972: 10, 1973: 14, 1974: 1, 1975: 3 };

export interface Valley {
  /** Trees regrowing in the cut valley: how much of the forest's uptake is back, 0 to 1. */
  plants: number;
  nitrate: number;
  runoff: number;
  /** Nitrogen carried out as nitrate, kg per hectare that year. */
  lost: number;
}

/** Nitrate (mg/L) times runoff (cm) as kg of nitrogen per hectare: nitrate is 22.6% nitrogen by weight. */
export const kgN = (nitrate: number, runoff: number) => nitrate * 0.226 * (runoff / 100) * 10;

/**
 * The cut valley in a given year, a model shaped to the published record: the
 * trees felled in the winter of 1965–66 and, with `herbicide`, kept from
 * regrowing until 1969. Rot of the fallen wood and leaves sends a pulse of
 * nitrate that peaks about 1967–68; whatever regrows takes it up again and
 * puts the water back into the air.
 */
export function cutValley(year: number, herbicide: boolean): Valley {
  const s = year + 0.5 - 1966;
  const wet = WEATHER[year] ?? 0;
  if (s < 0) return { plants: 1, nitrate: BASE_NITRATE, runoff: BASE_RUNOFF + wet, lost: kgN(BASE_NITRATE, BASE_RUNOFF + wet) };
  const plants = herbicide ? (s < 3.5 ? 0 : 1 - Math.exp(-(s - 3.5) / 2.5)) : 1 - Math.exp(-s / 1.8);
  const pulse = (s / 1.7) * Math.exp(1 - s / 1.7);
  const nitrate = BASE_NITRATE + 52 * pulse * (1 - plants);
  const runoff = BASE_RUNOFF + wet + 34 * (1 - plants);
  return { plants, nitrate, runoff, lost: kgN(nitrate, runoff) };
}

export const uncutValley = (year: number): Valley => {
  const runoff = BASE_RUNOFF + (WEATHER[year] ?? 0);
  return { plants: 1, nitrate: BASE_NITRATE, runoff, lost: kgN(BASE_NITRATE, runoff) };
};

/** A small valley seen from above: ridges, a stream, a weir at its foot, and trees standing or felled. */
function valleyDrawing(x: number, name: string, standing: number, felled: boolean): SVGElement[] {
  const out: SVGElement[] = [
    svg('path', { d: `M${x} 18 Q${x + 80} 4 ${x + 160} 18 L${x + 120} 100 L${x + 40} 100 Z`, fill: '#eef0e3', stroke: COL.rock, 'stroke-width': 1 }),
    svg('path', { d: `M${x + 80} 16 Q${x + 74} 60 ${x + 80} 100`, fill: 'none', stroke: COL.water, 'stroke-width': 2 }),
    svg('rect', { x: x + 70, y: 98, width: 20, height: 6, fill: COL.rock }),
    small(x + 96, 105, 'weir', { soft: true }),
    label(x + 80, 120, name, { anchor: 'middle', bold: true, size: 'small' }),
  ];
  let k = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7 - row; col++) {
      const tx = x + 30 + row * 8 + col * 17 + (row % 2) * 6;
      const ty = 26 + row * 15;
      if (Math.abs(tx - x - 80) < 6) continue;
      k++;
      const up = (k * 37) % 100 < standing * 100;
      out.push(up
        ? svg('circle', { cx: tx, cy: ty, r: 5.5, fill: COL.plant, opacity: 0.9 })
        : felled ? line(tx - 5, ty + 3, tx + 5, ty - 2, COL.soil, 2.2) : svg('circle', { cx: tx, cy: ty, r: 2, fill: COL.lichen }));
    }
  }
  return out;
}

export const weirFigure = figure(['cut'], (ctx, t) => {
  const f = frame(W, 300, 3);
  const g = svg('g');
  f.svg.append(g);
  let year = 1963;
  let herbicide = true;
  const paint = () => {
    const cut = cutValley(year, herbicide);
    const ctl = uncutValley(year);
    const a = axes({ x: 44, y: 150, w: 150, h: 104, xmin: 1963, xmax: 1975, ymin: 0, ymax: 60, xticks: [1965, 1970, 1975], yticks: [0, 20, 40, 60], ylabel: 'nitrate, mg per litre', ink: COL.ink, grid: COL.grid });
    const b = axes({ x: 236, y: 150, w: 150, h: 104, xmin: 1963, xmax: 1975, ymin: 60, ymax: 140, xticks: [1965, 1970, 1975], yticks: [60, 100, 140], ylabel: 'stream water, cm a year', ink: COL.ink, grid: COL.grid });
    const ys = Array.from({ length: year - 1963 + 1 }, (_, i) => 1963 + i);
    redraw(g,
      ...valleyDrawing(30, 'Left standing', 1, false),
      ...valleyDrawing(210, year >= 1966 ? 'Cut, winter 1965–66' : 'To be cut', year < 1966 ? 1 : cut.plants, year >= 1966),
      ...a.parts,
      a.path(ys.map((y) => [y, uncutValley(y).nitrate]), COL.plant, 2),
      a.path(ys.map((y) => [y, cutValley(y, herbicide).nitrate]), COL.deaths, 2),
      ...b.parts,
      b.path(ys.map((y) => [y, uncutValley(y).runoff]), COL.plant, 2),
      b.path(ys.map((y) => [y, cutValley(y, herbicide).runoff]), COL.water, 2),
      ...legend(44, 294, [{ text: 'uncut valley', color: COL.plant }, { text: 'cut valley', color: COL.deaths }, { text: 'cut valley’s water', color: COL.water }]),
      label(386, 140, 'A model', { anchor: 'end', size: 'small', soft: true }),
    );
    if (!open()) return;
    const times = cut.nitrate / ctl.nitrate;
    f.readout.textContent = year < 1966
      ? `${year}: the two valleys match. Wet years and dry years change both streams the same way. Press Play.`
      : `${year}: the cut valley's stream carries ${Math.round(cut.runoff - ctl.runoff)} cm more water than the uncut one and ${times < 1.5 ? 'about the same nitrate' : `${Math.round(times)} times the nitrate`}, about ${Math.round(cut.lost)} kg of nitrogen per hectare that year against ${Math.round(ctl.lost)}.${herbicide && year >= 1966 && year < 1969 ? ' Herbicide keeps anything from regrowing.' : cut.plants > 0.3 ? ' Regrowth is taking the nitrogen back up.' : ''}`;
    if (year >= 1969) t.done();
  };
  const ys = slider('Year', 1963, 1975, 1, 1963, (v) => String(v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 10 });
  const sw = toggles(['Herbicide keeps regrowth down until 1969'], [true], (on) => { herbicide = on[0]; paint(); });
  f.controls.append(play.node, ys.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'Every tree in the right-hand valley is felled and left lying. Does its stream carry more water than before, less, or the same?',
    options: ['More water', 'Less water', 'The same'],
    answer: 0,
    sliders: [ys],
    buttons: [play.node, ...sw.buttons],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A nitrogen cycle to break -----------------------------------------------------------------

export interface Breaks {
  fixers: boolean;
  decomposers: boolean;
  waterlogged: boolean;
  plants: boolean;
}

export interface Soil {
  /** Nitrogen in living plants, dead matter, ammonium and nitrate, kg per hectare. */
  plants: number;
  dead: number;
  ammonium: number;
  nitrate: number;
  /** Flows in kg per hectare a year. */
  fixed: number;
  rotted: number;
  taken: number;
  leached: number;
  toAir: number;
}

const START: Soil = { plants: 500, dead: 4000, ammonium: 8.5, nitrate: 3.2, fixed: 0, rotted: 0, taken: 0, leached: 0, toAir: 0 };

/**
 * A forest's nitrogen, stepped every 0.01 year for `years` years with some
 * steps broken (each break is true when that step still works). Rain brings
 * 6 kg a year. A model with round numbers, near a New England hardwood forest's.
 */
export function soil(b: Breaks, years = 25): Soil {
  let s = { ...START };
  const dt = 0.01;
  for (let i = 0; i < years / dt; i++) {
    const fixed = b.fixers ? 5 : 0;
    const litter = (b.plants ? 0.12 : 0.4) * s.plants;
    const rotted = (b.decomposers ? 0.015 : 0.0015) * s.dead;
    const nitrified = 2 * s.ammonium;
    const upA = b.plants ? 6 * s.ammonium : 0;
    const upN = b.plants ? 6 * s.nitrate : 0;
    const leached = 0.15 * s.nitrate;
    const toAir = (b.waterlogged ? 2.5 : 0.05) * s.nitrate;
    s = {
      plants: s.plants + dt * (upA + upN - litter),
      dead: s.dead + dt * (litter - rotted),
      ammonium: s.ammonium + dt * (3 + fixed + rotted - nitrified - upA),
      nitrate: s.nitrate + dt * (3 + nitrified - upN - leached - toAir),
      fixed, rotted, taken: upA + upN, leached, toAir,
    };
  }
  return s;
}

const BREAKS = ['No nitrogen fixers', 'No decomposers', 'Waterlogged soil', 'No plants'];

export const ncycleFigure = figure(['leak'], (_ctx, t) => {
  const f = frame(W, 270, 4);
  const g = svg('g');
  f.svg.append(g);
  const tried = new Set<number>();
  let on = [false, false, false, false];
  const paint = () => {
    const b: Breaks = { fixers: !on[0], decomposers: !on[1], waterlogged: on[2], plants: !on[3] };
    const s = soil(b);
    const n = soil({ fixers: true, decomposers: true, waterlogged: false, plants: true });
    const box = (x: number, y: number, name: string, v: number, was: number, color: string) => [
      svg('rect', { x, y, width: 96, height: 40, rx: 6, fill: color, opacity: 0.16, stroke: color, 'stroke-width': 1.4 }),
      label(x + 48, y + 16, name, { anchor: 'middle', bold: true, size: 'small' }),
      small(x + 48, y + 31, `${v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)} kg/ha${Math.abs(v - was) / was > 0.25 ? (v > was ? ' ▲' : ' ▼') : ''}`, { anchor: 'middle' }),
    ];
    const flow = (x1: number, y1: number, x2: number, y2: number, v: number, color: string, words: string, lx: number, ly: number, anchor?: 'end' | 'middle') => [
      v > 0.3 ? arrow(x1, y1, x2, y2, color, Math.min(7, 1 + Math.sqrt(v) * 0.7)) : line(x1, y1, x2, y2, COL.grid, 1, { 'stroke-dasharray': '3 3' }),
      small(lx, ly, `${words} ${v < 0.05 ? 0 : v < 10 ? v.toFixed(1) : Math.round(v)}`, { anchor, fill: v > 0.3 ? color : COL.soft }),
    ];
    redraw(g,
      svg('rect', { x: 150, y: 6, width: 100, height: 26, rx: 6, fill: COL.water, 'fill-opacity': 0.12, stroke: COL.water, 'stroke-width': 1 }),
      label(200, 23, 'Nitrogen gas in the air', { anchor: 'middle', size: 'small', bold: true }),
      ...box(20, 80, 'Living plants', s.plants, n.plants, COL.plant),
      ...box(284, 80, 'Dead matter', s.dead, n.dead, COL.soil),
      ...box(20, 180, 'Nitrate', s.nitrate, n.nitrate, COL.deaths),
      ...box(284, 180, 'Ammonium', s.ammonium, n.ammonium, COL.prey),
      ...flow(228, 34, 286, 178, s.fixed, COL.births, 'fixed', 262, 150, 'end'),
      ...flow(118, 100, 282, 100, (b.plants ? 0.12 : 0.4) * s.plants, COL.plant, 'leaves fall', 200, 94, 'middle'),
      ...flow(332, 122, 332, 178, s.rotted, COL.soil, 'rot', 338, 154),
      ...flow(282, 200, 118, 200, 2 * s.ammonium, COL.prey, 'bacteria', 200, 194, 'middle'),
      ...flow(68, 178, 68, 122, s.taken, COL.plant, 'roots take up', 74, 154),
      ...flow(120, 178, 172, 34, s.toAir, COL.water, 'to air', 138, 166),
      ...flow(68, 222, 68, 256, s.leached, COL.water, 'washed out to the stream', 76, 244),
      small(392, 266, 'kg a hectare a year, after 25 years. A model.', { anchor: 'end', soft: true }),
    );
    const leak = s.leached;
    const what = on[3] ? 'With no plants, nothing takes up the nitrate the bacteria keep making, and it washes out.'
      : on[1] ? 'With no decomposers, nitrogen piles up in dead leaves and wood, and the plants go short.'
      : on[2] ? 'In waterlogged soil, bacteria with no oxygen turn nitrate back into nitrogen gas, and it is lost to the air.'
      : on[0] ? 'Without fixers the forest loses a little more than the rain brings, and runs down slowly.'
      : 'An unbroken cycle: almost everything the bacteria release is taken back up by roots.';
    f.readout.textContent = `${what} Nitrate to the stream: ${leak < 10 ? leak.toFixed(1) : Math.round(leak)} kg per hectare a year (unbroken: ${n.leached.toFixed(1)}).`;
    if (tried.size === 4) t.done();
  };
  const sw = toggles(BREAKS, on, (now) => {
    now.forEach((v, i) => { if (v) tried.add(i); });
    on = now;
    paint();
  });
  f.controls.append(sw.node);
  paint();
  return f.node;
});
