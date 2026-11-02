// A short life of someone who comes up across the lessons: their portrait
// beside their name, dates and a few lines on who they were.
//
//   { "type": "diagram", "id": "bio", "caption": "…", "options": {
//       "photo": "hutton-portrait", "name": "James Hutton", "dates": "1726 to 1797",
//       "role": "Edinburgh farmer, physician and chemist", "lines": ["…", "…"] } }

import type { FigureFactory, Options } from 'didactics/figure';
import { el } from 'didactics/dom';
import { photoById, photoNode } from '../photos';

const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

const problems = (o: Options | undefined): string[] => {
  if (!o) return ['needs "photo", "name", "dates" and "lines"'];
  const out: string[] = [];
  if (!isText(o.photo)) out.push('needs "photo", a photo id');
  else if (!photoById(o.photo)) out.push(`no photo "${o.photo}"`);
  if (!isText(o.name)) out.push('needs "name"');
  if (!isText(o.dates)) out.push('needs "dates"');
  if (o.role !== undefined && !isText(o.role)) out.push('"role" should be text');
  if (!Array.isArray(o.lines) || !o.lines.length || !o.lines.every(isText)) out.push('needs "lines", a list of short sentences');
  return out;
};

/** **bold** in a line, as it is in the lesson text. */
const words = (text: string): (string | HTMLElement)[] =>
  text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? el('strong', {}, part) : part));

export const bioStill: FigureFactory = Object.assign(
  (_ctx: unknown, _goal?: string, o?: Options) => {
    const lines = (o?.lines as string[] | undefined) ?? [];
    return {
      node: el('div.fig-body.fig-still', {},
        el('div.bio', {},
          el('div.bio-head', {},
            el('div.bio-face', {}, photoNode(String(o?.photo), { aspect: 0.84 })),
            el('div.bio-title', {},
              el('p.bio-name', {}, String(o?.name ?? '')),
              el('p.bio-dates', {}, String(o?.dates ?? '')),
              o?.role ? el('p.bio-role', {}, String(o.role)) : null,
            ),
          ),
          el('ul.bio-lines', {}, ...lines.map((l) => el('li', {}, ...words(l)))),
        ),
      ),
    };
  },
  { options: problems, each: true as const },
);
