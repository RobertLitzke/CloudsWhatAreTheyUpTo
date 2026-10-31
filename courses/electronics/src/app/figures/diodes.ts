// Lesson 7, curved lines: the diode's bent current curve and how it moves
// with temperature, the resistor that keeps an LED alive, a diode guarding
// against a battery put in backwards, a rectifier and its reservoir
// capacitor, diodes clipping a signal, and an LED put in the wrong way round.

import { el, svg } from 'didactics/dom';
import { line, polyline, small, type P } from 'didactics/draw';
import { e12, type DiodeKind, type Part } from 'circuit-kit/parts';
import { solve } from 'circuit-kit/solve';
import { wire } from '../circuit/build';
import { schematic } from '../circuit/schematic';
import { amps, ohms, si, volts, watts } from '../circuit/units';
import { hunt } from './bench';
import { guess, stars } from './guess';
import { COL, figure, frame, slider } from './kit';
import { capture, scope } from './scope';

const IN = '#5b9bd5';

const NAMES: Record<DiodeKind, string> = {
  silicon: 'Silicon',
  germanium: 'Germanium',
  schottky: 'Schottky',
  'led-red': 'Red LED',
  'led-green': 'Green LED',
  'led-blue': 'Blue LED',
};
const TRACE: Record<DiodeKind, string> = {
  silicon: COL.ink,
  germanium: '#8a6d3b',
  schottky: COL.resistance,
  'led-red': '#e5332a',
  'led-green': '#2fbf4a',
  'led-blue': '#3a6ff0',
};

/** A row of chips, one picked, which calls `pick` with the chosen value. */
function chipRow<T>(values: readonly T[], show: (v: T) => string, at: () => T, pick: (v: T) => void): HTMLElement {
  const row = el('div.chips');
  const paint = () => row.replaceChildren(...values.map((v) => el('button.chip', { type: 'button', className: v === at() ? 'chip on' : 'chip', onclick: () => { pick(v); paint(); } }, show(v))));
  paint();
  return row;
}

// ---------------------------------------------------------------------------
// The curve: a diode's current against the voltage across it, and how it moves with temperature.

const IMAX = 0.04;
const VMAX = 4;
const LOG_LO = 1e-6;
const LOG_HI = 0.1;

/** A diode's voltage at each of a run of currents, from the solver itself: a current source pushed through it. */
function curveOf(model: DiodeKind, celsius: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k <= 50; k++) {
    const i = LOG_LO * (LOG_HI / LOG_LO) ** (k / 50);
    const s = solve([
      { id: 'i', kind: 'current', a: 'gnd', b: 'a', amps: i },
      { id: 'd', kind: 'diode', a: 'a', b: 'gnd', model },
    ], { celsius });
    out.push([s.v.a, i]);
  }
  return out;
}

