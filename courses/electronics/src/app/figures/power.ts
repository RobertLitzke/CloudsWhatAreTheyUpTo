// Lesson 4, where the energy goes: a resistor run up to its rating, a
// battery's watt-hours, a long cable to a pump, the fuse that protects the
// cable, the matched load that wastes half, and a joint that has gone bad.

import { el, svg } from 'didactics/dom';
import { line, small, type P } from 'didactics/draw';
import type { Part } from 'circuit-kit/parts';
import { solve, type Solution } from 'circuit-kit/solve';
import { wire, type Wire } from '../circuit/build';
import { schematic, type Placement, type Schematic } from '../circuit/schematic';
import { amps, ohms, volts, watts } from '../circuit/units';
import { hunt } from './bench';
import { guess, meterFace, stars } from './guess';
import { COL, figure, frame, slider, tint } from './kit';

/** A red glow behind part of a drawing, as hot as `heat` (0 to 1 and beyond). */
function heatGlow(x: number, y: number, w: number, h: number) {
  const rect = svg('rect', { x, y, width: w, height: h, rx: Math.min(w, h) / 2, fill: COL.power, opacity: 0, style: 'filter: blur(3px)' });
  return {
    node: rect,
    set(heat: number) {
      rect.setAttribute('opacity', Math.min(0.75, Math.max(0, heat) * 0.6).toFixed(2));
    },
  };
}

// ---------------------------------------------------------------------------
// Heat: twice the volts, how much the heat? Then run a quarter-watt resistor up to its rating.

