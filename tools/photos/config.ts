// Where to look for each genus on Wikimedia Commons. NOAA's photo library is
// public domain and much of it is mirrored on Commons, so it comes through the
// same categories. Add a category to a list to widen the search.

export const CATEGORIES: Record<string, string[]> = {
  cirrus: ['Cirrus clouds', 'Cirrus fibratus', 'Cirrus uncinus'],
  cirrocumulus: ['Cirrocumulus clouds', 'Cirrocumulus stratiformis'],
  cirrostratus: ['Cirrostratus clouds', 'Cirrostratus fibratus', 'Cirrostratus nebulosus'],
  altocumulus: ['Altocumulus clouds', 'Altocumulus stratiformis', 'Altocumulus floccus', 'Altocumulus castellanus'],
  altostratus: ['Altostratus clouds', 'Altostratus translucidus', 'Altostratus opacus'],
  nimbostratus: ['Nimbostratus clouds'],
  stratocumulus: ['Stratocumulus clouds', 'Stratocumulus stratiformis'],
  stratus: ['Stratus clouds', 'Stratus nebulosus', 'Stratus fractus'],
  cumulus: ['Cumulus clouds', 'Cumulus humilis', 'Cumulus mediocris', 'Cumulus congestus'],
  cumulonimbus: ['Cumulonimbus clouds', 'Cumulonimbus calvus', 'Cumulonimbus capillatus incus'],
};

/** Candidates narrower than this are skipped: they would look soft on a phone. */
export const MIN_WIDTH = 1200;
/** The width photos are stored at. */
export const STORE_WIDTH = 1280;
