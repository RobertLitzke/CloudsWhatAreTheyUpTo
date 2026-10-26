// Who made what: every photo with its author, licence and source.

import { el } from 'lesson-kit/dom';
import type { View } from 'lesson-kit/router';
import { LICENSES, SUBJECTS } from '../../core/photos';
import { PHOTOS } from '../picture';

export const creditsView: View = (root) => {
  root.append(
    el(
      'div.page.credits',
      {},
      el('h1', {}, 'Credits'),
      el('p', {}, 'Particle sizes and texture classes follow the USDA Soil Survey Manual. The drawings of the garden and the soils are made for this app.'),
      el('h2', {}, 'Photos'),
      PHOTOS.length
        ? el('ul.credit-list', {}, PHOTOS.map((p) => el('li', {},
            el('b', {}, SUBJECTS[p.subject]),
            ' by ',
            el('a', { href: p.sourceUrl, target: '_blank', rel: 'noopener' }, p.author),
            ', ',
            el('a', { href: LICENSES[p.license].url, target: '_blank', rel: 'noopener' }, LICENSES[p.license].name),
            `, via ${p.source}`,
          )))
        : el('p.muted', {}, 'No photos have been fetched yet; drawings stand in for them until they are.'),
      el('h2', {}, 'Type'),
      el('p', {}, 'Fraunces by Undercase Type, Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, and Kalam by the Indian Type Foundry, all under the SIL Open Font License.'),
      el('p.muted', {}, `Version ${__APP_VERSION__}`),
    ),
  );
};
