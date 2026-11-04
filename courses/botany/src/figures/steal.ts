// Lesson O2, Plants that steal: a dodder seedling sweeping round in circles
// and growing towards the smell of a host.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { button, COL, figure, frame, guessFirst, pick } from './kit';

const W = 400;

export type Host = 'tomato' | 'wheat' | 'none';
/** How strongly a dodder seedling is drawn to each host's smell (0 none). */
const PULL: Record<Host, number> = { tomato: 1, wheat: 0.35, none: 0 };

/**
 * A dodder tip's path over `steps` hours from (0, 0), sweeping in circles and
 * leaning towards whichever host smells strongest: `left` at x = -1, `right`
 * at x = +1. Returns points and which side it reached, if any.
 */
export function seek(left: Host, right: Host, seed: number, steps = 120): { path: [number, number][]; reached: 'left' | 'right' | null } {
  const rng = makeRng(seed);
  let x = 0;
  let y = 0;
  let heading = -Math.PI / 2 + (rng() - 0.5) * 0.6;
  const phase = rng() * Math.PI * 2;
  const spin = rng() < 0.5 ? 1 : -1;
  const path: [number, number][] = [[x, y]];
  for (let k = 0; k < steps; k++) {
    // The smell of each host falls off with distance.
    const pl = PULL[left] / (0.15 + Math.hypot(x + 1, y + 0.2) ** 2);
    const pr = PULL[right] / (0.15 + Math.hypot(x - 1, y + 0.2) ** 2);
    const want = Math.atan2(-0.2 - y, (pr > pl ? 1 : -1) - x);
    const bias = Math.min(0.5, 0.08 * Math.abs(pr - pl));
    let d = want - heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    heading += bias * d + (rng() - 0.5) * 0.9 + 0.25 * spin * Math.sin(k / 3 + phase);
    x += Math.cos(heading) * 0.03;
    y += Math.sin(heading) * 0.03;
    path.push([x, y]);
    if (Math.hypot(x + 1, y + 0.2) < 0.15) return { path, reached: 'left' };
    if (Math.hypot(x - 1, y + 0.2) < 0.15) return { path, reached: 'right' };
  }
  return { path, reached: null };
}

const HOSTS: Host[] = ['tomato', 'wheat', 'none'];
const NAMES = ['A tomato', 'Wheat', 'Nothing'];

export const dodderFigure = figure(['tomato'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let left: Host = 'tomato';
  let right: Host = 'wheat';
  let seed = 1;
  const paint = () => {
    const shown = open();
    const X = (x: number) => 200 + x * 150;
    const Y = (y: number) => 190 + y * 150;
    const parts: SVGElement[] = [];
    const tries = shown ? 5 : 0;
    const results: (string | null)[] = [];
    for (let k = 0; k < tries; k++) {
      const r = seek(left, right, seed * 10 + k);
      results.push(r.reached);
      parts.push(svg('polyline', { points: r.path.map(([x, y]) => `${X(x)},${Y(y)}`).join(' '), fill: 'none', stroke: '#e0a020', 'stroke-width': 1.6, opacity: 0.85 }));
    }
    const plant = (x: number, h: Host) => {
      if (h === 'none') return [small(X(x), Y(-0.2) + 4, 'empty pot', { anchor: 'middle', soft: true })];
      const out: SVGElement[] = [line(X(x), 205, X(x), Y(-0.2) - 30, COL.leaf, 3)];
      if (h === 'tomato') for (const d of [-1, 1]) out.push(svg('ellipse', { cx: X(x) + d * 14, cy: Y(-0.2) - 10, rx: 12, ry: 7, fill: '#6f9a3a' }));
      else for (const d of [-1, 1]) out.push(line(X(x), Y(-0.2) + 10, X(x) + d * 18, Y(-0.2) - 30, '#a8b86a', 2));
      return out;
    };
    redraw(g,
      svg('rect', { x: 0, y: 205, width: W, height: 25, fill: COL.soil, opacity: 0.25 }),
      ...plant(-1, left),
      ...plant(1, right),
      svg('circle', { cx: X(0), cy: Y(0), r: 4, fill: '#e0a020' }),
      small(X(0), 222, 'dodder seedling', { anchor: 'middle', soft: true }),
      label(X(-1), 24, NAMES[HOSTS.indexOf(left)], { anchor: 'middle', bold: true }),
      label(X(1), 24, NAMES[HOSTS.indexOf(right)], { anchor: 'middle', bold: true }),
      ...parts,
    );
    if (!shown) return;
    const l = results.filter((r) => r === 'left').length;
    const r = results.filter((x) => x === 'right').length;
    const towards = left === right ? 'either way' : null;
    f.readout.textContent = towards
      ? 'With the same smell on both sides, the seedlings go either way, or wander.'
      : `Five seedlings: ${l} reached the left, ${r} the right${tries - l - r ? `, ${tries - l - r} still searching` : ''}. Each tip sweeps round in circles, and leans a little each sweep towards the stronger smell. A model.`;
    if (left === 'tomato' && right === 'wheat' && l >= 3) t.done();
  };
  const pl = pick(NAMES.map((n) => `Left: ${n.toLowerCase()}`), 0, (i) => { left = HOSTS[i]; paint(); });
  const pr = pick(NAMES.map((n) => `Right: ${n.toLowerCase()}`), 1, (i) => { right = HOSTS[i]; paint(); });
  const again = button('Five more seedlings', () => { seed += 1; paint(); });
  f.controls.append(pl.node, pr.node, again);
  const open = guessFirst(t, f, {
    ask: 'A dodder seedling, with no leaves and a few days of food, comes up between a tomato and a wheat plant. Which way does it grow?',
    options: ['Towards the tomato', 'Towards the wheat', 'Up, then whatever it touches'],
    answer: 0,
    reveal: 'done',
    sliders: [],
    buttons: [...pl.buttons, ...pr.buttons, again],
    after: () => paint(),
  });
  paint();
  return f.node;
});
