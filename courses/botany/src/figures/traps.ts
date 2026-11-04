// Lesson O1, Snap traps and sticky leaves: a Venus flytrap counting touches
// on its trigger hairs, with a memory that fades.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, button, COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

/** How long (s) the memory of a touch takes to fade to a third. */
export const TAU = 40;
/** Remembered touches needed to shut the trap, and touches in all to start digesting. */
export const SHUT = 1.5;
export const DIGEST = 5;

export type Trap = { t: number; charge: number; shut: boolean; touches: number; digesting: boolean; trace: [number, number][] };

export const fresh = (): Trap => ({ t: 0, charge: 0, shut: false, touches: 0, digesting: false, trace: [[0, 0]] });

/** Wait `gap` seconds, then touch a trigger hair. */
export function touch(s: Trap, gap: number): Trap {
  const t = s.trace.length > 1 || s.touches ? s.t + gap : 0;
  const faded = s.charge * Math.exp(-(t - s.t) / TAU);
  const charge = faded + 1;
  const touches = s.touches + 1;
  const shut = s.shut || charge >= SHUT;
  const trace: [number, number][] = [...s.trace];
  for (let k = 1; k <= 10; k++) {
    const tt = s.t + ((t - s.t) * k) / 10;
    trace.push([tt, s.charge * Math.exp(-(tt - s.t) / TAU)]);
  }
  trace.push([t, charge]);
  return { t, charge, shut, touches, digesting: shut && touches >= DIGEST, trace };
}

export const flytrapFigure = figure(['digest'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let gap = 45;
  let s = fresh();
  let sawFade = false;
  const paint = () => {
    const shown = open();
    const tmax = Math.max(120, Math.ceil((s.t + 10) / 60) * 60);
    const a = axes({ x: 170, y: 30, w: 210, h: 120, xmin: 0, xmax: tmax, ymin: 0, ymax: 3, xticks: [0, tmax / 2, tmax], yticks: [0, 1, 2, 3], xlabel: 'seconds', ylabel: 'touches remembered', ink: COL.ink, grid: COL.grid });
    // The trap: two lobes, open or shut.
    const cx = 80;
    const cy = 110;
    const open_ = !s.shut;
    const lobe = (side: number) => svg('path', {
      d: open_
        ? `M${cx},${cy} q${side * 30},-50 ${side * 60},-40 q${-side * 20},40 ${-side * 60},40 Z`
        : `M${cx},${cy} q${side * 10},-50 ${side * 4},-70 q${-side * 4},40 ${-side * 4},70 Z`,
      fill: s.digesting ? '#b5503a' : '#9fbf5a', stroke: COL.leaf,
    });
    redraw(g,
      line(cx, cy, cx, 200, COL.leaf, 3),
      lobe(-1),
      lobe(1),
      ...(open_ ? [-1, 1].flatMap((d) => [line(cx + d * 22, cy - 22, cx + d * 26, cy - 34, COL.ink, 1), line(cx + d * 34, cy - 26, cx + d * 38, cy - 38, COL.ink, 1)]) : []),
      label(cx, 222, s.digesting ? 'Digesting' : s.shut ? 'Shut' : 'Open', { anchor: 'middle', bold: true, fill: s.digesting ? COL.red : COL.ink }),
      ...a.parts,
      svg('line', { x1: a.X(0), y1: a.Y(SHUT), x2: a.X(tmax), y2: a.Y(SHUT), stroke: COL.red, 'stroke-dasharray': '4 3' }),
      small(a.X(tmax), a.Y(SHUT) - 4, 'shuts above this', { anchor: 'end', fill: COL.red }),
      a.path(s.trace.map(([x, y]) => [x, Math.min(3, y)] as const), COL.hormone, 2),
      small(170, 186, `Touches so far: ${s.touches}`, { bold: true }),
      small(170, 204, 'A model of the leaf’s electrical memory.', { soft: true }),
    );
    if (!shown) return;
    f.readout.textContent = s.touches === 0
      ? 'An open trap. Set the wait, then touch a trigger hair.'
      : s.digesting
        ? `${s.touches} touches: a struggling insect. The trap seals tight, floods itself with digestive juices and starts absorbing the nitrogen; it will reopen in a week or so.`
        : s.shut
          ? `Shut, after two touches close together. A fly inside keeps touching the hairs; at ${DIGEST} touches in all the trap starts to digest.`
          : s.touches === 1
            ? 'One touch: an electrical signal runs across the leaf, but one touch could be a raindrop. The trap waits for a second.'
            : `The first touch had faded by the time the second came, ${gap} seconds later. A slow drip of rain or a passing breeze doesn't shut the trap.`;
    if (!s.shut && s.touches >= 2) sawFade = true;
    if (s.digesting && sawFade) t.done();
  };
  const gs = slider('Wait before each touch', 2, 60, 1, gap, (v) => `${v} s`, (v) => { gap = v; }, 'hormone');
  const go = button('Touch a trigger hair', () => { s = touch(s, gap); paint(); }, false);
  const reset = button('Reset the trap', () => { s = fresh(); paint(); });
  f.controls.append(gs.node, go, reset);
  const open = guessFirst(t, f, {
    ask: 'Touch one trigger hair of a Venus flytrap and nothing happens. What does it take to shut the trap?',
    options: ['A second touch, soon after', 'A heavier touch', 'One touch held for a minute'],
    answer: 0,
    reveal: 'done',
    sliders: [gs],
    buttons: [go, reset],
    after: () => paint(),
  });
  paint();
  return f.node;
});
