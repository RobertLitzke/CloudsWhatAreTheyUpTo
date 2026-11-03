// Lesson 8, Why is the world green?: a food chain of one to four levels at
// its balance, and Estes's two Aleutian islands.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, pick, slider, wrapped } from './kit';

const W = 400;

export const LEVELS = [
  { name: 'Kelp', color: COL.plant, max: 400 },
  { name: 'Sea urchins', color: COL.prey, max: 25 },
  { name: 'Sea otters', color: COL.predator, max: 80 },
  { name: 'Orcas', color: COL.heat, max: 10 },
] as const;

/** Each level's death rate with nothing hunting it; the orca, a big, long-lived animal, dies slowest. */
const DEATH = [0, 0.3, 0.3, 0.1];
const EAT = 0.05;
const KEEP = 0.5;
const KELP_ROOM = 400;

/**
 * The balance of a chain of `n` levels (kelp growing up to a ceiling, each level
 * eating the one below in proportion to how often they meet), with `top` the
 * hunting rate of the highest level. Solved exactly, level by level.
 * A top level that can't make a living drops out; the result is then shorter.
 */
export function chain(n: number, top = EAT): number[] {
  if (n <= 1) return [KELP_ROOM];
  const a = Array.from({ length: n - 1 }, (_, i) => (i === n - 2 ? top : EAT));
  // Unknowns x0..x(n-1). Rows: kelp: x0/K + a0 x1 = 1; middle i: e a(i-1) x(i-1) - a(i) x(i+1) = m(i); top: e a(n-2) x(n-2) = m(n-1).
  const m = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
  m[0][0] = 1 / KELP_ROOM;
  m[0][1] = a[0];
  m[0][n] = 1;
  for (let i = 1; i < n; i++) {
    m[i][i - 1] = KEEP * a[i - 1];
    if (i < n - 1) m[i][i + 1] = -a[i];
    m[i][n] = DEATH[i];
  }
  // Gaussian elimination with partial pivoting.
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = m[r][c] / m[c][c];
      for (let j = c; j <= n; j++) m[r][j] -= k * m[c][j];
    }
  }
  const x = m.map((row, i) => row[n] / row[i]);
  return x.every((v) => v > 0) ? x : chain(n - 1);
}

