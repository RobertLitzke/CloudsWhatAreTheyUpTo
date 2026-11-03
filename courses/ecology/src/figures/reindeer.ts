// Lesson 3, The reindeer of St Matthew Island: a herd living on a slow food
// stock, and what a delay does to growth.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import { axes, big, COL, figure, frame, guessFirst, legend, pick, player, slider } from './kit';

const W = 400;

/** Klein's counts of the herd. */
export const KLEIN: readonly (readonly [number, number])[] = [[1944, 29], [1957, 1350], [1963, 6000], [1966, 42]];

/**
 * A model of the island, from 1944 to 1970, in steps of a hundredth of a
 * year. Lichen is a share of the island's full cover and grows back toward
 * full in about `regrow` years. Each reindeer eats a ration when it can find
 * one; the herd's condition follows its food a year behind, so it breeds well
 * on stored fat after the food has gone, and starves late. A hard winter in
 * 1963-64 buries three-quarters of the lichen under ice and snow.
 * Returns the herd and lichen at the start of each year.
 */
export function island(regrow: number, hardWinter: boolean): { year: number; herd: number; lichen: number }[] {
  const RATION = 5e-5;
  const ENOUGH = 2e-5;
  const BREED = 0.28;
  const STARVE = 12;
  const LAG = 1;
  const WELL = 0.85;
  let lichen = 1;
  let herd = 29;
  let condition = 1;
  const dt = 0.01;
  const out: { year: number; herd: number; lichen: number }[] = [];
  for (let i = 0; i <= 2600; i++) {
    const t = 1944 + i * dt;
    if (i % 100 === 0) out.push({ year: Math.round(t), herd, lichen });
    const buried = hardWinter && t >= 1963.8 && t < 1964.4 ? 0.25 : 1;
    const fed = Math.min(1, (buried * lichen) / Math.max(herd, 1) / ENOUGH);
    condition += ((fed - condition) / LAG) * dt;
    lichen = Math.min(1, Math.max(0, lichen + ((1 - lichen) / regrow - RATION * herd * fed) * dt));
    const growth = BREED * Math.max(0, (condition - WELL) / (1 - WELL)) - STARVE * Math.max(0, WELL - condition);
    herd = Math.max(0, herd + herd * growth * dt);
  }
  return out;
}

