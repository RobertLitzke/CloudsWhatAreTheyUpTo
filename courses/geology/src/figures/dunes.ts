// Lesson 2, A desert turned to stone: moving water and wind sort grains by
// size, and a dune that marches downwind leaves sloping layers behind it.

import { svg } from 'didactics/dom';
import { arrow, label, line, note, redraw, small } from 'didactics/draw';
import { segmented } from 'didactics/ui';
import { COL, choices, figure, frame, lock, lockIn, slider } from './kit';

const W = 400;

// ---- Sorting by speed --------------------------------------------------------------

type State = 'stays' | 'rolls' | 'carried';

interface Grain {
  name: string;
  /** Diameter in millimetres. */
  mm: number;
  color: string;
  /** Speeds (m/s) at which it starts to roll or hop along the bed, and at which the flow holds it up; Infinity for never. */
  water: [number, number];
  wind: [number, number];
}

// Rough thresholds for a beginner's picture: water speed near the bed, wind
// speed a metre up. Clay's stickiness (which makes a dried mud bed hard to
// pick up again) is left out: here it is loose grains settling or not.
const GRAINS: Grain[] = [
  { name: 'Clay', mm: 0.002, color: '#9c7b6a', water: [0, 0.01], wind: [6, 6] },
  { name: 'Silt', mm: 0.03, color: '#b49a7e', water: [0.02, 0.05], wind: [6, 6] },
  { name: 'Fine sand', mm: 0.2, color: COL.sand, water: [0.2, 1.2], wind: [5, Infinity] },
  { name: 'Coarse sand', mm: 1, color: '#c08a3a', water: [0.35, Infinity], wind: [10, Infinity] },
  { name: 'Gravel', mm: 10, color: '#8f8a80', water: [1, Infinity], wind: [Infinity, Infinity] },
  { name: 'Cobble', mm: 100, color: '#6f6a62', water: [3, Infinity], wind: [Infinity, Infinity] },
];

const stateOf = (g: Grain, medium: 'water' | 'wind', speed: number): State => {
  const [roll, carry] = g[medium];
  return speed >= carry ? 'carried' : speed >= roll ? 'rolls' : 'stays';
};

const sayMm = (mm: number) => (mm < 0.01 ? `${mm * 1000} µm` : mm < 1 ? `${mm} mm` : `${mm} mm`);

