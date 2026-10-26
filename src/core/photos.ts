// The photo library. tools/photos/fetch.ts writes src/data/photos.json and the
// files in public/photos/; this is the shape of that file and the rules every
// entry must keep. Every photo carries its author, licence and source, and the
// app shows them under the photo and on the Credits page.

import { isGenusId, type GenusId } from './clouds';
import type { Rng } from 'lesson-kit/rng';

/**
 * Licences a photo may carry. Public domain and the attribution licences
 * only: no NonCommercial (the app could one day be shared beyond two people),
 * and no NoDerivatives, because every photo is resized and cropped.
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

/** The rare clouds of the last shift, by their journal entry. */
export const FEATURES = ['lenticularis', 'mammatus', 'fluctus'] as const;
export type FeatureId = (typeof FEATURES)[number];

export interface Photo {
  /**
   * Stable id, such as cumulus-01. It is the photo's only name: the file is
   * photos/<id>.webp (see photoFile), and lessons and the quiz name photos by it.
   */
  id: string;
  genus: GenusId;
  /**
   * Set when the photo is of a rare cloud. It is shown with that cloud's
   * journal note and kept out of the everyday radio checks, where a lens
   * cloud filed as altocumulus would be an unfair call.
   */
  feature?: FeatureId;
  /**
   * Set when the photo must not be shown mirrored: it has writing in it, or a
   * landmark someone would know. Every other photo is flipped left to right
   * half the time, so the same few photos make more different-looking cards.
   */
  noMirror?: true;
  width: number;
  height: number;
  author: string;
  license: LicenseId;
  /** The page the photo came from, for the credit link. */
  sourceUrl: string;
  /** Where it came from, by name: Wikimedia Commons, NOAA. */
  source: string;
}

export function isLicenseId(value: string): value is LicenseId {
  return Object.hasOwn(LICENSES, value);
}

/** What is wrong with an entry, or an empty list if nothing is. */
export function problems(p: Partial<Photo>): string[] {
  const out: string[] = [];
  if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) out.push('id must be lower-case letters, digits and dashes');
  if (!p.genus || !isGenusId(p.genus)) out.push(`unknown genus ${p.genus}`);
  if (p.noMirror !== undefined && p.noMirror !== true) out.push('noMirror must be true or left out');
  if (p.feature !== undefined && !FEATURES.includes(p.feature)) out.push(`unknown rare cloud ${p.feature}`);
  if (!p.author?.trim()) out.push('no author');
  if (!p.license || !isLicenseId(p.license)) out.push(`licence ${p.license} is not allowed`);
  if (!p.sourceUrl?.startsWith('https://')) out.push('no https source link');
  if (!p.source?.trim()) out.push('no source name');
  if (!(p.width! > 0 && p.height! > 0)) out.push('no size');
  return out;
}

/** The photo's file, relative to the page: photos/<id>.webp. */
export function photoFile(p: Pick<Photo, 'id'>): string {
  return `photos/${p.id}.webp`;
}

/** The everyday photos of a genus: the rare clouds are left out. */
export function photosOf(library: readonly Photo[], id: GenusId): Photo[] {
  return library.filter((p) => p.genus === id && !p.feature);
}

/** Whether to show this photo mirrored this time. */
export function mirrorFor(p: Photo, rng: Rng): boolean {
  return !p.noMirror && rng() < 0.5;
}

export function photosOfFeature(library: readonly Photo[], id: FeatureId): Photo[] {
  return library.filter((p) => p.feature === id);
}
