// Lesson 9, turning it up: a transistor biased halfway, the gain its two
// resistors set, the emitter follower that buys current, the op-amp whose
// feedback sets its gain, and an amplifier whose emitter resistor has been
// bridged with solder.

import { el, svg } from 'didactics/dom';
import { small } from 'didactics/draw';
import { e12, type Part } from 'circuit-kit/parts';
import { solve } from 'circuit-kit/solve';
import { wire } from '../circuit/build';
import { schematic, type Placement } from '../circuit/schematic';
import { amps, ohms, volts } from '../circuit/units';
import { hunt } from './bench';
import { guess, stars } from './guess';
import { COL, figure, frame, slider } from './kit';
import { capture, scope } from './scope';

const IN = '#5b9bd5';

/** A row of chips, one picked, which calls `pick` with the chosen value. */
function chipRow<T>(values: readonly T[], show: (v: T) => string, at: () => T, pick: (v: T) => void): HTMLElement {
  const row = el('div.chips');
  const paint = () => row.replaceChildren(...values.map((v) => el('button.chip', { type: 'button', className: v === at() ? 'chip on' : 'chip', onclick: () => { pick(v); paint(); } }, show(v))));
  paint();
  return row;
}

/** Half the peak-to-peak of a trace: how far it swings each way. */
const swing = (vs: number[]) => (Math.max(...vs) - Math.min(...vs)) / 2;

/**
 * The common-emitter stage every lesson from here builds on: a divider R1 and
 * R2 biasing the base, Rc from the supply to the collector, Re from the
 * emitter to ground. With `signal`, a generator comes in through a capacitor
 * and the output leaves through another into the next stage's 100 kΩ.
 */
export function commonEmitter(signal: boolean) {
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'v9', 'rt');
  const r1 = { id: 'r1', kind: 'resistor' as const, a: 'rt', b: 'b', ohms: 47000 };
  const r2 = { id: 'r2', kind: 'resistor' as const, a: 'b', b: 'r2b', ohms: 10000 };
  const w2 = wire('w2', 'r2b', 'gnd');
  const rc = { id: 'rc', kind: 'resistor' as const, a: 'rt', b: 'c', ohms: 4700 };
  const re = { id: 're', kind: 'resistor' as const, a: 'e', b: 'reb', ohms: 1000 };
  const w3 = wire('w3', 'reb', 'gnd');
  const q = { id: 'q', kind: 'bjt' as const, type: 'npn' as const, c: 'c', b: 'b', e: 'e', beta: 200 };
  const sig = { id: 'sig', kind: 'source' as const, a: 'in', b: 'gnd', volts: 0, wave: { shape: 'sine' as const, amp: 0.1, hz: 1000 } };
  const win = wire('win', 'in', 'ci');
  const cin = { id: 'cin', kind: 'capacitor' as const, a: 'ci', b: 'b', farads: 10e-6 };
  const cout = { id: 'cout', kind: 'capacitor' as const, a: 'c', b: 'out', farads: 10e-6 };
  const load = { id: 'load', kind: 'resistor' as const, a: 'out', b: 'lb', ohms: 100000 };
  const w4 = wire('w4', 'lb', 'gnd');
  const parts: Part[] = [bat, w1, r1, r2, w2, rc, re, w3, q, ...(signal ? [sig, win, cin, cout, load, w4] : [])];
  const places: Placement[] = [
    { part: bat, path: [[372, 90], [372, 140]] },
    { part: w1, path: [[372, 90], [372, 20], [290, 20], [150, 20]] },
    { part: r1, path: [[150, 20], [150, 96]], tag: 'R1', tagSide: 'right' },
    { part: r2, path: [[150, 96], [150, 160]], tag: 'R2', tagSide: 'right' },
    { part: w2, path: [[150, 160], [150, 166]] },
    { part: rc, path: [[290, 20], [290, 70]], tag: 'Rc', tagSide: 'right' },
    { part: q, at: [280, 96], leads: { b: [[254, 96], [150, 96]], c: [[290, 70]], e: [[290, 122], [290, 132]] } },
    { part: re, path: [[290, 132], [290, 170]], tag: 'Re', tagSide: 'right' },
    { part: w3, path: [[290, 170], [290, 176]] },
    ...(signal ? [
      { part: sig, path: [[50, 110], [50, 160]], tag: 'In', tagSide: 'right' },
      { part: win, path: [[50, 110], [50, 96], [80, 96]] },
      { part: cin, path: [[80, 96], [150, 96]] },
      { part: cout, path: [[290, 70], [340, 70]] },
      { part: load, path: [[340, 70], [340, 160]] },
      { part: w4, path: [[340, 160], [340, 166]] },
    ] as Placement[] : []),
  ];
  const grounds: [number, number][] = [[150, 166], [290, 176], [372, 140], ...(signal ? [[50, 160], [340, 166]] as [number, number][] : [])];
  return { parts, places, grounds, bat, w1, r1, r2, rc, re, w3, sig, q };
}

