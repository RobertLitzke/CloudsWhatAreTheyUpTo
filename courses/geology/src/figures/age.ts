// Lesson 7, How old is the Earth?: Kelvin's cooling Earth, solved in one
// dimension the way he set it up, with Perry's and the radioactive objections
// as switches; and a box of uranium atoms decaying to lead.

import { svg } from 'didactics/dom';
import { label, line, polyline, redraw, small, type P } from 'didactics/draw';
import { segmented } from 'didactics/ui';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

// ---- Kelvin's cooling Earth ---------------------------------------------------------

/** Kelvin's starting temperature, 7000 °F. */
const T_START = 3900;
/** Rock's thermal diffusivity, km² per million years (Kelvin's 400 ft² a year). */
const KAPPA = 37.8;
/** Kelvin's measured gradient, 1 °F per 50 ft, in °C per km. */
const MEASURED = 36.5;
/** Depth of the lid above Perry's better-conducting interior, km. */
const LID = 100;
/** Gradient the crust's own radioactivity keeps up, °C per km, and the depth it is spread over. */
const RADIO_GRAD = 25;
const RADIO_DEPTH = 20;

/** Depths of the grid's nodes, km: fine near the surface, coarse deep down. */
const Z: number[] = (() => {
  const z = [0];
  let dz = 0.25;
  while (z[z.length - 1] < 3000) {
    z.push(z[z.length - 1] + dz);
    dz = Math.min(dz * 1.035, 40);
  }
  return z;
})();

/**
 * Temperatures at the nodes after `myr` million years, starting molten at
 * T_START with the surface held at 0 °C: backward Euler, steps growing with time.
 */
export function cool(myr: number, perry: number, radio: boolean): Float64Array {
  const n = Z.length;
  const T = new Float64Array(n).fill(T_START);
  T[0] = 0;
  const k = (zMid: number) => (zMid > LID ? perry : 1);
  const heat = (z: number) => (radio && z < RADIO_DEPTH ? (RADIO_GRAD * KAPPA) / RADIO_DEPTH : 0);
  const steps = 160;
  let t = 0;
  const a = new Float64Array(n);
  const b = new Float64Array(n);
  const c = new Float64Array(n);
  const d = new Float64Array(n);
  for (let s = 1; s <= steps; s++) {
    const next = myr * (10 ** (6 * (s / steps)) - 1) / (1e6 - 1);
    const dt = next - t;
    t = next;
    if (dt <= 0) continue;
    a[0] = 0; b[0] = 1; c[0] = 0; d[0] = 0;
    for (let i = 1; i < n; i++) {
      const up = Z[i] - Z[i - 1];
      const down = i + 1 < n ? Z[i + 1] - Z[i] : up;
      const half = (up + down) / 2;
      const ku = (KAPPA * k((Z[i] + Z[i - 1]) / 2)) / up;
      const kd = i + 1 < n ? (KAPPA * k((Z[i] + Z[i + 1]) / 2)) / down : 0;
      a[i] = (-dt * ku) / half;
      c[i] = (-dt * kd) / half;
      b[i] = 1 - a[i] - c[i];
      d[i] = T[i] + dt * heat(Z[i]);
    }
    // Thomas algorithm.
    for (let i = 1; i < n; i++) {
      const m = a[i] / b[i - 1];
      b[i] -= m * c[i - 1];
      d[i] -= m * d[i - 1];
    }
    T[n - 1] = d[n - 1] / b[n - 1];
    for (let i = n - 2; i >= 0; i--) T[i] = (d[i] - c[i] * T[i + 1]) / b[i];
  }
  return T;
}

/** The gradient at the surface, °C per km, over the top 2 km. */
export function surfaceGradient(T: Float64Array): number {
  const i = Z.findIndex((z) => z >= 2);
  return T[i] / Z[i];
}

const sayAge = (myr: number) => (myr >= 1000 ? `${(myr / 1000).toFixed(myr >= 10000 ? 0 : 1)} billion years` : `${myr >= 10 ? Math.round(myr) : myr.toFixed(1)} million years`);

