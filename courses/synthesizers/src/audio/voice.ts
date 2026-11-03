// One monophonic synth voice, built from native Web Audio nodes on any
// BaseAudioContext (so the same code can render offline for the audit page).
//
//   osc 1: saw ─┬──────────────────────────────┐
//               ├─ pulse = saw − delayed saw ──┤
//          tri ─┼──────────────────────────────┼─ wave select ─┐
//         sine ─┘                              ┘               ├─ (1) ─ LP ─ LP ─ amp ─ trem ─ (2) ─ echo ─ (3) ─ out
//   osc 2: the same again, a chosen interval and detune away ─ level ─┘
//   FM:    a sine at a ratio of the note ─ amount ─▶ the frequency of osc 1
//   noise: a looping buffer of white noise ─ level ─┘ (joins at the mix)
//
// (1), (2) and (3) are the three places the drive pedal can be plugged in:
// ahead of the filter, after the synth, or after the echo. There is a drive at
// each and the chain setting says which one is switched on, so moving the pedal
// is a crossfade between two of them rather than a rewiring.
//
// Every source runs all the time and the selectors only move gains, so a wave
// change is click-free. OscillatorNode has no pulse width; a pulse is a saw
// minus a copy of itself delayed by width / frequency, and that delay time is
// an AudioParam the LFO can reach.
//
// Filter modulation goes into `detune` (cents), not `frequency`, so an envelope
// amount of two octaves is two octaves at any cutoff. The filter is two biquads:
// two low-passes in series for the 24 dB low-pass; for the 12 dB modes the first
// becomes an all-pass (flat, so it changes nothing you hear) and the second
// takes the mode: low-pass, band-pass or high-pass.
//
// The LFO is an oscillator for the four smooth shapes and, for sample and hold,
// a looping buffer of held random levels read one level per cycle. Its levels
// come from a fixed seed, so two voices hold the same levels.
//
// The oscillators live in a "bank". With one oscillator its phase cannot be
// heard, and the bank made with the voice lasts for the voice's life. With two
// (or with FM) the phase between them is the sound: the beat of a detuned pair
// is at a different point in every voice whose knobs were turned at a different
// moment. So a voice that is using either extension swaps in a fresh bank at
// every loop start, all phases at zero, and two voices with the same settings
// are then the same signal from that loop start on. This is the oscillators'
// version of restarting the LFO with the loop.

import { noteEnvelope, type EnvEvent } from '../core/envelope';
import { CHAIN, FILTER_MODE, LFO_DEST, LFO_SHAPE, WAVE, type Sound } from '../core/params';
import { Rng } from '../core/rng';

/** Rough loudness matching between waves. */
const WAVE_GAIN = [0.8, 0.5, 1.1, 1.0];
const SMOOTH = 0.008;
/** How long one bank hands over to the next. */
const HANDOVER = 0.004;

/** Full LFO depth, per destination. */
const LFO_PITCH_CENTS = 100;
const LFO_CUTOFF_CENTS = 2400;
const LFO_WIDTH = 0.3;
/**
 * Tremolo: the gain swings between 1 and 1 − 2 × this. A straight line from
 * the depth knob made its first two steps a decibel or two, which cannot be
 * heard; the curve gives about 3, 7 and 13 dB, then all the way to silence.
 */
function tremolo(depth: number): number {
  return 0.5 * Math.pow(depth, 0.6);
}

function qToDb(q: number): number {
  // BiquadFilterNode's lowpass takes Q in decibels.
  return 20 * Math.log10(q);
}

/** The clipper's curve covers an input of plus or minus this much; past it the curve is flat. */
const CLIP_RANGE = 8;
const CLIP_CURVE = Float32Array.from({ length: 4097 }, (_, i) => Math.tanh(CLIP_RANGE * (i / 2048 - 1)));
/** The level a note typically reaches the pedal at, which is the level its loudness is held at. */
const DRIVE_REFERENCE = 0.5;
/** In free play the pedal fades in over its first few decibels instead of switching on. */
const DRIVE_FADE_DB = 4;

/**
 * What to turn the clipped signal down by. Clipping makes a wave squarer, and a
 * square is louder than a sine of the same height; without this, more drive
 * would mostly be heard as more volume.
 */
