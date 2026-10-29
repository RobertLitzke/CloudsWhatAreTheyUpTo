// The photo library. tools/photos/fetch.ts writes src/data/photos.json and the
// files in public/photos/; this is the shape of that file and the rules every
// entry must keep. Every photo carries its author, licence and source, and the
// app shows them under the photo and on the Credits page.
//
// A photo is of a subject: a bird at a distance, a flower close up, a valley.
// Figures that fake a camera setting need to know how far away things in the
// picture are, so most photos also ship a depth map (a small grey picture,
// white for near and black for far) and a note of the scene they stand for.

import { photoProblems, type Photo as Credited } from 'didactics/photos';
import type { Rng } from 'didactics/rng';

// The licences a photo may carry, and the credit fields every photo needs,
// are Didactics' (didactics/photos); this file adds what a photo is of.
export { isLicenseId, LICENSES, type LicenseId } from 'didactics/photos';

/**
 * Everything the app may want a picture of, with the name it goes by. A
 * subject is a kind of shot, not a species: the figures pick a photo of the
 * subject they need (app/picture.ts) and Commons categories to look in are in
 * tools/photos/config.ts. Add a subject in both places.
 */
export const SUBJECTS = {
  'perched-bird': 'A bird perched in a tree',
  'bird-in-flight': 'A bird in flight',
  'distant-wildlife': 'An animal across a field',
  'flower-close': 'A flower, close up',
  'insect-close': 'An insect on a leaf',
  'woodland': 'Woodland, near and far',
  'wide-landscape': 'A valley or a shore',
  'running-water': 'A waterfall or a stream',
  'night-sky': 'The sky at night',
  'snow-scene': 'Snow',
  'backlit-leaves': 'Leaves against the sun',
  'overcast-forest': 'A forest under cloud',
  'low-light': 'A bird after dark',
} as const;

export type SubjectId = keyof typeof SUBJECTS;

export function isSubjectId(value: string): value is SubjectId {
  return Object.hasOwn(SUBJECTS, value);
}

/**
 * What a photo stands for, so a figure can say what a setting would do to it.
 * All of it is an estimate written down by hand when the photo is picked; the
 * figures only need the right order of magnitude.
 */
export interface Scene {
  /** How far away the thing in focus is, metres. */
  subjectAt: number;
  /** How far away the nearest and farthest things in the frame are, metres. */
  near: number;
  /** Metres, or null when the background runs to the horizon. */
  far: number | null;
  /** How fast the subject moves across the view, m/s: 0 for a rock, 15 for a bird in flight. */
  speed?: number;
  /** The light's colour temperature, kelvin, when the photo was taken. */
  kelvin?: number;
  /**
   * How bright the scene is, as an exposure value at ISO 100: 15 is sunlight
   * on snow, 12 a bright overcast day, 9 under trees, 5 indoors, -4 the Milky
   * Way. The figures work out what settings it would take.
   */
  ev?: number;
  /** The equivalent focal length the photo was taken at, mm, when it is known. */
  eqFocal?: number;
}

export interface Photo extends Credited {
  subject: SubjectId;
  /**
   * Set when the photo must not be shown mirrored: it has writing in it, or a
   * landmark someone would know. Every other photo is flipped left to right
   * half the time, so the same few photos make more different-looking cards.
   */
  noMirror?: true;
  /** Path relative to the page, e.g. photos/perched-bird-01.webp. */
  file: string;
  /**
   * A depth map beside it, photos/<id>-depth.webp: a small grey picture, white
   * where the scene is nearest and black where it is farthest, made by
   * tools/photos/depth.ts. Figures that blur by distance need one.
   */
  depthFile?: string;
  /** What the photo stands for, for the figures that fake camera settings. */
  scene?: Scene;
}


/** What is wrong with an entry, or an empty list if nothing is: Didactics' credit checks, then this course's own. */
export function problems(p: Partial<Photo>): string[] {
  const out = photoProblems(p);
  if (!p.subject || !isSubjectId(p.subject)) out.push(`unknown subject ${p.subject}`);
  if (p.noMirror !== undefined && p.noMirror !== true) out.push('noMirror must be true or left out');
  if (!p.file || !p.file.startsWith('photos/')) out.push('file must live under photos/');
  if (p.depthFile !== undefined && p.depthFile !== `photos/${p.id}-depth.webp`) out.push('depthFile must be photos/<id>-depth.webp');
  out.push(...sceneProblems(p.scene));
  return out;
}

function sceneProblems(s: Scene | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (!(s.near > 0 && s.subjectAt >= s.near)) out.push('the subject must be at or beyond the nearest thing in the frame');
  if (s.far !== null && !(s.far >= s.subjectAt)) out.push('the farthest thing must be at or beyond the subject');
  if (s.kelvin !== undefined && !(s.kelvin >= 1000 && s.kelvin <= 20000)) out.push('kelvin must be between 1000 and 20000');
  if (s.ev !== undefined && !(s.ev >= -8 && s.ev <= 18)) out.push('ev must be between -8 and 18');
  return out;
}

export function photosOf(library: readonly Photo[], id: SubjectId): Photo[] {
  return library.filter((p) => p.subject === id);
}

/** The photos a depth-of-field or motion figure can use: those with a depth map and a scene. */
export function renderable(library: readonly Photo[], id?: SubjectId): Photo[] {
  return library.filter((p) => p.depthFile && p.scene && (!id || p.subject === id));
}

/** Whether to show this photo mirrored this time. */
export function mirrorFor(p: Photo, rng: Rng): boolean {
  return !p.noMirror && rng() < 0.5;
}
