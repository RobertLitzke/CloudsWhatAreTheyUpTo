// Lesson 16, Boulders and fires: Sousa's boulder field and the hump of
// species against disturbance, and a fire regime with and without suppression.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, COL, figure, frame, guessFirst, legend, player, slider, toggles } from './kit';

const W = 400;

/**
 * Seaweeds on a boulder, after Sousa's: each arrives some years after the
 * boulder is flipped clean and is crowded out some years later by better
 * competitors. The last never is. Years, simplified.
 */
export const WEEDS = [
  { name: 'Sea lettuce', arrive: 0.1, gone: 1.5, color: '#a3b36a' },
  { name: 'Red weed A', arrive: 0.5, gone: 3, color: '#c98a8a' },
  { name: 'Red weed B', arrive: 0.8, gone: 4.5, color: '#b4553a' },
  { name: 'Red weed C', arrive: 1.2, gone: 6, color: '#8e3b52' },
  { name: 'Gigartina', arrive: 2, gone: Infinity, color: '#5e2140' },
] as const;

/** The seaweeds' arrival and exclusion times, with or without the trade-off between colonising fast and competing well. */
const weeds = (tradeoff: boolean) => tradeoff
  ? WEEDS
  : WEEDS.map((w, i) => (i === WEEDS.length - 1 ? { ...w, arrive: 0.1 } : i === 0 ? { ...w, gone: 0.3 } : { ...w, gone: w.arrive }));

/**
 * Expected kinds on a boulder flipped `rate` times a year on average. A
 * boulder's age since its last flip is random (exponential with mean 1/rate),
 * and a kind is present while age lies between its arrival and its exclusion:
 * the sum over kinds of e^(−rate·arrive) − e^(−rate·gone).
 */
export function richness(rate: number, tradeoff = true): number {
  return weeds(tradeoff).reduce((n, w) => n + Math.exp(-rate * w.arrive) - (w.gone === Infinity ? 0 : Math.exp(-rate * w.gone)), 0);
}

/** Kinds on a boulder of a given age since it was last flipped. */
export const kindsAt = (age: number, tradeoff = true) => weeds(tradeoff).filter((w) => age >= w.arrive && age < w.gone);

const RATES = Array.from({ length: 61 }, (_, i) => 0.02 * 10 ** (i / 20));

