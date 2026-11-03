// Lesson 18, Dark stars: squeeze the Earth or the Sun, keeping its mass, until
// light can't get away; the Earth's orbit round a Sun-mass black hole; and
// light cones tipping over near a horizon.

import { svg } from 'didactics/dom';
import { arrow, line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider, toggles } from './kit';

const W = 400;
const G = 6.674e-11;
const C = 299792458;

export const BODIES = [
  { name: 'the Earth', kg: 5.972e24, m: 6.371e6 },
  { name: 'the Sun', kg: 1.989e30, m: 6.957e8 },
] as const;

/** Escape speed from the surface of a body of `kg` and radius `m` metres, as a share of light's speed. */
export const escapeShare = (kg: number, m: number) => Math.sqrt((2 * G * kg) / m) / C;
/** The radius, metres, at which escape needs light's speed: Michell's and Schwarzschild's size. */
export const horizon = (kg: number) => (2 * G * kg) / (C * C);

const size = (m: number) =>
  m >= 1000 ? `${sig(m / 1000, 3)} km` : m >= 1 ? `${sig(m, 3)} m` : m >= 0.01 ? `${sig(m * 100, 2)} cm` : `${sig(m * 1000, 2)} mm`;

// ---- Squeeze it (live) ----------------------------------------------------------------------

