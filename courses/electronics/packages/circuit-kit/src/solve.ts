// The solver: modified nodal analysis. Each node but ground gets an unknown
// voltage, and each part that fixes a voltage (a source, a 0 ohm wire, a
// closed switch) gets an unknown current. Kirchhoff's current law at every
// node, plus each fixed voltage, gives as many equations as unknowns, solved
// at once by Gaussian elimination. A lesson circuit has a few dozen parts at
// most, so this runs every animation frame without trouble.
//
// Parts whose current is not simply proportional to their voltage (a lamp, a
// diode, a transistor, an op-amp, a constant-power load) are solved by
// Newton's method around that same solve: guess the voltages, replace each
// curved part by the straight line that touches its curve at the guess, solve,
// and go again from the answer until it stops moving.
//
// Capacitors and inductors need time. `solve` finds the steady state, where a
// capacitor carries no current and an inductor is only its winding; sim.ts
// steps a circuit through time, handing each step's charge and current back
// in here as `memory`.

import { DIODES, GROUND, junctionCaps, nodesOf, sourceVolts, terminals, type Junction, type Part } from './parts';

export interface Solution {
  /** Volts at every node, from ground. */
  v: Record<string, number>;
  /**
   * Amps through every part, from its a terminal to its b (see parts.ts). For
   * a transistor this is the current into its collector or drain, for an
   * op-amp the current out of its output; `id:terminal` gives the current
   * into each terminal, such as `q1:b` for a base.
   */
  i: Record<string, number>;
  /** Watts every part takes in: positive for a load, negative for a source that is giving power out. */
  p: Record<string, number>;
  /** True when sources are shorted with nothing to limit the current: no voltages or currents are given. */
  short: boolean;
  /** False when Newton's method ran out of steps without settling, so the answer is not to be trusted: sim.ts then takes a smaller step. */
  converged: boolean;
}

export interface SolveOptions {
  /** The temperature of every junction, in °C. Default 25. */
  celsius?: number;
  /** Seconds since the start, for sources with a wave. Default 0. */
  t?: number;
  /** A starting guess for the node voltages, such as the last answer; it makes Newton's method quicker. */
  guess?: Record<string, number>;
  /** From sim.ts: a time step, and each capacitor's voltage and inductor's current at the end of the last one. */
  memory?: { dt: number; volts: Record<string, number>; amps: Record<string, number> };
}

/** A leak from every node to ground, so a node left floating (an open switch) settles at 0 V instead of having no answer. */
const GMIN = 1e-9;
const KELVIN = 273.15;
/** Boltzmann's constant over the electron's charge, volts per kelvin. */
const K_Q = 8.617333e-5;

/**
 * e^x, but straight past e^max, so a wild guess cannot overflow or swamp the
 * Jacobian. A junction passes `is` × e^x, so `straightAt(is)` sets the corner
 * where that reaches a kiloamp, far past anything a lesson's circuit carries:
 * about e^26 for a silicon diode and e^67 for a blue LED, whose saturation
 * current is tiny.
 */
function limexp(x: number, max: number): number {
  return x < max ? Math.exp(x) : Math.exp(max) * (1 + x - max);
}
const straightAt = (is: number) => Math.log(1000 / is);

/** A junction at a temperature: its thermal voltage n·kT/q, and its saturation current, which grows fast as it warms. */
function junctionAt(j: Junction, celsius: number): { nvt: number; is: number } {
  const T = celsius + KELVIN;
  const T0 = 25 + KELVIN;
  const is = j.is * (T / T0) ** (3 / j.n) * Math.exp((j.eg / (j.n * K_Q)) * (1 / T0 - 1 / T));
  return { nvt: j.n * K_Q * T, is };
}

/** softplus, a smooth max(x, 0) whose corner is `w` wide, so a transistor turns on without a kink for Newton to trip on. */
function softplus(x: number, w: number): number {
  return x / w > 30 ? x : w * Math.log1p(Math.exp(x / w));
}

