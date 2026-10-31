// How fast droplets and drops fall, and how far below a cloud they get
// before they evaporate. Both are read off measured curves and interpolated
// on log-log scales, which is how the curves are straightest.

/** Fall speed in still air, metres a second, by diameter in mm (after Gunn and Kinzer). */
const FALL: [mm: number, mPerS: number][] = [[0.01, 0.003], [0.05, 0.08], [0.1, 0.27], [0.2, 0.7], [0.5, 2.1], [1, 4], [2, 6.5], [3, 8], [5, 9.1]];

/**
 * How far a drop falls below the cloud base before it has evaporated, in
 * metres, by diameter in mm, for air at 90% humidity (after Rogers and Yau).
 * Its life grows with the square of its size and so does its fall speed, so
 * the distance grows roughly with the fourth power: a cloud droplet is gone in
 * a few centimetres, a raindrop lasts for kilometres.
 */
const SURVIVE: [mm: number, m: number][] = [[0.01, 0.002], [0.02, 0.033], [0.2, 150], [2, 42000], [5, 260000]];

/** Interpolate between points i-1 and i of a table, on log-log scales. */
function logLerp(table: [number, number][], i: number, x: number): number {
  const [x0, y0] = table[i - 1];
  const [x1, y1] = table[i];
  const k = (Math.log(x) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
  return Math.exp(Math.log(y0) + k * (Math.log(y1) - Math.log(y0)));
}

/** Fall speed in metres a second of a drop `mm` across. */
export function fallSpeed(mm: number): number {
  if (mm <= FALL[0][0]) return FALL[0][1];
  for (let i = 1; i < FALL.length; i++) if (mm <= FALL[i][0]) return logLerp(FALL, i, mm);
  return FALL[FALL.length - 1][1];
}

/** How many metres a drop `mm` across falls through air at `humidity` (0 to 1) before it is gone. */
export function survivalM(mm: number, humidity: number): number {
  let i = 1;
  while (i < SURVIVE.length - 1 && mm > SURVIVE[i][0]) i++;
  // Drier air takes the water away faster, in proportion to how far it is from saturated.
  return logLerp(SURVIVE, i, mm) * (0.1 / (1 - humidity));
}

/** What becomes of a drop leaving a cloud base `baseM` up, against an updraft of `upMPerS`. */
export function dropFate(mm: number, upMPerS: number, humidity: number, baseM: number) {
  const fall = fallSpeed(mm);
  const lastsM = survivalM(mm, humidity);
  return { mm, fall, net: fall - upMPerS, lastsM, lands: fall > upMPerS && lastsM > baseM };
}
