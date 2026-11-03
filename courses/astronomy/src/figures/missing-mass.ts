// Lesson 23, Unseen mass or a wrong law?: a spiral galaxy's rotation curve
// with a dark halo the reader can add; ripples in the early universe growing
// into galaxies, with and without dark matter; the CfA slice; and the Bullet
// Cluster's gas and mass, pulled apart.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;

// ---- The rotation curve (live) --------------------------------------------------------------

/** Orbit speed, km/s, from the stars and gas we can see, at `kly` thousand light years from the centre. */
export const seenSpeed = (kly: number) => {
  const a = 9;
  return Math.sqrt((200 ** 2 * 2.6 * kly * kly * a) / (kly * kly + a * a) ** 1.5);
};
/** Orbit speed, km/s, from a dark halo of strength `halo` (1 fits the measurements). */
export const haloSpeed = (kly: number, halo: number) => {
  const c = 12;
  return 200 * Math.sqrt(halo * (1 - (c / Math.max(kly, 1e-6)) * Math.atan(kly / c)));
};
export const totalSpeed = (kly: number, halo: number) => Math.hypot(seenSpeed(kly), haloSpeed(kly, halo));

/** Rubin-style measurements: the total with a halo of 1, scattered a little. */
const MEASURED = (() => {
  const rnd = makeRng(1970);
  return Array.from({ length: 24 }, (_, i) => {
    const r = 4 + i * 4;
    return [r, totalSpeed(r, 1) + (rnd() - 0.5) * 14] as [number, number];
  });
})();

export const rotationFigure = figure(['flat'], (_ctx, t) => {
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let halo = 0;
  let guessed = false;
  const rx = (kly: number) => 44 + (kly / 100) * 340;
  const vy = (v: number) => 200 - (v / 300) * 160;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    parts.push(line(44, 200, 390, 200, COL.soft, 1), line(44, 200, 44, 36, COL.soft, 1));
    for (const v of [100, 200, 300]) parts.push(line(44, vy(v), 390, vy(v), COL.grid, 1), small(40, vy(v) + 3, `${v}`, { anchor: 'end', soft: true }));
    for (const r of [0, 25, 50, 75, 100]) parts.push(small(rx(r), 214, `${r}`, { anchor: 'middle', soft: true }));
    parts.push(small(390, 228, 'distance from the centre, thousands of light years', { anchor: 'end', soft: true }), small(48, 44, 'orbit speed, km/s', { soft: true }));
    // Where the starlight ends.
    parts.push(svg('rect', { x: rx(0), y: 36, width: rx(40) - rx(0), height: 164, fill: COL.light, opacity: 0.1 }), small(rx(20), 58, 'most of the starlight', { anchor: 'middle', soft: true }));
    const curve = (fn: (r: number) => number): P[] => Array.from({ length: 101 }, (_, i) => [rx(i), vy(fn(i))]);
    parts.push(polyline(curve(seenSpeed), COL.soft, 1.5, { 'stroke-dasharray': '4 3' }), small(rx(96), vy(seenSpeed(96)) + 14, 'from what we see', { anchor: 'end', soft: true }));
    if (halo > 0) parts.push(polyline(curve((r) => haloSpeed(r, halo)), COL.hot, 1.5, { 'stroke-dasharray': '2 3' }), small(rx(96), vy(haloSpeed(96, halo)) + 14, 'from the dark halo', { anchor: 'end', fill: COL.hot }));
    parts.push(polyline(curve((r) => totalSpeed(r, halo)), COL.model, 2.5));
    for (const [r, v] of MEASURED) parts.push(svg('circle', { cx: rx(r), cy: vy(v), r: 2.8, fill: COL.ink }));
    parts.push(note(14, 20, 'A spiral galaxy’s rotation curve: measured (dots), predicted (line)', { bold: true }));
    redraw(g, ...parts);
    if (!guessed) return;
    const ok = Math.abs(halo - 1) < 0.12;
    f.readout.textContent = ok
      ? `It fits: the halo needed holds about five times the mass of all the stars and gas, spread far beyond them.`
      : halo === 0
        ? 'With only the mass we can see, the outer stars should orbit more and more slowly, like the outer planets. They don’t. Add unseen mass in a halo round the galaxy.'
        : `${halo < 1 ? 'Not enough: the outer stars still outrun the prediction.' : 'Too much: now the prediction outruns the stars.'}`;
    if (ok && t.goal === 'flat') t.done();
  };
  const s = slider('Unseen mass in a halo', 0, 2.5, 0.01, halo, (v) => (v === 0 ? 'none' : `${sig(v * 5, 2)} × the visible mass`), (v) => { halo = v; paint(); }, 'hot');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Stars far out in a spiral galaxy, beyond most of its light: compared with stars further in, how fast should they orbit? And how fast do they? Guess what is measured.',
    options: ['Slower, like the outer planets', 'About as fast as the inner ones', 'Much faster'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right: the curve stays flat. ' : 'They stay about as fast. '}With only what we can see, the prediction falls away. Add unseen mass until it fits.`;
    },
  });
  return f.node;
});

