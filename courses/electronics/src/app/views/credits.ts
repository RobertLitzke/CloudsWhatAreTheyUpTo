// Who made what.

import { el } from 'didactics/dom';
import type { View } from 'didactics/router';

export const creditsView: View = (root) => {
  root.append(
    el(
      'div.page.credits',
      {},
      el('h1', {}, 'Credits'),
      el('p', {}, 'The drawings and the circuit simulator are made for this app. The lessons and app shell are built on the same kit as Clouds and Dirt.'),
      el('h2', {}, 'Type'),
      el('p', {}, 'Space Grotesk by Florian Karsten, Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, JetBrains Mono by JetBrains, and Kalam by the Indian Type Foundry, all under the SIL Open Font License.'),
      el('p.muted', {}, `Version ${__APP_VERSION__}`),
    ),
  );
};
