// Make the icons the manifest, the browser tab and iOS need: an aperture of
// six blades with a warm hole in the middle, the same drawing the header shows
// (src/app/mark.ts), so there is no art file to keep. Run `npm run icons`
// after changing it.
//
// It is drawn to read at 16 pixels: three tones far apart in lightness and no
// fine detail. The maskable variant keeps the aperture inside the centre 80%,
// because Android crops maskable icons to an arbitrary shape and only
// guarantees that much. The favicon has rounded corners; the others are
// square, as the platforms round them themselves.

import { writeIcons } from '../../../tools/lib/icons.mjs';
import { BLADES } from '../src/app/mark.ts';


/** The icon; `pad` shrinks the drawing toward the centre, `round` rounds the corners. */
function icon(pad = 0, round = false) {
  const k = 1 - pad * 2;
  const g = `translate(${50 - 50 * k} ${50 - 50 * k}) scale(${k})`;
  const clip = round ? ' clip-path="url(#r)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <clipPath id="r"><rect width="100" height="100" rx="22"/></clipPath>
  <g${clip}>
  <rect width="100" height="100" fill="#f2efe9"/>
  <g transform="${g}">
    ${BLADES}
  </g>
  </g>
</svg>`;
}

await writeIcons(new URL('../public/icons/', import.meta.url), ({ pad, round }) => icon(pad, round));
