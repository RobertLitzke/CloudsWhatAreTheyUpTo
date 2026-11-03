// How far a sound gets along the synth: a rough estimate, stage by stage, of
// how much of a note survives the oscillators, the filter and the amplifier.
// Lesson 10's signal strip lights up as far as the sound gets and goes dark
// where it dies. It is arithmetic on the knob settings, not a measurement:
// good enough to say "the filter has shut it out", not to the decibel.

import { FILTER_MODE, WAVE, type Sound } from './params';

export interface Reach {
  /** Level leaving each stage, in decibels against a plain saw on an open filter. */
  osc: number;
  filter: number;
  amp: number;
  /** The first stage the sound does not get through, or null if it is heard. */
  dies: Stage | null;
  /** The first stage that leaves it faint, or null. */
  fades: Stage | null;
}

export type Stage = 'osc' | 'filter' | 'amp';

/** Below this the strip calls a stage dark. Quiet, not silent; a phone speaker loses it. */
export const DEAD_DB = -30;
/** Below this, faint: there, but easy to miss. */
export const FAINT_DB = -10;

const HARMONICS = 48;

/** Squared amplitude of harmonic k (1-based) for each wave. */
function harmonicPower(wave: number, k: number): number {
  switch (wave) {
    case WAVE.saw:
    case WAVE.pulse:
      return 1 / (k * k);
    case WAVE.triangle:
      return k % 2 ? 1 / k ** 4 : 0;
    default:
      return k === 1 ? 1 : 0;
  }
}

/** The filter's gain, squared, at `f` Hz, ignoring the resonant peak except for band-pass width. */
function filterPower(s: Sound, f: number, cutoff: number): number {
  const r = f / cutoff;
  switch (Math.round(s.filterMode)) {
    case FILTER_MODE.lp12:
      return 1 / (1 + r ** 4);
    case FILTER_MODE.bp: {
      const q = Math.max(1, s.res);
      return 1 / (1 + q * q * (r - 1 / r) ** 2);
    }
    case FILTER_MODE.hp:
      return 1 / (1 + r ** -4);
    default:
      return 1 / (1 + r ** 8);
  }
}

/** The mean level of the envelope over a note held for `held` seconds, squared. */
function envelopePower(s: Sound, held: number): number {
  const n = 200;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * held;
    let v: number;
    if (t < s.attack) v = t / Math.max(s.attack, 1e-4);
    else v = s.sustain + (1 - s.sustain) * Math.exp(-(t - s.attack) / Math.max(s.decay / 3, 1e-4));
    sum += v * v;
  }
  return sum / n;
}

const db = (power: number) => 10 * Math.log10(Math.max(power, 1e-12));

/**
 * @param hz a typical note's pitch
 * @param held how long a typical note is held, in seconds
 */
export function reach(s: Sound, hz = 220, held = 0.3): Reach {
  // The source: the oscillator's harmonics plus the noise, as power per band.
  const wave = Math.round(s.wave);
  // Each wave's gain in the voice times its RMS, against the saw's.
  const level = [0.8 * 0.577, 0.5 * 1, 1.1 * 0.577, 1.0 * 0.707][wave] ?? 0.46;
  const oscPower = (s.oscLevel * level / (0.8 * 0.577)) ** 2;
  // White noise at full level is about as loud as the saw.
  const noisePower = s.noise ** 2;
  const waveTotal = Array.from({ length: HARMONICS }, (_, i) => harmonicPower(wave, i + 1)).reduce((x, y) => x + y, 0);
  const osc = db(oscPower + noisePower);

  // The filter at the top of its envelope.
  const cutoff = Math.min(20000, s.cutoff * Math.pow(2, s.envAmt));
  let passed = 0;
  for (let k = 1; k <= HARMONICS; k++) {
    const f = hz * k;
    if (f > 20000) break;
    passed += (oscPower * harmonicPower(wave, k)) / waveTotal * filterPower(s, f, cutoff);
  }
  // Noise: equal power per octave band would be pink; white has power in
  // proportion to bandwidth. Sum it over log-spaced bands from 40 Hz to 16 kHz.
  const bands = 40;
  let noiseShare = 0;
  let noiseWhole = 0;
  for (let i = 0; i < bands; i++) {
    const lo = 40 * Math.pow(400, i / bands);
    const hi = 40 * Math.pow(400, (i + 1) / bands);
    const mid = Math.sqrt(lo * hi);
    noiseWhole += hi - lo;
    noiseShare += (hi - lo) * filterPower(s, mid, cutoff);
  }
  passed += noisePower * (noiseShare / noiseWhole);
  const filter = db(passed);

  const amp = db(passed * envelopePower(s, held));
  const first = (floor: number): Stage | null => (osc < floor ? 'osc' : filter < floor ? 'filter' : amp < floor ? 'amp' : null);
  return { osc, filter, amp, dies: first(DEAD_DB), fades: first(FAINT_DB) };
}
