// Lesson 5, A drought on Daphne Major: selection on beak depth, and whether
// it passes to the chicks.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { makeRng, type Rng } from 'didactics/rng';
import { axes, button, COL, figure, frame, guessFirst, slider, toggles } from './kit';

const W = 400;

/** A normal draw (Box-Muller). */
const normal = (rng: Rng, mean: number, sd: number) => mean + sd * Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

export const START_MEAN = 9.4;
const SD = 0.75;
const BIRDS = 1200;

/** The chance a finch of beak depth `d` mm lives through a drought year, when only big hard seeds are left. */
export const survives = (d: number) => 0.5 / (1 + Math.exp(-(d - 10) / 0.6));

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/**
 * Chicks from random pairs of `parents`: each chick's beak is the old
 * population mean plus `h2` of its parents' average's lead over it, plus the
 * scatter that heredity doesn't pass on.
 */
export function breed(parents: readonly number[], h2: number, n: number, rng: Rng, base = START_MEAN): number[] {
  if (parents.length < 2) return [];
  return Array.from({ length: n }, () => {
    const a = parents[Math.floor(rng() * parents.length)];
    const b = parents[Math.floor(rng() * parents.length)];
    const mid = (a + b) / 2;
    return normal(rng, base + h2 * (mid - base), SD * Math.sqrt(1 - h2 * h2 / 2));
  });
}

type Stage = 'before' | 'after' | 'chicks';

