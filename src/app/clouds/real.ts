// Realistic clouds in a figure: ray-marched on the GPU (volume.ts), or painted
// on a canvas where there is no WebGL (paint.ts), and laid into the figure's
// SVG as an image the size of the drawing. Drawing happens on the next frame,
// so building a lesson never waits on it; a figure that changes its clouds
// (a slider, a clock) calls `draw` again and the image is swapped when ready.
// While a slider is dragged, each redraw is a quick, rougher pass, and the
// full drawing follows when it comes to rest.

import { svg } from 'didactics/dom';
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
  let last: Cloud[] = [];
  let current = view;
  let drawn = 0;
  let lastAsk = -Infinity;
  let rough = false;
  let settle = 0;
  const flush = () => {
    if (!pending) return;
    const list = pending;
    pending = null;
    const v = { ...current, rough };
    const canvas = marchClouds(list, v) ?? paintCanvas(list, v);
    if (!canvas || !canvas.toBlob) return;
    const ticket = ++drawn;
    canvas.toBlob((blob) => {
      if (!blob || ticket !== drawn) return;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      image.setAttribute('href', url);
    });
  };
  const ask = (list: Cloud[]) => {
    const first = pending === null;
    pending = list;
    if (first) requestAnimationFrame(flush);
  };
  const draw = (list: Cloud[], v: Partial<View> = {}) => {
    const now = performance.now();
    // Redraws coming thick and fast (a slider being dragged) get the rough
    // pass, and the full one once they stop.
    rough = now - lastAsk < 400;
    lastAsk = now;
    last = list;
    current = { ...current, ...v };
    ask(list);
    clearTimeout(settle);
    if (rough) settle = window.setTimeout(() => { rough = false; ask(last); }, 250);
  };
  if (clouds) draw(clouds);
  return { node, draw };
}
