// Lesson 3, Why leaves are green: Engelmann's bacteria under a spectrum,
// light bouncing inside a leaf, and a leaf turning in autumn.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, pick, slider, toggles, wrapped } from './kit';

const W = 400;

const bump = (x: number, at: number, width: number) => Math.exp(-(((x - at) / width) ** 2));

/** How strongly an alga uses light of each wavelength (nanometres), 0 to 1: chlorophyll alone, or with the red seaweeds' extra pigment. */
export function uses(alga: 'green' | 'red', nm: number): number {
  const v = alga === 'green'
    ? 0.95 * bump(nm, 438, 28) + 0.45 * bump(nm, 485, 22) + 0.9 * bump(nm, 672, 22) + 0.08
    : 0.95 * bump(nm, 548, 32) + 0.45 * bump(nm, 498, 20) + 0.45 * bump(nm, 672, 20) + 0.35 * bump(nm, 438, 22) + 0.05;
  return Math.min(1, v);
}

/** An approximate colour for a wavelength of light. */
export const hue = (nm: number) => `hsl(${Math.max(0, Math.min(275, 275 - ((nm - 400) / 300) * 275))}, 85%, ${nm < 430 || nm > 680 ? 40 : 52}%)`;

export const engelmannFigure = figure(['red'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let alga: 'green' | 'red' = 'green';
  let seenGreen = false;
  const nmAt = (x: number) => 400 + ((x - 20) / 360) * 300;
  const paint = () => {
    const spectrum = Array.from({ length: 60 }, (_, i) => svg('rect', { x: 20 + i * 6, y: 150, width: 6.5, height: 16, fill: hue(nmAt(20 + i * 6 + 3)) }));
    const shown = open();
    const rng = makeRng(1882);
    const bacteria: SVGElement[] = [];
    for (let i = 0; i < 700; i++) {
      const x = 22 + rng() * 356;
      const y = 50 + rng() * 86;
      const keep = shown ? rng() < uses(alga, nmAt(x)) ** 2 * 0.95 : rng() < 0.22;
      if (keep) bacteria.push(svg('circle', { cx: x, cy: y, r: 1.4, fill: COL.ink, opacity: 0.75 }));
    }
    redraw(g,
      svg('rect', { x: 20, y: 40, width: 360, height: 104, fill: '#eef3f1' }),
      ...bacteria,
      svg('rect', { x: 20, y: 86, width: 360, height: 12, rx: 6, fill: alga === 'green' ? '#5f9a43' : '#a8344a', opacity: 0.9 }),
      ...spectrum,
      small(20, 180, 'violet 400 nm', { soft: true }),
      small(200, 180, 'green', { anchor: 'middle', soft: true }),
      small(380, 180, 'red 700 nm', { anchor: 'end', soft: true }),
      label(20, 28, alga === 'green' ? 'A strand of green alga' : 'A red seaweed', { bold: true }),
      small(380, 28, 'dots: bacteria that swim toward oxygen', { anchor: 'end', soft: true }),
    );
    if (!shown) return;
    if (alga === 'green') seenGreen = true;
    f.readout.textContent = alga === 'green'
      ? 'The bacteria crowd where the alga gives off most oxygen: under the red and the blue light. In the green, few.'
      : 'The red seaweed has an extra pigment that absorbs green, and the bacteria crowd under the green light instead.';
    if (seenGreen && alga === 'red') t.done();
  };
  const which = pick(['Green alga', 'Red seaweed'], 0, (i) => { alga = i ? 'red' : 'green'; paint(); });
  f.controls.append(which.node);
  const open = guessFirst(t, f, {
    ask: 'Engelmann spreads a tiny rainbow along a strand of green alga, among bacteria that swim toward oxygen. Where will the bacteria crowd?',
    options: ['Under the green light', 'Under the red and blue light', 'Evenly all along'],
    answer: 1,
    reveal: 'done',
    sliders: [],
    buttons: which.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Light inside a leaf -------------------------------------------------------------------------

/** How much of one pass through one layer of leaf cells each colour loses to chlorophyll. */
const PER_LAYER = { red: 0.6, green: 0.12, blue: 0.7 } as const;
/** How much longer light's path is when it bounces between cell walls and air spaces. */
const BOUNCE = 3;

/** Share of each colour a leaf of `layers` cell layers absorbs. */
export const absorbed = (color: keyof typeof PER_LAYER, layers: number, bounces: boolean) =>
  1 - Math.exp(-PER_LAYER[color] * layers * (bounces ? BOUNCE : 1));

export const leafFigure = figure(['green'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let layers = 4;
  let bounces = false;
  const paint = () => {
    const top = 30;
    const cellH = Math.min(22, 150 / layers);
    const cells: SVGElement[] = [];
    for (let r = 0; r < layers; r++) {
      for (let c = 0; c < 8; c++) {
        cells.push(svg('rect', { x: 20 + c * 24 + (r % 2 ? 6 : 0), y: top + r * cellH, width: 20, height: cellH - 3, rx: 6, fill: '#bfd8a6', stroke: '#7ea35c', 'stroke-width': 0.8 }));
      }
    }
    const bottom = top + layers * cellH;
    const ray = (x0: number, color: string, key: keyof typeof PER_LAYER) => {
      // Draw the ray as far as a tenth of it survives, in steps of half a layer.
      const pts: string[] = [`${x0},${top - 18}`];
      let x = x0;
      let y = top;
      let left = 1;
      let dir = 1;
      const step = cellH / 2;
      while (left > 0.1 && y < bottom) {
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        if (bounces) { x += dir * 12; dir = -dir; }
        y += step;
        left *= Math.exp(-PER_LAYER[key] * 0.5 * (bounces ? BOUNCE : 1));
      }
      pts.push(`${x.toFixed(1)},${Math.min(y, bottom + 14).toFixed(1)}`);
      return svg('polyline', { points: pts.join(' '), fill: 'none', stroke: color, 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
    };
    const bar = (y: number, name: string, key: keyof typeof PER_LAYER, color: string) => {
      const a = absorbed(key, layers, bounces);
      return [
        small(240, y + 10, name, { bold: true, fill: color }),
        svg('rect', { x: 282, y, width: 76, height: 14, fill: COL.grid, rx: 2 }),
        svg('rect', { x: 282, y, width: 76 * a, height: 14, fill: color, rx: 2 }),
        small(394, y + 11, `${Math.round(a * 100)}%`, { bold: true, anchor: 'end' }),
      ];
    };
    redraw(g,
      ...cells,
      line(14, top - 2, 216, top - 2, '#7ea35c', 2), line(14, bottom + 1, 216, bottom + 1, '#7ea35c', 2),
      ray(60, COL.blue, 'blue'), ray(110, COL.green, 'green'), ray(160, COL.red, 'red'),
      small(240, 40, 'Absorbed by the leaf', { bold: true }),
      ...bar(56, 'Blue', 'blue', COL.blue),
      ...bar(80, 'Green', 'green', COL.green),
      ...bar(104, 'Red', 'red', COL.red),
      small(240, 150, bounces ? 'Light bounces off cell walls' : 'Light goes straight through,', { soft: true }),
      small(240, 164, bounces ? 'and air spaces: a longer path.' : 'as in a tube of green juice.', { soft: true }),
    );
    const green = absorbed('green', layers, bounces);
    f.readout.textContent = bounces
      ? `Bouncing makes the light's path about three times longer, so even weakly absorbed green has many chances to be caught: the leaf takes ${Math.round(green * 100)}% of it.`
      : `Going straight through ${layers} layer${layers > 1 ? 's' : ''} of cells, most green light gets out the other side: only ${Math.round(green * 100)}% is absorbed.`;
    if (bounces && green >= 0.75) t.done();
  };
  const s = slider('Layers of cells', 1, 8, 1, layers, (v) => `${v}`, (v) => { layers = v; paint(); }, 'leaf');
  const sw = toggles(['Light bounces inside'], [false], (on) => { bounces = on[0]; paint(); });
  f.controls.append(s.node, sw.node);
  paint();
  return f.node;
});

// ---- Autumn -----------------------------------------------------------------------------------------

/** A leaf's pigments after `weeks` of autumn: chlorophyll breaks down; yellow carotenoids stay; red is made on sunny days with cool nights. */
export function autumn(weeks: number, sun: number, nightC: number) {
  const green = Math.exp(-weeks / 2.2);
  const cool = nightC <= 0 ? 0.2 : Math.max(0, Math.min(1, (12 - nightC) / 9));
  const red = Math.min(1, weeks * 0.16 * sun * cool);
  return { green, yellow: 0.6, red };
}

const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);

export const autumnFigure = figure(['red'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let weeks = 0;
  let sun = 0.5;
  let night = 8;
  const leaf = 'M100,180 L100,150 C70,160 40,150 30,120 C50,118 58,110 50,92 C70,98 80,90 78,70 C90,80 96,70 100,40 C104,70 110,80 122,70 C120,90 130,98 150,92 C142,110 150,118 170,120 C160,150 130,160 100,150 Z';
  const paint = () => {
    const p = autumn(weeks, sun, night);
    const greenRGB = [79, 138, 60];
    const yellowRGB = [226, 182, 46];
    const redRGB = [178, 34, 52];
    let c = mix(yellowRGB, greenRGB, p.green);
    c = mix(c, redRGB, p.red * (1 - p.green));
    const col = `rgb(${c.map((v) => Math.round(v)).join(',')})`;
    const bar = (y: number, name: string, v: number, color: string) => [
      small(220, y + 10, name, { bold: true }),
      svg('rect', { x: 300, y, width: 80, height: 13, fill: COL.grid, rx: 2 }),
      svg('rect', { x: 300, y, width: 80 * v, height: 13, fill: color, rx: 2 }),
    ];
    redraw(g,
      svg('path', { d: leaf, fill: col, stroke: '#3b2a1a', 'stroke-width': 1.2 }),
      ...[[100, 150, 100, 52], [100, 140, 48, 100], [100, 140, 152, 100], [100, 148, 40, 124], [100, 148, 160, 124]].map(([a, b, c2, d]) => line(a, b, c2, d, '#3b2a1a', 0.8, { opacity: 0.5 })),
      label(220, 40, `Week ${weeks} of autumn`, { bold: true }),
      ...bar(56, 'Chlorophyll', p.green, COL.leaf),
      ...bar(78, 'Carotenoids', p.yellow, '#e2b62e'),
      ...bar(100, 'Anthocyanins', p.red, '#b22234'),
      ...wrapped(220, 140, 'Chlorophyll is taken apart to save its nitrogen; yellow was there all along; red is made new from sugar.', 34, { soft: true }),
    );
    f.readout.textContent = weeks === 0
      ? 'A summer leaf: the chlorophyll is so plentiful it hides every other pigment.'
      : p.red > 0.6 && p.green < 0.3
        ? `Week ${weeks}: sunny days make plenty of sugar, and cool nights keep it in the leaf, where it is made into red pigment.`
        : p.green < 0.3
          ? `Week ${weeks}: the green has gone and the yellow that was always there shows. ${sun < 0.4 ? 'Too cloudy for much red.' : night > 10 ? 'Nights too warm for much red.' : night <= 0 ? 'Hard frost kills the leaf before it makes much red.' : ''}`
          : `Week ${weeks}: the chlorophyll is being taken apart.`;
    if (p.red > 0.6 && p.green < 0.3) t.done();
  };
  const w = slider('Weeks into autumn', 0, 8, 1, weeks, (v) => `${v}`, (v) => { weeks = v; paint(); }, 'autumn');
  const s = slider('Sunny days', 0, 1, 0.05, sun, (v) => `${Math.round(v * 100)}%`, (v) => { sun = v; paint(); }, 'light');
  const n = slider('Night temperature', -4, 16, 1, night, (v) => `${v} °C`, (v) => { night = v; paint(); }, 'blue');
  f.controls.append(w.node, s.node, n.node);
  paint();
  return f.node;
});
