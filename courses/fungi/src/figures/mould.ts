// Lesson 11, The spoiled plate: a Penicillium colony on a dish of bacteria,
// with penicillin spreading out from it and clearing the bacteria wherever
// it is strong enough to stop them.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, pick, slider, wrapped } from './kit';

const W = 400;

/** The bacteria, with the penicillin strength that stops them (on the model's scale, where the colony's edge reaches 1). */
export const BACTERIA = [
  { name: 'Staphylococcus', stop: 0.02, note: 'the skin bacterium on Fleming’s plate' },
  { name: 'E. coli', stop: 3, note: 'a gut bacterium with an outer coat that keeps penicillin out' },
] as const;

/** Radius of the mould colony, in millimetres, after `days`. */
export const colony = (days: number) => 3 + 2.2 * days;

/** Penicillin at `r` mm from the centre after `days`: strongest at the colony's edge, falling off outward. */
export function penicillin(r: number, days: number): number {
  const made = Math.min(1, days / 4);
  const edge = colony(days);
  return r <= edge ? made : made * Math.exp(-(r - edge) / 3);
}

/** Radius of the clear ring, or 0 if the bacterium is never stopped. */
export function zone(days: number, stop: number): number {
  const made = Math.min(1, days / 4);
  if (made < stop) return 0;
  return colony(days) + 3 * Math.log(made / stop);
}

const DISH = 40; // dish radius in mm

export const zoneFigure = figure(['clear'], (_ctx, t) => {
  const f = frame(W, 210, 3);
  const g = svg('g');
  f.svg.append(g);
  let days = 0;
  let which = 0;
  let sawClear = false;
  let sawNone = false;
  // A fixed lawn of bacterial colonies.
  const lawn: [number, number][] = [];
  for (let i = 0; i < 700; i++) {
    const a = i * 2.39996;
    const r = DISH * 0.97 * Math.sqrt((i + 0.5) / 700);
    lawn.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const cx = 100;
  const cy = 106;
  const k = 2.1; // px per mm
  const paint = () => {
    const b = BACTERIA[which];
    const z = Math.min(zone(days, b.stop), DISH);
    const rc = colony(days);
    const dots = lawn
      .filter(([x, y]) => Math.hypot(x, y) > Math.max(z, rc))
      .map(([x, y]) => svg('circle', { cx: cx + x * k, cy: cy + y * k, r: days === 0 ? 1 : 2, fill: '#cfae4a' }));
    const ax = axes({ x: 236, y: 30, w: 150, h: 120, xmin: 0, xmax: DISH, ymin: 0, ymax: 1.1, xticks: [0, 20, 40], yticks: [], xlabel: 'mm from centre', ylabel: 'penicillin', ink: COL.ink, grid: COL.grid });
    const curve = Array.from({ length: 81 }, (_, i) => [i / 2, penicillin(i / 2, days)] as [number, number]);
    const stopY = ax.Y(Math.min(1.1, b.stop));
    redraw(g,
      svg('circle', { cx, cy, r: DISH * k, fill: '#f4eedb', stroke: '#b9b2a2', 'stroke-width': 2 }),
      ...dots,
      svg('circle', { cx, cy, r: rc * k, fill: '#4f8f7a', stroke: '#f1f1e6', 'stroke-width': 2 }),
      ...(z > rc ? [svg('circle', { cx, cy, r: z * k, fill: 'none', stroke: COL.good, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' })] : []),
      small(cx, 18, `Day ${days}: ${b.name}`, { anchor: 'middle', bold: true }),
      ...ax.parts,
      ax.path(curve, COL.toxin, 2.2),
      ...(b.stop <= 1.1 ? [line(236, stopY, 386, stopY, COL.cap, 1.2, { 'stroke-dasharray': '4 3' }), small(250, stopY - 4, 'stops it', { fill: COL.cap, bold: true })] : [small(386, 42, 'never enough to stop it', { anchor: 'end', fill: COL.cap })]),
      ...wrapped(236, 188, 'Red: penicillin. Dashed: enough to stop this bacterium.', 32, { soft: true }, 11),
    );
    if (!open()) return;
    if (which === 0 && days >= 4 && z > rc + 2) sawClear = true;
    if (which === 1 && days >= 4) sawNone = true;
    f.readout.textContent = days === 0
      ? 'A dish spread with bacteria, and one spore of mould landed in the middle.'
      : which === 1
        ? `The mould grows, and makes the same penicillin, but ${b.note} and is never stopped. The lawn grows right up to the colony.`
        : z > rc + 1
          ? `Penicillin spreads out from the mould. Wherever it is above the dashed line, ${b.note} cannot build its wall and dies, leaving a clear ring ${Math.round(z - rc)} mm wide.`
          : 'The mould is still young and has made little penicillin. The bacteria grow nearly up to it.';
    if (sawClear && sawNone) t.done();
  };
  const ds = slider('Days', 0, 7, 1, days, (v) => `${v}`, (v) => { days = v; paint(); }, 'hypha');
  const bs = pick(BACTERIA.map((b) => b.name), 0, (i) => { which = i; paint(); });
  f.controls.append(bs.node, ds.node);
  const open = guessFirst(t, f, {
    ask: 'A mould colony grows in the middle of a dish of bacteria and makes penicillin. What will the bacteria nearest the mould look like?',
    options: ['A clear ring with no bacteria', 'Thicker, feeding on the mould', 'The same as everywhere else'],
    answer: 0,
    sliders: [ds],
    buttons: bs.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