function driveMakeup(gain: number): number {
  const n = 64;
  let power = 0;
  for (let i = 0; i < n; i++) {
    const y = Math.tanh(gain * DRIVE_REFERENCE * Math.sin((2 * Math.PI * (i + 0.5)) / n));
    power += y * y;
  }
  return DRIVE_REFERENCE / Math.SQRT2 / Math.sqrt(power / n);
}

type Setter = (param: AudioParam, value: number) => void;

/** Seconds of white noise, looped. Long enough that the loop is not heard as a rhythm. */
const NOISE_SECONDS = 2;
/** Full noise level, against the saw's 0.8: about as loud as a saw. */
const NOISE_GAIN = 0.8;
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
    const data = buf.getChannelData(0);
    const rng = new Rng(0x6e6f6973);
    for (let i = 0; i < data.length; i++) data[i] = rng.next() * 2 - 1;
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

/** Sample and hold: this many held levels in one loop of its buffer, and this many samples per level. */
const SH_LEVELS = 64;
const SH_SAMPLES = 128;
const shBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function shBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = shBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, SH_LEVELS * SH_SAMPLES, ctx.sampleRate);
    const data = buf.getChannelData(0);
    const rng = new Rng(0x73682121);
    for (let k = 0; k < SH_LEVELS; k++) data.fill(rng.next() * 2 - 1, k * SH_SAMPLES, (k + 1) * SH_SAMPLES);
    shBuffers.set(ctx, buf);
  }
  return buf;
}

const LFO_TYPES: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square'];

/** An LFO source: an oscillator, or the sample-and-hold buffer. */
interface Lfo {
  node: OscillatorNode | AudioBufferSourceNode;
  sh: boolean;
  stopAt: number | null;
}

/**
 * A drive pedal: gain into a soft clipper, then a tone control. Bypassed, the
 * signal goes round it untouched.
 */
class Drive {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly pre: GainNode;
  private readonly tone: BiquadFilterNode;
  private readonly wet: GainNode;
  private readonly dry: GainNode;

  constructor(ctx: BaseAudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.pre = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.curve = CLIP_CURVE;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.Q.value = qToDb(Math.SQRT1_2);
    this.wet = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet.gain.value = 0;
    this.input.connect(this.dry).connect(this.output);
    this.input.connect(this.pre).connect(shaper).connect(this.tone).connect(this.wet).connect(this.output);
  }

  /** `db` of zero is the pedal switched off. */
  set(db: number, toneHz: number, set: Setter): void {
    const on = Math.min(1, db / DRIVE_FADE_DB);
    const gain = Math.pow(10, db / 20);
    set(this.pre.gain, gain / CLIP_RANGE);
    set(this.tone.frequency, toneHz);
    set(this.wet.gain, on * driveMakeup(gain));
    set(this.dry.gain, 1 - on);
  }
}

/** How dark each repeat is against the one before it, as on a tape echo. */
const ECHO_DAMP_HZ = 4500;

/** An echo pedal: the note goes straight through, and a delayed copy comes round again and again. */
class Echo {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly delay: DelayNode;
  private readonly send: GainNode;
  private readonly feedback: GainNode;
  private readonly damp: BiquadFilterNode;

  constructor(ctx: BaseAudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.send = ctx.createGain();
    this.send.gain.value = 0;
    // Room for a quarter note at the slowest tempo free play allows.
    this.delay = ctx.createDelay(2);
    this.damp = ctx.createBiquadFilter();
    this.damp.type = 'lowpass';
    this.damp.frequency.value = ECHO_DAMP_HZ;
    this.damp.Q.value = qToDb(Math.SQRT1_2);
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0;
    this.input.connect(this.output);
    this.input.connect(this.send).connect(this.delay).connect(this.damp).connect(this.output);
    this.damp.connect(this.feedback).connect(this.delay);
  }

  set(mix: number, repeats: number, seconds: number, set: Setter): void {
    set(this.send.gain, mix);
    set(this.feedback.gain, repeats);
    set(this.delay.delayTime, seconds);
  }

  /** Break the loop the repeats go round, so nothing keeps it alive. */
  dispose(): void {
    this.feedback.disconnect();
    this.damp.disconnect();
  }
}

interface Bank {
  /** Saw, triangle, sine. */
  o1: OscillatorNode[];
  o2: OscillatorNode[];
  mod: OscillatorNode;
  /** Modulator into oscillator 1's frequency: the deviation, in Hz. */
  modGain: GainNode;
  /** One per audible oscillator, for the hand-over. */
  fades: GainNode[];
  /** When it starts to sound. */
  from: number;
}

