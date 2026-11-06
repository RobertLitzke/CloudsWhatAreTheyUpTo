// Lesson 7, The rock at Siccar Point: an unconformity built up stage by stage,
// with the time each stage takes at the rates rock is laid down and worn away;
// the rock cycle that ties the lessons so far together is a loop block in the
// lesson's JSON (didactics/live-charts).

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, player, slider } from './kit';

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

// The squeeze folds the grey beds rather than turning them as one block: a
// train of tight upright folds whose limbs end up about 80 degrees from flat,
// the beds thickened as the pile shortens. Rounded hinges, straight limbs.
const FOLD_WAVE = 100; // px from one arch to the next
const FOLD_LIMB = 80; // degrees
const FOLD_AMP = (Math.tan((FOLD_LIMB * Math.PI) / 180) * FOLD_WAVE) / (4 * 0.98);
const fold = (x: number) => (2 / Math.PI) * Math.asin(0.98 * Math.sin((2 * Math.PI * (x - 10)) / FOLD_WAVE));
const BED = 9; // a grey bed's thickness before the squeeze
const BED_SQUEEZED = 40; // its height measured straight up afterwards (about 7 px across a steep limb)

// The red sandstone at Siccar Point dips gently out to sea; stage 5 tips the
// whole pile that way (the sea is on the right) about the foot of today's cliff.
const TIP = 12; // degrees
const CLIFF = 206;

export const unconformityFigure = figure(['story'], (ctx, t) => {
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
    const plain = SEA - 2; // the worn-down plain, just above sea level: the red sand is river-laid
    // The grey rock's upper surface: flat, then pushed up, then worn to the plain.
    const greySurface = (x: number) => {
      const up = greyTop - b * (greyTop - (SEA - 4) + ridge(x));
      return up + c * (plain - up);
    };
    const pts: string[] = [];
    for (let x = -80; x <= W + 80; x += 8) pts.push(`${x},${greySurface(x).toFixed(1)}`);
    // Wider and deeper than the panel, so no corner shows when stage 5 tips it.
    const greyPoly = `-80,${H + 120} ${pts.join(' ')} ${W + 80},${H + 120}`;
    const redTop = plain - 46 * d;
    // Today's ground, cut after the tip: the land, a cliff, and the shore platform under the sea.
    const cut = (y: number) => (SEA - 120 + (y - SEA + 120) * e).toFixed(1);
    defs.replaceChildren(
      svg('clipPath', { id: `${id}g` }, svg('polygon', { points: greyPoly })),
      svg('clipPath', { id: `${id}r` }, svg('rect', { x: -60, y: redTop, width: W + 120, height: Math.max(0, plain - redTop) })),
      svg('clipPath', { id: `${id}n` }, svg('polygon', { points: `0,${H} 0,${cut(SEA - 30)} 90,${cut(SEA - 33)} 170,${cut(SEA - 27)} ${CLIFF - 10},${cut(SEA - 24)} ${CLIFF},${cut(SEA + 3)} ${W},${cut(SEA + 12)} ${W},${H}` })),
    );
    // Grey beds: flat, then folded as they are squeezed.
    const amp = FOLD_AMP * b;
    const bed = BED + (BED_SQUEEZED - BED) * b;
    const edge = (k: number, x: number) => FLOOR - k * bed - amp * fold(x);
    const grey: SVGElement[] = [];
    const k0 = Math.floor((FLOOR - H - amp - 140) / bed);
    const k1 = Math.ceil((FLOOR + amp + 60) / bed);
    for (let k = k0; k < k1; k++) {
      const top: string[] = [];
      const bottom: string[] = [];
      for (let x = -80; x <= W + 80; x += 2) {
        top.push(`${x},${edge(k + 1, x).toFixed(1)}`);
        bottom.unshift(`${x},${edge(k, x).toFixed(1)}`);
      }
      grey.push(svg('polygon', { points: `${top.join(' ')} ${bottom.join(' ')}`, fill: k % 2 ? '#8e979e' : '#a9b1b6' }));
    }
    const greyGroup = svg('g', { 'clip-path': `url(#${id}g)` }, ...grey);
    const red: SVGElement[] = [];
    for (let k = 0; k < 8; k++) red.push(svg('rect', { x: -60, y: plain - (k + 1) * 6, width: W + 120, height: 6, fill: k % 2 ? '#b45a3c' : '#c8704d' }));
    for (const p of pebbles) red.push(svg('circle', { cx: p.x, cy: plain - 2 - p.dy, r: p.r, fill: '#a9b1b6', stroke: '#6b737a', 'stroke-width': 0.5 }));
    const redGroup = svg('g', { 'clip-path': `url(#${id}r)` }, ...red);
    const unc = d > 0 ? line(-60, plain, W + 60, plain, COL.heat, 1.6, { 'stroke-dasharray': '5 3' }) : null;
    // Tipped as one, then cut to today's ground (the cut is not tipped).
    const tip = TIP * e;
    const rock = svg('g', { 'clip-path': `url(#${id}n)` }, svg('g', { transform: `rotate(${tip} ${CLIFF} ${plain})` }, greyGroup, redGroup, ...(unc ? [unc] : [])));
    const uncY = (x: number) => plain + (x - CLIFF) * Math.tan((tip * Math.PI) / 180);
    const water = e > 0
      ? svg('rect', { x: CLIFF, y: SEA, width: W - CLIFF, height: H - SEA, fill: COL.water, opacity: 0.25 * e })
      : svg('rect', { x: 0, y: SEA, width: W, height: H - SEA, fill: COL.water, opacity: s < 1 ? 0.22 : 0.1 });
    redraw(g,
      svg('rect', { width: W, height: H, fill: COL.paper }),
      water,
      rock,
      line(0, SEA, W, SEA, COL.water, 1, { 'stroke-dasharray': '2 3', opacity: 0.7 }),
      small(W - 6, SEA - 4, 'sea level', { anchor: 'end', fill: COL.water }),
      d > 0.5 ? label(e > 0.5 ? 116 : 12, e > 0.5 ? SEA - 40 : redTop + 14, 'red sandstone', { size: 'note', bold: true, fill: '#8a3a22', halo: COL.paper }) : null,
      a > 0.3 ? label(12, H - 10, b > 0.5 ? 'grey beds, folded on end' : 'grey beds', { size: 'note', bold: true, fill: '#4e565c', halo: COL.paper }) : null,
      d > 0.5 ? small(W - 6, uncY(W - 6) + 12, 'the unconformity', { anchor: 'end', fill: COL.heat, halo: COL.paper, bold: true }) : null,
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
  f.controls.append(player(time, ctx).node, time.node, pace.node);
  paint();
  guessFirst(t, f, {
    ask: 'At Siccar Point, grey beds stand on end under flat-lying red sandstone. How long do you think it took to make that arrangement? Guess first.',
    options: ['About 6,000 years', 'A few hundred thousand years', 'Tens of millions of years'],
    answer: 2, reveal: 'done',
    sliders: [time, pace],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['about 6,000 years', 'a few hundred thousand years', 'tens of millions of years'][guess]}. Move time forward, and set the rate at which rock piles up and wears away: a tenth of a millimetre a year is typical today.`;
    },
  });
  return f.node;
});
