// The depth-of-field figure: a bird on a branch, bushes behind it, trees and
// hills beyond, each a sharp flat picture standing at its real distance
// (core/stage.ts). The reader zooms, sets the aperture and the focus, and
// moves the bushes nearer or farther; every plane is blurred by the blur
// circle the P950 would really give it, and scaled by what the lens really
// magnifies it by.
//
// Zooming keeps the bird the same size: the camera steps back as the lens gets
// longer, as a photographer would. That is the fair comparison, and it shows
// the two things a long lens does to a background at once: it blurs it more,
// and makes it look bigger and nearer ("compression").
//
// A strip under the picture shows the same thing from the side: where you
// stand, the bird, the bushes and the trees, and the band that looks sharp.

import { el, svg } from 'didactics/dom';
import { line, note, redraw } from 'didactics/draw';
import {
  P950, apertureLabel, blurCircle, depthOfField, fromEquivalent, sharpEnough, widestAperture,
} from '../../core/camera';
import { shoot, settingsLine } from '../../core/shot';
import { BEHIND_RANGE, PERCHED, place, standFor } from '../../core/stage';
import { stagePictures } from '../stage/pictures';
import { stageRenderer } from '../stage/render';
import { COL, apertureSlider, distance, figure, frame, slider, tint } from './kit';

/** The picture's size in canvas pixels: the P950 sensor's proportions. */
const W = 760;
const H = Math.round((W * P950.sensor.h) / P950.sensor.w);

/** The zoom range this figure offers, equivalent mm: the long half, where birds are shot. */
const ZOOM = { min: 200, max: 2000 } as const;

/** The background counts as melted away past this blur (a fiftieth of the frame), and as readable under a 250th. */
const MELTED = 0.02;
const READABLE = 0.004;

export const apertureFigure = figure(['blur-background', 'all-sharp'], (ctx, t) => {
  const units = ctx.save.units;
  const stage = PERCHED;

  const canvas = el('canvas.shot', { width: W, height: H, role: 'img' }) as HTMLCanvasElement;
  const caption = el('p.shot-settings');
  const side = svg('svg', { viewBox: '0 0 400 64', class: 'fig-svg dof-strip', role: 'img' }) as SVGSVGElement;
  const drawing = el('figure.photo.shot-figure', {}, canvas, caption, side);
  const f = frame({ drawing, lines: 5 });
  f.node.classList.add('shot-body');

  const renderer = stageRenderer(canvas);
  let pictures: ReadonlyMap<string, HTMLImageElement | HTMLCanvasElement> = new Map();
  let planes = stage.planes;

  let eqFocal = 1000;
  let n = 8;
  let focusRatio = 1; // focus distance over the bird's
  let behind = stage.planes.find((p) => p.movable)?.behind ?? 8;

  let frameId = 0;
  const g = svg('g');
  side.append(g);

  const paint = () => {
    const focal = fromEquivalent(P950, eqFocal);
    const stand = standFor(stage, focal);
    const focusAt = stand * focusRatio;
    const aperture = Math.max(n, widestAperture(P950, focal));
    const placed = place({ ...stage, planes }, { focal, n: aperture, stand, focusAt, behind });
    const bushes = placed.find((p) => p.plane.movable);
    const soft = bushes?.blur ?? 0;
    const depth = depthOfField(P950, focal, aperture, focusAt);
    const birdSharp = blurCircle(focal, aperture, focusAt, stand) <= sharpEnough(P950);

    if (!frameId) frameId = requestAnimationFrame(() => { frameId = 0; renderer.draw(placed, pictures); });

    // The settings line, as the camera's own display would show them.
    const shot = shoot({ subjectAt: stand, near: stand, far: null, ev: 12 }, { eqFocal, aperture, focusAt });
    caption.textContent = settingsLine(shot);

    const clamped = aperture > n + 0.05 ? ` The lens opens no wider than ${apertureLabel(aperture)} here.` : '';
    const where = `You stand ${distance(stand, units)} back.`;
    const band = birdSharp
      ? `Sharp from ${distance(depth.near, units)} to ${distance(depth.far, units)}.`
      : `The lens is focused at ${distance(focusAt, units)}, so the bird is soft.`;
    const back = `Bushes ${distance(behind, units)} behind: blurred over ${(soft * 100).toFixed(1)}% of the frame, ` +
      (soft >= MELTED ? 'melted away.' : soft <= READABLE ? 'every leaf readable.' : 'soft but still busy.');
    f.readout.textContent = `${where} ${band} ${back}${clamped}`;
    canvas.setAttribute('aria-label', `A bird on a branch at ${eqFocal.toFixed(0)} mm and ${apertureLabel(aperture)}; the bushes behind are ${soft >= MELTED ? 'a smooth blur' : soft <= READABLE ? 'sharp' : 'soft'}.`);

    drawSide(g, { stand, focusAt, near: depth.near, far: depth.far, behind, units });

    if (t.goal === 'blur-background' && birdSharp && soft >= MELTED) t.done();
    if (t.goal === 'all-sharp' && birdSharp && soft <= READABLE) t.done();
  };

  const focusText = (v: number) => (Math.abs(v - 1) < 0.004
    ? 'on the bird'
    : `${v < 1 ? 'in front' : 'behind'}, ${distance(standFor(stage, fromEquivalent(P950, eqFocal)) * v, units)}`);
  const focusSlider = slider('Focus', {
    min: 0.6, max: 2.5, scale: 'log', value: 1, show: focusText,
    onInput: (v) => { focusRatio = Math.abs(v - 1) < 0.004 ? 1 : v; paint(); },
    color: 'focus',
  });
  // The focus is kept as a share of the bird's distance, so it follows the
  // bird as you step back; its label, in metres, has to follow too.
  const refreshFocus = () => {
    const out = focusSlider.node.querySelector('output');
    if (out) out.textContent = focusText(focusRatio);
  };

  // The planes are drawn for the long half of the zoom, where birds are shot.
  const zoomHere = slider('Zoom', {
    min: ZOOM.min, max: ZOOM.max, scale: 'log', step: 1, value: eqFocal, show: (v) => `${Math.round(v)} mm`,
    onInput: (v) => { eqFocal = v; refreshFocus(); paint(); }, color: 'subject',
  });

  f.controls.append(
    zoomHere.node,
    apertureSlider(n, (v) => { n = v; paint(); }).node,
    focusSlider.node,
    slider('Bushes behind', { min: BEHIND_RANGE.min, max: BEHIND_RANGE.max, scale: 'log', value: behind, show: (v) => distance(v, units), onInput: (v) => { behind = v; paint(); }, color: 'soften' }).node,
  );

  const ready = stagePictures(stage).then((got) => {
    pictures = got.pictures;
    planes = got.planes;
    paint();
  });
  t.waitFor(ready.then(() => new Promise<void>((done) => requestAnimationFrame(() => done()))));
  paint();
  return f.node;
});

