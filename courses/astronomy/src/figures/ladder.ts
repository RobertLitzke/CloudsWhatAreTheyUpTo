// Lesson 8, A schoolteacher's number puzzle: Balmer's four lines and the
// ones his rule predicted; hydrogen's energy ladder, where a fall between two
// rungs gives light of one colour; and the notes that fit on a string.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';
import { wavelengthColour } from './light';

const W = 400;

/** Balmer's number, nm. */
export const BALMER = 364.56;
/** The line Balmer's rule gives for the n-th rung falling to the second. */
export const balmerLine = (n: number) => (BALMER * n * n) / (n * n - 4);
/** Hydrogen's rungs, electronvolts below free: Bohr's 13.6 over the rung number squared. */
export const rungEnergy = (n: number) => -13.6 / (n * n);
/** The wavelength, nm, of the light given out in a fall from rung `from` to rung `to`. */
export const fallNm = (from: number, to: number) => 1239.84 / (rungEnergy(from) - rungEnergy(to));

/** What a wavelength is called. */
export const band = (nm: number) => (nm < 380 ? 'ultraviolet' : nm > 750 ? 'infrared' : 'visible');

/** A strip of spectrum from `a` to `b` nm, at x0..x1, y, h high. */
function strip(x0: number, x1: number, y: number, h: number, a: number, b: number): SVGElement[] {
  const out: SVGElement[] = [];
  const n = 60;
  for (let i = 0; i < n; i++) {
    const nm = a + ((b - a) * (i + 0.5)) / n;
    out.push(svg('rect', { x: x0 + ((x1 - x0) * i) / n, y, width: (x1 - x0) / n + 0.5, height: h, fill: wavelengthColour(nm), opacity: 0.22 }));
  }
  return out;
}

// ---- Balmer's lines (a still) ---------------------------------------------------------

export const balmerStill = () => {
  const H = 170;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  const x0 = 20;
  const x1 = 385;
  const a = 350;
  const b = 680;
  const x = (nm: number) => x0 + ((nm - a) / (b - a)) * (x1 - x0);
  s.append(svg('rect', { width: W, height: H, fill: COL.paper }), svg('rect', { x: x0, y: 50, width: x1 - x0, height: 46, fill: COL.sky }), ...strip(x0, x1, 50, 46, a, b));
  for (let n = 3; n <= 30; n++) {
    const nm = balmerLine(n);
    const known = n <= 6;
    s.append(line(x(nm), 50, x(nm), 96, known ? wavelengthColour(nm) : '#b7b2c9', known ? 2.5 : 1));
    if (n <= 6) s.append(small(x(nm), 112, `${sig(nm, 4)}`, { anchor: 'middle', soft: !known }));
  }
  s.append(
    line(x(BALMER), 40, x(BALMER), 104, COL.ink, 1, { 'stroke-dasharray': '3 2' }),
    small(x(BALMER) - 4, 36, 'the limit, 364.56', { bold: true }),
    note(x0, 18, 'Ångström measured four lines. Balmer’s rule gave them all, and more.', { bold: true }),
    small(x(656.3), 128, '× 9/5', { anchor: 'middle' }),
    small(x(486.1), 128, '× 4/3', { anchor: 'middle' }),
    small(x(434), 128, '× 25/21', { anchor: 'middle' }),
    small(x(410.2), 144, '× 9/8', { anchor: 'middle' }),
    small(x1, 164, 'wavelength, nanometres; pale lines are those his rule predicted', { anchor: 'end', soft: true }),
  );
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};

// ---- The ladder (live) --------------------------------------------------------------------

const VISIBLE = [3, 4, 5, 6].map((n) => `${n}-2`);