export const diodeIvFigure = figure(['curves'], (ctx, t) => {
  const f = frame(400, 250, 4);
  const sup = { id: 'sup', kind: 'source' as const, a: 'top', b: 'gnd', volts: 0 };
  // The tester's own 10 Ω, so a diode pushed past its knee doesn't take an endless current.
  const guard = { id: 'guard', kind: 'resistor' as const, a: 'top', b: 'd-in', ohms: 10 };
  const d: Extract<Part, { kind: 'diode' }> = { id: 'd', kind: 'diode', a: 'd-in', b: 'd-out', model: 'silicon' };
  const w2 = wire('w2', 'd-out', 'gnd');
  const parts: Part[] = [sup, guard, d, w2];
  const holder = svg('g');
  let sch = schematic(ctx, [], { topVolts: 4, typicalAmps: 0.01 });
  const build = () => {
    sch = schematic(ctx, [
      { part: sup, path: [[30, 100], [30, 160]], tag: 'Supply', tagSide: 'left' },
      { part: guard, path: [[30, 100], [30, 40], [100, 40], [100, 70]] },
      { part: d, path: [[100, 70], [100, 160]] },
      { part: w2, path: [[100, 160], [100, 210], [30, 210], [30, 160]] },
    ], { topVolts: 4, typicalAmps: 0.01, grounds: [[30, 210]] });
    holder.replaceChildren(sch.node);
  };
  build();

  const X0 = 165;
  const X1 = 388;
  const Y0 = 210;
  const Y1 = 25;
  let log = false;
  let celsius = 25;
  const px = (v: number) => X0 + (Math.min(VMAX, Math.max(0, v)) / VMAX) * (X1 - X0);
  const py = (i: number) => log
    ? Y0 - (Math.log(Math.min(LOG_HI, Math.max(LOG_LO, i)) / LOG_LO) / Math.log(LOG_HI / LOG_LO)) * (Y0 - Y1)
    : Y0 - (Math.min(IMAX, Math.max(0, i)) / IMAX) * (Y0 - Y1);
  const axes = svg('g');
  const curves = svg('g', { fill: 'none' });
  const cursor = svg('circle', { r: 5, fill: COL.current, stroke: COL.ink, 'stroke-width': 1.4 });
  const cover = svg('rect', { x: X0 + 2, y: Y1 - 6, width: X1 - X0, height: Y0 - Y1 + 4, fill: COL.paper });
  f.svg.append(holder, axes, curves, cursor, cover);
  const tried = new Set<DiodeKind>();
  let guessed = false;
  let fresh = false;

  const paint = () => {
    axes.replaceChildren(
      line(X0, Y0, X1, Y0, COL.ink, 1.4),
      line(X0, Y0, X0, Y1, COL.ink, 1.4),
      ...[0, 1, 2, 3, 4].map((v) => small(px(v), Y0 + 13, `${v} V`, { anchor: 'middle', soft: true })),
      ...(log ? [1e-6, 1e-4, 1e-2] : [0.01, 0.02, 0.03, 0.04]).map((i) => small(X0 - 4, py(i) + 3, si(i, 'A'), { anchor: 'end', soft: true })),
      small(X1, Y0 + 26, 'volts across the diode', { anchor: 'end', soft: true }),
    );
    curves.replaceChildren(...[...tried, d.model as DiodeKind].map((m) =>
      polyline(curveOf(m, celsius).filter(([, i]) => log || i <= IMAX * 1.05).map(([v, i]): P => [px(v), py(i)]), TRACE[m], m === d.model ? 2.2 : 1.4, m === d.model ? {} : { opacity: 0.55 })));
    const s = solve(parts, { celsius });
    sch.show(s);
    const vd = s.v['d-in'] - s.v['d-out'];
    const i = s.i.d;
    cursor.setAttribute('cx', px(vd).toFixed(1));
    cursor.setAttribute('cy', py(i).toFixed(1));
    if (!guessed) {
      f.readout.textContent = 'A silicon diode on a curve tracer. You will raise the voltage across it from 0 to 1 V and watch the current through it.';
      return;
    }
    cover.setAttribute('display', 'none');
    tried.add(d.model as DiodeKind);
    const name = NAMES[d.model as DiodeKind];
    f.readout.textContent =
      (fresh ? `${q.reply()} ` : '') +
      `${name}, at ${celsius} °C: ${volts(vd)} across it, ${amps(i)} through it. ` +
      (i < 1e-4 ? 'Almost nothing flows because the diode has not reached its knee yet.' : i > IMAX ? 'Far past its knee: connected straight across a supply without a resistor, it would burn out.' : 'Past the knee, a small rise in voltage causes a large rise in current.');
    fresh = false;
    const lit = [...tried];
    if (lit.includes('silicon') && lit.includes('germanium') && lit.some((m) => m.startsWith('led-'))) t.done();
  };
  const q = guess({
    question: 'As the voltage goes from 0 to 1 V, the current...',
    options: ['stays near zero, then shoots up', 'rises steadily, like a resistor\'s', 'flows from the start, then stops'],
    answer: 0,
    replies: [
      'Right: current stays tiny until the knee, then shoots up.',
      'A resistor gives a straight line, whereas a diode\'s curve stays flat and then bends sharply upward.',
      'It works the other way round: almost nothing flows at first, and then the current shoots up past the knee.',
    ],
    onLock: () => {
      guessed = fresh = true;
      knobs.style.display = '';
      sv.set(0.75);
      paint();
    },
  });
  const sv = slider('Supply', 0, 4, 0.05, 0, (v) => volts(v), (v) => { sup.volts = v; paint(); }, 'voltage');
  const temp = slider('Temperature', -20, 80, 5, 25, (c) => `${c} °C`, (c) => { celsius = c; paint(); }, 'power');
  const kinds = chipRow(Object.keys(NAMES) as DiodeKind[], (m) => NAMES[m], () => d.model as DiodeKind, (m) => { d.model = m; build(); paint(); });
  const scale = chipRow([false, true], (l) => (l ? 'Log scale' : 'Plain scale'), () => log, (l) => { log = l; paint(); });
  const knobs = el('div', {}, sv.node, temp.node, kinds, scale);
  knobs.style.display = 'none';
  f.controls.append(q.node, knobs);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// An LED and its resistor: choose one for 10 to 20 mA.

const LED_RS = e12(47, 4700);

export const ledResistorFigure = figure(['design'], (ctx, t) => {
  const f = frame(400, 220, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9, ohms: 1 };
  const r = { id: 'r', kind: 'resistor' as const, a: 'v9', b: 'l', ohms: 47 };
  const led = { id: 'led', kind: 'diode' as const, a: 'l', b: 'lb', model: 'led-red' as DiodeKind };
  const w2 = wire('w2', 'lb', 'gnd');
  const parts: Part[] = [bat, r, led, w2];
  const sch = schematic(ctx, [
    { part: bat, path: [[50, 90], [50, 150]], tag: '9 V', tagSide: 'left' },
    { part: r, path: [[50, 90], [50, 40], [150, 40], [230, 40], [230, 80]], tag: 'R', tagSide: 'left' },
    { part: led, path: [[230, 80], [230, 160]], tag: 'Red LED', tagSide: 'left' },
    { part: w2, path: [[230, 160], [230, 195], [50, 195], [50, 150]] },
  ], { topVolts: 9, typicalAmps: 0.015, grounds: [[50, 195]] });
  f.svg.append(sch.node);
  const earned = el('div');
  let best: { got: boolean }[] | null = null;
  let k = 0;

  const paint = () => {
    r.ohms = LED_RS[k];
    const s = solve(parts);
    sch.show(s);
    const i = s.i.led;
    const vf = s.v.l - s.v.lb;
    const pr = s.p.r;
    const ok = i >= 0.01 && i <= 0.02;
    f.readout.textContent =
      `${ohms(r.ohms)}: ${amps(i)} through the LED, which drops ${volts(vf)}; the resistor drops ${volts(i * r.ohms)} and turns ${watts(pr)} into heat. ` +
      (i > 0.03 ? 'Far too much current: an ordinary indicator LED is rated for about 20 mA, and this one would soon fail.' : i > 0.02 ? 'A bit high for an ordinary 20 mA indicator LED.' : i < 0.01 ? (i < 0.002 ? 'The current is so low that the LED is barely glowing.' : 'The LED lights, though it is dimmer than it would be at 10 to 20 mA.') : 'A good operating current for an ordinary indicator LED.');
    if (ok) {
      const now = [
        { text: 'Between 10 and 20 mA', got: true },
        { text: 'The resistor stays well within its 1/4 W rating', got: pr < 0.125 },
        { text: 'Close to 15 mA, the middle of the range', got: Math.abs(i - 0.015) < 0.0015 },
      ];
      if (!best || now.filter((x) => x.got).length > best.filter((x) => x.got).length) best = now;
      earned.replaceChildren(stars(best as { text: string; got: boolean }[]));
      t.done();
    }
  };
  f.controls.append(slider('Resistor', 0, LED_RS.length - 1, 1, 0, (x) => ohms(LED_RS[x]), (x) => { k = x; paint(); }, 'resistance').node, earned);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Reverse protection: a battery in backwards.

type Guard = 'none' | 'silicon' | 'schottky';

export const reverseFigure = figure(['protect'], (ctx, t) => {
  const f = frame(400, 220, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const dGuard: Extract<Part, { kind: 'diode' }> = { id: 'guard', kind: 'diode', a: 'v9', b: 'p', model: 'silicon' };
  const wGuard = wire('guard', 'v9', 'p');
  const pedal = { id: 'pedal', kind: 'resistor' as const, a: 'p', b: 'pb', ohms: 1000 };
  const w2 = wire('w2', 'pb', 'gnd');
  let kind: Guard = 'none';
  let backwards = false;
  const holder = svg('g');
  let sch = schematic(ctx, [], { topVolts: 9, typicalAmps: 0.009 });
  const build = () => {
    const g = kind === 'none' ? wGuard : dGuard;
    sch = schematic(ctx, [
      { part: bat, path: [[50, 90], [50, 150]], tag: backwards ? 'backwards' : '9 V', tagSide: 'left' },
      { part: g, path: [[50, 90], [50, 40], [120, 40], [200, 40], [280, 40], [280, 80]], tag: kind === 'none' ? undefined : NAMES[kind], tagSide: 'right' },
      { part: pedal, path: [[280, 80], [280, 160]], tag: 'Pedal', tagSide: 'left' },
      { part: w2, path: [[280, 160], [280, 195], [50, 195], [50, 150]] },
    ], { topVolts: 9, typicalAmps: 0.009, grounds: [[50, 195]] });
    holder.replaceChildren(sch.node);
  };
  f.svg.append(holder);
  const seen = new Set<string>();

  const paint = () => {
    bat.volts = backwards ? -9 : 9;
    if (kind !== 'none') dGuard.model = kind;
    build();
    const s = solve([bat, kind === 'none' ? wGuard : dGuard, pedal, w2]);
    sch.show(s);
    const vp = Math.abs(s.v.p - s.v.pb) < 1e-3 ? 0 : s.v.p - s.v.pb;
    seen.add(`${kind}:${backwards}`);
    f.readout.textContent = backwards
      ? kind === 'none'
        ? `With the battery in backwards, the pedal gets ${volts(vp)}. Its chips and electrolytic capacitors are built for one way round only, and this kills them.`
        : `The diode blocks reverse current, so the pedal gets ${volts(vp)} and nothing is harmed. Put the battery in the right way round.`
      : kind === 'none'
        ? `The pedal gets the full ${volts(vp)}. Now put the battery in backwards.`
        : `The pedal gets ${volts(vp)}: the diode takes ${volts(9 - vp)} of the battery's 9 V. ${kind === 'silicon' ? 'A Schottky diode costs less.' : 'A Schottky’s knee is lower, so it costs less than silicon.'}`;
    if (seen.has('silicon:true') || seen.has('schottky:true')) t.done();
  };
  f.controls.append(
    chipRow([false, true], (b) => (b ? 'Battery in backwards' : 'Battery the right way'), () => backwards, (b) => { backwards = b; paint(); }),
    chipRow<Guard>(['none', 'silicon', 'schottky'], (g) => (g === 'none' ? 'No diode' : `${NAMES[g]} diode`), () => kind, (g) => { kind = g; paint(); }),
  );
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A rectifier: AC in, a diode, and a reservoir capacitor.

const WINDOW_RECT = 0.06;
const RESERVOIRS = [0, 10e-6, 100e-6, 1000e-6];

export const rectifierFigure = figure(['smooth'], (ctx, t) => {
  const f = frame(400, 290, 4);
  const ac = { id: 'ac', kind: 'source' as const, a: 'in', b: 'gnd', volts: 0, wave: { shape: 'sine' as const, amp: 12, hz: 50 } };
  const d = { id: 'd', kind: 'diode' as const, a: 'in', b: 'out', model: 'silicon' as DiodeKind };
  const cap = { id: 'cap', kind: 'capacitor' as const, a: 'out', b: 'cb', farads: 1e-12 };
  const cw = wire('cw', 'cb', 'gnd');
  const load = { id: 'load', kind: 'resistor' as const, a: 'out', b: 'lb', ohms: 1000 };
  const lw = wire('lw', 'lb', 'gnd');
  const parts: Part[] = [ac, d, cap, cw, load, lw];
  const sch = schematic(ctx, [
    { part: ac, path: [[40, 70], [40, 120]], tag: '12 V AC', tagSide: 'left' },
    { part: d, path: [[40, 70], [40, 30], [110, 30], [150, 30], [200, 30]], tag: 'Diode', tagSide: 'right' },
    { part: cap, path: [[200, 30], [200, 120]], tag: 'C', tagSide: 'left' },
    { part: load, path: [[200, 30], [300, 30], [300, 120]], tag: '1 kΩ load', tagSide: 'left' },
  ], { topVolts: 12, typicalAmps: 0.01, grounds: [[40, 120], [200, 120], [300, 120]] });
  const scr = scope({ x: 14, y: 150, w: 372, h: 125, vmin: -13, vmax: 13, window: WINDOW_RECT });
  f.svg.append(sch.node, scr.node);
  let picked = 0;
  let done = false;

  const paint = () => {
    cap.farads = picked || 1e-12;
    const [vin, vout] = capture(parts, [(s) => s.v.in, (s) => s.v.out], { window: WINDOW_RECT, n: 240, settle: 0.1 });
    scr.draw([{ volts: vout, colour: COL.voltage, label: 'out' }, { volts: vin, colour: IN, ghost: true }]);
    sch.show(solve(parts, { t: 0.005 }));
    const tail = vout.slice(80);
    const ripple = Math.max(...tail) - Math.min(...tail);
    f.readout.textContent = !picked
      ? `The diode passes only the forward half of each wave, minus its 0.7 V drop, leaving bumps of DC that peak at ${volts(Math.max(...vout))} with nothing between them. Add a reservoir capacitor.`
      : `The capacitor fills at each peak and feeds the load between them, so the output only sags by ${volts(ripple)} before the next peak tops it up. ` + (ripple < 0.5 ? 'The ripple is under 0.5 V, smooth enough to run a circuit.' : 'There is still a lot of ripple; a larger capacitor will hold the voltage up longer between peaks.');
    if (picked && ripple < 0.5 && !done) {
      done = true;
      t.done();
    }
  };
  f.controls.append(chipRow(RESERVOIRS, (v) => (v ? (v >= 1e-3 ? '1000 µF' : si(v, 'F')) : 'No capacitor'), () => picked, (v) => { picked = v; paint(); }));
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Clipping: two diodes back to back across a signal.

const WINDOW_CLIP = 0.01;

export const clipperFigure = figure(['clip'], (ctx, t) => {
  const f = frame(400, 290, 4);
  const sig = { id: 'sig', kind: 'source' as const, a: 'in', b: 'gnd', volts: 0, wave: { shape: 'sine' as const, amp: 3, hz: 200 } };
  const r = { id: 'r', kind: 'resistor' as const, a: 'in', b: 'out', ohms: 10000 };
  const up: Extract<Part, { kind: 'diode' }> = { id: 'up', kind: 'diode', a: 'out', b: 'gnd', model: 'silicon' };
  const down: Extract<Part, { kind: 'diode' }> = { id: 'down', kind: 'diode', a: 'dn', b: 'out', model: 'silicon' };
  const wd = wire('wd', 'gnd', 'dn');
  const parts: Part[] = [sig, r, up, down, wd];
  const sch = schematic(ctx, [
    { part: sig, path: [[40, 70], [40, 120]], tag: 'Signal', tagSide: 'left' },
    { part: r, path: [[40, 70], [40, 30], [100, 30], [180, 30]], tag: '10 kΩ', tagSide: 'right' },
    { part: up, path: [[180, 30], [180, 120]] },
    { part: down, path: [[260, 120], [260, 30], [180, 30]] },
    { part: wd, path: [[180, 120], [260, 120]] },
  ], { topVolts: 3, typicalAmps: 0.0003, grounds: [[40, 120], [180, 120]] });
  const scr = scope({ x: 14, y: 150, w: 372, h: 125, vmin: -4, vmax: 4, window: WINDOW_CLIP });
  f.svg.append(sch.node, scr.node, small(275, 80, 'two diodes,', { soft: true }), small(275, 92, 'opposite ways', { soft: true }));
  let guessed = false;
  let fresh = false;
  const tried = new Set<DiodeKind>();

  const paint = () => {
    if (!guessed) {
      scr.hide('Guess first');
      f.readout.textContent = 'A signal swinging 3 V each way, through a resistor, with two silicon diodes across the output: one pointing down to ground, one pointing up from it.';
      return;
    }
    scr.hide(null);
    const [vin, vout] = capture(parts, [(s) => s.v.in, (s) => s.v.out], { window: WINDOW_CLIP, n: 240 });
    scr.draw([{ volts: vout, colour: COL.current, label: 'out' }, { volts: vin, colour: IN, ghost: true }]);
    tried.add(up.model as DiodeKind);
    f.readout.textContent =
      (fresh ? `${q.reply()} ` : '') +
      `${NAMES[up.model as DiodeKind]} diodes: the output stops at about ${volts(Math.max(...vout))} each way, wherever the diodes reach their knee, and the rest of the wave drops across the resistor. ` +
      (tried.size < 3 ? 'Try the other kinds.' : 'Lower knees clip harder and sooner; higher knees let more through, louder.');
    fresh = false;
    if (tried.size >= 3) t.done();
  };
  const q = guess({
    question: 'What comes out?',
    options: ['The wave, cut flat at under a volt each way', 'The same wave, smaller', 'Only the top half'],
    answer: 0,
    replies: [
      'Right: current stays tiny until the knee, then shoots up.',
      'A resistor divider scales the whole wave down, whereas diodes clamp the peaks once the signal reaches their knee.',
      'A single diode clips only one half of the wave; the second diode, facing the opposite way, clips the other half too.',
    ],
    onLock: () => {
      guessed = fresh = true;
      kinds.style.display = '';
      paint();
    },
  });
  const kinds = chipRow<DiodeKind>(['silicon', 'germanium', 'led-red'], (m) => NAMES[m], () => up.model as DiodeKind, (m) => { up.model = down.model = m; paint(); });
  kinds.style.display = 'none';
  f.controls.append(q.node, kinds);
  sch.show(solve(parts));
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The fault: one LED of two is dark, because it is in backwards.

export const backwardsLedFigure = figure(['find'], (ctx, t) => {
  const bat = { id: 'bat', kind: 'source' as const, a: 'v9', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'v9', 'top');
  const r1 = { id: 'r1', kind: 'resistor' as const, a: 'top', b: 'l1', ohms: 470 };
  const led1 = { id: 'led1', kind: 'diode' as const, a: 'l1', b: 'l1b', model: 'led-green' as DiodeKind };
  const w3 = wire('w3', 'l1b', 'gnd');
  const r2 = { id: 'r2', kind: 'resistor' as const, a: 'top', b: 'l2', ohms: 470 };
  const led2Drawn = { id: 'led2', kind: 'diode' as const, a: 'l2', b: 'l2b', model: 'led-green' as DiodeKind };
  // As it really is: soldered in the wrong way round.
  const led2 = { ...led2Drawn, a: 'l2b', b: 'l2' };
  const w4 = wire('w4', 'l2b', 'gnd');
  const parts: Part[] = [bat, w1, r1, led1, w3, r2, led2, w4];
  return hunt(ctx, t, {
    parts,
    places: [
      { part: bat, path: [[40, 100], [40, 150]], tag: '9 V', tagSide: 'left' },
      { part: w1, path: [[40, 100], [40, 30], [150, 30], [290, 30]] },
      { part: r1, path: [[150, 30], [150, 100]], tag: 'R1', tagSide: 'left' },
      { part: led1, path: [[150, 100], [150, 170]], tag: 'LED 1', tagSide: 'left' },
      { part: w3, path: [[150, 170], [150, 205], [40, 205], [40, 150]] },
      { part: r2, path: [[290, 30], [290, 100]], tag: 'R2', tagSide: 'left' },
      { part: led2Drawn, path: [[290, 100], [290, 170]], tag: 'LED 2', tagSide: 'left' },
      { part: w4, path: [[290, 170], [290, 205], [150, 205]] },
    ],
    schematic: { topVolts: 9, typicalAmps: 0.015, grounds: [[40, 205]] },
    size: [400, 240],
    face: [180, 150],
    brief: 'Two green LEDs, each with a 470 Ω resistor, should both light. LED 2 is dark.',
    culprit: 'led2',
    found: 'Found it: LED 2 is in backwards. A reverse-biased diode blocks current, so no current flows in its branch, R2 drops 0 V, and the full 9 V appears across the LED, exceeding the 5 V reverse rating of a typical LED. On the board, the flat edge marking its cathode faces the wrong way.',
    hints: ['Compare the voltages along the two branches, part by part.', 'A lit LED drops about 2 V. What does LED 2 drop?'],
    par: 6,
  });
});
