// Branch T2, The year the sea stars melted: what the shore and the seafloor
// do when the ochre star and the sunflower star are lost, and when the sea
// warms as well.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, toggles } from './kit';

const W = 400;

export interface Stars {
  ochre: boolean;
  sunflower: boolean;
  /** The warm years of 2014 to 2016, when kelp grew poorly. */
  warm: boolean;
}

export const START = 2010;
export const END = 2022;
/** Stars that die, die in this year. */
export const WASTING = 2013;

/**
 * Month by month from 2010: mussel cover on a shore patch (%), urchins on the
 * seafloor (per square metre) and kelp canopy (% of its old extent). Ochre
 * stars eat mussels; sunflower stars eat urchins; urchins eat kelp. A model.
 */
export function coast(o: Stars): { mussels: number[]; urchins: number[]; kelp: number[] } {
  let mussels = 68;
  let urchins = 2;
  let kelp = 100;
  const out = { mussels: [mussels], urchins: [urchins], kelp: [kelp] };
  const dt = 1 / 12;
  for (let m = 1; m <= (END - START) * 12; m++) {
    const year = START + m / 12;
    const ochre = o.ochre || year < WASTING;
    const sunflower = o.sunflower || year < WASTING;
    const warm = o.warm && year >= 2014 && year < 2017;
    mussels += dt * (0.25 * mussels * (1 - mussels / 100) - (ochre ? 0.2 * mussels * 0.4 : 0));
    urchins += dt * (0.6 * urchins * (1 - urchins / 60) - (sunflower ? 0.45 * urchins : 0) + 0.3);
    kelp += dt * ((warm ? 0.3 : 1.2) * kelp * (1 - kelp / 100) - 0.025 * urchins * kelp);
    kelp = Math.max(0.5, kelp);
    out.mussels.push(mussels);
    out.urchins.push(urchins);
    out.kelp.push(kelp);
  }
  return out;
}

export const meltedFigure = figure(['kelp'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const o: Stars = { ochre: true, sunflower: true, warm: false };
  const paint = () => {
    const run = coast(o);
    const a = axes({ x: 40, y: 20, w: 346, h: 150, xmin: START, xmax: END, ymin: 0, ymax: 100, xticks: [2010, 2013, 2016, 2019, 2022], yticks: [0, 50, 100], xlabel: 'year', ylabel: 'kelp and mussels, %; urchins per m²', ink: COL.ink, grid: COL.grid });
    const at = (arr: number[], k = 1) => arr.map((v, i) => [START + i / 12, v * k] as [number, number]);
    redraw(g,
      ...a.parts,
      !o.ochre || !o.sunflower ? line(a.X(WASTING), a.Y(0), a.X(WASTING), a.Y(100), COL.heat, 1, { 'stroke-dasharray': '2 3' }) : null,
      !o.ochre || !o.sunflower ? small(a.X(WASTING) + 4, a.Y(94), 'wasting', { fill: COL.heat }) : null,
      o.warm ? svg('rect', { x: a.X(2014), y: a.Y(100), width: a.X(2017) - a.X(2014), height: a.Y(0) - a.Y(100), fill: COL.heat, opacity: 0.07 }) : null,
      a.path(at(run.kelp), COL.plant, 2.4),
      a.path(at(run.urchins), COL.rose, 2),
      a.path(at(run.mussels), COL.rival, 1.6, { 'stroke-dasharray': '5 3' }),
      ...legend(40, 212, [{ text: 'kelp canopy', color: COL.plant }, { text: 'urchins', color: COL.rose }, { text: 'mussel cover', color: COL.rival, dash: true }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    const n = run.kelp.length - 1;
    const kelp = run.kelp[n];
    f.readout.textContent = `By ${END}: kelp at ${Math.round(kelp)}% of its old canopy, ${Math.round(run.urchins[n])} urchins per square metre, mussels over ${Math.round(run.mussels[n])}% of the shore patch. ${!o.sunflower ? 'With no sunflower stars, urchins multiply and graze the kelp away.' : o.warm ? 'The warm years thin the kelp, but the urchins are kept in check and it grows back.' : 'The sunflower stars keep the urchins few.'}${!o.ochre ? ' Without ochre stars, mussels spread over the shore.' : ''}`;
    if (!o.sunflower && kelp < 20) t.done();
  };
  const sw = toggles(['Ochre stars survive', 'Sunflower stars survive', 'Warm years 2014 to 2016'], [true, true, false], (on) => { o.ochre = on[0]; o.sunflower = on[1]; o.warm = on[2]; paint(); });
  f.controls.append(sw.node);
  const open = guessFirst(t, f, {
    ask: 'From 2013, sunflower stars, fast hunters of sea urchins, died from Mexico to Alaska. What happened to the kelp forests where they had hunted?',
    options: ['The kelp grew thicker', 'Little changed', 'Urchins multiplied and ate the kelp'],
    answer: 2,
    sliders: [],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