/** The scene from the side, on a log scale of distance: you, the sharp band, the bird, the bushes, the trees. */
function drawSide(
  g: SVGElement,
  o: { stand: number; focusAt: number; near: number; far: number; behind: number; units: Parameters<typeof distance>[1] },
): void {
  const L = 34;
  const R = 386;
  const Y = 34;
  const lo = 1;
  const hi = 1000;
  const x = (m: number) => L + ((R - L) * Math.log(Math.min(hi, Math.max(lo, m)) / lo)) / Math.log(hi / lo);
  const bird = o.stand;
  const bushes = o.stand + o.behind;
  const trees = o.stand + (PERCHED.planes.find((p) => p.id === 'trees')?.behind ?? 80);
  const far = isFinite(o.far) ? o.far : hi;
  redraw(
    g,
    line(L, Y, R, Y, COL.grid, 1),
    // You, with the camera.
    svg('rect', { x: L - 22, y: Y - 7, width: 14, height: 10, rx: 2, fill: COL.subject }),
    svg('circle', { cx: L - 8, cy: Y - 2, r: 3.4, fill: COL.aperture }),
    note(L - 15, Y + 20, 'you', { anchor: 'middle', fill: COL.subject }),
    // The band that looks sharp, and where the lens is focused.
    svg('rect', { x: x(o.near), y: Y - 14, width: Math.max(1.5, x(far) - x(o.near)), height: 28, fill: tint(COL.sharp, 0.2), stroke: COL.sharp, 'stroke-width': 1 }),
    line(x(o.focusAt), Y - 18, x(o.focusAt), Y + 14, COL.focus, 1.4, { 'stroke-dasharray': '3 2' }),
    // The bird, the bushes and the trees.
    svg('circle', { cx: x(bird), cy: Y - 4, r: 4, fill: '#3d6fb6' }),
    note(x(bird), Y + 26, `bird ${distance(bird, o.units)}`, { anchor: 'middle', fill: COL.subject }),
    svg('ellipse', { cx: x(bushes), cy: Y - 2, rx: 6, ry: 9, fill: '#4c7d4f' }),
    note(Math.min(R - 30, x(bushes) + 4), Y - 18, 'bushes', { fill: COL.soft }),
    svg('path', { d: `M${x(trees)} ${Y - 22} l7 22 h-14Z`, fill: '#2f4f43' }),
    note(Math.min(R, x(trees)), Y + 26, 'trees', { anchor: 'end', fill: COL.soft }),
  );
}

