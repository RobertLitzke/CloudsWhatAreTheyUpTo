// The camera, as numbers: the Nikon Coolpix P950 the course is written for,
// and the optics every figure runs on. Pure functions, no DOM; unit-tested.
//
// Lengths are millimetres on the camera side (focal length, sensor, blur
// circles) and metres on the world side (how far away things are). "Equivalent"
// focal lengths are what the same field of view would need on a 36 × 24 mm
// full-frame camera, which is how Nikon labels the P950's zoom (24–2000 mm)
// and how the course talks about it.

/** A camera body and its fixed lens, as far as the figures need it. */
export interface Camera {
  name: string;
  /** Sensor width and height, mm. */
  sensor: { w: number; h: number };
  /** Pixels across the sensor. */
  pixelsAcross: number;
  /** Real focal length range of the lens, mm. */
  focal: { min: number; max: number };
  /** Widest aperture at the wide and the long end; it narrows as the lens zooms. */
  widest: { atMin: number; atMax: number };
  /** The narrowest aperture the camera offers. */
  narrowest: number;
  iso: { min: number; max: number };
  /** Shutter range, seconds. */
  shutter: { fastest: number; slowest: number };
  /** Stops of shake the stabiliser takes out, as the figures use it. */
  vrStops: number;
  /** Closest focus, metres, at the wide and the long end, and at the wide end in macro mode. */
  closest: { atMin: number; atMax: number; macro: number };
  /** Electrons a pixel holds before it clips, at base ISO, and the read noise in electrons. */
  fullWell: number;
  readNoise: number;
}

/**
 * The Nikon Coolpix P950: a 1/2.3-inch sensor behind an 83× zoom, 4.3–357 mm
 * (24–2000 mm equivalent), f/2.8–6.5. Sensor size, pixels, lens, ISO and
 * shutter are Nikon's published specifications (the 15 s slowest shutter is
 * in M mode at ISO 100; other modes stop at 1 s). Nikon rates the stabiliser
 * at 5.5 stops; the figures use 4, nearer what a hand-held birder gets. The
 * full-well and read-noise figures are typical of 1.3 µm back-lit pixels, not
 * a measurement of this camera.
 */
export const P950: Camera = {
  name: 'Nikon Coolpix P950',
  sensor: { w: 6.17, h: 4.55 },
  pixelsAcross: 4608,
  focal: { min: 4.3, max: 357 },
  widest: { atMin: 2.8, atMax: 6.5 },
  narrowest: 8,
  iso: { min: 100, max: 6400 },
  shutter: { fastest: 1 / 4000, slowest: 15 },
  vrStops: 4,
  closest: { atMin: 0.5, atMax: 5, macro: 0.01 },
  fullWell: 4500,
  readNoise: 2.5,
};

/** A full-frame camera with the same zoom range, for comparison: what a big sensor changes. */
export const FULL_FRAME: Camera = {
  ...P950,
  name: 'A full-frame camera',
  sensor: { w: 36, h: 24 },
  pixelsAcross: 6000,
  focal: { min: P950.focal.min * (36 / 6.17), max: P950.focal.max * (36 / 6.17) },
  fullWell: 50000,
  readNoise: 3,
};

const FULL_FRAME_DIAGONAL = Math.hypot(36, 24);

export const diagonal = (cam: Camera): number => Math.hypot(cam.sensor.w, cam.sensor.h);

/** How many times smaller than full frame the sensor is, corner to corner (5.6 for the P950). */
export const cropFactor = (cam: Camera): number => FULL_FRAME_DIAGONAL / diagonal(cam);

/** The equivalent focal length of a real one. */
export const toEquivalent = (cam: Camera, focal: number): number => focal * cropFactor(cam);

/** The real focal length that gives an equivalent one. */
export const fromEquivalent = (cam: Camera, eq: number): number => eq / cropFactor(cam);

/**
 * The widest aperture at a focal length. Nikon publishes only the two ends;
 * between them this narrows evenly with the logarithm of focal length, which is
 * close to how such zooms behave.
 */
export function widestAperture(cam: Camera, focal: number): number {
  const k = Math.log(focal / cam.focal.min) / Math.log(cam.focal.max / cam.focal.min);
  return cam.widest.atMin + (cam.widest.atMax - cam.widest.atMin) * Math.min(1, Math.max(0, k));
}

