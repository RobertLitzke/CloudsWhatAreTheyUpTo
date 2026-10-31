// Lesson 1, what is actually flowing: two bulbs in a line (is current used
// up?), the electrons' real pace, a meter measuring volts across and amps
// through, a resistor sized to hit a current, and a curve tracer on which a
// lamp breaks Ohm's law.

import { el, svg } from 'didactics/dom';
import { label, line, small, type P } from 'didactics/draw';
import { e12, type Part } from 'circuit-kit/parts';
import { solve, type Solution } from 'circuit-kit/solve';
import { schematic, type Placement } from '../circuit/schematic';
import { amps, ohms, si, volts } from '../circuit/units';
import { guess, meterFace, placeTip, probeTip, stars } from './guess';
import { COL, figure, frame, slider } from './kit';

/** A loop round the edge of a box: the corners, clockwise from the top left. */
const box = (x0: number, y0: number, x1: number, y1: number) => ({ tl: [x0, y0] as P, tr: [x1, y0] as P, br: [x1, y1] as P, bl: [x0, y1] as P });

// ---------------------------------------------------------------------------
// Two bulbs in series. Which glows brighter? The drawing is covered until the
// reader says.

export const seriesBulbsFigure = figure(['reveal'], (ctx, t) => {
  const f = frame(400, 230, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const a = { id: 'a', kind: 'lamp' as const, a: 'a-in', b: 'mid', ohms: 30, rated: 4.5 };
  const b = { id: 'b', kind: 'lamp' as const, a: 'mid2', b: 'b-out', ohms: 30, rated: 4.5 };
  const parts: Part[] = [
    bat,
    { id: 'w1', kind: 'wire', a: 'top', b: 'a-in' },
    a,
    { id: 'w2', kind: 'wire', a: 'mid', b: 'mid2' },
    b,
    { id: 'w3', kind: 'wire', a: 'b-out', b: 'gnd' },
  ];
  const k = box(60, 40, 340, 190);
  const sch = schematic(ctx, [
    { part: bat, path: [[60, 85], [60, 145]], tag: '9 V', tagSide: 'left' },
    { part: parts[1] as Extract<Part, { kind: 'wire' }>, path: [[60, 85], k.tl, [150, 40]] },
    { part: a, path: [[150, 40], [250, 40]], tag: 'A', tagSide: 'left' },
    { part: parts[3] as Extract<Part, { kind: 'wire' }>, path: [[250, 40], k.tr, [340, 90]] },
    { part: b, path: [[340, 90], [340, 190]], tag: 'B', tagSide: 'right' },
    { part: parts[5] as Extract<Part, { kind: 'wire' }>, path: [[340, 190], k.bl, [60, 145]] },
  ], { topVolts: 9, typicalAmps: 0.15 });
  f.svg.append(sch.node);
  sch.cover({ colour: true, dots: true, glow: true });

  let lockedIn = false;
  const bSlider = slider('Bulb B', 10, 90, 5, 30, (x) => `${x} Ω lit`, (x) => { b.ohms = x; paint(); }, 'resistance');
  bSlider.input.disabled = true;

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    if (!lockedIn) {
      f.readout.textContent = 'The current leaves the battery, reaches bulb A first, then bulb B, then goes back to the battery. The bulbs are covered until you guess.';
      return;
    }
    const same = Math.abs(b.ohms - a.ohms) < 1e-6;
    f.readout.textContent =
      `${q.reply()} ${amps(s.i.a)} goes through A and ${amps(s.i.b)} through B, and that exact same current returns to the battery. ` +
      (same ? 'Now change bulb B and watch bulb A.' : `Change B and A changes too: the one current round the loop is set by both bulbs together.`);
  };
  const q = guess({
    question: 'Which bulb will glow brighter?',
    options: ['A, the first', 'B, the second', 'Both the same'],
    answer: 2,
    replies: [
      'Most people guess A because it feels as if A gets the current first and uses some up, when in fact the same current flows through every part of a single loop.',
      'B would only glow brighter if current piled up at the end of the line, but charge flows at the same rate through every part of a single loop.',
      'Right, both bulbs carry the exact same current and glow equally.',
    ],
    unsure: 'Here is what happens.',
    onLock: () => {
      lockedIn = true;
      sch.cover({});
      bSlider.input.disabled = false;
      paint();
      t.done();
    },
  });
  f.controls.append(q.node, bSlider.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The wire is already full: the same loop at the dots' usual pace, then at
// the electrons' true drift.

export const trueSpeedFigure = figure(['slow'], (ctx, t) => {
  const f = frame(400, 220, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const lamp = { id: 'lamp', kind: 'lamp' as const, a: 'l-in', b: 'l-out', ohms: 30, rated: 9 };
  const sw = { id: 'sw', kind: 'switch' as const, a: 'sw-in', b: 'sw-out', closed: false };
  const w = (id: string, a: string, b: string) => ({ id, kind: 'wire' as const, a, b });
  const parts = [bat, w('w1', 'top', 'l-in'), lamp, w('w2', 'l-out', 'sw-in'), sw, w('w3', 'sw-out', 'gnd')];
  const sch = schematic(ctx, [
    { part: bat, path: [[60, 75], [60, 135]], tag: '9 V', tagSide: 'left' },
    { part: parts[1] as Extract<Part, { kind: 'wire' }>, path: [[60, 75], [60, 30], [340, 30], [340, 70]] },
    { part: lamp, path: [[340, 70], [340, 150]], tag: 'Lamp', tagSide: 'left' },
    { part: parts[3] as Extract<Part, { kind: 'wire' }>, path: [[340, 150], [340, 190], [250, 190]] },
    { part: sw, path: [[250, 190], [150, 190]], tag: 'Switch', tagSide: 'right' },
    { part: parts[5] as Extract<Part, { kind: 'wire' }>, path: [[150, 190], [60, 190], [60, 135]] },
  ], {
    topVolts: 9,
    typicalAmps: 0.15,
    onToggle: () => {
      sw.closed = !sw.closed;
      paint();
    },
  });
  f.svg.append(sch.node);

  let real = false;
  const toggle = el('button.btn.btn-small', { type: 'button' }, 'Show the true pace') as HTMLButtonElement;
  toggle.addEventListener('click', () => {
    real = !real;
    toggle.textContent = real ? 'Back to the usual pace' : 'Show the true pace';
    // The usual pace is 40 px a second; this loop is drawn about a metre round, so 1 px is about 1.4 mm.
    sch.pace(real ? 0.001 : 1);
    paint();
  });

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    const i = Math.abs(s.i.lamp);
    // Drift speed v = I / (n q A): copper has 8.5e28 free electrons a cubic metre; the wire is 0.5 mm².
    const drift = i / (8.5e28 * 1.602e-19 * 0.5e-6);
    if (!sw.closed) {
      f.readout.textContent = 'The switch is open: tap it to close the loop. Watch how soon the lamp lights.';
      return;
    }
    if (!real) {
      f.readout.textContent = `The lamp lights the instant the loop closes, with ${amps(i)} flowing. The dots here are slowed down to be seen, and they are still much too fast. Try the true pace.`;
      return;
    }
    const hours = 1 / drift / 3600;
    f.readout.textContent =
      `At ${amps(i)} in ordinary hookup wire each electron drifts about ${(drift * 1000).toFixed(2)} mm a second, so one would take ${hours.toFixed(0)} hours to get round a metre of loop. ` +
      'The lamp still lit at once: every electron in the loop started moving together, because the wire was already full of them.';
    t.done();
  };
  f.controls.append(toggle);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The multimeter: volts across a part, amps through a cut in the loop.

type Mode = 'V' | 'A';

export const meterFigure = figure(['volts', 'amps'], (ctx, t) => {
  const f = frame(400, 260, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const r = { id: 'r', kind: 'resistor' as const, a: 'r-in', b: 'r-out', ohms: 47 };
  const lamp = { id: 'lamp', kind: 'lamp' as const, a: 'l-in', b: 'l-out', ohms: 60, rated: 6 };
  const w = (id: string, a: string, b: string) => ({ id, kind: 'wire' as const, a, b });
  const parts: Part[] = [bat, w('w1', 'top', 'r-in'), r, w('w2', 'r-out', 'l-in'), lamp, w('w3', 'l-out', 'gnd')];
  const wires = parts.filter((p): p is Extract<Part, { kind: 'wire' }> => p.kind === 'wire');
  const places: Placement[] = [
    { part: bat, path: [[50, 110], [50, 170]], tag: '9 V', tagSide: 'left' },
    { part: wires[0], path: [[50, 110], [50, 60], [110, 60]] },
    { part: r, path: [[110, 60], [210, 60]], tag: 'R 47 Ω', tagSide: 'left' },
    { part: wires[1], path: [[210, 60], [260, 60], [260, 110]] },
    { part: lamp, path: [[260, 110], [260, 190]], tag: 'Lamp', tagSide: 'right' },
    { part: wires[2], path: [[260, 190], [260, 230], [50, 230], [50, 170]] },
  ];

  let mode: Mode = 'V';
  let moving: 'red' | 'black' = 'red';
  let red: string | null = null;
  let black: string | null = 'gnd';
  let cut: string | null = null;
  let blown = false;
  const face = meterFace(290, 14, 92);
  const redTip = probeTip('red');
  const blackTip = probeTip('black');
  const cutMark = svg('g', { display: 'none' }, svg('circle', { r: 11, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.6 }), label(0, 4, 'A', { anchor: 'middle', bold: true }));

  const sch = schematic(ctx, places, {
    topVolts: 9,
    typicalAmps: 0.08,
    grounds: [[50, 230]],
    onProbe: (node, part) => {
      if (mode === 'V') {
        if (moving === 'red') red = node;
        else black = node;
      } else if (part.kind === 'wire') {
        cut = part.id;
      } else {
        // Amps mode with the probes across a part: the meter is nearly a wire, so it shorts the part out.
        blown = true;
      }
      paint();
    },
  });
  f.svg.append(sch.node, cutMark, redTip, blackTip, face.node);

  const modeRow = el('div.chips');
  const probeRow = el('div.chips');
  const chip = (text: string, on: boolean, click: () => void) => el('button.chip', { type: 'button', className: on ? 'chip on' : 'chip', onclick: click }, text);
  const fuse = el('button.btn.btn-small', { type: 'button', onclick: () => { blown = false; paint(); } }, 'Fit a new fuse');

  const paint = () => {
    const s: Solution = solve(parts);
    sch.show(s);
    modeRow.replaceChildren(
      chip('Volts', mode === 'V', () => { mode = 'V'; paint(); }),
      chip('Amps', mode === 'A', () => { mode = 'A'; paint(); }),
    );
    probeRow.replaceChildren(...(mode === 'V' ? [chip('Tap moves red', moving === 'red', () => { moving = 'red'; paint(); }), chip('Tap moves black', moving === 'black', () => { moving = 'black'; paint(); })] : []));
    fuse.style.display = blown ? '' : 'none';
    placeTip(redTip, mode === 'V' && red ? sch.pointOf(red) : undefined);
    placeTip(blackTip, mode === 'V' && black ? sch.pointOf(black) : undefined);
    const cutWire = cut ? places.find((p) => p.part.id === cut) : undefined;
    if (mode === 'A' && cutWire && 'path' in cutWire && !blown) {
      const [p0, p1] = cutWire.path;
      cutMark.removeAttribute('display');
      cutMark.setAttribute('transform', `translate(${(p0[0] + p1[0]) / 2} ${(p0[1] + p1[1]) / 2})`);
    } else cutMark.setAttribute('display', 'none');

    if (blown) {
      face.show('FUSE', '', 'A');
      f.readout.textContent = 'Pop: the meter\'s fuse blew. In amps mode a meter has nearly zero resistance like a plain wire, so placing it across a part shorts that part out and draws all the current the battery can deliver. Fit a new fuse, then cut a wire to put the meter in series instead.';
      return;
    }
    if (mode === 'V') {
      const reading = red && black ? s.v[red] - s.v[black] : NaN;
      face.show(Number.isFinite(reading) ? reading.toFixed(2) : '----', 'V', 'V');
      const across = red && black && new Set([red, black]);
      const onR = across && (across.has('r-in') || across.has('top')) && (across.has('r-out') || across.has('l-in')) && red !== black;
      f.readout.textContent = !red
        ? 'Voltage is always measured between two points. The black probe sits on the battery\'s - end; tap a wire to put the red probe there.'
        : onR
          ? `${volts(Math.abs(reading))} across the resistor: that is how much electrical push drops across it. Voltage is measured across a part, leaving the circuit intact.`
          : `${volts(reading)} from the black probe to the red. Now measure across the resistor alone: put one probe on each side of it.`;
      if (onR && t.goal === 'volts') t.done();
      return;
    }
    const reading = cut ? s.i[cut] : NaN;
    face.show(cut ? (Math.abs(reading) * 1000).toFixed(1) : '----', 'mA', 'A');
    f.readout.textContent = !cut
      ? 'To count the current, the meter has to become part of the loop, so the current goes through it. Tap a plain wire to cut it and put the meter in the gap.'
      : `${amps(Math.abs(reading))} flows through the meter. Cut any other wire in the loop and you will read the exact same current.`;
    if (cut && t.goal === 'amps') t.done();
  };
  f.controls.append(modeRow, probeRow, fuse);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Ohm's law as a design: pick the resistor that lets 9 V push 20 mA.

export const ohmTargetFigure = figure(['hit'], (ctx, t) => {
  const f = frame(400, 200, 3);
  const values = e12(100, 2200);
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const r = { id: 'r', kind: 'resistor' as const, a: 'r-in', b: 'r-out', ohms: 1000 };
  const w = (id: string, a: string, b: string) => ({ id, kind: 'wire' as const, a, b });
  const parts: Part[] = [bat, w('w1', 'top', 'r-in'), r, w('w2', 'r-out', 'gnd')];
  const sch = schematic(ctx, [
    { part: bat, path: [[70, 80], [70, 140]], tag: '9 V', tagSide: 'left' },
    { part: parts[1] as Extract<Part, { kind: 'wire' }>, path: [[70, 80], [70, 40], [180, 40]] },
    { part: r, path: [[180, 40], [280, 40]], tag: 'R', tagSide: 'left' },
    { part: parts[3] as Extract<Part, { kind: 'wire' }>, path: [[280, 40], [330, 40], [330, 180], [70, 180], [70, 140]] },
  ], { topVolts: 9, typicalAmps: 0.02, grounds: [[70, 180]] });
  const face = meterFace(160, 110, 90);
  f.svg.append(sch.node, face.node);
  const earned = el('div');
  let done = false;

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    const i = s.i.r;
    face.show((i * 1000).toFixed(1), 'mA', 'A');
    const off = (i - 0.02) / 0.02;
    f.readout.textContent =
      Math.abs(off) < 0.05
        ? `${amps(i)} through ${ohms(r.ohms)}, which is within 5% of 20 mA. The exact calculation is 9 V / 20 mA = 450 Ω, and ${ohms(r.ohms)} is the closest standard value on the shelf.`
        : `${amps(i)}: ${off > 0 ? 'too much' : 'too little'}. Resistors come in standard E-series values, so you won't hit 20 mA on the nose, but you can get within 5%.`;
    if (Math.abs(off) < 0.05 && !done) {
      done = true;
      earned.replaceChildren(stars([
        { text: 'Within 5% of 20 mA', got: true },
        { text: 'A value you can buy', got: true },
        { text: `Under a quarter-watt resistor's rating (it takes ${si(s.p.r, 'W')})`, got: s.p.r < 0.25 },
      ]));
      t.done();
    }
  };
  f.controls.append(slider('Resistor', { steps: values, value: 1000, show: ohms, onInput: (v) => { r.ohms = v; paint(); }, color: 'resistance' }).node, earned);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A curve tracer: sweep the voltage across a part and plot the current. A
// resistor draws a straight line; a lamp does not.

export const ivCurveFigure = figure(['lamp'], (ctx, t) => {
  const f = frame(400, 250, 4);
  const supply = { id: 'sup', kind: 'source' as const, a: 'top', b: 'gnd', volts: 0 };
  const resistor = { id: 'dut', kind: 'resistor' as const, a: 'd-in', b: 'd-out', ohms: 40 };
  const lamp = { id: 'dut', kind: 'lamp' as const, a: 'd-in', b: 'd-out', ohms: 40, rated: 12 };
  const w = (id: string, a: string, b: string) => ({ id, kind: 'wire' as const, a, b });
  const w1 = w('w1', 'top', 'd-in');
  const w2 = w('w2', 'd-out', 'gnd');
  let which: 'resistor' | 'lamp' = 'resistor';
  const partsFor = (): Part[] => [supply, w1, which === 'resistor' ? resistor : lamp, w2];

  const holder = svg('g');
  const build = () => {
    const dut = which === 'resistor' ? resistor : lamp;
    const sch = schematic(ctx, [
      { part: supply, path: [[34, 100], [34, 160]] },
      { part: w1, path: [[34, 100], [34, 50], [110, 50], [110, 90]] },
      { part: dut, path: [[110, 90], [110, 170]], tag: which === 'resistor' ? '40 Ω' : 'Lamp', tagSide: 'right' },
      { part: w2, path: [[110, 170], [110, 215], [34, 215], [34, 160]] },
    ], { topVolts: 12, typicalAmps: 0.15, grounds: [[34, 215]] });
    holder.replaceChildren(sch.node);
    return sch;
  };
  let sch = build();

  // The plot: volts across, amps up.
  const X0 = 170;
  const X1 = 385;
  const Y0 = 215;
  const Y1 = 25;
  const VMAX = 12;
  const IMAX = 0.6;
  const px = (v: number) => X0 + (v / VMAX) * (X1 - X0);
  const py = (i: number) => Y0 - (i / IMAX) * (Y0 - Y1);
  const axes = svg('g', {},
    line(X0, Y0, X1, Y0, COL.ink, 1.4),
    line(X0, Y0, X0, Y1, COL.ink, 1.4),
    ...[0, 3, 6, 9, 12].map((v) => small(px(v), Y0 + 13, `${v}`, { anchor: 'middle', soft: true })),
    ...[0.2, 0.4, 0.6].map((i) => small(X0 - 4, py(i) + 3, `${i}`, { anchor: 'end', soft: true })),
    small(X1, Y0 + 26, 'volts across', { anchor: 'end', soft: true }),
    small(X0 + 4, Y1 - 8, 'amps through', { soft: true }),
  );
  const traces = { resistor: svg('g', { fill: COL.resistance }), lamp: svg('g', { fill: COL.current, stroke: COL.ink, 'stroke-width': 0.6 }) };
  const cursor = svg('circle', { r: 5, fill: 'none', stroke: COL.ink, 'stroke-width': 1.6 });
  f.svg.append(holder, axes, traces.resistor, traces.lamp, cursor);

  const swept = { resistor: new Set<number>(), lamp: new Set<number>() };
  const paint = () => {
    const s = solve(partsFor());
    sch.show(s);
    const v = supply.volts;
    const i = s.i.dut;
    cursor.setAttribute('cx', px(v).toFixed(1));
    cursor.setAttribute('cy', py(i).toFixed(1));
    const key = Math.round(v * 2);
    if (!swept[which].has(key)) {
      swept[which].add(key);
      traces[which].append(svg('circle', { cx: px(v), cy: py(i), r: which === 'lamp' ? 3.2 : 2.6 }));
    }
    const rNow = i > 1e-6 ? v / i : which === 'resistor' ? resistor.ohms : lamp.ohms / 10;
    if (which === 'resistor') {
      f.readout.textContent = swept.resistor.size < 6
        ? `${volts(v)} across, ${amps(i)} through. Slide the supply up and down to trace the resistor's curve.`
        : `A straight line: doubling the voltage doubles the current, and V / I stays at ${ohms(rNow)} all the way along. That constant ratio is Ohm's law; now swap in the lamp.`;
    } else {
      f.readout.textContent = `${q.reply()} ${volts(v)} across, ${amps(i)} through, giving V / I = ${ohms(rNow)} at this point. The filament gets hotter as the current rises, and hot tungsten has higher resistance, so the curve bends over.`;
      if (swept.lamp.size >= 12) t.done();
    }
    lampChip.disabled = swept.resistor.size < 6 || which === 'lamp';
  };

  const lampChip = el('button.btn.btn-small', { type: 'button' }, 'Swap in the lamp') as HTMLButtonElement;
  const q = guess({
    question: 'The resistor drew a straight line. What will the lamp draw?',
    options: ['The same straight line', 'A line that bends over', 'A line that bends up'],
    answer: 1,
    replies: [
      'A straight line was a fair guess, since a fixed resistance follows Ohm\'s law, but the lamp\'s resistance changes as its filament heats up.',
      'Right, the curve bends over as the filament heats up and its resistance rises.',
      'It bends the other way, letting through less current at higher voltages than a straight line would predict because hot tungsten resists more.',
    ],
    onLock: () => {
      which = 'lamp';
      supply.volts = 0;
      volt.set(0);
      sch = build();
      volt.input.disabled = false;
      paint();
    },
  });
  q.node.style.display = 'none';
  lampChip.addEventListener('click', () => {
    q.node.style.display = '';
    lampChip.style.display = 'none';
    volt.input.disabled = true;
  });
  const volt = slider('Supply', 0, 12, 0.5, 0, (x) => volts(x), (x) => { supply.volts = x; paint(); }, 'voltage');
  f.controls.append(volt.node, lampChip, q.node);
  paint();
  return f.node;
});