export const droughtFigure = figure(['shift'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let rng = makeRng(1977);
  let birds = Array.from({ length: BIRDS }, () => normal(rng, START_MEAN, SD));
  let before = birds.slice();
  let stage: Stage = 'before';
  let inherited = true;
  const history: { what: string; mean: number }[] = [{ what: 'before', mean: mean(birds) }];
  const ax = axes({ x: 40, y: 24, w: 340, h: 150, xmin: 7, xmax: 12, ymin: 0, ymax: 250, xticks: [7, 8, 9, 10, 11, 12], yticks: [0, 125, 250], xlabel: 'beak depth, mm', ylabel: 'finches', ink: COL.ink, grid: COL.grid });
  const bins = (xs: readonly number[]) => {
    const out = new Array(25).fill(0);
    for (const x of xs) {
      const k = Math.floor((x - 7) / 0.2);
      if (k >= 0 && k < 25) out[k]++;
    }
    return out;
  };
  const paint = () => {
    const now = bins(birds);
    const ghost = bins(before);
    const scale = birds.length < 400 ? 4 : 1;
    const bars: SVGElement[] = [];
    now.forEach((c, k) => {
      const x = ax.X(7 + k * 0.2);
      const w = ax.X(7.2) - ax.X(7) - 1;
      bars.push(svg('rect', { x, y: ax.Y(Math.min(250, ghost[k])), width: w, height: 174 - ax.Y(Math.min(250, ghost[k])), fill: COL.grid }));
      bars.push(svg('rect', { x, y: ax.Y(Math.min(250, c * scale)), width: w, height: 174 - ax.Y(Math.min(250, c * scale)), fill: stage === 'chicks' ? COL.births : COL.prey, opacity: 0.85 }));
    });
    const m = mean(birds);
    redraw(g,
      ...ax.parts,
      ...bars,
      line(ax.X(START_MEAN), 24, ax.X(START_MEAN), 174, COL.soft, 1.2, { 'stroke-dasharray': '3 3' }),
      line(ax.X(m), 24, ax.X(m), 174, COL.heat, 2),
      label(ax.X(m) + 4, 36, `mean ${m.toFixed(2)} mm`, { fill: COL.heat, bold: true }),
      small(380, 234, scale > 1 ? 'Coloured bars ×4, to show the few.' : '', { anchor: 'end', soft: true }),
      ...history.map((h, i) => note(40 + i * 86, 214, `${h.what}: ${h.mean.toFixed(2)}`, { fill: i === history.length - 1 ? COL.ink : COL.soft })),
      small(40, 234, 'Grey: the population before the drought.', { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = stage === 'before'
      ? `${birds.length} medium ground finches, beaks from about 8 to 11 mm deep. Bring on the drought.`
      : stage === 'after'
        ? `${birds.length} of ${BIRDS} survived. Their beaks average ${m.toFixed(2)} mm, ${(m - START_MEAN).toFixed(2)} mm deeper than before: the birds that could crack caltrop seeds lived. No bird’s beak changed.`
        : inherited
          ? `The chicks’ beaks average ${m.toFixed(2)} mm, ${(m - START_MEAN).toFixed(2)} mm deeper than the population before the drought. The population has changed, because the chicks inherit their parents’ beaks.`
          : `With beak depth not inherited, the chicks average ${m.toFixed(2)} mm, back where the population started. The drought sorted the parents, and it left no mark.`;
    if (stage === 'chicks' && inherited && m - START_MEAN > 0.2) t.done();
  };
  const drought = button('A drought year', () => {
    if (stage !== 'before') return;
    birds = birds.filter((d) => rng() < survives(d));
    stage = 'after';
    history.push({ what: 'survivors', mean: mean(birds) });
    paint();
  });
  const chicks = button('Survivors breed', () => {
    if (stage !== 'after') return;
    birds = breed(birds, inherited ? 0.8 : 0, BIRDS, rng);
    stage = 'chicks';
    history.push({ what: 'chicks', mean: mean(birds) });
    paint();
  });
  const again = button('Start again', () => {
    rng = makeRng(1977 + history.length);
    birds = Array.from({ length: BIRDS }, () => normal(rng, START_MEAN, SD));
    before = birds.slice();
    stage = 'before';
    history.splice(0, history.length, { what: 'before', mean: mean(birds) });
    paint();
  });
  const heredity = toggles(['Beak depth inherited'], [true], (on) => { inherited = on[0]; });
  const row = document.createElement('div');
  row.className = 'chips';
  row.append(drought, chicks, again);
  f.controls.append(row, heredity.node);
  const open = guessFirst(t, f, {
    ask: 'After the drought, the survivors’ beaks are deeper on average than the flock’s were before. Did any finch’s beak grow?',
    options: ['Yes: hungry finches grew deeper beaks', 'No: finches with deep beaks survived'],
    answer: 1,
    sliders: [],
    buttons: [drought, chicks, again, ...heredity.buttons],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Parents and chicks --------------------------------------------------------------

export const heritFigure = figure(['none'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let h2 = 0.8;
  const pairs = (() => {
    const rng = makeRng(83);
    return Array.from({ length: 90 }, () => ({ mid: normal(rng, START_MEAN, SD * 0.75), noise: normal(rng, 0, 1) }));
  })();
  const paint = () => {
    const ax = axes({ x: 50, y: 20, w: 300, h: 180, xmin: 7.5, xmax: 11.5, ymin: 7.5, ymax: 11.5, xticks: [8, 9, 10, 11], yticks: [8, 9, 10, 11], xlabel: 'parents’ average beak depth, mm', ylabel: 'chick’s beak depth, mm', ink: COL.ink, grid: COL.grid });
    const pts = pairs.map((p) => [p.mid, START_MEAN + h2 * (p.mid - START_MEAN) + p.noise * SD * 0.6 * Math.sqrt(1 - h2 * h2 / 2)] as const);
    redraw(g,
      ...ax.parts,
      ...ax.dots(pts, COL.prey, 2.6),
      ax.path([[7.5, START_MEAN + h2 * (7.5 - START_MEAN)], [11.5, START_MEAN + h2 * (11.5 - START_MEAN)]], COL.heat, 2.2),
      small(ax.X(11.5), ax.Y(START_MEAN + h2 * 2.1) - 6, `slope ${h2.toFixed(2)}`, { anchor: 'end', fill: COL.heat }),
    );
    f.readout.textContent = h2 === 0
      ? 'Heritability 0: chicks of deep-beaked parents are no deeper than any others. Selection on the parents would change nothing in the next generation.'
      : h2 >= 0.75
        ? `Heritability ${h2.toFixed(2)}, about what Boag found on Daphne Major: deep-beaked parents have deep-beaked chicks. Selection on parents carries through.`
        : `Heritability ${h2.toFixed(2)}: the line’s slope is the share of the parents’ difference from the average that their chicks inherit.`;
    if (h2 === 0) t.done();
  };
  f.controls.append(slider('Heritability', 0, 1, 0.05, h2, (v) => v.toFixed(2), (v) => { h2 = Math.round(v * 100) / 100; paint(); }, 'heat').node);
  paint();
  return f.node;
});
