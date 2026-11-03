// The engine: one clock driving several voices in lockstep.
//
// Every voice plays the same loop at the same instant with its own sound; only
// one is audible, and switching is a short crossfade at the same point in the
// loop. That is what makes A/B comparison note-for-note.
//
// Scheduling is the standard look-ahead: a 25 ms timer queues every note that
// starts within the next 120 ms on the audio clock.
//
// Free play adds two things that are not on the clock: notes played from a
// keyboard as they happen, and a metronome for recording.

import type { Sound } from '../core/params';
import { timedNotes, type Riff, type TimedNote } from '../core/riffs';
import { midiToHz } from '../core/riffs/notation';
import { Voice } from './voice';

/** A key's velocity when nothing says how hard it was struck: a computer key, or a held key handed back. */
export const KEY_VELOCITY = 0.8;

const TICK_MS = 25;
const HORIZON = 0.12;
const LEAD_IN = 0.06;

/** What the clock plays: notes in seconds from the top, and how long a pass and a bar last. */
export interface Loop {
  notes: readonly TimedNote[];
  duration: number;
  barSeconds: number;
  /** One sixteenth note: what the echo counts its gap in. */
  sixSeconds: number;
}

/** A riff as a loop, at its own tempo or another. */
export function riffLoop(riff: Riff, bpm = riff.bpm): Loop {
  const stretch = riff.bpm / bpm;
  return {
    notes: timedNotes(riff).map((n) => ({ ...n, on: n.on * stretch, off: n.off * stretch })),
    duration: riff.length * riff.six * stretch,
    barSeconds: riff.bar * riff.six * stretch,
    sixSeconds: riff.six * stretch,
  };
}

export class Engine {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private readonly bus: GainNode;
  private readonly master: GainNode;

  private voices: Voice[] = [];
  private selected = 0;
  private riff: Riff | null = null;
  private loop: Loop | null = null;

  private timer: ReturnType<typeof setInterval> | null = null;
  /** Start time of the pass the next unscheduled note belongs to. */
  private passStart = 0;
  private index = 0;
  /** Start time of the next pass the voices have not been told about. */
  private nextLoop = 0;
  private clicks: OscillatorNode[] = [];

  /** Called whenever playing starts or stops, whoever caused it. */
  onState: (() => void) | null = null;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    this.bus = this.ctx.createGain();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    // A limiter: high resonance on an open filter is loud.
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 6;
    limiter.ratio.value = 14;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.7;
    // A 60 dB window: wide enough for a filter slope, narrow enough that the
    // floor of a pure tone does not fill the display.
    this.analyser.minDecibels = -75;
    this.analyser.maxDecibels = -15;
    this.bus.connect(this.master).connect(limiter).connect(this.analyser).connect(this.ctx.destination);

