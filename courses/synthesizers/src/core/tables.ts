// The wavetable engine's table (branch lesson O1): eight single-cycle waves,
// each given as the sizes of its first harmonics, from a pure sine to a bright
// buzz. The voice turns each into a PeriodicWave and crossfades between
// neighbours; the figure draws them stacked. All start at phase zero, so a
// blend of two neighbours is a wave in between.

const H = 32;
const harmonics = (f: (n: number) => number) => even(Array.from({ length: H }, (_, i) => f(i + 1)));
/** Scaled so every frame has the same power: a sweep through the table changes the colour, not the loudness. */
const even = (amps: number[]) => {
  const power = Math.sqrt(amps.reduce((a, b) => a + b * b, 0));
  return amps.map((a) => (0.8 * a) / power);
};
const bump = (n: number, centre: number, width: number) => Math.exp(-((n - centre) ** 2) / (2 * width * width));

export const TABLE_FRAMES: readonly { name: string; amps: readonly number[] }[] = [
  { name: 'sine', amps: harmonics((n) => (n === 1 ? 1 : 0)) },
  { name: 'warm', amps: harmonics((n) => (n <= 3 ? [1, 0.35, 0.15][n - 1] : 0)) },
  { name: 'triangle', amps: harmonics((n) => (n % 2 ? 1 / (n * n) : 0) * 1.2) },
  { name: 'square', amps: harmonics((n) => (n % 2 ? 1 / n : 0)) },
  { name: 'saw', amps: harmonics((n) => 1 / n) },
  { name: 'hollow “ah”', amps: harmonics((n) => (n === 1 ? 0.5 : 0) + 0.6 * bump(n, 6, 1.6)) },
  { name: 'thin “ee”', amps: harmonics((n) => (n === 1 ? 0.6 : 0) + 0.12 * bump(n, 2, 0.6) + 0.45 * bump(n, 13, 2)) },
  { name: 'buzz', amps: harmonics((n) => 0.35 / Math.sqrt(n)) },
];

/** The last frame's index: positions run from 0 to this. */
export const TABLE_LAST = TABLE_FRAMES.length - 1;

/** A frame's wave at phase x (0 to 1 is one cycle). */
export function frameAt(frame: number, x: number): number {
  const amps = TABLE_FRAMES[frame].amps;
  let y = 0;
  amps.forEach((a, i) => (y += a * Math.sin(2 * Math.PI * (i + 1) * x)));
  return y;
}