// ---- Ripples growing into galaxies (live) -----------------------------------------------------

/** How much denser than average the ripples are today, starting from one part in 100,000 in the afterglow, with `dark` the share of matter that is dark (a simplified model: ordinary ripples grow in step with the universe's size, 1,100 times; dark matter's had a head start). */
export const ripplesToday = (dark: number) => 1e-5 * 1100 * (1 + 199 * (dark / 0.84) ** 2);

export const ripplesFigure = figure(['galaxies'], (_ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let dark = 0;
  let guessed = false;
  // Log time across from 10,000 years to 13.8 billion; log contrast up from 10⁻⁶ to 10.
  const tx = (y: number) => 72 + ((Math.log10(y) - 4) / (Math.log10(13.8e9) - 4)) * 313;
  const dy = (d: number) => 200 - ((Math.log10(d) + 6) / 7) * 160;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    parts.push(line(72, dy(1), 385, dy(1), COL.light, 1, { 'stroke-dasharray': '4 3' }), small(385, dy(1) - 5, 'twice the average: gravity takes over, galaxies form', { anchor: 'end', fill: COL.light }));
    parts.push(line(tx(380000), 30, tx(380000), 200, COL.skyLine, 1), small(tx(380000) + 3, 214, 'afterglow', { fill: '#a9adc2' }), small(385, 214, 'today', { anchor: 'end', fill: '#a9adc2' }), small(72, 214, '10,000 yr', { fill: '#a9adc2' }));
    for (const [d, text] of [[1e-5, '1 in 100,000'], [1e-2, '1 in 100'], [1, 'double']] as const) parts.push(small(68, dy(d) + 3, text, { anchor: 'end', fill: '#a9adc2' }));
    // Ordinary matter: held flat by light's push until the afterglow, then growing with the universe's size (as time to the two-thirds).
    const grow = (d0: number, from: number): P[] => Array.from({ length: 60 }, (_, i) => {
      const y = 10 ** (Math.log10(from) + ((Math.log10(13.8e9) - Math.log10(from)) * i) / 59);
      return [tx(y), dy(Math.min(10, d0 * (y / from) ** (2 / 3)))];
    });
    const plain: P[] = [[tx(1e4), dy(1e-5)], [tx(380000), dy(1e-5)], ...grow(1e-5, 380000)];
    parts.push(polyline(plain, '#a9adc2', 2), small(tx(2e8), dy(1e-5 * (2e8 / 380000) ** (2 / 3)) + 14, 'ordinary matter alone', { fill: '#a9adc2' }));
    if (dark > 0) {
      // Dark matter ignores light's push, so its clumps grow from early on, and ordinary matter falls into them after the afterglow.
      const boost = 1 + 199 * (dark / 0.84) ** 2;
      const d0 = 1e-5 * boost;
      const start = 380000 / boost ** 1.5;
      const pts: P[] = [[tx(Math.max(1e4, start)), dy(1e-5)], ...grow(1e-5, Math.max(1e4, start)).filter(([x]) => x <= tx(380000)), ...grow(d0, 380000)];
      parts.push(polyline(pts, COL.hot, 2.5));
    }
    parts.push(note(14, 20, 'How much denser the dense patches are than average', { bold: true, fill: '#ece6d8' }));
    redraw(g, ...parts);
    if (!guessed) return;
    const today = ripplesToday(dark);
    const ok = today >= 1;
    f.readout.textContent = ok
      ? `With ${Math.round(dark * 100)}% of matter dark, the ripples have grown enough to collapse into galaxies by today. The measured share is about 84%. (This is a simplified picture of the growth.)`
      : `With ${Math.round(dark * 100)}% of matter dark, today’s dense patches are only ${sig(today * 100, 2)}% denser than average. No galaxies, no stars, no us. Add dark matter.`;
    if (ok && t.goal === 'galaxies') t.done();
  };
  const s = slider('Share of matter that is dark', 0, 0.9, 0.01, dark, (v) => `${Math.round(v * 100)}%`, (v) => { dark = v; paint(); }, 'hot');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'The afterglow’s ripples are one part in 100,000. Gravity makes them grow in step with the universe’s size, which has grown 1,100 times since. Enough to make galaxies? Guess first.',
    options: ['Yes, easily', 'No: they would be only about 1% denser today', 'They would have faded away'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}One part in 100,000, times 1,100, is about one percent. Add matter that light can’t push around, and see what it takes to make galaxies.`;
    },
  });
  return f.node;
});

// ---- The CfA slice (a still) -----------------------------------------------------------------

export const cfaStill = () => {
  const H = 230;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.sky }));
  // A fan, with us at the bottom point: each galaxy at its direction and its distance.
  const ox = 200;
  const oy = 214;
  const R = 190;
  const a0 = -Math.PI / 2 - 0.85;
  const a1 = -Math.PI / 2 + 0.85;
  const wedge = `M${ox} ${oy} L${ox + R * Math.cos(a0)} ${oy + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${ox + R * Math.cos(a1)} ${oy + R * Math.sin(a1)} Z`;
  s.append(svg('path', { d: wedge, fill: '#1d2440', stroke: COL.skyLine }));
  const rnd = makeRng(1986);
  const inside = (x: number, y: number) => {
    const a = Math.atan2(y - oy, x - ox);
    return Math.hypot(x - ox, y - oy) < R && a > a0 && a < a1;
  };
  // Bubbles: galaxies sit on their walls, leaving voids inside.
  const bubbles: [number, number, number][] = [[150, 110, 34], [230, 95, 30], [280, 140, 26], [120, 165, 24], [190, 160, 22], [250, 60, 22], [160, 55, 20], [315, 95, 20]];
  for (const [bx, by, br] of bubbles) {
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2;
      const r = br * (0.93 + rnd() * 0.12);
      const x = bx + r * Math.cos(a);
      const y = by + r * Math.sin(a);
      if (inside(x, y)) s.append(svg('circle', { cx: x, cy: y, r: 0.9, fill: '#c9d4ff' }));
    }
  }
  // The Coma cluster: stretched along our line of sight by its galaxies' speeds, the stick figure's body.
  for (let i = 0; i < 70; i++) s.append(svg('circle', { cx: 200 + (rnd() - 0.5) * 6, cy: 84 + (rnd() - 0.5) * 50, r: 0.9, fill: '#ffe6b0' }));
  s.append(small(206, 64, 'Coma cluster', { fill: '#ffe6b0', halo: '#1d2440' }), small(ox, oy + 12, 'us', { anchor: 'middle', fill: '#ece6d8' }), small(ox + R * Math.cos(a1) - 2, oy + R * Math.sin(a1) + 22, '700 million ly', { anchor: 'end', fill: '#a9adc2' }));
  s.append(note(14, 20, 'A slice of the universe, 1986', { bold: true, fill: '#ece6d8' }), small(14, 34, '(redrawn, simplified)', { fill: '#a9adc2' }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};

// ---- The Bullet Cluster (a still) -------------------------------------------------------------

export const bulletStill = () => {
  const H = 200;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.sky }));
  const rnd = makeRng(2006);
  // Galaxies and mass on the outside, gas left behind in the middle.
  for (const [cx, n] of [[86, 40], [322, 26]] as const) {
    for (let k = 3; k >= 1; k--) s.append(svg('ellipse', { cx, cy: 100, rx: 20 * k, ry: 17 * k, fill: 'none', stroke: '#7fa7e0', 'stroke-width': 1.3, opacity: 0.4 + 0.15 * (3 - k) }));
    for (let i = 0; i < n; i++) s.append(svg('circle', { cx: cx + (rnd() - 0.5) * 50, cy: 100 + (rnd() - 0.5) * 44, r: 1.2 + rnd(), fill: '#ffe6b0' }));
  }
  s.append(svg('ellipse', { cx: 186, cy: 100, rx: 30, ry: 26, fill: '#e86fa0', opacity: 0.45 }), svg('path', { d: 'M250 100 C240 82 230 78 218 80 L228 100 L218 120 C230 122 240 118 250 100 Z', fill: '#e86fa0', opacity: 0.6 }));
  s.append(
    note(14, 20, 'The Bullet Cluster: two clusters that passed through each other', { bold: true, fill: '#ece6d8' }),
    small(200, 166, 'hot gas (most of the ordinary matter), seen in X-rays', { anchor: 'middle', fill: '#e86fa0' }),
    small(14, 186, 'blue rings: where the mass is, from lensing', { fill: '#7fa7e0' }),
    small(386, 186, 'yellow: galaxies', { anchor: 'end', fill: '#ffe6b0' }),
  );
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
