// Lesson 20, The caterpillar's menu: what a defence costs and what it saves,
// and a plant group that escapes its eaters with a new poison and spreads into
// many species until a specialist catches up.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, COL, figure, frame, guessFirst, slider, toggles } from './kit';

const W = 400;

// ---- What a defence costs ---------------------------------------------------------------------------

/**
 * A plant's growth (share of what it would make undefended and uneaten) when
 * it puts `defence` (0 to 1) into poison. Each step of defence costs `cost` of
 * its growth, unless defence is `free`; caterpillars at `pressure` eat that
 * share of an undefended plant's leaves, less in proportion to the defence,
 * unless they are `tolerant` of the poison.
 */
export function growth(defence: number, pressure: number, o: { free?: boolean; tolerant?: boolean; cost?: number } = {}): number {
  const cost = o.free ? 0 : (o.cost ?? 0.4);
  const works = o.tolerant ? 0 : 1;
  return (1 - cost * defence) * (1 - pressure * (1 - works * defence));
}

/** The defence (0 to 1, to the nearest hundredth) that grows best. */
export function best(pressure: number, o: { free?: boolean; tolerant?: boolean } = {}): number {
  let at = 0;
  for (let d = 0; d <= 100; d++) if (growth(d / 100, pressure, o) > growth(at / 100, pressure, o) + 1e-12) at = d;
  return at / 100;
}

