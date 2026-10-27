// A picture of a subject: a photo from the library with the credit it must
// wear, or, until one has been fetched, a plain card saying what should be
// there. Every place the app shows a photograph goes through here, so a photo
// fetched later appears everywhere at once.

import library from '../data/photos.json';
import { el } from 'lesson-kit/dom';
import type { Rng } from 'lesson-kit/rng';
import { LICENSES, mirrorFor, photosOf, renderable, SUBJECTS, type Photo, type SubjectId } from '../core/photos';
import { asset } from './asset';

export const PHOTOS: readonly Photo[] = library as Photo[];

export function credit(p: Photo): HTMLElement {
  const lic = LICENSES[p.license];
  return el(
    'p.credit',
    {},
    'Photo: ',
    el('a', { href: p.sourceUrl, target: '_blank', rel: 'noopener' }, p.author),
    ' · ',
    el('a', { href: lic.url, target: '_blank', rel: 'noopener' }, lic.name),
    ` · ${p.source}`,
  );
}

/** A photo with its credit. `mirrored` flips the picture, never the credit. */
export function photoFigure(p: Photo, alt: string, mirrored = false): HTMLElement {
  return el(
    'figure.photo',
    {},
    el('img', { src: asset(p.file), alt, width: p.width, height: p.height, decoding: 'async', className: mirrored ? 'mirrored' : undefined }),
    el('figcaption', {}, credit(p)),
  );
}

/** A photo of `subject` picked with `rng`, or a note of what is missing. */
export function picture(subject: SubjectId, rng: Rng = Math.random, caption?: string): HTMLElement {
  const photos = photosOf(PHOTOS, subject);
  const alt = caption ?? SUBJECTS[subject];
  if (!photos.length) return missing(SUBJECTS[subject]);
  const p = photos[Math.floor(rng() * photos.length)];
  return photoFigure(p, alt, mirrorFor(p, rng));
}

/**
 * A photo a figure can re-expose: one with a depth map and a note of the scene
 * it stands for. `id` pins one photo; otherwise the first of the subject.
 */
export function shotPhoto(subject: SubjectId, id?: string): Photo | undefined {
  const pinned = id ? PHOTOS.find((p) => p.id === id) : undefined;
  return pinned ?? renderable(PHOTOS, subject)[0];
}

/** The card that stands where a photo will go, until one is fetched. */
export function missing(what: string): HTMLElement {
  return el('div.photo-missing', {}, el('p', {}, `A photo of ${what.toLowerCase()} goes here.`), el('p.credit', {}, 'None fetched yet: see the Photos section of the README.'));
}