// ---------------------------------------------------------------------------
// Bias: set the transistor halfway on.

const R2S = e12(2200, 47000);

export const biasFigure = figure(['centre'], (ctx, t) => {
  const f = frame(400, 200, 4);
  const amp = commonEmitter(false);
  const sch = schematic(ctx, amp.places, { topVolts: 9, typicalAmps: 0.001, grounds: amp.grounds });
  const tags = svg('g');
  f.svg.append(sch.node, tags);
  const earned = el('div');
  let done = false;

  const paint = () => {
    const s = solve(amp.parts);
    sch.show(s);
    const vc = s.v.c;
    tags.replaceChildren(
      small(160, 112, volts(s.v.b), { bold: true, fill: COL.voltage }),
      small(298, 150, volts(s.v.e), { bold: true, fill: COL.voltage }),
      small(298, 62, volts(vc), { bold: true, fill: COL.voltage }),
    );
    const mid = vc > 4 && vc < 5;
    f.readout.textContent =
      `R2 = ${ohms(amp.r2.ohms)} holds the base at ${volts(s.v.b)}; the emitter sits a diode's drop below, so ${volts(s.v.e)} across Re sets ${amps(s.i.re)} through it. Nearly all of that current comes through Rc, pulling the collector down to ${volts(vc)}. ` +
      (vc < 1 ? 'Saturated: the transistor is turned hard on, leaving no room for the collector to swing down.' : vc > 8.5 ? 'Cut off or nearly off: the collector sits near 9 V, leaving no room to swing up.' : mid ? 'Biased near the middle: the collector has room to swing both up and down.' : 'Set the collector halfway between 0 and 9 V.');
    if (mid && !done) {
      done = true;
      t.done();
    }
    if (done) earned.replaceChildren(stars([{ text: 'The collector halfway, between 4 and 5 V', got: true }]));
  };
  f.controls.append(slider('R2', { steps: R2S, value: 4700, show: ohms, onInput: (r) => { amp.r2.ohms = r; paint(); }, color: 'resistance' }).node, earned);
  amp.r2.ohms = 4700;
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Gain: a small wiggle in, a bigger one out, upside down.

const WINDOW_AMP = 0.003;

export const gainFigure = figure(['clip'], (ctx, t) => {
  const f = frame(400, 320, 4);
  const amp = commonEmitter(true);
  const sch = schematic(ctx, amp.places, { topVolts: 9, typicalAmps: 0.001, grounds: amp.grounds });
  const scr = scope({ x: 14, y: 198, w: 372, h: 110, vmin: -5, vmax: 5, window: WINDOW_AMP });
  f.svg.append(sch.node, scr.node, small(346, 92, 'out', { fill: COL.current, bold: true }), small(60, 92, 'in', { fill: IN, bold: true }));
  let guessed = false;
  let fresh = false;
  let clipped = false;

  const paint = () => {
    if (!guessed) {
      scr.hide('Guess first');
      sch.show(solve(amp.parts));
      f.readout.textContent = `The stage from before, biased near 4.7 V, with Rc = 4.7 kΩ and Re = 1 kΩ. A 0.1 V peak signal comes in through a coupling capacitor to the base.`;
      return;
    }
    scr.hide(null);
    const [vin, vout] = capture(amp.parts, [(s) => s.v.in, (s) => s.v.out], { window: WINDOW_AMP, n: 240, settled: true, settle: 0.002 });
    scr.draw([{ volts: vout, colour: COL.current, label: 'out' }, { volts: vin, colour: IN, ghost: true }]);
    sch.show(solve(amp.parts));
    const gain = swing(vout) / swing(vin);
    // Clipped: well short of the gain the stage gives a small signal, Rc over Re plus the transistor's own 26 Ω or so.
    const flat = gain < 0.85 * (amp.rc.ohms / (amp.re.ohms + 26));
    if (flat && swing(vin) > 0.15) clipped = true;
    f.readout.textContent =
      (fresh ? `${q.reply()} ` : '') +
      `${volts(swing(vin))} in, ${volts(swing(vout))} out: a voltage gain of ${gain.toFixed(1)}, inverted. Rc / Re is ${(amp.rc.ohms / amp.re.ohms).toFixed(1)}. ` +
      (flat ? 'The collector waveform has hit the 9 V supply at the top or transistor saturation near the emitter voltage at the bottom, so the peaks clip.' : clipped ? '' : 'Turn the input up until it clips.');
    fresh = false;
    if (clipped) t.done();
  };
  const q = guess({
    question: 'What comes out?',
    options: ['About 0.47 V each way, upside down', '0.1 V, the same as went in', 'About 4.7 V each way'],
    answer: 0,
    replies: [
      'Correct: the collector swings about 4.7 times as far as the base, and in the opposite direction.',
      'The emitter follows the base wiggle, which makes the current through Re wiggle by the same proportion. That current flows through Rc too, which is 4.7 times larger than Re.',
      'A 4.7 V peak output from a 0.1 V input would be a gain of 47. The ratio Rc / Re sets the gain here at about 4.7.',
    ],
    onLock: () => {
      guessed = fresh = true;
      knobs.style.display = '';
      paint();
    },
  });
  const knobs = el('div', {},
    slider('Input', 0.05, 1, 0.05, 0.1, (v) => volts(v), (v) => { amp.sig.wave.amp = v; paint(); }, 'voltage').node,
    chipRow([470, 1000, 2200], (r) => `Re ${ohms(r)}`, () => amp.re.ohms, (r) => { amp.re.ohms = r; amp.r2.ohms = r === 470 ? 6800 : r === 1000 ? 10000 : 22000; paint(); }),
  );
  knobs.style.display = 'none';
  f.controls.append(q.node, knobs);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The emitter follower: no gain, but it can drive a load a weak source can't.

const WINDOW_FOL = 0.003;

export const followerFigure = figure(['both'], (ctx, t) => {
  const f = frame(400, 300, 4);
  // A pickup-like source: a 1 V wiggle on 4.5 V, behind 10 kΩ.
  const sig = { id: 'sig', kind: 'source' as const, a: 'src', b: 'gnd', volts: 4.5, ohms: 10000, wave: { shape: 'sine' as const, amp: 1, hz: 1000 } };
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const mid = { id: 'mid', kind: 'source' as const, a: 'm', b: 'gnd', volts: 4.5 };
  const q = { id: 'q', kind: 'bjt' as const, type: 'npn' as const, c: 'v9', b: 'src', e: 'e', beta: 200 };
  const re = { id: 're', kind: 'resistor' as const, a: 'e', b: 'gnd', ohms: 2200 };
  const direct = wire('link', 'src', 'out');
  const fromEmitter = wire('link', 'e', 'out');
  const load = { id: 'load', kind: 'resistor' as const, a: 'out', b: 'm', ohms: 1000 };
  let buffered = false;
  const holder = svg('g');
  let sch = schematic(ctx, [], { topVolts: 9, typicalAmps: 0.001 });
  const build = () => {
    const places: Placement[] = [
      { part: sig, path: [[50, 80], [50, 140]], tag: 'Pickup', tagSide: 'left' },
      ...(buffered ? [
        { part: q, at: [170, 80], leads: { b: [[144, 80], [50, 80]], c: [[180, 54], [180, 24]], e: [[180, 106], [180, 120]] } },
        { part: re, path: [[180, 120], [180, 160]] },
        { part: fromEmitter, path: [[180, 120], [300, 120]] },
      ] as Placement[] : [
        { part: direct, path: [[50, 80], [50, 40], [300, 40], [300, 120]] },
      ] as Placement[]),
      { part: load, path: [[300, 120], [300, 170]], tag: '1 kΩ load', tagSide: 'right' },
    ];
    sch = schematic(ctx, places, { topVolts: 9, typicalAmps: 0.001, grounds: [[50, 140], ...(buffered ? [[180, 160]] as [number, number][] : [])] });
    holder.replaceChildren(sch.node, ...(buffered ? [small(186, 22, '+9 V', { soft: true })] : []), small(300, 185, 'to 4.5 V', { anchor: 'middle', soft: true }));
  };
  const scr = scope({ x: 14, y: 200, w: 372, h: 88, vmin: 2, vmax: 7, window: WINDOW_FOL });
  f.svg.append(holder, scr.node);
  const seen = new Set<boolean>();

  const paint = () => {
    build();
    const parts: Part[] = buffered ? [sig, bat, mid, q, re, fromEmitter, load] : [sig, mid, direct, load];
    const [vout] = capture(parts, [(s) => s.v.out], { window: WINDOW_FOL, n: 200 });
    scr.draw([{ volts: vout, colour: COL.current, label: 'at the load' }]);
    sch.show(solve(parts, { t: 0.00025 }));
    seen.add(buffered);
    f.readout.textContent = buffered
      ? `Through an emitter follower the load gets ${volts(swing(vout))} each way, almost the full pickup signal, shifted down by one DC diode drop. The follower's base draws about β times less current than its emitter supplies, so the pickup barely notices the 1 kΩ load.`
      : `Connected straight into the load, the pickup's 10 kΩ internal resistance and the 1 kΩ load form a voltage divider, so only ${volts(swing(vout))} of the 1 V signal reaches the load.`;
    if (seen.size === 2) t.done();
  };
  f.controls.append(chipRow([false, true], (b) => (b ? 'Through a follower' : 'Straight in'), () => buffered, (b) => { buffered = b; paint(); }));
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// An op-amp with feedback: two resistors set the gain.

const WINDOW_OP = 0.003;
const RFS = [1000, 4700, 10000, 47000, 100000];

export const opampGainFigure = figure(['ten'], (ctx, t) => {
  const f = frame(400, 300, 4);
  const sig = { id: 'sig', kind: 'source' as const, a: 'in', b: 'm', volts: 0, wave: { shape: 'sine' as const, amp: 0.1, hz: 1000 } };
  const mid = { id: 'mid', kind: 'source' as const, a: 'm', b: 'gnd', volts: 4.5 };
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'in', 'p');
  const op = { id: 'op', kind: 'opamp' as const, plus: 'p', minus: 'n', out: 'out', vcc: 'v9', vee: 'gnd', headroom: 1.5 };
  const rf = { id: 'rf', kind: 'resistor' as const, a: 'out', b: 'n', ohms: 1000 };
  const rg = { id: 'rg', kind: 'resistor' as const, a: 'n', b: 'm2', ohms: 1000 };
  const wm = wire('wm', 'm2', 'm');
  const parts: Part[] = [sig, mid, bat, w1, op, rf, rg, wm];
  const sch = schematic(ctx, [
    { part: sig, path: [[40, 90], [40, 140]], tag: 'In', tagSide: 'left' },
    { part: w1, path: [[40, 90], [40, 76], [152, 76]] },
    { part: op, at: [190, 62], leads: { minus: [[152, 48], [120, 48]], out: [[230, 62], [330, 62]] } },
    { part: rf, path: [[330, 62], [330, 20], [120, 20], [120, 48]], tag: 'Rf', tagSide: 'right' },
    { part: rg, path: [[120, 48], [66, 48]] },
  ], { topVolts: 9, typicalAmps: 0.0005, grounds: [] });
  const scr = scope({ x: 14, y: 185, w: 372, h: 100, vmin: 0, vmax: 9, window: WINDOW_OP });
  f.svg.append(sch.node, scr.node, small(40, 156, 'on 4.5 V', { anchor: 'middle', soft: true }), small(40, 34, 'Rg 1 kΩ, to 4.5 V', { soft: true }), small(300, 54, 'out', { fill: COL.current, bold: true }), small(190, 110, 'on 0 to 9 V', { anchor: 'middle', soft: true }));
  const earned = el('div');
  let found = false;

  const paint = () => {
    const [vin, vout] = capture(parts, [(s) => s.v.in, (s) => s.v.out], { window: WINDOW_OP, n: 240 });
    scr.draw([{ volts: vout, colour: COL.current, label: 'out' }, { volts: vin, colour: IN, ghost: true }]);
    sch.show(solve(parts));
    const gain = swing(vout) / swing(vin);
    const ideal = 1 + rf.ohms / rg.ohms;
    const clips = gain < ideal * 0.95;
    f.readout.textContent =
      `With Rf = ${ohms(rf.ohms)} and Rg = 1 kΩ, the ideal formula 1 + Rf / Rg gives ${ideal.toFixed(1)}, and the measured gain is ${gain.toFixed(1)}. ` +
      (clips ? 'With Rf set this high, the amplified signal exceeds the op-amp\'s output voltage range and clips hard against the rails.' : 'The op-amp slews its output until the divider formed by Rf and Rg feeds a copy of the + input\'s wiggle back to the - input. That forces the overall voltage gain to follow 1 + Rf / Rg regardless of the op-amp\'s exact open-loop gain.');
    if (Math.abs(gain - 11) < 1 && !found) {
      found = true;
      t.done();
      earned.replaceChildren(stars([{ text: 'A gain of about ten, clean', got: true }]));
    }
  };
  f.controls.append(chipRow(RFS, (r) => `Rf ${ohms(r)}`, () => rf.ohms, (r) => { rf.ohms = r; paint(); }), earned);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The fault: a blob of solder across the emitter resistor.

export const bridgedEmitterFigure = figure(['find'], (ctx, t) => {
  const amp = commonEmitter(false);
  // As it really is: a solder bridge from the emitter straight to ground.
  const bridge = wire('bridge', 'e', 'reb');
  return hunt(ctx, t, {
    parts: [...amp.parts, bridge],
    places: amp.places,
    schematic: { topVolts: 9, typicalAmps: 0.001, grounds: amp.grounds },
    size: [400, 240],
    face: [170, 186],
    brief: 'This stage should sit with its base at 1.6 V and its collector near 4.5 V. R1 is 47 kΩ, R2 10 kΩ, Rc 4.7 kΩ and Re 1 kΩ. The signal comes out tiny and badly distorted.',
    culprit: 're',
    found: 'Found it: Re is bridged by a blob of solder, holding the emitter at 0 V so the base cannot rise above a single diode drop. With no voltage drop across Re to limit the current, the base divider drives the transistor hard into saturation and pulls the collector down near 0.1 V with no room to swing. The meter confirms the short by reading 0 V across a resistor that should drop about 0.9 V.',
    hints: ['Compare the base, emitter and collector with what the brief says.', 'Re should have about 1 V across it.'],
    par: 6,
  });
});
