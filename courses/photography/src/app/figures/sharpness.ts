// Figures about the limits of sharpness: diffraction, which softens the whole
// frame as the aperture narrows, against defocus, which narrowing cures; and
// the hyperfocal distance, the focus that carries a landscape's sharp band
// from the flowers at your feet to the hills.

import { svg } from 'didactics/dom';
import { label, line, note, redraw } from 'didactics/draw';
import { APERTURE_STEPS, P950, apertureLabel, blurCircle, depthOfField, diffraction, fromEquivalent, hyperfocal, sharpEnough, widestAperture } from '../../core/camera';
import { COL, apertureSlider, distance, figure, frame, slider, tint, zoomSlider } from './kit';

/** The P950's pixel pitch, mm: 6.17 mm over 4608 pixels, 1.34 µm. */
const PITCH = P950.sensor.w / P950.pixelsAcross;

/**
 * Two blurs pulling opposite ways. A flower bed a metre away at 100 mm: its
 * front and back are some centimetres either side of the focus, and their
 * defocus discs shrink as the aperture narrows, while the diffraction disc
 * every point gets grows. The total is smallest somewhere between: the
 * reader finds that aperture, for a subject deep or shallow.
 */
export const diffractionFigure = figure(['sweet'], (ctx, t) => {
  const units = ctx.save.units;
  const W = 400;
  const H = 230;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);

  const eq = 100;
  const focal = fromEquivalent(P950, eq);
  const at = 1; // metres
  const widest = widestAperture(P950, focal);
  const stops = APERTURE_STEPS.filter((n) => n >= widest - 0.05);
  let n = stops[0];
  let depth = 0.1; // metres, front to back
  let movedDepth = false;

  const blurs = (N: number) => {
    const defocus = blurCircle(focal, N, at, at - depth / 2) * 1000; // µm
    const diff = diffraction(N) * 1000;
    return { defocus, diff, total: Math.hypot(defocus, diff) };
  };

  // The graph: f-number across, blur (µm) up.
  const GX = 196;
  const GW = 190;
  const GY = 30;
  const GH = 150;
  const xN = (N: number) => GX + (GW * Math.log(N / stops[0])) / Math.log(8 / stops[0]);
  const yB = (b: number) => GY + GH - (GH * Math.min(b, 24)) / 24;

  const paint = () => {
    const b = blurs(n);
    const best = stops.reduce((a, c) => (blurs(c).total < blurs(a).total ? c : a));
    const px = 9; // drawn pixels, per sensor pixel
    const cell = (x: number, y: number) => svg('rect', { x, y, width: px, height: px, fill: 'none', stroke: tint(COL.sensor, 0.35), 'stroke-width': 0.6 });
    const cells = [];
    for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) cells.push(cell(20 + i * px, 40 + j * px));
    const scale = px / (PITCH * 1000); // drawn px per µm
    const curve = (fn: (N: number) => number, color: string, w: number) => svg('polyline', {
      points: Array.from({ length: 41 }, (_, i) => { const N = stops[0] * (8 / stops[0]) ** (i / 40); return `${xN(N).toFixed(1)},${yB(fn(N)).toFixed(1)}`; }).join(' '),
      fill: 'none', stroke: color, 'stroke-width': w,
    });
    redraw(
      g,
      label(83, 26, 'on the sensor', { anchor: 'middle', size: 'small', soft: true }),
      ...cells,
      svg('circle', { cx: 83, cy: 103, r: (b.diff * scale) / 2, fill: tint(COL.light, 0.35), stroke: COL.light, 'stroke-width': 1.2 }),
      svg('circle', { cx: 83, cy: 103, r: Math.min(63, (b.total * scale) / 2), fill: 'none', stroke: COL.soften, 'stroke-width': 1.4, 'stroke-dasharray': '3 2' }),
      note(83, 186, 'squares: the P950\'s pixels', { anchor: 'middle', fill: COL.sensor }),
      note(83, 202, 'gold: diffraction · dashed: total', { anchor: 'middle', fill: COL.soft }),
      // The graph.
      line(GX, GY + GH, GX + GW, GY + GH, COL.grid, 1),
      line(GX, GY, GX, GY + GH, COL.grid, 1),
      line(GX, yB(sharpEnough(P950) * 1000), GX + GW, yB(sharpEnough(P950) * 1000), COL.sharp, 1, { 'stroke-dasharray': '4 3' }),
      note(GX + GW, yB(sharpEnough(P950) * 1000) - 4, 'sharp enough', { anchor: 'end', fill: COL.sharp }),
      curve((N) => blurs(N).defocus, COL.focus, 1.4),
      curve((N) => blurs(N).diff, COL.light, 1.4),
      curve((N) => blurs(N).total, COL.ink, 2),
      line(xN(n), GY, xN(n), GY + GH, COL.aperture, 1.2),
      svg('circle', { cx: xN(n), cy: yB(b.total), r: 4, fill: COL.aperture }),
      note(GX, GY + GH + 16, apertureLabel(stops[0]), { fill: COL.soft }),
      note(GX + GW, GY + GH + 16, 'f/8', { anchor: 'end', fill: COL.soft }),
      note(GX + GW / 2, GY + GH + 30, 'aperture', { anchor: 'middle', fill: COL.aperture }),
      note(GX - 4, GY + 6, 'blur', { anchor: 'end', fill: COL.soft }),
    );
    f.readout.textContent = `At ${apertureLabel(n)} the front of a ${distance(depth, units)}-deep flower bed is blurred by ${b.defocus.toFixed(1)} µm from focus and ${b.diff.toFixed(1)} µm from diffraction, ` +
      `about ${(b.total / (PITCH * 1000)).toFixed(0)} pixels in all. ` +
      (n === best ? 'That is as sharp as this scene gets.' : n < best ? 'Narrower would be sharper: focus is the bigger blur.' : 'Wider would be sharper: diffraction is the bigger blur.');
    if (t.goal === 'sweet' && movedDepth && n === best) t.done();
  };

  f.controls.append(
    slider('Aperture', { steps: stops, value: n, show: apertureLabel, onInput: (v) => { n = v; paint(); }, color: 'aperture' }).node,
    slider('Subject depth', { min: 0.02, max: 0.4, scale: 'log', value: depth, show: (v) => distance(v, units), onInput: (v) => { depth = v; movedDepth = true; paint(); }, color: 'focus' }).node,
  );
  paint();
  return f.node;
});

