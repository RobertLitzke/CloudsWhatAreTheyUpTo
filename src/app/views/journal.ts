// The field journal: what the shifts have taught, and a card for every genus.

import { GENERA, floorInfo } from '../../core/clouds';
import { JOURNAL } from '../../core/shifts';
import { photosOf } from '../../core/photos';
import { el, svg } from '../dom';
import { photoFigure, PHOTOS } from '../photos';
import type { View } from '../router';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { getSave } from '../store';

export const journalView: View = (root) => {
  const save = getSave();
  const notes = Object.entries(JOURNAL).filter(([id]) => save.journal.includes(id));
  const p = PALETTES.day;

  root.append(
    el(
      'div.page.journal',
      {},
      el('h1', {}, 'Field journal'),
      notes.length
        ? el('div.notes', {}, notes.map(([, n]) => el('article.note', { className: n.rare ? 'note rare' : 'note' }, el('h3', {}, n.title, n.rare ? el('span.tag', {}, 'Rare') : null), el('p', {}, n.text))))
        : el('p.muted', {}, 'Nothing written yet. Finish a shift and its notes land here.'),
      el('h2', {}, 'The ten kinds of cloud'),
      el(
        'div.genus-cards',
        {},
        GENERA.map((g) => {
          const tall = g.floor === 'tower';
          const photo = photosOf(PHOTOS, g.id)[0];
          return el(
            'article.genus-card',
            {},
            photo
              ? photoFigure(photo, g.name)
              : el('div.genus-art', {}, svg('svg', { viewBox: tall ? '-80 -150 160 185' : '-90 -40 180 70' }, drawCloud(g.id, p, 2))),
            el('h3', {}, g.name, el('span.abbr', {}, g.abbr)),
            el('p.floor', {}, g.floor === 'tower' ? 'All three floors' : `${floorInfo(g.floor).name} floor`),
            el('dl', {}, el('dt', {}, 'Looks like'), el('dd', {}, g.look), el('dt', {}, 'Made by'), el('dd', {}, g.made), el('dt', {}, 'Means'), el('dd', {}, g.means)),
          );
        }),
      ),
    ),
  );
};
