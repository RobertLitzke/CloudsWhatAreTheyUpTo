// Where to look for each subject (src/core/photos.ts SUBJECTS) on Wikimedia
// Commons. Much of the US Fish and Wildlife Service's and NASA's photography
// is public domain and is mirrored on Commons, so it comes through the same
// categories. Add a category to a list to widen the search. Commons
// categories are often loose: the contact sheet is there so that a person
// picks only the photographs that really show their subject.
//
// Pick photographs that are sharp and well exposed to begin with. The figures
// re-expose them, and a picture that was already soft or noisy cannot show
// what a setting would have done.

export const CATEGORIES: Record<string, string[]> = {
  'perched-bird': ['Birds perching', 'Passeriformes', 'Birds of the United States'],
  'bird-in-flight': ['Birds in flight', 'Flying birds', 'Ardea herodias in flight'],
  'distant-wildlife': ['Cervidae', 'Wildlife of the United States', 'Mammals of North America'],
  'flower-close': ['Close-ups of flowers', 'Macro photographs of flowers', 'Wildflowers'],
  'insect-close': ['Macro photographs of insects', 'Insects on leaves', 'Odonata'],
  'woodland': ['Forests of the United States', 'Deciduous forests', 'Woodland paths'],
  'wide-landscape': ['Landscape photographs', 'Valleys of the United States', 'Coastlines'],
  'running-water': ['Waterfalls', 'Long exposure photographs of water', 'Mountain streams'],
  'night-sky': ['Night sky', 'Milky Way', 'Astrophotography'],
  'snow-scene': ['Snow', 'Winter landscapes', 'Snowy forests'],
  'backlit-leaves': ['Backlighting', 'Leaves against the light', 'Contre-jour'],
  'overcast-forest': ['Overcast', 'Forests in fog', 'Temperate rainforests'],
  'low-light': ['Nycticorax nycticorax', 'Birds at night', 'Night photographs of animals'],
};

/** Candidates narrower than this are skipped: they would look soft on a phone. */
export const MIN_WIDTH = 1600;
/**
 * The width photographs are stored at. The figures redraw them pixel by pixel
 * in the browser, so this is a compromise between sharpness on a phone at 2x
 * and how much work a redraw is while a slider is moving.
 */
export const STORE_WIDTH = 1200;
/** The depth map beside each photo is small: blur is a slow, smooth thing. */
export const DEPTH_WIDTH = 384;
/** WebP settings: quality 72 with the slowest, smallest encoder. */
export const WEBP = { quality: 72, effort: 6, smartSubsample: true } as const;
