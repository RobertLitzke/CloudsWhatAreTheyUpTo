// Branch L2, Dating a moraine by its lichens: gravestones of known date give a
// growth curve for the map lichen; the largest lichen on a moraine is read
// off it to date the moraine.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

/** Years before the first lichen settles on fresh rock. */
export const DELAY = 12;
/** Growth of the largest lichen's diameter, mm a year. */
export const RATE = 0.45;

/** Diameter in mm of the largest map lichen on a surface `years` old. */
export const largest = (years: number) => Math.max(0, RATE * (years - DELAY));

/** Age of a surface whose largest lichen is `mm` across. */
export const ageFrom = (mm: number) => DELAY + mm / RATE;

/** Gravestones: years since they were carved, and the largest lichen measured on each. */
export const STONES: readonly [number, number][] = [
  [25, 5], [38, 12], [52, 18], [61, 20], [75, 30], [88, 33], [96, 41], [110, 42], [124, 52], [138, 55], [152, 63], [170, 70], [190, 79],
];

export const datingFigure = figure(['dated'], (_ctx, t) => {
  const f = frame(W, 210, 3);
  const g = svg('g');
  f.svg.append(g);
  let mm = 0;
  const now = 2025;
  const paint = () => {
    const ax = axes({ x: 44, y: 22, w: 230, h: 150, xmin: 0, xmax: 300, ymin: 0, ymax: 130, xticks: [0, 100, 200, 300], yticks: [0, 50, 100], xlabel: 'years the rock has been bare', ylabel: 'largest lichen, mm across', ink: COL.ink, grid: COL.grid });
    const age = ageFrom(mm);
    const lo = DELAY + mm / (RATE * 1.15);
    const hi = DELAY + mm / (RATE * 0.87);
    const parts: SVGElement[] = [
      ...ax.parts,
      ax.path([[0, 0], [DELAY, 0], [300, largest(300)]], COL.leaf, 2),
      ...ax.dots(STONES.map(([y, d]) => [y, d]), COL.data, 3.2),
    ];
    if (mm > 0) {
      parts.push(
        svg('rect', { x: ax.X(lo), y: 22, width: ax.X(hi) - ax.X(lo), height: 150, fill: COL.cap, opacity: 0.15 }),
        line(44, ax.Y(mm), ax.X(age), ax.Y(mm), COL.cap, 1.5, { 'stroke-dasharray': '4 3' }),
        line(ax.X(age), ax.Y(mm), ax.X(age), 172, COL.cap, 1.5, { 'stroke-dasharray': '4 3' }),
      );
    }
    // The lichen itself, to scale-ish, on a boulder.
    const r = Math.max(1, mm * 0.33);
    parts.push(
      svg('ellipse', { cx: 340, cy: 120, rx: 54, ry: 44, fill: '#9a958c' }),
      ...(mm > 0 ? [svg('circle', { cx: 340, cy: 112, r, fill: '#c9d24a', stroke: '#2b2b2b', 'stroke-width': 1.5 })] : []),
      small(340, 186, mm > 0 ? `largest lichen: ${mm} mm` : 'no lichen yet measured', { anchor: 'middle', bold: true }),
      small(290, 34, 'Dots: gravestones', { fill: COL.data, bold: true }),
      small(290, 48, 'of known date', { fill: COL.data }),
    );
    if (mm > 0) parts.push(small(340, 202, `bare since about ${Math.round(now - age)}`, { anchor: 'middle', fill: COL.cap, bold: true }));
    redraw(g, ...parts);
    if (!open()) return;
    f.readout.textContent = mm === 0
      ? 'Each dot is a gravestone: how long since it was carved, and the largest lichen on it. Set the size of the largest lichen on a moraine.'
      : `A ${mm} mm lichen fits rock bare for about ${Math.round(age)} years: the ice left around ${Math.round(now - age)}, give or take ${Math.round((hi - lo) / 2)} years (shaded).`;
    if (mm >= 20) t.done();
  };
  const ms = slider('Largest lichen', 0, 120, 1, mm, (v) => `${v} mm`, (v) => { mm = v; paint(); }, 'leaf');
  f.controls.append(ms.node);
  const open = guessFirst(t, f, {
    ask: 'To date a moraine, why do lichenometrists measure the largest lichen on it, not a typical one?',
    options: ['It is probably the first to have settled', 'Large lichens are easier to name', 'Small lichens are a different species'],
    answer: 0,
    sliders: [ms],
    after: () => paint(),
  });
  paint();
  return f.node;
});
