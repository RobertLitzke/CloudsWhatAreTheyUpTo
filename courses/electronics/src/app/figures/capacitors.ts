// Lesson 6, things that take time: a capacitor charging through a resistor,
// passing a wiggle and stopping the steady part, rolling off the highs as a
// tone control, holding up a supply rail, a coil kicking back when its
// current is cut, and a coupling capacitor that has shorted.

import { el, svg } from 'didactics/dom';
import { line, polyline, small, type P } from 'didactics/draw';
import type { Part } from 'circuit-kit/parts';
import { simulate, type Sim } from 'circuit-kit/sim';
import { solve } from 'circuit-kit/solve';
import { wire } from '../circuit/build';
import { schematic } from '../circuit/schematic';
import { si, volts } from '../circuit/units';
import { hunt } from './bench';
import { guess, stars } from './guess';
import { animate, COL, figure, frame, slider } from './kit';
import { capture, scope } from './scope';

const farads = (f: number) => si(f, 'F');
const seconds = (s: number) => si(s, 's');
const hertz = (f: number) => si(f, 'Hz');
const IN = '#5b9bd5';

/** A row of chips, one picked, which calls `pick` with the chosen value. */
function chipRow<T>(values: readonly T[], show: (v: T) => string, at: () => T, pick: (v: T) => void): HTMLElement {
  const row = el('div.chips');
  const paint = () => row.replaceChildren(...values.map((v) => el('button.chip', { type: 'button', className: v === at() ? 'chip on' : 'chip', onclick: () => { pick(v); paint(); } }, show(v))));
  paint();
  return row;
}

// ---------------------------------------------------------------------------
// RC charging: guess the shape, then set R and C for a time constant of a second.

const WINDOW_RC = 5;
const RS = [1000, 4700, 10000, 47000, 100000];
const CS = [1e-6, 10e-6, 22e-6, 47e-6, 100e-6];