export const costFigure = figure(['free'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let defence = 0.3;
  let pressure = 0.5;
  let free = false;
  let tolerant = false;
  const paint = () => {
    const shown = open();
    const o = { free, tolerant };
    const a = axes({ x: 50, y: 30, w: 320, h: 150, xmin: 0, xmax: 1, ymin: 0, ymax: 1, xticks: [0, 0.5, 1], xfmt: (v) => (v === 0 ? 'none' : v === 1 ? 'all-out' : 'some'), yticks: [0, 0.5, 1], yfmt: (v) => `${Math.round(v * 100)}%`, xlabel: 'poison made', ylabel: 'growth', ink: COL.ink, grid: COL.grid });
    const pts = Array.from({ length: 51 }, (_, i) => [i / 50, growth(i / 50, pressure, o)] as const);
    const b = best(pressure, o);
    const now = growth(defence, pressure, o);
    redraw(g,
      ...a.parts,
      a.path(pts, COL.leaf, 2.2),
      shown ? svg('circle', { cx: a.X(b), cy: a.Y(growth(b, pressure, o)), r: 6, fill: 'none', stroke: COL.sugar, 'stroke-width': 2 }) : null,
      shown ? small(a.X(b), a.Y(growth(b, pressure, o)) - 10, 'best', { anchor: 'middle', fill: COL.sugar, bold: true }) : null,
      svg('circle', { cx: a.X(defence), cy: a.Y(now), r: 5, fill: COL.hormone }),
      small(370, 22, `${free ? 'Defence free' : 'Defence costs growth'}${tolerant ? '; caterpillars tolerate it' : ''}. A model.`, { anchor: 'end', soft: true }),
      label(54, 214, `This plant grows ${Math.round(now * 100)}% of the most it could`, { fill: COL.hormone }),
    );
    if (!shown) return;
    f.readout.textContent = tolerant
      ? 'Caterpillars that tolerate the poison eat as much of a defended plant as an undefended one, so every bit of poison is cost with no saving. The best a plant can do is drop it, or find a new one.'
      : free
        ? 'If poison cost nothing, more would always be better and every plant would be as poisonous as it could be. That real plants aren’t is the sign that defence costs growth.'
        : b === 0
          ? 'With few caterpillars, poison costs more growth than it saves in leaves: the best plant makes none.'
          : b >= 1
            ? 'With caterpillars everywhere, the leaf saved is worth more than the cost, all the way up.'
            : `The best plant makes some poison but not all it could: past that point, each extra bit costs more growth than the leaf it saves.`;
    if (free) t.done();
  };
  const ds = slider('Poison made', 0, 1, 0.05, defence, (v) => `${Math.round(v * 100)}%`, (v) => { defence = v; paint(); }, 'hormone');
  const ps = slider('Caterpillars', 0, 0.8, 0.05, pressure, (v) => `eat ${Math.round(v * 100)}% of an undefended plant`, (v) => { pressure = v; paint(); }, 'leaf');
  const sw = toggles(['Defence is free', 'Caterpillars tolerate it'], [false, false], (on) => { free = on[0]; tolerant = on[1]; paint(); });
  f.controls.append(ds.node, ps.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'A plant can put more and more of its sugar into a poison that caterpillars avoid. Does the most poisonous plant always grow best?',
    options: ['Yes: the more poison the better', 'No: too much costs more than it saves', 'No: poison never pays'],
    answer: 1,
    reveal: 'done',
    sliders: [ds, ps],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Escape and radiate ------------------------------------------------------------------------------

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

type Branch = { t0: number; t1: number; y: number; kids: Branch[] };

/**
 * A family tree grown over `T` million years: each lineage splits at `fast`
 * per million years until `until`, then at `slow`. Each lineage draws its own
 * random numbers, so what happens before `until` doesn't change with it.
 * Returns the root and the number of species alive at the end.
 */
export function radiate(seed: string, fast: number, slow: number, until: number, T = 60, cap = 60): { root: Branch; tips: number } {
  let tips = 1;
  const grow = (path: string, t0: number): Branch => {
    const rng = makeRng(hash(seed + path));
    let t = t0;
    for (;;) {
      t += -Math.log(1 - rng()) / fast;
      if (t >= T) return { t0, t1: T, y: 0, kids: [] };
      const rate = t < until ? fast : slow;
      if (rng() < rate / fast && tips < cap) {
        tips++;
        return { t0, t1: t, y: 0, kids: [grow(path + '0', t), grow(path + '1', t)] };
      }
    }
  };
  const root = grow('', 0);
  return { root, tips };
}

/** Lay a tree's tips out evenly from `top`, `gap` apart; returns the next free y. */
function place(b: Branch, top: number, gap: number): number {
  if (!b.kids.length) {
    b.y = top;
    return top + gap;
  }
  let y = top;
  for (const k of b.kids) y = place(k, y, gap);
  b.y = (b.kids[0].y + b.kids[1].y) / 2;
  return y;
}

function drawTree(b: Branch, X: (t: number) => number, color: string, out: SVGElement[]): void {
  out.push(line(X(b.t0), b.y, X(b.t1), b.y, color, 1.4));
  if (b.kids.length) {
    out.push(line(X(b.t1), b.kids[0].y, X(b.t1), b.kids[1].y, color, 1.4));
    for (const k of b.kids) drawTree(k, X, color, out);
  }
}

export const SLOW = 0.02;
export const FAST = 0.06;

export const escapeFigure = figure(['radiate'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let when = 30;
  let sawEarly = false;
  let sawLate = false;
  const paint = () => {
    const T = 60;
    const plain = radiate('plain', SLOW, SLOW, 0, T);
    const poison = radiate('mustard', FAST, SLOW, when, T);
    const X = (m: number) => 30 + (m / T) * 300;
    const n = plain.tips + poison.tips;
    const gap = Math.min(14, 168 / n);
    const mid = place(plain.root, 40 + Math.max(0, (168 - n * gap) / 2), gap);
    place(poison.root, mid + 8, gap);
    const parts: SVGElement[] = [];
    drawTree(plain.root, X, COL.soft, parts);
    drawTree(poison.root, X, COL.leaf, parts);
    const yP = plain.root.y;
    const yQ = poison.root.y;
    redraw(g,
      svg('rect', { x: X(when), y: 30, width: X(T) - X(when), height: 186, fill: COL.autumn, opacity: 0.1 }),
      line(X(when), 30, X(when), 216, COL.autumn, 1.2, { 'stroke-dasharray': '4 3' }),
      when < T ? small(when > 40 ? X(when) - 4 : X(when) + 4, 26, 'a specialist caterpillar evolves', { fill: COL.autumn, bold: true, anchor: when > 40 ? 'end' : undefined }) : small(330, 26, 'no specialist evolves', { fill: COL.autumn, bold: true, anchor: 'end' }),
      line(18, yP, 18, yQ, COL.ink, 1.4),
      line(18, yP, 30, yP, COL.ink, 1.4),
      line(18, yQ, 30, yQ, COL.ink, 1.4),
      ...parts,
      small(336, yP + 3, `${plain.tips} species`, { soft: true }),
      small(336, yQ + 3, `${poison.tips} species`, { fill: COL.leaf, bold: true }),
      small(30, 232, 'Grey: no new poison. Green: a new poison.', { soft: true }),
      small(330, 232, 'million years', { anchor: 'end', soft: true }),
      small(30, 246, '0', { anchor: 'middle', soft: true }),
      small(X(T), 246, `${T}`, { anchor: 'middle', soft: true }),
    );
    if (when <= 15) sawEarly = true;
    if (when >= 45) sawLate = true;
    f.readout.textContent = `Two sister groups of plants, one of which happens to make a new poison. Until a caterpillar evolves to eat it, that group loses fewer leaves, spreads into more places and splits into new species faster: ${poison.tips} species after 60 million years against ${plain.tips}. After the specialist arrives it splits no faster than its sister. A model.`;
    if (sawEarly && sawLate) t.done();
  };
  const ws = slider('A specialist evolves after', 5, 60, 5, when, (v) => (v >= 60 ? 'never' : `${v} million years`), (v) => { when = v; paint(); }, 'autumn');
  f.controls.append(ws.node);
  paint();
  return f.node;
});
