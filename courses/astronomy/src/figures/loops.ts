// Lesson 2, Planets that loop backwards: retrograde motion as the Earth
// overtaking an outer planet, and Kepler's ellipse with its equal areas.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng, shuffle } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider, startRng } from './kit';

const W = 400;
const TAU = Math.PI * 2;
const deg = (r: number) => (r * 180) / Math.PI;

// ---- Retrograde loops --------------------------------------------------------------------

/** Days shown; the planet is opposite the Sun (Earth passing it) at the middle. */
const DAYS = 800;
const OPP = DAYS / 2;
/** The orbit's tilt, exaggerated from Mars's 1.85° so the loop opens. */
const TILT = (4 * Math.PI) / 180;

interface Seen {
  earth: P;
  planet: P;
  /** Direction from Earth to the planet, radians, east positive. */
  lon: number;
  /** Height above the Earth's orbital plane as seen, radians. */
  lat: number;
}

/** Where things are on `day` for an outer planet `a` times the Earth's distance (circular orbits, Kepler's third law). */
export function seen(day: number, a: number): Seen {
  const yr = (day - OPP) / 365.25;
  const te = TAU * yr;
  const tp = (TAU * yr) / a ** 1.5;
  const earth: P = [Math.cos(te), Math.sin(te)];
  const planet: P = [a * Math.cos(tp), a * Math.sin(tp)];
  const dx = planet[0] - earth[0];
  const dy = planet[1] - earth[1];
  const z = a * Math.sin(TILT) * Math.sin(tp + 0.6);
  return { earth, planet, lon: Math.atan2(dy, dx), lat: Math.atan2(z, Math.hypot(dx, dy)) };
}

/** The backward run around opposition: how wide (degrees) and how long (days). */
export function backward(a: number): { width: number; days: number } {
  const lons: number[] = [];
  let prev = seen(0, a).lon;
  let acc = prev;
  for (let d = 0; d <= DAYS; d++) {
    const l = seen(d, a).lon;
    let step = l - prev;
    if (step > Math.PI) step -= TAU;
    if (step < -Math.PI) step += TAU;
    acc += step;
    prev = l;
    lons.push(acc);
  }
  let first = OPP;
  while (first > 0 && lons[first - 1] > lons[first]) first--;
  let last = OPP;
  while (last < DAYS && lons[last + 1] < lons[last]) last++;
  return { width: deg(lons[first] - lons[last]), days: last - first };
}

const BACKGROUND = (() => {
  const rng = makeRng(11);
  return Array.from({ length: 70 }, () => [rng(), rng(), 0.5 + rng() * 1.2]);
})();

