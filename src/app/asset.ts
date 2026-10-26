// Where the files that are not inlined (photos, the poster) come from: next to
// the page on the site, or from the site when the page was opened from disk.

import { assetFrom } from 'lesson-kit/asset';

export { fromDisk } from 'lesson-kit/asset';

export const SITE_URL = 'https://robertlitzke.github.io/CloudsWhatAreTheyUpTo/';

export const asset = assetFrom(SITE_URL);
