// The photo library. tools/photos/fetch.ts writes src/data/photos.json and the
// files in public/photos/; this is the shape of that file and the rules every
// entry must keep. Every photo carries its author, licence and source, and the
// app shows them under the photo and on the Credits page.
//
// A photo is of a subject: a kind of soil, a creature, a practice. Wherever the
// app wants a picture of a subject it shows a photo if the library has one,
// and a drawing of it if not (app/picture.ts).

import { photoProblems, type Photo as CreditedPhoto } from 'didactics/photos';
import type { Rng } from 'didactics/rng';

export { isLicenseId, LICENSES, type LicenseId } from 'didactics/photos';

/**
 * Everything the app may want a picture of, with the name it goes by. Each
 * one has a drawing (app/drawn/subjects.ts) for when there is no photo, and
 * Commons categories to look in (tools/photos/config.ts). Add a subject in
 * all three places.
 */
export const SUBJECTS = {
  'sandy-soil': 'Sandy soil',
  'clay-soil': 'Clay soil',
  'loam': 'Loam',
  'silt-soil': 'Silty soil',
  'soil-profile': 'A soil profile',
  'jar-test': 'A jar test',
  'puddle': 'Water standing on a bed',
  'earthworm': 'An earthworm',
  'fungal-threads': 'Fungal threads on old mulch',
  'compost-heap': 'A compost heap',
  'crusted-soil': 'Soil crusted after rain',
  'yellow-leaves': 'Yellowing leaves',
  'cover-crop': 'A cover crop',
  'mulch': 'A mulched bed',
} as const;

export type SubjectId = keyof typeof SUBJECTS;

export function isSubjectId(value: string): value is SubjectId {
  return Object.hasOwn(SUBJECTS, value);
}

/** A photo in the library: the credit fields every Didactics photo has, and what it is of. */
export interface Photo extends CreditedPhoto {
  subject: SubjectId;
  /**
   * Set when the photo must not be shown mirrored: it has writing in it, or a
   * landmark someone would know. Every other photo is flipped left to right
   * half the time, so the same few photos make more different-looking cards.
   */
  noMirror?: true;
  /** Path relative to the page, e.g. photos/loam-01.webp. */
  file: string;
}

/** What is wrong with an entry, or an empty list if nothing is. */
export function problems(p: Partial<Photo>): string[] {
  const out: string[] = [];
  if (!p.subject || !isSubjectId(p.subject)) out.push(`unknown subject ${p.subject}`);
  if (p.noMirror !== undefined && p.noMirror !== true) out.push('noMirror must be true or left out');
  if (!p.file || !p.file.startsWith('photos/')) out.push('file must live under photos/');
  return [...out, ...photoProblems(p)];
}

export function photosOf(library: readonly Photo[], id: SubjectId): Photo[] {
  return library.filter((p) => p.subject === id);
}

/** Whether to show this photo mirrored this time. */
export function mirrorFor(p: Photo, rng: Rng): boolean {
  return !p.noMirror && rng() < 0.5;
}