export const rcChargeFigure = figure(['tau'], (ctx, t) => {
  const f = frame(400, 300, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const sw = { id: 'sw', kind: 'switch' as const, a: 'v9', b: 's', closed: false };
  const r = { id: 'r', kind: 'resistor' as const, a: 's', b: 'c', ohms: 10000 };
  const c = { id: 'c', kind: 'capacitor' as const, a: 'c', b: 'cb', farads: 10e-6 };
  const w2 = wire('w2', 'cb', 'gnd');
  const parts: Part[] = [bat, sw, r, c, w2];
  const sch = schematic(ctx, [
    { part: bat, path: [[40, 70], [40, 120]], tag: '9 V', tagSide: 'left' },
    { part: sw, path: [[40, 70], [40, 24], [110, 24]] },
    { part: r, path: [[110, 24], [200, 24], [260, 24], [260, 50]], tag: 'R', tagSide: 'right' },
    { part: c, path: [[260, 50], [260, 120]], tag: 'C', tagSide: 'left' },
    { part: w2, path: [[260, 120], [260, 136], [40, 136], [40, 120]] },
  ], { topVolts: 9, typicalAmps: 0.0005, grounds: [[40, 136]] });
  const scr = scope({ x: 14, y: 165, w: 372, h: 120, vmin: 0, vmax: 10, window: WINDOW_RC });
  f.svg.append(sch.node, scr.node, small(300, 90, 'scope on C', { soft: true }));
  let sim: Sim = simulate(parts);
  let trace: number[] = [];
  let guessed = false;
  const combos = new Set<string>();
  const earned = el('div');

  const restart = () => {
    sw.closed = guessed;
    sim = simulate(parts);
    trace = [sim.now.v.c];
  };
  const paint = () => {
    const tau = r.ohms * c.farads;
    if (!guessed) {
      scr.hide('Guess first');
      f.readout.textContent = 'A 9 V battery, a switch, a resistor and an empty capacitor. Close the switch and current flows into the capacitor, charging it up. How does its voltage rise?';
      return;
    }
    scr.hide(null);
    const ok = Math.abs(tau - 1) < 0.1;
    if (ok) combos.add(`${r.ohms}:${c.farads}`);
    f.readout.textContent =
      `R x C = ${si(r.ohms, 'Ω')} x ${farads(c.farads)} = ${seconds(tau)}. In one time constant the capacitor charges 63% of the way (to 5.7 V), and in five time constants it is over 99% full. ` +
      (ok ? 'A time constant of a second.' : 'Choose R and C so that it is one second.');
    if (ok) {
      earned.replaceChildren(stars([
        { text: 'A time constant within 10% of a second', got: true },
        { text: 'With a capacitor of 22 µF or less: small capacitors are cheaper', got: [...combos].some((k) => Number(k.split(':')[1]) <= 22e-6) },
        { text: 'Found two different ways to make it', got: combos.size >= 2 },
      ]));
      t.done();
    }
  };
  const q = guess({
    question: 'Its voltage rises...',
    options: ['fast at first, then slower and slower', 'steadily, in a straight line', 'all at once, straight to 9 V'],
    answer: 0,
    replies: [
      'Right. As the capacitor fills, less voltage remains across the resistor, so the charging current slows down.',
      'It would rise in a straight line if the current stayed constant, but as the capacitor fills, less voltage is left across the resistor and the current drops.',
      'An empty capacitor has to fill, and the resistor limits how fast.',
    ],
    onLock: () => {
      guessed = true;
      knobs.hidden = false;
      restart();
      paint();
    },
  });
  const tail = el('p.fig-hint');
  const rRow = chipRow(RS, (v) => si(v, 'Ω'), () => r.ohms, (v) => { r.ohms = v; restart(); paint(); });
  const cRow = chipRow(CS, farads, () => c.farads, (v) => { c.farads = v; restart(); paint(); });
  const again = el('button.btn.btn-small.btn-ghost', { type: 'button', onclick: () => { restart(); paint(); } }, 'Empty it and charge again');
  const knobs = el('div', { hidden: true }, rRow, cRow, el('div.fig-buttons', {}, again));
  f.controls.append(q.node, knobs, tail, earned);

  // The scope runs in real time, drawing the capacitor's voltage as it charges.
  animate(f.svg, ctx, (dt) => {
    if (!guessed) return;
    if (sim.t < WINDOW_RC) {
      sim.step(dt, 4);
      trace.push(sim.now.v.c);
      scr.draw([{ volts: trace, colour: COL.voltage, span: Math.min(1, sim.t / WINDOW_RC) }]);
      scr.beam(Math.min(1, sim.t / WINDOW_RC));
      tail.textContent = `${seconds(Math.min(sim.t, WINDOW_RC))} since the switch closed: C is at ${volts(sim.now.v.c)}, and ${si(sim.now.i.r, 'A')} flows in.`;
    }
    sch.show(sim.now);
  });
  sch.show(sim.now);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A coupling capacitor: what gets past?

const WINDOW_AC = 0.01;

export const couplingFigure = figure(['reveal'], (ctx, t) => {
  const f = frame(400, 280, 4);
  const sig = { id: 'sig', kind: 'source' as const, a: 'in', b: 'lift', volts: 0, wave: { shape: 'sine' as const, amp: 1, hz: 200 } };
  const lift = { id: 'lift', kind: 'source' as const, a: 'lift', b: 'gnd', volts: 4.5 };
  const w1 = wire('w1', 'in', 'ca');
  const c = { id: 'c', kind: 'capacitor' as const, a: 'ca', b: 'out', farads: 1e-6 };
  const r = { id: 'r', kind: 'resistor' as const, a: 'out', b: 'gnd', ohms: 100000 };
  const parts: Part[] = [sig, lift, w1, c, r];
  const sch = schematic(ctx, [
    { part: sig, path: [[40, 30], [40, 70]], tag: 'Signal', tagSide: 'left' },
    { part: lift, path: [[40, 70], [40, 112]], tag: '4.5 V', tagSide: 'left' },
    { part: w1, path: [[40, 30], [40, 14], [170, 14], [170, 30]] },
    { part: c, path: [[170, 30], [170, 112], [260, 112], [260, 70]], tag: 'C', tagSide: 'right' },
    { part: r, path: [[260, 70], [260, 30], [330, 30], [330, 112]], tag: '100 kΩ', tagSide: 'right' },
  ], { topVolts: 9, typicalAmps: 0.00001, grounds: [[40, 112], [330, 112]] });
  const scr = scope({ x: 14, y: 140, w: 372, h: 125, vmin: -3, vmax: 7, window: WINDOW_AC });
  f.svg.append(sch.node, scr.node, small(150, 50, 'in', { fill: IN, bold: true }), small(270, 92, 'out', { fill: COL.current, bold: true }));
  let guessed = false;
  let fresh = false;

  const paint = () => {
    if (!guessed) {
      scr.hide('Guess first');
      f.readout.textContent = 'A 1 V wiggle riding on a steady 4.5 V goes into a capacitor. A capacitor is two plates with a gap between them, so no current can flow through it.';
      return;
    }
    scr.hide(null);
    const [vin, vout] = capture(parts, [(s) => s.v.ca, (s) => s.v.out], { window: WINDOW_AC, n: 240, settled: true, settle: 0.02 });
    scr.draw([{ volts: vout, colour: COL.current, label: 'out' }, { volts: vin, colour: IN, ghost: true }]);
    const size = (Math.max(...vout) - Math.min(...vout)) / 2;
    const mid = (Math.max(...vout) + Math.min(...vout)) / 2;
    f.readout.textContent =
      (fresh ? `${q.reply()} ` : '') +
      `Out comes a wiggle ${volts(size)} each way around ${volts(Math.abs(mid) < 0.05 ? 0 : mid)}: the steady 4.5 V stays behind on the capacitor. ` +
      (c.farads < 1e-7 ? 'This capacitor is too small to pass much of a note this low; make it smaller still and almost nothing gets through.' : 'Try a smaller capacitor.');
    fresh = false;
  };
  const q = guess({
    question: 'What comes out past the capacitor?',
    options: ['Just the wiggle, around 0 V', 'The wiggle on 4.5 V, unchanged', 'Nothing: it\'s a gap'],
    answer: 0,
    replies: [
      'Right. As the capacitor fills, less voltage remains across the resistor, so the charging current slows down.',
      'The steady DC voltage cannot cross the gap: once the capacitor charges up to 4.5 V, steady current stops.',
      'No charge crosses the gap, but each wiggle pushes charge onto one plate and pushes as much off the other.',
    ],
    onLock: () => {
      guessed = fresh = true;
      sizes.style.display = '';
      paint();
      t.done();
    },
  });
  const sizes = chipRow([1e-6, 10e-9, 1e-9], farads, () => c.farads, (v) => { c.farads = v; paint(); });
  sizes.style.display = 'none';
  f.controls.append(q.node, sizes);
  sch.show(solve(parts));
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A low-pass filter: sweep the frequency and find where it is down to 71%.

const R_LP = 10000;
const C_LP = 10e-9;
const F_LO = 50;
const F_HI = 20000;
const freqAt = (k: number) => Number((F_LO * (F_HI / F_LO) ** (k / 100)).toPrecision(2));

export const lowpassFigure = figure(['corner'], (ctx, t) => {
  const f = frame(400, 300, 4);
  const sig = { id: 'sig', kind: 'source' as const, a: 'in', b: 'gnd', volts: 0, wave: { shape: 'sine' as const, amp: 1, hz: 200 } };
  const r = { id: 'r', kind: 'resistor' as const, a: 'ra', b: 'out', ohms: R_LP };
  const c = { id: 'c', kind: 'capacitor' as const, a: 'out', b: 'cb', farads: C_LP };
  const w2 = wire('w2', 'cb', 'gnd');
  const w1 = wire('w1', 'in', 'ra');
  const parts: Part[] = [sig, w1, r, c, w2];
  const sch = schematic(ctx, [
    { part: sig, path: [[30, 60], [30, 110]], tag: 'Signal', tagSide: 'left' },
    { part: w1, path: [[30, 60], [30, 24], [50, 24]] },
    { part: r, path: [[50, 24], [150, 24], [150, 50]], tag: '10 kΩ', tagSide: 'right' },
    { part: c, path: [[150, 50], [150, 110]], tag: '10 nF', tagSide: 'left' },
    { part: w2, path: [[150, 110], [150, 126], [30, 126], [30, 110]] },
  ], { topVolts: 1, typicalAmps: 0.0001, grounds: [[30, 126]] });
  // The response: how much comes out, against frequency on a log scale.
  const X0 = 230;
  const X1 = 388;
  const Y0 = 120;
  const Y1 = 20;
  const px = (hz: number) => X0 + (Math.log(hz / F_LO) / Math.log(F_HI / F_LO)) * (X1 - X0);
  const py = (g: number) => Y0 - g * (Y0 - Y1);
  const dots = svg('g');
  const ticks: SVGElement[] = [];
  for (const hz of [100, 1000, 10000]) ticks.push(line(px(hz), Y0, px(hz), Y0 + 4, COL.ink, 1), small(px(hz), Y0 + 14, hertz(hz), { anchor: 'middle', soft: true }));
  const scr = scope({ x: 14, y: 160, w: 372, h: 125, vmin: -1.2, vmax: 1.2, window: 0.015 });
  f.svg.append(sch.node, line(X0, Y0, X1, Y0, COL.ink, 1.4), line(X0, Y0, X0, Y1, COL.ink, 1.4), ...ticks,
    line(X0, py(0.707), X1, py(0.707), COL.grid, 1, { 'stroke-dasharray': '3 3' }), small(X0 - 4, py(0.707) + 3, '71%', { anchor: 'end', soft: true }),
    small(X0 - 4, Y1 + 3, '100%', { anchor: 'end', soft: true }), small((X0 + X1) / 2, Y1 - 6, 'how much comes out', { anchor: 'middle', soft: true }),
    dots, scr.node, small(36, 40, 'in', { fill: IN, bold: true }), small(158, 44, 'out', { fill: COL.current, bold: true }));
  const seen = new Map<number, number>();
  let found = false;

  const paint = () => {
    const hz = sig.wave.hz;
    const window = 3 / hz;
    const [vin, vout] = capture(parts, [(s) => s.v.in, (s) => s.v.out], { window, n: 240, settled: true, settle: 10 * R_LP * C_LP });
    const gain = (Math.max(...vout) - Math.min(...vout)) / 2;
    seen.set(hz, gain);
    scr.draw([{ volts: vout, colour: COL.current, label: 'out' }, { volts: vin, colour: IN, ghost: true }]);
    dots.replaceChildren(
      ...[...seen].map(([h, g]) => svg('circle', { cx: px(h), cy: py(g), r: h === hz ? 4 : 2.6, fill: h === hz ? COL.current : COL.soft })),
      ...(found ? [polyline(Array.from({ length: 60 }, (_, k): P => { const h = F_LO * (F_HI / F_LO) ** (k / 59); return [px(h), py(1 / Math.hypot(1, h * 2 * Math.PI * R_LP * C_LP))]; }), COL.good, 1.4, { 'stroke-dasharray': '4 3' })] : []),
    );
    const corner = Math.abs(gain - 0.707) < 0.035;
    if (corner) found = true;
    f.readout.textContent =
      `At ${hertz(hz)}, ${Math.round(gain * 100)}% of the wiggle gets through. ` +
      (corner
        ? 'This is the corner: from here up, every doubling of the frequency halves what gets through.'
        : gain > 0.9 ? 'Low notes pass almost untouched. Turn it up.' : gain > 0.707 ? 'It is starting to fall.' : 'That is past the corner; sweep back to find where 71% of the signal gets through.');
    if (found) t.done();
  };
  f.controls.append(slider('Frequency', 0, 100, 1, 25, (k) => hertz(freqAt(k)), (k) => { sig.wave.hz = freqAt(k); paint(); }).node);
  sig.wave.hz = freqAt(25);
  sch.show(solve(parts));
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Decoupling: a load switching on and off pulls the supply down; a capacitor holds it up.

const WINDOW_DC = 0.0003;
const DECOUPLE = [0, 1e-6, 10e-6, 100e-6, 1000e-6];

export const decouplingFigure = figure(['hold'], (ctx, t) => {
  const f = frame(400, 290, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const lead = wire('lead', 'v9', 'rail', 10);
  const motor = { id: 'motor', kind: 'resistor' as const, a: 'rail', b: 'd', ohms: 100 };
  const fet = { id: 'fet', kind: 'mosfet' as const, type: 'n' as const, d: 'd', g: 'g', s: 'gnd', vth: 2, k: 0.5 };
  const drive = { id: 'drive', kind: 'source' as const, a: 'g', b: 'gnd', volts: 2.5, wave: { shape: 'square' as const, amp: 2.5, hz: 10000 } };
  const chip = { id: 'chip', kind: 'resistor' as const, a: 'rail', b: 'gnd', ohms: 10000 };
  const cap = { id: 'cap', kind: 'capacitor' as const, a: 'rail', b: 'cb', farads: 100e-6 };
  const cw = wire('cw', 'cb', 'gnd');
  const parts: Part[] = [bat, lead, motor, fet, drive, chip, cap, cw];
  /** The capacitor chosen, 0 for none; with none, the part stays in the circuit but too small to matter. */
  let picked = 0;
  const sch = schematic(ctx, [
    { part: bat, path: [[30, 70], [30, 120]], tag: '9 V', tagSide: 'left' },
    { part: lead, path: [[30, 70], [30, 24], [130, 24]] },
    { part: chip, path: [[130, 24], [130, 100]] },
    { part: motor, path: [[130, 24], [330, 24], [330, 60]], tag: 'Load', tagSide: 'right' },
    { part: fet, at: [320, 96], leads: { d: [[330, 70], [330, 60]], g: [[294, 96], [270, 96]], s: [[330, 122], [330, 128]] } },
    { part: drive, path: [[270, 96], [270, 136]], tag: 'on, off', tagSide: 'right' },
  ], { topVolts: 9, typicalAmps: 0.05, grounds: [[30, 120], [130, 100], [270, 136], [330, 128]] });
  const capDraw = schematic(ctx, [{ part: cap, path: [[185, 24], [185, 110]], tag: 'C', tagSide: 'left' }], { topVolts: 9, typicalAmps: 0.05, grounds: [[185, 110]] });
  const scr = scope({ x: 14, y: 160, w: 372, h: 115, vmin: 7, vmax: 9.4, window: WINDOW_DC });
  f.svg.append(sch.node, capDraw.node, scr.node, small(80, 16, 'long leads, 10 Ω', { anchor: 'middle', soft: true }), small(140, 70, 'chip', { soft: true }));
  let done = false;
  let smallest = Infinity;
  const earned = el('div');

  const paint = () => {
    cap.farads = picked || 1e-12;
    capDraw.node.style.display = picked ? '' : 'none';
    const [rail] = capture(parts, [(s) => s.v.rail], { window: WINDOW_DC, n: 240, settled: true, settle: picked ? 0.005 : 0.0002 });
    scr.draw([{ volts: rail, colour: COL.voltage, label: 'chip\'s supply' }]);
    const dip = Math.max(...rail) - Math.min(...rail);
    const s = solve(parts);
    sch.show(s);
    capDraw.show(s);
    f.readout.textContent =
      `Every time the load switches on, its current pulls voltage down across the lead resistance, and the chip's supply dips by ${volts(dip)}. ` +
      (!picked ? 'Put a capacitor across the supply, right by the chip.' : dip <= 0.1 ? 'The capacitor supplies the quick bursts of current locally and refills from the battery between pulses, so the chip\'s voltage barely dips.' : 'That helps, but the voltage still dips more than 0.1 V. Try a larger capacitor.');
    if (dip <= 0.1 && picked) {
      smallest = Math.min(smallest, picked);
      done = true;
      t.done();
    }
    if (done) earned.replaceChildren(stars([
      { text: 'The supply holds within 0.1 V', got: true },
      { text: 'With the smallest capacitor that does it', got: smallest <= 100e-6 },
    ]));
  };
  f.controls.append(chipRow(DECOUPLE, (v) => (!v ? 'No capacitor' : v >= 1e-3 ? '1000 µF' : farads(v)), () => picked, (v) => { picked = v; paint(); }), earned);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Kickback: a coil's current cut off suddenly.

const WINDOW_KB = 0.01;
const SAMPLES_KB = 250;

export const kickbackFigure = figure(['spike'], (ctx, t) => {
  const f = frame(400, 280, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'v12', b: 'gnd', volts: 12 };
  const sw = { id: 'sw', kind: 'switch' as const, a: 'v12', b: 'k', closed: true };
  // The air between the switch's contacts as they part: not drawn, but it is the only way left for the coil's current.
  const gap = { id: 'gap', kind: 'resistor' as const, a: 'v12', b: 'k', ohms: 4700 };
  const coil = { id: 'coil', kind: 'inductor' as const, a: 'k', b: 'kb', henries: 0.1, ohms: 50 };
  const w2 = wire('w2', 'kb', 'gnd');
  const parts: Part[] = [bat, sw, gap, coil, w2];
  const sch = schematic(ctx, [
    { part: bat, path: [[40, 70], [40, 120]], tag: '12 V', tagSide: 'left' },
    { part: sw, path: [[40, 70], [40, 24], [110, 24]] },
    { part: coil, path: [[110, 24], [220, 24], [220, 120]], tag: 'Relay coil', tagSide: 'right' },
    { part: w2, path: [[220, 120], [220, 136], [40, 136], [40, 120]] },
  ], { topVolts: 12, typicalAmps: 0.2, grounds: [[40, 136]] });
  const scr = scope({ x: 14, y: 160, w: 372, h: 105, vmin: 0, vmax: 1200, window: WINDOW_KB });
  f.svg.append(sch.node, scr.node, small(52, 52, '<- scope across the switch', { soft: true }));

  const run = () => {
    sw.closed = true;
    const sim = simulate(parts, { settled: true });
    const across: number[] = [];
    const per = WINDOW_KB / SAMPLES_KB;
    // A scope's peak-detect mode: each point on the screen shows the biggest voltage during its slice of time, so a spike too short to sample still shows.
    for (let k = 0; k < SAMPLES_KB; k++) {
      if (k === SAMPLES_KB / 5) sw.closed = false;
      let peak = 0;
      for (let j = 0; j < 40; j++) {
        const s = sim.step(per / 40);
        const v = s.v.v12 - s.v.k;
        if (Math.abs(v) > Math.abs(peak)) peak = v;
      }
      across.push(peak);
    }
    sch.show(sim.now);
    scr.draw([{ volts: across, colour: COL.power }]);
    const top = Math.max(...across);
    f.readout.textContent = `${q.reply()} For a few microseconds the collapsing magnetic field drives ${volts(Math.round(top / 10) * 10)} across the opening contacts, enough to strike an arc across the gap. Once the field's energy is spent, the open switch simply sits at the battery's 12 V. Those arcs pit switch contacts, and the voltage spike will destroy a transistor switch; lesson 8 adds a diode to stop it.`;
  };
  const q = guess({
    question: 'The coil carries 0.24 A. You open the switch. Across the switch you\'d measure...',
    options: ['far more than 12 V, for an instant', '12 V', '0 V'],
    answer: 0,
    replies: [
      'Right. As the capacitor fills, less voltage remains across the resistor, so the charging current slows down.',
      '12 V is where it settles afterward, but watch the spike at the instant the contacts open.',
      'Once the field dies out, no current flows and the 12 V supply sits across the open switch, but a big inductive spike happens first.',
    ],
    onLock: () => {
      scr.hide(null);
      run();
      t.done();
    },
  });
  f.controls.append(q.node);
  scr.hide('Guess first');
  sch.show(solve(parts));
  f.readout.textContent = 'A 12 V battery drives 0.24 A through a relay\'s coil, building a magnetic field around it. The scope watches the voltage across the switch.';
  return f.node;
});

// ---------------------------------------------------------------------------
// The fault: a coupling capacitor that has shorted, joining two stages' steady voltages.

export const shortedCapFigure = figure(['find'], (ctx, t) => {
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'v9', 'rt');
  const r1 = { id: 'r1', kind: 'resistor' as const, a: 'rt', b: 'a', ohms: 100000 };
  const r2 = { id: 'r2', kind: 'resistor' as const, a: 'a', b: 'r2b', ohms: 100000 };
  const w2 = wire('w2', 'r2b', 'gnd');
  const wa = wire('wa', 'a', 'pa');
  const bufA = { id: 'bufA', kind: 'opamp' as const, plus: 'pa', minus: 'oa', out: 'oa', vcc: 'rt', vee: 'gnd' };
  const cDrawn = { id: 'c1', kind: 'capacitor' as const, a: 'oa', b: 'b', farads: 1e-6 };
  // As it really is: the capacitor's insulation has broken down, and it conducts like a wire.
  const cShort = wire('c1', 'oa', 'b', 0.5);
  const r3 = { id: 'r3', kind: 'resistor' as const, a: 'rt', b: 'b', ohms: 100000 };
  const r4 = { id: 'r4', kind: 'resistor' as const, a: 'b', b: 'r4b', ohms: 27000 };
  const w4 = wire('w4', 'r4b', 'gnd');
  const wb = wire('wb', 'b', 'pb');
  const bufB = { id: 'bufB', kind: 'opamp' as const, plus: 'pb', minus: 'ob', out: 'ob', vcc: 'rt', vee: 'gnd' };
  const parts: Part[] = [bat, w1, r1, r2, w2, wa, bufA, cShort, r3, r4, w4, wb, bufB];
  return hunt(ctx, t, {
    parts,
    places: [
      { part: bat, path: [[30, 100], [30, 150]], tag: '9 V', tagSide: 'left' },
      { part: w1, path: [[30, 100], [30, 30], [80, 30], [262, 30]] },
      { part: r1, path: [[80, 30], [80, 95]], tag: 'R1', tagSide: 'right' },
      { part: r2, path: [[80, 95], [80, 160]], tag: 'R2', tagSide: 'left' },
      { part: w2, path: [[80, 160], [80, 200], [30, 200], [30, 150]] },
      { part: wa, path: [[80, 95], [112, 95]] },
      { part: bufA, at: [150, 81], leads: { minus: [[112, 67], [102, 67], [102, 46], [205, 46], [205, 81]], out: [[190, 81], [218, 81]] } },
      { part: cDrawn, path: [[218, 81], [262, 81]], tag: 'C1', tagSide: 'left' },
      { part: r3, path: [[262, 30], [262, 81]], tag: 'R3', tagSide: 'left' },
      { part: r4, path: [[262, 81], [262, 160]], tag: 'R4', tagSide: 'right' },
      { part: w4, path: [[262, 160], [262, 200], [80, 200]] },
      { part: wb, path: [[262, 81], [275, 81], [275, 123], [292, 123]] },
      { part: bufB, at: [330, 109], leads: { minus: [[292, 95], [284, 95], [284, 70], [384, 70], [384, 109]], out: [[370, 109], [392, 109]] } },
    ],
    schematic: { topVolts: 9, typicalAmps: 0.0001, grounds: [[30, 200]] },
    size: [400, 240],
    face: [110, 140],
    brief: 'Two buffers in a row, joined by C1. R1 and R2 (100 kΩ each) bias the first stage at 4.5 V; R3 (100 kΩ) and R4 (27 kΩ) should bias the second at 1.9 V, but it sits at the wrong voltage. Power pins are not drawn.',
    culprit: 'c1',
    found: 'Found it: C1 has failed short. A healthy coupling capacitor would hold 2.6 V across itself, the difference between the two stages\' bias voltages, and pass only the AC signal. Shorted, it measures 0 V across its leads and lets the first buffer drag the second stage\'s input straight to 4.5 V. Capacitors fail like this when pushed past their voltage rating.',
    hints: ['Measure each stage\'s steady voltage to ground, then measure across C1.', 'A coupling capacitor should have the difference between two steady voltages across it.'],
    par: 6,
  });
});