export class Voice {
  /** Audible-or-not gain; the engine crossfades these for A/B. */
  readonly out: GainNode;

  private banks: Bank[] = [];
  /** Where a bank's saw, triangle and sine arrive. */
  private readonly in1: GainNode[];
  private readonly in2: GainNode[];
  private readonly waveGains: GainNode[];
  private readonly wave2Gains: GainNode[];
  private readonly delay: DelayNode;
  private readonly delay2: DelayNode;
  private readonly level2: GainNode;
  /** Both oscillators together, before anything shapes them. */
  private readonly mix: GainNode;
  /** One drive at each place the pedal can sit, indexed by CHAIN. */
  private readonly drives: Drive[];
  private readonly echo: Echo;
  private readonly f1: BiquadFilterNode;
  private readonly f2: BiquadFilterNode;
  private readonly amp: GainNode;
  private readonly trem: GainNode;
  private readonly makeup: GainNode;
  private readonly envSrc: ConstantSourceNode;
  private readonly envToFilter: GainNode;
  private readonly lfoBus: GainNode;
  private readonly lfoPitch: GainNode;
  private readonly lfoCut: GainNode;
  private readonly lfoPw: GainNode;
  private readonly lfoPw2: GainNode;
  private readonly lfoLevel: GainNode;

  private readonly noiseLevel: GainNode;
  private readonly noiseSrc: AudioBufferSourceNode;

  private lfos: Lfo[] = [];
  private barSeconds = 2;
  private sixSeconds = 0.125;
  /** Notes already scheduled, so a knob can re-aim what depends on their pitch. */
  private pending: { on: number; hz: number }[] = [];
  private lastHz = 220;
  /** Envelope level the last scheduled note leaves behind at the next one's start. */
  private level = 0;
  /** Played from the keyboard: a free-running LFO is going. */
  private live = false;

  constructor(
    private readonly ctx: BaseAudioContext,
    dest: AudioNode,
    private sound: Sound,
    startAt: number,
  ) {
    const gain = (value: number) => {
      const g = ctx.createGain();
      g.gain.value = value;
      return g;
    };

    // Pulse: saw minus delayed saw. Zero mean, whatever the width.
    const pulseOf = (saw: AudioNode, delay: DelayNode) => {
      const inverted = gain(-1);
      const pulse = gain(1);
      saw.connect(pulse);
      saw.connect(delay).connect(inverted).connect(pulse);
      return pulse;
    };
    const selectorFor = (inputs: GainNode[], delay: DelayNode) => {
      const gains = [gain(0), gain(0), gain(0), gain(0)];
      inputs[0].connect(gains[WAVE.saw]);
      pulseOf(inputs[0], delay).connect(gains[WAVE.pulse]);
      inputs[1].connect(gains[WAVE.triangle]);
      inputs[2].connect(gains[WAVE.sine]);
      return gains;
    };

    this.in1 = [gain(1), gain(1), gain(1)];
    this.in2 = [gain(1), gain(1), gain(1)];
    this.delay = ctx.createDelay(0.1);
    this.delay2 = ctx.createDelay(0.1);
    this.waveGains = selectorFor(this.in1, this.delay);
    this.wave2Gains = selectorFor(this.in2, this.delay2);
    this.level2 = gain(0);

    // 24 dB/octave: two low-passes in series, the resonance on the second.
    this.f1 = ctx.createBiquadFilter();
    this.f2 = ctx.createBiquadFilter();
    this.f1.type = this.f2.type = 'lowpass';
    this.f1.Q.value = qToDb(Math.SQRT1_2);
    this.mix = gain(1);
    for (const g of this.waveGains) g.connect(this.mix);
    for (const g of this.wave2Gains) g.connect(this.level2);
    this.level2.connect(this.mix);

    // Noise runs all the time, like the oscillators; its level is the switch.
    this.noiseSrc = ctx.createBufferSource();
    this.noiseSrc.buffer = noiseBuffer(ctx);
    this.noiseSrc.loop = true;
    this.noiseLevel = gain(0);
    this.noiseSrc.connect(this.noiseLevel).connect(this.mix);
    this.noiseSrc.start(startAt);

    this.amp = gain(0);
    this.trem = gain(1);
    this.makeup = gain(1);
    this.out = gain(0);
    this.drives = [new Drive(ctx), new Drive(ctx), new Drive(ctx)];
    this.echo = new Echo(ctx);
    const first = this.drives[CHAIN.first];
    const middle = this.drives[CHAIN.middle];
    const last = this.drives[CHAIN.last];
    this.mix.connect(first.input);
    first.output.connect(this.f1).connect(this.f2).connect(this.amp).connect(this.trem).connect(this.makeup).connect(middle.input);
    middle.output.connect(this.echo.input);
    this.echo.output.connect(last.input);
    last.output.connect(this.out).connect(dest);

    // The filter follows the same envelope as the amp, scaled by the amount.
    this.envSrc = ctx.createConstantSource();
    this.envSrc.offset.value = 0;
    this.envSrc.start(startAt);
    this.envToFilter = gain(0);
    this.envSrc.connect(this.envToFilter);
    this.envToFilter.connect(this.f1.detune);
    this.envToFilter.connect(this.f2.detune);

    // A fresh LFO oscillator is plugged into this bus at every loop start.
    this.lfoBus = gain(1);
    this.lfoPitch = gain(0);
    this.lfoCut = gain(0);
    this.lfoPw = gain(0);
    this.lfoPw2 = gain(0);
    this.lfoLevel = gain(0);
    for (const g of [this.lfoPitch, this.lfoCut, this.lfoPw, this.lfoPw2, this.lfoLevel]) this.lfoBus.connect(g);
    this.lfoCut.connect(this.f1.detune);
    this.lfoCut.connect(this.f2.detune);
    this.lfoPw.connect(this.delay.delayTime);
    this.lfoPw2.connect(this.delay2.delayTime);
    this.lfoLevel.connect(this.trem.gain);

    this.banks.push(this.makeBank(startAt, 1));
    this.apply(startAt, true);
  }

