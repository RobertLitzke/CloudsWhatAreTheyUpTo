// Figures about the lens itself: compression, which is really about where
// you stand (a far moon behind a near pine grows as you back away and zoom
// in, the pine kept the same size), and reach, where cropping a shorter shot
// stands in for more zoom and costs pixels.

import { el, svg } from 'didactics/dom';
import { label, line, note, redraw } from 'didactics/draw';
import { P950, angleOfView, fromEquivalent } from '../../core/camera';
import { shoot, settingsLine } from '../../core/shot';
import { MOONRISE, place, standFor, type Placed } from '../../core/stage';
import { stagePictures } from '../stage/pictures';
import { stageRenderer } from '../stage/render';
import { COL, choices, distance, figure, frame, slider, tint, zoomSlider } from './kit';

const W = 760;
const H = Math.round((W * P950.sensor.h) / P950.sensor.w);

/** The moon's angular size, degrees. */
const MOON_DEG = (3.474e6 / 3.844e8) * (180 / Math.PI);

/**
 * The moon behind the pine. Zoom with "walk back" on and the camera steps
 * back to keep the pine a fifth of the frame: the moon swells behind it,
 * because it is the only thing that does not get farther away. With "stay
 * put" the zoom only crops, and the moon and the pine grow together: the
 * focal length never changed how big one looks against the other.
 */
export const compressionFigure = figure(['moon-big'], (ctx, t) => {
  const units = ctx.save.units;
  const stage = MOONRISE;
  const canvas = el('canvas.shot', { width: W, height: H, role: 'img', 'aria-label': 'A pine on a ridge with the moon behind it' }) as HTMLCanvasElement;
  const caption = el('p.shot-settings');
  const f = frame({ drawing: el('figure.photo.shot-figure', {}, canvas, caption), lines: 3 });
  f.node.classList.add('shot-body');
  const renderer = stageRenderer(canvas);
  let pictures: ReadonlyMap<string, HTMLImageElement | HTMLCanvasElement> = new Map();
  let planes = stage.planes;

  let eqFocal = 200;
  let walk = true;
  /** Where the camera stands when it stays put: where 200 mm frames the pine. */
  const fixed = standFor(stage, fromEquivalent(P950, 200));
  let frameId = 0;
  let latest: Placed[] = [];

  const paint = () => {
    const focal = fromEquivalent(P950, eqFocal);
    const stand = walk ? standFor(stage, focal) : fixed;
    const placed = place({ ...stage, planes }, { focal, n: 5.6, stand, focusAt: stand });
    latest = placed;
    if (!frameId) frameId = requestAnimationFrame(() => { frameId = 0; renderer.draw(latest, pictures); });
    const tall = (angleOfView(P950, focal) * P950.sensor.h) / P950.sensor.w; // the frame's height, degrees
    const moon = MOON_DEG / tall;
    const pine = (stage.subjectTall / stand) * (180 / Math.PI) / tall;
    const ratio = MOON_DEG / ((stage.subjectTall / stand) * (180 / Math.PI));
    caption.textContent = `${settingsLine(shoot({ subjectAt: stand, near: stand, far: null, ev: 10 }, { eqFocal, aperture: 5.6 }))} · ${distance(stand, units)} from the pine`;
    f.readout.textContent = `From ${distance(stand, units)} away the moon is ${(moon * 100).toFixed(0)}% of the frame's height and the pine ${pine > 1 ? 'more than fills it' : `${(pine * 100).toFixed(0)}%`}. ` +
      `The moon looks ${ratio < 1 ? `${(1 / ratio).toFixed(1)} times smaller than` : `${ratio.toFixed(1)} times as tall as`} the pine, and only walking changes that.`;
    if (t.goal === 'moon-big' && walk && moon >= 0.5) t.done();
  };

  const pick = choices(['Walk back as you zoom', 'Stay put'], (i) => { walk = i === 0; paint(); });
  f.controls.append(el('div.fig-row', {}, pick.node), zoomSlider(eqFocal, (v) => { eqFocal = v; paint(); }).node);
  pick.pick(0);
  t.waitFor(stagePictures(stage).then((got) => { pictures = got.pictures; planes = got.planes; paint(); }));
  paint();
  return f.node;
});

