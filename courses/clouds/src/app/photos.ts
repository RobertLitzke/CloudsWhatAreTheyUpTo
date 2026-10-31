// The photo library as the app sees it, and the credit line every photo wears.

import library from '../data/photos.json';
import { photoFile, type Photo } from '../core/photos';
import { asset } from './asset';
import { el } from 'didactics/dom';
import { credit } from 'didactics/photos';

export const PHOTOS: readonly Photo[] = library as Photo[];

/** A photo with its credit. `mirrored` flips the picture, never the credit. */
export function photoFigure(p: Photo, alt: string, mirrored = false): HTMLElement {
  return el(
    'figure.photo',
    {},
    el('img', { src: asset(photoFile(p)), alt, width: p.width, height: p.height, decoding: 'async', className: mirrored ? 'mirrored' : undefined }),
    el('figcaption', {}, credit(p)),
  );
}
