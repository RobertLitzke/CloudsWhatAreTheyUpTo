// Lesson 3, every source has a resistor inside: a voltage divider, a pot,
// the divider sagging under load, a box to measure and model, and a resistor
// that isn't what its bands said.

import { el, svg } from 'didactics/dom';
import { line, small } from 'didactics/draw';
import { e12, type Junction, type Part } from 'circuit-kit/parts';
import { solve } from 'circuit-kit/solve';
import { wire } from '../circuit/build';
import { schematic, type Placement } from '../circuit/schematic';
import { amps, ohms, volts } from '../circuit/units';
import { hunt } from './bench';
import { meterFace, stars } from './guess';
import { COL, figure, frame, slider } from './kit';

/** A divider drawn upright from + at the top to ground: R1 above the output, R2 below it. */
function dividerCircuit(r1: Extract<Part, { kind: 'resistor' }>, r2: Extract<Part, { kind: 'resistor' }>, extra: { parts: Part[]; places: Placement[] } = { parts: [], places: [] }, tags: [string, string] = ['R1', 'R2']) {
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const w1 = wire('w1', 'top', r1.a);
  const mid = wire('mid', r1.b, r2.a);
  const w2 = wire('w2', r2.b, 'gnd');
  const parts: Part[] = [bat, w1, r1, mid, r2, w2, ...extra.parts];
  const places: Placement[] = [
    { part: bat, path: [[50, 95], [50, 155]], tag: '9 V', tagSide: 'left' },
    { part: w1, path: [[50, 95], [50, 25], [150, 25], [150, 40]] },
    { part: r1, path: [[150, 40], [150, 110]], tag: tags[0], tagSide: 'left' },
    { part: mid, path: [[150, 110], [150, 125]] },
    { part: r2, path: [[150, 125], [150, 195]], tag: tags[1], tagSide: 'left' },
    { part: w2, path: [[150, 195], [150, 215], [50, 215], [50, 155]] },
    ...extra.places,
  ];
  return { bat, parts, places };
}

// ---------------------------------------------------------------------------
// Make 3 V from 9 V with two resistors.

