// Figures about light: how much of it reaches the sensor, the three dials
// that decide that, and what you pay for turning each one. ISO is the dial
// that costs grain, and grain is easiest to understand as counting: too few
// photons, and the count comes out rough.

import { svg } from 'didactics/dom';
import { label, line, note, redraw } from 'didactics/draw';
import { P950, apertureLabel, exposureValue, isoFor, pixelNoise, shutterLabel } from '../../core/camera';
import { shoot } from '../../core/shot';
import { photoOptions, shotPhoto, type PhotoOptions } from '../picture';
import { COL, apertureSlider, figure, frame, isoSlider, shutterSlider, slider, tint } from './kit';
import { noPhoto, shotFrame } from './shot';

/**
 * The exposure triangle, as a balance rather than a triangle: the scene needs
 * so much light, and aperture, shutter and ISO are three ways to give it that
 * much. Moving one dial lights the picture up or darkens it, and the reader's
 * task is to get back to a right exposure by moving a different dial: a stop
 * given up here has to be taken back there.
 */
export const stopsFigure = figure(['trade'], (_ctx, t) => {
  const W = 400;
  const H = 210;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);

  const ev = 12; // a bright overcast day
  let n = 5.6;
  let shutter = 1 / 250;
  let iso = 400;
  let moved = false;

  const bar = (y: number, from: number, to: number, color: string, text: string) => [
    line(70, y, 360, y, COL.grid, 10),
    line(70, y, 70 + 290 * Math.min(1, Math.max(0, from)), y, color, 10),
    label(64, y + 4, text, { anchor: 'end', bold: true, fill: color }),
    note(70 + 290 * Math.min(1, Math.max(0, to)), y - 12, '', {}),
  ];

  const paint = () => {
    const over = exposureValue(n, shutter, iso) - ev;
    const stops = -over; // positive: brighter than right
    redraw(
      g,
      label(200, 22, 'What the scene needs, and what the dials give', { anchor: 'middle', bold: true, soft: true }),
      ...bar(60, (Math.log2(n * n) + 2) / 8, 0, COL.aperture, apertureLabel(n)),
      ...bar(95, (Math.log2(1 / shutter) - 1) / 11, 0, COL.time, `${shutterLabel(shutter)} s`),
      ...bar(130, Math.log2(iso / 100) / 6, 0, COL.sensor, `ISO ${iso}`),
      // The verdict bar: how far from a right exposure, in stops.
      line(70, 176, 360, 176, COL.grid, 3),
      line(215, 168, 215, 184, COL.soft, 1.5),
      svg('circle', { cx: 215 + Math.max(-140, Math.min(140, stops * 35)), cy: 176, r: 7, fill: Math.abs(stops) < 0.34 ? COL.ink : COL.light }),
      note(215, 198, Math.abs(stops) < 0.34 ? 'exposed right' : `${Math.abs(stops).toFixed(1)} stops ${stops > 0 ? 'bright' : 'dark'}`, { anchor: 'middle' }),
    );
    f.readout.textContent = Math.abs(stops) < 0.34
      ? 'Right. Any pair of changes that cancel keeps it right: a stop narrower on the aperture, a stop longer on the shutter.'
      : `${Math.abs(stops).toFixed(1)} stops too ${stops > 0 ? 'bright' : 'dark'}. Take the same number of stops back on one of the other two dials.`;
    if (t.goal === 'trade' && moved && Math.abs(stops) < 0.34) t.done();
  };

  const mark = () => (moved = true);
  f.controls.append(
    apertureSlider(n, (v) => { n = v; mark(); paint(); }).node,
    shutterSlider(shutter, (v) => { shutter = v; mark(); paint(); }).node,
    isoSlider(iso, (v) => { iso = v; mark(); paint(); }).node,
  );
  paint();
  return f.node;
});

/**
 * Noise on a real photograph. The scene's light is fixed, so raising ISO
 * buys a faster shutter and pays in grain; the reader can see the trade
 * instead of being told about it.
 */
