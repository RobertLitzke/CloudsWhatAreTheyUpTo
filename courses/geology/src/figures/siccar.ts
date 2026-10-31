// Lesson 6, The rock at Siccar Point: an unconformity built up stage by stage,
// with the time each stage takes at the rates rock is laid down and worn away;
// and the rock cycle that ties the lessons so far together.

import { svg } from 'didactics/dom';
import { arrow, label, line, note, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;
const H = 230;
const SEA = 70;
const FLOOR = 205;

// Kilometres of rock in each stage, roughly as at Siccar Point.
const GREY_KM = 4;
const WORN_KM = 5;
const RED_KM = 1;
const LAST_KM = 1;

const STAGES = [
  'grey sand and mud pile up on the sea floor',
  'the pile is squeezed, buckled to vertical and pushed up into mountains',
  'the mountains are worn down to a plain',
  'rivers spread red sand and pebbles over the plain',
  'the whole pile is tipped gently and worn down to today’s coast',
];

let clipCount = 0;

const ease = (x: number) => Math.max(0, Math.min(1, x));

/** Years for `km` of rock at `mmPerYear`, said in words. */
function sayYears(years: number): string {
  if (years >= 1e9) return `${(years / 1e9).toFixed(1)} billion years`;
  if (years >= 1e6) return `${years >= 1e7 ? Math.round(years / 1e6) : (years / 1e6).toFixed(1)} million years`;
  if (years >= 1e3) return `${Math.round(years / 1e3).toLocaleString('en')} thousand years`;
  return `${Math.round(years)} years`;
}

/** The mountain profile pushed up in stage 2, as heights above the base line at x. */
const ridge = (x: number) => 52 * Math.exp(-(((x - 210) / 95) ** 2)) + 18 * Math.exp(-(((x - 90) / 50) ** 2));

export const unconformityFigure = figure(['story'], (_ctx, t) => {
  const f = frame(W, H, 4);
  const id = `unc${++clipCount}`;
  const defs = svg('defs');
  const g = svg('g');
  f.svg.append(defs, g);
  let s = 0;
  let rate = -1; // log10 mm per year

  const rng = makeRng(6);
  const pebbles = Array.from({ length: 40 }, () => ({ x: 22 + rng() * 356, dy: rng() * 7, r: 1 + rng() * 1.6 }));

  const paint = () => {
    const a = ease(s); // grey pile builds
    const b = ease(s - 1); // squeeze and uplift
    const c = ease(s - 2); // erosion
    const d = ease(s - 3); // red beds
    const e = ease(s - 4); // tilt and wear
    const greyTop = FLOOR - 80 * a; // flat top of the grey pile while it builds
    const plain = SEA + 52; // the worn-down plain
    // The grey rock's upper surface: flat, then pushed up, then worn to the plain.
    const greySurface = (x: number) => {
      const up = greyTop - b * (greyTop - (SEA - 4) + ridge(x));
      return up + c * (plain - up);
    };
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 8) pts.push(`${x},${greySurface(x).toFixed(1)}`);
    const greyPoly = `0,${H} ${pts.join(' ')} ${W},${H}`;
    const redTop = plain - 46 * d;
    defs.replaceChildren(
      svg('clipPath', { id: `${id}g` }, svg('polygon', { points: greyPoly })),
      svg('clipPath', { id: `${id}r` }, svg('rect', { x: 0, y: redTop, width: W, height: Math.max(0, plain - redTop) })),
      // Today's ground: the tipped pile cut down to a cliff and a shore platform.
      svg('clipPath', { id: `${id}n` }, svg('polygon', { points: e > 0 ? `0,${H} 0,${SEA - 30 + 60 * e} 170,${SEA - 26 + 58 * e} 215,${SEA + 2 + 46 * e} ${W},${SEA + 12 + 44 * e} ${W},${H}` : `0,0 ${W},0 ${W},${H} 0,${H}` })),
    );
    // Grey beds: horizontal stripes, turned toward vertical as they are squeezed.
    const turn = b * 82;
    const grey: SVGElement[] = [];
    for (let k = -30; k < 30; k++) {
      grey.push(svg('rect', { x: -200, y: FLOOR - k * 9, width: 800, height: 9, fill: k % 2 ? '#8e979e' : '#a9b1b6' }));
    }
    const greyGroup = svg('g', { 'clip-path': `url(#${id}g)` }, svg('g', { transform: `rotate(${turn} 200 ${FLOOR - 40})` }, ...grey));
    const red: SVGElement[] = [];
    for (let k = 0; k < 8; k++) red.push(svg('rect', { x: 0, y: plain - (k + 1) * 6, width: W, height: 6, fill: k % 2 ? '#b45a3c' : '#c8704d' }));
    for (const p of pebbles) red.push(svg('circle', { cx: p.x, cy: plain - 2 - p.dy, r: p.r, fill: '#a9b1b6', stroke: '#6b737a', 'stroke-width': 0.5 }));
    const redGroup = svg('g', { 'clip-path': `url(#${id}r)` }, ...red);
    const rock = svg('g', { transform: `rotate(${-12 * e} 200 ${plain})`, 'clip-path': `url(#${id}n)` }, greyGroup, redGroup);
    const water = e > 0
      ? svg('rect', { x: 215, y: SEA + 6, width: W - 215, height: H - SEA, fill: COL.water, opacity: 0.25 })
      : svg('rect', { x: 0, y: SEA, width: W, height: H - SEA, fill: COL.water, opacity: s < 1 || (s >= 3 && s < 3.2) ? 0.22 : 0.1 });
    const unc = d > 0 ? line(0, plain, W, plain, COL.heat, 1.6, { 'stroke-dasharray': '5 3', transform: `rotate(${-12 * e} 200 ${plain})` }) : null;
    redraw(g,
      svg('rect', { width: W, height: H, fill: COL.paper }),
      water,
      rock,
      unc,
      line(0, SEA, W, SEA, COL.water, 1, { 'stroke-dasharray': '2 3', opacity: 0.7 }),
      small(W - 6, SEA - 4, 'sea level', { anchor: 'end', fill: COL.water }),
      d > 0.5 ? label(e > 0.5 ? 30 : 12, (e > 0.5 ? SEA - 10 + 60 * e : plain) - (e > 0.5 ? 0 : 14), 'red sandstone', { size: 'note', bold: true, fill: '#8a3a22', halo: COL.paper }) : null,
      a > 0.3 ? label(12, H - 10, b > 0.5 ? 'grey beds, on end' : 'grey beds', { size: 'note', bold: true, fill: '#4e565c', halo: COL.paper }) : null,
      d > 0.5 ? small(W - 6, (e > 0.5 ? plain + 20 : plain + 12), 'the unconformity', { anchor: 'end', fill: COL.heat, halo: COL.paper, bold: true }) : null,
    );
    // Time taken so far at this rate: kilometres laid down or worn away.
    const mm = 10 ** rate;
    const km = GREY_KM * a + WORN_KM * c + RED_KM * d + LAST_KM * e;
    const years = (km * 1e6) / mm;
    const stage = Math.min(4, Math.floor(s));
    f.readout.textContent = s <= 0
      ? 'A shallow sea, some time in the distant past. Move time forward.'
      : `Stage ${stage + 1}: ${STAGES[stage]}. So far about ${km.toFixed(1)} km of rock has been laid down or worn away; at ${mm < 0.1 ? mm.toFixed(2) : mm < 1 ? mm.toFixed(1) : Math.round(mm)} mm a year that takes ${sayYears(years)}.`;
    if (s >= 5 && t.goal === 'story') t.done();
  };
  const time = slider('Time', 0, 5, 0.05, 0, (v) => (v <= 0 ? 'start' : v >= 5 ? 'today' : `stage ${Math.min(5, Math.floor(v) + 1)}`), (v) => { s = v; paint(); }, 'old');
  const pace = slider('Rock laid down or worn away', -2, 1, 0.05, rate, (v) => `${(10 ** v < 0.1 ? (10 ** v).toFixed(2) : 10 ** v < 1 ? (10 ** v).toFixed(1) : Math.round(10 ** v))} mm a year`, (v) => { rate = v; paint(); }, 'heat');
  f.controls.append(time.node, pace.node);
  paint();
  guessFirst(t, f, {
    ask: 'At Siccar Point, grey beds stand on end under flat-lying red sandstone. How long do you think it took to make that arrangement? Guess first.',
    options: ['About 6,000 years', 'A few hundred thousand years', 'Tens of millions of years'],
    sliders: [time, pace],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['about 6,000 years', 'a few hundred thousand years', 'tens of millions of years'][guess]}. Move time forward, and set the rate at which rock piles up and wears away: a tenth of a millimetre a year is typical today.`;
    },
  });
  return f.node;
});

// ---- The rock cycle: a still --------------------------------------------------------

export const cycleStill = () => {
  const { node, svg: s } = still(W, 250);
  const items: { text: string; color: string; lesson: string; x: number; y: number }[] = [
    { text: 'Sediment', color: COL.sand, lesson: 'lesson 2', x: 200, y: 28 },
    { text: 'Sedimentary rock', color: '#c9a66b', lesson: 'lessons 1–3', x: 320, y: 88 },
    { text: 'Metamorphic rock', color: '#b98aa0', lesson: 'lesson 5', x: 320, y: 168 },
    { text: 'Magma', color: COL.heat, lesson: 'lesson 4', x: 200, y: 225 },
    { text: 'Igneous rock', color: '#6b6670', lesson: 'lesson 4', x: 80, y: 168 },
    { text: 'Mountains', color: '#8fa37a', lesson: 'lesson 6', x: 80, y: 88 },
  ];
  // How each step happens, placed beside its arrow: [text, x, y, anchor].
  const how: [string, number, number, 'start' | 'middle' | 'end'][] = [
    ['buried and cemented', 272, 46, 'start'],
    ['heated, squeezed', 312, 131, 'end'],
    ['melted', 272, 212, 'start'],
    ['cooled', 128, 212, 'end'],
    ['pushed up', 88, 131, 'start'],
    ['worn away, carried off', 128, 46, 'end'],
  ];
  const parts: SVGElement[] = [svg('rect', { width: W, height: 250, fill: COL.paper })];
  items.forEach((a, i) => {
    const b = items[(i + 1) % items.length];
    const k = a.x === b.x ? 0.24 : 0.3;
    parts.push(arrow(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.x + (b.x - a.x) * (1 - k), a.y + (b.y - a.y) * (1 - k), COL.soft, 1.6));
    const [text, x, y, anchor] = how[i];
    parts.push(small(x, y, text, { anchor: anchor === 'start' ? undefined : anchor, soft: true }));
  });
  for (const it of items) {
    const w = it.text.length * 6.4 + 16;
    const dark = it.text === 'Magma' || it.text === 'Igneous rock';
    parts.push(
      svg('rect', { x: it.x - w / 2, y: it.y - 13, width: w, height: 26, rx: 6, fill: it.color, opacity: 0.9 }),
      note(it.x, it.y + 1, it.text, { anchor: 'middle', bold: true, fill: dark ? COL.paper : COL.ink }),
      small(it.x, it.y + 10, it.lesson, { anchor: 'middle', fill: dark ? COL.paper : COL.ink, attrs: { opacity: 0.8 } }),
    );
  }
  parts.push(note(200, 150, 'Hutton’s cycle', { anchor: 'middle', bold: true, soft: true }));
  s.append(...parts);
  s.setAttribute('aria-label', 'The rock cycle: sediment is buried and becomes sedimentary rock, which heat and pressure turn to metamorphic rock, which can melt to magma, which cools to igneous rock, which is pushed up into mountains, which wear away into sediment again.');
  return { node };
};
