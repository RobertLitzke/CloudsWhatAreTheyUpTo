// Lesson 4, A planet found with a pen: Uranus pulled ahead and then back by
// an unseen planet, and the reader places that planet as Le Verrier did; and
// Mercury's turning orbit, with the Vulcan that was never there.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;
const TAU = Math.PI * 2;
const rad = (d: number) => (d * Math.PI) / 180;
/** The Sun's pull in AU³/yr², and an Earth mass in Suns. */
const GM = 4 * Math.PI * Math.PI;
const EARTH = 3.003e-6;

const AU_U = 19.19;
const AU_N = 30.07;
const P_U = AU_U ** 1.5;
const P_N = AU_N ** 1.5;
/** Uranus overtook the unseen planet here: the year and the direction (degrees). */
const MEET = 1822;
const MEET_AT = 272;
/** Where Neptune stood when Galle found it in September 1846. */
export const FOUND_YEAR = 1846.7;
export const NEPTUNE_AT = MEET_AT + (360 * (FOUND_YEAR - MEET)) / P_N;
export const NEPTUNE_MASS = 17.1;
const START = 1781;
const END = 1846;

const uranusAt = (yr: number) => rad(MEET_AT) + (TAU * (yr - MEET)) / P_U;

/** How far Uranus runs ahead (+) of the best orbit without the unseen planet, arcseconds, each year from 1781, pulled by a planet of `mass` Earths that stood at `at1846` degrees in 1846. */
export function residuals(mass: number, at1846: number): number[] {
  const m = mass * EARTH * GM;
  const lam0 = uranusAt(START);
  let x = AU_U * Math.cos(lam0);
  let y = AU_U * Math.sin(lam0);
  const v = Math.sqrt(GM / AU_U);
  let vx = -v * Math.sin(lam0);
  let vy = v * Math.cos(lam0);
  const hidden = (yr: number): P => {
    const a = rad(at1846) + (TAU * (yr - FOUND_YEAR)) / P_N;
    return [AU_N * Math.cos(a), AU_N * Math.sin(a)];
  };
  const acc = (yr: number, px: number, py: number): P => {
    const r3 = Math.hypot(px, py) ** 3;
    const [nx, ny] = hidden(yr);
    const dx = nx - px;
    const dy = ny - py;
    const d3 = Math.hypot(dx, dy) ** 3;
    const n3 = AU_N ** 3;
    // The Sun's pull, the planet's pull, and the planet's pull on the Sun (which moves the frame).
    return [-GM * px / r3 + m * (dx / d3 - nx / n3), -GM * py / r3 + m * (dy / d3 - ny / n3)];
  };
  const out: number[] = [0];
  const dt = 0.05;
  let yr = START;
  const steps = Math.round(1 / dt);
  for (let year = START + 1; year <= END; year++) {
    for (let k = 0; k < steps; k++) {
      const [ax, ay] = acc(yr, x, y);
      vx += (ax * dt) / 2;
      vy += (ay * dt) / 2;
      x += vx * dt;
      y += vy * dt;
      yr += dt;
      const [bx, by] = acc(yr, x, y);
      vx += (bx * dt) / 2;
      vy += (by * dt) / 2;
    }
    let d = Math.atan2(y, x) - uranusAt(year);
    d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
    out.push((d * 180 * 3600) / Math.PI);
  }
  return detrend(out);
}

/** Bouvard's tables of 1821 fitted the observations up to then (years after 1781). */
const FITTED = 40;

/**
 * Bouvard's 1821 tables fitted Uranus's orbit to the observations up to then,
 * which soaks up a steady drift and a once-per-orbit swing. Do the same: the
 * least-squares fit of a + b·t + c·sin λ + d·cos λ to 1781 to 1821, taken
 * from every year. After 1821 the tables run on unaided, and the misfit grows.
 */
