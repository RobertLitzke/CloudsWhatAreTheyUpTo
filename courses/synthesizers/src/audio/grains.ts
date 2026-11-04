// Granular playback (branch lesson O6): many short, overlapping crumbs of a
// sample, each faded in and out, together making one sound. Shared by the
// synth's grains engine and the lesson's figure.

/** A grain's fade: a Hann window, the smooth hump that makes a crumb start and end without a click. */
const HANN = Float32Array.from({ length: 64 }, (_, i) => Math.sin((Math.PI * i) / 63) ** 2);

export interface GrainSettings {
  /** Where in the sample the grains are taken from, 0 to 1. */
  position: number;
  /** Each grain's length, in seconds. */
  size: number;
  /** Grains started each second. */
  density: number;
  /** How far, in seconds either way, each grain's place is scattered. */
  scatter: number;
  /** Playback rate: 1 plays the sample at its own pitch. */
  rate: number;
}

/** The engine knobs as grain settings: Wave the place, Timbre the size, Shape the density and scatter. */
export function grainSettings(wave: number, timbre: number, shape: number, rate: number): GrainSettings {
  return {
    position: wave,
    size: 0.012 * Math.pow(200 / 12, timbre),
    density: 12 + 68 * shape,
    scatter: 0.25 * shape * shape,
    rate,
  };
}

/** A small, fixed random sequence, so two runs scatter the same way. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Schedule grains from `from` until `until` into `dest`. Returns the players,
 * so they can be stopped early (a key let go).
 */
export function scheduleGrains(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  dest: AudioNode,
  from: number,
  until: number,
  g: GrainSettings,
  seed = 1,
): AudioBufferSourceNode[] {
  const random = rng(seed);
  const out: AudioBufferSourceNode[] = [];
  const gap = 1 / g.density;
  // Overlapping grains add up; keep the level about the same whatever the density.
  const level = 0.9 / Math.sqrt(Math.max(1, g.size * g.density));
  const span = buffer.duration;
  for (let t = from, n = 0; t < until && n < 2000; t += gap * (0.7 + 0.6 * random()), n++) {
    const length = Math.min(g.size, until - t);
    if (length < 0.004) break;
    const centre = g.position * span * 0.85 + (random() * 2 - 1) * g.scatter;
    const offset = Math.min(span - g.size * g.rate, Math.max(0, centre));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = g.rate;
    const env = ctx.createGain();
    env.gain.value = 0;
    env.gain.setValueCurveAtTime(HANN.map((v) => v * level), t, length);
    src.connect(env).connect(dest);
    src.onended = () => {
      src.disconnect();
      env.disconnect();
    };
    src.start(t, offset);
    src.stop(t + length + 0.001);
    out.push(src);
  }
  return out;
}
