// Who made what: every photo with its author, licence and source.

import { genus } from '../../core/clouds';
import { el } from 'didactics/dom';
import { creditsView as credits } from 'didactics/photos';
import { PHOTOS } from '../photos';

export const creditsView = credits({
  photos: PHOTOS,
  name: (p) => genus(p.genus).name,
  intro: el('p', {}, 'Cloud names, heights and classification follow the WMO International Cloud Atlas. The drawn clouds and landscapes are made for this app.'),
  empty: 'No photos have been fetched yet; the lessons use drawings until they are.',
  after: [
    el('h2', {}, 'Type'),
    el('p', {}, 'Oswald by Vernon Adams and Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, both under the SIL Open Font License.'),
    el('p.muted', {}, `Version ${__APP_VERSION__}`),
  ],
});
