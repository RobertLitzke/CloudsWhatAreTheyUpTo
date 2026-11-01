// Who made what: every photograph with its author, licence and source, and
// the type (Didactics' Credits page, in defineCourse's `photos`).

import { el } from 'didactics/dom';
import type { CreditsViewOptions } from 'didactics/photos';
import { SUBJECTS, type Photo } from '../core/photos';
import { PHOTOS } from './picture';

export const CREDITS: CreditsViewOptions<Photo> = {
  photos: PHOTOS,
  name: (p) => SUBJECTS[p.subject],
  intro: [
    el('p', {}, 'The camera figures use the Nikon Coolpix P950’s published specifications. The optics, exposure and noise behind them are worked out in src/core and are the textbook ones; they are a good likeness of a camera, not a measurement of yours.'),
    el('p', {}, 'The figures re-expose each photograph on your screen, but the file is the photographer’s, under the licence named beside it.'),
  ],
  empty: 'No photographs have been fetched yet; the figures say so where one is missing.',
  after: [
    el('h2', {}, 'Type'),
    el('p', {}, 'Fraunces by Undercase Type and Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, all under the SIL Open Font License.'),
    el('p.muted', {}, `Version ${__APP_VERSION__}`),
  ],
};