export const heatFigure = figure(['rating'], (ctx, t) => {
  const f = frame(400, 220, 4);
  const sup = { id: 'sup', kind: 'source' as const, a: 'top', b: 'gnd', volts: 2.5 };
  const r = { id: 'r', kind: 'resistor' as const, a: 'r-in', b: 'r-out', ohms: 100 };
  const w1 = wire('w1', 'top', 'r-in');
  const w2 = wire('w2', 'r-out', 'gnd');
  const parts: Part[] = [sup, w1, r, w2];
  const glow = heatGlow(158, 120, 64, 22);
  const sch = schematic(ctx, [
    { part: sup, path: [[60, 70], [60, 130]], tag: 'Supply', tagSide: 'left' },
    { part: w1, path: [[60, 70], [60, 30], [320, 30], [320, 131], [240, 131]] },
    { part: r, path: [[240, 131], [140, 131]], tag: '100 Ω, ¼ W', tagSide: 'right' },
    { part: w2, path: [[140, 131], [100, 131], [100, 190], [60, 190], [60, 130]] },
  ], { topVolts: 12, typicalAmps: 0.05, grounds: [[60, 190]] });
  f.svg.append(glow.node, sch.node);
  let guessed = false;
  let peaked = false;

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    const p = s.p.r;
    glow.set(p / 0.25);
    if (!guessed) {
      f.readout.textContent = `${volts(sup.volts)} across 100 Ω drives ${amps(s.i.r)} through it, turning ${watts(p)} into heat. Predict how the heat changes if you double the voltage.`;
      return;
    }
    const over = p > 0.25;
    if (over) peaked = true;
    f.readout.textContent = `${q.reply()} ${volts(sup.volts)} pushes ${amps(s.i.r)}, producing ${watts(p)}: ` + (over ? `above its quarter-watt rating. A real resistor would become too hot to touch, char its coating, and fail.` : `${Math.round((p / 0.25) * 100)}% of its quarter-watt rating. Increase the voltage until it exceeds 100%.`);
    if (peaked && t.goal === 'rating') t.done();
  };
  const sup1 = slider('Supply', 0, 12, 0.5, 2.5, (x) => volts(x), (x) => { sup.volts = x; paint(); }, 'voltage');
  sup1.input.disabled = true;
  const q = guess({
    question: 'Double the voltage. The heat...',
    options: ['doubles', 'goes up four times', 'stays the same'],
    answer: 1,
    replies: [
      'Doubling the voltage also doubles the current through the resistor, and power is voltage multiplied by current.',
      'Correct: doubling the voltage drives twice the current, and power is volts times amps (2 x 2 = 4).',
      'The resistance stays at 100 Ω, but the current increases with voltage, so the resistor dissipates more heat.',
    ],
    onLock: () => {
      guessed = true;
      sup1.set(5);
      sup1.input.disabled = false;
    },
  });
  f.controls.append(q.node, sup1.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Watts and watt-hours: how long does a battery run a load?

const LOADS = [
  { name: 'LED lights', watts: 5 },
  { name: 'Water pump', watts: 20 },
  { name: 'Fridge', watts: 60 },
];

export const batteryTimeFigure = figure(['hours'], (_ctx, t) => {
  const f = frame(400, 200, 4);
  const draw = svg('g');
  f.svg.append(draw);
  let load = 1;
  let revealed = false;
  const row = el('div.chips');

  const paint = () => {
    const wh = 12 * 7;
    const w = LOADS[load].watts;
    const hours = wh / w;
    const amp = w / 12;
    // A battery as a tank, and a clock face with the hours it lasts filled in.
    const level = 1;
    draw.replaceChildren(
      svg('rect', { x: 40, y: 40, width: 110, height: 130, rx: 8, fill: COL.paper, stroke: COL.ink, 'stroke-width': 2 }),
      svg('rect', { x: 46, y: 46 + 118 * (1 - level), width: 98, height: 118 * level, rx: 4, fill: tint(COL.good, 0.35) }),
      svg('rect', { x: 70, y: 30, width: 18, height: 10, fill: COL.ink }),
      svg('rect', { x: 102, y: 30, width: 18, height: 10, fill: COL.ink }),
      small(95, 100, '12 V', { anchor: 'middle', bold: true }),
      small(95, 116, '7 Ah', { anchor: 'middle', bold: true }),
      small(95, 135, '= 84 Wh', { anchor: 'middle', soft: true }),
      small(270, 40, `${LOADS[load].name}: ${w} W`, { anchor: 'middle', bold: true }),
      small(270, 56, `draws ${amps(amp)} at 12 V`, { anchor: 'middle', soft: true }),
      ...(revealed ? hoursBar(hours) : [small(270, 120, '?', { anchor: 'middle', bold: true, attrs: { 'font-size': 40 } })]),
    );
    row.replaceChildren(...LOADS.map((l, k) => el('button.chip', { type: 'button', className: k === load ? 'chip on' : 'chip', disabled: !revealed, onclick: () => { load = k; paint(); } }, l.name)));
    f.readout.textContent = !revealed
      ? 'The battery is labelled 12 V and 7 Ah. How long will it run the 20 W pump?'
      : `${q.reply()} 12 V x 7 Ah is 84 watt-hours of stored energy. A ${w} W load runs for 84 / ${w} = ${hours.toFixed(1)} hours. Watts measure the rate of energy use, while watt-hours measure the total energy stored.`;
  };
  const hoursBar = (h: number) => {
    const out: SVGElement[] = [];
    for (let k = 0; k < 24; k++) {
      const x = 190 + (k % 12) * 14;
      const y = 85 + Math.floor(k / 12) * 26;
      const fill = k + 1 <= h ? 1 : k < h ? h - k : 0;
      out.push(svg('rect', { x, y, width: 11, height: 20, rx: 2, fill: COL.paper, stroke: COL.soft, 'stroke-width': 1 }));
      if (fill > 0) out.push(svg('rect', { x, y: y + 20 * (1 - fill), width: 11, height: 20 * fill, rx: 2, fill: COL.current }));
    }
    out.push(small(270, 150, `${h.toFixed(1)} hours${h > 24 ? ' (more than a day)' : ''}`, { anchor: 'middle', bold: true }));
    return out;
  };
  const q = guess({
    question: 'How long will it run the 20 W pump?',
    options: ['About 4 hours', 'About 7 hours', 'About 20 hours'],
    answer: 0,
    replies: [
      'Correct.',
      'A 7 Ah battery runs a 1 A load for 7 hours, whereas this 20 W pump draws about 1.67 A at 12 V.',
      'That confuses power in watts with running time. The battery holds 84 Wh of energy, and a 20 W pump uses 20 Wh each hour.',
    ],
    onLock: () => {
      revealed = true;
      paint();
      t.done();
    },
  });
  f.controls.append(q.node, row);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A pump 20 m from the battery: choose the cable, or raise the voltage.

const GAUGES = [0.5, 1.5, 2.5, 4, 6, 10];
/** Copper's resistance, ohms for a metre of 1 mm². */
const COPPER = 0.0172;
/** Cost a metre of twin cable, by cross-section, roughly, for the stars. */
const COST: Record<number, number> = { 0.5: 0.4, 1.5: 0.9, 2.5: 1.4, 4: 2.2, 6: 3.2, 10: 5.5 };

export const longWireFigure = figure(['pump'], (ctx, t) => {
  const f = frame(400, 230, 4);
  let gauge = 0.5;
  let system = 12;
  const SEGS = 4;
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 12, ohms: 0.02 };
  const pump = { id: 'pump', kind: 'load' as const, a: 'p-in', b: 'p-out', watts: 60, min: 10 };
  const out: Wire[] = [];
  const back: Wire[] = [];
  for (let k = 0; k < SEGS; k++) {
    out.push(wire(`o${k}`, k ? `o${k}` : 'top', k === SEGS - 1 ? 'p-in' : `o${k + 1}`, 1));
    back.push(wire(`b${k}`, k ? `b${k}` : 'p-out', k === SEGS - 1 ? 'gnd' : `b${k + 1}`, 1));
  }
  const parts: Part[] = [bat, ...out, pump, ...back];
  // The cable runs out along the top in four stretches and back along the bottom in four, so its colour fades as it drops.
  const xs = [135, 200, 265];
  const places: Placement[] = [
    { part: bat, path: [[40, 90], [40, 150]] },
    { part: out[0], path: [[40, 90], [40, 40], [xs[0], 40]] },
    { part: out[1], path: [[xs[0], 40], [xs[1], 40]] },
    { part: out[2], path: [[xs[1], 40], [xs[2], 40]] },
    { part: out[3], path: [[xs[2], 40], [330, 40], [330, 75]] },
    { part: pump, path: [[330, 75], [330, 155]], tag: 'Pump', tagSide: 'left' },
    { part: back[0], path: [[330, 155], [330, 200], [xs[2], 200]] },
    { part: back[1], path: [[xs[2], 200], [xs[1], 200]] },
    { part: back[2], path: [[xs[1], 200], [xs[0], 200]] },
    { part: back[3], path: [[xs[0], 200], [40, 200], [40, 150]] },
  ];
  const sch: Schematic = schematic(ctx, places, { topVolts: 48, typicalAmps: 2, grounds: [[40, 200]] });
  const face = meterFace(150, 95, 86);
  const batTag = small(56, 124, '', { bold: true });
  f.svg.append(sch.node, face.node, batTag, small(200, 30, '<- 20 m of twin cable ->', { anchor: 'middle', soft: true }));
  const earned = el('div');
  let done = false;

  const gaugeRow = el('div.chips');
  const voltRow = el('div.chips');
  const paint = () => {
    bat.volts = system;
    pump.min = system * (10 / 12);
    const each = (COPPER * 20) / gauge / SEGS;
    for (const w of [...out, ...back]) w.ohms = each;
    const s: Solution = solve(parts);
    sch.show(s);
    // The colours run to the system voltage, so 12 V and 48 V both read from blue to orange.
    const vPump = s.v['p-in'] - s.v['p-out'];
    const runs = vPump >= pump.min;
    const drop = (system - vPump) / system;
    batTag.textContent = `${system} V`;
    face.show(vPump.toFixed(1), 'V', 'V at pump');
    const i = s.i.pump;
    const lost = i * i * each * SEGS * 2;
    gaugeRow.replaceChildren(...GAUGES.map((g) => el('button.chip', { type: 'button', className: g === gauge ? 'chip on' : 'chip', onclick: () => { gauge = g; paint(); } }, `${g} mm²`)));
    voltRow.replaceChildren(...[12, 24, 48].map((v) => el('button.chip', { type: 'button', className: v === system ? 'chip on' : 'chip', onclick: () => { system = v; paint(); } }, `${v} V system`)));
    f.readout.textContent = runs
      ? `The pump receives ${volts(vPump)}, which is ${Math.round(drop * 100)}% below the battery voltage, and draws ${amps(i)}. The cable turns ${watts(lost)} into heat along the way.`
      : `The pump stalls because it receives only ${volts(vPump)}. The thin cable acts as unwanted series resistance, and ${amps(i)} flowing through it drops the remaining voltage.`;
    const ok = runs && drop <= 0.03;
    if (ok && !done) {
      done = true;
      earned.replaceChildren(stars([
        { text: 'The pump gets within 3% of the battery voltage', got: true },
        { text: `The cable costs under £40 (this one about £${Math.round(COST[gauge] * 20)})`, got: COST[gauge] * 20 < 40 },
        { text: 'Under 2 W lost in the cable', got: lost < 2 },
      ]));
      t.done();
    }
  };
  f.controls.append(gaugeRow, voltRow, earned);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A fuse protects the wire: pick the rating, then test it.

type Trouble = 'normal' | 'jammed' | 'short';
const FUSES = [5, 15, 30, 60];

export const fuseFigure = figure(['protect'], (ctx, t) => {
  const f = frame(400, 230, 4);
  let rating = 60;
  let trouble: Trouble = 'normal';
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 12, ohms: 0.02 };
  const fuse: Extract<Part, { kind: 'fuse' }> = { id: 'fuse', kind: 'fuse', a: 'f-in', b: 'f-out', amps: 60, blown: false };
  const run = wire('run', 'f-out', 'm-in', 0.03);
  const motor = { id: 'motor', kind: 'resistor' as const, a: 'm-in', b: 'm-out', ohms: 1.5 };
  const w1 = wire('w1', 'top', 'f-in');
  const back = wire('back', 'm-out', 'gnd', 0.03);
  const parts: Part[] = [bat, w1, fuse, run, motor, back];
  const glow = heatGlow(140, 28, 200, 12);
  const sch = schematic(ctx, [
    { part: bat, path: [[40, 90], [40, 150]], tag: '12 V', tagSide: 'left' },
    { part: w1, path: [[40, 90], [40, 34], [60, 34]] },
    { part: fuse, path: [[60, 34], [130, 34]], tag: 'Fuse', tagSide: 'left' },
    { part: run, path: [[130, 34], [340, 34], [340, 80]] },
    { part: motor, path: [[340, 80], [340, 160]], tag: 'Motor', tagSide: 'left' },
    { part: back, path: [[340, 160], [340, 200], [40, 200], [40, 150]] },
  ], { topVolts: 12, typicalAmps: 8, grounds: [[40, 200]] });
  f.svg.append(glow.node, sch.node, small(235, 52, 'cable rated 20 A', { anchor: 'middle', soft: true }));
  const verdicts: Partial<Record<Trouble, boolean>> = {};
  const fuseRow = el('div.chips');
  const troubleRow = el('div.chips');

  const paint = () => {
    fuse.amps = rating;
    fuse.blown = false;
    motor.ohms = trouble === 'normal' ? 1.5 : trouble === 'jammed' ? 0.45 : 0.001;
    let s = solve(parts);
    const surge = Math.abs(s.i.fuse);
    const blows = surge > rating;
    if (blows) {
      fuse.blown = true;
      s = solve(parts);
    }
    sch.show(s);
    const cableHot = !blows && surge > 20;
    glow.set(cableHot ? Math.min(1.3, surge / 20 - 0.3) : 0);
    // Good: holds in normal use, blows before the cable overheats otherwise.
    const good = trouble === 'normal' ? !blows : blows;
    verdicts[trouble] = good;
    fuseRow.replaceChildren(...FUSES.map((a) => el('button.chip', { type: 'button', className: a === rating ? 'chip on' : 'chip', onclick: () => { rating = a; for (const k of Object.keys(verdicts)) delete verdicts[k as Trouble]; paint(); } }, `${a} A fuse`)));
    troubleRow.replaceChildren(...(['normal', 'jammed', 'short'] as const).map((k) => el('button.chip', { type: 'button', className: k === trouble ? 'chip on' : 'chip', onclick: () => { trouble = k; paint(); } }, { normal: 'Running', jammed: 'Motor jams', short: 'Cable shorts' }[k])));
    const what = trouble === 'normal' ? 'Running normally' : trouble === 'jammed' ? 'With the motor jammed' : 'With the cable shorted';
    f.readout.textContent =
      `${what}, ${amps(surge)} would flow. ` +
      (blows
        ? trouble === 'normal' ? `The ${rating} A fuse blows during normal operation because its rating is below the motor's running current.` : `The ${rating} A fuse blows quickly and protects the 20 A cable from overheating.`
        : cableHot ? `The ${rating} A fuse fails to blow in time, allowing the 20 A cable to overheat and melt its insulation. Always pick a fuse rated at or below the cable's ampacity.` : `The ${rating} A fuse holds steady under normal load.`) +
      ' Test all three operating conditions.';
    if (verdicts.normal && verdicts.jammed && verdicts.short) t.done();
  };
  f.controls.append(fuseRow, troubleRow);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The matched load: the most power out of a source, and half of it wasted.

export const matchingFigure = figure(['peak'], (ctx, t) => {
  const f = frame(400, 230, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 12, ohms: 4 };
  const load = { id: 'load', kind: 'resistor' as const, a: 'l-in', b: 'l-out', ohms: 1 };
  const w1 = wire('w1', 'top', 'l-in');
  const w2 = wire('w2', 'l-out', 'gnd');
  const parts: Part[] = [bat, w1, load, w2];
  const sch = schematic(ctx, [
    { part: bat, path: [[40, 90], [40, 150]], tag: '12 V', tagSide: 'left' },
    { part: w1, path: [[40, 90], [40, 40], [140, 40], [140, 80]] },
    { part: load, path: [[140, 80], [140, 160]], tag: 'Load', tagSide: 'left' },
    { part: w2, path: [[140, 160], [140, 200], [40, 200], [40, 150]] },
  ], { topVolts: 12, typicalAmps: 1.5, grounds: [[40, 200]] });
  const X0 = 200;
  const X1 = 385;
  const Y0 = 200;
  const Y1 = 30;
  const RMAX = 20;
  const px = (r: number) => X0 + (r / RMAX) * (X1 - X0);
  const py = (p: number) => Y0 - (p / 10) * (Y0 - Y1);
  const curve: P[] = [];
  const eff: P[] = [];
  for (let r = 0.2; r <= RMAX; r += 0.2) {
    curve.push([px(r), py((144 * r) / ((r + 4) * (r + 4)))]);
    eff.push([px(r), Y0 - (r / (r + 4)) * (Y0 - Y1)]);
  }
  const cursor = svg('circle', { r: 5, fill: COL.power, stroke: COL.ink, 'stroke-width': 1 });
  f.svg.append(
    sch.node,
    small(56, 140, '4 Ω inside', { soft: true }),
    line(X0, Y0, X1, Y0, COL.ink, 1.4),
    line(X0, Y0, X0, Y1, COL.ink, 1.4),
    svg('polyline', { points: curve.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.power, 'stroke-width': 2 }),
    svg('polyline', { points: eff.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.good, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }),
    small(X1, Y0 + 14, 'load ohms, to 20', { anchor: 'end', soft: true }),
    small(X0 + 6, Y1 - 6, 'watts into the load', { fill: COL.power }),
    small(X1, Y1 + 30, 'share that is not wasted', { anchor: 'end', fill: COL.good }),
    cursor,
  );
  let atPeak = false;
  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    const pLoad = s.p.load;
    // Everything the source makes: its full 12 V times the current, some lost inside before it reaches the terminals.
    const pAll = bat.volts * s.i.load;
    cursor.setAttribute('cx', px(load.ohms).toFixed(1));
    cursor.setAttribute('cy', py(pLoad).toFixed(1));
    if (Math.abs(load.ohms - 4) < 0.26) atPeak = true;
    f.readout.textContent =
      `${watts(pLoad)} reaches the load and ${watts(pAll - pLoad)} turns into heat inside the source, so ${Math.round((pLoad / pAll) * 100)}% of the total energy does useful work. ` +
      (Math.abs(load.ohms - 4) < 0.26
        ? 'Matching the 4 Ω load to the 4 Ω internal resistance extracts the maximum possible power, at the cost of burning half the total energy inside the source. For a battery bank or power grid, losing 50% as internal heat is intolerable.'
        : 'Find the load that gets the most power.');
    if (atPeak) t.done();
  };
  f.controls.append(slider('Load', 0.5, 20, 0.25, 1, (x) => ohms(x), (x) => { load.ohms = x; paint(); }, 'resistance').node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The fault: a dim lamp, and a joint that has gone bad.

export const badJointFigure = figure(['find'], (ctx, t) => {
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 12, ohms: 0.02 };
  const lamp = { id: 'lamp', kind: 'lamp' as const, a: 'l-in', b: 'l-out', ohms: 6, rated: 12 };
  const w1 = wire('w1', 'top', 'sw');
  const joint = wire('joint', 'sw', 'run', 6);
  const run = wire('run', 'run', 'l-in', 0.05);
  const back = wire('back', 'l-out', 'gnd', 0.05);
  const parts: Part[] = [bat, w1, joint, run, lamp, back];
  return hunt(ctx, t, {
    parts,
    places: [
      { part: bat, path: [[50, 95], [50, 155]], tag: '12 V', tagSide: 'left' },
      { part: w1, path: [[50, 95], [50, 40], [130, 40]] },
      { part: joint, path: [[130, 40], [190, 40]] },
      { part: run, path: [[190, 40], [300, 40], [300, 85]] },
      { part: lamp, path: [[300, 85], [300, 165]], tag: '24 W', tagSide: 'right' },
      { part: back, path: [[300, 165], [300, 205], [50, 205], [50, 155]] },
    ],
    schematic: { topVolts: 12, typicalAmps: 1, grounds: [[50, 205]] },
    size: [400, 240],
    face: [120, 90],
    brief: 'A 12 V lamp at the end of a cable, glowing dull orange.',
    culprit: 'joint',
    found: 'You found the fault: the crimp connector near the battery has developed high resistance. When current flows, a loose or corroded joint drops voltage that should reach the lamp and turns that lost power into concentrated heat right inside the connector, which can melt the housing.',
    hints: ['A sound wire or tight crimp drops almost no voltage. Probe across short sections of the circuit one at a time while the lamp is on.', 'The bad stretch is near the battery.'],
    par: 6,
  });
});
