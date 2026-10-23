// Cloud tones for the figures, which sit on the figure palette rather than a
// landscape scene: shade, mid and light, as every renderer grades them.

import type { Tones } from './flat';

/** Fair-weather cloud in full sun. */
export const DAY: Tones = { cloudShade: '#8a88a6', cloudMid: '#d3d9e6', cloudLight: '#ffffff' };
/** Thick, low, grey cloud: stratocumulus, stratus, a fog bank's shadowed side. */
export const GREY: Tones = { cloudShade: '#5f5d78', cloudMid: '#a3a8bd', cloudLight: '#e8ebf2' };
/** Storm cloud: dark bellies and a bright, hard top. */
export const STORM: Tones = { cloudShade: '#3f3a5c', cloudMid: '#8a86a4', cloudLight: '#f2f2f7' };
/** Cloud in the simplified figures: white, with the figures' lavender shade. */
export const FIGURE: Tones = { cloudShade: '#a9a0c4', cloudMid: '#dcd7ea', cloudLight: '#ffffff' };
