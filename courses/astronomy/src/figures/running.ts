// Lesson 20, Everything is running away: a patch of galaxies stretching, seen
// from any of them as home; and the expansion rate turned into an age, against
// the age of the Earth's rocks.

import { svg } from 'didactics/dom';
import { arrow, line, note, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider, toggles } from './kit';

const W = 400;

/** The age, years, of a universe that has always expanded at `rate` km/s per million light years (one over the rate). */
export const ageFromRate = (rate: number) => 9.461e18 / rate / 3.156e7;

/** Hubble's 1929 rate and today's, km/s per million light years. */
export const HUBBLE_1929 = 153;
export const TODAY = 21.5;

/** A patch of galaxies, scattered on a jittered grid. */
const rnd = makeRng(1929);
const GALAXIES = Array.from({ length: 30 }, (_, i) => {
  const gx = (i % 6) - 2.5;
  const gy = Math.floor(i / 6) - 2;
  return [gx * 30 + (rnd() - 0.5) * 14, gy * 30 + (rnd() - 0.5) * 14] as [number, number];
});
/** The three galaxies the reader may call home. */
const HOMES = [14, 0, 23];

export const expansionFigure = figure(['centre'], (_ctx, t) => {
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let stretch = 1.4;
  let home = 0;
  const seen = new Set<number>([0]);
  let guessed = false;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    const [hx0, hy0] = GALAXIES[HOMES[home]];
    // Left: positions relative to home, before (faint) and after stretching, with arrows.
    const cx = 110;
    const cy = 128;
    const k = 0.62;
    for (const [i, [x, y]] of GALAXIES.entries()) {
      const bx = cx + (x - hx0) * k;
      const by = cy + (y - hy0) * k;
      const ax = cx + (x - hx0) * k * stretch;
      const ay = cy + (y - hy0) * k * stretch;
      const isHome = i === HOMES[home];
      const inside = (px: number, py: number) => px > 6 && px < 214 && py > 30 && py < 240;
      if (inside(bx, by)) parts.push(svg('circle', { cx: bx, cy: by, r: 2, fill: '#6b7090' }));
      if (inside(ax, ay)) {
        if (!isHome && Math.hypot(ax - bx, ay - by) > 3 && inside(bx, by)) parts.push(arrow(bx, by, ax, ay, '#8a8fa8', 1));
        parts.push(svg('ellipse', { cx: ax, cy: ay, rx: isHome ? 5 : 3.5, ry: isHome ? 3 : 2.2, fill: isHome ? COL.light : '#c9d4ff' }));
      }
    }
    parts.push(small(cx, cy + 16, 'home', { anchor: 'middle', fill: COL.light, bold: true, halo: COL.sky }), line(220, 30, 220, 240, COL.skyLine, 1));
    // Right: speed away from home against distance from home.
    const px = (d: number) => 236 + d * 1.0;
    const py = (v: number) => 214 - v * 1.6;
    parts.push(line(236, 214, 392, 214, '#a9adc2', 1), line(236, 214, 236, 40, '#a9adc2', 1), small(392, 228, 'distance from home', { anchor: 'end', fill: '#a9adc2' }), small(240, 46, 'speed away', { fill: '#a9adc2' }));
    for (const [i, [x, y]] of GALAXIES.entries()) {
      if (i === HOMES[home]) continue;
      const d = Math.hypot(x - hx0, y - hy0);
      const v = d * (stretch - 1);
      if (px(d) > 392 || py(v) < 40) continue;
      parts.push(svg('circle', { cx: px(d), cy: py(v), r: 2.6, fill: '#c9d4ff' }));
    }
    parts.push(note(14, 20, 'A patch of the universe, stretching', { bold: true, fill: '#ece6d8' }));
    redraw(g, ...parts);
    if (!guessed) return;
    f.readout.textContent = `From galaxy ${'ABC'[home]}, every other galaxy is moving away, and the further it is, the faster: a straight line. ${seen.size < 3 ? 'Try another home.' : 'Every home sees the same. There is no centre.'}`;
    if (seen.size === 3 && t.goal === 'centre') t.done();
  };
  const s = slider('How much the patch stretches', 1, 1.6, 0.01, stretch, (v) => `${Math.round((v - 1) * 100)}% wider`, (v) => { stretch = v; paint(); }, 'light');
  const homes = toggles(['Home: galaxy A', 'Home: galaxy B', 'Home: galaxy C'], [true, false, false], (on) => {
    const k = on.findIndex((v, i) => v && i !== home);
    home = k >= 0 ? k : home;
    seen.add(home);
    [0, 1, 2].forEach((i) => homes.set(i, i === home));
    paint();
  });
  f.controls.append(s.node, homes.node);
  paint();
  guessFirst(t, f, {
    ask: 'Nearly every galaxy is moving away from us, and the further it is, the faster it goes. Does that put us at the centre? Guess first.',
    options: ['Yes, we must be at the centre', 'No: every galaxy would see the same', 'Only if the universe has an edge'],
    answer: 1,
    sliders: [s],
    buttons: homes.buttons,
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Stretch the patch, then pick a different galaxy to call home, and another.`;
    },
  });
  return f.node;
});

// ---- From rate to age (live) -----------------------------------------------------------------

export const ageFigure = figure(['age'], (_ctx, t) => {
  const H = 200;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let rate = HUBBLE_1929;
  let guessed = false;
  const paint = () => {
    const age = ageFromRate(rate);
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    // Bars in billions of years: 0..16 across 120..390.
    const bx = (gyr: number) => 120 + (Math.min(gyr, 16) / 16) * 270;
    const bar = (y: number, gyr: number, colour: string, name: string) => {
      parts.push(svg('rect', { x: 120, y, width: bx(gyr) - 120, height: 18, fill: colour }), small(114, y + 13, name, { anchor: 'end' }), small(bx(gyr) + 4, y + 13, `${sig(gyr, 2)} billion years`, {}));
    };
    parts.push(note(14, 22, 'Run the expansion back at this rate. How long ago was everything together?', { bold: true }));
    bar(44, age / 1e9, age / 1e9 < 4.4 ? COL.bad : COL.light, 'the universe');
    bar(76, 4.54, COL.earth, 'the Earth');
    bar(108, 4.4, COL.soft, 'oldest crystals');
    for (let gy = 0; gy <= 16; gy += 4) parts.push(line(bx(gy), 140, bx(gy), 146, COL.soft, 1), small(bx(gy), 158, `${gy}`, { anchor: 'middle', soft: true }));
    parts.push(small(390, 172, 'billions of years', { anchor: 'end', soft: true }));
    if (age / 1e9 < 4.54) parts.push(small(14, 192, 'A universe younger than the rocks in it: something is wrong.', { fill: COL.bad, bold: true }));
    redraw(g, ...parts);
    if (!guessed) return;
    const ok = rate >= 20 && rate <= 23;
    f.readout.textContent = ok
      ? `Galaxies a million light years further away recede about ${sig(rate, 3)} km/s faster: a universe about ${sig(age / 1e9, 2)} billion years old (the careful figure, allowing for how the rate has changed, is 13.8). Plenty of time for the rocks.`
      : `At ${sig(rate, 3)} km/s per million light years, the universe is about ${sig(age / 1e9, 2)} billion years old. ${rate > 23 ? 'Bigger distances mean a slower rate. Bring it down to today’s measured value, between 20 and 23.' : 'Too slow: today’s measurements are between 20 and 23.'}`;
    if (ok && t.goal === 'age') t.done();
  };
  const s = slider('Expansion rate', 10, 160, 0.5, rate, (v) => `${sig(v, 3)} km/s per million ly`, (v) => { rate = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Hubble’s 1929 expansion rate made the universe about 2 billion years old, younger than the Earth’s rocks. What was wrong? Guess first.',
    options: ['The ages of the rocks', 'Hubble’s distances to the galaxies', 'The idea that the universe is expanding'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}His distances were too small, so his rate was too fast. Slow the rate to today’s value and watch the age.`;
    },
  });
  return f.node;
});