/** The current into each terminal of a curved part, given the voltage at each terminal (in `terminals` order). */
function currents(p: Part, v: number[], celsius: number): number[] {
  switch (p.kind) {
    case 'lamp': {
      // A tungsten filament: a tenth of its hot resistance when cold, rising as it heats.
      const d = v[0] - v[1];
      const cold = p.ohms / 10;
      const r = cold + (p.ohms - cold) * Math.min(1.6, (Math.abs(d) / p.rated!) ** 0.45);
      return [d / r, -d / r];
    }
    case 'load': {
      const d = v[0] - v[1];
      const min = p.min ?? 1;
      const i = Math.abs(d) >= min ? p.watts / d : (p.watts / (min * min)) * d;
      return [i, -i];
    }
    case 'diode': {
      // The series resistance is solved inside: the drop d splits between the junction and it.
      const j = typeof p.model === 'string' ? DIODES[p.model] : p.model;
      const { nvt, is } = junctionAt(j, celsius);
      const d = v[0] - v[1];
      const i = diodeCurrent(d, nvt, is, j.ohms);
      return [i, -i];
    }
    case 'bjt': {
      // Ebers–Moll: two junctions back to back, the base–emitter one forward when it is on.
      const sign = p.type === 'npn' ? 1 : -1;
      const [vc, vb, ve] = v;
      const T = celsius + KELVIN;
      const vt = K_Q * T;
      const is = (p.is ?? 1e-14) * (T / (25 + KELVIN)) ** 3 * Math.exp((1.12 / K_Q) * (1 / (25 + KELVIN) - 1 / T));
      const betaR = 1;
      const fe = limexp((sign * (vb - ve)) / vt, straightAt(is)) - 1;
      const fc = limexp((sign * (vb - vc)) / vt, straightAt(is)) - 1;
      const ic = is * (fe - fc) - (is / betaR) * fc;
      const ib = (is / p.beta) * fe + (is / betaR) * fc;
      return [sign * ic, sign * ib, -sign * (ic + ib)];
    }
    case 'mosfet': {
      // Square law, with a softened threshold and the source and drain allowed to swap.
      const sign = p.type === 'n' ? 1 : -1;
      const [vd, vg, vs] = v.map((x) => sign * x);
      const swap = vd < vs;
      const hi = swap ? vs : vd;
      const lo = swap ? vd : vs;
      const ov = softplus(vg - lo - p.vth, 0.04);
      const vds = hi - lo;
      const id = vds < ov ? p.k * (2 * ov * vds - vds * vds) : p.k * ov * ov * (1 + 0.01 * (vds - ov));
      const into = sign * (swap ? -id : id);
      return [into, 0, -into];
    }
    default:
      return terminals(p).map(() => 0);
  }
}

/** An op-amp's output resistance, ohms. */
const OPAMP_OHMS = 50;

/** Where an op-amp's output is: following its inputs, or stuck at its top or bottom rail. */
type OpState = 'follow' | 'top' | 'bottom';

/** A diode with series resistance r: solve i = is·(e^((d − i·r)/nvt) − 1) for i, by a few Newton steps of its own. */
function diodeCurrent(d: number, nvt: number, is: number, r: number): number {
  if (r <= 0) return is * (limexp(d / nvt, straightAt(is)) - 1);
  // Start from whichever is smaller: the bare junction or the resistor alone.
  let i = Math.min(is * (limexp(d / nvt, straightAt(is)) - 1), Math.max(d / r, 0));
  for (let k = 0; k < 60; k++) {
    const e = limexp((d - i * r) / nvt, straightAt(is));
    const f = is * (e - 1) - i;
    const df = -is * e * (r / nvt) - 1;
    const next = i - f / df;
    if (Math.abs(next - i) < 1e-15 + 1e-10 * Math.abs(i)) return next;
    i = next;
  }
  return i;
}

const isCurved = (p: Part) =>
  (p.kind === 'lamp' && !!p.rated) || p.kind === 'load' || p.kind === 'diode' || p.kind === 'bjt' || p.kind === 'mosfet';

/**
 * Solve a circuit: its steady state, or one step in time when sim.ts passes
 * `memory`. Ground is the node named GROUND if one is used, otherwise the −
 * terminal of the first source, otherwise the first node named.
 */