export const retrogradeFigure = figure(['backwards'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let a = 1.52;
  let day = 330;
  let sawBack = false;
  const paint = () => {
    const now = seen(day, a);
    const scale = 82 / a;
    const sun: P = [100, 125];
    const at = (p: P): P => [sun[0] + p[0] * scale, sun[1] - p[1] * scale];
    const e = at(now.earth);
    const p = at(now.planet);
    const far: P = [e[0] + Math.cos(now.lon) * 400, e[1] - Math.sin(now.lon) * 400];
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 250, fill: COL.paper }),
      svg('rect', { x: 0, y: 0, width: 200, height: 250, fill: COL.paper }),
      svg('circle', { cx: sun[0], cy: sun[1], r: scale, fill: 'none', stroke: COL.orbit, 'stroke-width': 1 }),
      svg('circle', { cx: sun[0], cy: sun[1], r: scale * a, fill: 'none', stroke: COL.orbit, 'stroke-width': 1 }),
      line(e[0], e[1], far[0], far[1], COL.light, 1.4),
      svg('circle', { cx: sun[0], cy: sun[1], r: 7, fill: COL.sun }),
      svg('circle', { cx: e[0], cy: e[1], r: 5, fill: COL.earth }),
      svg('circle', { cx: p[0], cy: p[1], r: 5, fill: COL.planet }),
      small(e[0] + 7, e[1] + 12, 'Earth', { fill: COL.earth, bold: true }),
      small(p[0] + 7, p[1] - 6, 'planet', { fill: COL.planet, bold: true }),
      small(10, 16, 'From above', { bold: true }),
    ];
    // The sky strip: the planet's track against the stars, as seen from Earth.
    const x0 = 210;
    const x1 = 392;
    const mid = (x0 + x1) / 2;
    const ref = seen(OPP, a).lon;
    const sx = (lon: number) => {
      let d = lon - ref;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      return mid - (deg(d) / 60) * ((x1 - x0) / 2);
    };
    const syy = (lat: number) => 125 - (deg(lat) / 6) * 90;
    parts.push(
      svg('rect', { x: x0 - 4, y: 30, width: x1 - x0 + 8, height: 190, fill: COL.sky, rx: 4 }),
      ...BACKGROUND.map(([u, v, r]) => svg('circle', { cx: x0 + u * (x1 - x0), cy: 34 + v * 182, r, fill: '#e8e6f2', opacity: 0.7 })),
    );
    const track: P[] = [];
    for (let d = 0; d <= day; d += 2) {
      const s = seen(d, a);
      const x = sx(s.lon);
      if (x >= x0 - 2 && x <= x1 + 2) track.push([x, syy(s.lat)]);
    }
    if (track.length > 1) parts.push(polyline(track, COL.planet, 2));
    const px = sx(now.lon);
    if (px >= x0 - 2 && px <= x1 + 2) parts.push(svg('circle', { cx: px, cy: syy(now.lat), r: 4.5, fill: COL.planet, stroke: COL.paper, 'stroke-width': 1 }));
    parts.push(
      small(x0, 16, 'Seen from Earth, against the stars', { bold: true }),
      small(x0, 238, '← east', { soft: true }),
      small(x1, 238, 'west →', { anchor: 'end', soft: true }),
    );
    redraw(g, ...parts);
    const dl = seen(day + 1, a).lon - seen(day - 1, a).lon;
    const step = dl > Math.PI ? dl - TAU : dl < -Math.PI ? dl + TAU : dl;
    const back = step < 0;
    if (back) sawBack = true;
    const run = backward(a);
    const name = Math.abs(a - 1.52) < 0.06 ? 'Mars' : Math.abs(a - 5.2) < 0.15 ? 'Jupiter' : `a planet ${sig(a, 2)} times the Earth’s distance from the Sun`;
    f.readout.textContent = back
      ? `Day ${Math.round(day)}: the Earth, on its smaller, faster orbit, is overtaking ${name}, so ${name.startsWith('a ') ? 'it' : name} slides backwards (west) against the stars. This backward run lasts ${run.days} days and spans ${sig(run.width, 2)}°.`
      : Math.abs(step) < 0.002
        ? `Day ${Math.round(day)}: ${name.startsWith('a ') ? 'the planet' : name} seems to stand still against the stars as the Earth begins to catch up or pull away.`
        : `Day ${Math.round(day)}: ${name.startsWith('a ') ? 'the planet' : name} drifts east against the stars, its usual direction. Move on through the days when the Earth passes it.`;
    if (sawBack && t.goal === 'backwards') t.done();
  };
  const sd = slider('Day', 0, DAYS, 2, day, (v) => `${Math.round(v)}`, (v) => { day = v; paint(); }, 'light');
  const sa = slider('Planet’s distance from the Sun', 1.3, 5.2, 0.02, a, (v) => `${v.toFixed(2)} × Earth’s`, (v) => { a = v; paint(); }, 'planet');
  f.controls.append(sd.node, sa.node);
  paint();
  if (t.card) {
    // A flash card: two planets out of the Earth's way, nearer and farther, in an order of its own.
    const rnd = startRng(t);
    const [p, q] = shuffle([1.5, 2.8, 5.2], rnd).slice(0, 2);
    const options = shuffle([`The one ${p} times the Earth’s distance`, `The one ${q} times the Earth’s distance`], rnd);
    const nearer = Math.min(p, q);
    guessFirst(t, f, {
      ask: `Two planets circle the Sun outside the Earth’s orbit, one ${p} and one ${q} times as far out as the Earth. As the Earth overtakes each, which slides backwards across a wider stretch of sky? Guess first.`,
      options: [...options, 'Both the same'],
      answer: options.findIndex((o) => o.includes(` ${nearer} times`)),
      sliders: [sd, sa],
      after: () => paint(),
    });
  } else {
    guessFirst(t, f, {
      ask: 'Jupiter is about five times as far from the Sun as the Earth, Mars about one and a half. Compared with Mars, is Jupiter’s backward run across the sky wider or narrower? Guess first.',
      options: ['Wider', 'Narrower', 'About the same'],
      answer: 1, reveal: 'done',
      sliders: [sd, sa],
      after: () => paint(),
    });
  }
  return f.node;
}, {
  card: {
    front: 'Two outer planets, at different distances from the Sun. As the Earth overtakes each, which slides backwards across the wider stretch of sky? Guess, then watch.',
    back: 'The nearer one: its backward run is the Earth’s own motion seen against the stars, and like any parallax it shrinks with distance.',
  },
});