export const rungsFigure = figure(['balmer'], (_ctx, t) => {
  const H = 270;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let from = 2;
  let to = 1;
  const found = new Set<string>();
  const ey = (e: number) => 34 + (-e / 13.6) * 166;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    parts.push(line(30, ey(0), 200, ey(0), COL.soft, 1, { 'stroke-dasharray': '3 3' }), small(205, ey(0) - 5, 'free (the atom is ionised)', { soft: true }));
    for (let n = 1; n <= 6; n++) {
      const y = ey(rungEnergy(n));
      parts.push(line(30, y, 200, y, n === from || n === to ? COL.ink : COL.orbit, n === from || n === to ? 2.5 : 1.5));
      if (n <= 3) parts.push(small(205, y + 4, n === 1 ? 'rung 1, the bottom' : `rung ${n}`, { soft: n !== from && n !== to }));
    }
    const ok = from > to;
    const nm = ok ? fallNm(from, to) : 0;
    if (ok && band(nm) === 'visible') found.add(`${from}-${to}`);
    if (ok) {
      const c = band(nm) === 'visible' ? wavelengthColour(nm) : COL.soft;
      parts.push(line(110, ey(rungEnergy(from)), 110, ey(rungEnergy(to)) - 6, c, 3), svg('path', { d: `M104 ${ey(rungEnergy(to)) - 9} L110 ${ey(rungEnergy(to))} L116 ${ey(rungEnergy(to)) - 9}`, fill: c }));
      const wy = (ey(rungEnergy(from)) + ey(rungEnergy(to))) / 2;
      const wave = Array.from({ length: 30 }, (_, i) => `${i ? 'L' : 'M'}${120 + i * 2.2} ${wy + 5 * Math.sin(i * (band(nm) === 'ultraviolet' ? 1.6 : band(nm) === 'infrared' ? 0.45 : 0.9))}`).join(' ');
      parts.push(svg('path', { d: wave, fill: 'none', stroke: c, 'stroke-width': 2 }));
    }
    // What has been seen so far, on a strip of the visible band.
    const x0 = 30;
    const x1 = 385;
    const xs = (v: number) => x0 + ((v - 380) / (700 - 380)) * (x1 - x0);
    parts.push(svg('rect', { x: x0, y: 226, width: x1 - x0, height: 22, fill: COL.sky }), ...strip(x0, x1, 226, 22, 380, 700), small(x0, 220, 'Visible lines you have made', { bold: true }));
    for (const k of found) {
      const [a, b] = k.split('-').map(Number);
      const v = fallNm(a, b);
      parts.push(line(xs(v), 226, xs(v), 248, wavelengthColour(v), 2.5));
    }
    parts.push(small(x0, 262, '380 nm', { soft: true }), small(x1, 262, '700 nm', { anchor: 'end', soft: true }));
    redraw(g, ...parts);
    if (!ok) {
      f.readout.textContent = 'An electron gives out light when it falls. Pick a lower rung to fall to.';
      return;
    }
    f.readout.textContent = `From rung ${from} to rung ${to}: one packet of light, ${sig(nm, 3)} nm, ${band(nm) === 'visible' ? `visible (${found.size} of hydrogen’s four visible lines so far)` : band(nm) === 'ultraviolet' ? 'ultraviolet: a big gap gives a packet too energetic to see' : 'infrared: a small gap gives a packet too feeble to see'}.`;
    if (VISIBLE.every((v) => found.has(v))) {
      f.readout.textContent += ' All four: every visible line is a fall that ends on rung 2.';
      if (t.goal === 'balmer') t.done();
    }
  };
  const sFrom = slider('Start on rung', 2, 6, 1, from, (v) => String(v), (v) => { from = v; paint(); }, 'ink');
  const sTo = slider('Fall to rung', 1, 5, 1, to, (v) => String(v), (v) => { to = v; paint(); }, 'ink');
  f.controls.append(sFrom.node, sTo.node);
  paint();
  guessFirst(t, f, {
    ask: 'Hydrogen’s four visible lines are four different falls. What do you think they have in common? Guess first.',
    options: ['They all end on the bottom rung', 'They all end on the second rung', 'They all start on the top rung'],
    answer: 1,
    sliders: [sFrom, sTo],
    after: (guess) => {
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Try falls of every size. Find all four visible lines, and see where the falls to the bottom rung end up.`;
    },
  });
  return f.node;
});

// ---- Notes on a string (a still) ----------------------------------------------------------

export const stringsStill = () => {
  const H = 200;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.paper }), note(20, 18, 'A string held at both ends can only wave in whole half-waves', { bold: true }));
  for (let k = 1; k <= 4; k++) {
    const y = 28 + k * 38;
    const pts = Array.from({ length: 81 }, (_, i) => `${i ? 'L' : 'M'}${40 + i * 3.5} ${y - 13 * Math.sin((i / 80) * Math.PI * k)}`).join(' ');
    const pts2 = Array.from({ length: 81 }, (_, i) => `${i ? 'L' : 'M'}${40 + i * 3.5} ${y + 13 * Math.sin((i / 80) * Math.PI * k)}`).join(' ');
    s.append(
      svg('path', { d: pts, fill: 'none', stroke: COL.hot, 'stroke-width': 2 }),
      svg('path', { d: pts2, fill: 'none', stroke: COL.hot, 'stroke-width': 1, opacity: 0.35 }),
      svg('circle', { cx: 40, cy: y, r: 3, fill: COL.ink }),
      svg('circle', { cx: 320, cy: y, r: 3, fill: COL.ink }),
      small(332, y + 4, `${k} half-wave${k > 1 ? 's' : ''}`, {}),
    );
  }
  s.append(small(20, 194, 'Nothing in between fits. An electron held by its nucleus is a wave held in, so it too has only certain patterns.', { soft: true }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