  private makeBank(t: number, fade: number): Bank {
    const { ctx } = this;
    const s = this.sound;
    const osc = (type: OscillatorType, hz: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz;
      o.start(t);
      return o;
    };
    const types: OscillatorType[] = ['sawtooth', 'triangle', 'sine'];
    const o1 = types.map((type) => osc(type, this.lastHz));
    const o2 = types.map((type) => osc(type, this.lastHz));
    const mod = osc('sine', this.lastHz * s.fmRatio);
    const modGain = ctx.createGain();
    modGain.gain.value = s.fmAmount * s.fmRatio * this.lastHz;
    mod.connect(modGain);

    const fades: GainNode[] = [];
    const wire = (o: OscillatorNode, to: GainNode) => {
      const g = ctx.createGain();
      g.gain.value = fade;
      o.connect(g).connect(to);
      fades.push(g);
      this.lfoPitch.connect(o.detune);
    };
    o1.forEach((o, i) => {
      wire(o, this.in1[i]);
      modGain.connect(o.frequency);
    });
    o2.forEach((o, i) => {
      wire(o, this.in2[i]);
      o.detune.value = s.osc2Interval + s.osc2Detune;
    });
    // Vibrato moves the modulator too, so the ratio holds.
    this.lfoPitch.connect(mod.detune);
    return { o1, o2, mod, modGain, fades, from: t };
  }

  private dropBank(bank: Bank, at: number): void {
    const all = [...bank.o1, ...bank.o2, bank.mod];
    bank.mod.onended = () => {
      for (const o of all) {
        o.disconnect();
        this.lfoPitch.disconnect(o.detune);
      }
      for (const g of bank.fades) g.disconnect();
      bank.modGain.disconnect();
      this.banks = this.banks.filter((b) => b !== bank);
    };
    for (const o of all) {
      try {
        o.stop(at);
      } catch {
        // Already stopped.
      }
    }
  }

  /** Is the phase between oscillators part of this sound? */
  private layered(): boolean {
    return this.sound.osc2Level > 0 || this.sound.fmAmount > 0;
  }

