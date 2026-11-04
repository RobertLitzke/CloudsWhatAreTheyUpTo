// The sample engine's one sample (branch lesson O5): a short sung "wow",
// made here rather than recorded, so it needs no file and no licence. A buzz
// at 220 Hz with a little vibrato goes through two formants that move from
// "oo" to "ah" and back, with a breath at the start. Stored as numbers it is
// a recording like any other: the engine only plays it back.

import { formantsAt } from './vowels';

export const SAMPLE_RATE = 44100;
export const SAMPLE_SECONDS = 1.4;
/** The pitch it was "sung" at: played back at this note, it plays at its own speed. */
export const SAMPLE_HZ = 220;

/** A two-pole resonator's coefficients, for a formant at `f` with bandwidth `bw`. */
function resonator(f: number, bw: number): [number, number, number] {
  const r = Math.exp((-Math.PI * bw) / SAMPLE_RATE);
  const a1 = 2 * r * Math.cos((2 * Math.PI * f) / SAMPLE_RATE);
  const a2 = -r * r;
  return [1 - r, a1, a2];
}

let made: Float32Array | null = null;

export function sampleData(): Float32Array {
  if (made) return made;
  const n = Math.round(SAMPLE_RATE * SAMPLE_SECONDS);
  const out = new Float32Array(n);
  let phase = 0;
  let seed = 99;
  const y1 = [0, 0];
  const y2 = [0, 0];
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const u = t / SAMPLE_SECONDS;
    // Vibrato that grows as the note goes on.
    const hz = SAMPLE_HZ * Math.pow(2, (0.25 * Math.min(1, t / 0.6) * Math.sin(2 * Math.PI * 5.5 * t)) / 12);
    phase = (phase + hz / SAMPLE_RATE) % 1;
    const buzz = 2 * phase - 1;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const hiss = seed / 2147483648 - 1;
    const breath = Math.exp(-t / 0.05) * 0.8;
    const src = buzz * (1 - breath) + hiss * breath;
    // oo → ah → oo: the vowel place runs 1 → 0.5 → 1.
    const { f1, f2 } = formantsAt(1 - 0.5 * Math.sin(Math.PI * u));
    let s = 0;
    [f1, f2].forEach((f, k) => {
      const [g, a1, a2] = resonator(f, 80 + 40 * k);
      const y = g * src + a1 * y1[k] + a2 * y2[k];
      y2[k] = y1[k];
      y1[k] = y;
      s += y * (k ? 0.7 : 1);
    });
    const env = Math.min(1, t / 0.03) * Math.min(1, (SAMPLE_SECONDS - t) / 0.15);
    out[i] = s * env;
    peak = Math.max(peak, Math.abs(out[i]));
  }
  for (let i = 0; i < n; i++) out[i] *= 0.8 / peak;
  made = out;
  return out;
}
