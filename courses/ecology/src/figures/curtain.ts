// Lesson 13, A curtain across a lake: Lake 226 split in two, a summer's oxygen
// in the deep water, and a food chain with nutrients fed in at the bottom.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, pick, player, slider, toggles } from './kit';

const W = 400;

export interface Feed {
  carbon: boolean;
  nitrogen: boolean;
  phosphorus: boolean;
}

/**
 * How much algae a basin can grow, by Liebig's rule: the supply of whichever
 * nutrient is shortest for what algae need, in the same units. Carbon comes in
 * from the air and nitrogen can be fixed from it by blue-green algae, which
 * start slowly; phosphorus has no way in but what is added.
 */
export function room(feed: Feed, week: number): { c: number; n: number; p: number; limit: 'carbon' | 'nitrogen' | 'phosphorus' } {
  const c = 30 + (feed.carbon ? 40 : 0);
  // Fixers make up a nitrogen shortage over a few weeks, if there is phosphorus to grow on.
  const fixing = feed.phosphorus && !feed.nitrogen ? Math.min(24, 4 * week) : 0;
  const n = 6 + (feed.nitrogen ? 40 : 0) + fixing;
  const p = 3 + (feed.phosphorus ? 40 : 0);
  const min = Math.min(c, n, p);
  return { c, n, p, limit: min === p ? 'phosphorus' : min === n ? 'nitrogen' : 'carbon' };
}

/** Algae in a basin after `weeks`, growing toward its room from 2 units. */
export function bloom(feed: Feed, weeks: number): number {
  let a = 2;
  const dt = 0.05;
  for (let i = 0; i < weeks / dt; i++) {
    const r = room(feed, i * dt);
    const k = Math.min(r.c, r.n, r.p);
    a += dt * 0.9 * a * (1 - a / k);
  }
  return a;
}

const NUTRIENTS = ['carbon', 'nitrogen', 'phosphorus'] as const;
const NAMES = ['Carbon', 'Nitrogen', 'Phosphorus'];