  /** Hand over to a fresh bank at `t`, every phase at zero. */
  private renew(t: number): void {
    const old = this.banks[this.banks.length - 1];
    const next = this.makeBank(t, 0);
    for (const g of next.fades) {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + HANDOVER);
    }
    for (const g of old.fades) {
      g.gain.setValueAtTime(1, t);
      g.gain.linearRampToValueAtTime(0, t + HANDOVER);
    }
    this.dropBank(old, t + HANDOVER + 0.002);
    this.banks.push(next);
  }

  /** The bank that is sounding at `t`. */
  private bankAt(t: number): Bank {
    for (let i = this.banks.length - 1; i > 0; i--) if (this.banks[i].from <= t) return this.banks[i];
    return this.banks[0];
  }

  setSound(sound: Sound, when = this.ctx.currentTime): void {
    this.sound = sound;
    this.apply(when, false);
  }

  /** How far the LFO may swing the pulse width without it closing up. */
  private widthSwing(): number {
    const s = this.sound;
    if (s.lfoDest !== LFO_DEST.pw) return 0;
    return Math.min(s.lfoDepth * LFO_WIDTH, Math.max(0, s.pw - 0.04));
  }

  /** Oscillator 2's pitch as a multiple of oscillator 1's. */
  private ratio2(): number {
    return Math.pow(2, (this.sound.osc2Interval + this.sound.osc2Detune) / 1200);
  }

  /**
   * Everything that is set per note because it depends on the note's pitch: the
   * two pulse-width delays with their LFO swings, and the FM modulator.
   */
  private aim(t: number, hz: number, tau: number): void {
    const s = this.sound;
    const swing = this.widthSwing();
    const hz2 = hz * this.ratio2();
    this.delay.delayTime.setTargetAtTime(s.pw / hz, t, tau);
    this.lfoPw.gain.setTargetAtTime(swing / hz, t, tau);
    this.delay2.delayTime.setTargetAtTime(s.pw / hz2, t, tau);
    this.lfoPw2.gain.setTargetAtTime(swing / hz2, t, tau);
    const bank = this.bankAt(t);
    bank.mod.frequency.setTargetAtTime(hz * s.fmRatio, t, tau);
    bank.modGain.gain.setTargetAtTime(s.fmAmount * s.fmRatio * hz, t, tau);
  }

  private apply(t: number, immediate: boolean): void {
    const s = this.sound;
    const set = (p: AudioParam, v: number) => {
      if (immediate) p.setValueAtTime(v, t);
      else {
        p.cancelScheduledValues(t);
        p.setTargetAtTime(v, t, SMOOTH);
      }
    };

    const wave = Math.round(s.wave);
    this.waveGains.forEach((g, i) => set(g.gain, i === wave ? WAVE_GAIN[i] : 0));
    this.wave2Gains.forEach((g, i) => set(g.gain, i === wave ? WAVE_GAIN[i] : 0));
    set(this.level2.gain, s.osc2Level);
    for (const bank of this.banks) for (const o of bank.o2) set(o.detune, s.osc2Interval + s.osc2Detune);

    const mode = Math.round(s.filterMode);
    const f2Type: BiquadFilterType = mode === FILTER_MODE.bp ? 'bandpass' : mode === FILTER_MODE.hp ? 'highpass' : 'lowpass';
    const f1Type: BiquadFilterType = mode === FILTER_MODE.lp24 ? 'lowpass' : 'allpass';
    if (this.f1.type !== f1Type) this.f1.type = f1Type;
    if (this.f2.type !== f2Type) this.f2.type = f2Type;
    set(this.f1.frequency, s.cutoff);
    set(this.f2.frequency, s.cutoff);
    // Low- and high-pass take Q in decibels; band-pass takes it as it is, and
    // at Q 0.7 a band-pass is too wide to hear as one, so its floor is higher.
    set(this.f2.Q, mode === FILTER_MODE.bp ? Math.max(1, s.res) : qToDb(Math.max(0.5, s.res)));
    set(this.noiseLevel.gain, s.noise * NOISE_GAIN);
    // Two oscillators are loud, and so is a high resonance on an open filter;
    // take some back. Two detuned oscillators add as powers. The oscillators
    // are levelled where they meet, so a drive ahead of the filter is pushed
    // no harder by two of them than by one.
    set(this.mix.gain, 1 / Math.sqrt(1 + s.osc2Level * s.osc2Level));
    set(this.makeup.gain, 1 / (1 + 0.05 * Math.max(0, s.res - 0.7)));
    set(this.envToFilter.gain, s.envAmt * 1200);

    const place = Math.round(s.chain);
    this.drives.forEach((drive, i) => drive.set(i === place ? s.drive : 0, s.driveTone, set));
    this.echo.set(s.echoMix, s.echoRepeats, s.echoTime * this.sixSeconds, set);

    const dest = Math.round(s.lfoDest);
    set(this.lfoPitch.gain, dest === LFO_DEST.pitch ? s.lfoDepth * LFO_PITCH_CENTS : 0);
    set(this.lfoCut.gain, dest === LFO_DEST.cutoff ? s.lfoDepth * LFO_CUTOFF_CENTS : 0);
    const trem = dest === LFO_DEST.level ? tremolo(s.lfoDepth) : 0;
    set(this.lfoLevel.gain, trem);
    set(this.trem.gain, 1 - trem);
    const sh = Math.round(s.lfoShape) === LFO_SHAPE.sh;
    for (const lfo of [...this.lfos]) {
      if (lfo.sh !== sh) {
        // Between an oscillator and the held levels: swap the source over.
        this.stopLfo(lfo, t);
        this.startLfo(t, lfo.stopAt);
      } else this.rateLfo(lfo, t);
    }

    // The pitch-dependent settings: re-aim now, and again for each note that
    // has already been scheduled.
    this.pending = this.pending.filter((n) => n.on > t - 4);
    if (!immediate) {
      for (const p of [this.delay.delayTime, this.lfoPw.gain, this.delay2.delayTime, this.lfoPw2.gain]) p.cancelScheduledValues(t);
      for (const bank of this.banks) {
        bank.mod.frequency.cancelScheduledValues(t);
        bank.modGain.gain.cancelScheduledValues(t);
      }
    }
    let current = this.lastHz;
    for (const n of this.pending) if (n.on <= t) current = n.hz;
    this.aim(t, current, 0.003);
    for (const n of this.pending) if (n.on > t) this.aim(n.on, n.hz, 0.002);
  }

  private startLfo(t: number, stopAt: number | null): void {
    const s = this.sound;
    const shape = Math.round(s.lfoShape);
    let node: OscillatorNode | AudioBufferSourceNode;
    if (shape === LFO_SHAPE.sh) {
      const src = this.ctx.createBufferSource();
      src.buffer = shBuffer(this.ctx);
      src.loop = true;
      node = src;
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = LFO_TYPES[shape] ?? 'sine';
      node = osc;
    }
    const lfo: Lfo = { node, sh: shape === LFO_SHAPE.sh, stopAt };
    this.rateLfo(lfo, t, true);
    node.connect(this.lfoBus);
    node.start(t);
    if (stopAt != null && stopAt > t) node.stop(stopAt);
    node.onended = () => {
      node.disconnect();
      this.lfos = this.lfos.filter((o) => o !== lfo);
    };
    this.lfos.push(lfo);
  }

  /** Set an LFO's speed, and its shape if it is an oscillator. */
  private rateLfo(lfo: Lfo, t: number, first = false): void {
    const hz = this.sound.lfoRate / this.barSeconds;
    if (lfo.node instanceof AudioBufferSourceNode) {
      // One held level per cycle.
      const rate = (hz * SH_SAMPLES) / this.ctx.sampleRate;
      if (first) lfo.node.playbackRate.value = rate;
      else lfo.node.playbackRate.setValueAtTime(rate, t);
    } else {
      const type = LFO_TYPES[Math.round(this.sound.lfoShape)] ?? 'sine';
      if (lfo.node.type !== type) lfo.node.type = type;
      if (first) lfo.node.frequency.value = hz;
      else lfo.node.frequency.setValueAtTime(hz, t);
    }
  }

  private stopLfo(lfo: Lfo, t: number): void {
    try {
      lfo.node.stop(t);
    } catch {
      // Not started yet, or already stopped: either way it is going away.
    }
  }

  /** The echo counts its gap in sixteenths, so it follows the tempo. */
  private setTempo(t: number, sixSeconds: number): void {
    if (sixSeconds === this.sixSeconds) return;
    this.sixSeconds = sixSeconds;
    this.echo.delay.delayTime.setTargetAtTime(this.sound.echoTime * sixSeconds, t, SMOOTH);
  }

  /**
   * A loop pass starts at `t`: restart the LFO in phase with it, and the
   * oscillators too if their phase can be heard. Call once per pass, ahead of
   * time, after the previous pass's notes have been scheduled.
   */
  startLoop(t: number, duration: number, barSeconds: number, sixSeconds = barSeconds / 16): void {
    this.barSeconds = barSeconds;
    this.setTempo(t, sixSeconds);
    this.startLfo(t, t + duration);
    if (this.layered()) this.renew(t);
  }

  /**
   * Schedule one note. `off` is the key release and `next` the following note's
   * start; the envelope is cut at `next`, so nothing ever needs cancelling.
   */
  note(on: number, off: number, next: number, hz: number): void {
    const bank = this.bankAt(on);
    this.pitch(bank, on, hz);
    this.aim(on, hz, this.glideTau());
    this.pending.push({ on, hz });
    this.lastHz = hz;

    const { events, end } = noteEnvelope(this.level, on, off, next, this.sound);
    this.level = end;
    this.play(this.amp.gain, events);
    this.play(this.envSrc.offset, events);
  }

  /** The time constant a glide approaches the new pitch with; a tiny one is no glide. */
  private glideTau(): number {
    return this.sound.glide > 0 ? this.sound.glide / 3 : 0.002;
  }

  /** Move the oscillators to a note's pitch at `t`: at once, or gliding from the last note's. */
  private pitch(bank: Bank, t: number, hz: number): void {
    for (const o of [...bank.o1, ...bank.o2]) {
      if (this.sound.glide > 0) {
        o.frequency.setValueAtTime(this.lastHz, t);
        o.frequency.setTargetAtTime(hz, t, this.glideTau());
      } else o.frequency.setValueAtTime(hz, t);
    }
  }

  private play(param: AudioParam, events: readonly EnvEvent[]): void {
    for (const e of events) {
      if (e.kind === 'set') param.setValueAtTime(e.v, e.t);
      else if (e.kind === 'ramp') param.linearRampToValueAtTime(e.v, e.t);
      else param.setTargetAtTime(e.v, e.t, Math.max(e.tau, 0.0005));
    }
  }

  /**
   * A key went down, now: free play's keyboard. Nothing is known in advance
   * here, so the envelope is a chain of exponential approaches, each of which
   * carries on from wherever the level is.
   */
  keyDown(t: number, hz: number, barSeconds: number): void {
    const s = this.sound;
    if (!this.live) {
      this.live = true;
      this.barSeconds = barSeconds;
      this.setTempo(t, barSeconds / 16);
      this.startLfo(t, null);
    }
    const bank = this.bankAt(t);
    for (const o of [...bank.o1, ...bank.o2]) {
      o.frequency.cancelScheduledValues(t);
      if (s.glide > 0) o.frequency.setTargetAtTime(hz, t, this.glideTau());
      else o.frequency.setValueAtTime(hz, t);
    }
    this.pending = [{ on: t, hz }];
    this.lastHz = hz;
    this.aim(t, hz, this.glideTau());
    for (const p of [this.amp.gain, this.envSrc.offset]) {
      p.cancelScheduledValues(t);
      p.setTargetAtTime(1, t, Math.max(s.attack / 3, 0.0005));
      p.setTargetAtTime(s.sustain, t + s.attack, Math.max(s.decay / 3, 0.0005));
    }
  }

  keyUp(t: number): void {
    for (const p of [this.amp.gain, this.envSrc.offset]) {
      p.cancelScheduledValues(t);
      p.setTargetAtTime(0, t, Math.max(this.sound.release / 3, 0.0005));
    }
  }

  /** Drop everything scheduled and fade to silence. */
  silence(t: number): void {
    for (const p of [this.amp.gain, this.envSrc.offset]) {
      p.cancelScheduledValues(t);
      p.setTargetAtTime(0, t, 0.01);
    }
    for (const lfo of this.lfos) this.stopLfo(lfo, t);
    this.pending = [];
    this.level = 0;
    this.live = false;
  }

  setAudible(on: boolean, t: number): void {
    // 15 ms crossfade: three time constants.
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(on ? 1 : 0, t, 0.005);
  }

  dispose(): void {
    const t = this.ctx.currentTime;
    this.silence(t);
    this.out.gain.setTargetAtTime(0, t, 0.005);
    // Let the fade finish before pulling the plug.
    for (const bank of this.banks) this.dropBank(bank, t + 0.12);
    setTimeout(() => {
      this.envSrc.stop();
      this.envSrc.disconnect();
      this.noiseSrc.stop();
      this.noiseSrc.disconnect();
      this.echo.dispose();
      this.out.disconnect();
    }, 140);
  }
}