// ---- Kepler's ellipse ----------------------------------------------------------------------

/** Kepler's equation, M = E − e sin E, solved for E. */
export function eccentricAnomaly(m: number, e: number): number {
  let x = e > 0.8 ? Math.PI : m;
  for (let k = 0; k < 50; k++) x -= (x - e * Math.sin(x) - m) / (1 - e * Math.cos(x));
  return x;
}

/** Speed nearest the Sun over speed farthest from it. */
export const speedRatio = (e: number) => (1 + e) / (1 - e);

export const ellipseFigure = figure(['fast-near'], (_ctx, t) => {
  const f = frame(W, 290, 3);
  const g = svg('g');
  f.svg.append(g);
  let e = 0.3;
  const A = 130;
  const paint = () => {
    const b = A * Math.sqrt(1 - e * e);
    const c: P = [200 - A * e * 0.5, 138];
    const focus: P = [c[0] + A * e, c[1]];
    const pos = (mAnom: number): P => {
      const ea = eccentricAnomaly(mAnom, e);
      return [c[0] + A * Math.cos(ea), c[1] - b * Math.sin(ea)];
    };
    const parts: SVGElement[] = [svg('rect', { width: W, height: 290, fill: COL.paper })];
    const n = 12;
    for (let k = 0; k < n; k++) {
      const pts: P[] = [focus];
      for (let s = 0; s <= 10; s++) pts.push(pos(((k + s / 10) / n) * TAU));
      parts.push(svg('polygon', { points: pts.map((q) => q.join(',')).join(' '), fill: k % 2 ? COL.light : COL.earth, opacity: 0.32, stroke: COL.paper, 'stroke-width': 0.8 }));
    }
    const ring: P[] = [];
    for (let s = 0; s <= 120; s++) ring.push([c[0] + A * Math.cos((s / 120) * TAU), c[1] - b * Math.sin((s / 120) * TAU)]);
    parts.push(polyline(ring, COL.orbit, 1.5));
    for (let k = 0; k < n; k++) {
      const q = pos((k / n) * TAU);
      parts.push(svg('circle', { cx: q[0], cy: q[1], r: 3.2, fill: COL.planet }));
    }
    parts.push(
      svg('circle', { cx: focus[0], cy: focus[1], r: 7, fill: COL.sun }),
      note(focus[0], focus[1] + 24, 'Sun', { anchor: 'middle', bold: true }),
      small(200, 284, 'Dots: where the planet is at each twelfth of its year. Every wedge has the same area.', { anchor: 'middle', soft: true }),
    );
    redraw(g, ...parts);
    const r = speedRatio(e);
    const like = e < 0.03 ? ' (the Earth’s orbit is about 0.017: almost a circle)' : Math.abs(e - 0.093) < 0.02 ? ' (Mars, which gave Kepler his ellipse)' : Math.abs(e - 0.21) < 0.02 ? ' (Mercury)' : e > 0.6 ? ' (like a comet’s)' : '';
    f.readout.textContent = e < 0.01
      ? 'A circle: the planet moves at one steady speed, and the twelve wedges are identical.'
      : `Eccentricity ${e.toFixed(2)}${like}. The planet covers each wedge in the same time, so near the Sun, where the wedges are short and wide, it moves ${sig(r, 2)} times as fast as at the far end.`;
    if (e >= 0.5 && t.goal === 'fast-near') t.done();
  };
  const s = slider('How stretched (eccentricity)', 0, 0.9, 0.01, e, (v) => v.toFixed(2), (v) => { e = v; paint(); }, 'planet');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'A planet on a stretched orbit: where does it move fastest? Guess first.',
    options: ['Nearest the Sun', 'Farthest from the Sun', 'At the same speed all the way round'],
    answer: 0, reveal: 'done',
    sliders: [s],
    after: () => paint(),
  });
  return f.node;
});
