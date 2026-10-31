// Lesson 5, signals: a voltage that changes, drawn on a scope; a wiggle
// lifted onto a steady voltage so a circuit on one battery can carry it, and
// cut flat when it runs out of room; and a buffer whose steady voltage has
// gone wrong.

import { el } from 'didactics/dom';
import { small } from 'didactics/draw';
import { sourceVolts, type Part } from 'circuit-kit/parts';
import { solve } from 'circuit-kit/solve';
import { OPEN, wire } from '../circuit/build';
import { schematic } from '../circuit/schematic';
import { volts } from '../circuit/units';
import { hunt } from './bench';
import { guess, stars } from './guess';
import { animate, COL, figure, frame, slider } from './kit';
import { capture, sample, scope } from './scope';

/** How many times slower than life the schematics here run, so the dots can be followed. */
const SLOW = 200;

// ---------------------------------------------------------------------------
// A sine on the scope: set the generator to match a trace.

const WINDOW = 0.02;
const TARGET = { amp: 3, hz: 150 };

export const sineFigure = figure(['match'], (ctx, t) => {
  const f = frame(400, 230, 4);
  const gen: Extract<Part, { kind: 'source' }> = { id: 'gen', kind: 'source', a: 'top', b: 'gnd', volts: 0, wave: { shape: 'sine', amp: 1, hz: 50 } };
  const r = { id: 'r', kind: 'resistor' as const, a: 'r-in', b: 'r-out', ohms: 1000 };
  const w1 = wire('w1', 'top', 'r-in');
  const w2 = wire('w2', 'r-out', 'gnd');
  const parts: Part[] = [gen, w1, r, w2];
  const sch = schematic(ctx, [
    { part: gen, path: [[84, 95], [84, 145]], tag: 'Signal', tagSide: 'right' },
    { part: w1, path: [[84, 95], [84, 40], [134, 40], [134, 80]] },
    { part: r, path: [[134, 80], [134, 160]] },
    { part: w2, path: [[134, 160], [134, 200], [84, 200], [84, 145]] },
  ], { topVolts: 4, typicalAmps: 0.002, grounds: [[84, 200]] });
  const scr = scope({ x: 162, y: 30, w: 226, h: 170, vmin: -4, vmax: 4, window: WINDOW });
  f.svg.append(sch.node, scr.node, small(275, 218, `${WINDOW * 1000} ms across the screen`, { anchor: 'middle', soft: true }));
  let matched = false;
  let note: 'sine' | 'guitar' = 'sine';
  const sliders = el('div');
  const row = el('div.chips');
  const earned = el('div');

  const paint = () => {
    const w = gen.wave!;
    if (note === 'guitar') {
      scr.range(-0.5, 0.5);
      scr.draw([{ volts: sample((s) => sourceVolts(gen, s), WINDOW), colour: COL.current }]);
      f.readout.textContent = 'A guitar\'s A string, 110 Hz, as its pickup makes it: a few tenths of a volt, with extra wiggles on top of the main wave. Those wiggles are its harmonics, quieter sines at 2, 3, 4 and more times the note, and their mix is what makes a guitar sound like a guitar rather than a tuning fork.';
      return;
    }
    scr.range(-4, 4);
    scr.draw([
      { volts: sample((s) => sourceVolts(gen, s), WINDOW), colour: COL.current },
      ...(matched ? [] : [{ volts: sample((s) => TARGET.amp * Math.sin(2 * Math.PI * TARGET.hz * s), WINDOW), colour: '#9fd7ff', ghost: true, label: 'target' }]),
    ]);
    const period = 1 / w.hz;
    const ok = Math.abs(w.amp - TARGET.amp) < 0.01 && Math.abs(w.hz - TARGET.hz) < 0.5;
    f.readout.textContent =
      `It rises to ${volts(w.amp)}, falls to -${volts(w.amp)}, and comes back every ${(period * 1000).toFixed(period < 0.01 ? 2 : 1)} ms: ${w.hz} times a second, ${Number((WINDOW / period).toFixed(1))} cycle${WINDOW / period === 1 ? '' : 's'} across the screen. ` +
      (ok ? 'That matches the target.' : 'Set the generator to match the dashed trace.');
    if (ok && !matched) {
      matched = true;
      earned.replaceChildren(stars([{ text: 'Matched the height and the speed', got: true }]));
      row.append(...(['sine', 'guitar'] as const).map((k) => el('button.chip', { type: 'button', className: k === 'sine' ? 'chip on' : 'chip', onclick: () => pick(k) }, k === 'sine' ? 'Generator' : 'A guitar note')));
      t.done();
      paint();
    }
  };
  const pick = (k: 'sine' | 'guitar') => {
    note = k;
    gen.wave = k === 'guitar' ? { shape: 'guitar', amp: 0.3, hz: 110 } : { shape: 'sine', amp: amp.input.valueAsNumber, hz: hz.input.valueAsNumber };
    sliders.hidden = k === 'guitar';
    row.querySelectorAll('.chip').forEach((c, j) => c.classList.toggle('on', (j === 0) === (k === 'sine')));
    paint();
  };
  const amp = slider('Height', 0.5, 4, 0.5, 1, (x) => volts(x), (x) => { gen.wave!.amp = x; paint(); }, 'voltage');
  const hz = slider('Speed', 50, 500, 25, 50, (x) => `${x} Hz`, (x) => { gen.wave!.hz = x; paint(); });
  sliders.append(amp.node, hz.node);
  f.controls.append(sliders, row, earned);

  // The circuit runs SLOW times slower than life, and the scope's beam keeps time with it.
  let now = 0;
  animate(f.svg, ctx, (dt) => {
    now += dt / SLOW;
    sch.show(solve(parts, { t: now }));
    scr.beam((now % WINDOW) / WINDOW);
  });
  sch.show(solve(parts));
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A wiggle on a steady voltage, through a buffer that can only reach so far.

const LOW = 1.5;
const HIGH = 7.5;
const OFFSET_WINDOW = 0.01;

export const offsetFigure = figure(['centre'], (ctx, t) => {
  const f = frame(400, 300, 4);
  const sig: Extract<Part, { kind: 'source' }> = { id: 'sig', kind: 'source', a: 'in', b: 'lift', volts: 0, wave: { shape: 'sine', amp: 2, hz: 200 } };
  const lift = { id: 'lift', kind: 'source' as const, a: 'lift', b: 'gnd', volts: 1 };
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'in', 'p');
  const buf = { id: 'buf', kind: 'opamp' as const, plus: 'p', minus: 'out', out: 'out', vcc: 'v9', vee: 'gnd', headroom: 1.5 };
  const load = { id: 'load', kind: 'resistor' as const, a: 'out', b: 'gnd', ohms: 10000 };
  const parts: Part[] = [sig, lift, bat, w1, buf, load];
  const sch = schematic(ctx, [
    { part: sig, path: [[40, 30], [40, 70]], tag: 'Signal', tagSide: 'left' },
    { part: lift, path: [[40, 70], [40, 112]], tag: 'Steady', tagSide: 'left' },
    { part: w1, path: [[40, 30], [40, 14], [120, 14], [120, 76], [152, 76]] },
    { part: buf, at: [190, 62], leads: { minus: [[152, 48], [140, 48], [140, 26], [250, 26], [250, 62]], out: [[230, 62], [320, 62]] }, tag: 'Buffer' },
    { part: load, path: [[320, 62], [320, 112]], tag: 'Next stage', tagSide: 'right' },
  ], { topVolts: 9, typicalAmps: 0.0005, grounds: [[40, 112], [320, 112]] });
  const scr = scope({ x: 14, y: 150, w: 372, h: 130, vmin: 0, vmax: 10, window: OFFSET_WINDOW });
  f.svg.append(sch.node, scr.node, small(190, 126, 'runs on 0 to 9 V', { anchor: 'middle', soft: true }), small(130, 66, 'in', { anchor: 'middle', fill: '#5b9bd5', bold: true }), small(290, 52, 'out', { anchor: 'middle', fill: COL.current, bold: true }));
  let guessed = false;
  /** Whether the guess's reply is still to be shown, on the first paint after locking in. */
  let fresh = false;
  let best = 0;
  let done = false;
  const earned = el('div');

  const paint = () => {
    const [vin, vout] = capture(parts, [(s) => s.v.p, (s) => s.v.out], { window: OFFSET_WINDOW, n: 240 });
    scr.draw([{ volts: vout, colour: COL.current, label: 'out' }, { volts: vin, colour: '#5b9bd5', ghost: true }]);
    const clipped = vin.some((v, k) => Math.abs(v - vout[k]) > 0.05);
    const top = Math.max(...vin);
    const bottom = Math.min(...vin);
    const a = sig.wave!.amp;
    if (!guessed) {
      scr.hide('Guess first');
      f.readout.textContent = `The buffer copies the voltage at its input to its output, but it runs on 9 V and can only reach from ${volts(LOW)} to ${volts(HIGH)}. The signal swings 2 V each way around a steady 1 V.`;
      return;
    }
    scr.hide(null);
    if (!clipped) best = Math.max(best, a);
    const where = bottom < LOW && top > HIGH ? 'top and bottom' : bottom < LOW ? 'bottom' : top > HIGH ? 'top' : '';
    f.readout.textContent =
      (fresh ? `${q.reply()} ` : '') +
      (clipped
        ? `The input swings from ${volts(bottom)} to ${volts(top)}, past what the buffer can reach, so the ${where} of the wave is cut flat. Move the steady voltage, and see how big a swing will fit.`
        : `The whole wave fits, from ${volts(bottom)} to ${volts(top)}, and comes out the shape it went in. ${a < 2.5 ? 'Now make the swing bigger: 2.5 V each way.' : ''}`);
    fresh = false;
    if (!clipped && a >= 2.5 && !done) {
      done = true;
      t.done();
    }
    if (done) earned.replaceChildren(stars([
      { text: 'A 2.5 V swing with nothing cut off', got: true },
      { text: 'Centred on half the supply, 4.5 V', got: !clipped && Math.abs(lift.volts - 4.5) < 0.01 },
      { text: 'Found the biggest swing that fits: 3 V each way', got: best >= 3 },
    ]));
  };
  const steady = slider('Steady voltage', 0, 9, 0.25, 1, (x) => volts(x), (x) => { lift.volts = x; paint(); }, 'voltage');
  const swing = slider('Swing, each way', 0.5, 4, 0.25, 2, (x) => volts(x), (x) => { sig.wave!.amp = x; paint(); }, 'voltage');
  steady.input.disabled = swing.input.disabled = true;
  const q = guess({
    question: 'What comes out?',
    options: ['The bottom of the wave is cut flat', 'The same wave, smaller', 'Nothing at all'],
    answer: 0,
    replies: [
      'Right: everything below 1.5 V is cut off.',
      'It would be, if the buffer shrank what it copies. Instead, the buffer copies the voltage 1-for-1 until it hits its limit.',
      'The top half of the wave is inside what the buffer can reach, so that much comes out.',
    ],
    onLock: () => {
      guessed = fresh = true;
      steady.input.disabled = swing.input.disabled = false;
      paint();
    },
  });
  f.controls.append(q.node, steady.node, swing.node, earned);

  let now = 0;
  animate(f.svg, ctx, (dt) => {
    if (!guessed) return;
    now += dt / SLOW;
    sch.show(solve(parts, { t: now }));
    scr.beam((now % OFFSET_WINDOW) / OFFSET_WINDOW);
  });
  sch.show(solve(parts));
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The fault: a buffer whose output is stuck near the top.

export const stuckBiasFigure = figure(['find'], (ctx, t) => {
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'v9', 'rt');
  const r1 = { id: 'r1', kind: 'resistor' as const, a: 'rt', b: 'mid', ohms: 100000 };
  // R2 has cracked open: it reads as no connection at all.
  const r2 = { id: 'r2', kind: 'resistor' as const, a: 'mid', b: 'r2b', ohms: OPEN };
  const w3 = wire('w3', 'r2b', 'gnd');
  const wp = wire('wp', 'mid', 'p');
  const buf = { id: 'buf', kind: 'opamp' as const, plus: 'p', minus: 'out', out: 'out', vcc: 'rt', vee: 'gnd', headroom: 1.5 };
  const load = { id: 'load', kind: 'resistor' as const, a: 'out', b: 'lb', ohms: 10000 };
  const w4 = wire('w4', 'lb', 'gnd');
  const parts: Part[] = [bat, w1, r1, r2, w3, wp, buf, load, w4];
  return hunt(ctx, t, {
    parts,
    places: [
      { part: bat, path: [[40, 100], [40, 150]], tag: '9 V', tagSide: 'left' },
      { part: w1, path: [[40, 100], [40, 30], [110, 30]] },
      { part: r1, path: [[110, 30], [110, 95]], tag: 'R1', tagSide: 'left' },
      { part: r2, path: [[110, 95], [110, 160]], tag: 'R2', tagSide: 'left' },
      { part: w3, path: [[110, 160], [110, 200], [40, 200], [40, 150]] },
      { part: wp, path: [[110, 95], [180, 95]] },
      { part: buf, at: [218, 81], leads: { minus: [[180, 67], [168, 67], [168, 44], [275, 44], [275, 81]], out: [[258, 81], [330, 81]] }, tag: 'Buffer' },
      { part: load, path: [[330, 81], [330, 150]], tag: 'Load', tagSide: 'right' },
      { part: w4, path: [[330, 150], [330, 200], [110, 200]] },
    ],
    schematic: { topVolts: 9, typicalAmps: 0.0005, grounds: [[40, 200]] },
    size: [400, 240],
    face: [180, 132],
    brief: 'R1 and R2, both 100 kΩ, should hold the buffer\'s input at 4.5 V, half the battery, so a signal can swing either way around it. No signal gets through, and the output sits near the top. The buffer runs from the 9 V battery; its power pins aren\'t drawn.',
    culprit: 'r2',
    found: 'Found it: R2 has cracked open. With nothing pulling the middle down, R1 holds it at the full 9 V, and the buffer\'s output goes as high as it can reach, 7.5 V, and stays there. Any signal on top is cut off completely. The whole battery voltage turned up across the break, as it always does.',
    hints: ['Measure the buffer\'s input first: what should it be?', 'The input is too high. Which resistor should be pulling it down?'],
    par: 6,
  });
});
