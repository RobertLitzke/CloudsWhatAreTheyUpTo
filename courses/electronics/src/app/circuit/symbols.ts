// Each part's symbol on its own, for the reference page: the same drawing the
// live schematics use, in plain ink with a short lead either side, and no
// voltage, current or glow.

import { svg } from 'didactics/dom';
import type { Part } from 'circuit-kit/parts';
import { COL } from '../figures/kit';
import { BODY, body, groundSymbol, symbol, type ThreeTerminal, type TwoTerminal } from './schematic';

const W = 96;
const H = 64;
const nodes = { a: 'a', b: 'b' };

/** A two-terminal part across the middle of the box. */
function across(part: TwoTerminal, ...extra: SVGElement[]): SVGElement[] {
  const x0 = (W - BODY) / 2;
  const sym = symbol(part, COL.ink);
  sym.setAttribute('transform', `translate(${x0} ${H / 2})`);
  return [
    svg('line', { x1: 8, y1: H / 2, x2: x0, y2: H / 2, stroke: COL.ink, 'stroke-width': 2.2 }),
    sym,
    svg('line', { x1: x0 + BODY, y1: H / 2, x2: W - 8, y2: H / 2, stroke: COL.ink, 'stroke-width': 2.2 }),
    ...extra,
  ];
}

/** A transistor or op-amp centred in the box. */
function mounted(part: ThreeTerminal, dx = 0): SVGElement[] {
  const g = body(part);
  g.setAttribute('transform', `translate(${W / 2 + dx} ${H / 2})`);
  return [g];
}

const two = (p: Record<string, unknown>) => ({ id: 'x', ...nodes, ...p }) as TwoTerminal;

export const SYMBOLS = {
  battery: () => across(two({ kind: 'source', volts: 9 })),
  resistor: () => across(two({ kind: 'resistor', ohms: 1000 })),
  lamp: () => across(two({ kind: 'lamp', ohms: 10 })),
  switch: () => across(two({ kind: 'switch', closed: false })),
  ground: () => [svg('line', { x1: W / 2, y1: 12, x2: W / 2, y2: 22, stroke: COL.ink, 'stroke-width': 2.2 }), groundSymbol([W / 2, 22])],
  // The wiper is an arrow pointing at the track from below.
  pot: () => across(two({ kind: 'resistor', ohms: 10000 }),
    svg('path', { d: `M${W / 2},${H - 4} V${H / 2 + 9}`, stroke: COL.ink, 'stroke-width': 2.2 }),
    svg('polygon', { points: `${W / 2},${H / 2 + 7} ${W / 2 - 4.5},${H / 2 + 15} ${W / 2 + 4.5},${H / 2 + 15}`, fill: COL.ink }),
  ),
  current: () => across(two({ kind: 'current', amps: 0.01 })),
  fuse: () => across(two({ kind: 'fuse', amps: 5 })),
  load: () => across(two({ kind: 'load', watts: 20 })),
  signal: () => across(two({ kind: 'source', volts: 0, wave: { shape: 'sine', amp: 1, hz: 440 } })),
  capacitor: () => across(two({ kind: 'capacitor', farads: 1e-6 })),
  inductor: () => across(two({ kind: 'inductor', henries: 0.1 })),
  diode: () => across(two({ kind: 'diode', model: 'silicon' })),
  led: () => across(two({ kind: 'diode', model: 'led-red' })),
  npn: () => mounted({ id: 'q', kind: 'bjt', type: 'npn', c: 'c', b: 'b', e: 'e', beta: 100 } satisfies Part, 6),
  nmos: () => mounted({ id: 'q', kind: 'mosfet', type: 'n', d: 'd', g: 'g', s: 's', vth: 2, k: 0.5 } satisfies Part, 6),
  opamp: () => mounted({ id: 'u', kind: 'opamp', plus: 'p', minus: 'm', out: 'o', vcc: 'v', vee: 'gnd' } satisfies Part, -1),
} satisfies Record<string, () => SVGElement[]>;

export type SymbolId = keyof typeof SYMBOLS;

/** The drawing of one symbol, as its own small svg. */
export function symbolDrawing(id: SymbolId, name: string): SVGElement {
  return svg('svg', { 'aria-label': name, viewBox: `0 0 ${W} ${H}`, width: W * 1.25, height: H * 1.25, role: 'img', 'stroke-linecap': 'round' }, ...SYMBOLS[id]());
}
