// The photo library. tools/photos/fetch.ts writes src/data/photos.json and the
// files in public/photos/; this is the shape of that file and the rules every
// entry must keep. Every photo carries its author, licence and source, and the
// app shows them under the photo and on the Credits page.
//
// A photo is of a subject: a kind of soil, a creature, a practice. Wherever the
// app wants a picture of a subject it shows a photo if the library has one,
// and a drawing of it if not (app/picture.ts).

import type { Rng } from 'lesson-kit/rng';

/**
 * Licences a photo may carry. Public domain and the attribution licences
 * only: no NonCommercial, and no NoDerivatives, because every photo is
 * resized and cropped.
 */
export const LICENSES = {
  'PD': { name: 'Public domain', url: 'https://creativecommons.org/publicdomain/mark/1.0/' },
  'CC0': { name: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'CC-BY-2.0': { name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/' },
  'CC-BY-3.0': { name: 'CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0/' },
  'CC-BY-4.0': { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  'CC-BY-SA-2.0': { name: 'CC BY-SA 2.0', url: 'https://creativecommons.org/licenses/by-sa/2.0/' },
  'CC-BY-SA-3.0': { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' },
  'CC-BY-SA-4.0': { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
} as const;

export type LicenseId = keyof typeof LICENSES;

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
} as const;

export type SubjectId = keyof typeof SUBJECTS;

export function isSubjectId(value: string): value is SubjectId {
  return Object.hasOwn(SUBJECTS, value);
}

export interface Photo {
  /** Stable id, also the file name without extension. */
  id: string;
  subject: SubjectId;
  /**
   * Set when the photo must not be shown mirrored: it has writing in it, or a
   * landmark someone would know. Every other photo is flipped left to right
   * half the time, so the same few photos make more different-looking cards.
   */
  noMirror?: true;
  /** Path relative to the page, e.g. photos/loam-01.webp. */
  file: string;
  width: number;
  height: number;
  author: string;
  license: LicenseId;
  /** The page the photo came from, for the credit link. */
  sourceUrl: string;
  /** Where it came from, by name: Wikimedia Commons, USDA NRCS. */
  source: string;
}

export function isLicenseId(value: string): value is LicenseId {
  return Object.hasOwn(LICENSES, value);
}

/** What is wrong with an entry, or an empty list if nothing is. */
export function problems(p: Partial<Photo>): string[] {
  const out: string[] = [];
  if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) out.push('id must be lower-case letters, digits and dashes');
  if (!p.subject || !isSubjectId(p.subject)) out.push(`unknown subject ${p.subject}`);
  if (p.noMirror !== undefined && p.noMirror !== true) out.push('noMirror must be true or left out');
  if (!p.file || !p.file.startsWith('photos/')) out.push('file must live under photos/');
  if (!p.author?.trim()) out.push('no author');
  if (!p.license || !isLicenseId(p.license)) out.push(`licence ${p.license} is not allowed`);
  if (!p.sourceUrl?.startsWith('https://')) out.push('no https source link');
  if (!p.source?.trim()) out.push('no source name');
  if (!(p.width! > 0 && p.height! > 0)) out.push('no size');
  return out;
}

export function photosOf(library: readonly Photo[], id: SubjectId): Photo[] {
  return library.filter((p) => p.subject === id);
}

/** Whether to show this photo mirrored this time. */
export function mirrorFor(p: Photo, rng: Rng): boolean {
  return !p.noMirror && rng() < 0.5;
}