/** The far end of the focus slider stands for infinity. */
const FAR = 2000;

/**
 * The hyperfocal distance on a side view of a landscape: flowers at a metre,
 * a tree at 30 m, hills at the horizon. The sharp band follows the focus,
 * aperture and zoom; focused at the hyperfocal distance it runs from half
 * that distance to the horizon, as deep as a picture can be sharp.
 */
export const hyperfocalFigure = figure(['boots-to-hills'], (ctx, t) => {
  const units = ctx.save.units;
  const W = 400;
  const H = 150;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);

  let eq = 50;
  let n = 5.6;
  let focusAt = 30;

  const L = 30;
  const R = 360;
  const Y = 86;
  const lo = 0.3;
  const x = (m: number) => (m >= FAR ? R + 22 : L + ((R - L) * Math.log(m / lo)) / Math.log(FAR / lo));

  const paint = () => {
    const focal = fromEquivalent(P950, eq);
    const N = Math.max(n, widestAperture(P950, focal));
    const s = focusAt >= FAR ? 1e7 : focusAt;
    const d = depthOfField(P950, focal, N, s);
    const h = hyperfocal(P950, focal, N);
    const farX = isFinite(d.far) && d.far < FAR ? x(d.far) : R + 22;
    const ok = d.near <= 1.0 && !isFinite(d.far);
    redraw(
      g,
      line(L, Y, R + 30, Y, COL.grid, 1),
      svg('rect', { x: x(Math.max(lo, d.near)), y: Y - 46, width: Math.max(2, farX - x(Math.max(lo, d.near))), height: 52, fill: tint(COL.sharp, 0.18), stroke: COL.sharp, 'stroke-width': 1 }),
      line(x(Math.min(focusAt, FAR)), Y - 52, x(Math.min(focusAt, FAR)), Y + 8, COL.focus, 1.6, { 'stroke-dasharray': '4 3' }),
      note(x(Math.min(focusAt, FAR)), Y - 56, 'focus', { anchor: 'middle', fill: COL.focus }),
      // The camera, the flowers, the tree, the hills.
      svg('rect', { x: 6, y: Y - 12, width: 16, height: 12, rx: 2, fill: COL.subject }),
      ...[0, 8, 16].map((k) => svg('circle', { cx: x(1) - 8 + k, cy: Y - 6 - (k % 16 ? 4 : 0), r: 3.5, fill: '#c25a8a' })),
      note(x(1), Y + 18, 'flowers, 1 m', { anchor: 'middle', fill: COL.soft }),
      svg('path', { d: `M${x(30)} ${Y - 34} l9 34 h-18Z`, fill: '#3d6b4f' }),
      note(x(30), Y + 18, 'tree, 30 m', { anchor: 'middle', fill: COL.soft }),
      svg('path', { d: `M${R + 4} ${Y} q 14 -26 30 -8 v8Z`, fill: '#9fb3bd' }),
      note(R + 20, Y + 18, 'hills', { anchor: 'middle', fill: COL.soft }),
      line(x(h), Y + 26, x(h), Y + 34, COL.aperture, 2),
      note(x(h), Y + 46, `hyperfocal ${distance(h, units)}`, { anchor: x(h) > 300 ? 'end' : 'middle', fill: COL.aperture }),
    );
    f.readout.textContent = `${Math.round(eq)} mm at ${apertureLabel(N)}: sharp from ${distance(d.near, units)} to ${distance(d.far, units)}. ` +
      (ok ? 'From the flowers to the hills.' : !isFinite(d.far) ? 'The hills are sharp but the flowers are not.' : 'The hills are soft: focus farther, or narrow the aperture.');
    if (t.goal === 'boots-to-hills' && ok) t.done();
  };

  f.controls.append(
    zoomSlider(eq, (v) => { eq = v; paint(); }).node,
    apertureSlider(n, (v) => { n = v; paint(); }).node,
    slider('Focus', { min: lo, max: FAR, scale: 'log', value: focusAt, show: (v) => (v >= FAR * 0.98 ? 'infinity' : distance(v, units)), onInput: (v) => { focusAt = v >= FAR * 0.98 ? FAR : v; paint(); }, color: 'focus' }).node,
  );
  paint();
  return f.node;
});
