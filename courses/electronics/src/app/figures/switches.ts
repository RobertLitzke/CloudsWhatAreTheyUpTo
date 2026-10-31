// Lesson 8, a small current steering a big one: a bipolar transistor
// switching a lamp, hard on or wastefully half on; a MOSFET switching a pump
// from a microcontroller's 3.3 V; a relay's coil kicking back at the
// transistor that drives it, and the diode that catches it; two transistors
// switching each other on and off to blink a pair of LEDs; and a transistor
// that has failed shorted.

import { el } from 'didactics/dom';
import { small } from 'didactics/draw';
import type { Part } from 'circuit-kit/parts';
import { simulate } from 'circuit-kit/sim';
import { solve } from 'circuit-kit/solve';
import { wire } from '../circuit/build';
import { schematic } from '../circuit/schematic';
import { amps, ohms, si, volts, watts } from '../circuit/units';
import { hunt } from './bench';
import { guess, stars } from './guess';
import { animate, COL, figure, frame } from './kit';
import { scope } from './scope';

const seconds = (s: number) => si(s, 's');

/** A row of chips, one picked, which calls `pick` with the chosen value. */
function chipRow<T>(values: readonly T[], show: (v: T) => string, at: () => T, pick: (v: T) => void): HTMLElement {
  const row = el('div.chips');
  const paint = () => row.replaceChildren(...values.map((v) => el('button.chip', { type: 'button', className: v === at() ? 'chip on' : 'chip', onclick: () => { pick(v); paint(); } }, show(v))));
  paint();
  return row;
}

// ---------------------------------------------------------------------------
// A transistor switching a lamp: choose the base resistor.

const BASE_RS = [1e6, 100000, 22000, 4700, 1000];

