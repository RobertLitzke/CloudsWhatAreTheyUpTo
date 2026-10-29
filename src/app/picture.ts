// A picture of a subject: a photo from the library, with the credit it must
// wear, or a drawing of it when the library has no photo of it yet. Every
// place the app shows a soil, a creature or a practice goes through here, so a
// photo fetched later replaces its drawing everywhere at once.

import library from '../data/photos.json';
import { el } from 'didactics/dom';
import type { Rng } from 'didactics/rng';
import { credit } from 'didactics/photos';
import { mirrorFor, photosOf, SUBJECTS, type Photo, type SubjectId } from '../core/photos';
import { asset } from './asset';
import { drawSubject } from './scene/subjects';

export const PHOTOS: readonly Photo[] = library as Photo[];

/** A photo with its credit. `mirrored` flips the picture, never the credit. */
export function photoFigure(p: Photo, alt: string, mirrored = false): HTMLElement {
  return el(
    'figure.photo',
    {},
    el('img', { src: asset(p.file), alt, width: p.width, height: p.height, decoding: 'async', className: mirrored ? 'mirrored' : undefined }),
    el('figcaption', {}, credit(p)),
  );
}

/**
 * A photo of `subject` picked with `rng`, or its drawing if there is none.
 * `caption`, when given, goes under the picture in place of the plain name.
 */
export function picture(subject: SubjectId, rng: Rng = Math.random, caption?: string): HTMLElement {
  const photos = photosOf(PHOTOS, subject);
  const alt = caption ?? SUBJECTS[subject];
  if (photos.length) {
    const p = photos[Math.floor(rng() * photos.length)];
    return photoFigure(p, alt, mirrorFor(p, rng));
  }
  return el('figure.photo.sketch', {}, drawSubject(subject), el('figcaption', {}, el('p.credit', {}, 'Drawing: no photo of this yet')));
}
