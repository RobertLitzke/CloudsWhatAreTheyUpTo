// The photo library as the app sees it, and the credit line every photo wears.

import library from '../data/photos.json';
import { photoFile, type Photo } from '../core/photos';
import { asset } from './asset';
import { photoFigure as kitPhotoFigure } from 'didactics/photos';

export const PHOTOS: readonly Photo[] = library as Photo[];

/** A photo with its credit (didactics/photos). `mirrored` flips the picture, never the credit. */
export function photoFigure(p: Photo, alt: string, mirrored = false): HTMLElement {
  return kitPhotoFigure(p, asset(photoFile(p)), { alt, mirrored });
}
