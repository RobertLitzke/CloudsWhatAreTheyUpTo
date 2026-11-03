// Make the icons the manifest, the browser tab and iOS need: a two-leaf
// sprout coming up out of a mound of soil, drawn here as SVG so there is no
// art file to keep. Run `npm run icons` after changing the drawing.
//
// It is drawn to read at 16 pixels: three big shapes in colours far apart in
// lightness (cream sky, dark soil, mid-green leaves) and no fine detail. The
// maskable variant keeps the sprout inside the centre 80%, because Android
// crops maskable icons to an arbitrary shape and only guarantees that much.
// The files themselves are written by tools/lib/icons.mjs at the root.

import { writeIcons } from '../../../tools/lib/icons.mjs';


/** The drawing on a 100-unit square. Keep MARK in src/main.ts (the header logo) in step. */
export const SPROUT = `<path d="M-40 76 Q50 50 140 76 V140 H-40Z" fill="#5a3f28"/>
    <path d="M50 70 V47" stroke="#3f6b2a" stroke-width="7" stroke-linecap="round"/>
    <path d="M50 50 C45 33 31 25 14 27 C14 45 30 54 50 50Z" fill="#4e8a2e"/>
    <path d="M50 43 C55 26 69 18 86 20 C86 38 70 47 50 43Z" fill="#86b43e"/>`;

/** The icon; `pad` shrinks the sprout and soil toward the centre, `round` rounds the corners. */
function icon(pad = 0, round = false) {
  const k = 1 - pad * 2;
  const g = `translate(${50 - 50 * k} ${50 - 50 * k}) scale(${k})`;
  const clip = round ? ' clip-path="url(#r)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <clipPath id="r"><rect width="100" height="100" rx="22"/></clipPath>
  <g${clip}>
  <rect width="100" height="100" fill="#efe6cf"/>
  <g transform="${g}">
    ${SPROUT}
  </g>
  </g>
</svg>`;
}

await writeIcons(new URL('../public/icons/', import.meta.url), ({ pad, round }) => icon(pad, round));