export const sortFigure = figure(['sand-bed'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let medium: 'water' | 'wind' = 'water';
  let water = 0.5;
  let wind = 8;
  const bed = 150;
  const paint = () => {
    const speed = medium === 'water' ? water : wind;
    const states = GRAINS.map((gr) => stateOf(gr, medium, speed));
    const col = (i: number) => 40 + i * 64;
    const fluid = medium === 'water' ? COL.water : COL.wind;
    const parts: SVGElement[] = [
      svg('rect', { x: 10, y: 30, width: 380, height: bed - 30, fill: fluid, opacity: medium === 'water' ? 0.16 : 0.08 }),
      svg('rect', { x: 10, y: bed, width: 380, height: 8, fill: '#b9a68c' }),
      small(14, 24, medium === 'water' ? 'River water' : 'Wind', { fill: fluid, bold: true }),
      arrow(300, 20, 300 + Math.min(80, 10 + speed * (medium === 'water' ? 18 : 2.4)), 20, fluid, 2),
      small(14, 46, 'carried in the flow', { soft: true }),
    ];
    GRAINS.forEach((gr, i) => {
      const x = col(i);
      // Size on the page grows with the log of the size, so clay and cobbles both show.
      const r = 1.5 + Math.log10(gr.mm / 0.002) * 2.6;
      const st = states[i];
      const y = st === 'carried' ? 70 + (i % 2) * 18 : bed - r;
      parts.push(svg('circle', { cx: x, cy: y, r, fill: gr.color, stroke: COL.ink, 'stroke-width': 0.6 }));
      if (st === 'carried') parts.push(arrow(x + r + 2, y, x + r + 22, y, fluid, 1.5));
      if (st === 'rolls') parts.push(arrow(x + r + 2, bed - 4, x + r + 18, bed - 4, COL.ink, 1.4));
      parts.push(
        note(x, bed + 38, gr.name, { anchor: 'middle', bold: true }),
        small(x, bed + 50, sayMm(gr.mm), { anchor: 'middle', soft: true }),
        small(x, bed + 64, st === 'stays' ? 'stays put' : st === 'rolls' ? 'rolls, hops' : 'carried off', { anchor: 'middle', fill: st === 'stays' ? COL.ink : st === 'rolls' ? COL.young : fluid, bold: st === 'stays' }),
      );
    });
    redraw(g, ...parts);
    const stays = GRAINS.filter((_, i) => states[i] === 'stays').map((gr) => gr.name.toLowerCase());
    const moving = GRAINS.filter((_, i) => states[i] !== 'stays').map((gr) => gr.name.toLowerCase());
    const sandOnly = medium === 'water' && states[2] === 'stays' && states[1] === 'carried';
    f.readout.textContent = medium === 'wind' && speed >= 5
      ? `At ${speed} m/s the wind moves ${moving.join(', ')} and leaves ${stays.join(', ')}. Air is about 800 times less dense than water, so even a gale cannot shift gravel. Wind sorts sand from everything bigger, and blows the dust far away.`
      : stays.length === GRAINS.length
        ? 'Too slow to move anything: every size settles here, mud and all.'
        : sandOnly
          ? `At ${speed} m/s the mud is carried off and the sand settles: this bed will become clean sandstone.`
          : `At ${speed} ${medium === 'water' ? 'm/s' : 'm/s of wind'}, ${stays.length ? `${stays.join(', ')} settle here` : 'nothing settles here'}; ${moving.join(', ')} ${moving.length === 1 ? 'is' : 'are'} moved on.`;
    if (sandOnly && t.goal === 'sand-bed') t.done();
  };
  const ws = slider('River speed', 0, 4, 0.05, water, (v) => `${v.toFixed(2)} m/s`, (v) => { water = v; paint(); }, 'water');
  const as = slider('Wind speed', 0, 30, 1, wind, (v) => `${v} m/s`, (v) => { wind = v; paint(); }, 'wind');
  const show = () => {
    ws.node.style.display = medium === 'water' ? '' : 'none';
    as.node.style.display = medium === 'wind' ? '' : 'none';
  };
  f.controls.append(
    segmented([{ value: 'water', label: 'River' }, { value: 'wind', label: 'Wind' }] as const, 'water', (v) => { medium = v; show(); paint(); }),
    ws.node,
    as.node,
  );
  show();
  paint();
  return f.node;
});

// ---- A dune on the march ---------------------------------------------------------

const SLIP = Math.tan((32 * Math.PI) / 180);
const STOSS = Math.tan((12 * Math.PI) / 180);

/**
 * A dune crossing the drawing from upwind to downwind, laying slip-face beds
 * as it goes. `dir` is +1 for wind from the left. `time` 0 to 1.
 */