/**
 * Closest focus at a focal length, metres. Makers publish the two ends only.
 * In between it is blended geometrically on the square of the zoom's position,
 * because a zoom's close limit stays low over most of its range and then runs
 * away at the long end, which is what the P950 does: half a metre wide, five
 * metres at 2000 mm, and a centimetre at the wide end in macro mode.
 */
export function closestFocus(cam: Camera, focal: number, macro = false): number {
  const k = Math.min(1, Math.max(0, Math.log(focal / cam.focal.min) / Math.log(cam.focal.max / cam.focal.min)));
  const from = macro ? cam.closest.macro : cam.closest.atMin;
  return from * (cam.closest.atMax / from) ** (k * k);
}

/** Horizontal angle of view, degrees. */
export function angleOfView(cam: Camera, focal: number): number {
  return (2 * Math.atan(cam.sensor.w / (2 * focal)) * 180) / Math.PI;
}

// ---- Focus and depth of field ----------------------------------------------

/**
 * The largest blur circle that still looks sharp, mm: the sensor diagonal over
 * 1500, the usual allowance for a print or screen seen whole (0.029 mm on full
 * frame, 0.005 mm on the P950).
 */
export const sharpEnough = (cam: Camera): number => diagonal(cam) / 1500;

/**
 * The blur circle, mm on the sensor, that a point `d` metres away makes when
 * the lens (`focal` mm at f/`n`) is focused at `s` metres. Thin-lens optics:
 * the aperture is focal/n wide, and a point off the focused distance comes to
 * a focus in front of or behind the sensor, so it lands as a disc.
 */
export function blurCircle(focal: number, n: number, s: number, d: number): number {
  const sm = s * 1000;
  const dm = d * 1000;
  return ((focal * focal) / (n * (sm - focal))) * (Math.abs(dm - sm) / dm);
}

/** The distance beyond which everything is sharp enough when focused at infinity, metres. */
export function hyperfocal(cam: Camera, focal: number, n: number): number {
  return ((focal * focal) / (n * sharpEnough(cam)) + focal) / 1000;
}

/** The nearest and farthest distances that look sharp, metres; far is Infinity past the hyperfocal distance. */
export function depthOfField(cam: Camera, focal: number, n: number, s: number): { near: number; far: number } {
  const h = hyperfocal(cam, focal, n) * 1000;
  const sm = s * 1000;
  const near = (sm * (h - focal)) / (h + sm - 2 * focal);
  const far = sm < h ? (sm * (h - focal)) / (h - sm) : Infinity;
  return { near: near / 1000, far: far / 1000 };
}

/**
 * The blur diffraction alone puts on every point, mm: the Airy disc's
 * diameter, 2.44 × wavelength × f-number, for green light (550 nm). On the
 * P950's small pixels this is already wider than "sharp enough" by f/4.
 */
export const diffraction = (n: number): number => 2.44 * 0.00055 * n;

// ---- Exposure ----------------------------------------------------------------

/**
 * The exposure value of a setting at ISO 100: log2(N² / t), less a stop for
 * each doubling of ISO. A scene "needs" an EV; a setting with a lower EV lets
 * in more light than it needs and the picture comes out brighter.
 */
export function exposureValue(n: number, t: number, iso: number): number {
  return Math.log2((n * n) / t) - Math.log2(iso / 100);
}

/** How much brighter than right a setting makes a scene that needs `sceneEv`: 2 is one stop over. */
export function brightness(sceneEv: number, n: number, t: number, iso: number): number {
  return 2 ** (sceneEv - exposureValue(n, t, iso));
}

/** The ISO that exposes a scene right at this aperture and shutter, before the camera's limits. */
export function isoFor(sceneEv: number, n: number, t: number): number {
  return 100 * 2 ** (Math.log2((n * n) / t) - sceneEv);
}

/** The shutter time that exposes a scene right at this aperture and ISO. */
export function shutterFor(sceneEv: number, n: number, iso: number): number {
  return (n * n) / 2 ** (sceneEv + Math.log2(iso / 100));
}

/** The P950's shutter steps, in thirds of a stop, seconds. */
export const SHUTTER_STEPS: readonly number[] = [
  1 / 4000, 1 / 3200, 1 / 2500, 1 / 2000, 1 / 1600, 1 / 1250, 1 / 1000, 1 / 800, 1 / 640, 1 / 500, 1 / 400, 1 / 320,
  1 / 250, 1 / 200, 1 / 160, 1 / 125, 1 / 100, 1 / 80, 1 / 60, 1 / 50, 1 / 40, 1 / 30, 1 / 25, 1 / 20, 1 / 15, 1 / 13,
  1 / 10, 1 / 8, 1 / 6, 1 / 5, 1 / 4, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3, 4, 5, 6, 8, 10, 13, 15,
];

