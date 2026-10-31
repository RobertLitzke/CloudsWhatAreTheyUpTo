// The first live circuit, and the engine's proving ground: a battery, a
// resistor, a lamp and a switch in one loop. The reader sets the battery's
// voltage and the resistor's value and watches the colours (voltage) and the
// dots (current) answer; tapping a wire probes its voltage, and tapping the
// switch opens the loop. Lesson 1 will build on it; for now it lives on the
// reference page beside Ohm's law.

import { solve } from 'circuit-kit/solve';
import { schematic } from '../circuit/schematic';
import { amps, ohms, volts, watts } from '../circuit/units';
import { figure, frame, slider } from './kit';

export const loopFigure = figure(['dim'], (ctx, t) => {
  const f = frame(400, 240, 3);
  let probe: string | null = null;

  // The parts are changed in place as the sliders move; the schematic keeps hold of them.
  const battery = { id: 'bat', kind: 'source' as const, a: 'top', b: 'gnd', volts: 9 };
  const resistor = { id: 'r', kind: 'resistor' as const, a: 'r-in', b: 'r-out', ohms: 60 };
  const lamp = { id: 'lamp', kind: 'lamp' as const, a: 'lamp-in', b: 'lamp-out', ohms: 30 };
  const sw = { id: 'sw', kind: 'switch' as const, a: 'sw-in', b: 'sw-out', closed: true };
  const parts = [
    battery,
    { id: 'w1', kind: 'wire' as const, a: 'top', b: 'r-in' },
    resistor,
    { id: 'w2', kind: 'wire' as const, a: 'r-out', b: 'lamp-in' },
    lamp,
    { id: 'w3', kind: 'wire' as const, a: 'lamp-out', b: 'sw-in' },
    sw,
    { id: 'w4', kind: 'wire' as const, a: 'sw-out', b: 'gnd' },
  ];

  const sch = schematic(
    ctx,
    [
      { part: battery, path: [[60, 95], [60, 155]], tag: 'Battery', tagSide: 'left' },
      { part: parts[1], path: [[60, 95], [60, 40], [140, 40]] },
      { part: resistor, path: [[140, 40], [240, 40]], tag: 'R', tagSide: 'left' },
      { part: parts[3], path: [[240, 40], [340, 40], [340, 80]] },
      { part: lamp, path: [[340, 80], [340, 160]], tag: 'Lamp', tagSide: 'left' },
      { part: parts[5], path: [[340, 160], [340, 200], [240, 200]] },
      { part: sw, path: [[240, 200], [160, 200]], tag: 'Switch', tagSide: 'right' },
      { part: parts[7], path: [[160, 200], [60, 200], [60, 155]] },
    ],
    {
      topVolts: 12,
      typicalAmps: 0.15,
      grounds: [[60, 200]],
      onProbe: (n) => {
        probe = n;
        paint();
      },
      onToggle: () => {
        sw.closed = !sw.closed;
        paint();
      },
    },
  );
  f.svg.append(sch.node);

  const paint = () => {
    const s = solve(parts);
    sch.show(s);
    const probed = probe ? ` Probe: ${volts(s.v[probe])} on that wire.` : ' Tap a wire to probe it, or the switch to flip it.';
    if (!sw.closed) {
      f.readout.textContent = `The switch is open, so no current flows anywhere and nothing drops any voltage: the whole ${volts(battery.volts)} sits across the gap in the switch.${probed}`;
      return;
    }
    f.readout.textContent =
      `${amps(s.i.r)} flows all the way round. The resistor drops ${volts(s.v['r-in'] - s.v['r-out'])} and turns ${watts(s.p.r)} into heat; ` +
      `the lamp gets ${volts(s.v['lamp-in'] - s.v['lamp-out'])} and glows with ${watts(s.p.lamp)}.${probed}`;
    if (t.goal === 'dim' && s.p.lamp < 0.5 && s.p.lamp > 0.05) t.done();
  };

  f.controls.append(
    slider('Battery', 1.5, 12, 0.5, battery.volts, (x) => volts(x), (x) => { battery.volts = x; paint(); }, 'voltage').node,
    slider('Resistor', 0, 300, 5, resistor.ohms, (x) => ohms(x), (x) => { resistor.ohms = Math.max(x, 0.01); paint(); }, 'resistance').node,
  );
  paint();
  return f.node;
});
