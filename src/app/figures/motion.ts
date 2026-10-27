// Figures about time: how long the shutter stays open, what moves while it is
// open, and which of the two blurs you are looking at. A bird's wings and your
// own hands are two different problems with the same dial.

import { svg } from 'lesson-kit/dom';
import { label, line, note, redraw } from 'lesson-kit/draw';
import { shutterLabel } from '../../core/camera';
import { shoot } from '../../core/shot';
import { shotPhoto } from '../picture';
import { COL, distance, figure, frame, shutterSlider, slider, tint } from './kit';
import { noPhoto, shotFrame } from './shot';

/**
 * The shutter on a photograph: a bird in flight, a shutter dial, and a switch
 * for the stabiliser. Slow enough and the bird smears; slower still and the
 * whole frame smears with your hands. The stabiliser helps with one of them
 * and not at all with the other, which is the thing to come away with.
 */
export const shutterFigure = figure(['freeze', 'see-shake'], (_ctx, t, options) => {
  const photo = shotPhoto('bird-in-flight', options?.photo as string | undefined);
  if (!photo?.scene) return noPhoto('a bird in flight').node;
  const scene = photo.scene;

  const f = shotFrame(photo, 3);
  let shutter = 1 / 60;
  let vr = true;
  const eqFocal = scene.eqFocal ?? 1200;

  const paint = () => {
    const shot = shoot(scene, { eqFocal, shutter, vr });
    const smear = shot.render.smear;
    const shake = shot.render.shake;
    const blurry = (x: number) => x > 0.004;
    const say = !blurry(smear) && !blurry(shake)
      ? `Sharp. At ${eqFocal} mm the rule of thumb calls ${shutterLabel(shot.safeShutter)} s the slowest safe hand-held shutter${vr ? ' with the stabiliser on' : ''}.`
      : blurry(smear) && blurry(shake)
        ? 'Both blurs at once: the bird is smeared against the sky, and the whole frame is smeared with it.'
        : blurry(smear)
          ? 'The bird smears and the background does not: that is the subject moving, and only a faster shutter fixes it.'
          : 'The whole frame smears together: that is your hands, and the stabiliser or a tripod fixes it.';
    f.paint(shot, say);
    if (t.goal === 'freeze' && !blurry(smear) && !blurry(shake)) t.done();
    if (t.goal === 'see-shake' && blurry(shake) && !vr) t.done();
  };

  const vrButton = document.createElement('button');
  vrButton.type = 'button';
  vrButton.className = 'btn btn-small';
  const paintVr = () => (vrButton.textContent = vr ? 'Stabiliser: on' : 'Stabiliser: off');
  vrButton.addEventListener('click', () => {
    vr = !vr;
    paintVr();
    paint();
  });
  paintVr();

  f.controls.append(shutterSlider(shutter, (v) => { shutter = v; paint(); }).node, vrButton);
  void f.view.ready.then(paint);
  paint();
  return f.node;
});

/**
 * Why zoom makes shake worse, drawn: the same small wobble of the camera
 * sweeps a wider and wider arc across the frame as the lens gets longer. The
 * reader finds the shutter at which a given zoom stops smearing.
 */
export const shakeDiagram = figure(['rule-of-thumb'], (_ctx, t) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let eqFocal = 1000;
  let shutter = 1 / 125;

  const paint = () => {
    const shot = shoot({ subjectAt: 30, near: 5, far: null }, { eqFocal, shutter, vr: false });
    const drift = shot.render.shake;
    const smeared = drift * 280;
    const safe = shot.safeShutter;

    redraw(
      g,
      // The frame, and a bird in it, drawn once for every moment the shutter was open.
      svg('rect', { x: 60, y: 24, width: 280, height: 120, fill: COL.paper, stroke: COL.grid, 'stroke-width': 1.5 }),
      ...Array.from({ length: 11 }, (_, i) =>
        svg('circle', {
          cx: 200 + (i / 10 - 0.5) * smeared,
          cy: 84 + Math.sin((i / 10 - 0.5) * Math.PI) * smeared * 0.35,
          r: 15,
          fill: tint(COL.subject, 0.12),
        }),
      ),
      svg('circle', { cx: 200, cy: 84, r: 15, fill: tint(COL.subject, 0.3) }),
      note(200, 164, `the same bird, ${shutterLabel(shutter)} s of it`, { anchor: 'middle', soft: true }),
      line(60, 178, 340, 178, COL.grid, 1),
      label(60, 192, `${Math.round(eqFocal)} mm`, { bold: true, fill: COL.subject }),
      label(340, 192, `safe: ${shutterLabel(safe)} s`, { anchor: 'end', fill: drift * 760 > 1 ? COL.time : COL.ink }),
    );

    f.readout.textContent = drift * 760 > 1
      ? `A hand wanders about the same amount whatever lens is on. At ${Math.round(eqFocal)} mm that wander covers ${(drift * 100).toFixed(1)}% of the frame in ${shutterLabel(shutter)} s, which shows.`
      : `At ${shutterLabel(shutter)} s the wander covers less than a pixel's worth of the frame: sharp.`;
    if (t.goal === 'rule-of-thumb' && eqFocal > 600 && drift * 760 <= 1) t.done();
  };

  f.controls.append(
    slider('Zoom', Math.log2(24), Math.log2(2000), 0.02, Math.log2(eqFocal), (l) => `${Math.round(2 ** l)} mm`, (l) => { eqFocal = 2 ** l; paint(); }, 'subject').node,
    shutterSlider(shutter, (v) => { shutter = v; paint(); }).node,
  );
  paint();
  return f.node;
});

/**
 * The other way round: a shutter left open on purpose, on running water. Here
 * the smear is the picture, and the problem becomes letting in too much light.
 */
export const silkWaterFigure = figure(['silk'], (_ctx, t, options) => {
  const photo = shotPhoto('running-water', options?.photo as string | undefined);
  if (!photo?.scene) return noPhoto('a waterfall or a stream').node;
  const scene = { ...photo.scene, speed: photo.scene.speed ?? 2 };

  const f = shotFrame(photo, 3);
  let shutter = 1 / 500;

  const paint = () => {
    const shot = shoot(scene, { eqFocal: scene.eqFocal ?? 50, shutter, iso: 100, tripod: true });
    const over = Math.log2(shot.render.exposure);
    const say = shot.render.smear < 0.002
      ? `Every drop is stopped where it was. ${distance(scene.subjectAt)} away, at ${shutterLabel(shutter)} s, the water moves less than a pixel.`
      : over > 0.4
        ? `The water is silk, but the picture is ${over.toFixed(1)} stops over: at ISO 100 and f/8 there is nowhere left to go. This is what a grey filter is for.`
        : 'The water draws itself into threads, and the rocks stay put, because only the water moved.';
    f.paint(shot, say);
    if (t.goal === 'silk' && shot.render.smear > 0.01) t.done();
  };

  f.controls.append(shutterSlider(shutter, (v) => { shutter = v; paint(); }).node);
  void f.view.ready.then(paint);
  paint();
  return f.node;
});