export const dividerFigure = figure(['three'], (ctx, t) => {
  const f = frame(400, 240, 3);
  const values = e12(100, 10000);
  const r1 = { id: 'r1', kind: 'resistor' as const, a: 'r1-top', b: 'out', ohms: 1000 };
  const r2 = { id: 'r2', kind: 'resistor' as const, a: 'out2', b: 'r2-bot', ohms: 1000 };
  const { parts, places } = dividerCircuit(r1, r2);
  const tap = wire('tap', 'out', 'out-pin');
  const sch = schematic(ctx, [...places, { part: tap, path: [[150, 117], [230, 117]] }], { topVolts: 9, typicalAmps: 0.003, grounds: [[50, 215]] });
  parts.push(tap);
  const face = meterFace(250, 92, 86);
  f.svg.append(sch.node, face.node, small(228, 110, 'out', { anchor: 'end', soft: true }));

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    const v = s.v.out;
    face.show(v.toFixed(2), 'V', 'V');
    const ok = Math.abs(v - 3) < 0.09;
    f.readout.textContent = `R1 drops ${volts(9 - v)} and R2 drops ${volts(v)}: they split the 9 V in the ratio of their resistances. ` + (ok ? 'The output is within 3% of 3 V.' : 'Get the output to 3 V, within 3%.');
    if (ok) t.done();
  };
  f.controls.append(
    slider('R1', { steps: values, value: 1000, show: ohms, onInput: (r) => { r1.ohms = r; paint(); }, color: 'resistance' }).node,
    slider('R2', { steps: values, value: 1000, show: ohms, onInput: (r) => { r2.ohms = r; paint(); }, color: 'resistance' }).node,
  );
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// A pot: a divider whose tap slides.

export const potFigure = figure(['half'], (ctx, t) => {
  const f = frame(400, 240, 3);
  const total = 10000;
  const top = { id: 'top-half', kind: 'resistor' as const, a: 'p-top', b: 'wiper', ohms: total / 4 };
  const bottom = { id: 'bottom-half', kind: 'resistor' as const, a: 'wiper2', b: 'p-bot', ohms: (total * 3) / 4 };
  const { parts, places } = dividerCircuit(top, bottom, undefined, ['', '']);
  const tap = wire('tap', 'wiper', 'wiper-pin');
  parts.push(tap);
  const sch = schematic(ctx, [...places, { part: tap, path: [[150, 117], [230, 117]] }], { topVolts: 9, typicalAmps: 0.0009, grounds: [[50, 215]] });
  const face = meterFace(250, 92, 86);
  f.svg.append(sch.node, face.node, small(228, 110, 'wiper', { anchor: 'end', soft: true }), small(166, 60, '10 kΩ pot', { bold: true }));

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    const v = s.v.wiper;
    face.show(v.toFixed(2), 'V', 'V');
    const ok = Math.abs(v - 4.5) < 0.1;
    f.readout.textContent = `The wiper splits the track into ${ohms(top.ohms)} above it and ${ohms(bottom.ohms)} below. ` + (ok ? 'Half of 9 V: the reference voltage a single-battery pedal runs its signal around.' : 'Turn it to give half the battery voltage.');
    if (ok) t.done();
  };
  f.controls.append(
    slider('Turn', 1, 99, 1, 25, (k) => `${k}%`, (k) => { top.ohms = (total * k) / 100; bottom.ohms = (total * (100 - k)) / 100; paint(); }, 'resistance').node,
  );
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// 3 V that holds up under load: the divider sags, and stiffer is costlier.

export const sagFigure = figure(['stiff'], (ctx, t) => {
  const f = frame(400, 240, 4);
  const values = e12(100, 10000);
  const r1 = { id: 'r1', kind: 'resistor' as const, a: 'r1-top', b: 'out', ohms: 6800 };
  const r2 = { id: 'r2', kind: 'resistor' as const, a: 'out2', b: 'r2-bot', ohms: 3300 };
  const sw = { id: 'sw', kind: 'switch' as const, a: 'out', b: 'load-in', closed: false };
  const load = { id: 'load', kind: 'resistor' as const, a: 'load-in', b: 'load-out', ohms: 4700 };
  const back = wire('back', 'load-out', 'gnd');
  const { parts, places } = dividerCircuit(r1, r2, {
    parts: [sw, load, back],
    places: [
      { part: sw, path: [[150, 117], [260, 117], [260, 125]], tag: 'Load', tagSide: 'left' },
      { part: load, path: [[260, 125], [260, 195]], tag: '4.7 kΩ', tagSide: 'right' },
      { part: back, path: [[260, 195], [260, 215], [150, 215]] },
    ],
  });
  const sch = schematic(ctx, places, {
    topVolts: 9,
    typicalAmps: 0.002,
    grounds: [[50, 215]],
    onToggle: () => {
      sw.closed = !sw.closed;
      paint();
    },
  });
  f.svg.append(sch.node);
  const earned = el('div');
  let done = false;

  const paint = () => {
    const was = sw.closed;
    sw.closed = false;
    const open = solve(parts);
    sw.closed = true;
    const loaded = solve(parts);
    sw.closed = was;
    sch.show(was ? loaded : open);
    const vOpen = open.v.out;
    const vLoad = loaded.v.out;
    const draw = Math.abs(loaded.i.bat);
    const ok = vOpen > 2.85 && vOpen < 3.15 && vLoad >= 2.8;
    f.readout.textContent =
      `Unloaded: ${volts(vOpen)}. With the 4.7 kΩ load on: ${volts(vLoad)} (${vOpen - vLoad > 0.05 ? `a sag of ${volts(vOpen - vLoad)}` : 'hardly any sag'}). ` +
      `The divider draws ${amps(draw)} from the battery. ` +
      (ok ? 'The output holds above 2.8 V under load.' : 'Make about 3 V that stays at 2.8 V or more with the load on. Tap the switch to try the load.');
    if (ok && !done) {
      done = true;
      earned.replaceChildren(stars([
        { text: 'Holds at 2.8 V or more under load', got: true },
        { text: `Draws under 10 mA from the battery (${amps(draw)})`, got: draw < 0.01 },
        { text: 'Sags less than 10%', got: (vOpen - vLoad) / vOpen < 0.1 },
      ]));
      t.done();
    }
  };
  f.controls.append(
    slider('R1', { steps: values, value: 6800, show: ohms, onInput: (r) => { r1.ohms = r; paint(); }, color: 'resistance' }).node,
    slider('R2', { steps: values, value: 3300, show: ohms, onInput: (r) => { r2.ohms = r; paint(); }, color: 'resistance' }).node,
    earned,
  );
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The mystery box: measure it open, shorted and loaded, and say what is inside.

/** A small solar panel as one diode: 18 cells in series, a light-made current in parallel with their junctions. */
const PANEL: Junction = { is: 1e-9, n: 1.3 * 18, ohms: 0.2, eg: 1.12 };

interface Box {
  name: string;
  inside: (a: string, b: string) => Part[];
  /** A straight-line model fits: the volts and ohms inside, or null for the panel. */
  truth: { volts: number; ohms: number } | null;
}

const BOXES: Box[] = [
  { name: 'Box 1', truth: { volts: 9, ohms: 20 }, inside: (a, b) => [{ id: 'src', kind: 'source', a, b, volts: 9, ohms: 20 }] },
  { name: 'Box 2', truth: { volts: 12, ohms: 150 }, inside: (a, b) => [{ id: 'src', kind: 'source', a, b, volts: 12, ohms: 150 }] },
  {
    name: 'Box 3',
    truth: null,
    inside: (a, b) => [
      { id: 'light', kind: 'current', a: b, b: a, amps: 1 },
      { id: 'cells', kind: 'diode', a, b, model: PANEL },
    ],
  },
];

type Hookup = 'open' | 'short' | 'load';

export const mysteryBoxFigure = figure(['inside'], (_ctx, t) => {
  const f = frame(400, 250, 4);
  let box = 0;
  let hookup: Hookup = 'open';
  let loadOhms = 100;
  const solvedBoxes = new Set<number>();
  const points: [number, number][][] = BOXES.map(() => []);
  const face = meterFace(16, 16, 92);

  // The plot: amps out along, volts at the terminals up.
  const X0 = 190;
  const X1 = 385;
  const Y0 = 220;
  const Y1 = 30;
  const scale = () => (box === 0 ? { v: 10, i: 0.5 } : box === 1 ? { v: 14, i: 0.1 } : { v: 14, i: 1.2 });
  const plot = svg('g');
  f.svg.append(face.node, plot);
  // The box itself, drawn as a box with two terminals.
  const drawn = svg('g', {},
    svg('rect', { x: 30, y: 105, width: 90, height: 80, rx: 6, fill: COL.ink }),
    svg('circle', { cx: 120, cy: 125, r: 5, fill: '#d23b2a' }),
    svg('circle', { cx: 120, cy: 165, r: 5, fill: COL.paper, stroke: COL.ink }),
  );
  const boxName = small(75, 150, '', { anchor: 'middle', fill: COL.paper, bold: true });
  const hookupLine = svg('g');
  f.svg.append(drawn, boxName, hookupLine);

  const measure = () => {
    const inside = BOXES[box].inside('p', 'gnd');
    const outside: Part[] = hookup === 'open' ? [] : [{ id: 'ext', kind: 'resistor', a: 'p', b: 'gnd', ohms: hookup === 'short' ? 0.001 : loadOhms }];
    const s = solve([...inside, ...outside]);
    const v = s.v.p;
    const i = hookup === 'open' ? 0 : s.i.ext;
    return { v, i };
  };

  const modelV = slider('Inside: volts', 0, 15, 0.1, 5, (x) => volts(x), () => paint(), 'voltage');
  const modelR = slider('Inside: ohms', 1, 300, 1, 50, (x) => ohms(x), () => paint(), 'resistance');
  const loads = e12(1, 1000);
  const loadSlider = slider('Load', { steps: loads, value: loadOhms, show: ohms, onInput: (r) => { loadOhms = r; hookup = 'load'; paint(); }, color: 'resistance' });
  const boxRow = el('div.chips');
  const hookRow = el('div.chips');

  const paint = () => {
    const { v, i } = measure();
    const sc = scale();
    const key = points[box].some(([pv, pi]) => Math.abs(pv - v) < sc.v / 100 && Math.abs(pi - i) < sc.i / 100);
    if (!key) points[box].push([v, i]);
    face.show(hookup === 'short' ? (i * 1000).toFixed(0) : v.toFixed(2), hookup === 'short' ? 'mA' : 'V', hookup === 'short' ? 'A' : 'V');
    boxName.textContent = BOXES[box].name;
    hookupLine.replaceChildren(
      hookup === 'open' ? small(75, 205, 'open: just the meter', { soft: true, anchor: 'middle' })
        : hookup === 'short' ? small(75, 205, 'shorted through the meter', { soft: true, anchor: 'middle' })
          : small(75, 205, `loaded with ${ohms(loadOhms)}`, { soft: true, anchor: 'middle' }),
    );

    const px = (x: number) => X0 + (x / sc.i) * (X1 - X0);
    const py = (y: number) => Y0 - (y / sc.v) * (Y0 - Y1);
    const mv = modelV.value();
    const mr = modelR.value();
    // The model's line, from open-circuit volts down to its short-circuit current.
    const iEnd = Math.min(sc.i, mv / mr);
    plot.replaceChildren(
      line(X0, Y0, X1, Y0, COL.ink, 1.4),
      line(X0, Y0, X0, Y1, COL.ink, 1.4),
      small(X1, Y0 + 14, `amps out, to ${sc.i} A`, { anchor: 'end', soft: true }),
      small(X0 + 4, Y1 - 8, `volts, to ${sc.v} V`, { soft: true }),
      svg('line', { x1: px(0), y1: py(mv), x2: px(iEnd), y2: py(mv - iEnd * mr), stroke: COL.resistance, 'stroke-width': 2, 'stroke-dasharray': '5 4' }),
      ...points[box].map(([pv, pi]) => svg('circle', { cx: px(pi), cy: py(pv), r: 3.4, fill: COL.current, stroke: COL.ink, 'stroke-width': 0.7 })),
    );

    const truth = BOXES[box].truth;
    const fits = truth && Math.abs(mv - truth.volts) / truth.volts < 0.05 && Math.abs(mr - truth.ohms) / truth.ohms < 0.05;
    if (fits) solvedBoxes.add(box);
    boxRow.replaceChildren(...BOXES.map((b, k) => el('button.chip', { type: 'button', className: k === box ? 'chip on' : 'chip', onclick: () => { box = k; hookup = 'open'; paint(); } }, solvedBoxes.has(k) ? `${b.name} ✓` : b.name)));
    hookRow.replaceChildren(...(['open', 'short', 'load'] as const).map((h) => el('button.chip', { type: 'button', className: h === hookup ? 'chip on' : 'chip', onclick: () => { hookup = h; paint(); } }, { open: 'Leave it open', short: 'Short it', load: 'Load it' }[h])));

    const here = hookup === 'open' ? `Open, it gives ${volts(v)}.` : hookup === 'short' ? `Shorted, ${amps(i)} flows.` : `Into ${ohms(loadOhms)} it gives ${volts(v)} and ${amps(i)}.`;
    if (!truth) {
      f.readout.textContent = points[box].length < 4
        ? `${here} Measure this one open, shorted and at a few loads.`
        : `${here} No straight line goes through these points. Box 3 is a small solar panel: it holds its voltage until the current nears its limit, then collapses. It behaves much more like a current source than a voltage behind a resistor.`;
      if (points[box].length >= 4 && solvedBoxes.size >= 1) t.done();
      return;
    }
    f.readout.textContent = fits
      ? `${here} Your model fits: inside is ${volts(truth.volts)} behind ${ohms(truth.ohms)}. Open, nothing flows, so all of it shows; shorted, the inside resistance is all that limits the current.`
      : `${here} Set your model of what is inside so its dashed line runs through the points. Open-circuit volts and short-circuit current are the two ends of the line.`;
  };
  f.controls.append(boxRow, hookRow, loadSlider.node, modelV.node, modelR.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The fault: three resistors that should split 9 V equally, and don't.

export const wrongValueFigure = figure(['find'], (ctx, t) => {
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const rs = [1000, 1000, 470].map((r, k) => ({ id: `r${k + 1}`, kind: 'resistor' as const, a: `r${k + 1}a`, b: `r${k + 1}b`, ohms: r }));
  const ws = [wire('w0', 'top', 'r1a'), wire('w1', 'r1b', 'r2a'), wire('w2', 'r2b', 'r3a'), wire('w3', 'r3b', 'gnd')];
  const parts: Part[] = [bat, ...ws, ...rs];
  return hunt(ctx, t, {
    parts,
    places: [
      { part: bat, path: [[50, 95], [50, 155]], tag: '9 V', tagSide: 'left' },
      { part: ws[0], path: [[50, 95], [50, 30], [80, 30]] },
      { part: rs[0], path: [[80, 30], [180, 30]], tag: 'R1 1 kΩ', tagSide: 'left' },
      { part: ws[1], path: [[180, 30], [250, 30], [250, 60]] },
      { part: rs[1], path: [[250, 60], [250, 150]], tag: 'R2 1 kΩ', tagSide: 'right' },
      { part: ws[2], path: [[250, 150], [250, 205], [200, 205]] },
      { part: rs[2], path: [[200, 205], [100, 205]], tag: 'R3 1 kΩ', tagSide: 'right' },
      { part: ws[3], path: [[100, 205], [50, 205], [50, 155]] },
    ],
    schematic: { topVolts: 9, typicalAmps: 0.003, grounds: [[50, 205]] },
    size: [400, 240],
    face: [290, 70],
    brief: 'Three 1 kΩ resistors in series should each drop 3 V, so one of these parts has the wrong value.',
    culprit: 'r3',
    found: 'Found it: R3 drops half what the others do, so it has about half their resistance. It is a 470 Ω, yellow-violet-brown, fitted where a 1 kΩ, brown-black-red, should be.',
    hints: [
      'Measure across each resistor in turn. In series they share one current, so each one\'s drop is in proportion to its resistance.',
      'Only one resistor is wrong, so look for the voltage drop that differs from the other two.',
    ],
    par: 6,
  });
});
