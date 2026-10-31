// What a circuit is made of: parts, each joined between named nodes. A node is
// a name for one stretch of copper at one voltage; every terminal that names
// it is joined to every other. The node called GROUND is 0 V, and every other
// voltage is measured from it.
//
// A two-terminal part runs from its terminal `a` to its terminal `b`, and the
// solver reports its current in that direction: positive when conventional
// current flows through it from a to b. For a source, `a` is the + terminal;
// for a diode or LED, `a` is the anode. Transistors and op-amps have three or
// more terminals, named for what they are (c, b, e; d, g, s; plus, minus,
// out), and the solver reports the current into each (see solve.ts).

export const GROUND = 'gnd';

/**
 * A source's voltage over time, added to its steady `volts`: a sine `amp`
 * volts high at `hz`, a square wave, or a guitar note, which is a sine with
 * its harmonics on top as a plucked string has, scaled to peak at `amp`.
 */
export interface Wave {
  shape: 'sine' | 'square' | 'guitar';
  amp: number;
  hz: number;
  /** Where in the cycle it starts, in turns (0 to 1). */
  phase?: number;
}

/**
 * A diode's junction: saturation current `is` in amps and ideality `n` at
 * 25 °C, as in the Shockley equation, a little series resistance, and the
 * band gap `eg` in electron-volts, which sets how the drop moves with
 * temperature (about 2 mV less per degree warmer).
 */
export interface Junction {
  is: number;
  n: number;
  ohms: number;
  eg: number;
}

/** Diodes the lessons use. LEDs are diodes whose drop is set by their colour. */
export const DIODES = {
  silicon: { is: 4e-9, n: 1.9, ohms: 0.1, eg: 1.12 },
  germanium: { is: 2e-6, n: 1.3, ohms: 1, eg: 0.67 },
  schottky: { is: 3e-7, n: 1.1, ohms: 0.05, eg: 0.69 },
  'led-red': { is: 1e-19, n: 1.9, ohms: 8, eg: 2.4 },
  'led-green': { is: 1e-22, n: 2, ohms: 10, eg: 2.9 },
  'led-blue': { is: 1e-26, n: 2.1, ohms: 12, eg: 3.5 },
} satisfies Record<string, Junction>;
export type DiodeKind = keyof typeof DIODES;

export type Part =
  /** A resistor, `ohms` from a to b. */
  | { id: string; kind: 'resistor'; a: string; b: string; ohms: number }
  /**
   * A filament lamp, `ohms` when lit at its `rated` voltage. Given a rating, a
   * cold filament has a tenth of that resistance and it rises as the lamp
   * heats, so its current curve bends; without one it is a plain resistance.
   */
  | { id: string; kind: 'lamp'; a: string; b: string; ohms: number; rated?: number }
  /** A battery or bench supply: a (+) sits `volts` above b (−), through an internal resistance `ohms` (0 is ideal), plus a `wave` if it has one. */
  | { id: string; kind: 'source'; a: string; b: string; volts: number; ohms?: number; wave?: Wave }
  /** A current source: pushes `amps` through itself from a to b, whatever it takes. */
  | { id: string; kind: 'current'; a: string; b: string; amps: number }
  /** A length of wire or trace. 0 ohms unless given, so solder joints and thin traces can be given some. */
  | { id: string; kind: 'wire'; a: string; b: string; ohms?: number }
  /** A switch: a wire when closed, nothing when open. */
  | { id: string; kind: 'switch'; a: string; b: string; closed: boolean }
  /** A fuse rated at `amps`: a wire (a little resistance) until a figure finds it over its rating and sets it `blown`. */
  | { id: string; kind: 'fuse'; a: string; b: string; amps: number; blown?: boolean; ohms?: number }
  /** A load that takes the same `watts` whatever its voltage, as a converter or inverter does; below `min` volts it gives up and looks like a resistor. */
  | { id: string; kind: 'load'; a: string; b: string; watts: number; min?: number }
  /** A capacitor, `farads` from a to b. It holds its charge between time steps; in a steady state no current flows through it. */
  | { id: string; kind: 'capacitor'; a: string; b: string; farads: number }
  /** An inductor, `henries` from a to b, with the resistance `ohms` of its winding. In a steady state it is just that resistance. */
  | { id: string; kind: 'inductor'; a: string; b: string; henries: number; ohms?: number }
  /** A diode or LED, anode a to cathode b. `model` names one of DIODES, or gives a junction of its own. */
  | { id: string; kind: 'diode'; a: string; b: string; model: DiodeKind | Junction }
  /** A bipolar transistor: collector c, base b, emitter e, with current gain `beta`. */
  | { id: string; kind: 'bjt'; type: 'npn' | 'pnp'; c: string; b: string; e: string; beta: number; is?: number }
  /** A MOSFET: drain d, gate g, source s. It turns on past `vth` volts gate to source, conducting `k`·(Vgs − vth)² amps when fully on. */
  | { id: string; kind: 'mosfet'; type: 'n' | 'p'; d: string; g: string; s: string; vth: number; k: number }
  /**
   * An op-amp: out follows `gain` times (plus − minus), through a small output
   * resistance, but cannot go past its supply rails less `headroom` (about
   * 1.5 V for an old part like the 4558, near 0 for a rail-to-rail one).
   */
  | { id: string; kind: 'opamp'; plus: string; minus: string; out: string; vcc: string; vee: string; gain?: number; headroom?: number };