    // A hidden tab throttles timers to once a second, which starves the
    // scheduler. Stopping is kinder than stuttering.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
    });
  }

  get playing(): boolean {
    return this.timer != null;
  }

  get current(): number {
    return this.selected;
  }

  /** The audio clock, in seconds. */
  get now(): number {
    return this.ctx.currentTime;
  }

  /** How long after the clock says so a sound reaches the ear, as far as the browser knows. */
  get latency(): number {
    return this.ctx.outputLatency || this.ctx.baseLatency || 0;
  }

  setVolume(v: number): void {
    this.master.gain.setTargetAtTime(0.5 * v * v, this.ctx.currentTime, 0.02);
  }

  /** Replace the riff. If playing, the loop restarts from the top. */
  setRiff(riff: Riff): void {
    if (this.riff === riff) return;
    this.riff = riff;
    this.useLoop(riffLoop(riff));
  }

  /** Play a loop that is not a riff (a recording). */
  setLoop(loop: Loop): void {
    this.riff = null;
    this.useLoop(loop);
  }

  private useLoop(loop: Loop): void {
    this.loop = loop;
    if (this.playing) this.restart();
  }

  /** Replace every voice. If playing, the loop restarts from the top. */
  setVoices(sounds: readonly Sound[], selected = 0): void {
    for (const v of this.voices) v.dispose();
    const t = this.ctx.currentTime;
    this.voices = sounds.map((s) => new Voice(this.ctx, this.bus, s, t));
    this.selected = Math.min(selected, sounds.length - 1);
    this.voices.forEach((v, i) => v.setAudible(i === this.selected, t));
    if (this.playing) this.restart();
  }

  get voiceCount(): number {
    return this.voices.length;
  }

  setSound(i: number, sound: Sound): void {
    this.voices[i]?.setSound(sound);
  }

  /** Make voice `i` the audible one. */
  select(i: number): void {
    if (i === this.selected || !this.voices[i]) return;
    this.selected = i;
    const t = this.ctx.currentTime;
    this.voices.forEach((v, n) => v.setAudible(n === i, t));
  }

  start(): void {
    if (this.playing || !this.loop || this.loop.notes.length === 0) return;
    void this.ctx.resume();
    // Anything a keyboard left sounding gives way to the loop.
    const t = this.ctx.currentTime;
    for (const v of this.voices) v.silence(t);
    this.begin();
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
    this.onState?.();
  }

  stop(): void {
    if (this.timer == null) return;
    clearInterval(this.timer);
    this.timer = null;
    const t = this.ctx.currentTime;
    for (const v of this.voices) v.silence(t);
    this.onState?.();
  }

  toggle(): void {
    if (this.playing) this.stop();
    else this.start();
  }

  /**
   * A key went down (or, with null, the last one came up) on the audible
   * voice. The keyboard and the loop take turns: a key stops the loop.
   */
  key(midi: number | null, barSeconds = 2, vel = KEY_VELOCITY): void {
    const voice = this.voices[this.selected];
    if (!voice) return;
    if (this.playing) this.stop();
    void this.ctx.resume();
    const t = this.ctx.currentTime;
    if (midi == null) voice.keyUp(t);
    else voice.keyDown(t, midiToHz(midi), barSeconds, vel);
  }

  /** How hard the held key is leaned on, 0 to 1. */
  pressure(p: number): void {
    this.voices[this.selected]?.pressure(this.ctx.currentTime, p);
  }

  /** A metronome tick at `t` on the audio clock. */
  click(t: number, accent: boolean): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1760 : 1175;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(accent ? 0.5 : 0.3, t + 0.001);
    gain.gain.setTargetAtTime(0, t + 0.001, 0.012);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.08);
    osc.onended = () => {
      gain.disconnect();
      this.clicks = this.clicks.filter((o) => o !== osc);
    };
    this.clicks.push(osc);
  }

  /**
   * A few quick notes over the top of everything, for the arcade: one per
   * frequency, each a sixteenth of a second after the last.
   */
  chime(hz: readonly number[], type: OscillatorType = 'triangle', level = 0.25): void {
    const t = this.ctx.currentTime + 0.01;
    hz.forEach((f, i) => {
      const at = t + i * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(level, at + 0.004);
      gain.gain.setTargetAtTime(0, at + 0.004, 0.05);
      osc.connect(gain).connect(this.master);
      osc.start(at);
      osc.stop(at + 0.35);
      osc.onended = () => gain.disconnect();
    });
  }

  /** Drop every tick that has not sounded yet. */
  cancelClicks(): void {
    for (const osc of this.clicks) {
      try {
        osc.stop();
      } catch {
        // Already finished.
      }
    }
  }

  private begin(): void {
    this.passStart = this.ctx.currentTime + LEAD_IN;
    this.nextLoop = this.passStart;
    this.index = 0;
  }

  private restart(): void {
    const t = this.ctx.currentTime;
    for (const v of this.voices) v.silence(t);
    this.begin();
  }

  private tick(): void {
    const loop = this.loop;
    if (!loop || this.voices.length === 0) return;
    if (loop.notes.length === 0) {
      this.stop();
      return;
    }
    const now = this.ctx.currentTime;
    const horizon = now + HORIZON;
    const { notes, duration } = loop;

    // Fell behind (a long pause on the main thread): start the loop afresh
    // rather than fire a burst of late notes.
    if (this.passStart + notes[this.index].on < now - 0.05) this.restart();

    for (;;) {
      // A pass is announced to the voices only once every note of the pass
      // before it has been scheduled: a voice that restarts its oscillators at
      // the loop start has to know the pitch the last note left them at.
      if (this.index === 0 && this.passStart >= this.nextLoop - 1e-6 && this.passStart < horizon) {
        for (const v of this.voices) v.startLoop(this.passStart, duration, loop.barSeconds, loop.sixSeconds);
        this.nextLoop = this.passStart + duration;
      }
      const n = notes[this.index];
      const on = this.passStart + n.on;
      if (on >= horizon) break;
      const last = this.index + 1 === notes.length;
      const next = last ? this.passStart + duration + notes[0].on : this.passStart + notes[this.index + 1].on;
      const off = Math.min(this.passStart + n.off, next);
      const hz = midiToHz(n.midi);
      for (const v of this.voices) v.note(on, off, next, hz, n.vel, n.press, n.legato);
      this.index = last ? 0 : this.index + 1;
      if (last) this.passStart += duration;
    }
  }
}

let engine: Engine | null = null;

/**
 * The one engine, created on first use. Call this only from a user gesture: a
 * browser will not let an AudioContext made at page load make sound.
 */
export function getEngine(): Engine {
  engine ??= new Engine();
  return engine;
}

/** The engine if it exists yet, without creating it. */
export function peekEngine(): Engine | null {
  return engine;
}