/** Full and third stops of aperture, f-numbers as cameras show them. */
export const APERTURE_STEPS: readonly number[] = [2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 6.5, 7.1, 8];

export const ISO_STEPS: readonly number[] = [100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400];

/** A shutter time the way a camera shows it: 1/250, 0.5", 2". */
export function shutterLabel(t: number): string {
  if (t >= 0.3) return `${Number(t.toFixed(1))}″`;
  return `1/${Math.round(1 / t)}`;
}

export const apertureLabel = (n: number): string => `f/${Number(n.toFixed(1))}`;

// ---- Noise -------------------------------------------------------------------

/**
 * Light is counted in photons, and the count is never exact: a pixel expecting
 * N photo-electrons gets N give or take √N (shot noise), plus a few electrons
 * of read noise from the electronics. Raising ISO only amplifies what came in,
 * so the noise you see depends on how much light the pixel actually caught.
 *
 * Returns, for a pixel that would show at `level` (0 to 1, 1 being white)
 * after the camera's amplification, the expected electrons and the noise as a
 * fraction of white. `averaged` pixels pooled into one (shrinking a 4608-wide
 * photo to fit a phone pools about 36) divide the noise by its square root.
 */
export function pixelNoise(cam: Camera, iso: number, level: number, averaged = 1): { electrons: number; sigma: number } {
  const white = cam.fullWell * (cam.iso.min / iso);
  const electrons = Math.max(0, level) * white;
  const sigma = Math.sqrt(electrons + cam.readNoise * cam.readNoise) / white / Math.sqrt(averaged);
  return { electrons, sigma };
}

// ---- Motion ------------------------------------------------------------------

/**
 * How far a hand-held camera wanders while the shutter is open, as a fraction
 * of the frame's width. A steady hand turns the camera at about 0.025 rad/s:
 * that makes the old rule of thumb (1/focal-length seconds is safe, in
 * equivalent mm) come out at one "sharp enough" blur. The stabiliser divides it
 * by 2 for each stop.
 */
export function shakeBlur(eqFocal: number, t: number, vr: boolean, cam: Camera = P950): number {
  const drift = 0.025 * t;
  return (drift * eqFocal) / 36 / (vr ? 2 ** cam.vrStops : 1);
}

/** The slowest shutter the rule of thumb calls safe hand-held, seconds. */
export function safeShutter(eqFocal: number, vr: boolean, cam: Camera = P950): number {
  return (vr ? 2 ** cam.vrStops : 1) / eqFocal;
}

/**
 * How far something moving across the view at `speed` m/s, `d` metres away,
 * smears during `t` seconds, as a fraction of the frame's width.
 */
export function motionBlur(eqFocal: number, speed: number, d: number, t: number): number {
  return ((speed * t) / d) * (eqFocal / 36);
}

/** How much of the frame's height a thing `size` metres tall fills at `d` metres. */
export function frameShare(eqFocal: number, size: number, d: number): number {
  return (size / d) * (eqFocal / 24);
}

// ---- Colour --------------------------------------------------------------------

/**
 * The colour of a light, as linear RGB with green 1: a black body at `kelvin`
 * (Tanner Helland's fit to the Planckian locus, converted to linear light).
 * Candlelight is about 1900 K, a tungsten bulb 2700–3200 K, noon sun 5500 K,
 * overcast 6500 K, blue shade 7500–9000 K.
 */
export function lightColor(kelvin: number): [number, number, number] {
  const t = kelvin / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const lin = (v: number) => {
    const c = Math.min(255, Math.max(0, v)) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  return [lr / lg, 1, lb / lg];
}

/**
 * The gains a camera set to `setting` kelvin puts on a scene lit at `light`
 * kelvin: it divides out the light it thinks is there. When the two match,
 * whites come out white; set it lower than the light and the picture goes blue.
 */
export function whiteBalanceGains(light: number, setting: number): [number, number, number] {
  const l = lightColor(light);
  const s = lightColor(setting);
  return [l[0] / s[0], 1, l[2] / s[2]];
}
