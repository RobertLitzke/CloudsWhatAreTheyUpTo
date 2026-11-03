// Lesson 5, Boxes full of water: osmosis through a membrane in a U-tube, and
// a plant cell in water of different saltiness (de Vries's plasmolysis).

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, player, slider, toggles } from './kit';

const W = 400;

/** The rise of the sugar side (millimetres) after `minutes`, for a sugar strength 0 to 1; a membrane that lets sugar through gives no rise. */
export function rise(sugar: number, minutes: number, leaky: boolean): number {
  if (leaky) return 0;
  return 60 * sugar * (1 - Math.exp(-minutes / 12));
}

export const osmosisFigure = figure(['rise'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let sugar = 0.6;
  let minutes = 0;
  let leaky = false;
  const paint = () => {
    const shown = open();
    const h = shown ? rise(sugar, minutes, leaky) : 0;
    const base = 120;
    const left = base + h / 2;
    const right = base - h / 2;
    const rng = makeRng(1877);
    const dots: SVGElement[] = [];
    // Water molecules on both sides; sugar molecules on the right, or both sides once they leak through.
    for (let i = 0; i < 90; i++) {
      const side = i % 2;
      const top = side ? right : left;
      dots.push(svg('circle', { cx: (side ? 214 : 86) + (rng() - 0.5) * 70, cy: top + 6 + rng() * (196 - top - 10), r: 2, fill: COL.water, opacity: 0.6 }));
    }
    const nSugar = Math.round(sugar * 24);
    for (let i = 0; i < nSugar; i++) {
      const side = leaky && minutes > 4 ? i % 2 : 1;
      const top = side ? right : left;
      dots.push(svg('circle', { cx: (side ? 214 : 86) + (rng() - 0.5) * 64, cy: top + 10 + rng() * (190 - top - 16), r: 5, fill: COL.sugar }));
    }
    redraw(g,
      svg('path', { d: `M46,${left} L46,200 L254,200 L254,${right}`, fill: 'none', stroke: COL.soft, 'stroke-width': 0 }),
      svg('rect', { x: 46, y: left, width: 80, height: 200 - left, fill: COL.water, opacity: 0.18 }),
      svg('rect', { x: 174, y: right, width: 80, height: 200 - right, fill: COL.water, opacity: 0.22 }),
      svg('rect', { x: 126, y: 170, width: 48, height: 30, fill: COL.water, opacity: 0.18 }),
      // The U-tube's glass.
      svg('path', { d: 'M46,40 L46,200 L254,200 L254,40 M126,40 L126,170 L174,170 L174,40', fill: 'none', stroke: COL.ink, 'stroke-width': 2 }),
      line(150, 170, 150, 200, COL.heat, 2.5, { 'stroke-dasharray': leaky ? '6 3' : '2 2' }),
      small(150, 214, leaky ? 'leaky membrane' : 'membrane: water passes, sugar can’t', { anchor: 'middle', fill: COL.heat }),
      ...dots,
      line(40, left, 132, left, COL.water, 1.5), line(168, right, 260, right, COL.water, 1.5),
      label(86, 32, 'Pure water', { anchor: 'middle', bold: true }),
      label(214, 32, 'Sugar water', { anchor: 'middle', bold: true, fill: COL.sugar }),
      h > 1 ? small(300, (left + right) / 2, `${Math.round(h)} mm higher`, { bold: true, fill: COL.water }) : null,
      small(300, 190, `${Math.round(minutes)} min`, { soft: true }),
    );
    if (!shown) return;
    f.readout.textContent = minutes === 0
      ? 'Both sides start level. Press Play.'
      : leaky
        ? 'With a membrane that lets sugar through, the sugar spreads to both sides and the levels stay equal: nothing to pull water one way.'
        : sugar === 0
          ? 'No sugar on either side: water crosses both ways equally, and nothing changes.'
          : `Water crosses both ways, but more crosses into the sugar side, which has fewer water molecules in each drop to send back. It rises until the extra weight of water pushes back as hard: ${Math.round(h)} mm.`;
    if (!leaky && sugar > 0.2 && h > 20) t.done();
  };
  const time = slider('Minutes', 0, 60, 1, 0, (v) => `${v}`, (v) => { minutes = v; paint(); }, 'water');
  const play = player(time, ctx, { seconds: 6 });
  const s = slider('Sugar', 0, 1, 0.05, sugar, (v) => `${Math.round(v * 100)}%`, (v) => { sugar = v; paint(); }, 'sugar');
  const sw = toggles(['Let sugar through the membrane'], [false], (on) => { leaky = on[0]; paint(); });
  f.controls.append(play.node, time.node, s.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'Pure water on the left, sugar water on the right, and between them a membrane that lets water through but not sugar. Which way does the water go?',
    options: ['Into the sugar side', 'Out of the sugar side', 'Neither way'],
    answer: 0,
    reveal: 'done',
    sliders: [time, s],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A cell in salty water ---------------------------------------------------------------------

/** Pressure (megapascals) per unit of dissolved stuff, as in the cell's own sap: about 0.73 MPa for the cell's 0.3 osmolar. */
const PER = 2.44;
const INSIDE = 0.3;

/** A cell in water whose saltiness is `outside` times the cell's own: its turgor (MPa) and its living part's volume (1 = filling the wall). */
export function cell(outside: number): { turgor: number; volume: number } {
  const out = outside * INSIDE;
  if (out <= INSIDE) return { turgor: PER * (INSIDE - out), volume: 1 };
  return { turgor: 0, volume: INSIDE / out };
}

export const cellFigure = figure(['plasmolysed'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let outside = 0;
  const paint = () => {
    const c = cell(outside);
    const k = Math.sqrt(c.volume);
    const cx = 120;
    const cy = 110;
    const w = 160;
    const h = 120;
    const bulge = Math.min(6, c.turgor * 8);
    redraw(g,
      svg('rect', { x: 0, y: 0, width: 260, height: 220, fill: COL.water, opacity: 0.06 + outside * 0.05 }),
      // The wall, bowed out a little by the pressure.
      svg('rect', { x: cx - w / 2 - bulge / 2, y: cy - h / 2 - bulge / 2, width: w + bulge, height: h + bulge, rx: 10, fill: '#e7efd9', stroke: '#7ea35c', 'stroke-width': 5 }),
      // The living part: membrane, a thin layer of cytoplasm with chloroplasts, and the big watery vacuole.
      svg('rect', { x: cx - (w / 2 - 4) * k, y: cy - (h / 2 - 4) * k, width: (w - 8) * k, height: (h - 8) * k, rx: 12 * k + 4, fill: '#c6e0a8', stroke: COL.leaf, 'stroke-width': 1.5 }),
      svg('rect', { x: cx - (w / 2 - 14) * k, y: cy - (h / 2 - 14) * k, width: (w - 28) * k, height: (h - 28) * k, rx: 10 * k + 2, fill: '#eaf3f6', stroke: '#9ec1cc', 'stroke-width': 1 }),
      ...[[-0.8, -0.85], [0.7, -0.85], [0.85, 0.2], [-0.85, 0.5], [0, 0.88], [0.3, -0.88]].map(([a, b]) => svg('ellipse', { cx: cx + a * (w / 2 - 9) * k, cy: cy + b * (h / 2 - 9) * k, rx: 5 * k + 1, ry: 3 * k + 1, fill: COL.leaf })),
      small(cx, cy + 4, 'vacuole', { anchor: 'middle', soft: true }),
      small(cx, 206, c.volume < 1 ? 'The living part has pulled away from the wall' : 'Pressed against the wall', { anchor: 'middle', bold: true, fill: c.volume < 1 ? COL.bad : COL.leaf }),
      label(278, 50, 'Turgor', { bold: true }),
      label(278, 76, `${c.turgor.toFixed(2)} MPa`, { bold: true, fill: COL.water }),
      small(278, 96, 'A car tyre: about 0.2', { soft: true }),
      label(278, 136, 'Water outside', { bold: true }),
      small(278, 154, outside === 0 ? 'pure' : `${Math.round(outside * 100)}% as salty as the sap`, { soft: true }),
    );
    f.readout.textContent = outside < 1
      ? `Water moves into the saltier sap and presses the cell against its wall: ${c.turgor.toFixed(2)} megapascals, ${c.turgor > 0.4 ? 'more than three times a car tyre’s pressure' : 'less than it could be'}. That pressure is what keeps lettuce crisp.`
      : outside === 1
        ? 'Outside matches the sap: no water moves either way, and there is no pressure. The cell is limp.'
        : `Saltier outside than in: water leaves, and the living part of the cell shrinks to ${Math.round(c.volume * 100)}% and pulls away from the wall. De Vries called this plasmolysis.`;
    if (outside >= 1.2) t.done();
  };
  const s = slider('Salt in the water outside', 0, 2, 0.05, 0, (v) => (v === 0 ? 'none' : `${Math.round(v * 100)}% of the sap’s`), (v) => { outside = v; paint(); }, 'water');
  f.controls.append(s.node);
  paint();
  return f.node;
});