function detrend(r: number[]): number[] {
  const rows = r.map((_, i) => {
    const l = uranusAt(START + i);
    return [1, i / 65, Math.sin(l), Math.cos(l)];
  });
  const n = 4;
  const fit = rows.slice(0, FITTED + 1);
  const m = Array.from({ length: n }, (_, a) => [...Array.from({ length: n }, (_, b) => fit.reduce((s, x) => s + x[a] * x[b], 0)), fit.reduce((s, x, i) => s + x[a] * r[i], 0)]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let k = col + 1; k < n; k++) if (Math.abs(m[k][col]) > Math.abs(m[piv][col])) piv = k;
    [m[col], m[piv]] = [m[piv], m[col]];
    for (let k = 0; k < n; k++) {
      if (k === col) continue;
      const q = m[k][col] / m[col][col];
      for (let j = col; j <= n; j++) m[k][j] -= q * m[col][j];
    }
  }
  const c = m.map((row, k) => row[n] / row[k]);
  return r.map((v, i) => v - rows[i].reduce((s, x, k) => s + x * c[k], 0));
}

export const SEEN = residuals(NEPTUNE_MASS, NEPTUNE_AT);
const AMP = Math.max(...SEEN.map(Math.abs));

/** How far two curves are apart, as a share of the observed swing. */
export const misfit = (model: number[]) => Math.sqrt(model.reduce((s, v, i) => s + (v - SEEN[i]) ** 2, 0) / model.length) / AMP;

export const uranusFigure = figure(['found'], (_ctx, t) => {
  const f = frame(W, 260, 3);
  const g = svg('g');
  f.svg.append(g);
  let mass = 17;
  let at = 200;
  const paint = () => {
    const model = residuals(mass, at);
    const parts: SVGElement[] = [svg('rect', { width: W, height: 260, fill: COL.paper })];
    // The orbits, from above, in 1846.
    const c: P = [70, 80];
    const k = 2;
    const pos = (au: number, a: number): P => [c[0] + au * k * Math.cos(rad(a)), c[1] - au * k * Math.sin(rad(a))];
    const u = pos(AU_U, (uranusAt(FOUND_YEAR) * 180) / Math.PI);
    const h = pos(AU_N, at);
    const real = pos(AU_N, NEPTUNE_AT);
    parts.push(
      svg('circle', { cx: c[0], cy: c[1], r: AU_U * k, fill: 'none', stroke: COL.orbit }),
      svg('circle', { cx: c[0], cy: c[1], r: AU_N * k, fill: 'none', stroke: COL.orbit, 'stroke-dasharray': '3 3' }),
      svg('circle', { cx: c[0], cy: c[1], r: 4, fill: COL.sun }),
      svg('circle', { cx: u[0], cy: u[1], r: 4, fill: COL.earth }),
      svg('circle', { cx: h[0], cy: h[1], r: 3 + mass / 8, fill: COL.model, opacity: 0.85 }),
      small(u[0] + 6, u[1] + 4, 'Uranus', { fill: COL.earth, bold: true }),
      small(10, 160, 'In 1846, from above', { soft: true }),
    );
    if (t.restored || doneNow) parts.push(svg('circle', { cx: real[0], cy: real[1], r: 6, fill: 'none', stroke: COL.good, 'stroke-width': 2 }));
    // The chart: Uranus ahead (+) or behind (−) of its path alone.
    const x0 = 150;
    const x1 = 378;
    const cx = (yr: number) => x0 + ((yr - START) / (END - START)) * (x1 - x0);
    const top = Math.ceil((AMP * 1.5) / 10) * 10;
    const cy = (s: number) => 95 - (s / top) * 75;
    parts.push(
      line(x0, cy(0), x1, cy(0), COL.ink, 1),
      line(x0, 20, x0, 170, COL.ink, 1),
      small(x0 + 4, 16, 'Uranus ahead of (+) or behind (−) the 1821 tables', { bold: true }),
      line(cx(1821), 20, cx(1821), 170, COL.grid, 1),
      small(cx(1821) - 3, 168, 'tables made', { anchor: 'end', soft: true }),
      small(x0 - 4, cy(top) + 4, `+${top}″`, { anchor: 'end', soft: true }),
      small(x0 - 4, cy(-top) + 4, `−${top}″`, { anchor: 'end', soft: true }),
      ...[1781, 1800, 1821, 1846].map((yr) => small(cx(yr), 186, String(yr), { anchor: 'middle', soft: true })),
      polyline(SEEN.map((s, i) => [cx(START + i), cy(s)] as P), COL.seen, 2.5),
      polyline(model.map((s, i) => [cx(START + i), cy(s)] as P), COL.model, 2, { 'stroke-dasharray': '5 3' }),
      small(x1, 204, 'solid: observed   dashed: your planet', { anchor: 'end', soft: true }),
      note(200, 236, '″ = seconds of arc; 60″ is a minute of arc, 3,600″ a degree', { anchor: 'middle', soft: true }),
    );
    redraw(g, ...parts);
    const miss = misfit(model);
    let off = Math.abs(at - NEPTUNE_AT) % 360;
    if (off > 180) off = 360 - off;
    const fits = miss < 0.15 && off < 10;
    f.readout.textContent = fits
      ? `That fits. A planet of about ${Math.round(mass)} Earth masses, in that direction. On 23 September 1846 Johann Galle pointed the Berlin telescope there and found Neptune within a degree of Le Verrier’s spot (circled).`
      : mass < 1
        ? 'With no unseen planet, Uranus follows its path exactly, and the observed wander is left unexplained.'
        : miss < 0.4
          ? `Close: the wander has the right shape. Fine-tune the direction and the mass.`
          : `By 1846 your planet leaves Uranus ${sig(Math.abs(model[model.length - 1]), 2)}″ ${model[model.length - 1] > 0 ? 'ahead of' : 'behind'} the tables; the observations put it ${sig(Math.abs(SEEN[SEEN.length - 1]), 2)}″ behind, and the timing of the drift must match too. Move the planet around its orbit, and change its mass.`;
    if (fits) doneNow = true;
    if (fits && t.goal === 'found') t.done();
  };
  let doneNow = false;
  const sa = slider('Unseen planet’s direction in 1846', 0, 359, 1, at, (v) => `${Math.round(v)}°`, (v) => { at = v; paint(); }, 'model');
  const sm = slider('Its mass', 0, 40, 0.5, mass, (v) => `${sig(v, 2)} Earths`, (v) => { mass = v; paint(); }, 'model');
  f.controls.append(sa.node, sm.node);
  paint();
  guessFirst(t, f, {
    ask: 'Tables made in 1821 fitted every sighting of Uranus until then. After 1821 Uranus fell further and further behind them. Where was the unseen planet in the 1830s? Guess first.',
    options: ['Ahead of Uranus, pulling it on', 'Behind Uranus, pulling it back', 'Right beside it'],
    sliders: [sa, sm],
    after: (guess) => {
      paint();
      f.readout.textContent = `${guess === 1 ? 'Yes. ' : ''}Uranus, the faster planet, overtook it around 1822; after that it trailed behind and pulled Uranus back. ${f.readout.textContent}`;
    },
  });
  return f.node;
});