export const coolingFigure = figure(['kelvin'], (_ctx, t) => {
  const f = frame(W, 220, 4);
  const g = svg('g');
  f.svg.append(g);
  let logAge = 0.5;
  let perry = 1;
  let radio = false;
  const X0 = 50;
  const X1 = 380;
  const Y0 = 22;
  const Y1 = 200;
  const DEEP = 300;
  const tx = (T: number) => X0 + (T / 4000) * (X1 - X0);
  const dy = (z: number) => Y0 + (z / DEEP) * (Y1 - Y0);
  const paint = () => {
    const myr = 10 ** logAge;
    const T = cool(myr, perry, radio);
    const grad = surfaceGradient(T);
    const curve: P[] = [];
    for (let i = 0; i < Z.length && Z[i] <= DEEP; i++) curve.push([tx(T[i]), dy(Z[i])]);
    // The measured gradient, from the surface, for comparison.
    const mEnd = Math.min(DEEP, 3900 / MEASURED);
    redraw(g,
      svg('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: '#f3e8d8' }),
      ...[0, 1000, 2000, 3000, 4000].map((v) => small(tx(v), Y0 - 6, `${v}°`, { anchor: 'middle', soft: true })),
      ...[0, 100, 200, 300].map((z) => small(X0 - 5, dy(z) + 3, `${z}`, { anchor: 'end', soft: true })),
      small(X0 - 5, Y1 + 13, 'km down', { anchor: 'end', soft: true }),
      small(X1, Y1 + 13, 'temperature, °C', { anchor: 'end', soft: true }),
      perry > 1 ? line(X0, dy(LID), X1, dy(LID), COL.soft, 0.8, { 'stroke-dasharray': '3 3' }) : null,
      perry > 1 ? small(X1 - 4, dy(LID) + 12, `below: conducts ${perry}× better`, { anchor: 'end', soft: true }) : null,
      line(tx(0), dy(0), tx(MEASURED * mEnd), dy(mEnd), COL.good, 1.5, { 'stroke-dasharray': '5 3' }),
      small(tx(MEASURED * 60) + 6, dy(60), 'measured in mines', { fill: COL.good, bold: true }),
      polyline(curve, COL.heat, 2.4),
      label(tx(T[Z.findIndex((z) => z >= 150)]) + 8, dy(150), `after ${sayAge(myr)}`, { size: 'note', bold: true, fill: COL.heat, halo: '#f3e8d8' }),
    );
    const near = Math.abs(grad - MEASURED) / MEASURED < 0.12;
    f.readout.textContent = `Near the surface the rock now warms by ${Math.round(grad)} °C per km down; mines and wells measured about ${Math.round(MEASURED)}. ${
      grad > MEASURED * 1.12 ? 'Still too hot: the Earth must be older than this.'
      : grad < MEASURED * 0.88 ? (radio && grad > RADIO_GRAD * 0.8 ? 'With radioactive rock near the surface, the gradient never drops much below what the radioactivity keeps up, however old the Earth is.' : 'Too cool: the Earth must be younger than this.')
      : perry === 1 && !radio ? `A match. This is Kelvin’s answer: about ${sayAge(myr)}.` : `A match, at ${sayAge(myr)}.`}`;
    if (near && perry === 1 && !radio && t.goal === 'kelvin') t.done();
  };
  const age = slider('Age of the Earth', 0, 3.7, 0.02, logAge, (v) => sayAge(10 ** v), (v) => { logAge = v; paint(); }, 'old');
  const deep = slider('Deep rock carries heat', 0, 2, 0.05, 0, (v) => `${Math.round(10 ** v)}× better`, (v) => { perry = Math.round(10 ** v); paint(); }, 'heat');
  const rad = segmented([{ value: 'no', label: 'No radioactivity' }, { value: 'yes', label: 'Radioactive crust' }] as const, 'no', (v) => { radio = v === 'yes'; paint(); });
  f.controls.append(age.node, deep.node, rad);
  paint();
  return f.node;
});

// ---- A box of uranium atoms --------------------------------------------------------

const HALF_LIFE = 4.47; // billion years, uranium-238 to lead-206
const N_ATOMS = 200;

/**
 * When each atom decays, billions of years: quantiles of the exponential
 * spread over the atoms in a jumbled order, so the box shows the expected count.
 */
const LIFETIMES: number[] = (() => {
  const order = Array.from({ length: N_ATOMS }, (_, i) => i);
  // A fixed shuffle (a stride coprime to 200).
  const shuffled = order.map((i) => (i * 73 + 11) % N_ATOMS);
  return shuffled.map((i) => (-HALF_LIFE / Math.LN2) * Math.log(1 - (i + 0.5) / N_ATOMS));
})();

export const decayFigure = figure(['two-halves'], (_ctx, t) => {
  const f = frame(W, 190, 3);
  const g = svg('g');
  f.svg.append(g);
  let gyr = 0;
  const COLS = 20;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { x: 40, y: 10, width: 320, height: 165, rx: 8, fill: '#efe6d6' })];
    let left = 0;
    LIFETIMES.forEach((life, i) => {
      const x = 56 + (i % COLS) * 15.2;
      const y = 26 + Math.floor(i / COLS) * 15;
      const u = life > gyr;
      if (u) left++;
      parts.push(svg('circle', { cx: x, cy: y, r: u ? 5.5 : 4.5, fill: u ? COL.crystal : '#5d5a63', opacity: u ? 1 : 0.85 }));
    });
    const lead = N_ATOMS - left;
    parts.push(
      svg('circle', { cx: 60, cy: 184, r: 4.5, fill: COL.crystal }), small(68, 187, `uranium-238: ${left}`, { fill: COL.crystal, bold: true }),
      svg('circle', { cx: 200, cy: 184, r: 4, fill: '#5d5a63' }), small(208, 187, `lead-206: ${lead}`, { bold: true }),
    );
    redraw(g, ...parts);
    const halves = gyr / HALF_LIFE;
    const ratio = left ? lead / left : Infinity;
    const age = left ? HALF_LIFE * Math.log2(1 + ratio) : Infinity;
    f.readout.textContent = gyr <= 0
      ? 'A zircon crystal as it grows: it takes in uranium but no lead.'
      : `${gyr.toFixed(2)} billion years: ${halves.toFixed(2)} half-lives. ${left} uranium atoms remain, and ${lead} have become lead. Read backwards, ${lead} lead to ${left} uranium gives an age of ${Number.isFinite(age) ? age.toFixed(2) : 'more than the clock can tell'} billion years.${halves >= 2 && halves < 2.05 ? ' After two half-lives a quarter is left, not none: each half-life takes half of what remains.' : ''}`;
    if (halves >= 2 && t.goal === 'two-halves') t.done();
  };
  const time = slider('Time since the crystal grew', 0, 13.5, 0.05, 0, (v) => `${v.toFixed(2)} billion years`, (v) => { gyr = v; paint(); }, 'old');
  f.controls.append(time.node);
  paint();
  guessFirst(t, f, {
    ask: 'Uranium-238 has a half-life of 4.47 billion years: in that time, half of any sample turns to lead. Of 200 atoms, how many are left after two half-lives? Guess first.',
    options: ['None', '50', '100'],
    sliders: [time],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['none', '50', '100'][guess]}. Move time forward and count.`;
    },
  });
  return f.node;
});
