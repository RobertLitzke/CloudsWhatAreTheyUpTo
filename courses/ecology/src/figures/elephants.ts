// Lesson 2, Why aren't we knee-deep in elephants?: Darwin's elephant sum,
// stock and flow, the brake on growth, and mark and recapture.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, big, button, COL, count, figure, frame, guessFirst, legend, pick, player, sig, slider } from './kit';

const W = 400;

// ---- Darwin's elephants ----------------------------------------------------------------

/**
 * Elephants descended from one pair, year by year: females by age, each
 * having `young` calves (half of them female) spread evenly from `first` to
 * age 90, and every elephant living to 100. Counts both sexes.
 */
export function elephants(first: number, young: number, years: number): number[] {
  const life = 100;
  const last = 90;
  const f = new Array<number>(life).fill(0);
  f[30] = 1;
  const ages = Array.from({ length: young }, (_, i) => Math.round(first + (i * (last - first)) / Math.max(1, young - 1)));
  const out: number[] = [];
  for (let t = 0; t <= years; t++) {
    out.push(2 * f.reduce((a, b) => a + b, 0));
    let born = 0;
    for (const a of ages) born += f[a] * 0.5;
    for (let k = life - 1; k > 0; k--) f[k] = f[k - 1];
    f[0] = born;
  }
  return out;
}

