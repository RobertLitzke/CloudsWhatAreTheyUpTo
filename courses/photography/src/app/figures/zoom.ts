// Figures about the lens: how much of the world it takes in, how big that
// makes a bird, and the three things that come with the long end of an 83×
// zoom (a dimmer lens, a thinner slice of sharpness, and every wobble
// magnified).

import { svg } from 'didactics/dom';
import { label, line, note, redraw } from 'didactics/draw';
import { P950, angleOfView, apertureLabel, fromEquivalent, widestAperture } from '../../core/camera';
import { shoot } from '../../core/shot';
import { photoOptions, shotPhoto, type PhotoOptions } from '../picture';
import { COL, apertureSlider, distance, figure, frame, slider, tint, zoomSlider } from './kit';
import { noPhoto, shotFrame } from './shot';

/**
 * The zoom on a photograph: the same scene from 24 mm to 2000 mm, with what
 * the camera gives up on the way written under it. The task is to fill the
 * frame with the subject and notice what it cost.
 */
export const zoomFigure = figure<PhotoOptions>(['fill-frame'], (ctx, t, options) => {
  const units = ctx.save.units;
  const photo = shotPhoto('distant-wildlife', options?.photo);
  if (!photo?.scene) return noPhoto('an animal across a field').node;
  const scene = photo.scene;

  const f = shotFrame(photo, 3);
  let eqFocal = scene.eqFocal ?? 2000;
  const subjectTall = 0.5; // a heron-sized animal, metres

  const paint = () => {
    const shot = shoot(scene, { eqFocal });
    const fills = shot.subjectHeight(subjectTall);
    const say = `${Math.round(shot.angle)}° of the world across the frame. Something ${distance(subjectTall, units)} tall at ${distance(scene.subjectAt, units)} fills ${Math.round(fills * 100)}% of the height. ` +
      `The lens opens no wider than ${apertureLabel(shot.widest)} here.`;
    f.paint(shot, say);
    if (t.goal === 'fill-frame' && fills > 0.5) t.done();
  };

  f.controls.append(zoomSlider(eqFocal, (v) => { eqFocal = v; paint(); }).node);
  f.start(t, paint);
  return f.node;
}, { options: photoOptions('distant-wildlife') });

/**
 * What the lens takes in, drawn from above: the wedge of the world that lands
 * on the sensor. The same wedge is what the zoom number means, and seeing it
 * narrow makes the millimetres mean something.
 */
export const angleDiagram = figure(['narrow'], (_ctx, t) => {
  const W = 400;
  const H = 210;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let eqFocal = 24;

  const paint = () => {
    const real = fromEquivalent(P950, eqFocal);
    const angle = angleOfView(P950, real);
    const half = ((angle / 2) * Math.PI) / 180;
    const R = 160;
    const camX = 200;
    const camY = 186;
    const dx = Math.sin(half) * R;
    const dy = Math.cos(half) * R;

    redraw(
      g,
      // Trees across the far side, so the wedge takes in more or fewer of them.
      ...Array.from({ length: 17 }, (_, i) => {
        const x = 16 + i * 23;
        return svg('circle', { cx: x, cy: 26, r: 7, fill: Math.abs(Math.atan2(x - camX, camY - 26)) <= half ? COL.subject : tint(COL.soft, 0.25) });
      }),
      svg('path', { d: `M${camX} ${camY} L${camX - dx} ${camY - dy} L${camX + dx} ${camY - dy}Z`, fill: tint(COL.aperture, 0.16), stroke: COL.aperture, 'stroke-width': 1.3 }),
      svg('rect', { x: camX - 14, y: camY - 6, width: 28, height: 16, rx: 3, fill: COL.subject }),
      label(camX, camY + 22, `${Math.round(eqFocal)} mm · ${Math.round(angle)}°`, { anchor: 'middle', bold: true, fill: COL.aperture }),
      note(20, 46, 'what the frame takes in', { soft: true }),
    );
    f.readout.textContent = `At ${Math.round(eqFocal)} mm the frame holds ${Math.round(angle)}° of the world, ${(2 * Math.tan(half) * 100).toFixed(0)} m wide at 100 m. Zooming in does not bring you closer: it throws away everything outside the wedge.`;
    if (t.goal === 'narrow' && eqFocal > 800) t.done();
  };

  f.controls.append(zoomSlider(eqFocal, (v) => { eqFocal = v; paint(); }).node);
  paint();
  return f.node;
});

