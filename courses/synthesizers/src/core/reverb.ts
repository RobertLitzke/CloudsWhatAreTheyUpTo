// Reverb (branch lesson S1): the answer of a room, a plate or a spring to a
// single click, its impulse response, made here from noise rather than
// measured. The voice convolves the sound with it; the lesson's figure draws
// and plays the same responses.

export const REVERB_TYPES = ['Room', 'Plate', 'Spring'] as const;
export const REVERB = { room: 0, plate: 1, spring: 2 } as const;

/** Sabine's reverberation time: seconds for a sound to die away by 60 dB, from the volume (m³) and the absorption (m² of open window). */
export function sabine(volume: number, absorption: number): number {
  return (0.161 * volume) / Math.max(0.01, absorption);
}

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };
}

/**
 * An impulse response `seconds` long to 60 dB down, at `rate`. A room has a
 * gap, a few distinct early reflections and then a tail that darkens as it
 * dies (air and walls take the highs first); a plate starts dense and bright
 * at once; a spring rings with a twang that repeats as the wave runs up and
 * down the spring.
 */
export function impulse(type: number, seconds: number, rate: number): Float32Array {
  const len = Math.max(1, Math.round(rate * Math.min(8, seconds * 1.1)));
  const out = new Float32Array(len);
  const noise = rng(17 + type);
  const k = Math.log(1000) / seconds; // 60 dB in `seconds`
  if (type === REVERB.spring) {
    // A chirp, from high to low, repeated every trip along the spring and fading.
    const trip = 0.032;
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const c = t % trip;
      const chirp = Math.sin(2 * Math.PI * (3200 * c - 30000 * c * c)) * Math.exp(-c / 0.012);
      out[i] = (0.7 * chirp + 0.25 * noise()) * Math.exp(-k * t);
    }
  } else {
    const gap = type === REVERB.room ? 0.012 + 0.006 * seconds : 0.001;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      if (t < gap) continue;
      // The tail darkens as it goes (rooms) or stays bright (plates).
      const a = type === REVERB.room ? Math.min(0.95, 0.15 + (0.8 * t) / seconds) : 0.1;
      lp += (1 - a) * (noise() - lp);
      // Darkening alone would also quieten it; keep the level on the 60 dB line.
      out[i] = lp * Math.sqrt((1 + a) / (1 - a)) * Math.exp(-k * (t - gap));
    }
    if (type === REVERB.room) {
      // Early reflections: the first few bounces off the nearest walls.
      for (const [ms, g] of [[9, 0.5], [14, -0.4], [21, 0.35], [27, -0.3], [33, 0.25]] as const) {
        const i = Math.round((gap + ms / 1000) * rate);
        if (i < len) out[i] += g;
      }
    }
  }
  // Level it, so a longer reverb isn't simply louder.
  let power = 0;
  for (let i = 0; i < len; i++) power += out[i] * out[i];
  const scale = 1 / Math.sqrt(power + 1e-9);
  for (let i = 0; i < len; i++) out[i] *= scale;
  return out;
}
