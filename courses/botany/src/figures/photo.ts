// A photo in the text, by id, with its credit: { "type": "diagram", "id":
// "photo", "options": { "photo": "causeway", "aspect": 1.5 } }.

import type { FigureFactory, Options } from 'didactics/figure';
import { el } from 'didactics/dom';
import { photoById, photoNode } from '../photos';

const problems = (o: Options | undefined): string[] => {
  if (!o || typeof o.photo !== 'string') return ['needs "photo", a photo id'];
  const out = photoById(o.photo) ? [] : [`no photo "${o.photo}"`];
  if (o.aspect !== undefined && !(typeof o.aspect === 'number' && o.aspect > 0)) out.push('"aspect" should be width / height');
  return out;
};

export const photoFigure: FigureFactory = Object.assign(
  (_ctx: unknown, _goal?: string, o?: Options) =>
    ({ node: el('div.fig-body.fig-still', {}, photoNode(String(o?.photo), { aspect: o?.aspect as number | undefined, position: o?.position as string | undefined })) }),
  { options: problems, each: true as const },
);
