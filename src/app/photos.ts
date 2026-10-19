// The photo library as the app sees it, and the credit line every photo wears.

import library from '../data/photos.json';
import { LICENSES, type Photo } from '../core/photos';
import { el } from './dom';

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

export function photoFigure(p: Photo, alt: string): HTMLElement {
  return el(
    'figure.photo',
    {},
    el('img', { src: p.file, alt, width: p.width, height: p.height, decoding: 'async' }),
    el('figcaption', {}, credit(p)),
  );
}