export const curtainFigure = figure(['bloom'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  const feeds: [Feed, Feed] = [{ carbon: true, nitrogen: true, phosphorus: false }, { carbon: true, nitrogen: true, phosphorus: true }];
  let weeks = 0;
  const paint = () => {
    const a = feeds.map((fd) => bloom(fd, weeks));
    const green = (v: number) => Math.min(1, v / 40);
    // An hourglass lake: two basins joined at a narrow waist, the curtain across it.
    const basin = (cx: number, v: number, i: number) => {
      const r = room(feeds[i], weeks);
      const added = NUTRIENTS.filter((n) => feeds[i][n]).map((n) => n[0].toUpperCase() + n.slice(1)).join(', ') || 'nothing';
      return [
        svg('ellipse', { cx, cy: 100, rx: 86, ry: 62, fill: COL.water, opacity: 0.55 }),
        svg('ellipse', { cx, cy: 100, rx: 86, ry: 62, fill: COL.plant, opacity: green(v) }),
        label(cx, 188, i === 0 ? 'South-west basin' : 'North-east basin', { anchor: 'middle', bold: true, size: 'small' }),
        small(cx, 202, `added: ${added}`, { anchor: 'middle', soft: true }),
        small(cx, 216, weeks > 0 ? `algae ${Math.round(v)} · short of ${r.limit}` : '', { anchor: 'middle', fill: r.limit === 'phosphorus' ? COL.rose : COL.soft }),
      ];
    };
    redraw(g,
      svg('rect', { x: 180, y: 76, width: 40, height: 48, fill: COL.water, opacity: 0.55 }),
      ...basin(96, a[0], 0),
      ...basin(304, a[1], 1),
      line(200, 70, 200, 130, COL.ink, 3),
      small(200, 62, 'curtain', { anchor: 'middle' }),
      small(200, 230, 'A model', { anchor: 'middle', soft: true }),
    );
    if (!open()) return;
    const bloomed = a.map((v) => v > 20);
    f.readout.textContent = weeks < 1
      ? 'Early summer. Both basins are clear. Play the summer, or change what goes into each side.'
      : `Week ${Math.round(weeks)}. ${bloomed[0] && bloomed[1] ? 'Both basins have bloomed: each got phosphorus.' : bloomed[0] || bloomed[1] ? `Only the ${bloomed[0] ? 'south-west' : 'north-east'} basin has bloomed, the side with phosphorus. Carbon and nitrogen made no difference to the other.` : 'Neither basin blooms: without phosphorus, extra carbon and nitrogen do nothing.'}${feeds.some((fd, i) => fd.phosphorus && !fd.nitrogen && a[i] > 15) ? ' Blue-green algae are fixing the missing nitrogen from the air.' : ''}`;
    if (weeks >= 6 && bloomed[0] !== bloomed[1]) t.done();
  };
  const ws = slider('Weeks of summer', 0, 10, 0.1, 0, (v) => `${Math.round(v)}`, (v) => { weeks = v; paint(); }, 'plant');
  const play = player(ws, ctx, { seconds: 8 });
  const sides = feeds.map((fd, i) => {
    const row = toggles(NAMES.map((n) => `${n}${i === 0 ? ' (SW)' : ' (NE)'}`), NUTRIENTS.map((n) => fd[n]), (on) => {
      NUTRIENTS.forEach((n, k) => (fd[n] = on[k]));
      paint();
    });
    return row;
  });
  f.controls.append(play.node, ws.node, ...sides.map((s) => s.node));
  const open = guessFirst(t, f, {
    ask: 'Both halves of the lake get carbon and nitrogen. Only the north-east half also gets phosphorus. What happens?',
    options: ['Only the north-east half turns green', 'Both halves turn green', 'Neither: carbon is what runs short'],
    answer: 0,
    sliders: [ws],
    buttons: [play.node, ...sides.flatMap((s) => s.buttons)],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Oxygen in the deep water ---------------------------------------------------------------

/** Oxygen in the deep water, mg per litre, through a summer (weeks from the spring mixing), with `bloom` algae dying and sinking. */
export function deepOxygen(bloomSize: number, week: number): number {
  // Full of oxygen after the spring mixing; used by rot at a rate set by what sinks from above.
  const use = 0.08 + 0.012 * bloomSize;
  const o = 12 - use * Math.min(week, 24);
  // The autumn mixing, about week 24, brings the oxygen back.
  return week > 24 ? Math.min(12, Math.max(0, 12 - use * 24) + (week - 24) * 3) : Math.max(0, o);
}

/** Below this, lake trout and other cold-water fish can't live. */
export const FISH_LIMIT = 4;

export const oxygenFigure = figure(['limit'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let size = 0;
  let week = 0;
  const paint = () => {
    const o = deepOxygen(size, week);
    const a = axes({ x: 236, y: 22, w: 150, h: 150, xmin: 0, xmax: 28, ymin: 0, ymax: 12, xticks: [0, 8, 16, 24], yticks: [0, 4, 8, 12], xlabel: 'weeks from May', ylabel: 'deep oxygen, mg/L', ink: COL.ink, grid: COL.grid });
    const pts = Array.from({ length: Math.round(week) + 1 }, (_, i) => [i, deepOxygen(size, i)] as [number, number]);
    const layered = week > 1 && week < 24;
    const fishOk = o >= FISH_LIMIT;
    redraw(g,
      svg('path', { d: 'M10 40 L210 40 L180 200 L40 200 Z', fill: COL.water, opacity: 0.35 }),
      svg('path', { d: 'M10 40 L210 40 L202 84 L18 84 Z', fill: COL.plant, opacity: Math.min(0.85, 0.08 + size / 70) }),
      layered ? line(18, 84, 202, 84, COL.heat, 1.5, { 'stroke-dasharray': '5 3' }) : null,
      layered ? small(206, 88, 'warm over cold', { fill: COL.heat }) : null,
      svg('path', { d: 'M18 84 L202 84 L180 200 L40 200 Z', fill: COL.deaths, opacity: Math.max(0, (12 - o) / 12) * 0.5 }),
      ...Array.from({ length: Math.round(size / 6) }, (_, i) => svg('circle', { cx: 40 + ((i * 53) % 140), cy: 90 + ((i * 29 + week * 7) % 100), r: 1.6, fill: COL.plant })),
      label(110, 30, 'algae grow in the sunlit top', { anchor: 'middle', size: 'small' }),
      fishOk ? svg('path', { d: 'M96 160 q14 -10 28 0 q-14 10 -28 0 Z M124 160 l8 -6 l0 12 Z', fill: COL.rival }) : null,
      small(110, 214, fishOk ? 'trout in the cold deep water' : 'too little oxygen for trout', { anchor: 'middle', fill: fishOk ? COL.ink : COL.bad }),
      ...a.parts,
      line(a.X(0), a.Y(FISH_LIMIT), a.X(28), a.Y(FISH_LIMIT), COL.bad, 1, { 'stroke-dasharray': '4 3' }),
      small(a.X(28), a.Y(FISH_LIMIT) - 4, 'trout need this', { anchor: 'end', fill: COL.bad }),
      a.path(pts, COL.water, 2.2),
      ...legend(236, 236, [{ text: 'oxygen in the deep water', color: COL.water }]),
      small(392, 246, 'A model', { anchor: 'end', soft: true }),
    );
    const low = deepOxygen(size, 23);
    f.readout.textContent = week < 1
      ? 'May: the lake has just mixed top to bottom and is full of oxygen. Play the summer.'
      : week >= 24
        ? `Autumn: the surface cools, the lake mixes again and the deep water gets its oxygen back. Its lowest this year was ${low.toFixed(1)} mg per litre${low < FISH_LIMIT ? ', too little for trout' : ''}.`
        : `Week ${Math.round(week)}: warm water floats on cold and the two don't mix. Dead algae sink and rot below, using oxygen that can't be replaced until autumn. Deep oxygen ${o.toFixed(1)} mg per litre.`;
    if (week >= 23 && low >= FISH_LIMIT && low < 6) t.done();
  };
  const ss = slider('Phosphorus added', 0, 60, 1, 0, (v) => (v === 0 ? 'none' : `${v} units`), (v) => { size = v; paint(); }, 'rose');
  const wk = slider('Week', 0, 28, 0.25, 0, (v) => `${Math.round(v)}`, (v) => { week = v; paint(); }, 'water');
  const play = player(wk, ctx, { seconds: 10 });
  f.controls.append(ss.node, play.node, wk.node);
  paint();
  return f.node;
});

// ---- Top down or bottom up ------------------------------------------------------------------

const CHAIN = [
  { name: 'Algae', color: COL.plant },
  { name: 'Water fleas', color: COL.prey },
  { name: 'Small fish', color: COL.predator },
  { name: 'Bass', color: COL.heat },
];

/**
 * A lake's food chain of `n` levels at its balance, with `nutrients` setting
 * how much room the algae have. The same equations as lesson 8's chain: each
 * level eats the one below in proportion to how often they meet.
 */
export function lakeChain(n: number, nutrients: number): number[] {
  const eat = 0.05;
  const keep = 0.5;
  const death = [0, 0.3, 0.3, 0.1];
  const k = nutrients;
  if (n === 1) return [k];
  if (n === 2) {
    const a = death[1] / (keep * eat);
    return a >= k ? [k, 0] : [a, (1 - a / k) / eat];
  }
  // Three or four levels: solve the balance level by level, as lesson 8 does.
  const m = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
  m[0][0] = 1 / k;
  m[0][1] = eat;
  m[0][n] = 1;
  for (let i = 1; i < n; i++) {
    m[i][i - 1] = keep * eat;
    if (i < n - 1) m[i][i + 1] = -eat;
    m[i][n] = death[i];
  }
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const q = m[r][c] / m[c][c];
      for (let j = c; j <= n; j++) m[r][j] -= q * m[c][j];
    }
  }
  const x = m.map((row, i) => row[n] / row[i]);
  return x.every((v) => v > 0) ? x : [...lakeChain(n - 1, nutrients), 0];
}

const sigx = (v: number) => (Math.round(v * 10) / 10).toString();

export const controlFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 3;
  let nutrients = 60;
  const seen = new Set<number>();
  const paint = () => {
    const x = lakeChain(n, nutrients);
    const low = lakeChain(n, 60);
    const max = [130, 22, 60, 5];
    redraw(g,
      ...CHAIN.map((c, i) => {
        const y = 170 - i * 44;
        const v = x[i] ?? 0;
        const on = i < n;
        const w = on ? Math.max(2, Math.min(1, v / max[i]) * 230) : 0;
        const ch = on && low[i] > 0 ? v / low[i] : 1;
        return [
          label(10, y + 15, c.name, { bold: true, size: 'small', fill: on ? COL.ink : COL.soft }),
          on ? svg('rect', { x: 92, y, width: w, height: 22, fill: c.color, opacity: 0.88, rx: 2 }) : small(92, y + 15, '(not in this lake)', { soft: true }),
          on && nutrients > 60 ? small(92 + w + 6, y + 15, ch > 1.15 ? `▲ ×${ch.toFixed(1)}` : 'no change', { fill: ch > 1.15 ? COL.good : COL.soft }) : null,
        ];
      }).flat(),
      small(392, 214, 'At balance. A model.', { anchor: 'end', soft: true }),
    );
    const up = CHAIN.slice(0, n).filter((_, i) => low[i] > 0 && (x[i] ?? 0) / low[i] > 1.15).map((c) => c.name.toLowerCase());
    f.readout.textContent = nutrients <= 60
      ? `A lake of ${n} levels. Add nutrients at the bottom and watch which levels gain.`
      : `${sigx(nutrients / 60)} times the nutrients, ${n} levels: ${up.join(' and ')} gain${up.length === 1 ? 's' : ''}, and the rest stay put. The top of the chain decides where the extra goes.`;
    if (nutrients >= 180) seen.add(n);
    if (seen.has(3) && seen.has(4)) t.done();
  };
  const levels = pick(['Three levels', 'Four levels (add bass)'], 0, (i) => { n = i + 3; paint(); });
  const s = slider('Nutrients fed in', 60, 300, 12, nutrients, (v) => `${sigx(v / 60)}×`, (v) => { nutrients = v; paint(); }, 'rose');
  f.controls.append(levels.node, s.node);
  paint();
  return f.node;
});
