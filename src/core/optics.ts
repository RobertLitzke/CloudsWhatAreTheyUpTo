// Why the halo is always the same size. Sunlight passes through tiny hexagonal
// ice prisms, going in one side face and out another, two faces that meet at
// 60°. How much the light is bent depends on the angle it enters at, but it
// can never be bent by less than about 22°, and near that minimum many entry
// angles all give almost the same bend. So light piles up at 22° from the sun
// and makes a ring there, with a darker sky inside it.

/** Refractive index of ice for visible light. */
export const ICE_N = 1.31;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/**
 * How far a ray is bent, in degrees, entering a prism with the given apex
 * angle at `incidenceDeg` from the face's normal. Null when the ray is caught
 * inside by total internal reflection and does not come out of the far face.
 */
export function deviation(incidenceDeg: number, apexDeg = 60, n = ICE_N): number | null {
  const i = rad(incidenceDeg);
  const a = rad(apexDeg);
  const r1 = Math.asin(Math.sin(i) / n);
  const r2 = a - r1;
  const s = n * Math.sin(r2);
  if (Math.abs(s) > 1) return null;
  return deg(i + Math.asin(s) - a);
}

/** The least bend the prism can give: the halo's radius. */
export function minimumDeviation(apexDeg = 60, n = ICE_N): number {
  return 2 * deg(Math.asin(n * Math.sin(rad(apexDeg / 2)))) - apexDeg;
}

/** Bends for many crystals at random angles, binned by whole degrees. */
export function haloHistogram(samples: readonly number[], apexDeg = 60, maxDeg = 60): number[] {
  const bins = new Array(maxDeg).fill(0);
  for (const inc of samples) {
    const d = deviation(inc, apexDeg);
    if (d != null && d >= 0 && d < maxDeg) bins[Math.floor(d)]++;
  }
  return bins;
}

export type V = [number, number];

/**
 * Snell's law for a ray: refract the unit direction `d` at a surface with unit
 * normal `n` (pointing against `d`), from index `n1` into `n2`. Null when the
 * ray is reflected back instead.
 */
export function refract(d: V, n: V, n1: number, n2: number): V | null {
  const r = n1 / n2;
  const c = -(n[0] * d[0] + n[1] * d[1]);
  const k = 1 - r * r * (1 - c * c);
  if (k < 0) return null;
  const s = r * c - Math.sqrt(k);
  return [d[0] * r + n[0] * s, d[1] * r + n[1] * s];
}