export const islandFigure = figure(['fast'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let regrow = 40;
  let hard = true;
  let year = 1944;
  const paint = () => {
    const runs = island(regrow, hard);
    const ax = axes({ x: 50, y: 24, w: 300, h: 170, xmin: 1944, xmax: 1970, ymin: 0, ymax: 8000, xticks: [1944, 1950, 1960, 1970], yticks: [0, 4000, 8000], yfmt: (v) => big(v), ylabel: 'reindeer', ink: COL.ink, grid: COL.grid });
    const shown = runs.filter((r) => r.year <= year);
    const now = shown[shown.length - 1];
    // Lichen as a green band along the right edge, and a line under the herd.
    const lichenY = (v: number) => 194 - v * 170;
    redraw(g,
      ...ax.parts,
      ax.path(shown.map((r) => [r.year, r.lichen * 8000] as const), COL.lichen, 2.4, { 'stroke-dasharray': '5 3' }),
      ax.path(shown.map((r) => [r.year, r.herd] as const), COL.prey, 2.6),
      ...ax.dots(KLEIN.filter(([y]) => y <= year), COL.data, 3.2),
      line(358, lichenY(0), 358, lichenY(1), COL.grid, 8),
      line(358, lichenY(0), 358, lichenY(now.lichen), COL.lichen, 8),
      small(366, lichenY(1) + 4, 'lichen', { fill: COL.plant }),
      small(366, lichenY(1) + 14, 'cover', { fill: COL.plant }),
      ...legend(50, 226, [{ text: 'herd (model)', color: COL.prey }, { text: 'lichen (model)', color: COL.lichen, dash: true }, { text: 'Klein’s counts', color: COL.data, dot: true }]),
      hard ? note(ax.X(1963.9), 18, 'hard winter', { anchor: 'middle', fill: COL.water }) : null,
      hard ? line(ax.X(1963.9), 22, ax.X(1963.9), 194, COL.water, 1, { 'stroke-dasharray': '2 3' }) : null,
    );
    if (!open()) return;
    const peak = shown.reduce((m, r) => (r.herd > m.herd ? r : m), shown[0]);
    f.readout.textContent = year <= 1944
      ? 'August 1944: 29 reindeer on an island of untouched lichen. Press Play.'
      : `${now.year}: ${big(now.herd)} reindeer, lichen at ${Math.round(now.lichen * 100)}% of its old cover.${peak.herd > now.herd * 3 && peak.herd > 2000 ? ` The herd peaked at ${big(peak.herd)} in ${peak.year} and crashed.` : now.year >= 1970 && regrow <= 8 ? ' With lichen this quick to grow back, the herd wobbles and settles.' : ''}`;
    if (year >= 1970 && regrow <= 6 && now.herd > 1000) t.done();
  };
  const years = slider('Year', 1944, 1970, 1, 1944, (v) => `${v}`, (v) => { year = v; paint(); }, 'prey');
  const play = player(years, ctx, { seconds: 9 });
  const back = slider('Lichen grows back in', 3, 60, 1, regrow, (v) => `${v} years`, (v) => { regrow = v; paint(); }, 'plant');
  const winter = pick(['Hard winter of 1963–64', 'Ordinary winter'], 0, (i) => { hard = i === 0; paint(); });
  f.controls.append(play.node, years.node, back.node, winter.node);
  const open = guessFirst(t, f, {
    ask: 'Lichen on the island takes decades to grow back once eaten. If it grew back in five years instead, what would the herd do?',
    options: ['Rise and crash the same way', 'Wobble, then level off', 'Grow without end'],
    answer: 1,
    reveal: 'done',
    sliders: [years, back],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A brake that acts late --------------------------------------------------------------

/** The logistic brake acting on the population `lag` years ago: growth 1 a year when uncrowded, ceiling 100. */
export function delayed(lag: number, years = 30): number[] {
  const dt = 0.01;
  const back = Math.round(lag / dt);
  const n: number[] = [5];
  for (let i = 1; i <= years / dt; i++) {
    const then = n[Math.max(0, i - 1 - back)];
    const now = n[i - 1];
    n.push(Math.max(0.01, now + now * (1 - then / 100) * dt));
  }
  return n.filter((_, i) => i % 10 === 0);
}

export const delayFigure = figure(['overshoot'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let lag = 0;
  const paint = () => {
    const run = delayed(lag);
    const ax = axes({ x: 46, y: 20, w: 330, h: 160, xmin: 0, xmax: 30, ymin: 0, ymax: 300, xticks: [0, 10, 20, 30], yticks: [0, 100, 200, 300], xlabel: 'years', ylabel: 'population', ink: COL.ink, grid: COL.grid });
    const peak = Math.max(...run);
    const low = Math.min(...run.slice(run.indexOf(peak)));
    redraw(g,
      ...ax.parts,
      line(ax.X(0), ax.Y(100), ax.X(30), ax.Y(100), COL.deaths, 1.2, { 'stroke-dasharray': '4 3' }),
      small(ax.X(30), ax.Y(100) - 4, 'ceiling', { anchor: 'end', fill: COL.deaths }),
      ax.path(run.map((v, i) => [i / 10, v] as const), COL.model, 2.4),
    );
    f.readout.textContent = lag === 0
      ? 'The brake acts on today’s numbers: the population slows smoothly into its ceiling and stops.'
      : peak < 105
        ? `A brake ${lag} years late hardly matters when the population is slow to grow.`
        : peak > 200
          ? `With the brake ${lag} years late, the population shoots to ${Math.round(peak)}, nearly ${Math.round(peak / 100)} times the ceiling, then crashes to ${Math.round(low)}. A boom and bust from one delay.`
          : `With the brake ${lag} years late, the population overshoots to ${Math.round(peak)} and swings back below the ceiling before settling.`;
    if (peak > 120) t.done();
  };
  const s = slider('The brake acts on numbers from', 0, 2.5, 0.1, 0, (v) => (v ? `${v.toFixed(1)} years ago` : 'now'), (v) => { lag = Math.round(v * 10) / 10; paint(); }, 'model');
  f.controls.append(s.node);
  paint();
  return f.node;
});
