// Where to look for each subject (src/core/photos.ts SUBJECTS) on Wikimedia
// Commons. USDA NRCS soil photos are public domain and many are mirrored on
// Commons, so they come through the same categories. Add a category to a list
// to widen the search. Commons categories are often loose: the contact sheet
// is there so a person picks only the photos that clearly show their subject.

export const CATEGORIES: Record<string, string[]> = {
  'sandy-soil': ['Sandy soils', 'Arenosols'],
  'clay-soil': ['Clay soils', 'Vertisols', 'Desiccation cracks'],
  'loam': ['Loam', 'Garden soil', 'Topsoil'],
  'silt-soil': ['Silt', 'Loess'],
  'soil-profile': ['Soil profiles', 'Soil horizons', 'Soil profiles in the United States'],
  'jar-test': ['Soil texture', 'Soil texture tests'],
};

/** Candidates narrower than this are skipped: they would look soft on a phone. */
export const MIN_WIDTH = 1200;
/**
 * The width photos are stored at. Photos never show wider than about 700 CSS
 * pixels, so 1024 is sharp on a phone at 2x.
 */
export const STORE_WIDTH = 1024;
/** WebP settings: quality 70 with the slowest, smallest encoder. */
export const WEBP = { quality: 70, effort: 6, smartSubsample: true } as const;
