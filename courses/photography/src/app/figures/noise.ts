// Figures about noise and the light running out: how a noisy picture cleans
// up when it is shown smaller (neighbouring pixels pooled, their errors
// averaging out), and dusk as a clock, the light falling a stop every few
// minutes and the ISO a shot needs climbing with it.

import { el, svg } from 'didactics/dom';
import { line, note, redraw } from 'didactics/draw';
import { ISO_STEPS, P950, SHUTTER_STEPS, apertureLabel, fromEquivalent, isoFor, pixelNoise, safeShutter, shutterLabel, widestAperture } from '../../core/camera';
import { settingsLine, shoot } from '../../core/shot';
import { makeRng } from 'didactics/rng';
import { asset } from '../asset';
import { develop, loadPhoto } from '../photo/film';
import { COL, choices, figure, frame, slider, tint, type Options } from './kit';
import { noPhoto } from './shot';
import { PHOTOS, credit } from '../picture';

/** How the picture is looked at: how many sensor pixels each screen pixel pools. */
const VIEWS = [
  { name: 'Every pixel', say: 'every pixel of the sensor, one to one', pooled: 1 },
  { name: 'Half size', say: 'half size, four pixels to a dot', pooled: 4 },
  { name: 'On a phone', say: 'the whole picture on a phone, some 36 pixels to a dot', pooled: 36 },
] as const;

/** Where the 100% view looks: the heron's eye, as a share of the photo's width and height. */
const LOOK = { x: 0.57, y: 0.21 };

/**
 * The same photo at the same ISO, looked at three ways. At 100% every
 * pixel's own count shows, error and all; shown whole on a phone each dot is
 * the average of dozens of pixels and the errors mostly cancel. Grain is a
 * question of how big the picture will be seen.
 *
 * The exposure is right at every ISO (the shutter makes up the difference),
 * so the picture underneath never changes: it is developed once, and only
 * the view and the noise are redrawn. The noise is shot noise for each
 * pixel's own brightness, added in linear light.
 */
export const poolingFigure = figure<Options>(['phone'], (_ctx, t, options) => {
  const photo = PHOTOS.find((p) => p.id === (options?.photo ?? 'low-light-01'));
  if (!photo?.scene) return noPhoto('a bird after dark').node;
  const scene = photo.scene;
  const W = 760;
  const H = Math.round((W * photo.height) / photo.width);
  const canvas = el('canvas.shot', { width: W, height: H, role: 'img', 'aria-label': 'A night heron on a ledge, with its grain' }) as HTMLCanvasElement;
  const caption = el('p.shot-settings');
  const f = frame({ drawing: el('figure.photo.shot-figure', {}, canvas, caption, el('figcaption', {}, credit(photo))), lines: 3 });
  f.node.classList.add('shot-body');
  const g = canvas.getContext?.('2d', { willReadFrequently: true }) ?? null;

  let iso = 3200;
  let view = 0;
  let touched = false;
  let base: HTMLCanvasElement | null = null;
  const rng = makeRng(5);
  const gauss = () => {
    const u = Math.max(1e-9, rng());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };

  const paint = () => {
    const eqFocal = scene.eqFocal ?? 200;
    const open = shoot(scene, { eqFocal, iso });
    const shutter = (open.widest * open.widest) / 2 ** ((scene.ev ?? 9) + Math.log2(iso / 100));
    const shot = shoot(scene, { eqFocal, iso, shutter, aperture: open.widest });
    const v = VIEWS[view];
    const { sigma } = pixelNoise(P950, iso, 0.18, v.pooled);
    caption.textContent = settingsLine(shot);
    f.readout.textContent = `ISO ${iso}, seen as ${v.say}: in a mid-grey the grain is ${(sigma * 100).toFixed(1)}% of white. ` +
      (sigma < 0.012 ? 'Smooth enough that nobody would call it grainy.' : sigma < 0.025 ? 'Grainy if you look for it.' : 'Plainly grainy.');
    if (g && base) {
      // The share of the photo's width on screen: 760 of the sensor's 4608 pixels at one to one.
      const share = Math.min(1, (Math.sqrt(v.pooled) * W) / P950.pixelsAcross);
      const sw = base.width * share;
      const sh = (sw * H) / W;
      const sx = Math.min(base.width - sw, Math.max(0, LOOK.x * base.width - sw / 2));
      const sy = Math.min(base.height - sh, Math.max(0, LOOK.y * base.height - sh / 2));
      g.imageSmoothingEnabled = true;
      g.drawImage(base, sx, sy, sw, sh, 0, 0, W, H);
      const img = g.getImageData(0, 0, W, H);
      const d = img.data;
      const white = P950.fullWell * (P950.iso.min / iso);
      const read = P950.readNoise * P950.readNoise;
      const pool = Math.sqrt(v.pooled);
      for (let i = 0; i < d.length; i += 4) {
        const lum = (TO_LIN[d[i]] * 0.2126 + TO_LIN[d[i + 1]] * 0.7152 + TO_LIN[d[i + 2]] * 0.0722);
        const s = Math.sqrt(lum * white + read) / white / pool;
        const shared = gauss() * s;
        for (let c = 0; c < 3; c++) {
          const lin = Math.max(0, TO_LIN[d[i + c]] + shared + gauss() * s * 0.4);
          d[i + c] = Math.round(255 * toSrgb(Math.min(1, lin)));
        }
      }
      g.putImageData(img, 0, 0);
    }
    if (t.goal === 'phone' && touched && iso >= 3200 && view === 2) t.done();
  };

  t.waitFor(loadPhoto(photo, asset).then((loaded) => {
    const c = document.createElement('canvas');
    c.width = loaded.image.naturalWidth;
    c.height = loaded.image.naturalHeight;
    const shot = shoot(scene, { eqFocal: scene.eqFocal ?? 200, iso: 100, shutter: 1 / 15 });
    develop(c, loaded, { ...shot.render, crop: 1, noise: 0, exposure: 1, shake: 0, smear: 0 });
    base = c;
    paint();
  }));

  const isoSteps = ISO_STEPS.filter((s) => s >= 400);
  const pick = choices(VIEWS.map((v) => v.name), (i) => { view = i; touched = true; paint(); });
  f.controls.append(
    el('div.fig-row', {}, pick.node),
    slider('ISO', { steps: isoSteps, value: iso, show: (v) => String(v), onInput: (v) => { iso = v; touched = true; paint(); }, color: 'sensor' }).node,
  );
  pick.pick(0);
  paint();
  return f.node;
}, { options: (o) => (o?.photo === undefined || PHOTOS.some((p) => p.id === o.photo && p.scene) ? [] : [`no photo "${String(o?.photo)}"`]) });

