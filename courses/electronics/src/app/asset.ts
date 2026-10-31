// Where the files that are not inlined come from: next to the page on the
// site, or from the site when the page was opened from disk.

import { assetFrom } from 'didactics/asset';

export { fromDisk } from 'didactics/asset';

export const SITE_URL = 'https://robertlitzke.github.io/Circuitry/';

export const asset = assetFrom(SITE_URL);