export const bjtSwitchFigure = figure(['hard'], (ctx, t) => {
  const f = frame(400, 230, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'v9', 'lt');
  const lamp = { id: 'lamp', kind: 'lamp' as const, a: 'lt', b: 'c', ohms: 90, rated: 9 };
  const ctl = { id: 'ctl', kind: 'source' as const, a: 'ctl', b: 'gnd', volts: 5 };
  const rb = { id: 'rb', kind: 'resistor' as const, a: 'ctl', b: 'b', ohms: 100000 };
  const q = { id: 'q', kind: 'bjt' as const, type: 'npn' as const, c: 'c', b: 'b', e: 'gnd', beta: 200 };
  const parts: Part[] = [bat, w1, lamp, ctl, rb, q];
  const sch = schematic(ctx, [
    { part: bat, path: [[350, 95], [350, 155]], tag: '9 V', tagSide: 'right' },
    { part: w1, path: [[350, 95], [350, 30], [260, 30], [260, 50]] },
    { part: lamp, path: [[260, 50], [260, 110], [260, 120]], tag: '9 V lamp', tagSide: 'left' },
    { part: q, at: [250, 146], leads: { c: [[260, 120]], b: [[224, 146], [170, 146]], e: [[260, 172], [260, 200]] } },
    { part: rb, path: [[170, 146], [100, 146], [60, 146], [60, 110]], tag: 'R base', tagSide: 'left' },
    { part: ctl, path: [[60, 110], [60, 160]], tag: '5 V', tagSide: 'right' },
  ], { topVolts: 9, typicalAmps: 0.05, grounds: [[60, 160], [260, 200], [350, 155]] });
  f.svg.append(sch.node, small(60, 200, 'control', { anchor: 'middle', soft: true }));
  const earned = el('div');
  let done = false;
  let leanest = Infinity;

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    const ib = s.i.rb;
    const ic = s.i.q;
    const vce = s.v.c;
    const pq = vce * ic;
    const hard = vce < 0.25;
    f.readout.textContent =
      `${ohms(rb.ohms)} lets ${amps(ib)} into the base, and the transistor lets ${amps(ic)} through the lamp, ${Math.round(ic / Math.max(ib, 1e-12))} times as much. It drops ${volts(vce)} and turns ${watts(pq)} into heat. ` +
      (hard ? 'Hard on: the lamp gets nearly all of the 9 V, and the transistor barely warms.' : ic < 0.002 ? 'Cut off, or nearly so.' : 'Half on: the lamp is dim, and the transistor is turning the rest of the voltage into heat. For a switch, that middle region is the worst place to operate.');
    if (hard) {
      leanest = Math.min(leanest, ib);
      done = true;
      t.done();
    }
    if (done) earned.replaceChildren(stars([
      { text: 'Switched hard on', got: true },
      { text: 'With no more base current than it needs, under 2 mA', got: leanest < 0.002 },
    ]));
  };
  f.controls.append(chipRow(BASE_RS, (r) => ohms(r), () => rb.ohms, (r) => { rb.ohms = r; paint(); }), earned);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A MOSFET switching a pump from a microcontroller.

const FETS = {
  standard: { vth: 3, k: 5, name: 'Standard MOSFET' },
  logic: { vth: 1.2, k: 6, name: 'Logic-level MOSFET' },
} as const;
type Fet = keyof typeof FETS;

export const mosfetSwitchFigure = figure(['logic'], (ctx, t) => {
  const f = frame(400, 230, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'v12', b: 'gnd', volts: 12 };
  const w1 = wire('w1', 'v12', 'pt');
  const pump = { id: 'pump', kind: 'resistor' as const, a: 'pt', b: 'd', ohms: 6 };
  const gate = { id: 'gate', kind: 'source' as const, a: 'g', b: 'gnd', volts: 3.3 };
  const fet = { id: 'fet', kind: 'mosfet' as const, type: 'n' as const, d: 'd', g: 'g', s: 'gnd', vth: 3, k: 5 };
  const parts: Part[] = [bat, w1, pump, gate, fet];
  const sch = schematic(ctx, [
    { part: bat, path: [[350, 95], [350, 155]], tag: '12 V', tagSide: 'right' },
    { part: w1, path: [[350, 95], [350, 30], [260, 30], [260, 50]] },
    { part: pump, path: [[260, 50], [260, 120]], tag: 'Pump, 2 A', tagSide: 'left' },
    { part: fet, at: [250, 146], leads: { d: [[260, 120]], g: [[224, 146], [90, 146]], s: [[260, 172], [260, 200]] } },
    { part: gate, path: [[90, 146], [90, 196]], tag: 'Gate drive', tagSide: 'right' },
  ], { topVolts: 12, typicalAmps: 1, grounds: [[90, 196], [260, 200], [350, 155]] });
  f.svg.append(sch.node);
  let kind: Fet = 'standard';
  let guessed = false;
  let fresh = false;

  const paint = () => {
    Object.assign(fet, { vth: FETS[kind].vth, k: FETS[kind].k });
    const s = solve(parts);
    sch.show(s);
    const id = s.i.fet;
    const vp = s.v.pt - s.v.d;
    const pf = s.v.d * id;
    if (!guessed) {
      sch.cover({ colour: true, dots: true });
      f.readout.textContent = 'A MOSFET\'s gate is insulated, so it draws no steady current and responds to voltage alone. Here a microcontroller puts 3.3 V on the gate of a standard MOSFET to switch a 12 V, 2 A pump.';
      return;
    }
    sch.cover({});
    const full = vp > 11.5;
    f.readout.textContent =
      (fresh ? `${q.reply()} ` : '') +
      `${FETS[kind].name}, ${volts(gate.volts)} on its gate: ${amps(id)} flows, the pump gets ${volts(vp)}, and the MOSFET turns ${watts(pf)} into heat. ` +
      (full ? (pf < 0.5 ? 'Fully on, and cool.' : 'Fully on.') : id < 0.05 ? 'Off.' : 'Only partly on, so the MOSFET drops several volts and overheats.');
    fresh = false;
    if (full && gate.volts === 3.3) t.done();
  };
  const q = guess({
    question: 'The pump...',
    options: ['runs weakly, and the MOSFET gets hot', 'runs fully', 'doesn\'t run at all'],
    answer: 0,
    replies: [
      'Right.',
      'A standard MOSFET needs about 10 V on its gate to turn fully on; 3.3 V is barely past its threshold voltage.',
      'At 3.3 V the gate is just above this MOSFET\'s threshold, so it lets some current through, but far too little to run the pump properly.',
    ],
    onLock: () => {
      guessed = fresh = true;
      knobs.style.display = '';
      paint();
    },
  });
  const knobs = el('div', {},
    chipRow([3.3, 5, 10], (v) => `${v} V gate`, () => gate.volts, (v) => { gate.volts = v; paint(); }),
    chipRow(Object.keys(FETS) as Fet[], (k) => FETS[k].name, () => kind, (k) => { kind = k; paint(); }),
  );
  knobs.style.display = 'none';
  f.controls.append(q.node, knobs);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A relay driven by a transistor: the kick when it turns off, and the diode that catches it.

const WINDOW_RELAY = 0.01;
const SAMPLES_RELAY = 200;

export const relayFigure = figure(['safe'], (ctx, t) => {
  const f = frame(400, 300, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'v12', b: 'gnd', volts: 12 };
  const w1 = wire('w1', 'v12', 'kt');
  const coil = { id: 'coil', kind: 'inductor' as const, a: 'kt', b: 'c', henries: 0.1, ohms: 120 };
  const ctl = { id: 'ctl', kind: 'source' as const, a: 'ctl', b: 'gnd', volts: 5 };
  const rb = { id: 'rb', kind: 'resistor' as const, a: 'ctl', b: 'b', ohms: 2200 };
  const q = { id: 'q', kind: 'bjt' as const, type: 'npn' as const, c: 'c', b: 'b', e: 'gnd', beta: 200 };
  // A real transistor's collector breaks down past its rating and conducts: not drawn, but it is where the coil's current goes without the diode.
  const breakdown = { id: 'breakdown', kind: 'resistor' as const, a: 'c', b: 'gnd', ohms: 4700 };
  const diode = { id: 'flyback', kind: 'diode' as const, a: 'c', b: 'kt', model: 'silicon' as const };
  const base: Part[] = [bat, w1, coil, ctl, rb, q, breakdown];
  let withDiode = false;
  const sch = schematic(ctx, [
    { part: bat, path: [[360, 95], [360, 140]], tag: '12 V', tagSide: 'right' },
    { part: w1, path: [[360, 95], [360, 24], [260, 24], [260, 40]] },
    { part: coil, path: [[260, 40], [260, 100], [260, 110]], tag: 'Relay coil', tagSide: 'left' },
    { part: q, at: [250, 136], leads: { c: [[260, 110]], b: [[224, 136], [160, 136]], e: [[260, 162], [260, 172]] } },
    { part: rb, path: [[160, 136], [70, 136], [70, 100]], tag: '2.2 kΩ', tagSide: 'left' },
    { part: ctl, path: [[70, 100], [70, 140]], tag: 'Control', tagSide: 'right' },
  ], { topVolts: 12, typicalAmps: 0.1, grounds: [[70, 140], [260, 172], [360, 140]] });
  const diodeDraw = schematic(ctx, [{ part: diode, path: [[260, 110], [215, 110], [215, 40], [260, 40]] }], { topVolts: 12, typicalAmps: 0.1 });
  const scr = scope({ x: 14, y: 190, w: 372, h: 95, vmin: 0, vmax: 500, window: WINDOW_RELAY });
  f.svg.append(sch.node, diodeDraw.node, scr.node, small(282, 166, 'scope on the', { soft: true }), small(282, 178, 'collector', { soft: true }));
  const seen = new Set<boolean>();

  const run = () => {
    const parts = withDiode ? [...base, diode] : base;
    ctl.volts = 5;
    const sim = simulate(parts, { settled: true });
    const trace: number[] = [];
    const per = WINDOW_RELAY / SAMPLES_RELAY;
    // Peak detect, as in lesson 6: each point shows the highest voltage in its slice of time.
    for (let k = 0; k < SAMPLES_RELAY; k++) {
      if (k === SAMPLES_RELAY / 5) ctl.volts = 0;
      let peak = -Infinity;
      for (let j = 0; j < 20; j++) peak = Math.max(peak, sim.step(per / 20).v.c);
      trace.push(peak);
    }
    sch.show(sim.now);
    diodeDraw.show(sim.now);
    scr.range(0, withDiode ? 20 : 500);
    scr.draw([{ volts: trace, colour: COL.power }]);
    const top = Math.max(...trace);
    seen.add(withDiode);
    f.readout.textContent = withDiode
      ? `With the diode in place, the coil's current has a path around the loop through the diode and back into the coil, decaying over a few milliseconds. The collector only rises to ${volts(top)}, one diode drop above the supply. The transistor is safe, and the relay armature releases a little more slowly.`
      : `When the transistor turns off, the coil keeps pushing current and drives the collector to ${volts(Math.round(top))}, well past a typical 40 V transistor rating. A real transistor breaks down under that spike, and after repeated hits it fails permanently, usually as a collector-to-emitter short.`;
    if (seen.has(true) && seen.has(false)) t.done();
  };
  const paintDiode = () => (diodeDraw.node.style.display = withDiode ? '' : 'none');
  const offBtn = el('button.btn.btn-small', { type: 'button', onclick: run }, 'Switch the relay off') as HTMLButtonElement;
  f.controls.append(chipRow([false, true], (d) => (d ? 'Flyback diode' : 'No diode'), () => withDiode, (d) => { withDiode = d; paintDiode(); }), el('div.fig-buttons', {}, offBtn));
  paintDiode();
  sch.show(solve(base));
  scr.hide('Switch it off to see');
  const unhide = () => scr.hide(null);
  offBtn.addEventListener('click', unhide);
  f.readout.textContent = 'A transistor drives a relay\'s coil from 12 V while 0.1 A builds its magnetic field. The scope watches the transistor\'s collector as the control switches it off.';
  return f.node;
});

// ---------------------------------------------------------------------------
// The two-transistor blinker: each transistor holds the other off through a capacitor, until it recharges.

const BLINK_CS = [4.7e-6, 10e-6, 15e-6, 22e-6, 47e-6];
const WINDOW_BLINK = 3;
const BASE_TRACE = '#5b9bd5';

/** The blinker's parts, with C1 and C2 given, and the nudge that starts it: C1 a little charged, so one side wins the race. */
export function blinker(c1: number, c2: number) {
  const parts = {
    bat: { id: 'bat', kind: 'source' as const, a: 'v', b: 'gnd', volts: 9 },
    w0: wire('w0', 'v', 't1'),
    w1: wire('w1', 't1', 't2'),
    w2: wire('w2', 't2', 't3'),
    w3: wire('w3', 't3', 't4'),
    r1: { id: 'r1', kind: 'resistor' as const, a: 't1', b: 'l1', ohms: 470 },
    led1: { id: 'led1', kind: 'diode' as const, a: 'l1', b: 'k1', model: 'led-red' as const },
    rb1: { id: 'rb1', kind: 'resistor' as const, a: 't2', b: 'b1', ohms: 47000 },
    rb2: { id: 'rb2', kind: 'resistor' as const, a: 't3', b: 'b2', ohms: 47000 },
    r2: { id: 'r2', kind: 'resistor' as const, a: 't4', b: 'l2', ohms: 470 },
    led2: { id: 'led2', kind: 'diode' as const, a: 'l2', b: 'k2', model: 'led-green' as const },
    // The cross that makes it go: C1 from Q1's collector to Q2's base, C2 from Q2's collector to Q1's base.
    c1: { id: 'c1', kind: 'capacitor' as const, a: 'k1', b: 'b2', farads: c1 },
    c2: { id: 'c2', kind: 'capacitor' as const, a: 'k2', b: 'b1', farads: c2 },
    q1: { id: 'q1', kind: 'bjt' as const, type: 'npn' as const, c: 'k1', b: 'b1', e: 'gnd', beta: 200 },
    q2: { id: 'q2', kind: 'bjt' as const, type: 'npn' as const, c: 'k2', b: 'b2', e: 'gnd', beta: 200 },
  };
  // Perfectly matched, both transistors would turn on together and stay on. A real one never is: C1 starting a
  // volt charged settles which side goes first.
  return { ...parts, list: Object.values(parts) as Part[], start: { charged: { c1: -1 } } };
}

/**
 * How long each LED stays lit with these capacitors: run a blinker on its own,
 * let it flip once to get going, then time a full cycle by Q1's collector,
 * which is low while LED 1 is lit.
 */
export function blinkTimes(c1: number, c2: number): { on1: number; on2: number } {
  const b = blinker(c1, c2);
  const sim = simulate(b.list, b.start);
  const flips: { t: number; low: boolean }[] = [];
  let low = sim.now.v.k1 < 4;
  while (flips.length < 4 && sim.t < 20) {
    const now = sim.step(0.002).v.k1 < 4;
    if (now !== low) flips.push({ t: sim.t, low: now });
    low = now;
  }
  const [, f1, f2, f3] = flips;
  // From f1 to f2 Q1's collector is f1.low, then the other way until f3.
  const first = f2.t - f1.t;
  const second = f3.t - f2.t;
  return f1.low ? { on1: first, on2: second } : { on1: second, on2: first };
}

export const blinkerFigure = figure(['second'], (ctx, t) => {
  const f = frame(400, 335, 4);
  const b = blinker(10e-6, 10e-6);
  const top = 22;
  const sch = schematic(ctx, [
    { part: b.bat, path: [[26, 100], [26, 150]], tag: '9 V', tagSide: 'left' },
    { part: b.w0, path: [[26, 100], [26, top], [75, top]] },
    { part: b.w1, path: [[75, top], [165, top]] },
    { part: b.w2, path: [[165, top], [245, top]] },
    { part: b.w3, path: [[245, top], [340, top]] },
    { part: b.r1, path: [[75, top], [75, 70]], tag: '470 Ω', tagSide: 'left' },
    { part: b.led1, path: [[75, 70], [75, 118]], tag: 'LED 1', tagSide: 'left' },
    { part: b.rb1, path: [[165, top], [165, 80], [165, 136], [165, 170]], tag: '47 kΩ', tagSide: 'left' },
    { part: b.rb2, path: [[245, top], [245, 80], [245, 118], [245, 170]], tag: '47 kΩ', tagSide: 'left' },
    { part: b.r2, path: [[340, top], [340, 70]], tag: '470 Ω', tagSide: 'left' },
    { part: b.led2, path: [[340, 70], [340, 118]], tag: 'LED 2', tagSide: 'left' },
    { part: b.c1, path: [[75, 118], [130, 118], [245, 118]], tag: 'C1', tagSide: 'right' },
    { part: b.c2, path: [[340, 136], [285, 136], [165, 136]], tag: 'C2', tagSide: 'right' },
    { part: b.q1, at: [85, 170], flip: true, leads: { c: [[75, 144], [75, 118]], b: [[111, 170], [165, 170]], e: [[75, 196], [75, 202]] }, tag: 'Q1' },
    { part: b.q2, at: [330, 170], leads: { c: [[340, 144], [340, 136], [340, 118]], b: [[304, 170], [245, 170]], e: [[340, 196], [340, 202]] }, tag: 'Q2' },
  ], { topVolts: 9, typicalAmps: 0.01, grounds: [[26, 150], [75, 202], [340, 202]] });
  const scr = scope({ x: 14, y: 236, w: 372, h: 90, vmin: -8, vmax: 10, window: WINDOW_BLINK });
  f.svg.append(sch.node, scr.node);
  let sim = simulate(b.list, b.start);
  let base: number[] = [];
  let coll: number[] = [];
  let swept = 0;
  let guessed = false;
  let fresh = false;
  const won = new Set<string>();
  const earned = el('div');

  const paint = () => {
    if (!guessed) {
      scr.hide('Guess first');
      f.readout.textContent = 'Two transistor switches each drive an LED, with each collector coupled to the other\'s base through a capacitor. When Q1 switches on, its collector drops about 7 V, from 7.4 V to nearly 0 V. C1\'s other plate is connected to Q2\'s base, sitting at 0.7 V.';
      return;
    }
    scr.hide(null);
    const { on1, on2 } = blinkTimes(b.c1.farads, b.c2.farads);
    const cycle = on1 + on2;
    const once = Math.abs(cycle - 1) < 0.2;
    const ratio = Math.max(on1, on2) / Math.min(on1, on2);
    if (once) {
      won.add('once');
      if (ratio < 1.15) won.add('even');
      if (ratio > 1.8) won.add('lopsided');
    }
    f.readout.textContent =
      (fresh ? `${q.reply()} ` : '') +
      `A capacitor's voltage cannot jump instantaneously, so when one collector drops by 7 V, the base on the far side of the capacitor drops by 7 V as well, down to -6.5 V. That holds the second transistor off until its 47 kΩ resistor charges the capacitor back up to 0.6 V, when the circuit flips to the other side. ` +
      `LED 1 is lit ${seconds(on1)}, LED 2 ${seconds(on2)}: a blink every ${seconds(cycle)}.` +
      (once ? '' : ' Make it once a second.');
    fresh = false;
    if (once) {
      t.done();
      earned.replaceChildren(stars([
        { text: 'Blinking about once a second', got: true },
        { text: 'Once a second, with both LEDs lit for the same time', got: won.has('even') },
        { text: 'Once a second, with one LED lit at least twice as long as the other', got: won.has('lopsided') },
      ]));
    }
  };
  const q = guess({
    question: 'When Q1 switches on, Q2\'s base...',
    options: ['drops 7 V with it, to well below ground', 'drops to 0 V and stops there', 'stays at 0.7 V'],
    answer: 0,
    replies: [
      'Right.',
      'Because the voltage across a capacitor cannot change instantaneously, the full 7 V step couples through C1 and pulls the base well below 0 V.',
      'The base was sitting at 0.7 V, and because the voltage across C1 cannot change in an instant, the 7 V drop at the collector pulls the base down by 7 V with it.',
    ],
    onLock: () => {
      guessed = fresh = true;
      knobs.hidden = false;
      paint();
    },
  });
  const pickC = (part: { farads: number }) => (v: number) => {
    part.farads = v;
    paint();
  };
  const knobs = el('div', { hidden: true },
    el('p.fig-hint', {}, 'C1 sets how long LED 1 stays lit, and C2 sets how long LED 2 stays lit.'),
    chipRow(BLINK_CS, (v) => `C1 ${si(v, 'F')}`, () => b.c1.farads, pickC(b.c1)),
    chipRow(BLINK_CS, (v) => `C2 ${si(v, 'F')}`, () => b.c2.farads, pickC(b.c2)),
  );
  f.controls.append(q.node, knobs, earned);

  // It runs in real time. The capacitors can be changed while it runs: the charge they hold carries on.
  animate(f.svg, ctx, (dt) => {
    if (sim.t > 600) sim = simulate(b.list, b.start);
    sim.step(dt, 4);
    swept += dt / WINDOW_BLINK;
    if (swept >= 1) {
      swept = 0;
      base = [];
      coll = [];
    }
    base.push(sim.now.v.b1);
    coll.push(sim.now.v.k1);
    if (guessed) {
      scr.draw([
        { volts: coll, colour: COL.voltage, label: 'Q1 collector', span: swept },
        { volts: base, colour: BASE_TRACE, label: 'Q1 base', span: swept },
      ]);
      scr.beam(swept);
    }
    sch.show(sim.now);
  });
  sch.show(sim.now);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The fault: the lamp stays on with the control off.

export const shortedTransistorFigure = figure(['find'], (ctx, t) => {
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'v9', 'lt');
  const lamp = { id: 'lamp', kind: 'lamp' as const, a: 'lt', b: 'c', ohms: 90, rated: 9 };
  const ctl = { id: 'ctl', kind: 'source' as const, a: 'ctl', b: 'gnd', volts: 5 };
  const sw = { id: 'sw', kind: 'switch' as const, a: 'ctl', b: 's', closed: false };
  const rb = { id: 'rb', kind: 'resistor' as const, a: 's', b: 'b', ohms: 4700 };
  const q = { id: 'q', kind: 'bjt' as const, type: 'npn' as const, c: 'c', b: 'b', e: 'e', beta: 200 };
  const we = wire('we', 'e', 'gnd');
  // As it really is: the transistor has failed, its collector joined to its emitter inside.
  const inside = wire('inside', 'c', 'e', 0.2);
  const parts: Part[] = [bat, w1, lamp, ctl, sw, rb, q, we, inside];
  return hunt(ctx, t, {
    parts,
    places: [
      { part: bat, path: [[350, 95], [350, 155]], tag: '9 V', tagSide: 'right' },
      { part: w1, path: [[350, 95], [350, 30], [260, 30], [260, 50]] },
      { part: lamp, path: [[260, 50], [260, 120]], tag: 'Lamp', tagSide: 'left' },
      { part: q, at: [250, 146], leads: { c: [[260, 120]], b: [[224, 146], [190, 146]], e: [[260, 172], [260, 182]] } },
      { part: we, path: [[260, 182], [260, 205], [350, 205], [350, 155]] },
      { part: rb, path: [[190, 146], [130, 146]], tag: '4.7 kΩ', tagSide: 'left' },
      { part: sw, path: [[130, 146], [90, 146], [60, 146], [60, 120]] },
      { part: ctl, path: [[60, 120], [60, 170]], tag: '5 V', tagSide: 'right' },
    ],
    schematic: { topVolts: 9, typicalAmps: 0.05, grounds: [[60, 170], [350, 205]] },
    size: [400, 240],
    face: [20, 20],
    brief: 'The control switch is open, so the transistor should be off and the lamp dark. The lamp is lit.',
    culprit: 'q',
    found: 'Found it: the transistor has failed shorted from collector to emitter. Its base is at 0 V, so it should be off, yet it drops almost no voltage while carrying the full lamp current. Transistors that switch relay coils without a flyback diode often fail in just this way.',
    hints: ['Is the base getting any voltage to turn it on?', 'With no base voltage, what should the collector read?'],
    par: 5,
  });
});
