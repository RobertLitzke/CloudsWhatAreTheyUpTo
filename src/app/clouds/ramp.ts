// Cloud colour by brightness, from the scene palette: shade in the shadows,
// mid in the half light, light where the sun hits. Every renderer grades its
// clouds through this, so they keep the poster's colours at any time of day.

import type { Palette } from '../scene/landscape';

export type RGB = [number, number, number];

export function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

export interface Ramp {
  shade: RGB;
  mid: RGB;
  light: RGB;
}

export function rampOf(p: Pick<Palette, 'cloudShade' | 'cloudMid' | 'cloudLight'>): Ramp {
  return { shade: rgb(p.cloudShade), mid: rgb(p.cloudMid), light: rgb(p.cloudLight) };
}

/** Colour at brightness `l` in 0..1, into `out`. */
export function grade(r: Ramp, l: number, out: RGB): RGB {
  const [a, b, t] = l < 0.5 ? [r.shade, r.mid, l * 2] : [r.mid, r.light, l * 2 - 1];
  const s = t * t * (3 - 2 * t);
  out[0] = a[0] + (b[0] - a[0]) * s;
  out[1] = a[1] + (b[1] - a[1]) * s;
  out[2] = a[2] + (b[2] - a[2]) * s;
  return out;
}