export function solve(parts: readonly Part[], o: SolveOptions = {}): Solution {
  const names = nodesOf(parts);
  const firstSource = parts.find((p) => p.kind === 'source');
  const ground = names.includes(GROUND) ? GROUND : (firstSource && 'b' in firstSource ? firstSource.b : names[0]);
  const celsius = o.celsius ?? 25;
  const t = o.t ?? 0;
  const mem = o.memory;

  // Sources with an internal resistance get a hidden node between the two.
  const inner = (id: string) => `${id}#inner`;
  const all = [...names];
  for (const p of parts) if (p.kind === 'source' && (p.ohms ?? 0) > 0) all.push(inner(p.id));

  const index = new Map<string, number>();
  for (const n of all) if (n !== ground) index.set(n, index.size);
  const nodeCount = index.size;
  const at = (n: string) => index.get(n) ?? -1;

  // Parts that fix a voltage between two nodes, each with its own current unknown.
  const fixed: { id: string; a: string; b: string; volts: number }[] = [];
  for (const p of parts) {
    if (p.kind === 'source') fixed.push({ id: p.id, a: (p.ohms ?? 0) > 0 ? inner(p.id) : p.a, b: p.b, volts: sourceVolts(p, t) });
    else if (p.kind === 'wire' && !(p.ohms && p.ohms > 0)) fixed.push({ id: p.id, a: p.a, b: p.b, volts: 0 });
    else if (p.kind === 'switch' && p.closed) fixed.push({ id: p.id, a: p.a, b: p.b, volts: 0 });
    else if (p.kind === 'inductor' && !mem && !(p.ohms && p.ohms > 0)) fixed.push({ id: p.id, a: p.a, b: p.b, volts: 0 });
  }
  const size = nodeCount + fixed.length;
  const curved = parts.filter(isCurved);

  /** Build and solve the straight-line version of the circuit around the guess `x`. */
  const linear = (x: Float64Array | null): Float64Array | null => {
    const A = Array.from({ length: size }, () => new Float64Array(size));
    const z = new Float64Array(size);
    const conductance = (a: string, b: string, g: number) => {
      const ia = at(a);
      const ib = at(b);
      if (ia >= 0) A[ia][ia] += g;
      if (ib >= 0) A[ib][ib] += g;
      if (ia >= 0 && ib >= 0) {
        A[ia][ib] -= g;
        A[ib][ia] -= g;
      }
    };
    /** A current `amps` pushed through from a to b. */
    const push = (a: string, b: string, amps: number) => {
      const ia = at(a);
      const ib = at(b);
      if (ia >= 0) z[ia] -= amps;
      if (ib >= 0) z[ib] += amps;
    };

    for (let k = 0; k < nodeCount; k++) A[k][k] += GMIN;
    for (const p of parts) {
      switch (p.kind) {
        case 'resistor':
          conductance(p.a, p.b, 1 / p.ohms);
          break;
        case 'lamp':
          if (!p.rated) conductance(p.a, p.b, 1 / p.ohms);
          break;
        case 'wire':
          if (p.ohms && p.ohms > 0) conductance(p.a, p.b, 1 / p.ohms);
          break;
        case 'fuse':
          if (!p.blown) conductance(p.a, p.b, 1 / (p.ohms ?? 0.01));
          break;
        case 'source':
          if ((p.ohms ?? 0) > 0) conductance(p.a, inner(p.id), 1 / p.ohms!);
          break;
        case 'current':
          push(p.a, p.b, p.amps);
          break;
        case 'capacitor':
          // Backward Euler: over a step dt the capacitor is a conductance C/dt in parallel with the charge it held.
          if (mem) {
            const g = p.farads / mem.dt;
            conductance(p.a, p.b, g);
            push(p.a, p.b, -g * (mem.volts[p.id] ?? 0));
          }
          break;
        case 'inductor':
          if (mem) {
            // An inductor over a step: a conductance dt/L, in parallel with the current it was carrying, in series with its winding.
            const g = 1 / (p.henries / mem.dt + (p.ohms ?? 0));
            conductance(p.a, p.b, g);
            push(p.a, p.b, (mem.amps[p.id] ?? 0) * (p.henries / mem.dt) * g);
          } else if (p.ohms && p.ohms > 0) conductance(p.a, p.b, 1 / p.ohms);
          break;
        case 'bjt':
          // Its junctions' own small capacitance, by backward Euler as for a capacitor.
          if (mem) {
            for (const [key, a, b, farads] of junctionCaps(p)) {
              const g = farads / mem.dt;
              conductance(a, b, g);
              push(a, b, -g * (mem.volts[key] ?? 0));
            }
          }
          break;
        case 'opamp': {
          // The output is a voltage behind OPAMP_OHMS: gain × (plus − minus) while it follows, or a rail less the headroom.
          const g = 1 / OPAMP_OHMS;
          const out = at(p.out);
          if (out < 0) break;
          A[out][out] += g;
          const state = opStates.get(p.id) ?? 'follow';
          if (state === 'follow') {
            const gain = p.gain ?? 2e5;
            if (at(p.plus) >= 0) A[out][at(p.plus)] -= g * gain;
            if (at(p.minus) >= 0) A[out][at(p.minus)] += g * gain;
          } else {
            const rail = state === 'top' ? p.vcc : p.vee;
            const room = (state === 'top' ? -1 : 1) * (p.headroom ?? 1.5);
            if (at(rail) >= 0) A[out][at(rail)] -= g;
            z[out] += g * room;
          }
          break;
        }
        default:
          break;
      }
    }
    // Each curved part, replaced by the straight line touching its curve at the guess.
    if (x) {
      const volts = (n: string) => (n === ground ? 0 : x[at(n)]);
      for (const p of curved) {
        const nodes = terminals(p).map(([, n]) => n);
        const v0 = nodes.map(volts);
        const i0 = currents(p, v0, celsius);
        const h = 1e-6;
        const J = nodes.map((_, j) => {
          const v1 = [...v0];
          v1[j] += h;
          const i1 = currents(p, v1, celsius);
          return i1.map((c, k) => (c - i0[k]) / h);
        });
        nodes.forEach((nk, k) => {
          const row = at(nk);
          if (row < 0) return;
          let rest = i0[k];
          nodes.forEach((nj, j) => {
            const col = at(nj);
            rest -= J[j][k] * v0[j];
            if (col >= 0) A[row][col] += J[j][k];
          });
          z[row] -= rest;
        });
      }
    }
    fixed.forEach((f, j) => {
      const k = nodeCount + j;
      const ia = at(f.a);
      const ib = at(f.b);
      if (ia >= 0) {
        A[ia][k] += 1;
        A[k][ia] += 1;
      }
      if (ib >= 0) {
        A[ib][k] -= 1;
        A[k][ib] -= 1;
      }
      z[k] = f.volts;
    });
    return gauss(A, z);
  };

  const opamps = parts.filter((p): p is Extract<Part, { kind: 'opamp' }> => p.kind === 'opamp');
  const opStates = new Map<string, OpState>(opamps.map((p) => [p.id, 'follow']));

  /** Newton's method on the curved parts, for the op-amps' present states. */
  let converged = true;
  let guess = o.guess;
  const newton = (): Float64Array | null => {
    converged = true;
    if (!curved.length) return linear(null);
    // With no guess, start from the circuit with its curved parts left out.
    const x = guess ? new Float64Array(size) : (linear(null) ?? new Float64Array(size));
    if (guess) for (const [n, k] of index) x[k] = guess[n] ?? 0;
    else {
      // Left out, a curved part can leave a node pushed by a current source to thousands of volts, too far for the
      // damped steps below to walk back from. Start every node within reach of the largest fixed voltage instead.
      const reach = Math.max(1, ...fixed.map((f) => Math.abs(f.volts) + 1));
      for (let k = 0; k < nodeCount; k++) x[k] = Math.max(-reach, Math.min(reach, x[k]));
    }
    // A step in time starts from the last step's answer, so it either settles quickly or the step is too long, and
    // sim.ts would rather know soon and halve it.
    const most = mem && guess ? 20 : 400;
    for (let iter = 0; iter < most; iter++) {
      const next = linear(x);
      if (!next) return null;
      // Take the step, but no node moves more than 2 V at once, so a wild first guess walks in rather than leaps about.
      // If that hasn't settled it, the steps get shorter still, which breaks the cycle Newton's method can fall into
      // when two transistors are flipping each other over.
      let biggest = 0;
      for (let k = 0; k < nodeCount; k++) biggest = Math.max(biggest, Math.abs(next[k] - x[k]));
      const reach = iter < 60 ? 2 : iter < 160 ? 0.4 : 0.08;
      const scale = biggest > reach ? reach / biggest : 1;
      for (let k = 0; k < size; k++) x[k] += (next[k] - x[k]) * (k < nodeCount ? scale : 1);
      if (biggest < 1e-8) break;
      if (iter === most - 1) converged = false;
    }
    return x;
  };

  // Solve, then see whether each op-amp's output has run past a rail (or come back off one), and solve again if so.
  let x = newton();
  // A guess too far from the answer to walk to: start again from nothing. (In a step in time, sim.ts halves the step instead.)
  if (!converged && guess && !mem) {
    guess = undefined;
    x = newton();
  }
  for (let round = 0; x && opamps.length && round < 2 * opamps.length + 4; round++) {
    const sol = x;
    const volts = (n: string) => (n === ground ? 0 : sol[at(n)]);
    let changed = false;
    for (const p of opamps) {
      const room = p.headroom ?? 1.5;
      const top = volts(p.vcc) - room;
      const bottom = volts(p.vee) + room;
      const wants = (p.gain ?? 2e5) * (volts(p.plus) - volts(p.minus));
      const state: OpState = wants > top ? 'top' : wants < bottom ? 'bottom' : 'follow';
      if (state !== opStates.get(p.id)) {
        opStates.set(p.id, state);
        changed = true;
      }
    }
    if (!changed) break;
    x = newton();
  }

  const v: Record<string, number> = {};
  const i: Record<string, number> = {};
  const p: Record<string, number> = {};
  if (!x || x.some((n) => !Number.isFinite(n))) {
    for (const n of names) v[n] = 0;
    for (const part of parts) i[part.id] = p[part.id] = 0;
    return { v, i, p, short: true, converged };
  }

  const volts = (n: string) => (n === ground ? 0 : x![index.get(n)!]);
  for (const n of names) v[n] = volts(n);
  const fixedCurrent = new Map(fixed.map((f, j) => [f.id, x![nodeCount + j]]));
  for (const part of parts) {
    if (isCurved(part)) {
      const nodes = terminals(part);
      const vs = nodes.map(([, n]) => volts(n));
      const into = currents(part, vs, celsius);
      nodes.forEach(([name], k) => (i[`${part.id}:${name}`] = into[k]));
      i[part.id] = into[0];
      p[part.id] = vs.reduce((s, vk, k) => s + vk * into[k], 0);
      continue;
    }
    if (part.kind === 'opamp') {
      // The current out of the output pin; its power comes from the supply pins, which this model leaves out.
      const state = opStates.get(part.id)!;
      const inside = state === 'follow' ? (part.gain ?? 2e5) * (volts(part.plus) - volts(part.minus)) : state === 'top' ? volts(part.vcc) - (part.headroom ?? 1.5) : volts(part.vee) + (part.headroom ?? 1.5);
      const out = (inside - volts(part.out)) / OPAMP_OHMS;
      i[part.id] = i[`${part.id}:out`] = out;
      p[part.id] = 0;
      continue;
    }
    if (part.kind === 'bjt' || part.kind === 'mosfet') continue;
    const d = volts(part.a) - volts(part.b);
    let amps: number;
    switch (part.kind) {
      case 'resistor':
      case 'lamp':
        amps = d / part.ohms;
        break;
      case 'current':
        amps = part.amps;
        break;
      case 'source':
        amps = (part.ohms ?? 0) > 0 ? (volts(part.a) - volts(inner(part.id))) / part.ohms! : fixedCurrent.get(part.id)!;
        break;
      case 'wire':
        amps = part.ohms && part.ohms > 0 ? d / part.ohms : fixedCurrent.get(part.id)!;
        break;
      case 'switch':
        amps = part.closed ? fixedCurrent.get(part.id)! : 0;
        break;
      case 'fuse':
        amps = part.blown ? 0 : d / (part.ohms ?? 0.01);
        break;
      case 'capacitor':
        amps = mem ? (part.farads / mem.dt) * (d - (mem.volts[part.id] ?? 0)) : 0;
        break;
      case 'inductor':
        if (mem) {
          const g = 1 / (part.henries / mem.dt + (part.ohms ?? 0));
          amps = g * d + (mem.amps[part.id] ?? 0) * (part.henries / mem.dt) * g;
        } else amps = part.ohms && part.ohms > 0 ? d / part.ohms : fixedCurrent.get(part.id)!;
        break;
      default:
        amps = 0;
    }
    i[part.id] = amps;
    p[part.id] = d * amps;
  }
  return { v, i, p, short: false, converged };
}

/** Solve A x = z by Gaussian elimination with partial pivoting; null if A is singular. A and z are overwritten. */
function gauss(A: Float64Array[], z: Float64Array): Float64Array | null {
  const n = z.length;
  for (let col = 0; col < n; col++) {
    let best = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[best][col])) best = r;
    if (Math.abs(A[best][col]) < 1e-12) return null;
    if (best !== col) {
      [A[best], A[col]] = [A[col], A[best]];
      [z[best], z[col]] = [z[col], z[best]];
    }
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / A[col][col];
      if (f === 0) continue;
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      z[r] -= f * z[col];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = z[r];
    for (let c = r + 1; c < n; c++) s -= A[r][c] * x[c];
    x[r] = s / A[r][r];
  }
  return x;
}