export const squashFigure = figure(['horizon'], (_ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let which = 0;
  let logR = Math.log10(BODIES[0].m);
  let guessed = false;
  const paint = () => {
    const b = BODIES[which];
    const r = 10 ** logR;
    const v = escapeShare(b.kg, r);
    const hole = v >= 1;
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    // The body, its size on a squashed scale: a ten-fold change is the same step everywhere.
    const full = Math.log10(b.m);
    const px = Math.min(56, Math.max(3, 3 + (53 * (logR - full + 9)) / 9));
    const cx = 110;
    const cy = 116;
    if (hole) {
      parts.push(svg('circle', { cx, cy, r: 26, fill: 'none', stroke: COL.light, 'stroke-width': 3, opacity: 0.7 }), svg('circle', { cx, cy, r: 22, fill: '#000' }), small(cx, cy + 50, 'a black hole', { anchor: 'middle', fill: COL.light, bold: true }));
    } else {
      parts.push(svg('circle', { cx, cy, r: px, fill: which ? COL.sun : COL.earth }));
      // A ray of light leaving the surface: it escapes, or bends back.
      const top = cy - px;
      const reach = v < 0.5 ? 30 : 60 * (1 - v);
      parts.push(arrow(cx, top - 2, cx, top - 6 - reach, COL.light, 2));
    }
    parts.push(small(cx, 196, `${b.name}, squeezed to ${size(r)} in radius`, { anchor: 'middle', fill: '#ece6d8' }));
    // The escape-speed gauge.
    parts.push(note(220, 50, 'Speed needed to escape', { fill: '#ece6d8', bold: true }), svg('rect', { x: 220, y: 60, width: 160, height: 14, fill: '#2c3350' }), svg('rect', { x: 220, y: 60, width: 160 * Math.min(1, v), height: 14, fill: hole ? COL.cool : COL.light }), line(380, 54, 380, 80, '#ece6d8', 1.5), small(380, 92, 'light’s speed', { anchor: 'end', fill: '#ece6d8' }));
    const kms = v * C / 1000;
    parts.push(small(220, 110, hole ? 'more than light’s speed' : `${kms >= 1000 ? big(kms) : sig(kms, 3)} km a second`, { fill: '#ece6d8' }));
    parts.push(small(220, 140, `Its horizon: ${size(horizon(b.kg))} in radius`, { fill: '#a9adc2' }));
    parts.push(note(14, 22, 'Same mass, smaller and smaller', { bold: true, fill: '#ece6d8' }));
    redraw(g, ...parts);
    if (!guessed) return;
    f.readout.textContent = hole
      ? `Inside ${size(horizon(b.kg))} not even light gets out: ${b.name} has become a black hole. ${which ? 'The Sun would fit inside a small town.' : 'The whole Earth, in a marble.'}`
      : `Squeezed to ${size(r)} in radius, ${b.name}’s pull at its surface needs ${sig(v * 100, 2)}% of light’s speed to escape. Keep squeezing.`;
    if (hole && t.goal === 'horizon') t.done();
  };
  const s = slider('Radius', -3, 9, 0.01, logR, (x) => size(10 ** x), (x) => { logR = x; paint(); }, 'light');
  const pick = toggles(BODIES.map((b) => (b.name === 'the Earth' ? 'Squeeze the Earth' : 'Squeeze the Sun')), [true, false], (on) => {
    const k = on.findIndex((x, i) => x && i !== which);
    which = k >= 0 ? k : which;
    pick.set(0, which === 0);
    pick.set(1, which === 1);
    logR = Math.log10(BODIES[which].m);
    s.set(logR);
    paint();
  });
  f.controls.append(s.node, pick.node);
  paint();
  guessFirst(t, f, {
    ask: 'Keep the Earth’s mass but squeeze it smaller. How small before light itself can’t escape? Guess first.',
    options: ['The size of a city', 'The size of a marble', 'It never happens to a planet'],
    answer: 1,
    sliders: [s],
    buttons: pick.buttons,
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Squeeze it and watch the speed needed to escape. Try the Sun too.`;
    },
  });
  return f.node;
});

const big = (n: number) => Math.round(n).toLocaleString('en-US');

// ---- Same mass, same orbit (a still) ---------------------------------------------------------

export const sameOrbitStill = () => {
  const H = 190;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.sky }));
  const panel = (cx: number, hole: boolean, title: string) => {
    const cy = 96;
    s.append(svg('circle', { cx, cy, r: 62, fill: 'none', stroke: COL.orbit, 'stroke-dasharray': '4 3' }));
    if (hole) s.append(svg('circle', { cx, cy, r: 3, fill: '#000', stroke: COL.light, 'stroke-width': 1.2 }));
    else s.append(svg('circle', { cx, cy, r: 16, fill: COL.sun }));
    s.append(svg('circle', { cx: cx + 44, cy: cy - 44, r: 5, fill: COL.earth }), small(cx, 180, title, { anchor: 'middle', fill: '#ece6d8' }));
  };
  panel(105, false, 'the Sun');
  panel(295, true, 'a black hole of the Sun’s mass, 6 km across');
  s.append(note(14, 20, 'The Earth’s orbit: one year, either way', { bold: true, fill: '#ece6d8' }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};

// ---- Light cones near a black hole (a still) ------------------------------------------------

export const tippingStill = () => {
  const H = 220;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.paper }));
  // Place across (the hole on the left), time up. Each cone leans more towards the hole as it gets closer.
  const hx = 120;
  s.append(svg('rect', { x: 0, y: 30, width: hx, height: 182, fill: COL.ink, opacity: 0.08 }), line(hx, 30, hx, 212, COL.ink, 2, { 'stroke-dasharray': '5 3' }), small(hx - 6, 46, 'inside', { anchor: 'end', soft: true }), small(hx + 6, 46, 'outside', { soft: true }), small(hx + 6, 206, 'the horizon', { bold: true }));
  // Drawn the way Eddington and Finkelstein did: light falling inward always runs at 45°; light aimed
  // outward leans over more and more, is vertical (hovering) at the horizon, and inside points inward too.
  const cones: [number, number][] = [[340, 0], [270, 0.15], [200, 0.3], [hx, 0.5], [55, 0.7]];
  for (const [x, lean] of cones) {
    const y = 168;
    const h = 42;
    const a = ((45 - 90 * lean) * Math.PI) / 180;
    const out: P = [x + h * Math.SQRT2 * Math.sin(a), y - h * Math.SQRT2 * Math.cos(a)];
    const inn: P = [x - h, y - h];
    s.append(svg('path', { d: `M${x} ${y} L${out[0]} ${out[1]} L${inn[0]} ${inn[1]} Z`, fill: COL.light, opacity: 0.3 }), polyline([inn, [x, y], out], COL.light, 1.8), svg('circle', { cx: x, cy: y, r: 3, fill: COL.ink }));
  }
  s.append(note(14, 20, 'Light cones, closer and closer to a black hole', { bold: true }), small(330, 186, 'far away: upright', { anchor: 'middle', soft: true }), small(6, 186, 'inside: every future', { soft: true }), small(6, 198, 'leads further in', { soft: true }));
  s.append(arrow(392, 214, 392, 176, COL.soft, 1.2), small(388, 210, 'time', { anchor: 'end', soft: true }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
