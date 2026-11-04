// Lesson 19, Travelling and waiting: seeds of different shapes let go in the
// wind; a soil seed bank woken by different disturbances; and a run of good
// and bad years for an annual that keeps some seeds back.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng, type Rng } from 'didactics/rng';
import { axes, button, COL, figure, frame, guessFirst, pick, slider, wrapped } from './kit';

const W = 400;

// ---- How far a seed goes ---------------------------------------------------------------------------

export const SEEDS = [
  { id: 'pea', name: 'Heavy seed', fall: 5, release: 1 },
  { id: 'maple', name: 'Maple key', fall: 1, release: 15 },
  { id: 'dandelion', name: 'Dandelion', fall: 0.3, release: 0.4 },
] as const;
export type Seed = (typeof SEEDS)[number]['id'];

/** How far a seed travels (m): released at `height` m in a wind of `wind` m/s, it drifts with the wind for as long as it takes to fall. */
export const distance = (height: number, wind: number, fall: number) => (height * wind) / fall;

/** Where a crowd of seeds lands, with gusts varying the wind about its mean: one distance per seed. */
export function shadow(height: number, wind: number, fall: number, rng: Rng, n = 200): number[] {
  return Array.from({ length: n }, () => distance(height, Math.max(0, wind * (0.4 + rng() * 1.2)), fall));
}

export const dropFigure = figure(['compare'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let at = 1;
  let wind = 5;
  const tried = new Set<string>();
  const paint = () => {
    const s = SEEDS[at];
    const d = distance(s.release, wind, s.fall);
    const land = shadow(s.release, wind, s.fall, makeRng(7));
    const max = 200;
    const X = (m: number) => 30 + Math.min(1, m / max) * 350;
    const bins = new Array(35).fill(0);
    for (const m of land) bins[Math.min(34, Math.floor((m / max) * 35))]++;
    const peak = Math.max(...bins);
    const top = 40;
    const ground = 170;
    const H = (m: number) => ground - Math.min(1, m / 20) * (ground - top);
    redraw(g,
      svg('rect', { x: 0, y: ground, width: W, height: 60, fill: COL.soil, opacity: 0.2 }),
      // The parent plant and the seed's path.
      line(30, ground, 30, H(Math.max(s.release, 0.5)), COL.wood, 3),
      line(30, H(s.release), X(d), ground, COL.soft, 1.2, { 'stroke-dasharray': '4 3' }),
      svg('circle', { cx: X(d), cy: ground, r: 4, fill: COL.sugar }),
      ...bins.map((b, i) => svg('rect', { x: 30 + (i / 35) * 350, y: ground + 46 - (b / peak) * 40, width: 350 / 35 - 1, height: (b / peak) * 40, fill: COL.leaf, opacity: 0.7 })),
      ...[0, 50, 100, 150, 200].map((m) => small(X(m), ground + 58, m === 200 ? '200 m+' : `${m}`, { anchor: 'middle', soft: true })),
      label(390, 26, `${s.name}`, { anchor: 'end', bold: true }),
      small(390, 42, `let go at ${s.release} m, falls at ${s.fall} m/s`, { anchor: 'end', soft: true }),
      small(390, 58, `typical distance ${Math.round(d)} m`, { anchor: 'end', fill: COL.sugar, bold: true }),
      small(36, top - 10, 'Green bars: where 200 seeds land, with gusts', { soft: true }),
    );
    tried.add(s.id);
    f.readout.textContent = `Distance = height × wind speed ÷ fall speed: ${s.release} × ${wind} ÷ ${s.fall} ≈ ${Math.round(d)} m. ${s.id === 'dandelion' ? 'Let go near the ground, most dandelion seeds land within metres. But they fall so slowly that any rising air lifts them, and a few travel kilometres; this model leaves rising air out.' : s.id === 'pea' ? 'A heavy seed drops almost at its parent’s feet, unless an animal moves it.' : 'The maple key’s spin slows its fall and its height gives it time.'}`;
    if (tried.size >= 2 && wind >= 5) t.done();
  };
  const which = pick(SEEDS.map((s) => s.name), at, (i) => { at = i; paint(); });
  const ws = slider('Wind', 0, 12, 1, wind, (v) => `${v} m/s`, (v) => { wind = v; paint(); }, 'water');
  f.controls.append(which.node, ws.node);
  paint();
  return f.node;
});

// ---- The seed bank ---------------------------------------------------------------------------------

export type Disturbance = 'none' | 'plough' | 'fire' | 'gap';
export const DISTURBANCES: { id: Disturbance; name: string }[] = [
  { id: 'none', name: 'Leave it' },
  { id: 'plough', name: 'Plough it' },
  { id: 'fire', name: 'A fire' },
  { id: 'gap', name: 'A tree falls' },
];

/** The kinds waiting in a soil seed bank under a forest edge, and the cue each needs to sprout. */
export const BANK = [
  { name: 'Poppy', cue: 'light on bare soil', wakes: ['plough'] as Disturbance[], color: COL.red },
  { name: 'Foxglove', cue: 'red light through a gap', wakes: ['plough', 'gap'] as Disturbance[], color: '#9b59b6' },
  { name: 'Snowbrush', cue: 'heat cracks its seed coat', wakes: ['fire'] as Disturbance[], color: COL.autumn },
  { name: 'Lodgepole pine', cue: 'heat opens its sealed cones', wakes: ['fire'] as Disturbance[], color: COL.leaf },
];

export const sprouts = (d: Disturbance) => BANK.filter((k) => k.wakes.includes(d)).map((k) => k.name);

