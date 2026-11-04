// Branch S2, Cheatgrass and fire: a century of sagebrush steppe, with and
// without an annual grass that fills the gaps between shrubs with fuel.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, COL, figure, frame, guessFirst, legend, toggles } from './kit';

const W = 400;
export const YEARS = 100;
/** The year cheatgrass arrives, if it does. */
export const ARRIVES = 10;

/**
 * Sagebrush and cheatgrass cover (0 to 1) year by year, and the years that
 * burned. Lightning may light a fire in any dry summer; it spreads only if
 * there is enough fine fuel between the shrubs, which cheatgrass provides.
 * Fire kills sagebrush, which comes back from seed over decades; cheatgrass
 * comes back the next spring and takes the burned ground. Seeded. A model.
 */
export function steppe(cheat: boolean): { sage: number[]; cheat: number[]; fires: number[] } {
  const rng = makeRng(1893);
  let sage = 0.35;
  let grass = 0;
  const out = { sage: [sage], cheat: [grass], fires: [] as number[] };
  for (let y = 1; y <= YEARS; y++) {
    if (cheat && y === ARRIVES) grass = 0.02;
    const spreads = 0.02 + 0.3 * grass;
    if (rng() < spreads) {
      out.fires.push(y);
      sage = 0.02;
      if (grass > 0) grass = Math.max(grass, 0.5);
    } else {
      sage = Math.min(0.45, sage + 0.06 * sage * (1 - sage / 0.45) * (1 - grass) + 0.004);
      grass = Math.min(0.9, grass + 0.35 * grass * (1 - grass - 0.8 * sage));
    }
    out.sage.push(sage);
    out.cheat.push(grass);
  }
  return out;
}

export const cheatFigure = figure(['loop'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let cheat = false;
  const paint = () => {
    const run = steppe(cheat);
    const a = axes({ x: 40, y: 22, w: 346, h: 148, xmin: 0, xmax: YEARS, ymin: 0, ymax: 100, xticks: [0, 25, 50, 75, 100], yticks: [0, 50, 100], xlabel: 'years', ylabel: 'cover of the ground, %', ink: COL.ink, grid: COL.grid });
    redraw(g,
      ...a.parts,
      ...run.fires.map((y) => svg('path', { d: `M ${a.X(y)} ${a.Y(100) + 2} l -3 8 l 6 0 z`, fill: COL.heat })),
      a.path(run.sage.map((v, i) => [i, v * 100] as [number, number]), '#7d8a6a', 2.2),
      cheat ? a.path(run.cheat.map((v, i) => [i, v * 100] as [number, number]), COL.sun, 2) : null,
      ...legend(40, 212, [{ text: 'sagebrush', color: '#7d8a6a' }, { text: 'cheatgrass', color: COL.sun }, { text: 'a fire', color: COL.heat, dot: true }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    const n = run.fires.length;
    const after = run.fires.filter((y) => y >= ARRIVES);
    f.readout.textContent = cheat
      ? `${n} fires in a century, ${after.length} of them after cheatgrass arrived in year ${ARRIVES}: about one every ${Math.max(1, Math.round((YEARS - ARRIVES) / Math.max(1, after.length)))} years. Each fire clears sagebrush and hands the ground to the grass that fuels the next one.`
      : `${n} fire${n === 1 ? '' : 's'} in a century. Bare ground between the shrubs stops most fires spreading, and sagebrush has decades to grow back.`;
    if (cheat && after.length >= 5) t.done();
  };
  const sw = toggles(['Cheatgrass arrives in year 10'], [false], (on) => { cheat = on[0]; paint(); });
  f.controls.append(sw.node);
  const open = guessFirst(t, f, {
    ask: 'Cheatgrass fills the bare gaps between sagebrush with a grass that dries out by early summer. How does that change how often fire comes?',
    options: ['Fires come far more often', 'Little change', 'Fires come less often'],
    answer: 0,
    sliders: [],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
