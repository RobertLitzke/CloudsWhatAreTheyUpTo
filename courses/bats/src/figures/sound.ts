// Bat calls made by the page, from published measurements (no recording
// source is approved for the site). A call is a tone that sweeps from one
// frequency to another; played back slowed down, every frequency is divided
// by the same factor, so a 40 kHz sweep slowed ten times sounds at 4 kHz,
// the way a time-expansion bat detector plays it.

/** One call: when it starts and how long it lasts (seconds, real time), and its sweep (hertz, real). */
export interface Call {
  at: number;
  dur: number;
  from: number;
  to: number;
  /** 0 to 1, default 1. */
  gain?: number;
}

/** A train of `n` calls `every` seconds apart, each the same sweep. */
export const train = (n: number, every: number, call: Omit<Call, 'at'>, start = 0): Call[] =>
  Array.from({ length: n }, (_, i) => ({ ...call, at: start + i * every }));

/** How long a list of calls lasts, real time, in seconds. */
export const span = (calls: readonly Call[]): number => calls.reduce((m, c) => Math.max(m, c.at + c.dur), 0);

/** What a call sounds like slowed `slow` times: its sweep in hertz you can hear. */
export const heard = (c: Call, slow: number) => ({ from: c.from / slow, to: c.to / slow, dur: c.dur * slow });

let ctx: AudioContext | undefined;
const audio = (): AudioContext | undefined => {
  const A = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!A) return undefined;
  ctx ??= new A();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

/**
 * Plays the calls slowed down `slow` times (10 by default). Returns how long
 * it lasts in seconds of playback, or 0 where the page can't play sound
 * (tests, an old browser).
 */
export function play(calls: readonly Call[], slow = 10, volume = 0.25): number {
  const a = audio();
  if (!a || !calls.length) return 0;
  const t0 = a.currentTime + 0.05;
  const out = a.createGain();
  out.gain.value = volume;
  out.connect(a.destination);
  for (const c of calls) {
    const h = heard(c, slow);
    const start = t0 + c.at * slow;
    const osc = a.createOscillator();
    const env = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.max(20, h.from), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, h.to), start + h.dur);
    // A quick rise and fall, so each call is a chirp and not a click.
    const g = c.gain ?? 1;
    const edge = Math.min(0.004, h.dur / 4);
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(g, start + edge);
    env.gain.setValueAtTime(g, start + h.dur - edge);
    env.gain.linearRampToValueAtTime(0, start + h.dur);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + h.dur + 0.01);
  }
  return span(calls) * slow;
}

/** A steady tone at `hz` for `seconds`, not slowed: what a heterodyne detector's speaker gives out. */
export function tone(hz: number, seconds: number, volume = 0.2): number {
  return play([{ at: 0, dur: seconds, from: hz, to: hz }], 1, volume);
}

/** A button that plays what `calls()` returns, slowed `slow` times. */
export function playButton(text: string, calls: () => readonly Call[], slow = 10, after?: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = `▶ ${text}`;
  b.addEventListener('click', () => {
    play(calls(), slow);
    after?.();
  });
  return b;
}
