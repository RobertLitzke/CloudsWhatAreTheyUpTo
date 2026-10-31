// The course's photos (src/data/photos.json, written by tools/photos.mjs from
// tools/photo-picks.json), and how one is shown: the picture with its credit.

import { el } from 'didactics/dom';
import { credit, type Photo } from 'didactics/photos';
import list from './data/photos.json';
import { asset } from './asset';

export interface CoursePhoto extends Photo {
  /** What it shows, for the alt text and the Credits page. */
  about: string;
  /** Its path next to the page. */
  file: string;
}

export const PHOTOS = list as CoursePhoto[];

export const photoById = (id: string): CoursePhoto | undefined => PHOTOS.find((p) => p.id === id);

/** A photo at the column's width, cropped to `aspect` (width / height) if given, with its credit under it. */
export function photoNode(id: string, o: { aspect?: number; alt?: string; position?: string } = {}): HTMLElement {
  const p = photoById(id);
  if (!p) return el('p.fig-readout', {}, `No photo "${id}".`);
  const img = el('img.fig-drawing', { src: asset(p.file), alt: o.alt ?? p.about, loading: 'lazy', width: p.width, height: p.height }) as HTMLImageElement;
  img.style.cssText = `display:block;width:100%;height:auto;object-fit:cover;${o.aspect ? `aspect-ratio:${o.aspect};` : ''}${o.position ? `object-position:${o.position};` : ''}`;
  return el('div.photo', {}, img, credit(p));
}
