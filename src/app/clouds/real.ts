// Realistic clouds in a figure: ray-marched on the GPU (volume.ts), or painted
// on a canvas where there is no WebGL (paint.ts), and laid into the figure's
// SVG as an image the size of the drawing. Drawing happens on the next frame,
// so building a lesson never waits on it; a figure that changes its clouds
// (a slider, a clock) calls `draw` again and the image is swapped when ready.

import { svg } from '../dom';
import { paintCanvas } from './paint';
import type { Cloud } from './shapes';
import { marchClouds, type View } from './volume';

export type { View } from './volume';

export interface RealClouds {
  /** Put this in the drawing where the clouds belong: over the sky, under anything in front. */
  node: SVGGElement;
  /** Draw these clouds (replacing the last ones). */
  draw(clouds: Cloud[], view?: Partial<View>): void;
}

export function realClouds(view: View, clouds?: Cloud[]): RealClouds {
  const node = svg('g', { class: 'real-clouds' }) as SVGGElement;
  const image = svg('image', { x: 0, y: 0, width: view.width, height: view.height, preserveAspectRatio: 'none' });
  node.append(image);
  let url = '';
  let pending: Cloud[] | null = null;
  let current = view;
  let drawn = 0;
  const flush = () => {
    if (!pending) return;
    const list = pending;
    pending = null;
    const canvas = marchClouds(list, current) ?? paintCanvas(list, current);
    if (!canvas || !canvas.toBlob) return;
    const ticket = ++drawn;
    canvas.toBlob((blob) => {
      if (!blob || ticket !== drawn) return;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      image.setAttribute('href', url);
    });
  };
  const draw = (list: Cloud[], v: Partial<View> = {}) => {
    const first = pending === null;
    pending = list;
    current = { ...current, ...v };
    if (first) requestAnimationFrame(flush);
  };
  if (clouds) draw(clouds);
  return { node, draw };
}