export const bankFigure = figure(['fire'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let d: Disturbance = 'none';
  const paint = () => {
    const shown = open();
    const up = shown ? sprouts(d) : [];
    const ground = 110;
    const parts: SVGElement[] = [];
    BANK.forEach((k, i) => {
      const x = 50 + i * 90;
      const awake = up.includes(k.name);
      for (let j = 0; j < 4; j++) parts.push(svg('ellipse', { cx: x - 15 + j * 10, cy: ground + 30 + (j % 2) * 14, rx: 4, ry: 3, fill: k.color, opacity: awake ? 0.3 : 0.9 }));
      if (awake) for (let j = 0; j < 3; j++) {
        const sx = x - 12 + j * 12;
        parts.push(line(sx, ground, sx, ground - 26 - j * 4, k.color, 2.5), svg('ellipse', { cx: sx + 5, cy: ground - 26 - j * 4, rx: 5, ry: 3, fill: k.color }));
      }
      parts.push(label(x, ground + 76, k.name, { anchor: 'middle', bold: true }), ...wrapped(x - 42, ground + 92, k.cue, 18, { soft: true, size: 'note' }, 10));
    });
    redraw(g,
      d === 'fire' && shown ? svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.heat, opacity: 0.12 }) : null,
      svg('rect', { x: 0, y: ground, width: W, height: 70, fill: COL.soil, opacity: d === 'plough' && shown ? 0.45 : 0.28 }),
      small(10, ground + 14, 'seeds waiting in the soil', { soft: true }),
      label(10, 22, shown ? DISTURBANCES.find((x) => x.id === d)!.name : 'A forest edge', { bold: true }),
    );
    g.append(...parts);
    if (!shown) return;
    f.readout.textContent = !up.length
      ? 'Nothing changes, so nothing wakes. The seeds stay dormant, some of them for decades.'
      : `${up.join(' and ')} come up: ${d === 'fire' ? 'their cue is heat, which only a fire brings.' : d === 'plough' ? 'turning the soil brings them up to the light.' : 'the new gap lets in light rich in red (lesson 15).'} The others wait.`;
    if (d === 'fire') t.done();
  };
  const which = pick(DISTURBANCES.map((x) => x.name), 0, (i) => { d = DISTURBANCES[i].id; paint(); });
  f.controls.append(which.node);
  const open = guessFirst(t, f, {
    ask: 'A fire sweeps through a forest whose soil holds poppy, foxglove, snowbrush and lodgepole pine seed. Which come up first?',
    options: ['The ones that need light', 'The ones that need heat', 'All of them at once'],
    answer: 1,
    reveal: 'done',
    sliders: [],
    buttons: which.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Waiting as insurance ---------------------------------------------------------------------------

/**
 * An annual plant through a run of years, each good (each seedling leaves
 * 10 seeds) or, with chance `bad`, a drought that kills every seedling. Each
 * year a share `sprout` of the seeds in the soil comes up; the rest wait, and
 * a tenth of the waiting seeds die. Returns the seeds in the soil each year.
 */
export function hedge(sprout: number, years: number, seed: number, bad = 0.3): number[] {
  const rng = makeRng(seed);
  let bank = 100;
  const out = [bank];
  for (let y = 1; y <= years; y++) {
    const up = bank * sprout;
    const wait = (bank - up) * 0.9;
    const good = rng() >= bad;
    bank = Math.min(1e6, wait + (good ? up * 10 : 0));
    if (bank < 1) bank = 0;
    out.push(bank);
  }
  return out;
}

export const hedgeFigure = figure(['hedge'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let share = 1;
  let seed = 3;
  let sawAll = false;
  let sawSome = false;
  const paint = () => {
    const years = 40;
    const run = hedge(share, years, seed);
    const badYears = (() => {
      const rng = makeRng(seed);
      return Array.from({ length: years }, () => rng() < 0.3);
    })();
    const a = axes({ x: 50, y: 20, w: 330, h: 150, xmin: 0, xmax: years, ymin: 1, ymax: 1e6, ylog: true, yticks: [1, 100, 1e4, 1e6], yfmt: (v) => (v >= 1e6 ? '1M' : v >= 1e4 ? '10k' : String(v)), xticks: [0, 10, 20, 30, 40], xlabel: 'years', ylabel: 'seeds in the soil', ink: COL.ink, grid: COL.grid });
    const alive = run.findIndex((v) => v === 0);
    redraw(g,
      ...badYears.map((b, i) => (b ? svg('rect', { x: a.X(i + 0.5), y: 20, width: a.X(1) - a.X(0), height: 150, fill: COL.autumn, opacity: 0.15 }) : null)).filter((x): x is SVGElement => !!x),
      ...a.parts,
      a.path(run.map((v, i) => [i, Math.max(1, v)] as const), COL.leaf, 2.2),
      small(380, 214, 'Orange: drought years, when every seedling dies. A model.', { anchor: 'end', soft: true }),
    );
    if (share >= 0.99 && alive > 0) sawAll = true;
    if (share <= 0.7 && alive < 0) sawSome = true;
    f.readout.textContent = alive > 0
      ? `With ${Math.round(share * 100)}% of the seeds sprouting each year, the first drought ${share >= 0.99 ? 'kills every plant and leaves no seed in the soil' : 'catches too many and the bank runs out'}: extinct in year ${alive}.`
      : `With ${Math.round(share * 100)}% sprouting and the rest waiting, each drought costs only that year's seedlings; the seeds still in the soil carry the plant through to the next good year.`;
    if (sawAll && sawSome) t.done();
  };
  const ss = slider('Share of seeds that sprout each year', 0.1, 1, 0.05, share, (v) => `${Math.round(v * 100)}%`, (v) => { share = v; paint(); }, 'leaf');
  const again = button('Another run of years', () => { seed += 1; paint(); });
  f.controls.append(ss.node, again);
  paint();
  return f.node;
});
