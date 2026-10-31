// A circuit stepped through time. Each step solves the circuit with every
// capacitor standing in for the charge it holds and every inductor for the
// current it carries (solve.ts, backward Euler), then remembers the new
// charge and current for the next step. Sources with a wave move as time
// goes on, so a scope can be drawn by recording a node at each step.

import { junctionCaps, type Part } from './parts';
import { solve, type Solution } from './solve';

export interface Sim {
  /** Seconds since the start. */
  readonly t: number;
  /** The latest solution. */
  readonly now: Solution;
  /** Step forward `dt` seconds, in `substeps` equal steps; returns the solution at the end. */
  step(dt: number, substeps?: number): Solution;
  /** Back to the start: capacitors empty and inductors still, or the steady state if `settled`. */
  reset(settled?: boolean): void;
}

export interface SimOptions {
  celsius?: number;
  /** Start from the steady state instead of from rest (capacitors empty, no current in inductors). */
  settled?: boolean;
  /** Volts each named capacitor starts with, a to b, when starting from rest: a nudge for a circuit that would otherwise start balanced. */
  charged?: Record<string, number>;
}

/** A simulation of `parts`, which a figure may change in place between steps. */
export function simulate(parts: readonly Part[], o: SimOptions = {}): Sim {
  let t = 0;
  let volts: Record<string, number> = {};
  let amps: Record<string, number> = {};
  let now: Solution;

  const remember = (s: Solution) => {
    for (const p of parts) {
      if (p.kind === 'capacitor') volts[p.id] = s.v[p.a] - s.v[p.b];
      if (p.kind === 'inductor') amps[p.id] = s.i[p.id];
      if (p.kind === 'bjt') for (const [key, a, b] of junctionCaps(p)) volts[key] = s.v[a] - s.v[b];
    }
  };

  const reset = (settled = o.settled ?? false) => {
    t = 0;
    volts = { ...o.charged };
    amps = {};
    if (settled) {
      now = solve(parts, { celsius: o.celsius, t: 0 });
      remember(now);
    } else {
      // From rest: one tiny step with empty capacitors and still inductors.
      now = solve(parts, { celsius: o.celsius, t: 0, memory: { dt: 1e-9, volts, amps } });
    }
  };
  reset();

  return {
    get t() {
      return t;
    },
    get now() {
      return now;
    },
    step(dt, substeps = 1) {
      // Steps of dt / substeps seconds. Where the circuit changes too fast for Newton's method to follow (a blinker
      // flipping over, which takes a few nanoseconds), the step is halved until it can, down to a billionth of
      // itself, then doubled again each time one goes through, back up to its full length.
      const full = dt / substeps;
      const end = t + dt;
      let h = full;
      while (!now.short && end - t > full * 1e-9) {
        h = Math.min(h, end - t);
        const s = solve(parts, { celsius: o.celsius, t: t + h, guess: now.v, memory: { dt: h, volts, amps } });
        if (!s.converged && h > full * 1e-9) {
          h /= 2;
          continue;
        }
        t += h;
        now = s;
        if (!now.short) remember(now);
        h = Math.min(full, h * 2);
      }
      t = Math.max(t, end);
      return now;
    },
    reset,
  };
}
