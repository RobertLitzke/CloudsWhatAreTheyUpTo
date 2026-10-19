// Where to look for each genus on Wikimedia Commons. NOAA's photo library is
// public domain and much of it is mirrored on Commons, so it comes through the
// same categories. Add a category to a list to widen the search.

export const CATEGORIES: Record<string, string[]> = {
  cirrus: ['Cirrus clouds', 'Cirrus fibratus clouds', 'Cirrus uncinus clouds', 'Cirrus spissatus clouds'],
  cirrocumulus: ['Cirrocumulus clouds', 'Cirrocumulus stratiformis clouds', 'Cirrocumulus floccus clouds'],
  cirrostratus: ['Cirrostratus clouds', 'Cirrostratus fibratus clouds', 'Cirrostratus nebulosus clouds'],
  altocumulus: ['Altocumulus clouds', 'Altocumulus stratiformis clouds', 'Altocumulus floccus clouds', 'Altocumulus castellanus clouds', 'Altocumulus undulatus clouds'],
  altostratus: ['Altostratus clouds', 'Altostratus translucidus clouds', 'Altostratus undulatus clouds'],
  nimbostratus: ['Nimbostratus clouds'],
  stratocumulus: ['Stratocumulus clouds', 'Stratocumulus stratiformis clouds', 'Stratocumulus undulatus clouds', 'Stratocumulus lacunosus clouds'],
  stratus: ['Stratus clouds', 'Stratus nebulosus clouds', 'Stratus fractus'],
  cumulus: ['Cumulus humilis clouds', 'Cumulus mediocris clouds', 'Cumulus congestus clouds', 'Cumulus clouds to be classified'],
  cumulonimbus: ['Cumulonimbus calvus', 'Cumulonimbus capillatus', 'Cumulonimbus incus', 'Partial views of cumulonimbus clouds'],
};

/**
 * The rare clouds of the last shift, keyed by their journal entry. Their photos
 * are filed under the genus they belong to, but kept out of the everyday radio
 * checks and shown with their journal note instead. A Kelvin-Helmholtz wave can
 * form on several genera, so a fluctus pick may name its own genus in
 * picks.json: { "title": "File:…", "genus": "cirrus" }.
 */
export const FEATURES: Record<string, { genus: string; categories: string[] }> = {
  lenticularis: { genus: 'altocumulus', categories: ['Altocumulus lenticularis clouds', 'Lenticular clouds'] },
  mammatus: { genus: 'cumulonimbus', categories: ['Mammatus clouds', 'Mammatus clouds in the United States'] },
  fluctus: { genus: 'altocumulus', categories: ['Fluctus clouds', 'Kelvin-Helmholtz waves'] },
};

/** Candidates narrower than this are skipped: they would look soft on a phone. */
export const MIN_WIDTH = 1200;
/** The width photos are stored at. */
export const STORE_WIDTH = 1280;
