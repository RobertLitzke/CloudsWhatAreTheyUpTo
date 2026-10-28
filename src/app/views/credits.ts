// Who made what: every photo with its author, licence and source.

import { genus } from '../../core/clouds';
import { LICENSES } from '../../core/photos';
import { el } from 'didactics/dom';
import { PHOTOS } from '../photos';
import type { View } from 'didactics/router';

export const creditsView: View = (root) => {
  root.append(
    el(
      'div.page.credits',
      {},
      el('h1', {}, 'Credits'),
      el('p', {}, 'Cloud names, heights and classification follow the WMO International Cloud Atlas. The drawn clouds and landscapes are made for this app.'),
      el('h2', {}, 'Photos'),
      PHOTOS.length
        ? el(
            'ul.credit-list',
            {},
            PHOTOS.map((p) =>
              el(
                'li',
                {},
                el('b', {}, genus(p.genus).name),
                ' by ',
                el('a', { href: p.sourceUrl, target: '_blank', rel: 'noopener' }, p.author),
                ', ',
                el('a', { href: LICENSES[p.license].url, target: '_blank', rel: 'noopener' }, LICENSES[p.license].name),
                `, via ${p.source}`,
              ),
            ),
          )
        : el('p.muted', {}, 'No photos have been fetched yet; the lessons use drawings until they are.'),
      el('h2', {}, 'Type'),
      el('p', {}, 'Oswald by Vernon Adams and Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, both under the SIL Open Font License.'),
      el('p.muted', {}, `Version ${__APP_VERSION__}`),
    ),
  );
};
