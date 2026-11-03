// What a photo's light is, as numbers: its pixels in linear light (where a
// stop really is a doubling), read once from a small copy. The meter figure
// uses them to do what a camera's meter does, and to draw the histogram that
// a given exposure would make, without redrawing the photo to count it.

import type { Loaded } from './film';

export interface Light {
  /** Each pixel's brightest channel and its luminance, linear, 0 to 1 as the photo was taken. */
  peak: Float32Array;
  luma: Float32Array;
  /** The average luminance: what an averaging meter reads. */
  mean: number;
}

const cache = new WeakMap<HTMLImageElement, Light>();

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** The photo's light, from a copy `width` pixels across; null where there is no 2D canvas. */
export function lightOf(loaded: Loaded, width = 240): Light | null {
  const got = cache.get(loaded.image);
  if (got) return got;
  const img = loaded.image;
  const w = width;
  const h = Math.max(1, Math.round((width * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const peak = new Float32Array(w * h);
  const luma = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const r = toLinear(d[i * 4] / 255);
    const g = toLinear(d[i * 4 + 1] / 255);
    const b = toLinear(d[i * 4 + 2] / 255);
    peak[i] = Math.max(r, g, b);
    luma[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luma[i];
  }
  const light = { peak, luma, mean: sum / (w * h) };
  cache.set(loaded.image, light);
  return light;
}

/**
 * The histogram a camera would show at `exposure` (1 as the photo was taken):
 * `bins` counts of luminance in display brightness, left dark and right white,
 * and the share of pixels with a channel pushed past white (clipped).
 */
export function histogram(light: Light, exposure: number, bins = 64): { counts: number[]; clipped: number } {
  const counts = new Array<number>(bins).fill(0);
  let clipped = 0;
  for (let i = 0; i < light.luma.length; i++) {
    if (light.peak[i] * exposure >= 0.999) clipped++;
    const v = toSrgb(Math.min(1, light.luma[i] * exposure));
    counts[Math.min(bins - 1, Math.floor(v * bins))]++;
  }
  return { counts, clipped: clipped / light.luma.length };
}

/** The mid-grey a meter aims an average scene at, in linear light. */
export const METER_GREY = 0.18;
