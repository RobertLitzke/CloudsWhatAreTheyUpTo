// Lesson 10, the dead circuit: one stage, the common-emitter amplifier of
// lesson 9 with a power LED beside it, drawn as a schematic and as the board
// it is built on, and then three boards that don't work, to be found with a
// meter and a budget of probes.

import { el } from 'didactics/dom';
import type { Part } from 'circuit-kit/parts';
import { solve } from 'circuit-kit/solve';
import { OPEN, wire } from '../circuit/build';
import { boardView } from '../circuit/board';
import { schematic, type Placement } from '../circuit/schematic';
import { commonEmitter } from './amplifiers';
import { hunt } from './bench';
import { figure, frame, type FigureContext, type Task } from './kit';

const SIZE: [number, number] = [400, 240];

/** The stage: lesson 9's amplifier, and a red LED with its 1 kΩ resistor to show the power is on. */
function stage() {
  const amp = commonEmitter(false);
  const w5 = wire('w5', 'rt', 'lt');
  const rl = { id: 'rl', kind: 'resistor' as const, a: 'lt', b: 'la', ohms: 1000 };
  const led = { id: 'led', kind: 'diode' as const, a: 'la', b: 'lk', model: 'led-red' as const };
  const w6 = wire('w6', 'lk', 'gnd');
  const parts: Part[] = [...amp.parts, w5, rl, led, w6];
  const places: Placement[] = [
    ...amp.places.map((p) => ('path' in p && p.part.id === 'bat' ? { ...p, tag: '9 V', tagSide: 'right' as const } : p)),
    { part: w5, path: [[150, 20], [60, 20], [60, 34]] },
    { part: rl, path: [[60, 34], [60, 90]], tag: 'R5', tagSide: 'right' },
    { part: led, path: [[60, 90], [60, 150]], tag: 'D1', tagSide: 'right' },
    { part: w6, path: [[60, 150], [60, 166]] },
  ];
  // The silkscreen names the board's parts as a schematic would: R1 to R4, Q1.
  for (const p of places) {
    if (!('path' in p)) p.tag = 'Q1';
    else if (p.part.id === 'rc') p.tag = 'R3';
    else if (p.part.id === 're') p.tag = 'R4';
  }
  return { ...amp, parts, places, grounds: [...amp.grounds, [60, 166]] as [number, number][], w5, rl, led };
}

// ---------------------------------------------------------------------------
// One circuit, two drawings: find the same point on each.