// ---- Mercury's turning orbit: a still ---------------------------------------------------------

export const mercuryStill = () => {
  const s = svg('svg', { viewBox: `0 0 ${W} 210`, class: 'fig-svg', role: 'img' });
  const c: P = [200, 105];
  const parts: SVGElement[] = [svg('rect', { width: W, height: 210, fill: COL.paper })];
  const e = 0.45;
  const a = 70;
  for (let k = 0; k < 5; k++) {
    const turn = rad(k * 14);
    const pts: P[] = [];
    for (let s2 = 0; s2 <= 90; s2++) {
      const u = (s2 / 90) * TAU;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(u));
      pts.push([c[0] + r * Math.cos(u + turn), c[1] - r * Math.sin(u + turn)]);
    }
    parts.push(polyline(pts, COL.planet, 1.3, { opacity: 0.35 + k * 0.15 }));
  }
  parts.push(
    svg('circle', { cx: c[0], cy: c[1], r: 18, fill: 'none', stroke: COL.soft, 'stroke-dasharray': '3 3' }),
    svg('circle', { cx: c[0] + 13, cy: c[1] - 13, r: 3, fill: 'none', stroke: COL.soft }),
    small(c[0] + 20, c[1] - 22, 'Vulcan?', { soft: true }),
    svg('circle', { cx: c[0], cy: c[1], r: 7, fill: COL.sun }),
    note(200, 200, 'Mercury’s orbit turns a little each time round (hugely exaggerated here).', { anchor: 'middle' }),
  );
  s.append(...parts);
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