const TO_LIN = Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** The light after sunset, as an exposure value: about a stop every four minutes. */
export const duskEv = (minutes: number): number => 12 - minutes / 4;

/** The ISO lines the figure marks. */
const CLEAN = 1600;

/**
 * Dusk as a clock. A bird on a post at 1000 mm, the lens wide open: as the
 * minutes after sunset pass, the ISO that exposes it climbs a stop every
 * four, past where grain shows and on past the camera's limit. A slower
 * shutter buys the minutes back, as far as a braced hand can hold.
 */
export const duskFigure = figure(['late'], (_ctx, t) => {
  const W = 400;
  const H = 190;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);

  const eqFocal = 1000;
  const focal = fromEquivalent(P950, eqFocal);
  const n = widestAperture(P950, focal);
  const safe = safeShutter(eqFocal, true);

  let minutes = 10;
  let shutter = 1 / 500;

  const L = 52;
  const R = 384;
  const T = 16;
  const B = 150;
  const MAX = 45;
  const x = (m: number) => L + ((R - L) * m) / MAX;
  const isoLo = 100;
  const isoHi = 102400;
  const y = (iso: number) => B - ((B - T) * Math.log(Math.min(isoHi, Math.max(isoLo, iso)) / isoLo)) / Math.log(isoHi / isoLo);

  const paint = () => {
    const need = isoFor(duskEv(minutes), n, shutter);
    const curve = Array.from({ length: 46 }, (_, m) => `${x(m).toFixed(1)},${y(isoFor(duskEv(m), n, shutter)).toFixed(1)}`).join(' ');
    const shaky = shutter > safe * 1.05;
    const over = need > P950.iso.max;
    const ok = need <= CLEAN && !shaky;
    redraw(
      g,
      svg('rect', { x: L, y: y(P950.iso.max), width: R - L, height: y(isoLo) - y(P950.iso.max), fill: tint(COL.sensor, 0.06) }),
      svg('rect', { x: L, y: y(isoHi), width: R - L, height: y(P950.iso.max) - y(isoHi), fill: tint(COL.time, 0.1) }),
      line(L, y(CLEAN), R, y(CLEAN), COL.sharp, 1, { 'stroke-dasharray': '4 3' }),
      note(L + 4, y(CLEAN) - 4, 'grain starts to show', { fill: COL.sharp }),
      line(L, y(P950.iso.max), R, y(P950.iso.max), COL.time, 1.2),
      note(L + 4, y(P950.iso.max) - 4, 'the camera stops here', { fill: COL.time }),
      line(L, B, R, B, COL.grid, 1),
      line(L, T, L, B, COL.grid, 1),
      ...[100, 400, 1600, 6400, 25600].map((v) => note(L - 4, y(v) + 4, String(v), { anchor: 'end', fill: COL.soft })),
      ...[0, 15, 30, 45].map((m) => note(x(m), B + 14, String(m), { anchor: 'middle', fill: COL.soft })),
      note((L + R) / 2, B + 30, 'minutes after sunset', { anchor: 'middle', fill: COL.light }),
      note(L - 30, T - 4, 'ISO needed', { fill: COL.sensor }),
      svg('polyline', { points: curve, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }),
      line(x(minutes), T, x(minutes), B, COL.light, 1.2, { 'stroke-dasharray': '3 2' }),
      svg('circle', { cx: x(minutes), cy: y(need), r: 5, fill: ok ? COL.sharp : over ? COL.time : COL.sensor }),
    );
    const isoSay = over ? `ISO ${Math.round(need / 100) * 100}, which the camera does not have: the picture comes out ${Math.log2(need / P950.iso.max).toFixed(1)} stops dark` : `ISO ${Math.round(need / 10) * 10}`;
    f.readout.textContent = `${Math.round(minutes)} minutes after sunset, at ${eqFocal} mm, ${apertureLabel(n)} and ${shutterLabel(shutter)} s, the bird needs ${isoSay}. ` +
      (shaky ? 'And the shutter is now slower than a braced hand can hold at this zoom.'
        : ok ? 'Clean, and steady enough to hold braced.' : over ? '' : need > CLEAN ? 'It will be grainy.' : '');
    if (t.goal === 'late' && minutes >= 15 && ok) t.done();
  };

  const shutters = SHUTTER_STEPS.filter((s) => s >= 1 / 2000 && s <= 1 / 8);
  f.controls.append(
    slider('Minutes after sunset', { min: 0, max: MAX, step: 1, value: minutes, show: (v) => `${v} min`, onInput: (v) => { minutes = v; paint(); }, color: 'light' }).node,
    slider('Shutter', { steps: shutters, value: shutter, show: (v) => `${shutterLabel(v)} s`, onInput: (v) => { shutter = v; paint(); }, color: 'time' }).node,
  );
  paint();
  return f.node;
});
