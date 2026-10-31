// A shot: the settings the reader dials in, and everything that follows from
// them. Pure arithmetic over camera.ts, with no DOM and no pixels, so the
// figures and the tests agree on what a setting does before anything is drawn.
//
// The renderer (app/photo/film.ts) takes a Render and does as it says: crop
// this much, blur a thing at that distance by this many pixels, smear the
// frame this far, brighten by this, add this much noise, tint by this.

import {
  P950, type Camera,
  angleOfView, apertureLabel, blurCircle, brightness, closestFocus, depthOfField, diffraction, fromEquivalent,
  isoFor, motionBlur, pixelNoise, safeShutter, shakeBlur, sharpEnough, shutterLabel, toEquivalent,
  whiteBalanceGains, widestAperture,
} from './camera';
import type { Scene } from './photos';

/** What the reader sets. Any of it may be left out; the shot fills in the rest. */
export interface Settings {
  /** Equivalent focal length, mm (24 to 2000 on the P950). */
  eqFocal: number;
  /** f-number. Clamped to what the lens can do at this focal length. */
  aperture?: number;
  /** Seconds. */
  shutter?: number;
  iso?: number;
  /** What the lens is focused on, metres. The subject's distance by default. */
  focusAt?: number;
  /** What the camera is told the light is, kelvin. The scene's own by default. */
  whiteBalance?: number;
  /** Is the stabiliser on. */
  vr?: boolean;
  /** Is the camera on a tripod (no shake, whatever the shutter). */
  tripod?: boolean;
  /** Is the camera in macro mode, which lets the wide end focus within a centimetre. */
  macro?: boolean;
}

/** What the renderer needs to turn the photo into that shot. */
export interface Render {
  /**
   * How much of the photo's width to show, 1 being all of it. The photo was
   * taken at `scene.eqFocal`; zooming in past that crops rather than reveals.
   */
  crop: number;
  /** Blur, in fractions of the frame's width, of a point this many metres away. */
  blurAt: (metres: number) => number;
  /** How far the whole frame smears from shake, as a fraction of its width. */
  shake: number;
  /** How far the subject smears from its own movement, same units. */
  smear: number;
  /** How much brighter than a right exposure, 1 being right, 2 a stop over. */
  exposure: number;
  /** Noise as a fraction of white, in a mid-tone, once the photo is shown at screen size. */
  noise: number;
  /** Per-channel gains for the white balance, green 1. */
  gains: [number, number, number];
}

/** A shot: the settings as the camera would really take them, and what they do. */
export interface Shot {
  camera: Camera;
  scene: Scene;
  /** The settings after the camera's limits: a shutter it has, an aperture the lens can open to. */
  eqFocal: number;
  focal: number;
  aperture: number;
  shutter: number;
  iso: number;
  focusAt: number;
  whiteBalance: number;
  vr: boolean;
  tripod: boolean;
  /** Where the lens could focus: it cannot focus nearer than this at this zoom. */
  closest: number;
  /** The widest the lens opens at this zoom. */
  widest: number;
  /** Horizontal angle of view, degrees. */
  angle: number;
  /** What looks sharp, metres; `far` is Infinity when the background is sharp to the horizon. */
  depth: { near: number; far: number };
  /** The distance past which everything is sharp when focused at infinity. */
  hyperfocal: number;
  /** How much of the frame's height the subject fills, 0 to 1. */
  subjectHeight: (metresTall: number) => number;
  /** The slowest hand-held shutter the rule of thumb calls safe. */
  safeShutter: number;
  /** True when shake alone would show at this shutter. */
  shaky: boolean;
  /** True when the aperture is narrow enough that diffraction softens the whole frame. */
  diffracted: boolean;
  /** The exposure is right within a third of a stop. */
  exposed: boolean;
  render: Render;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * What the camera would really do with these settings on this scene. Settings
 * left out are what the camera's own automatic would pick: the widest
 * aperture, focus on the subject, the light's own colour, and the ISO that
 * exposes it right at that shutter.
 */
export function shoot(scene: Scene, s: Settings, cam: Camera = P950): Shot {
  const eqFocal = clamp(s.eqFocal, toEquivalent(cam, cam.focal.min), toEquivalent(cam, cam.focal.max));
  const focal = fromEquivalent(cam, eqFocal);
  const widest = widestAperture(cam, focal);
  const aperture = clamp(s.aperture ?? widest, widest, cam.narrowest);
  const closest = closestFocus(cam, focal, s.macro ?? false);
  const focusAt = Math.max(closest, s.focusAt ?? scene.subjectAt);
  const ev = scene.ev ?? 12;
  const shutter = clamp(s.shutter ?? 1 / 250, cam.shutter.fastest, cam.shutter.slowest);
  const iso = clamp(s.iso ?? isoFor(ev, aperture, shutter), cam.iso.min, cam.iso.max);
  const kelvin = scene.kelvin ?? 5500;
  const whiteBalance = s.whiteBalance ?? kelvin;
  const vr = s.vr ?? true;
  const tripod = s.tripod ?? false;

  const depth = depthOfField(cam, focal, aperture, focusAt);
  const sharp = sharpEnough(cam);
  const soft = diffraction(aperture);
  // Both blurs are discs on the sensor; adding them in quadrature is the usual
  // approximation for how two independent softenings pile up.
  const blurAt = (metres: number) => {
    const circle = Math.hypot(blurCircle(focal, aperture, focusAt, Math.max(0.05, metres)), soft);
    return circle / cam.sensor.w;
  };

  const shownAt = scene.eqFocal ?? eqFocal;
  const crop = clamp(shownAt / eqFocal, 0.04, 1);
  const shake = tripod ? 0 : shakeBlur(eqFocal, shutter, vr, cam);
  const smear = motionBlur(eqFocal, scene.speed ?? 0, scene.subjectAt, shutter);
  // A 4608-wide photo shown about 760 pixels wide pools 36 pixels into one.
  const pooled = (cam.pixelsAcross / 760) ** 2;
  const { sigma } = pixelNoise(cam, iso, 0.18, pooled);

  return {
    camera: cam,
    scene,
    eqFocal,
    focal,
    aperture,
    shutter,
    iso,
    focusAt,
    whiteBalance,
    vr,
    tripod,
    closest,
    widest,
    angle: angleOfView(cam, focal),
    depth,
    hyperfocal: depthOfField(cam, focal, aperture, 1e6).near,
    subjectHeight: (metresTall: number) => (metresTall / scene.subjectAt) * (eqFocal / 24),
    safeShutter: safeShutter(eqFocal, vr, cam),
    shaky: shake > 1 / 760,
    diffracted: soft > sharp,
    exposed: Math.abs(Math.log2(brightness(ev, aperture, shutter, iso))) < 1 / 3,
    render: {
      crop,
      blurAt,
      shake,
      smear,
      exposure: brightness(ev, aperture, shutter, iso),
      noise: sigma,
      gains: whiteBalanceGains(kelvin, whiteBalance),
    },
  };
}

/** The one line a figure puts under the picture: the settings, as a camera shows them. */
export function settingsLine(shot: Shot): string {
  return `${Math.round(shot.eqFocal)} mm · ${apertureLabel(shot.aperture)} · ${shutterLabel(shot.shutter)} · ISO ${Math.round(shot.iso)}`;
}