export const chainFigure = figure(['flip'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 3;
  let top = EAT;
  let before: number[] | null = null;
  let seen3 = false;
  const paint = () => {
    const now = chain(n, top);
    const rows = LEVELS.map((lv, i) => {
      const y = 182 - i * 46;
      const v = now[i];
      const was = before?.[i];
      const w = (x: number) => Math.min(1, x / lv.max) * 230;
      return [
        label(14, y + 14, lv.name, { bold: true, fill: i < now.length ? lv.color : COL.soft }),
        svg('rect', { x: 110, y, width: 230, height: 20, fill: COL.grid, rx: 3 }),
        v !== undefined ? svg('rect', { x: 110, y, width: Math.max(2, w(v)), height: 20, fill: lv.color, rx: 3 }) : small(118, y + 14, i < n ? 'can’t make a living' : 'absent', { soft: true }),
        was !== undefined && Math.abs(w(was) - w(v ?? 0)) > 3 ? line(110 + w(was), y - 4, 110 + w(was), y + 24, COL.ink, 1.4, { 'stroke-dasharray': '3 2' }) : null,
        v !== undefined && was !== undefined && Math.abs(w(was) - w(v)) > 3 ? small(350, y + 14, v > was ? '▲ more' : '▼ fewer', { fill: v > was ? COL.good : COL.bad, bold: true }) : null,
      ];
    }).flat();
    redraw(g,
      ...rows,
      ...(n > 1 ? LEVELS.slice(1, n).map((_, i) => small(96, 182 - i * 46 - 8, '↑ eaten by', { soft: true, anchor: 'end' })) : []),
      small(110, 226, before ? 'Dashed: before the last change. A model at its balance.' : 'A model at its balance.', { soft: true }),
    );
    if (!open()) return;
    const kelp = now[0];
    f.readout.textContent = now.length === 1
      ? 'Kelp alone grows until it fills all the room it has.'
      : now.length === 2
        ? `Urchins graze the kelp down to ${Math.round((kelp / KELP_ROOM) * 100)}% of the room it has: a barren.`
        : now.length === 3
          ? `Otters hold the urchins down, so the kelp grows back to ${Math.round((kelp / KELP_ROOM) * 100)}% of its room: a forest.`
          : `Orcas eat otters; with fewer otters the urchins come back, and the kelp falls to ${Math.round((kelp / KELP_ROOM) * 100)}% of its room. Adding a level flips every level below it.`;
    if (now.length === 3) seen3 = true;
    if (seen3 && now.length === 4) t.done();
  };
  const levels = pick(['Kelp alone', '+ urchins', '+ otters', '+ orcas'], n - 1, (i) => { before = chain(n, top); n = i + 1; paint(); });
  const hunt = slider('Top level’s hunting', 0.02, 0.1, 0.005, top, (v) => `${Math.round((v / EAT) * 100)}%`, (v) => { before = chain(n, top); top = v; paint(); }, 'predator');
  f.controls.append(levels.node, hunt.node);
  const open = guessFirst(t, f, {
    ask: 'Kelp, urchins and sea otters. Orcas arrive and start eating otters. Orcas don’t touch kelp. What happens to the kelp?',
    options: ['More kelp', 'Less kelp', 'No change'],
    answer: 1,
    reveal: 'done',
    sliders: [hunt],
    buttons: levels.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Amchitka and Shemya --------------------------------------------------------------------

const urchin = (cx: number, cy: number, r: number) => [
  ...Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return line(cx + r * 0.6 * Math.cos(a), cy + r * 0.6 * Math.sin(a), cx + r * 1.5 * Math.cos(a), cy + r * 1.5 * Math.sin(a), '#5a2d4a', 0.9);
  }),
  svg('circle', { cx, cy, r, fill: '#6e3a5c' }),
];

const kelp = (x: number, base: number, top: number, sway: number) => {
  const pts: string[] = [];
  for (let y = base; y >= top; y -= 6) pts.push(`${(x + Math.sin((base - y) / 18 + sway) * 5).toFixed(1)},${y}`);
  const blades = [];
  for (let y = base - 18; y > top + 6; y -= 16) {
    const xx = x + Math.sin((base - y) / 18 + sway) * 5;
    const side = ((y / 16) | 0) % 2 ? 1 : -1;
    blades.push(svg('path', { d: `M${xx.toFixed(1)},${y} q${side * 10},-4 ${side * 16},2`, stroke: COL.plant, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }));
  }
  return [svg('polyline', { points: pts.join(' '), stroke: '#3c6e2e', 'stroke-width': 1.6, fill: 'none' }), ...blades];
};

const otter = (cx: number, cy: number) => [
  svg('ellipse', { cx, cy, rx: 16, ry: 4.5, fill: '#5a4434' }),
  svg('circle', { cx: cx + 15, cy: cy - 3, r: 4.5, fill: '#7a6250' }),
  svg('circle', { cx: cx + 16.5, cy: cy - 4, r: 0.9, fill: COL.ink }),
];

export const islandsStill = () => {
  const s = still(W, 240);
  const panel = (x0: number, otters: boolean, name: string, says: string) => {
    const rng = makeRng(otters ? 7 : 11);
    const sea = 46;
    const floor = 196;
    const out: SVGElement[] = [
      svg('rect', { x: x0, y: sea, width: 186, height: floor - sea, fill: COL.sea, opacity: 0.18 }),
      svg('rect', { x: x0, y: floor, width: 186, height: 10, fill: COL.rock }),
      line(x0, sea, x0 + 186, sea, COL.sea, 1.4),
      label(x0 + 93, 18, name, { bold: true, anchor: 'middle' }),
      small(x0 + 93, 32, otters ? 'sea otters plentiful' : 'no sea otters', { anchor: 'middle', fill: COL.predator }),
    ];
    if (otters) {
      for (let i = 0; i < 9; i++) out.push(...kelp(x0 + 12 + i * 19 + rng() * 4, floor, sea + 4 + rng() * 14, rng() * 6));
      out.push(...otter(x0 + 40, sea - 1), ...otter(x0 + 130, sea - 1));
      for (let i = 0; i < 3; i++) out.push(...urchin(x0 + 25 + rng() * 140, floor - 3, 2.5));
    } else {
      for (let i = 0; i < 2; i++) out.push(...kelp(x0 + 30 + i * 110, floor, floor - 30, rng() * 6));
      for (let i = 0; i < 22; i++) out.push(...urchin(x0 + 8 + (i % 11) * 16 + rng() * 6, floor - 4 - (i < 11 ? 0 : 7) - rng() * 2, 4.5));
    }
    out.push(...wrapped(x0 + 4, 222, says, 34, { soft: true }));
    return out;
  };
  s.svg.append(
    svg('rect', { width: W, height: 240, fill: COL.paper }),
    ...panel(8, true, 'Amchitka Island', 'Kelp forest; urchins few and small, hiding in cracks.'),
    ...panel(206, false, 'Shemya Island', 'Urchin barren: big urchins crowd bare rock.'),
  );
  return { node: s.node };
};