export type PartKind = Part['kind'];

/** A part's terminals, by name, in a fixed order. */
export function terminals(p: Part): [string, string][] {
  switch (p.kind) {
    case 'bjt':
      return [['c', p.c], ['b', p.b], ['e', p.e]];
    case 'mosfet':
      return [['d', p.d], ['g', p.g], ['s', p.s]];
    case 'opamp':
      return [['plus', p.plus], ['minus', p.minus], ['out', p.out], ['vcc', p.vcc], ['vee', p.vee]];
    default:
      return [['a', p.a], ['b', p.b]];
  }
}

/** Every node the parts name, in the order they first appear. */
export function nodesOf(parts: readonly Part[]): string[] {
  const seen = new Set<string>();
  for (const p of parts) for (const [, n] of terminals(p)) seen.add(n);
  return [...seen];
}

/**
 * A bipolar transistor's two junctions each hold a little charge, from base
 * to emitter and base to collector: roughly 100 pF and 10 pF for a small
 * transistor, counting the charge crossing the base while it is on. Steady
 * circuits never notice, but stepped through time they set how fast a
 * transistor can flip over, and without them a blinker that flips has no
 * in-between for the solver to follow. Keyed `id:be` and `id:bc` in a
 * simulation's memory.
 */
export const JUNCTION_FARADS = { be: 100e-12, bc: 10e-12 } as const;

/** A bipolar transistor's junction capacitances: [memory key, from node, to node, farads]. */
export function junctionCaps(p: Extract<Part, { kind: 'bjt' }>): [string, string, string, number][] {
  return [
    [`${p.id}:be`, p.b, p.e, JUNCTION_FARADS.be],
    [`${p.id}:bc`, p.b, p.c, JUNCTION_FARADS.bc],
  ];
}

/** A plucked string's harmonics: how strong each multiple of the note is, and where in its cycle it starts. */
const STRING: [number, number][] = [[1, 0], [0.55, 0.3], [0.35, 0.1], [0.12, 0.6], [0.18, 0.2], [0.08, 0.5]];
const pluck = (turns: number) => STRING.reduce((sum, [a, ph], k) => sum + a * Math.sin(2 * Math.PI * ((k + 1) * turns + ph)), 0);
/** The guitar wave's highest point over a cycle, so it can be scaled to peak at its `amp`. */
const PLUCK_PEAK = Math.max(...Array.from({ length: 720 }, (_, k) => Math.abs(pluck(k / 720))));

/** A source's voltage at time `t` seconds. */
export function sourceVolts(p: Extract<Part, { kind: 'source' }>, t: number): number {
  const w = p.wave;
  if (!w || !w.amp) return p.volts;
  const turns = w.hz * t + (w.phase ?? 0);
  const x =
    w.shape === 'square' ? (((turns % 1) + 1) % 1 < 0.5 ? 1 : -1)
    : w.shape === 'guitar' ? pluck(turns) / PLUCK_PEAK
    : Math.sin(2 * Math.PI * turns);
  return p.volts + w.amp * x;
}

/** The E12 series: twelve values a decade, the resistors and capacitors you can buy. */
export const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2] as const;

/** Every E12 value from `lo` to `hi`, in order. */
export function e12(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let d = Math.floor(Math.log10(lo)) - 1; d <= Math.ceil(Math.log10(hi)); d++) {
    for (const m of E12) {
      const v = Number((m * 10 ** d).toPrecision(2));
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v);
    }
  }
  return out;
}

/** The E12 value nearest `x`, by ratio. */
export function nearestE12(x: number): number {
  const d = Math.floor(Math.log10(x));
  const all = [...E12.map((m) => m * 10 ** d), 10 ** (d + 1)];
  return Number(all.reduce((best, v) => (Math.abs(Math.log(v / x)) < Math.abs(Math.log(best / x)) ? v : best)).toPrecision(2));
}