/** What a picture's pixels across are enough for. */
const USES = [
  { name: 'phone', px: 1080 },
  { name: 'computer screen', px: 1920 },
  { name: 'A4 print', px: 3500 },
] as const;

/**
 * Reach: the heron should fill a quarter of the frame's width. At 2000 mm it
 * does with all 4608 pixels; at a shorter zoom the frame has to be cropped
 * to put it there, and the crop keeps only its share of the pixels. The
 * sensor is drawn with the part the crop keeps; bars say what is left is
 * enough for.
 */
export const cropFigure = figure(['screen'], (_ctx, t) => {
  const SW = 400;
  const SH = 226;
  const f = frame(SW, SH, 3);
  const g = svg('g');
  f.svg.append(g);
  let eqFocal = 2000;

  const paint = () => {
    const keep = eqFocal / 2000; // the share of the frame's width the crop keeps
    const px = Math.round(P950.pixelsAcross * keep);
    // The sensor, 4608 × 3456, drawn 240 wide.
    const sx = 20;
    const sy = 24;
    const sw = 232;
    const sh = (sw * 3) / 4;
    const kw = sw * keep;
    const kh = sh * keep;
    const kx = sx + (sw - kw) / 2;
    const ky = sy + (sh - kh) / 2;
    // The heron: a quarter of the crop's width.
    const hw = kw * 0.25;
    const ok = (need: number) => px >= need;
    redraw(
      g,
      svg('rect', { x: sx, y: sy, width: sw, height: sh, fill: tint(COL.sensor, 0.08), stroke: COL.sensor, 'stroke-width': 1.2 }),
      note(sx, sy - 8, `the sensor, ${P950.pixelsAcross} pixels across`, { fill: COL.sensor }),
      svg('rect', { x: kx, y: ky, width: kw, height: kh, fill: tint(COL.aperture, 0.16), stroke: COL.aperture, 'stroke-width': 1.6 }),
      svg('ellipse', { cx: sx + sw / 2, cy: sy + sh / 2, rx: hw / 2, ry: Math.max(1, hw * 0.45), fill: COL.subject }),
      note(sx + sw / 2 + hw / 2 + 4, sy + sh / 2 + 4, 'heron', { fill: COL.subject }),
      note(sx + sw / 2, sy + sh + 18, keep >= 0.999 ? 'no crop needed' : `the crop keeps ${px} pixels across`, { anchor: 'middle', fill: COL.aperture }),
      ...USES.flatMap((u, i) => {
        const y = 40 + i * 44;
        const share = Math.min(1, px / u.px);
        return [
          label(282, y, u.name, { size: 'small', fill: ok(u.px) ? COL.ink : COL.soft }),
          svg('rect', { x: 282, y: y + 6, width: 100, height: 10, rx: 5, fill: tint(COL.ink, 0.08) }),
          svg('rect', { x: 282, y: y + 6, width: 100 * share, height: 10, rx: 5, fill: ok(u.px) ? COL.sharp : COL.time }),
          note(382, y, `${u.px}`, { anchor: 'end', fill: COL.soft }),
        ];
      }),
      line(268, 24, 268, 190, COL.grid, 1),
    );
    const enough = USES.filter((u) => ok(u.px)).map((u) => u.name);
    f.readout.textContent = `Zoomed to ${Math.round(eqFocal)} mm, the heron needs ${keep >= 0.999 ? 'no crop' : `a crop to ${(keep * 100).toFixed(0)}% of the frame's width`}, leaving ${px} pixels across. ` +
      (enough.length ? `Enough for a ${enough[enough.length - 1]}.` : 'Not enough even for a phone screen.');
    if (t.goal === 'screen' && eqFocal <= 1000 && px >= 1920) t.done();
  };

  f.controls.append(slider('Zoom', { min: 200, max: 2000, scale: 'log', value: eqFocal, show: (v) => `${Math.round(v)} mm`, onInput: (v) => { eqFocal = v; paint(); }, color: 'aperture' }).node);
  paint();
  return f.node;
});
