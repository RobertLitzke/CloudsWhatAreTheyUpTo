// Lesson figures about focus: the one distance a lens is sharp at, the band
// either side of it that still looks sharp, and what the aperture does to that
// band. One ray diagram, which shows why, and one photograph, which shows what
// it looks like.

import { svg } from 'lesson-kit/dom';
import { label, line, note, redraw } from 'lesson-kit/draw';
import { P950, apertureLabel, blurCircle, fromEquivalent, sharpEnough } from '../../core/camera';
import { shoot } from '../../core/shot';
import { shotPhoto } from '../picture';
import { COL, apertureSlider, distance, figure, frame, slider, tint } from './kit';
import { noPhoto, shotFrame } from './shot';

/**
 * The ray diagram: a point at one distance, the cone of light the lens throws
 * from it, and the disc it lands as on the sensor. Moving the point off the
 * focused distance opens the disc; narrowing the aperture closes it again.
 * This is the whole of depth of field in one picture.
 */
export const coneFigure = figure(['sharp-again'], (_ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);

  // The drawing is in metres along x: the lens at 320, the subject at 60.
  const LENS = 282;
  const SENSOR = 330;
  const AXIS = 120;
  let at = 8; // where the point is, metres
  const focus = 8;
  let n = 2.8;

  const xFor = (m: number) => LENS - 36 - 200 * (Math.log(m / 1.5) / Math.log(40 / 1.5));

  const paint = () => {
    // 200 mm equivalent, focused at 8 m: a band the reader can walk in and out
    // of. Only defocus is drawn here; what diffraction does to the whole frame
    // is the aperture lesson's business, not this diagram's.
    const real = fromEquivalent(P950, 200);
    const half = 26 * (2.8 / n); // the lens opening, drawn
    const disc = Math.min(44, (blurCircle(real, n, focus, at) / P950.sensor.w) * 1400);
    const x = xFor(at);
    const sharp = disc <= (sharpEnough(P950) / P950.sensor.w) * 1400 + 0.5;

    redraw(
      g,
      // The lens, its opening, and the sensor.
      line(LENS, AXIS - 42, LENS, AXIS + 42, COL.soft, 1.2, { 'stroke-dasharray': '3 3' }),
      svg('ellipse', { cx: LENS, cy: AXIS, rx: 7, ry: half, fill: tint(COL.aperture, 0.22), stroke: COL.aperture, 'stroke-width': 1.6 }),
      line(SENSOR, AXIS - 46, SENSOR, AXIS + 46, COL.sensor, 3),
      note(SENSOR + 6, AXIS - 52, 'sensor', { fill: COL.sensor }),
      note(LENS, AXIS + 60, `lens at ${apertureLabel(n)}`, { anchor: 'middle', fill: COL.aperture }),
      // The ground, and the two marks: where the lens is focused, and the point.
      line(20, AXIS + 78, W - 20, AXIS + 78, COL.grid, 1),
      line(xFor(focus), AXIS - 40, xFor(focus), AXIS + 78, COL.focus, 1.2, { 'stroke-dasharray': '4 4' }),
      note(xFor(focus), AXIS + 92, 'focused here', { anchor: 'middle', fill: COL.focus }),
      // The cone of light from the point, through the lens, onto the sensor.
      svg('path', {
        d: `M${x} ${AXIS} L${LENS} ${AXIS - half} L${SENSOR} ${AXIS - disc / 2} L${SENSOR} ${AXIS + disc / 2} L${LENS} ${AXIS + half}Z`,
        fill: tint(sharp ? COL.sharp : COL.soften, 0.22),
        stroke: sharp ? COL.sharp : COL.soften,
        'stroke-width': 1.1,
      }),
      svg('circle', { cx: x, cy: AXIS, r: 4, fill: COL.subject }),
      note(x, AXIS - 14, distance(at), { anchor: 'middle', fill: COL.subject }),
      // The disc it lands as, drawn large beside the sensor.
      // The disc, shown again on its own under the sensor, where it can be seen.
      svg('circle', { cx: SENSOR + 34, cy: AXIS + 48, r: Math.max(1.2, disc / 2), fill: sharp ? COL.sharp : COL.soften }),
      label(SENSOR + 34, AXIS + 78, sharp ? 'a point' : 'a disc', { anchor: 'middle', size: 'small', soft: true }),
    );

    f.svg.setAttribute('aria-label', `A point ${distance(at)} away lands on the sensor as ${sharp ? 'a point' : 'a disc'}.`);
    f.readout.textContent = sharp
      ? `A point ${distance(at)} away lands small enough to pass for a point: it looks sharp.`
      : `A point ${distance(at)} away lands as a disc. Everything in the picture at that distance is spread by that much, and looks soft.`;
    if (sharp && Math.abs(at - focus) > 0.5 && t.goal === 'sharp-again') t.done();
  };

  f.controls.append(
    slider('Point at', Math.log(1.5), Math.log(40), 0.01, Math.log(at), (l) => distance(Math.exp(l)), (l) => { at = Math.exp(l); paint(); }, 'subject').node,
    apertureSlider(n, (v) => { n = v; paint(); }).node,
  );
  paint();
  return f.node;
});

/**
 * The same thing on a photograph: the reader opens the aperture and watches
 * the background come apart, and moves the focus and watches what is sharp
 * move with it. The task is to throw the background out of focus.
 */
export const apertureFigure = figure(['blur-background', 'all-sharp'], (_ctx, t, options) => {
  const photo = shotPhoto('perched-bird', options?.photo as string | undefined);
  if (!photo?.scene) return noPhoto('a bird perched in a tree').node;
  const scene = photo.scene;

  const f = shotFrame(photo, 3);
  let n = 8;
  let focusAt = scene.subjectAt;
  const eqFocal = scene.eqFocal ?? 1000;

  const paint = () => {
    const shot = shoot(scene, { eqFocal, aperture: n, focusAt, iso: 100 });
    const far = shot.depth.far;
    const background = scene.far ?? Infinity;
    // The background is "gone" when it is spread by more than a hundredth of the frame.
    const softness = shot.render.blurAt(background);
    const clamped = shot.aperture > n + 0.05 ? ` The lens opens no wider than ${apertureLabel(shot.aperture)} at this zoom.` : '';
    const say = focusAt < shot.depth.near || focusAt > shot.depth.far
      ? `Nothing is sharp: the lens is focused at ${distance(focusAt)} and the bird is not there.${clamped}`
      : `Sharp from ${distance(shot.depth.near)} to ${distance(far)}. ` +
        (softness > 0.004 ? 'The background is well out of focus.' : 'The background is still readable.') + clamped;
    f.paint(shot, say);
    if (t.goal === 'blur-background' && softness > 0.004 && Math.abs(focusAt - scene.subjectAt) < scene.subjectAt * 0.25) t.done();
    if (t.goal === 'all-sharp' && softness <= 0.002) t.done();
  };

  f.controls.append(
    apertureSlider(n, (v) => { n = v; paint(); }).node,
    slider('Focus on', Math.log(Math.max(0.5, scene.near)), Math.log(scene.far ?? scene.subjectAt * 6), 0.01, Math.log(focusAt),
      (l) => distance(Math.exp(l)), (l) => { focusAt = Math.exp(l); paint(); }, 'focus').node,
  );
  void f.view.ready.then(paint);
  paint();
  return f.node;
});