export const isoFigure = figure<PhotoOptions>(['grain', 'enough-light'], (_ctx, t, options) => {
  const photo = shotPhoto('low-light', options?.photo) ?? shotPhoto('overcast-forest');
  if (!photo?.scene) return noPhoto('a bird after dark').node;
  const scene = photo.scene;

  const f = shotFrame(photo, 3);
  let iso = 100;
  let ev = scene.ev ?? 9;

  const paint = () => {
    // The camera is in shutter-priority: the aperture is wide open, and the
    // shutter is whatever this ISO can afford.
    const open = shoot(scene, { eqFocal: scene.eqFocal ?? 200, iso });
    const shutter = 1 / 2 ** (ev + Math.log2(iso / 100) - Math.log2(open.aperture * open.aperture));
    const shot = shoot({ ...scene, ev }, { eqFocal: scene.eqFocal ?? 200, iso, shutter, aperture: open.widest });
    const say = `${shutterLabel(shot.shutter)} s at ISO ${iso}. ` +
      (shot.render.noise > 0.02
        ? 'The grain is in every flat area now: that is the sensor counting too few photons.'
        : shot.shaky
          ? 'Clean, but the shutter is too slow to hold by hand at this zoom.'
          : 'Clean, and fast enough to hold.');
    f.paint(shot, say);
    if (t.goal === 'grain' && shot.render.noise > 0.02) t.done();
    if (t.goal === 'enough-light' && !shot.shaky && shot.render.noise < 0.012) t.done();
  };

  f.controls.append(
    isoSlider(iso, (v) => { iso = v; paint(); }).node,
    slider('The light', 5, 15, 0.5, ev, (v) => (v >= 14 ? 'bright sun' : v >= 12 ? 'overcast' : v >= 9 ? 'under trees' : v >= 7 ? 'dusk' : 'almost dark'), (v) => { ev = v; paint(); }, 'light').node,
  );
  f.start(t, paint);
  return f.node;
}, { options: photoOptions('low-light') });

/**
 * Why grain is counting: a patch of sensor shown as the photons that land on
 * it. Raising ISO does not add light; it multiplies a smaller count, and the
 * roughness of a small count is what grain is.
 */
export const photonsDiagram = figure(['count'], (_ctx, t) => {
  const W = 400;
  const H = 180;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let iso = 100;

  const paint = () => {
    const { electrons, sigma } = pixelNoise(P950, iso, 0.18, 1);
    // One dot stands for a fixed number of electrons, so the dots thin out as
    // ISO rises: the same brightness, counted from less light.
    const dots = Math.max(1, Math.round(electrons / 18));
    const rng = mulberry(1234);
    redraw(
      g,
      svg('rect', { x: 20, y: 20, width: 170, height: 120, fill: tint(COL.sensor, 0.1), stroke: COL.sensor, 'stroke-width': 1.4 }),
      ...Array.from({ length: Math.min(600, dots) }, () =>
        svg('circle', { cx: 24 + rng() * 162, cy: 24 + rng() * 112, r: 1.5, fill: COL.light }),
      ),
      note(105, 156, `${Math.round(electrons)} photons caught`, { anchor: 'middle', soft: true }),
      // The same patch, amplified to the same brightness, with its roughness.
      ...Array.from({ length: 36 }, (_, i) => {
        const v = Math.min(1, Math.max(0, 0.45 + gaussish(rng) * sigma * 2.2));
        return svg('rect', {
          x: 230 + (i % 6) * 22,
          y: 24 + Math.floor(i / 6) * 19,
          width: 22,
          height: 19,
          fill: `rgb(${Math.round(v * 255)},${Math.round(v * 250)},${Math.round(v * 240)})`,
        });
      }),
      svg('rect', { x: 230, y: 24, width: 132, height: 114, fill: 'none', stroke: COL.sensor, 'stroke-width': 1.4 }),
      note(296, 156, 'as the picture shows it', { anchor: 'middle', soft: true }),
      line(196, 80, 224, 80, COL.soft, 1.2),
      label(210, 72, `×${Math.round(iso / 100)}`, { anchor: 'middle', size: 'small', soft: true }),
    );
    f.readout.textContent = `At ISO ${iso} a mid-grey is made from about ${Math.round(electrons)} photons a pixel. The count is out by about its own square root every time, which is ${(sigma * 100).toFixed(1)}% of white: that is the grain.`;
    if (t.goal === 'count' && iso >= 1600) t.done();
  };

  f.controls.append(isoSlider(iso, (v) => { iso = v; paint(); }).node);
  paint();
  return f.node;
});

/** A small deterministic generator, so the dots stay put between redraws. */
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roughly normal, from three uniforms: enough for a drawing. */
const gaussish = (rng: () => number) => rng() + rng() + rng() - 1.5;

/** What ISO the camera would pick by itself, for the text to quote. */
export const autoIso = (ev: number, n: number, t: number) => Math.round(isoFor(ev, n, t));
