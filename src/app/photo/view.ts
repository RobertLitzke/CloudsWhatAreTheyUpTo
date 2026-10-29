// A photograph in a figure: a canvas the figure redraws as the reader turns
// the dials, with the credit under it. Loading is asynchronous, so the canvas
// appears at once, grey, and fills in when the photo arrives.
//
// Redrawing is throttled to one frame: a slider dragged across its range asks
// for a hundred redraws a second and gets as many as the phone can give.

import { el } from 'didactics/dom';
import type { Photo } from '../../core/photos';
import type { Render } from '../../core/shot';
import { asset } from '../asset';
import { credit } from '../picture';
import { develop, loadPhoto, type Loaded } from './film';

export interface PhotoView {
  node: HTMLElement;
  /** Draw this shot as soon as the browser will let us. Safe before the photo has loaded. */
  show: (render: Render) => void;
  /** The photo, once it has loaded. */
  ready: Promise<Loaded>;
  /** The caption line under the picture, for the settings. */
  caption: HTMLElement;
}

/**
 * The picture as the figure's own drawing: `width` by `height` pixels of
 * canvas (the figure's own aspect, not the photo's; the photo is cropped to
 * fill it). `mirrored` flips it, never the credit.
 */
export function photoView(photo: Photo, width = 760, mirrored = false): PhotoView {
  const height = Math.round((width * photo.height) / photo.width);
  const canvas = el('canvas.shot', { width, height }) as HTMLCanvasElement;
  const caption = el('p.shot-settings');
  const node = el('figure.photo.shot-figure', {}, canvas, caption, el('figcaption', {}, credit(photo)));

  let loaded: Loaded | null = null;
  let pending: Render | null = null;
  let frame = 0;
  const paint = () => {
    frame = 0;
    if (!loaded || !pending) return;
    develop(canvas, loaded, pending, mirrored);
  };

  const ready = loadPhoto(photo, asset).then((l) => {
    loaded = l;
    paint();
    return l;
  });
  void ready.catch(() => {
    caption.textContent = 'This photo could not be loaded.';
  });

  return {
    node,
    caption,
    ready,
    show: (render) => {
      pending = render;
      if (!frame) frame = requestAnimationFrame(paint);
    },
  };
}