export const twoViewsFigure = figure(['match'], (ctx, t) => {
  const f = frame(SIZE[0], SIZE[1], 3);
  const st = stage();
  let view: 'schematic' | 'board' = 'schematic';
  let found = false;
  const onProbe = (node: string) => {
    if (view !== 'board') return;
    if (node === 'b') {
      found = true;
      t.done();
    }
    paint(node);
  };
  const sch = schematic(ctx, st.places, { topVolts: 9, typicalAmps: 0.001, grounds: st.grounds });
  const brd = boardView(ctx, st.places, { size: SIZE, typicalAmps: 0.001, grounds: st.grounds, onProbe });
  const s = solve(st.parts);
  sch.show(s);
  brd.show(s);
  f.svg.append(sch.node, brd.node);
  const row = el('div.chips');
  const paint = (tapped?: string) => {
    sch.node.style.display = view === 'schematic' ? '' : 'none';
    brd.node.style.display = view === 'board' ? '' : 'none';
    row.replaceChildren(...(['schematic', 'board'] as const).map((v) => el('button.chip', { type: 'button', className: v === view ? 'chip on' : 'chip', onclick: () => { view = v; paint(); } }, v === 'schematic' ? 'Schematic' : 'Board')));
    f.readout.textContent = found
      ? 'That\'s the base: the pad where R1, R2 and the transistor\'s middle leg all meet. Every wire on the schematic is a copper trace on the board, and every junction is where traces meet at a pad.'
      : view === 'schematic'
        ? 'Lesson 9\'s amplifier, with an LED to show the power is on. Find where the transistor\'s base joins R1 and R2, then switch to the board.'
        : tapped
          ? 'Try another trace. On the board, find the trace that joins R1, R2 and the transistor\'s middle leg, and tap it.'
          : 'The same circuit as it is built. Tap the trace that carries the transistor\'s base.';
  };
  f.controls.append(row);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Three boards that don't work.

const BRIEF = 'The amplifier from lesson 9 on its board: the base should sit at about 1.6 V, the emitter at 0.9 V and the collector near 4.7 V, and D1 should glow. R1 is 47 kΩ, R2 10 kΩ, R3 4.7 kΩ, R4 1 kΩ, R5 1 kΩ.';

function boardHunt(ctx: FigureContext, t: Task, parts: Part[], places: Placement[], grounds: [number, number][], o: { brief: string; culprit: string; found: string; hints: string[]; par: number }) {
  return hunt(ctx, t, {
    parts,
    places,
    schematic: { topVolts: 9, typicalAmps: 0.001, grounds },
    size: SIZE,
    face: [168, 186],
    board: true,
    ...o,
  });
}

export const deadLedFigure = figure(['find'], (ctx, t) => {
  const st = stage();
  // A hairline crack in the trace to the LED, as a board flexed in its case gets.
  st.w5.ohms = OPEN;
  return boardHunt(ctx, t, st.parts, st.places, st.grounds, {
    brief: `${BRIEF} The amplifier works, but D1 is dark.`,
    culprit: 'w5',
    found: 'Found it: the trace from the supply to R5 has cracked, too fine to see. The whole 9 V turned up across a piece of copper that should drop nothing, as it does across any break. On a real board you would bridge it with a short piece of wire.',
    hints: ['Is D1 getting any voltage at all?', 'Work back from D1 towards the supply, one stretch at a time.'],
    par: 5,
  });
});

export const wrongRcFigure = figure(['find'], (ctx, t) => {
  const st = stage();
  // Yellow-violet-brown went in where yellow-violet-red should have: 470 Ω, not 4.7 kΩ.
  st.rc.ohms = 470;
  return boardHunt(ctx, t, st.parts, st.places, st.grounds, {
    brief: `${BRIEF} D1 glows, but the signal comes out weak.`,
    culprit: 'rc',
    found: 'Found it: R3 is 470 Ω instead of 4.7 kΩ. The base and emitter voltages are right, so the bias current is right, but the smaller collector resistor drops only a tenth of the expected voltage: the collector sits near 8.6 V and the voltage gain is roughly a tenth of what it should be. Its third band is brown instead of red; on the board you can read it.',
    hints: ['Base and emitter first. Are they right?', 'If the current is right, which resistor sets the collector voltage? Look at its bands.'],
    par: 6,
  });
});

export const dryJointFigure = figure(['find'], (ctx, t) => {
  const st = stage();
  // A dry joint where R4 meets the emitter: the solder never wet the lead, and it is many kilohms.
  const joint = wire('joint', 'e', 'ej', 10000);
  const re = { ...st.re, a: 'ej' };
  const parts = [...st.parts.filter((p) => p.id !== 're'), re, joint];
  const places = st.places.map((p) => ('path' in p && p.part.id === 're' ? { ...p, part: re } : p));
  return boardHunt(ctx, t, parts, places, st.grounds, {
    brief: `${BRIEF} D1 glows, but the amplifier passes almost nothing.`,
    culprit: 're',
    found: 'Found it: a dry joint where R4 meets the emitter. The solder never properly wet the lead, leaving a contact resistance of thousands of ohms. You measured nearly a volt between the transistor\'s emitter leg and R4\'s pad, across a joint that should drop 0 V. Reflow it by heating the pad and lead together and feeding in fresh solder.',
    hints: ['The base and emitter leg read right, but the collector doesn\'t. Where does the emitter\'s current go next?', 'Measure from the transistor\'s emitter leg to the pad of R4 it should be joined to.'],
    par: 7,
  });
});
