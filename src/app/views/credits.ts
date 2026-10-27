// Who made what: every photograph with its author, licence and source.

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
      el('p', {}, 'The camera figures use the Nikon Coolpix P950’s published specifications. The optics, exposure and noise behind them are worked out in src/core and are the textbook ones; they are a good likeness of a camera, not a measurement of yours.'),
      el('h2', {}, 'Photographs'),
      el('p', {}, 'Every photograph here is shown unaltered in the credits sense: the figures re-expose it on your screen, but the file is the photographer’s, under the licence named beside it.'),
      PHOTOS.length
        ? el('ul.credit-list', {}, PHOTOS.map((p) => el('li', {},
            el('b', {}, SUBJECTS[p.subject]),
            ' by ',
            el('a', { href: p.sourceUrl, target: '_blank', rel: 'noopener' }, p.author),
            ', ',
            el('a', { href: LICENSES[p.license].url, target: '_blank', rel: 'noopener' }, LICENSES[p.license].name),
            `, via ${p.source}`,
          )))
        : el('p.muted', {}, 'No photographs have been fetched yet; the figures say so where one is missing.'),
      el('h2', {}, 'Type'),
      el('p', {}, 'Fraunces by Undercase Type, Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, and Kalam by the Indian Type Foundry, all under the SIL Open Font License.'),
      el('p.muted', {}, `Version ${__APP_VERSION__}`),
    ),
  );
};
