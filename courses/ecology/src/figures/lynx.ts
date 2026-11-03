// Lesson 4, The hare and the lynx: two coupled stocks that cycle, and
// Volterra's fish.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, player, run, slider, toggles } from './kit';

const W = 400;

/** Pelts traded to the Hudson's Bay Company, thousands, 1900 to 1920, as most textbooks reprint them (after MacLulich 1937). */
export const LEDGERS: readonly (readonly [number, number, number])[] = [
  [1900, 30, 4], [1901, 47.2, 6.1], [1902, 70.2, 9.8], [1903, 77.4, 35.2], [1904, 36.3, 59.4], [1905, 20.6, 41.7], [1906, 18.1, 19], [1907, 21.4, 13],
  [1908, 22, 8.3], [1909, 25.4, 9.1], [1910, 27.1, 7.4], [1911, 40.3, 8], [1912, 57, 12.3], [1913, 76.6, 19.5], [1914, 52.3, 45.7], [1915, 19.5, 51.1],
  [1916, 11.2, 29.7], [1917, 7.6, 15.8], [1918, 14.6, 9.7], [1919, 16.2, 10.1], [1920, 24.7, 8.6],
];

export interface Cycle {
  /** Hares born per hare per year, with plenty of food and no lynx. */
  births: number;
  /** How good the lynx are at catching hares. */
  hunting: number;
  /** Hares limited by their own food too. */
  food: boolean;
  /** Share of each kind taken each year by people (Volterra's fishing). */
  harvest?: number;
}

/** Lotka and Volterra's two equations, in thousands, stepped every 0.02 year for `years` years from the ledgers' 1900 numbers. */
export function cycle(c: Cycle, years: number): number[][] {
  const lynxDeath = 0.8;
  const convert = 0.55;
  const f = c.harvest ?? 0;
  return run(([h, l]) => [
    h * (c.births - f - c.hunting * l - (c.food ? (c.births * h) / 160 : 0)),
    l * (convert * c.hunting * h - lynxDeath - f),
  ], [30, 4], 0.02, Math.round(years / 0.02));
}

