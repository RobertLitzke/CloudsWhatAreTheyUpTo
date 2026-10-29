// Who made what: every photo with its author, licence and source.

import { el } from 'didactics/dom';
import { creditsView as credits } from 'didactics/photos';
import { SUBJECTS } from '../../core/photos';
import { PHOTOS } from '../picture';

export const creditsView = credits({
  photos: PHOTOS,
  name: (p) => SUBJECTS[p.subject],
  intro: el('p', {}, 'Particle sizes and texture classes follow the USDA Soil Survey Manual. The drawings of the garden and the soils are made for this app.'),
  empty: 'No photos have been fetched yet; drawings stand in for them until they are.',
  after: [
    el('h2', {}, 'Type'),
    el('p', {}, 'Fraunces by Undercase Type, Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, and Kalam by the Indian Type Foundry, all under the SIL Open Font License.'),
    el('p.muted', {}, `Version ${__APP_VERSION__}`),
  ],
});
