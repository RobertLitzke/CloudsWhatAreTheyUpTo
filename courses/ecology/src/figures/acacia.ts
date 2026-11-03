// Lesson 9, The ants that guard a tree: a young acacia with and without its
// ants over a year, and the trade between them with cheaters in it.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, COL, figure, frame, guessFirst, legend, player, slider, toggles } from './kit';

const W = 400;

/** A young acacia's leaf (0 to 1, of a full crown) and the vines over it (0 to 1, of its height), month by month. */
export function acacia(ants: boolean, months = 12): { leaf: number; vines: number }[] {
  let leaf = 0.3;
  let vines = 0.05;
  const out = [{ leaf, vines }];
  for (let m = 1; m <= months; m++) {
    const grow = 0.16 * leaf * (1 - vines) * (1 - leaf);
    const eaten = (ants ? 0.01 : 0.2) * leaf;
    const fee = ants ? 0.02 * leaf : 0;
    leaf = Math.max(0.02, leaf + grow - eaten - fee);
    // Ants bite off any vine or seedling touching the tree; without them, vines climb and shade it.
    vines = ants ? vines * 0.4 : Math.min(1, vines + 0.4 * vines * (1 - vines));
    out.push({ leaf, vines });
  }
  return out;
}

export const guardsFigure = figure(['eaten'], (ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let ants = true;
  let month = 0;
  const paint = () => {
    const run = acacia(ants)[month];
    const other = acacia(!ants);
    const rng = makeRng(1966);
    const base = 214;
    const top = 70;
    const cx = 100;
    // The tree: a trunk and six branch pairs; leaves on each in proportion to `leaf`.
    const parts: (SVGElement | null)[] = [
      line(20, base, 190, base, COL.soil, 2),
      line(cx, base, cx, top, '#7a5a3a', 4),
    ];
    for (let b = 0; b < 6; b++) {
      const y = base - 30 - b * 22;
      const reach = 54 - b * 6;
      for (const side of [-1, 1]) {
        parts.push(line(cx, y, cx + side * reach, y - 10, '#7a5a3a', 2));
        // Paired thorns, where the ants live.
        parts.push(svg('path', { d: `M${cx + side * reach * 0.5},${y - 5} l${side * 4},-8 M${cx + side * reach * 0.5},${y - 5} l${side * -2},-9`, stroke: '#e8dcc0', 'stroke-width': 2, fill: 'none' }));
        for (let k = 0; k < 6; k++) {
          const there = rng() < run.leaf * 1.2;
          if (!there) continue;
          const lx = cx + side * reach * (0.3 + k * 0.12);
          const ly = y - 10 * (0.3 + k * 0.12) - 4;
          const chewed = !ants && rng() < 0.5;
          parts.push(svg('ellipse', { cx: lx, cy: ly, rx: 5, ry: 2.4, fill: chewed ? '#a3b36a' : COL.plant, opacity: chewed ? 0.7 : 1 }));
        }
      }
      if (ants) for (let a = 0; a < 2; a++) parts.push(svg('circle', { cx: cx + (rng() - 0.5) * reach * 1.6, cy: y - 6, r: 1.8, fill: '#8a3f17' }));
    }
    // Vines from the ground, climbing to `vines` of the height.
    const vineTop = base - run.vines * (base - top + 20);
    for (const vx of [30, 168]) {
      const pts: string[] = [];
      for (let y = base; y >= vineTop; y -= 4) pts.push(`${(vx + Math.sin(y / 9) * 6 + ((base - y) / (base - top)) * (cx - vx) * 0.55).toFixed(1)},${y}`);
      if (pts.length > 1) parts.push(svg('polyline', { points: pts.join(' '), stroke: '#6f9a3a', 'stroke-width': 2.4, fill: 'none' }));
    }
    const ax = axes({ x: 236, y: 30, w: 150, h: 150, xmin: 0, xmax: 12, ymin: 0, ymax: 1, xticks: [0, 6, 12], yticks: [0, 0.5, 1], yfmt: (v) => `${Math.round(v * 100)}%`, xlabel: 'months', ylabel: 'leaf on the tree', ink: COL.ink, grid: COL.grid });
    const mine = acacia(ants).slice(0, month + 1).map((s, i) => [i, s.leaf] as const);
    redraw(g,
      ...parts,
      label(20, 20, ants ? 'Ants in the thorns' : 'Ants removed', { bold: true, fill: ants ? '#8a3f17' : COL.bad }),
      small(20, 232, `Month ${month}`, { soft: true }),
      ...ax.parts,
      ax.path(other.map((s, i) => [i, s.leaf] as const), COL.soft, 1.4, { 'stroke-dasharray': '4 3' }),
      ax.path(mine, ants ? COL.plant : COL.bad, 2.4),
      ...legend(236, 224, [{ text: ants ? 'with ants' : 'without ants', color: ants ? COL.plant : COL.bad }, { text: ants ? 'without' : 'with', color: COL.soft, dash: true }]),
    );
    if (!open()) return;
    f.readout.textContent = month === 0
      ? `A young acacia${ants ? ' with its ant colony' : ' with its ants taken away'}. Press Play.`
      : ants
        ? `Month ${month}: the ants sting anything that lands to feed and bite off vines that touch the tree. It keeps ${Math.round(run.leaf * 100)}% of a full crown and grows.`
        : `Month ${month}: insects and browsers strip the leaves and vines climb over it. It has ${Math.round(run.leaf * 100)}% of a crown left${run.vines > 0.5 ? ', shaded by the vines' : ''}.`;
    if (!ants && month >= 10) t.done();
  };
  const months = slider('Month', 0, 12, 1, 0, (v) => `${v}`, (v) => { month = v; paint(); }, 'plant');
  const play = player(months, ctx, { seconds: 8 });
  const sw = toggles(['Take the ants away'], [false], (on) => { ants = !on[0]; months.set(0); });
  f.controls.append(sw.node, play.node, months.node);
  const open = guessFirst(t, f, {
    ask: 'The ants eat the tree’s nectar and food bodies. Take them away and the tree saves that food. A year later, how is it doing?',
    options: ['Better: it saved the food', 'About the same', 'Much worse'],
    answer: 2,
    reveal: 'done',
    sliders: [months],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The trade, and cheaters ------------------------------------------------------------------

/** The tree's growth (1 = unharmed and paying nothing) when it spends `reward` of its growth on ants and `cheaters` of the colonies take food without guarding. */
export function treeGrowth(reward: number, cheaters: number): number {
  const guard = (1 - cheaters) * (1 - Math.exp(-reward / 0.05));
  return Math.max(0, 1 - 2.5 * reward) * (1 - 0.7 * (1 - guard));
}

/** The best reward for the tree, and how much better than paying nothing it does there. */
export function bestReward(cheaters: number): { reward: number; gain: number } {
  let best = { reward: 0, gain: 0 };
  for (let r = 0; r <= 0.3; r += 0.0025) {
    const gain = treeGrowth(r, cheaters) - treeGrowth(0, cheaters);
    if (gain > best.gain) best = { reward: r, gain };
  }
  return best;
}

export const tradeFigure = figure(['cheat'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let reward = 0.08;
  let cheaters = 0;
  const paint = () => {
    const ax = axes({ x: 46, y: 18, w: 330, h: 160, xmin: 0, xmax: 0.3, ymin: 0, ymax: 1, xticks: [0, 0.1, 0.2, 0.3], yticks: [0, 0.5, 1], xfmt: (v) => `${Math.round(v * 100)}%`, yfmt: (v) => `${Math.round(v * 100)}%`, xlabel: 'share of its growth the tree spends feeding ants', ylabel: 'tree’s growth', ink: COL.ink, grid: COL.grid });
    const curve = Array.from({ length: 121 }, (_, i) => [i * 0.0025, treeGrowth(i * 0.0025, cheaters)] as const);
    const best = bestReward(cheaters);
    const here = treeGrowth(reward, cheaters);
    redraw(g,
      ...ax.parts,
      line(ax.X(0), ax.Y(treeGrowth(0, cheaters)), ax.X(0.3), ax.Y(treeGrowth(0, cheaters)), COL.soft, 1, { 'stroke-dasharray': '4 3' }),
      small(ax.X(0.3), ax.Y(treeGrowth(0, cheaters)) - 5, 'paying nothing', { anchor: 'end', soft: true }),
      ax.path(curve, COL.plant, 2.4),
      svg('circle', { cx: ax.X(best.reward), cy: ax.Y(treeGrowth(best.reward, cheaters)), r: 4, fill: 'none', stroke: COL.ink, 'stroke-width': 1.4 }),
      svg('circle', { cx: ax.X(reward), cy: ax.Y(here), r: 4.5, fill: '#8a3f17' }),
      label(ax.X(reward) + 8, ax.Y(here) - 8, `${Math.round(here * 100)}%`, { bold: true, fill: '#8a3f17' }),
      ...legend(46, 234, [{ text: 'the tree’s pay', color: '#8a3f17', dot: true }, { text: 'its best pay', color: COL.ink, dot: true }]),
    );
    const worth = best.gain >= 0.05;
    f.readout.textContent = !worth
      ? `With ${Math.round(cheaters * 100)}% of colonies cheating, feeding ants barely pays: a tree that paid nothing would do almost as well. Trees that stopped paying would lose little, and the partnership could fall apart.`
      : reward < 0.02
        ? 'Paying almost nothing: no ants move in, and the tree is eaten.'
        : reward > best.reward + 0.06
          ? `Paying ${Math.round(reward * 100)}%: the ants guard well, but the tree is paying more than the protection is worth.`
          : `Paying ${Math.round(reward * 100)}% of its growth${cheaters > 0 ? `, with ${Math.round(cheaters * 100)}% of colonies cheating` : ''}, the tree grows ${Math.round(here * 100)}% as well as an untouched tree, against ${Math.round(treeGrowth(0, cheaters) * 100)}% paying nothing.`;
    if (!worth) t.done();
  };
  const r = slider('Tree’s pay to the ants', 0, 0.3, 0.01, reward, (v) => `${Math.round(v * 100)}% of growth`, (v) => { reward = v; paint(); }, 'prey');
  const c = slider('Cheating colonies', 0, 1, 0.05, cheaters, (v) => `${Math.round(v * 100)}%`, (v) => { cheaters = v; paint(); }, 'bad');
  f.controls.append(r.node, c.node);
  paint();
  return f.node;
});