export const cycleFigure = figure(['loop'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  const c: Cycle = { births: 0.5, hunting: 0.025, food: false };
  let year = 0;
  let ledgers = false;
  const paint = () => {
    const runs = cycle(c, 40);
    const upto = runs.slice(0, Math.round(year / 0.02) + 1);
    const time = axes({ x: 40, y: 22, w: 216, h: 170, xmin: 0, xmax: 40, ymin: 0, ymax: 160, xticks: [0, 10, 20, 30, 40], yticks: [0, 80, 160], xlabel: 'years', ylabel: 'thousands', ink: COL.ink, grid: COL.grid });
    const phase = axes({ x: 290, y: 22, w: 96, h: 170, xmin: 0, xmax: 160, ymin: 0, ymax: 80, xticks: [0, 80, 160], yticks: [0, 40, 80], xlabel: 'hares', ylabel: 'lynx', ink: COL.ink, grid: COL.grid });
    const step = 5;
    const thin = (k: 0 | 1) => upto.filter((_, i) => i % step === 0).map((y, i) => [i * step * 0.02, y[k]] as const);
    const now = upto[upto.length - 1];
    redraw(g,
      ...time.parts,
      time.path(thin(0), COL.prey, 2.2),
      time.path(thin(1), COL.predator, 2.2),
      ...(ledgers ? [...time.dots(LEDGERS.map(([y, h]) => [y - 1900, h] as const), COL.prey, 2.4), ...time.dots(LEDGERS.map(([y, , l]) => [y - 1900, l] as const), COL.predator, 2.4)] : []),
      ...phase.parts,
      phase.path(upto.filter((_, i) => i % step === 0).map((y) => [y[0], y[1]] as const), COL.model, 1.6),
      svg('circle', { cx: phase.X(Math.min(160, now[0])), cy: phase.Y(Math.min(80, now[1])), r: 3.5, fill: COL.heat }),
      ...legend(40, 236, [{ text: 'hares', color: COL.prey }, { text: 'lynx', color: COL.predator }, ...(ledgers ? [{ text: 'the Company’s pelts', color: COL.ink, dot: true }] : [])]),
    );
    if (!open()) return;
    const hs = upto.map((y) => y[0]);
    let lastPeakH = -1;
    let lastPeakL = -1;
    for (let i = 1; i < upto.length - 1; i++) {
      if (hs[i] > hs[i - 1] && hs[i] >= hs[i + 1]) lastPeakH = i * 0.02;
      if (upto[i][1] > upto[i - 1][1] && upto[i][1] >= upto[i + 1][1]) lastPeakL = i * 0.02;
    }
    f.readout.textContent = year < 1
      ? 'Hares and lynx as two stocks: lynx are born from hares eaten, and starve when hares are few. Press Play.'
      : lastPeakH > 0 && lastPeakL > lastPeakH
        ? `Hares peaked in year ${Math.round(lastPeakH)}, lynx about ${Math.round((lastPeakL - lastPeakH) * 10) / 10} years later. ${c.food ? 'With the hares short of food too, the swings shrink and the loop spirals in.' : 'Round and round the same loop: neither kind runs out, and neither settles.'}`
        : `Year ${Math.round(year)}: ${Math.round(now[0])} thousand hares, ${Math.round(now[1])} thousand lynx.`;
    if (year >= 20) t.done();
  };
  const years = slider('Year', 0, 40, 0.5, 0, (v) => `${Math.round(v)}`, (v) => { year = v; paint(); }, 'model');
  const play = player(years, ctx, { seconds: 12 });
  const births = slider('Hare births', 0.3, 0.8, 0.02, c.births, (v) => `${Math.round(v * 100)}% a year`, (v) => { c.births = v; paint(); }, 'prey');
  const hunting = slider('Lynx hunting skill', 0.015, 0.04, 0.001, c.hunting, (v) => `${Math.round(v * 1000)}`, (v) => { c.hunting = v; paint(); }, 'predator');
  const sw = toggles(['Hares short of food too', 'Show the Company’s pelts'], [false, false], (on) => { c.food = on[0]; ledgers = on[1]; paint(); });
  f.controls.append(play.node, years.node, births.node, hunting.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'When the hares are at their peak, what are the lynx doing?',
    options: ['At their peak too', 'Still rising', 'Already falling'],
    answer: 1,
    reveal: 'done',
    sliders: [years, births, hunting],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Volterra's fish ----------------------------------------------------------------------

/** The averages over a cycle, which are the model's balance point: prey (m + f) / (c b), predators (a - f) / b. */
export const averages = (fishing: number) => {
  const a = 0.5;
  const b = 0.025;
  const cb = 0.55 * b;
  return { prey: (0.8 + fishing) / cb, predators: Math.max(0, (a - fishing) / b) };
};

export const fishingFigure = figure(['fished'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let fishing = 0;
  const paint = () => {
    const none = averages(0);
    const now = averages(fishing);
    const share = now.predators / (now.prey + now.predators);
    const bar = (x: number, v: number, was: number, color: string, name: string) => {
      const y = (n: number) => 186 - (n / 120) * 150;
      return [
        svg('rect', { x, y: y(v), width: 60, height: 186 - y(v), fill: color, opacity: 0.85 }),
        line(x - 6, y(was), x + 66, y(was), COL.ink, 1.2, { 'stroke-dasharray': '3 3' }),
        label(x + 30, 202, name, { anchor: 'middle', bold: true }),
        small(x + 30, y(v) - 6, `${Math.round(v)} thousand`, { anchor: 'middle' }),
      ];
    };
    redraw(g,
      line(30, 186, 290, 186, COL.ink, 1.2),
      ...bar(60, now.prey, none.prey, COL.prey, 'Prey fish'),
      ...bar(190, now.predators, none.predators, COL.predator, 'Sharks and rays'),
      note(30, 20, 'Average numbers over a cycle (model)', { bold: true }),
      small(30, 34, 'Dashed: with no fishing.', { soft: true }),
      note(300, 80, 'Sharks and rays', { fill: COL.predator }),
      note(300, 93, 'in the catch:', { fill: COL.predator }),
      label(300, 116, `${Math.round(share * 100)}%`, { bold: true, fill: COL.predator }),
    );
    if (!open()) return;
    f.readout.textContent = fishing === 0
      ? 'No fishing. Now fish: each year nets take the same share of every kind.'
      : `Fishing takes ${Math.round(fishing * 100)}% of each kind a year. The prey average rises to ${Math.round(now.prey)} thousand and the predators’ falls to ${Math.round(now.predators)} thousand: fishing hurts the predators more, because it also takes their food.`;
    if (fishing >= 0.3) t.done();
  };
  const s = slider('Fishing', 0, 0.45, 0.01, 0, (v) => `${Math.round(v * 100)}% a year`, (v) => { fishing = v; paint(); }, 'sea');
  f.controls.append(s.node);
  const open = guessFirst(t, f, {
    ask: 'Nets take the same share of every kind of fish, prey and predator alike. Fish harder: what happens to the average number of prey fish?',
    options: ['It falls', 'It rises', 'It stays the same'],
    answer: 1,
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});