export const darwinFigure = figure(['run'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let first = 30;
  let young = 6;
  let year = 0;
  let logScale = false;
  const paint = () => {
    const runs = elephants(first, young, 750);
    const now = runs[year];
    const top = Math.max(10, ...runs.slice(0, year + 1));
    const ymax = logScale ? 1e12 : 10 ** Math.ceil(Math.log10(top * 1.05));
    const ax = axes({
      x: 52, y: 26, w: 326, h: 180, xmin: 0, xmax: 750, ymin: logScale ? 1 : 0, ymax, ylog: logScale,
      xticks: [0, 250, 500, 750], yticks: logScale ? [1, 1e3, 1e6, 1e9, 1e12] : [0, ymax / 2, ymax],
      yfmt: (v) => (v >= 1e6 ? `${sig(v / 1e6)}M` : big(v)), xlabel: 'years after the first pair', ylabel: 'elephants alive', ink: COL.ink, grid: COL.grid,
    });
    const pts = runs.slice(0, year + 1).map((v, i) => [i, v] as const);
    redraw(g, ...ax.parts, ax.path(pts, COL.prey, 2.4), svg('circle', { cx: ax.X(year), cy: ax.Y(Math.max(logScale ? 1 : 0, now)), r: 4, fill: COL.prey }),
      label(ax.X(year) > 300 ? ax.X(year) - 8 : ax.X(year) + 8, Math.max(40, ax.Y(now) - 8), count(now), { bold: true, anchor: ax.X(year) > 300 ? 'end' : undefined }));
    if (!open()) return;
    const back = Math.min(year, 100);
    const ratio = back ? runs[year] / runs[year - back] : 1;
    const doubling = ratio > 1.0001 ? (back * Math.LN2) / Math.log(ratio) : Infinity;
    f.readout.textContent = year === 0
      ? 'One pair. Press Play, or drag the years.'
      : young <= 2
        ? `Year ${year}: ${count(now)} elephants. With two young each, every elephant just replaces itself and the herd stays the same.`
        : `Year ${year}: ${count(now)} elephants. ${doubling < 1000 ? `The herd now doubles about every ${Math.round(doubling)} years, whatever its size.` : ''}`;
    if (year >= 750) t.done();
  };
  const years = slider('Year', 0, 750, 5, 0, (v) => `${v}`, (v) => { year = v; paint(); }, 'prey');
  const play = player(years, ctx, { seconds: 10 });
  const age = slider('First calf at age', 10, 40, 1, first, (v) => `${v}`, (v) => { first = v; paint(); }, 'births');
  const calves = slider('Calves per female', 2, 12, 1, young, (v) => `${v}`, (v) => { young = v; paint(); }, 'births');
  const scale = pick(['Ordinary scale', 'Scale of tens'], 0, (i) => { logScale = i === 1; paint(); });
  f.controls.append(play.node, years.node, age.node, calves.node, scale.node);
  const open = guessFirst(t, f, {
    ask: 'Darwin’s elephants: each female has six calves between thirty and ninety, and lives to a hundred. After 750 years, about how many elephants come from one pair?',
    options: ['A few hundred', 'A few thousand', 'Millions'],
    answer: 2,
    reveal: 'done',
    sliders: [years, age, calves],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Stock and flow: a bathtub ---------------------------------------------------------

export const bathtubFigure = figure(['steady'], (ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let tied = false;
  let inflow = 30;
  let outflow = 20;
  let year = 0;
  const START = 100;
  /** The level each year: fixed taps add the same each year; tied taps a share of what is there. */
  const levels = () => {
    const out = [START];
    let n = START;
    for (let y = 1; y <= 50; y++) {
      n = tied ? n * (1 + (inflow - outflow) / 100) : n + inflow - outflow;
      n = Math.max(0, n);
      out.push(n);
    }
    return out;
  };
  const paint = () => {
    const lv = levels();
    const now = lv[year];
    const ax = axes({ x: 186, y: 22, w: 196, h: 170, xmin: 0, xmax: 50, ymin: 0, ymax: 1000, xticks: [0, 25, 50], yticks: [0, 500, 1000], xlabel: 'years', ylabel: 'animals', ink: COL.ink, grid: COL.grid });
    // The tank.
    const tx = 30;
    const ty = 40;
    const tw = 110;
    const th = 150;
    const fill = Math.min(1, now / 1000) * th;
    const inW = tied ? (inflow / 100) * now : inflow;
    const outW = tied ? (outflow / 100) * now : outflow;
    redraw(g,
      svg('rect', { x: tx, y: ty + th - fill, width: tw, height: fill, fill: COL.water, opacity: 0.55 }),
      svg('path', { d: `M${tx},${ty} V${ty + th} H${tx + tw} V${ty}`, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }),
      // Inflow tap at top left, outflow at bottom right; their widths show the flow.
      line(tx - 10, ty - 14, tx + 30, ty - 14, COL.ink, 4),
      line(tx + 28, ty - 12, tx + 28, ty + th - fill, COL.births, Math.max(0.5, Math.min(14, inW / 6))),
      small(tx - 10, ty - 22, `births: ${sig(inW, 2)} a year`, { fill: COL.births }),
      line(tx + tw, ty + th - 8, tx + tw + 24, ty + th - 8, COL.deaths, Math.max(0.5, Math.min(14, outW / 6))),
      small(tx + tw - 40, ty + th + 16, `deaths: ${sig(outW, 2)} a year`, { fill: COL.deaths }),
      label(tx + tw / 2, ty + th - fill - 6, big(now), { anchor: 'middle', bold: true }),
      ...ax.parts,
      ax.path(lv.slice(0, year + 1).map((v, i) => [i, v] as const), COL.water, 2.4),
    );
    const net = inW - outW;
    f.readout.textContent = year === 0
      ? (tied ? 'Now the taps are tied to the level: births and deaths are a share of the animals there. Press Play.' : 'Births flow in at the top, deaths drain out at the bottom. Press Play.')
      : `Year ${year}: ${big(now)} animals. ${Math.abs(net) < 0.01 * Math.max(1, now) ? 'In equals out, so the level holds.' : net > 0 ? `More flows in than out, so the level rises${tied ? ', and faster as it rises: compounding.' : ' by the same amount each year.'}` : 'More drains out than flows in, so the level falls.'}`;
    if (tied && year >= 50 && Math.abs(lv[50] - START) < 5) t.done();
  };
  const years = slider('Year', 0, 50, 1, 0, (v) => `${v}`, (v) => { year = v; paint(); }, 'water');
  const play = player(years, ctx, { seconds: 6 });
  const unit = () => (tied ? '% a year' : ' a year');
  const ins = slider('Births', 0, 40, 1, inflow, (v) => `${v}${unit()}`, (v) => { inflow = v; paint(); }, 'births');
  const outs = slider('Deaths', 0, 40, 1, outflow, (v) => `${v}${unit()}`, (v) => { outflow = v; paint(); }, 'deaths');
  const mode = pick(['Taps fixed', 'Taps tied to the level'], 0, (i) => {
    tied = i === 1;
    ins.set(inflow);
    outs.set(outflow);
    years.set(0);
  });
  f.controls.append(mode.node, play.node, years.node, ins.node, outs.node);
  paint();
  return f.node;
});

// ---- The brake: Carlson's yeast --------------------------------------------------------

/** Carlson's yeast in a flask of wort (1913), hour by hour, as Pearl reprinted it: amount of yeast. */
export const CARLSON = [9.6, 18.3, 29.0, 47.2, 71.1, 119.1, 174.6, 257.3, 350.7, 441.0, 513.3, 559.7, 594.8, 629.4, 640.8, 651.1, 655.9, 659.6, 661.8];

/** The logistic curve from n0: growth r per hour when uncrowded, ceiling k. */
export const logistic = (r: number, k: number, n0: number, h: number) => k / (1 + ((k - n0) / n0) * Math.exp(-r * h));

export const brakeFigure = figure(['fit'], (_ctx, t) => {
  const f = frame(W, 270, 3);
  const g = svg('g');
  f.svg.append(g);
  let r = 0.8;
  let k = 900;
  let brake = true;
  const paint = () => {
    const flow = axes({ x: 44, y: 24, w: 130, h: 160, xmin: 0, xmax: 1000, ymin: -60, ymax: 220, xticks: [0, 500, 1000], yticks: [0, 100, 200], xlabel: 'yeast now', ylabel: 'growth an hour', ink: COL.ink, grid: COL.grid });
    const time = axes({ x: 236, y: 24, w: 146, h: 160, xmin: 0, xmax: 18, ymin: 0, ymax: 1000, xticks: [0, 6, 12, 18], yticks: [0, 500, 1000], xlabel: 'hours', ylabel: 'yeast', ink: COL.ink, grid: COL.grid });
    const net = (n: number) => (brake ? r * n * (1 - n / k) : r * n);
    const curve = Array.from({ length: 101 }, (_, i) => [i * 10, net(i * 10)] as const);
    const run = Array.from({ length: 73 }, (_, i) => [i / 4, brake ? logistic(r, k, CARLSON[0], i / 4) : CARLSON[0] * Math.exp((r * i) / 4)] as const);
    const data = CARLSON.map((v, h) => [h, v] as const);
    const err = Math.sqrt(CARLSON.reduce((s, v, h) => s + (v - (brake ? logistic(r, k, CARLSON[0], h) : CARLSON[0] * Math.exp(r * h))) ** 2, 0) / CARLSON.length);
    redraw(g,
      ...flow.parts,
      line(flow.X(0), flow.Y(0), flow.X(1000), flow.Y(0), COL.soft, 1),
      flow.path(curve, COL.births, 2.4),
      brake ? svg('circle', { cx: flow.X(k), cy: flow.Y(0), r: 4, fill: COL.deaths }) : null,
      brake ? small(Math.min(flow.X(k), 160), flow.Y(0) - 8, 'ceiling', { anchor: 'end', fill: COL.deaths }) : null,
      ...time.parts,
      time.path(run, COL.model, 2.2),
      ...time.dots(data, COL.data, 2.6),
      ...legend(236, 222, [{ text: 'Carlson’s yeast', color: COL.data, dot: true }, { text: 'model', color: COL.model }]),
      note(44, 222, 'Net growth (births minus deaths)', { fill: COL.births }),
      note(44, 236, 'falls to zero at the ceiling.', { fill: COL.births }),
      small(236, 250, 'Yeast in Carlson’s units.', { soft: true }),
    );
    const good = brake && err < 25;
    f.readout.textContent = !brake
      ? 'With no brake, growth is a fixed share of the yeast however crowded it gets, and the curve shoots off the top. The yeast did not.'
      : good
        ? `A close fit: the yeast grew about ${Math.round(r * 100)}% an hour when there was little of it, and stopped near ${Math.round(k)}. Out of sugar, and full of its own alcohol, the flask could hold no more.`
        : `The model misses Carlson’s counts by about ${Math.round(err)} on average. Move the sliders until the line runs through the dots.`;
    if (good) t.done();
  };
  const rate = slider('Growth when uncrowded', 0.2, 1.2, 0.02, r, (v) => `${Math.round(v * 100)}% an hour`, (v) => { r = v; paint(); }, 'births');
  const ceiling = slider('Ceiling', 300, 1000, 10, k, (v) => `${v}`, (v) => { k = v; paint(); }, 'deaths');
  const sw = pick(['Brake on', 'No brake'], 0, (i) => { brake = i === 0; paint(); });
  f.controls.append(sw.node, rate.node, ceiling.node);
  paint();
  return f.node;
});

// ---- Mark and recapture ------------------------------------------------------------------

export const recaptureFigure = figure(['estimate'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const MARK = 50;
  const CATCH = 40;
  let seed = 7;
  let truth = 0;
  let fish: { x: number; y: number; marked: boolean; caught: boolean }[] = [];
  let stage = 0;
  let marked = 0;
  const reset = () => {
    const rng = makeRng(seed++);
    truth = 150 + Math.floor(rng() * 450);
    fish = Array.from({ length: truth }, () => ({ x: 34 + rng() * 332, y: 40 + rng() * 120, marked: false, caught: false }));
    stage = 0;
    marked = 0;
  };
  const sample = (n: number) => {
    const rng = makeRng(seed++ * 31);
    const idx = fish.map((_, i) => i).sort(() => rng() - 0.5).slice(0, n);
    return idx;
  };
  const paint = () => {
    const pond = svg('ellipse', { cx: 200, cy: 100, rx: 186, ry: 78, fill: COL.water, opacity: 0.22, stroke: COL.water });
    const dots = fish.map((p) => svg('ellipse', {
      cx: p.x, cy: p.y, rx: 3, ry: 1.6,
      fill: p.marked ? COL.prey : COL.sea,
      opacity: stage === 2 && !p.caught ? 0.25 : 0.9,
      stroke: stage === 2 && p.caught ? COL.ink : 'none', 'stroke-width': 0.8,
    }));
    const est = marked ? Math.round((MARK * CATCH) / marked) : 0;
    redraw(g, pond, ...dots,
      small(20, 200, stage === 0 ? 'A pond full of fish. How many?' : stage === 1 ? `${MARK} caught, tagged orange and let go. Give them time to mix.` : `Second catch: ${CATCH} fish, ${marked} of them tagged.`, { soft: true }),
      stage === 3 ? label(380, 200, `Really: ${truth}`, { anchor: 'end', bold: true, fill: COL.heat }) : null,
    );
    if (stage === 0) f.readout.textContent = 'You can’t see every fish, and you can’t drain the pond. Catch some, tag them and let them go.';
    else if (stage === 1) f.readout.textContent = `Tagged fish are now ${MARK} out of the unknown whole. Catch a second sample and count the tags in it.`;
    else f.readout.textContent = marked
      ? `${marked} of ${CATCH} caught are tagged, so tagged fish are about ${marked}/${CATCH} of the pond. If ${MARK} is that share, the pond holds about ${MARK} × ${CATCH} ÷ ${marked} = ${est} fish.${stage === 3 ? ` The real number was ${truth}: ${Math.abs(est - truth) / truth < 0.25 ? 'close' : 'off, because a small second catch carries a lot of luck'}.` : ''}`
      : 'No tagged fish in the second catch: the pond is too big to estimate from these samples. Start again.';
  };
  const mark = button('Catch and tag 50', () => {
    if (stage !== 0) return;
    for (const i of sample(MARK)) fish[i].marked = true;
    stage = 1;
    paint();
  });
  const second = button('Second catch of 40', () => {
    if (stage !== 1) return;
    for (const i of sample(CATCH)) fish[i].caught = true;
    marked = fish.filter((p) => p.caught && p.marked).length;
    stage = 2;
    paint();
    if (marked) t.done();
  });
  const reveal = button('Drain the pond', () => {
    if (stage !== 2) return;
    stage = 3;
    paint();
  });
  const again = button('New pond', () => { reset(); paint(); });
  const row = document.createElement('div');
  row.className = 'chips';
  row.append(mark, second, reveal, again);
  f.controls.append(row);
  reset();
  paint();
  return f.node;
});