/**
 * The price of the long end, on one chart: as the zoom goes out, the widest
 * aperture closes from f/2.8 to f/6.5, so the shutter the camera can afford
 * gets slower at the very moment shake is worst.
 */
export const longEndDiagram = figure(['price'], (_ctx, t) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let eqFocal = 24;

  const x = (eq: number) => 50 + (Math.log2(eq / 24) / Math.log2(2000 / 24)) * 310;
  const y = (n: number) => 160 - ((n - 2.5) / 4.5) * 120;

  const paint = () => {
    const widest = widestAperture(P950, fromEquivalent(P950, eqFocal));
    const stops = Math.log2((widest * widest) / (2.8 * 2.8));
    const curve = Array.from({ length: 60 }, (_, i) => {
      const eq = 24 * (2000 / 24) ** (i / 59);
      return `${i ? 'L' : 'M'}${x(eq).toFixed(1)} ${y(widestAperture(P950, fromEquivalent(P950, eq))).toFixed(1)}`;
    }).join(' ');

    redraw(
      g,
      line(50, 160, 360, 160, COL.grid, 1.2),
      line(50, 40, 50, 160, COL.grid, 1.2),
      ...[2.8, 4, 5.6, 6.5].map((n) => note(44, y(n) + 4, apertureLabel(n), { anchor: 'end', soft: true })),
      ...[24, 100, 500, 2000].map((eq) => note(x(eq), 176, `${eq}`, { anchor: 'middle', soft: true })),
      note(205, 194, 'zoom, mm', { anchor: 'middle', soft: true }),
      svg('path', { d: curve, fill: 'none', stroke: COL.aperture, 'stroke-width': 2.4 }),
      svg('circle', { cx: x(eqFocal), cy: y(widest), r: 5, fill: COL.aperture }),
      label(x(eqFocal), y(widest) - 12, apertureLabel(widest), { anchor: 'middle', bold: true, fill: COL.aperture }),
    );
    f.readout.textContent = `At ${Math.round(eqFocal)} mm the lens opens no wider than ${apertureLabel(widest)}: ${stops.toFixed(1)} stops less light than at the wide end. The shutter has to be ${stops.toFixed(1)} stops slower, or the ISO that much higher, for the same picture.`;
    if (t.goal === 'price' && eqFocal >= 1200) t.done();
  };

  f.controls.append(zoomSlider(eqFocal, (v) => { eqFocal = v; paint(); }).node);
  paint();
  return f.node;
});

/**
 * Close up, the sharp band is millimetres thick. The same figure as the
 * aperture one, on a flower at half a metre, where the reader meets the other
 * end of depth of field.
 */
export const closeUpFigure = figure<PhotoOptions>(['thin-band'], (ctx, t, options) => {
  const units = ctx.save.units;
  const photo = shotPhoto('flower-close', options?.photo);
  if (!photo?.scene) return noPhoto('a flower, close up').node;
  const scene = photo.scene;

  const f = shotFrame(photo, 3);
  let n = 2.8;
  let focusAt = scene.subjectAt;

  const paint = () => {
    // Macro: at the wide end this camera focuses within a centimetre, which is
    // the only way to be this close to a flower at all.
    const shot = shoot(scene, { eqFocal: scene.eqFocal ?? 100, aperture: n, focusAt, macro: true });
    const band = shot.depth.far - shot.depth.near;
    const clamped = shot.aperture > n + 0.05 ? ` The lens opens no wider than ${apertureLabel(shot.aperture)} at this zoom.` : '';
    f.paint(shot, `Sharp from ${distance(shot.depth.near, units)} to ${distance(shot.depth.far, units)}: a band ${band < 0.1 ? `${Math.round(band * 1000)} mm` : distance(band, units)} thick. Up close, that band is thinner than the flower.${clamped}`);
    if (t.goal === 'thin-band' && band < 0.08) t.done();
  };

  f.controls.append(
    apertureSlider(n, (v) => { n = v; paint(); }).node,
    slider('Focus on', { min: scene.near, max: scene.subjectAt * 2.5, scale: 'log', value: focusAt, show: (v) => distance(v, units), onInput: (v) => { focusAt = v; paint(); }, color: 'focus' }).node,
  );
  f.start(t, paint);
  return f.node;
}, { options: photoOptions('flower-close') });
