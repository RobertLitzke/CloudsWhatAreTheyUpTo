// A fault to find: a circuit that should work and doesn't, a multimeter, and
// a few probes to spend. The colours and dots are off, as they are on a real
// bench, though a lamp or LED still shows whether it is lit. The reader
// measures volts between any two points, works out which part is at fault,
// and marks it. A hint costs a probe. Every lesson from 2 on ends with one;
// lesson 10 is made of them.

import { el } from 'didactics/dom';
import type { Part } from 'circuit-kit/parts';
import { solve, type Solution } from 'circuit-kit/solve';
import { boardView } from '../circuit/board';
import { schematic, type Placement, type SchematicOptions } from '../circuit/schematic';
import { volts } from '../circuit/units';
import { meterFace, placeTip, probeTip, stars } from './guess';
import { frame, type FigureContext, type Task } from './kit';

export interface HuntOptions {
  /** The circuit as it really is, fault and all. */
  parts: Part[];
  /** Where each part is drawn, as the circuit was designed; a fault is not drawn. */
  places: Placement[];
  schematic: Omit<SchematicOptions, 'onProbe' | 'onToggle'>;
  /** The drawing's size, and where the meter's face goes. */
  size: [number, number];
  face: [number, number];
  /** What the circuit should do, said before the hunt starts. */
  brief: string;
  /** The part that is at fault, by id, and what was wrong with it. */
  culprit: string;
  found: string;
  /** Hints, given one at a time, each costing a probe. */
  hints: string[];
  /** Probes to find it in for the last star. */
  par: number;
  /** Draw the circuit as a populated board instead of a schematic; `places` should then show the parts as they really are. */
  board?: boolean;
}

export function hunt(ctx: FigureContext, t: Task, o: HuntOptions) {
  const f = frame(o.size[0], o.size[1], 4);
  const s: Solution = solve(o.parts);
  let red: string | null = null;
  let black: string | null = null;
  let moving: 'red' | 'black' = 'black';
  let marking = false;
  let probes = 0;
  let hintsUsed = 0;
  let solved = false;
  let wrong: string | null = null;
  const face = meterFace(o.face[0], o.face[1], 86);
  const redTip = probeTip('red');
  const blackTip = probeTip('black');

  const onProbe = (node: string, part: Part) => {
    if (solved) return;
    if (marking) {
      marking = false;
      if (part.id === o.culprit) {
        solved = true;
        sch.cover({ glow: false });
        sch.show(s);
        earned.replaceChildren(stars([
          { text: 'Found the fault', got: true },
          { text: 'With no wrong guesses', got: !wrong },
          { text: `In ${o.par} probes or fewer (you took ${probes})`, got: probes <= o.par },
        ]));
        t.done();
      } else wrong = part.id;
      paint();
      return;
    }
    if (moving === 'red') red = node;
    else black = node;
    moving = moving === 'red' ? 'black' : 'red';
    probes++;
    paint();
  };
  const sch = o.board
    ? boardView(ctx, o.places, { size: o.size, typicalAmps: o.schematic.typicalAmps, grounds: o.schematic.grounds, onProbe })
    : schematic(ctx, o.places, { ...o.schematic, onProbe });
  sch.cover({ colour: true, dots: true });
  f.svg.append(sch.node, redTip, blackTip, face.node);

  const markBtn = el('button.btn.btn-small', { type: 'button' }, 'Mark the fault') as HTMLButtonElement;
  markBtn.addEventListener('click', () => {
    marking = !marking;
    paint();
  });
  const hintBtn = el('button.btn.btn-small.btn-ghost', { type: 'button' }, 'Hint (costs a probe)') as HTMLButtonElement;
  hintBtn.addEventListener('click', () => {
    if (hintsUsed < o.hints.length) {
      hintsUsed++;
      probes++;
      paint();
    }
  });
  const hintText = el('p.fig-hint');
  const earned = el('div');

  const paint = () => {
    sch.show(s);
    placeTip(redTip, red ? sch.pointOf(red) : undefined);
    placeTip(blackTip, black ? sch.pointOf(black) : undefined);
    const reading = red && black ? s.v[red] - s.v[black] : NaN;
    face.show(Number.isFinite(reading) ? reading.toFixed(2) : '----', 'V', `V  ${probes} probe${probes === 1 ? '' : 's'}`);
    markBtn.textContent = marking ? 'Now tap the faulty part' : 'Mark the fault';
    markBtn.disabled = solved;
    hintBtn.disabled = solved || hintsUsed >= o.hints.length;
    hintText.textContent = o.hints.slice(0, hintsUsed).join(' ');
    if (solved) {
      f.readout.textContent = o.found;
      return;
    }
    if (wrong) {
      f.readout.textContent = `Not that one: it measures as it should. Keep probing. ${red && black ? `The meter reads ${volts(reading)}.` : ''}`;
      return;
    }
    f.readout.textContent = !black
      ? `${o.brief} Tap a wire to put a probe on it; each tap places the black probe, then the red, in turn.`
      : !red
        ? 'Now tap another wire for the red probe. The meter reads how much higher red is than black.'
        : `The meter reads ${volts(reading)} from black to red. When you know where the fault is, mark it.`;
  };
  f.controls.append(el('div.fig-buttons', {}, markBtn, hintBtn), hintText, earned);
  paint();
  return f.node;
}
