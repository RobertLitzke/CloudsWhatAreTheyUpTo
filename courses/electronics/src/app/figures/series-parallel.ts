// Lesson 2, series and parallel: a second bulb beside the first (does the
// first dim?), currents adding at a junction, three bulbs to rank, cells
// stacked and side by side, and a broken wire to find.

import { el, svg } from 'didactics/dom';
import { e12, type Part } from 'circuit-kit/parts';
import { solve } from 'circuit-kit/solve';
import { OPEN, wire } from '../circuit/build';
import { schematic, type Placement } from '../circuit/schematic';
import { amps, ohms, volts } from '../circuit/units';
import { hunt } from './bench';
import { guess, stars } from './guess';
import { figure, frame, slider } from './kit';

// ---------------------------------------------------------------------------
// A second bulb beside the first.

export const parallelBulbsFigure = figure(['reveal'], (ctx, t) => {
  const f = frame(400, 240, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9, ohms: 0.3 };
  const A = { id: 'A', kind: 'lamp' as const, a: 'a-in', b: 'a-out', ohms: 30, rated: 9 };
  const B = { id: 'B', kind: 'lamp' as const, a: 'b-in', b: 'b-out', ohms: 30, rated: 9 };
  const sw = { id: 'sw', kind: 'switch' as const, a: 'j1', b: 'b-in', closed: false };
  const parts: Part[] = [bat, wire('w1', 'top', 'j1'), wire('wa1', 'j1', 'a-in'), A, wire('wa2', 'a-out', 'j2'), sw, B, wire('wb2', 'b-out', 'j2'), wire('w2', 'j2', 'gnd')];
  const w = (id: string) => parts.find((p) => p.id === id) as ReturnType<typeof wire>;
  let revealed = false;
  const sch = schematic(ctx, [
    { part: bat, path: [[50, 95], [50, 155]], tag: '9 V', tagSide: 'left' },
    { part: w('w1'), path: [[50, 95], [50, 40], [200, 40]] },
    { part: w('wa1'), path: [[200, 40], [200, 80]] },
    { part: A, path: [[200, 80], [200, 160]], tag: 'A', tagSide: 'left' },
    { part: w('wa2'), path: [[200, 160], [200, 205]] },
    { part: sw, path: [[200, 40], [320, 40], [320, 80]], tag: 'Switch', tagSide: 'left' },
    { part: B, path: [[320, 80], [320, 160]], tag: 'B', tagSide: 'left' },
    { part: w('wb2'), path: [[320, 160], [320, 205], [200, 205]] },
    { part: w('w2'), path: [[200, 205], [50, 205], [50, 155]] },
  ], {
    topVolts: 9,
    typicalAmps: 0.3,
    grounds: [[50, 205]],
    onToggle: () => {
      if (!revealed) return;
      sw.closed = !sw.closed;
      paint();
    },
  });
  f.svg.append(sch.node);

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    if (!revealed) {
      f.readout.textContent = 'Bulb A is lit. Closing the switch puts bulb B beside it, so each bulb has its own path from + to -.';
      return;
    }
    const battery = Math.abs(s.i.bat);
    f.readout.textContent = sw.closed
      ? `${q.reply()} Each bulb has the whole battery across it and takes ${amps(s.i.A)}. The battery now gives ${amps(battery)}, twice as much, because adding a parallel branch draws extra current from the battery while leaving the first bulb's current unchanged.`
      : `With the switch open, A takes ${amps(s.i.A)} and so does the battery. Close it again and watch the battery's wire.`;
  };
  const q = guess({
    question: 'Close the switch. What happens to bulb A?',
    options: ['It dims: the two share', 'It stays the same', 'It gets brighter'],
    answer: 1,
    replies: [
      'Most people guess that, expecting the two bulbs to split a fixed current. Because each bulb has its own direct path across the battery, each gets the full battery voltage and draws its full current.',
      'That is right for an ideal battery. A real battery\'s voltage sags slightly under the extra load, which lesson 3 covers.',
      'Bulb A already had the full battery voltage across it, so adding bulb B cannot give A any extra push.',
    ],
    onLock: () => {
      revealed = true;
      sw.closed = true;
      paint();
      t.done();
    },
  });
  f.controls.append(q.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Currents add at a junction: three branches, and a total to hit.

export const junctionFigure = figure(['target'], (ctx, t) => {
  const f = frame(400, 230, 4);
  const values = e12(100, 4700);
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const rs = [
    { id: 'r1', kind: 'resistor' as const, a: 'n1', b: 'm1', ohms: 1000 },
    { id: 'r2', kind: 'resistor' as const, a: 'n2', b: 'm2', ohms: 2200 },
    { id: 'r3', kind: 'resistor' as const, a: 'n3', b: 'm3', ohms: 4700 },
  ];
  const xs = [150, 250, 350];
  // The rails: a run of wire along the top and bottom between each branch, so each carries the branches beyond it.
  const feed = wire('feed', 'top', 'T0');
  const back = wire('back', 'B0', 'gnd');
  const rails: Part[] = [bat, feed, back];
  const railPlaces: Placement[] = [
    { part: bat, path: [[50, 95], [50, 155]], tag: '9 V', tagSide: 'left' },
    { part: feed, path: [[50, 95], [50, 40], [xs[0], 40]] },
    { part: back, path: [[xs[0], 205], [50, 205], [50, 155]] },
  ];
  rs.forEach((r, k) => {
    const x = xs[k];
    const up = wire(`up${k}`, `T${k}`, r.a);
    const down = wire(`dn${k}`, r.b, `B${k}`);
    rails.push(up, r, down);
    railPlaces.push(
      { part: up, path: [[x, 40], [x, 80]] },
      { part: r, path: [[x, 80], [x, 160]], tag: `R${k + 1}`, tagSide: 'left' },
      { part: down, path: [[x, 160], [x, 205]] },
    );
    if (k > 0) {
      const top = wire(`top${k}`, `T${k - 1}`, `T${k}`);
      const bot = wire(`bot${k}`, `B${k}`, `B${k - 1}`);
      rails.push(top, bot);
      railPlaces.push({ part: top, path: [[xs[k - 1], 40], [x, 40]] }, { part: bot, path: [[x, 205], [xs[k - 1], 205]] });
    }
  });
  const sch = schematic(ctx, railPlaces, { topVolts: 9, typicalAmps: 0.01, grounds: [[50, 205]] });
  f.svg.append(sch.node);
  const earned = el('div');
  let done = false;

  const paint = () => {
    const s = solve(rails);
    sch.show(s);
    const total = Math.abs(s.i.bat);
    const each = rs.map((r) => s.i[r.id]);
    const off = (total - 0.03) / 0.03;
    f.readout.textContent =
      `Into the junction: ${amps(total)}. Out of it: ${each.map((i) => amps(i)).join(' + ')}. ` +
      (Math.abs(off) < 0.05 ? 'Current is within 5% of 30 mA.' : `Set the resistors so the battery gives 30 mA in all.`);
    if (Math.abs(off) < 0.05 && !done) {
      done = true;
      const branchMax = Math.max(...each);
      earned.replaceChildren(stars([
        { text: '30 mA from the battery, within 5%', got: true },
        { text: 'Within 2%', got: Math.abs(off) < 0.02 },
        { text: 'No branch carrying more than 15 mA', got: branchMax <= 0.015 },
      ]));
      t.done();
    }
  };
  rs.forEach((r, k) =>
    f.controls.append(slider(`R${k + 1}`, { steps: values, value: r.ohms, show: ohms, onInput: (v) => { r.ohms = v; paint(); }, color: 'resistance' }).node),
  );
  f.controls.append(earned);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Rank three bulbs: A in line with B and C side by side. Then take C out.

export const rankingFigure = figure(['rank'], (ctx, t) => {
  const f = frame(400, 240, 4);
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const A = { id: 'A', kind: 'lamp' as const, a: 'a-in', b: 'j', ohms: 20 };
  const B = { id: 'B', kind: 'lamp' as const, a: 'b-in', b: 'b-out', ohms: 20 };
  const C = { id: 'C', kind: 'lamp' as const, a: 'c-in', b: 'c-out', ohms: 20 };
  const sw = { id: 'sw', kind: 'switch' as const, a: 'j', b: 'c-in', closed: true };
  const w1 = wire('w1', 'top', 'a-in');
  const wb1 = wire('wb1', 'j', 'b-in');
  const wb2 = wire('wb2', 'b-out', 'k');
  const wc2 = wire('wc2', 'c-out', 'k');
  const w2 = wire('w2', 'k', 'gnd');
  const parts: Part[] = [bat, w1, A, wb1, B, wb2, sw, C, wc2, w2];
  let stage = 0;
  const sch = schematic(ctx, [
    { part: bat, path: [[40, 95], [40, 155]], tag: '9 V', tagSide: 'left' },
    { part: w1, path: [[40, 95], [40, 40], [90, 40]] },
    { part: A, path: [[90, 40], [200, 40]], tag: 'A', tagSide: 'left' },
    { part: wb1, path: [[200, 40], [250, 40], [250, 85]] },
    { part: B, path: [[250, 85], [250, 165]], tag: 'B', tagSide: 'left' },
    { part: wb2, path: [[250, 165], [250, 205]] },
    { part: sw, path: [[250, 40], [350, 40], [350, 85]] },
    { part: C, path: [[350, 85], [350, 165]], tag: 'C', tagSide: 'left' },
    { part: wc2, path: [[350, 165], [350, 205], [250, 205]] },
    { part: w2, path: [[250, 205], [40, 205], [40, 155]] },
  ], { topVolts: 9, typicalAmps: 0.2, grounds: [[40, 205]] });
  f.svg.append(sch.node);
  sch.cover({ colour: true, dots: true, glow: true });

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    if (stage === 0) f.readout.textContent = 'All three bulbs are identical. All of the battery\'s current goes through A, and then splits equally between B and C. Rank them, brightest first.';
    else if (stage === 1)
      f.readout.textContent = `${first.reply()} A takes ${amps(s.i.A)}, which splits into ${amps(s.i.B)} through B and ${amps(s.i.C)} through C. Now the switch will take bulb C out.`;
    else
      f.readout.textContent = `${second.reply()} With C out, B and A are simply in series: ${amps(s.i.A)} through both. A dims from ${amps(0.3)} and B brightens from ${amps(0.15)}. Taking a bulb away made the circuit harder to push through, so less current flows from the battery.`;
  };
  const first = guess({
    question: 'Rank the bulbs, brightest first.',
    options: ['A, then B and C equal', 'All three equal', 'B and C, then A'],
    answer: 0,
    replies: ['That is right: A carries the full current while B and C split it.', 'They would be equally bright in a single series loop, but here A carries the combined current of B and C.', 'B and C share what comes through A, so each gets half of it.'],
    onLock: () => {
      stage = 1;
      sch.cover({});
      paint();
      second.node.style.display = '';
    },
  });
  const second = guess({
    question: 'Take bulb C out. What happens to A?',
    options: ['A gets brighter', 'A dims', 'A stays the same'],
    answer: 1,
    replies: ['It feels as though removing a bulb should leave more current for A, but taking away a parallel path raises the circuit\'s total resistance, so less current flows from the battery.', 'That is right: A dims, and B brightens because it no longer shares the current with C.', 'Everything in a circuit is joined up: change one branch and the rest changes too.'],
    onLock: () => {
      stage = 2;
      sw.closed = false;
      paint();
      t.done();
    },
  });
  second.node.style.display = 'none';
  f.controls.append(first.node, second.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Two cells: stacked, side by side, and side by side with one flat.

type Arrangement = 'series' | 'parallel' | 'mismatched';

export const cellsFigure = figure(['all'], (ctx, t) => {
  const f = frame(400, 230, 4);
  const holder = svg('g');
  f.svg.append(holder);
  const tried = new Set<Arrangement>();
  let mode: Arrangement = 'series';
  const lamp = { id: 'lamp', kind: 'lamp' as const, a: 'l-in', b: 'l-out', ohms: 10, rated: 3 };

  const build = (): { parts: Part[]; places: Placement[] } => {
    if (mode === 'series') {
      const c1 = { id: 'c1', kind: 'source' as const, a: 'top', b: 'mid', volts: 1.5, ohms: 0.3 };
      const c2 = { id: 'c2', kind: 'source' as const, a: 'mid', b: 'gnd', volts: 1.5, ohms: 0.3 };
      const w1 = wire('w1', 'top', 'l-in');
      const w2 = wire('w2', 'l-out', 'gnd');
      return {
        parts: [c1, c2, w1, lamp, w2],
        places: [
          { part: c1, path: [[70, 45], [70, 115]], tag: '1.5 V', tagSide: 'left' },
          { part: c2, path: [[70, 115], [70, 185]], tag: '1.5 V', tagSide: 'left' },
          { part: w1, path: [[70, 45], [70, 25], [300, 25], [300, 75]] },
          { part: lamp, path: [[300, 75], [300, 155]], tag: 'Lamp', tagSide: 'left' },
          { part: w2, path: [[300, 155], [300, 205], [70, 205], [70, 185]] },
        ],
      };
    }
    const flat = mode === 'mismatched';
    const c1 = { id: 'c1', kind: 'source' as const, a: 'p1', b: 'n1', volts: 1.5, ohms: 0.3 };
    const c2 = { id: 'c2', kind: 'source' as const, a: 'p2', b: 'n2', volts: flat ? 1.15 : 1.5, ohms: flat ? 0.6 : 0.3 };
    const ws = [wire('a1', 'p1', 'top'), wire('a2', 'p2', 'top'), wire('w1', 'top', 'l-in'), wire('w2', 'l-out', 'bot'), wire('b1', 'n1', 'bot'), wire('b2', 'n2', 'gnd'), wire('b3', 'bot', 'gnd')];
    const [a1, a2, w1, w2, b1, b2, b3] = ws;
    return {
      parts: [c1, c2, lamp, ...ws],
      places: [
        { part: c1, path: [[70, 80], [70, 150]], tag: '1.5 V', tagSide: 'left' },
        { part: c2, path: [[170, 80], [170, 150]], tag: flat ? 'flat' : '1.5 V', tagSide: 'left' },
        { part: a1, path: [[70, 80], [70, 40], [170, 40]] },
        { part: a2, path: [[170, 80], [170, 40]] },
        { part: w1, path: [[170, 40], [300, 40], [300, 75]] },
        { part: lamp, path: [[300, 75], [300, 155]], tag: 'Lamp', tagSide: 'left' },
        { part: w2, path: [[300, 155], [300, 200], [170, 200]] },
        { part: b1, path: [[70, 150], [70, 200], [170, 200]] },
        { part: b2, path: [[170, 150], [170, 200]] },
        { part: b3, path: [[170, 200], [170, 200]] },
      ],
    };
  };

  let current = build();
  let sch = schematic(ctx, current.places, { topVolts: 3, typicalAmps: 0.15 });
  holder.replaceChildren(sch.node);

  const row = el('div.chips');
  const paint = () => {
    const s = solve(current.parts);
    sch.show(s);
    tried.add(mode);
    row.replaceChildren(
      ...(['series', 'parallel', 'mismatched'] as const).map((m) =>
        el('button.chip', { type: 'button', className: m === mode ? 'chip on' : 'chip', onclick: () => { mode = m; current = build(); sch = schematic(ctx, current.places, { topVolts: 3, typicalAmps: 0.15 }); holder.replaceChildren(sch.node); paint(); } },
          { series: 'Stacked', parallel: 'Side by side', mismatched: 'Side by side, one flat' }[m])),
    );
    const v = s.v['l-in'] - s.v['l-out'];
    const c1 = -s.i.c1;
    const c2 = -s.i.c2;
    f.readout.textContent =
      mode === 'series'
        ? `Stacked + to -, the cells' voltages add: ${volts(v)} appears across the lamp, and the same ${amps(s.i.lamp)} flows through both cells.`
        : mode === 'parallel'
          ? `Side by side, the voltage stays at one cell's voltage of ${volts(v)}. Each cell supplies only ${amps(c1)}, half of the lamp's ${amps(s.i.lamp)}, so together they last twice as long.`
          : `The fresh cell supplies ${amps(c1)}, and the flat one ${c2 < 0 ? `takes ${amps(-c2)} back in` : `gives only ${amps(c2)}`}: current flows from the strong cell into the weak one, warming both. Never wire mismatched cells in parallel.`;
    if (tried.size === 3) t.done();
  };
  f.controls.append(row);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The fault: two bulbs in parallel, and one of them dark.

export const brokenWireFigure = figure(['find'], (ctx, t) => {
  const bat = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const A = { id: 'A', kind: 'lamp' as const, a: 'a-in', b: 'a-out', ohms: 30, rated: 9 };
  const B = { id: 'B', kind: 'lamp' as const, a: 'b-in', b: 'b-out', ohms: 30, rated: 9 };
  const w1 = wire('w1', 'top', 'j1');
  const wa1 = wire('wa1', 'j1', 'a-in');
  const wa2 = wire('wa2', 'a-out', 'j2');
  const wb1 = wire('wb1', 'j1', 'b-in');
  const wb2 = wire('wb2', 'b-out', 'j2', OPEN);
  const w2 = wire('w2', 'j2', 'gnd');
  const parts: Part[] = [bat, w1, wa1, A, wa2, wb1, B, wb2, w2];
  return hunt(ctx, t, {
    parts,
    places: [
      { part: bat, path: [[50, 95], [50, 155]], tag: '9 V', tagSide: 'left' },
      { part: w1, path: [[50, 95], [50, 40], [170, 40]] },
      { part: wa1, path: [[170, 40], [170, 80]] },
      { part: A, path: [[170, 80], [170, 160]], tag: 'A', tagSide: 'left' },
      { part: wa2, path: [[170, 160], [170, 205]] },
      { part: wb1, path: [[170, 40], [280, 40], [280, 80]] },
      { part: B, path: [[280, 80], [280, 160]], tag: 'B', tagSide: 'left' },
      { part: wb2, path: [[280, 160], [280, 205], [170, 205]] },
      { part: w2, path: [[170, 205], [50, 205], [50, 155]] },
    ],
    schematic: { topVolts: 9, typicalAmps: 0.3, grounds: [[50, 205]] },
    size: [400, 240],
    face: [300, 12],
    brief: 'Both bulbs should light. Bulb B is dark.',
    culprit: 'wb2',
    found: 'Found it: the wire under bulb B is broken. With no current flowing in that branch nothing drops any voltage, so the whole 9 V appears across the break, and 0 V across the bulb.',
    hints: [
      'A dead bulb with a broken filament would have the full 9 V across it. Measure across bulb B.',
      'Where there is a break, no current flows, so nothing else drops any voltage: the whole 9 V turns up across the gap.',
    ],
    par: 4,
  });
});
