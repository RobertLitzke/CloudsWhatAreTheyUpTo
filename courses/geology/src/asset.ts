// Where files that are not inlined (photos, map reliefs) come from: next to
// the page on the site, or from the site when the page was opened from disk.

import { assetFrom } from 'didactics/asset';

export const SITE_URL = 'https://robertlitzke.github.io/CloudsWhatAreTheyUpTo/geology/';

export const asset = assetFrom(SITE_URL);