function duneScene(dir: 1 | -1, time: number, ghost: boolean): SVGElement[] {
  const base = 190;
  const H = 70;
  const kept = 38; // how much of each slope survives under the next dune's scour
  const run = 220;
  // Everything is drawn for wind from the left, then mirrored.
  const mirror = (x: number) => (dir === 1 ? x : W - x);
  const toe0 = 150;
  const toe = toe0 + run * time;
  const crest = toe - H / SLIP;
  const back = crest - H / STOSS;
  const out: SVGElement[] = [];
  if (!ghost) out.push(svg('polygon', { points: [[back, base], [crest, base - H], [toe, base]].map(([x, y]) => `${mirror(x)},${y}`).join(' '), fill: '#ecd29a', stroke: '#b9862f', 'stroke-width': 1 }));
  // Slip-face beds left behind, cut off where the next dune's trough scoured them.
  const step = 9;
  for (let x = toe0; x <= toe - 4; x += step) {
    out.push(line(mirror(x - kept / SLIP), base - kept, mirror(x), base, COL.fossil, 1.2));
  }
  if (toe > toe0 + 4) {
    out.push(line(mirror(toe0 - kept / SLIP), base - kept, mirror(Math.max(toe0, toe - H / SLIP * (kept / H))), base - kept, COL.ink, 1.6));
  }
  const set = [[toe0 - kept / SLIP, base - kept], [Math.max(toe0, toe) - kept / SLIP, base - kept], [Math.max(toe0, toe), base], [toe0, base]];
  out.splice(ghost ? 0 : 1, 0, svg('polygon', { points: set.map(([x, y]) => `${mirror(x)},${y}`).join(' '), fill: COL.sand, opacity: 0.35 }));
  if (!ghost) {
    // The slip face now, where the next bed is settling.
    out.push(line(mirror(crest), base - H, mirror(toe), base, COL.heat, 2));
    out.push(small(mirror(crest), base - H - 6, 'crest', { anchor: 'middle', soft: true }));
    out.push(small(mirror((crest + toe) / 2 + 12), base - H / 2, 'slip face', { anchor: dir === 1 ? undefined : 'end', soft: true }));
  }
  out.unshift(svg('rect', { x: 0, y: base, width: W, height: 30, fill: '#d9c7a4' }));
  return out;
}

export const duneFigure = figure(['built'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let dir: 1 | -1 = 1;
  let time = 0;
  let open = false;
  const paint = () => {
    if (!open) {
      // The puzzle: a block of old beds, all sloping down to the right.
      redraw(g, ...duneScene(1, 1, true), label(200, 60, 'Old sandstone: which way was the wind?', { anchor: 'middle', bold: true }));
      return;
    }
    const windArrow = dir === 1 ? arrow(20, 30, 90, 30, COL.wind, 2.5) : arrow(380, 30, 310, 30, COL.wind, 2.5);
    redraw(g, ...duneScene(dir, time, false), windArrow, note(dir === 1 ? 20 : 380, 22, 'wind', { anchor: dir === 1 ? undefined : 'end', fill: COL.wind, bold: true }));
    f.readout.textContent = time < 0.05
      ? 'Wind pushes sand up the gentle back of the dune. Move time on.'
      : `Sand blown over the crest slides down the steep slip face and settles there, in a sloping sheet. As the dune moves ${dir === 1 ? 'right' : 'left'}, it leaves a stack of these sheets behind, all sloping down ${dir === 1 ? 'to the right' : 'to the left'}: downwind.`;
    if (time >= 0.8 && t.goal === 'built') t.done();
  };
  const ts = slider('Time', 0, 100, 1, 0, (v) => `${Math.round(v)}%`, (v) => { time = v / 100; paint(); }, 'young');
  const wind = segmented([{ value: 1, label: 'Wind from the left' }, { value: -1, label: 'From the right' }] as const, 1, (v) => { dir = v as 1 | -1; paint(); });
  wind.style.display = 'none';
  const pick = choices(['From the left', 'From the right'], () => (go.disabled = false));
  const go = lockIn('Lock it in', () => {
    const guess = pick.picked();
    if (guess < 0) return;
    t.keep(guess);
    pick.freeze(true);
    go.remove();
    lock([ts], false);
    wind.style.display = '';
    open = true;
    paint();
    f.readout.textContent = `You guessed the wind came from the ${guess === 0 ? 'left' : 'right'}. Now build a dune's beds and see which way they slope.`;
  });
  go.disabled = true;
  lock([ts], true);
  f.controls.append(pick.node, go, wind, ts.node);
  paint();
  f.readout.textContent = 'These beds in old sandstone all slope down to the right. They were laid by a dune. Guess which way the wind blew.';
  if (typeof t.kept === 'number') {
    pick.pick(t.kept);
    go.click();
  }
  return f.node;
});
