// A photo of the real thing, set in the lesson like a figure: the soil, the
// creature or the practice a part is about, so a reader who has never seen it
// knows it when they meet it in the bed. It is a still, with nothing to do.
// `options.subject` names the subject; `options.photo` may pin one photo of
// it by id, when only that one shows what the text points at.

import { el } from 'didactics/dom';
import { isSubjectId } from '../../core/photos';
import { PHOTOS, photoFigure, picture, stillOptions } from '../picture';
import type { FigureContext, Options } from './kit';

export const photoDiagram = Object.assign(function photoDiagram(_ctx: FigureContext, _goal?: string, options?: Options): { node: HTMLElement } {
  const subject = String(options?.subject ?? '');
  const pinned = PHOTOS.find((p) => p.id === options?.photo);
  const node = pinned
    ? photoFigure(pinned, String(options?.alt ?? ''))
    : isSubjectId(subject)
      ? picture(subject)
      : el('p', {}, `No picture of ${subject}`);
  return { node: el('div.fig-body.fig-photo', {}, node) };
}, { options: stillOptions });
