// The ADSR as arithmetic, with no Web Audio in it.
//
// The riff is known in advance, so each note's envelope is computed here as a
// short list of automation events and the engine only replays them. That keeps
// the maths testable, and avoids cancelAndHoldAtTime, which is not dependable
// across browsers: nothing is ever cancelled, because every event is cut off at
// the next note's start before it is scheduled.
//
// Attack is a straight ramp from wherever the level is. Decay and release are
// exponential approaches, and the knob time is three time constants (95 % of
// the way there), which is close to how an analogue envelope behaves.

export interface Adsr {
  attack: number;
  decay: number;
  /** 0 to 1. */
  sustain: number;
  release: number;
}

export type EnvEvent =
  /** Jump to `v` at `t`. */
  | { kind: 'set'; t: number; v: number }
  /** Straight line from the previous event, arriving at `v` at `t`. */
  | { kind: 'ramp'; t: number; v: number }
  /** From `t`, approach `v` exponentially with time constant `tau`. */
  | { kind: 'target'; t: number; v: number; tau: number };

const TIME_CONSTANTS = 3;

function approach(from: number, to: number, tau: number, dt: number): number {
  return to + (from - to) * Math.exp(-dt / tau);
}

/**
 * One note's envelope.
 *
 * @param v0   the level as the note starts (the previous note's `end`)
 * @param on   note start
 * @param off  key release; clamped to `next`
 * @param next the following note's start: nothing is emitted at or after it
 * @returns the events, and the level at `next`
 */
export function noteEnvelope(
  v0: number,
  on: number,
  off: number,
  next: number,
  adsr: Adsr,
): { events: EnvEvent[]; end: number } {
  const events: EnvEvent[] = [{ kind: 'set', t: on, v: v0 }];
  const release = Math.min(off, next);
  const attackEnd = on + adsr.attack;

  let level: number;
  if (attackEnd >= release) {
    // The key came up (or the next note arrived) while still rising.
    level = v0 + ((1 - v0) * (release - on)) / adsr.attack;
    events.push({ kind: 'ramp', t: release, v: level });
  } else {
    events.push({ kind: 'ramp', t: attackEnd, v: 1 });
    const tau = adsr.decay / TIME_CONSTANTS;
    events.push({ kind: 'target', t: attackEnd, v: adsr.sustain, tau });
    level = approach(1, adsr.sustain, tau, release - attackEnd);
  }
  if (release >= next) return { events, end: level };

  const tau = adsr.release / TIME_CONSTANTS;
  events.push({ kind: 'target', t: release, v: 0, tau });
  return { events, end: approach(level, 0, tau, next - release) };
}

/**
 * A legato note's envelope: the key went down while the last was still held,
 * so nothing starts again. The level carries on towards the sustain from
 * wherever it was, and releases as usual.
 */
export function legatoEnvelope(
  v0: number,
  on: number,
  off: number,
  next: number,
  adsr: Adsr,
): { events: EnvEvent[]; end: number } {
  const release = Math.min(off, next);
  const tau = Math.max(adsr.decay / TIME_CONSTANTS, 0.0005);
  const events: EnvEvent[] = [
    { kind: 'set', t: on, v: v0 },
    { kind: 'target', t: on, v: adsr.sustain, tau },
  ];
  const level = approach(v0, adsr.sustain, tau, release - on);
  if (release >= next) return { events, end: level };
  const rtau = adsr.release / TIME_CONSTANTS;
  events.push({ kind: 'target', t: release, v: 0, tau: rtau });
  return { events, end: approach(level, 0, rtau, next - release) };
}

/** The level an event list produces at time `t`. For tests and drawing. */
export function levelAt(events: readonly EnvEvent[], t: number): number {
  let value = 0;
  let prevT = -Infinity;
  let target: { t: number; v: number; tau: number; from: number } | null = null;
  // Bring `value` up to `time` along whatever exponential is under way.
  const settle = (time: number) => {
    if (target) value = approach(target.from, target.v, target.tau, time - target.t);
  };
  for (const e of events) {
    if (e.kind === 'ramp') {
      if (t < e.t) {
        if (prevT === -Infinity) return value;
        return value + ((e.v - value) * (t - prevT)) / (e.t - prevT);
      }
      value = e.v;
      target = null;
    } else {
      if (t < e.t) break;
      settle(e.t);
      target = e.kind === 'target' ? { t: e.t, v: e.v, tau: e.tau, from: value } : null;
      if (e.kind === 'set') value = e.v;
    }
    prevT = e.t;
  }
  settle(t);
  return value;
}
