// Lesson 7, The yeast that wastes its sugar: yeast and a bacterium sharing a
// flask of sugar, with the yeast either respiring its sugar fully or
// fermenting it to alcohol; and a still of budding cells.

import { svg } from 'didactics/dom';
import { redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, legend, pick, player, slider, toggles, wrapped } from './kit';

const W = 400;

export interface Flask { yeast: number; bacteria: number; sugar: number; alcohol: number }

/**
 * A flask that starts with `sugar` units of sugar, a little yeast and a little
 * bacterium, run hour by hour for `hours`. A fermenting yeast takes sugar
 * three times as fast as it could respire it but gets a fraction of the
 * growth from each unit, and turns the rest to alcohol. Alcohol slows the
 * bacterium far more than the yeast. With oxygen, once the sugar is gone, the
 * yeast respires the alcohol it made.
 */
export function flask(ferment: boolean, oxygen: boolean, sugar0: number, hours: number): Flask[] {
  let y = 1;
  let b = 1;
  let s = sugar0;
  let a = 0;
  const out: Flask[] = [{ yeast: y, bacteria: b, sugar: s, alcohol: a }];
  for (let h = 1; h <= hours; h++) {
    for (let k = 0; k < 10; k++) {
      const dt = 0.1;
      const sat = s / (s + 5);
      // Uptake per unit of yeast, and growth per unit of sugar taken.
      const yUp = (ferment || !oxygen ? 0.6 : 0.2) * sat;
      const yYield = ferment || !oxygen ? 0.12 : 0.5;
      const bUp = 0.35 * sat * Math.max(0, 1 - a / 6);
      const yPoison = Math.max(0, 1 - a / 90);
      let dy = y * yUp * yYield * yPoison;
      const db = b * bUp * 0.5 - b * 0.02 * (a / 4);
      let ds = -(y * yUp + b * bUp);
      let da = ferment || !oxygen ? y * yUp * 0.45 : 0;
      // With oxygen and no sugar left, the yeast lives on its alcohol.
      if (oxygen && s < 1 && a > 0) {
        const eat = Math.min(a, y * 0.05 * (a / (a + 2)));
        da -= eat;
        dy += eat * 0.25;
      }
      if (-ds * dt > s) ds = -s / dt;
      y += dy * dt;
      b = Math.max(0.01, b + db * dt);
      s = Math.max(0, s + ds * dt);
      a = Math.max(0, a + da * dt);
    }
    out.push({ yeast: y, bacteria: b, sugar: s, alcohol: a });
  }
  return out;
}

const HOURS = 72;

export const flaskFigure = figure(['ferment'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let ferment = true;
  let oxygen = true;
  let hour = HOURS;
  let sawRespire = false;
  const sugar0 = 100;
  const paint = () => {
    const run = flask(ferment, oxygen, sugar0, HOURS);
    const ax = axes({ x: 40, y: 22, w: 340, h: 150, xmin: 0, xmax: HOURS, ymin: 0, ymax: 100, xticks: [0, 24, 48, 72], yticks: [0, 50, 100], xlabel: 'hours', ylabel: 'amount (sugar, alcohol) or numbers (cells)', ink: COL.ink, grid: COL.grid });
    const upto = run.slice(0, hour + 1);
    const cells = (v: number) => Math.min(100, v * 2);
    const now = run[hour];
    redraw(g,
      ...ax.parts,
      ax.path(upto.map((p, i) => [i, p.sugar]), COL.food, 2),
      ax.path(upto.map((p, i) => [i, p.alcohol * 2]), COL.toxin, 2, { 'stroke-dasharray': '4 3' }),
      ax.path(upto.map((p, i) => [i, cells(p.yeast)]), COL.cap, 2.5),
      ax.path(upto.map((p, i) => [i, cells(p.bacteria)]), COL.matB, 2.5),
      ...legend(40, 208, [
        { text: 'sugar', color: COL.food },
        { text: 'alcohol', color: COL.toxin, dash: true },
        { text: 'yeast', color: COL.cap },
        { text: 'bacteria', color: COL.matB },
      ]),
    );
    const winner = now.yeast > now.bacteria * 1.5 ? 'yeast' : now.bacteria > now.yeast * 1.5 ? 'bacteria' : 'neither';
    if (!ferment) sawRespire = true;
    f.readout.textContent = hour < 6
      ? 'A flask of sugar water with a little yeast and a little of a bacterium that also eats sugar.'
      : ferment
        ? `Fermenting, the yeast gulps sugar three times as fast as it could burn it, wasting most of the energy as alcohol. The alcohol stops the bacterium. ${oxygen ? 'With the sugar gone, the yeast turns to the alcohol and burns that.' : 'Without oxygen, the alcohol just stays.'}`
        : `Burning its sugar fully, the yeast gets the most growth from each unit, but slowly, and the bacterium takes a share. By hour ${hour} ${winner === 'yeast' ? 'the yeast leads' : winner === 'bacteria' ? 'the bacterium has the most of the flask' : 'they have split the flask'}.`;
    if (sawRespire && ferment && hour >= 48) t.done();
  };
  const hs = slider('Hours', 0, HOURS, 1, hour, (v) => `${v}`, (v) => { hour = v; paint(); }, 'cap');
  const play = player(hs, ctx, { seconds: 8 });
  const way = pick(['Ferment to alcohol', 'Burn sugar fully'], 0, (i) => { ferment = i === 0; paint(); });
  const ox = toggles(['Air in the flask'], [true], (v) => { oxygen = v[0]; paint(); });
  f.controls.append(way.node, ox.node, play.node, hs.node);
  paint();
  return f.node;
});

// ---- Budding (still) ------------------------------------------------------------------------------

export const buddingStill = () => {
  const s = still(W, 150);
  const parts: SVGElement[] = [];
  const cell = (x: number, y: number, r: number, scars = 0) => {
    parts.push(svg('ellipse', { cx: x, cy: y, rx: r, ry: r * 0.86, fill: '#f3ead6', stroke: COL.cap, 'stroke-width': 1.5 }));
    for (let i = 0; i < scars; i++) parts.push(svg('circle', { cx: x - r * 0.5 + i * 6, cy: y - r * 0.5, r: 2, fill: 'none', stroke: COL.soft, 'stroke-width': 1 }));
  };
  cell(50, 76, 22);
  cell(150, 76, 22); cell(176, 62, 9);
  cell(260, 76, 22, 1); cell(284, 56, 15);
  cell(350, 82, 22, 2); cell(366, 50, 6); cell(374, 112, 10);
  parts.push(
    small(50, 128, 'a yeast cell', { anchor: 'middle' }),
    small(160, 128, 'a bud swells', { anchor: 'middle' }),
    small(270, 128, 'it pinches off', { anchor: 'middle' }),
    small(354, 138, 'a scar is left', { anchor: 'middle' }),
    ...wrapped(14, 18, 'Each cell is about 5 thousandths of a millimetre across; it can bud 20 or so times.', 70, { soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};
