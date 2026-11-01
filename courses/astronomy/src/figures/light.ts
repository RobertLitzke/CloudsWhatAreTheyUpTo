// Light, shared by the starlight lessons: the colour of one wavelength, the
// glow of a hot body at a temperature (Planck), and the colour the eye sees
// from that glow (the CIE 1931 observer, as fitted by Wyman, Sloan and
// Shirley 2013, turned into screen colour).

/** Planck's constant, the speed of light and Boltzmann's constant, SI. */
const H = 6.62607e-34;
const C = 2.99792e8;
const K = 1.380649e-23;

/** The Sun's surface temperature, kelvin. */
export const SUN_T = 5772;

/** Power radiated per unit area per unit wavelength, W/m² per m, at wavelength `nm` from a body at `t` kelvin. */
export function planck(nm: number, t: number): number {
  const l = nm * 1e-9;
  const x = (H * C) / (l * K * t);
  return x > 700 ? 0 : (2 * H * C * C) / l ** 5 / Math.expm1(x);
}

/** Where the glow is brightest, nm (Wien). */
export const peakNm = (t: number) => 2.897771955e6 / t;

/** Light given off per square metre, relative to the Sun's surface (Stefan-Boltzmann). */
export const perArea = (t: number) => (t / SUN_T) ** 4;

const g = (x: number, mu: number, s1: number, s2: number) => Math.exp(-0.5 * ((x - mu) / (x < mu ? s1 : s2)) ** 2);

/** CIE 1931 colour matching functions at `nm`. */
export function cie(nm: number): [number, number, number] {
  return [
    1.056 * g(nm, 599.8, 37.9, 31.0) + 0.362 * g(nm, 442.0, 16.0, 26.7) - 0.065 * g(nm, 501.1, 20.4, 26.2),
    0.821 * g(nm, 568.8, 46.9, 40.5) + 0.286 * g(nm, 530.9, 16.3, 31.1),
    1.217 * g(nm, 437.0, 11.8, 36.0) + 0.681 * g(nm, 459.0, 26.0, 13.8),
  ];
}

const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** XYZ to linear sRGB. */
const linear = ([x, y, z]: [number, number, number]): [number, number, number] => [
  3.2406 * x - 1.5372 * y - 0.4986 * z,
  -0.9689 * x + 1.8758 * y + 0.0415 * z,
  0.0557 * x - 0.204 * y + 1.057 * z,
];

const hex = (rgb: [number, number, number]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;

/** The colour of a body glowing at `t` kelvin, scaled so its brightest channel is full: its hue and how white it is, not how bright. */
export function glowColour(t: number): string {
  const xyz: [number, number, number] = [0, 0, 0];
  for (let nm = 380; nm <= 780; nm += 5) {
    const p = planck(nm, t);
    const [x, y, z] = cie(nm);
    xyz[0] += p * x;
    xyz[1] += p * y;
    xyz[2] += p * z;
  }
  const rgb = linear(xyz).map((v) => Math.max(0, v)) as [number, number, number];
  const top = Math.max(...rgb);
  return hex(rgb.map((v) => gamma(v / top)) as [number, number, number]);
}

/** The colour of light of one wavelength, as near as a screen gets, dimming toward the ends of the visible band (after Dan Bruton's spectrum colours). */
export function wavelengthColour(nm: number): string {
  let r = 0, gr = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { gr = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { gr = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; gr = 1; }
  else if (nm < 645) { r = 1; gr = (645 - nm) / 65; }
  else r = 1;
  const fade = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  const f = Math.max(0, Math.min(1, fade));
  return hex([r, gr, b].map((v) => (v * f) ** 0.8) as [number, number, number]);
}

/** Lines of the elements in the visible band, nm. */
export const LINES: Readonly<Record<string, readonly number[]>> = {
  hydrogen: [656.3, 486.1, 434.0, 410.2],
  sodium: [589.0, 589.6],
  helium: [587.6, 667.8, 501.6, 492.2, 471.3, 447.1],
  calcium: [393.4, 396.8, 422.7],
  iron: [527.0, 495.7, 438.4, 430.8, 404.6],
  magnesium: [516.7, 517.3, 518.4],
};

/** A name for the colour a glow at `t` looks to the eye. */
export function colourName(t: number): string {
  if (t < 2600) return 'deep red';
  if (t < 3500) return 'red-orange';
  if (t < 4600) return 'orange';
  if (t < 5400) return 'pale yellow-orange';
  if (t < 6700) return 'white, faintly yellow';
  if (t < 9000) return 'white';
  if (t < 15000) return 'blue-white';
  return 'pale blue';
}
