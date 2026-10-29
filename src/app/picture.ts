// A picture of a subject: a photo from the library with the credit it must
// wear, or, until one has been fetched, a plain card saying what should be
// there. Every place the app shows a photograph goes through here, so a photo
// fetched later appears everywhere at once.

import library from '../data/photos.json';
import { el } from 'didactics/dom';
import type { Rng } from 'didactics/rng';
import { credit } from 'didactics/photos';
import type { Options } from 'didactics/figure';
import { isSubjectId, mirrorFor, photosOf, renderable, SUBJECTS, type Photo, type SubjectId } from '../core/photos';
import { asset } from './asset';

export const PHOTOS: readonly Photo[] = library as Photo[];

export { credit };

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

/**
 * The options check for a figure that re-exposes a photo of `subject`: a
 * pinned `photo` must be one with a depth map and a scene, of that subject.
 */
export const photoOptions = (subject: SubjectId) => (o: Options | undefined): string[] => {
  if (o?.photo === undefined) return [];
  const p = PHOTOS.find((x) => x.id === o.photo);
  if (!p) return [`no photo "${String(o.photo)}"`];
  if (p.subject !== subject) return [`photo "${p.id}" is ${p.subject}, not ${subject}`];
  return p.depthFile && p.scene ? [] : [`photo "${p.id}" has no depth map or scene to re-expose`];
};

/** The options check for a still photo: a known `subject`, or a `photo` that exists. */
export const stillOptions = (o: Options | undefined): string[] => {
  if (o?.photo !== undefined) return PHOTOS.some((p) => p.id === o.photo) ? [] : [`no photo "${String(o.photo)}"`];
  return isSubjectId(String(o?.subject)) ? [] : [`unknown subject "${String(o?.subject)}"`];
};

/** The options a photo figure takes: `photo` pins one photo by id. */
export type PhotoOptions = { photo?: string };
