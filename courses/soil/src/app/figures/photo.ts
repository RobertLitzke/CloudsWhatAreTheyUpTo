// A photo of the real thing, set in the lesson like a figure: the soil, the
// creature or the practice a part is about, so a reader who has never seen it
// knows it when they meet it in the bed. It is a still, with nothing to do.
// `options.subject` names the subject; `options.photo` may pin one photo of
// it by id, when only that one shows what the text points at.

import { el } from 'didactics/dom';
import { isSubjectId } from '../../core/photos';
import { PHOTOS, photoFigure, picture } from '../picture';
import type { FigureContext, Options } from './kit';

interface PhotoOptions extends Options {
  subject?: string;
  photo?: string;
  alt?: string;
}

function draw(_ctx: FigureContext, _goal?: string, opts?: Options): { node: HTMLElement } {
  const options = opts as PhotoOptions | undefined;
  const subject = options?.subject ?? '';
  const pinned = PHOTOS.find((p) => p.id === options?.photo);
  const node = pinned
    ? photoFigure(pinned, options?.alt ?? '')
    : isSubjectId(subject)
      ? picture(subject)
      : el('p', {}, `No picture of ${subject}`);
  return { node: el('div.fig-body.fig-photo', {}, node) };
}

/** What is wrong with a photo block's options, for the content test (lessonProblems). */
function problems(opts: Options | undefined): string[] {
  const o = (opts ?? {}) as PhotoOptions;
  const out: string[] = [];
  if (!o.subject || !isSubjectId(o.subject)) out.push(`no subject "${o.subject}"`);
  if (o.photo !== undefined && !PHOTOS.some((p) => p.id === o.photo && p.subject === o.subject)) out.push(`no photo "${o.photo}" of ${o.subject}`);
  return out;
}

export const photoDiagram = Object.assign(draw, { options: problems });
