// The field journal: what the lessons have taught, a card for every genus, and
// with the radio on, the transcripts of every talk heard.

import { GENERA, floorInfo } from '../../core/clouds';
import { JOURNAL } from '../../core/shifts';
import { FEATURES, photosOf, photosOfFeature, type FeatureId } from '../../core/photos';
import { el, svg } from '../dom';
import { photoFigure, PHOTOS } from '../photos';
import type { View } from '../router';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { getSave } from '../store';
import { allTalks, STATIONS, transcript } from '../../core/talk';

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
        ? el(
            'div.notes',
            {},
            notes.map(([id, n]) => {
              const photo = (FEATURES as readonly string[]).includes(id) ? photosOfFeature(PHOTOS, id as FeatureId)[0] : undefined;
              return el('article.note', { className: n.rare ? 'note rare' : 'note' }, photo ? photoFigure(photo, n.title) : null, el('h3', {}, n.title, n.rare ? el('span.tag', {}, 'Rare') : null), el('p', {}, n.text));
            }),
          )
        : el('p.muted', {}, 'Nothing written yet. Finish a lesson and its notes land here.'),
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
      ...radioLog(save),
    ),
  );
};

function radioLog(save: ReturnType<typeof getSave>): HTMLElement[] {
  const heard = allTalks().filter((t) => save.heard[t.id]);
  if (!save.talk || !heard.length) return [];
  return [
    el('h2', {}, 'Radio log'),
    el('div.radio-log', {}, heard.map((t) =>
      el('details.radio-transcript', {},
        el('summary', {}, t.when),
        transcript(t, save.heard[t.id]).map((line) =>
          el('p', { className: line.who }, el('b', {}, `${(line.who === 'them' ? STATIONS.them : STATIONS.you).place.toUpperCase()}: `), line.text))))),
  ];
}
