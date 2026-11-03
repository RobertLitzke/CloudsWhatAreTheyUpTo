// What the file keeps. A JPEG is the camera's finished picture: everything
// brighter than white was cut off at white when it was saved, and darkening
// it afterwards only turns that white grey. A RAW file keeps the sensor's
// own counts, with some room above the JPEG's white, so a picture taken too
// bright can still be brought back.

import { el } from 'didactics/dom';
import { shoot } from '../../core/shot';
import { asset } from '../asset';
import { develop, loadPhoto } from '../photo/film';
import { PHOTOS, credit } from '../picture';
import { choices, figure, frame, slider, type Options } from './kit';
import { noPhoto } from './shot';

/** Stops of room a RAW file keeps above the JPEG's white. */
export const RAW_HEADROOM = 1;

const TO_LIN = Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
/** A raw converter's highlight shoulder: straight up to 0.6, then easing gently into white. */
export const shoulder = (x: number) => (x < 0.6 ? x : 0.6 + 0.4 * (1 - Math.exp(-(x - 0.6))));

const stopsLabel = (s: number) => (Math.abs(s) < 0.05 ? '±0' : `${s > 0 ? '+' : '−'}${Math.abs(s).toFixed(1)}`);

/**
 * The heron on the dock, taken too bright, then fixed afterwards. In JPEG the
 * water's sparkle was clipped to white when the file was saved, and pulling
 * the exposure down leaves it a flat grey; in RAW the sparkle is still in the
 * file and comes back.
 */
export const headroomFigure = figure<Options>(['rescue'], (_ctx, t, options) => {
  const photo = PHOTOS.find((p) => p.id === (options?.photo ?? 'distant-wildlife-01'));
  if (!photo?.scene) return noPhoto('a heron by bright water').node;
  const scene = photo.scene;
  const W = 420;
  const H = Math.round((W * photo.height) / photo.width);
  const canvas = el('canvas.shot', { width: W, height: H, role: 'img', 'aria-label': 'A heron on a dock by bright water' }) as HTMLCanvasElement;
  const caption = el('p.shot-settings');
  const f = frame({ drawing: el('figure.photo.shot-figure.headroom', {}, canvas, caption, el('figcaption', {}, credit(photo))), lines: 3 });
  f.node.classList.add('shot-body');
  const g = canvas.getContext?.('2d', { willReadFrequently: true }) ?? null;

  let taken = 1; // stops too bright in the camera
  let fix = 0; // stops changed afterwards
  let raw = false;
  let base: Float32Array | null = null; // the photo as it was taken, linear RGB
  let touched = false;

  const paint = () => {
    const top = raw ? 2 ** RAW_HEADROOM : 1;
    let lost = 0;
    if (g && base) {
      const img = g.createImageData(W, H);
      const d = img.data;
      const k = 2 ** taken;
      const after = 2 ** fix;
      for (let i = 0, p = 0; i < base.length; i += 3, p += 4) {
        let clipped = false;
        for (let c = 0; c < 3; c++) {
          let v = base[i + c] * k;
          if (v >= top) { v = top; clipped = true; }
          if (!raw) v = TO_LIN[Math.round(toSrgb(v) * 255)]; // saved as 8-bit
          v *= after;
          d[p + c] = Math.round(255 * toSrgb(raw ? shoulder(v) : Math.min(1, v)));
        }
        d[p + 3] = 255;
        if (clipped) lost++;
      }
      g.putImageData(img, 0, 0);
      lost /= base.length / 3;
    }
    const net = taken + fix;
    caption.textContent = `${raw ? 'RAW' : 'JPEG'} · taken ${stopsLabel(taken)} stops bright · ${stopsLabel(fix)} afterwards`;
    f.readout.textContent = `${(lost * 100).toFixed(0)}% of the picture was brighter than the ${raw ? 'RAW file' : 'JPEG'} could hold when it was taken. ` +
      (lost < 0.01 ? (Math.abs(net) <= 0.5 ? 'Nothing was lost, and the picture is back to right.' : 'Nothing was lost; the exposure just needs setting.')
        : fix < -0.2 ? 'Darkening it turns that white to a flat grey: the detail is gone for good.' : 'It is pure white, with no detail in it.');
    if (t.goal === 'rescue' && touched && raw && lost < 0.01 && Math.abs(net) <= 0.5) t.done();
  };

  t.waitFor(loadPhoto(photo, asset).then((loaded) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const shot = shoot(scene, { eqFocal: scene.eqFocal ?? 200 });
    develop(c, loaded, { ...shot.render, crop: 1, noise: 0, exposure: 1, shake: 0, smear: 0, gains: [1, 1, 1] });
    const src = c.getContext('2d', { willReadFrequently: true })?.getImageData(0, 0, W, H).data;
    if (src) {
      base = new Float32Array(W * H * 3);
      for (let i = 0, p = 0; p < src.length; i += 3, p += 4) {
        base[i] = TO_LIN[src[p]];
        base[i + 1] = TO_LIN[src[p + 1]];
        base[i + 2] = TO_LIN[src[p + 2]];
      }
    }
    paint();
  }));

  const pick = choices(['JPEG', 'RAW'], (i) => { raw = i === 1; touched = true; paint(); });
  f.controls.append(
    el('div.fig-row', {}, pick.node),
    slider('Taken', { min: -1, max: 2, step: 0.5, value: taken, show: (v) => `${stopsLabel(v)} stops`, onInput: (v) => { taken = v; touched = true; paint(); }, color: 'light' }).node,
    slider('Afterwards', { min: -2.5, max: 2.5, step: 0.1, value: fix, show: (v) => `${stopsLabel(v)} stops`, onInput: (v) => { fix = v; touched = true; paint(); }, color: 'sensor' }).node,
  );
  pick.pick(0);
  touched = false;
  paint();
  return f.node;
}, { options: (o) => (o?.photo === undefined || PHOTOS.some((p) => p.id === o.photo && p.scene) ? [] : [`no photo "${String(o?.photo)}"`]) });
