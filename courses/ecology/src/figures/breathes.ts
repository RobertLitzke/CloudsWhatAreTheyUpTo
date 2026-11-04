// Lesson 11, The planet breathes: Keeling's record at three stations, and the
// yearly wave read as a stock driven by two flows (release and uptake).

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, pick, player, slider } from './kit';

const W = 400;

/** Mauna Loa's yearly mean CO₂ in ppm (NOAA Global Monitoring Laboratory), a point every five years or so. */
export const MAUNA_LOA: readonly (readonly [number, number])[] = [
  [1959, 315.98], [1960, 316.91], [1965, 320.04], [1970, 325.68], [1975, 331.11], [1980, 338.76], [1985, 346.35],
  [1990, 354.45], [1995, 360.97], [2000, 369.71], [2005, 379.98], [2010, 390.1], [2015, 401.01], [2020, 414.21], [2024, 424.61],
];

/** The yearly mean between the points above, by straight lines. */
export function trend(year: number): number {
  const d = MAUNA_LOA;
  if (year <= d[0][0]) return d[0][1] - (d[0][0] - year) * 0.8;
  for (let i = 1; i < d.length; i++) {
    if (year <= d[i][0]) {
      const [x0, y0] = d[i - 1];
      const [x1, y1] = d[i];
      return y0 + ((year - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  const [xa, ya] = d[d.length - 2];
  const [xb, yb] = d[d.length - 1];
  return yb + ((year - xb) * (yb - ya)) / (xb - xa);
}

export interface Season {
  /** How strong the northern summer's uptake is, 1 = today's. */
  growth: number;
  /** Months the growing season comes earlier (negative) or later. */
  shift: number;
}

const releaseAt = (m: number) => 1 + 0.35 * Math.cos((2 * Math.PI * (m - 7)) / 12);
const uptakeShape = (m: number, s: Season) => {
  // The uptake is a hump centred in midsummer; wrap so a shifted hump stays in the year.
  const c = 6.8 + s.shift;
  let d = m - c;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return Math.exp(-((d / 2) ** 2));
};

const STEPS = 480;

/**
 * The northern land's two flows by month (m from 0, the start of January, to
 * 12), in units where release averages 1, and the CO₂ they leave in the air.
 * Uptake is scaled so a year's uptake equals a year's release at growth 1; a
 * stronger summer takes more out and puts more back (more growth, more rot).
 * `co2` is in ppm at Mauna Loa, centred on the year's mean.
 */
export function season(s: Season): { m: number[]; release: number[]; uptake: number[]; co2: number[] } {
  const r = rawSeason(s);
  // Today's swing at Mauna Loa is about 6.5 ppm from May to late September.
  const base = 6.5 / RAW_SWING;
  return { ...r, co2: r.co2.map((v) => v * base) };
}

function rawSeason(s: Season): { m: number[]; release: number[]; uptake: number[]; co2: number[] } {
  const m = Array.from({ length: STEPS + 1 }, (_, i) => (12 * i) / STEPS);
  let rel = 0;
  let up = 0;
  for (const x of m.slice(0, STEPS)) {
    rel += releaseAt(x);
    up += uptakeShape(x, s);
  }
  const k = rel / up;
  const release = m.map((x) => releaseAt(x) * (0.4 + 0.6 * s.growth));
  const uptake = m.map((x) => k * uptakeShape(x, s) * (0.4 + 0.6 * s.growth));
  let y = 0;
  const raw = m.map((_, i) => {
    const v = y;
    y += (release[i] - uptake[i]) * (12 / STEPS);
    return v;
  });
  const mean = raw.slice(0, STEPS).reduce((a, b) => a + b, 0) / STEPS;
  return { m, release, uptake, co2: raw.map((v) => v - mean) };
}

const RAW_SWING = (() => {
  const c = rawSeason({ growth: 1, shift: 0 }).co2;
  return Math.max(...c) - Math.min(...c);
})();

/** The month (0 to 12) the CO₂ is highest and lowest, and the swing between them. */
export function extremes(s: Season): { high: number; low: number; swing: number } {
  const r = season(s);
  const c = r.co2.slice(0, STEPS);
  const hi = c.indexOf(Math.max(...c));
  const lo = c.indexOf(Math.min(...c));
  return { high: r.m[hi], low: r.m[lo], swing: c[hi] - c[lo] };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const monthName = (m: number) => MONTHS[Math.floor(((m % 12) + 12) % 12)];
const early = (m: number) => {
  const d = m - Math.floor(m);
  return d < 0.34 ? 'early' : d < 0.67 ? 'mid' : 'late';
};

export interface Station {
  name: string;
  /** First year of the record. */
  from: number;
  /** Yearly mean against Mauna Loa's, ppm. */
  offset: number;
  /** Size of the yearly wave against Mauna Loa's. */
  swing: number;
  /** Months the wave runs ahead of Mauna Loa's (negative: earlier). */
  lag: number;
  where: string;
}

/** Three of the stations, simplified: the swing and timing of each wave, after NOAA's records. */
export const STATIONS: readonly Station[] = [
  { name: 'Mauna Loa', from: 1958, offset: 0, swing: 1, lag: 0, where: 'Hawaii, 3,400 m up, 19° north' },
  { name: 'Barrow', from: 1973, offset: 1.5, swing: 2.5, lag: -1, where: 'Utqiaġvik, Alaska, 71° north' },
  { name: 'South Pole', from: 1957, offset: -2.5, swing: 0.16, lag: 6, where: 'Antarctica, 90° south' },
];

const TODAY = season({ growth: 1, shift: 0 });
/** Today's Mauna Loa wave, ppm, at month m. */
const waveAt = (m: number) => {
  const x = (((m % 12) + 12) % 12) * (STEPS / 12);
  return TODAY.co2[Math.round(x)];
};

/** A station's CO₂ in a given year and month, ppm (a smooth trend plus its wave). */
export const reading = (st: Station, t: number) => trend(t) + st.offset + st.swing * waveAt((t - Math.floor(t)) * 12 - st.lag);

const VIEWS = ['The record', 'Trend only', 'One year’s wave'];

export const keelingFigure = figure(['barrow'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let at = 0;
  let view = 0;
  const paint = () => {
    const st = STATIONS[at];
    if (view < 2) {
      const a = axes({ x: 44, y: 20, w: 336, h: 170, xmin: 1955, xmax: 2025, ymin: 300, ymax: 440, xticks: [1960, 1980, 2000, 2020], yticks: [300, 340, 380, 420], ylabel: 'CO₂, parts per million', ink: COL.ink, grid: COL.grid });
      const pts: [number, number][] = [];
      for (let y = st.from; y <= 2024.95; y += 1 / 12) pts.push([y, view === 1 ? trend(y) + st.offset : reading(st, y)]);
      redraw(g,
        ...a.parts,
        a.path(pts, view === 1 ? COL.model : COL.heat, view === 1 ? 2 : 1.1),
        ...(st.name === 'Mauna Loa' ? a.dots(MAUNA_LOA, COL.data, 2.6) : []),
        ...legend(44, 228, [{ text: view === 1 ? 'the yearly mean' : 'month by month', color: view === 1 ? COL.model : COL.heat }, ...(st.name === 'Mauna Loa' ? [{ text: 'NOAA’s yearly means', color: COL.data, dot: true }] : [])]),
      );
      f.readout.textContent = view === 1
        ? `${st.name} with each year’s wave taken out: a rise from about ${Math.round(trend(st.from) + st.offset)} ppm to ${Math.round(trend(2024) + st.offset)} ppm, and getting steeper.`
        : `${st.name} (${st.where}), a smooth version of the record. The line climbs year on year and wobbles every year. Pick “One year’s wave” to see the wobble.`;
    } else {
      const a = axes({ x: 44, y: 20, w: 336, h: 170, xmin: 0, xmax: 12, ymin: -10, ymax: 10, xticks: [], yticks: [-10, -5, 0, 5, 10], ylabel: 'CO₂ above or below the year’s mean, ppm', ink: COL.ink, grid: COL.grid });
      const wave = (s: Station) => TODAY.m.filter((_, i) => i % 4 === 0).map((m) => [m, s.swing * waveAt(m - s.lag)] as [number, number]);
      redraw(g,
        ...a.parts,
        ...SHORT.map((s, i) => small(a.X(i + 0.5), 204, s, { anchor: 'middle', soft: true })),
        ...STATIONS.filter((s) => s !== st).map((s) => a.path(wave(s), COL.grid, 1.4)),
        a.path(wave(st), COL.heat, 2.4),
        ...legend(44, 228, [{ text: st.name, color: COL.heat }, { text: 'the other two stations', color: COL.grid }]),
      );
      const ws = wave(st).map((p) => p[1]);
      const hi = TODAY.m.filter((_, i) => i % 4 === 0)[ws.indexOf(Math.max(...ws))];
      const lo = TODAY.m.filter((_, i) => i % 4 === 0)[ws.indexOf(Math.min(...ws))];
      const swing = Math.max(...ws) - Math.min(...ws);
      f.readout.textContent = `${st.name}: highest in ${early(hi)} ${monthName(hi)}, lowest in ${early(lo)} ${monthName(lo)}, a swing of about ${swing < 2 ? swing.toFixed(1) : Math.round(swing)} ppm.${st.name === 'Barrow' ? ' Far bigger than Hawaii’s: Barrow sits over the northern forests.' : st.name === 'South Pole' ? ' Almost flat, and out of step with the north.' : ''}`;
      if (st.name === 'Barrow') t.done();
    }
  };
  const where = pick(STATIONS.map((s) => s.name), 0, (i) => { at = i; paint(); });
  const how = pick(VIEWS, 0, (i) => { view = i; paint(); });
  f.controls.append(where.node, how.node);
  paint();
  return f.node;
});

// ---- The wave as a stock and two flows -------------------------------------------------------

export const flowFigure = figure(['lowest'], (ctx, t) => {
  const f = frame(W, 262, 3);
  const g = svg('g');
  f.svg.append(g);
  const s: Season = { growth: 1, shift: 0 };
  let month = 0;
  const paint = () => {
    const r = season(s);
    const e = extremes(s);
    const top = axes({ x: 44, y: 18, w: 336, h: 92, xmin: 0, xmax: 12, ymin: 0, ymax: 5.5, xticks: [], yticks: [0, 2, 4], ylabel: 'carbon a month, north of the tropics', ink: COL.ink, grid: COL.grid });
    const bot = axes({ x: 44, y: 140, w: 336, h: 84, xmin: 0, xmax: 12, ymin: -6, ymax: 6, xticks: [], yticks: [-5, 0, 5], ylabel: 'CO₂ against the year’s mean, ppm', ink: COL.ink, grid: COL.grid });
    const thin = <T,>(a: T[]) => a.filter((_, i) => i % 4 === 0);
    const ms = thin(r.m);
    const i = Math.min(STEPS, Math.round((month / 12) * STEPS));
    const into = r.release[i] > r.uptake[i];
    redraw(g,
      ...top.parts,
      top.path(ms.map((m, k) => [m, thin(r.release)[k]]), COL.deaths, 2),
      top.path(ms.map((m, k) => [m, thin(r.uptake)[k]]), COL.plant, 2),
      ...bot.parts,
      bot.path(ms.map((m, k) => [m, thin(r.co2)[k]]), COL.heat, 2.2),
      ...SHORT.map((x, k) => small(bot.X(k + 0.5), 238, x, { anchor: 'middle', soft: true })),
      line(top.X(month), 18, top.X(month), 224, COL.ink, 1, { 'stroke-dasharray': '3 3' }),
      svg('circle', { cx: bot.X(month), cy: bot.Y(r.co2[i]), r: 4, fill: COL.heat }),
      ...legend(44, 256, [{ text: 'given off (rot, breathing)', color: COL.deaths }, { text: 'taken in (growth)', color: COL.plant }, { text: 'CO₂', color: COL.heat }]),
      label(380, 132, 'A model', { anchor: 'end', size: 'small', soft: true }),
    );
    if (!open()) return;
    const near = Math.abs(month - e.low) < 0.5;
    f.readout.textContent = near
      ? `${early(month)[0].toUpperCase()}${early(month).slice(1)} ${monthName(month)}: the green line has just dropped back under the red one. The air stops losing CO₂ here, so this is the lowest point of the year, long after the leaves were greenest.`
      : `${monthName(month)}: plants are ${into ? 'giving off more than they take in, so the CO₂ is rising' : 'taking in more than they give off, so the CO₂ is falling'}. Lowest in ${early(e.low)} ${monthName(e.low)}, highest in ${early(e.high)} ${monthName(e.high)}, a swing of ${e.swing.toFixed(1)} ppm.`;
    if (near && month > 7) t.done();
  };
  const ms = slider('Month', 0, 12, 0.05, 0, (v) => monthName(Math.min(11.99, v)), (v) => { month = v; paint(); }, 'heat');
  const play = player(ms, ctx, { seconds: 12 });
  const grow = slider('Strength of the northern summer', 0.6, 1.6, 0.05, 1, (v) => `${Math.round(v * 100)}% of today’s`, (v) => { s.growth = v; paint(); }, 'plant');
  const shift = slider('Spring comes', -1.5, 1.5, 0.1, 0, (v) => (Math.abs(v) < 0.05 ? 'as now' : `${Math.abs(Math.round(v * 30))} days ${v < 0 ? 'earlier' : 'later'}`), (v) => { s.shift = v; paint(); }, 'sun');
  f.controls.append(play.node, ms.node, grow.node, shift.node);
  const open = guessFirst(t, f, {
    ask: 'Northern forests and fields are greenest in June and July. In which month is the CO₂ over Mauna Loa lowest?',
    options: ['June or July', 'September or October', 'December or January'],
    answer: 1,
    sliders: [ms, grow, shift],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});