export const bouldersFigure = figure(['hump'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let rate = 0.03;
  let tradeoff = true;
  const tried = new Set<string>();
  const paint = () => {
    // A field of 18 boulders, each flipped at random: ages drawn from the same seed every time.
    const rng = makeRng(1979);
    const boulders = Array.from({ length: 18 }, (_, i) => {
      const age = -Math.log(1 - rng()) / rate;
      const kinds = kindsAt(age, tradeoff);
      const x = 22 + (i % 6) * 36;
      const y = 40 + Math.floor(i / 6) * 58;
      return [
        svg('ellipse', { cx: x, cy: y, rx: 15, ry: 11, fill: COL.rock }),
        ...kinds.map((w, k) => svg('circle', { cx: x - 9 + k * 4.5, cy: y - 3 + (k % 2) * 5, r: 3.4, fill: w.color })),
        small(x, y + 24, String(kinds.length), { anchor: 'middle', soft: true }),
      ];
    }).flat();
    const a = axes({ x: 250, y: 22, w: 140, h: 150, xmin: 0, xmax: 60, ymin: 0, ymax: 4, xticks: [], yticks: [0, 1, 2, 3, 4], ylabel: 'kinds a boulder', ink: COL.ink, grid: COL.grid });
    const xOf = (r: number) => (Math.log10(r / 0.02) / 3) * 60;
    redraw(g,
      ...boulders,
      ...a.parts,
      a.path(RATES.map((r) => [xOf(r), richness(r, tradeoff)]), COL.model, 2.2),
      svg('circle', { cx: a.X(xOf(rate)), cy: a.Y(richness(rate, tradeoff)), r: 4.5, fill: COL.heat }),
      small(250, 186, 'flipped rarely', { soft: true }),
      small(390, 198, 'often', { anchor: 'end', soft: true }),
      ...legend(10, 212, WEEDS.slice(0, 3).map((w) => ({ text: w.name, color: w.color, dot: true }))),
      ...legend(10, 228, WEEDS.slice(3).map((w) => ({ text: w.name, color: w.color, dot: true }))),
      small(392, 228, 'A model', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    const r = richness(rate, tradeoff);
    const best = Math.max(...RATES.map((x) => richness(x, tradeoff)));
    const level = rate < 0.1 ? 'low' : rate > 3 ? 'high' : 'middle';
    tried.add(level);
    f.readout.textContent = !tradeoff
      ? `With the best competitor also the fastest to arrive, it takes every boulder quickly. ${r.toFixed(1)} kinds a boulder; no hump.`
      : level === 'low'
        ? `Boulders flipped once in ${Math.round(1 / rate)} years: Gigartina has crowded out nearly everything. ${r.toFixed(1)} kinds a boulder.`
        : level === 'high'
          ? `Flipped about ${rate.toFixed(0)} times a year: only sea lettuce, the fastest coloniser, gets a hold. ${r.toFixed(1)} kinds a boulder.`
          : `Flipped every ${rate >= 1 ? `${Math.round(12 / rate)} months` : `${Math.round(1 / rate)} years`} or so: boulders of every age, and early and late kinds together. ${r.toFixed(1)} kinds a boulder${r > best - 0.15 ? ', near the most' : ''}.`;
    if (tried.size === 3) t.done();
  };
  const s = slider('How often storms flip a boulder', 0, 3, 0.05, Math.log10(rate / 0.02), (v) => {
    const r = 0.02 * 10 ** v;
    return r < 1 ? `once in ${Math.round(1 / r)} years` : `${r.toFixed(1)} times a year`;
  }, (v) => { rate = 0.02 * 10 ** v; paint(); }, 'sea');
  const sw = toggles(['Remove the trade-off'], [false], (on) => { tradeoff = !on[0]; paint(); });
  f.controls.append(s.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'Small boulders are flipped by nearly every storm; big ones almost never. Which hold the most kinds of seaweed?',
    options: ['The small ones', 'The middling ones', 'The big ones'],
    answer: 1,
    sliders: [s],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Fire ----------------------------------------------------------------------------------

export interface Fires {
  /** Fires put out from year 100 on, unless the fuel is too heavy to stop them. */
  suppress: boolean;
  /** Fuel added each year, in tonnes per hectare. */
  growth: number;
}

export interface Burn { year: number; fuel: number }

/**
 * Two centuries of a dry pine forest. Lightning starts a fire in about one year
 * in eight; a fire burns if there is enough fuel and, from year 100 with
 * suppression, only if it is too heavy to put out. A fire's severity is the
 * fuel it meets. Seeded, so a run is the same each time. A model.
 */
export function fireYears(o: Fires): { fuel: number[]; burns: Burn[] } {
  const rng = makeRng(1910);
  let fuel = 5;
  const fuels: number[] = [];
  const burns: Burn[] = [];
  for (let y = 0; y < 200; y++) {
    const lightning = rng() < 0.125;
    const canBurn = fuel > 4;
    const stopped = o.suppress && y >= 100 && fuel < 40;
    if (lightning && canBurn && !stopped) {
      burns.push({ year: y, fuel });
      fuel = 1;
    }
    fuels.push(fuel);
    fuel += o.growth;
  }
  return { fuel: fuels, burns };
}

/** Fuel above which a fire climbs into the crowns and kills the old trees. */
export const CROWN = 25;

export const fireFigure = figure(['suppress'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const o: Fires = { suppress: false, growth: 1 };
  let year = 0;
  const paint = () => {
    const run = fireYears(o);
    const a = axes({ x: 40, y: 20, w: 346, h: 150, xmin: 0, xmax: 200, ymin: 0, ymax: 60, xticks: [0, 50, 100, 150, 200], yticks: [0, 20, 40, 60], xlabel: 'years', ylabel: 'fuel on the ground, tonnes per hectare', ink: COL.ink, grid: COL.grid });
    const upto = Math.round(year);
    const burns = run.burns.filter((b) => b.year <= upto);
    redraw(g,
      ...a.parts,
      svg('rect', { x: a.X(0), y: a.Y(60), width: a.X(200) - a.X(0), height: a.Y(CROWN) - a.Y(60), fill: COL.heat, opacity: 0.07 }),
      small(a.X(4), a.Y(CROWN) - 4, 'crown fire: the old trees die', { fill: COL.heat }),
      o.suppress ? line(a.X(100), a.Y(0), a.X(100), a.Y(60), COL.ink, 1, { 'stroke-dasharray': '4 3' }) : null,
      o.suppress ? small(a.X(100) + 4, a.Y(56), 'fires put out from here', { soft: true }) : null,
      a.path(run.fuel.slice(0, upto + 1).map((v, i) => [i, v]), COL.soil, 1.8),
      ...burns.map((b) => svg('circle', { cx: a.X(b.year), cy: a.Y(Math.min(60, b.fuel)), r: 2 + Math.sqrt(b.fuel) * 0.9, fill: b.fuel > CROWN ? COL.heat : COL.sun, opacity: 0.85 })),
      ...legend(40, 212, [{ text: 'fuel', color: COL.soil }, { text: 'ground fire', color: COL.sun, dot: true }, { text: 'crown fire', color: COL.heat, dot: true }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    const before = run.burns.filter((b) => b.year < 100 && b.year <= upto);
    const after = run.burns.filter((b) => b.year >= 100 && b.year <= upto);
    const big = after.filter((b) => b.fuel > CROWN).length;
    f.readout.textContent = upto < 100
      ? `Year ${upto}: ${before.length} fires so far, each small, every ${before.length ? Math.round(upto / before.length) : '?'} years or so. Fuel never builds up far.`
      : `Year ${upto}: since year 100, ${after.length} fire${after.length === 1 ? '' : 's'}${o.suppress ? `, against ${run.burns.filter((b) => b.year < 100).length} in the first century` : ''}; ${big} of them crown fire${big === 1 ? '' : 's'}. ${o.suppress ? 'Putting fires out lets fuel pile up until one can’t be stopped.' : 'Frequent small fires keep the fuel down.'}`;
    if (o.suppress && upto >= 190) t.done();
  };
  const ys = slider('Year', 0, 199, 1, 0, (v) => String(v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 12 });
  const sw = toggles(['Put out every fire you can, from year 100'], [false], (on) => { o.suppress = on[0]; paint(); });
  f.controls.append(play.node, ys.node, sw.node);
  paint();
  return f.node;
});
