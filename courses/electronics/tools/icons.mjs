// Make the PNG icons the manifest and iOS need: a lit LED on a scrap of
// circuit board with a copper trace, drawn here as SVG so there is no art file
// to keep. Run `npm run icons -w electronics` after changing the drawing;
// the files are written by tools/lib/icons.mjs at the root.
//
// The maskable variant keeps the drawing inside the centre 80%, because
// Android crops maskable icons to an arbitrary shape and only guarantees that
// much.

import { writeIcons } from '../../../tools/lib/icons.mjs';

/** The icon on a 100-unit square; `pad` shrinks the drawing toward the centre, `round` rounds the corners. */
function icon(pad = 0, round = false) {
  const k = 1 - pad * 2;
  const g = `translate(${50 - 50 * k} ${50 - 50 * k}) scale(${k})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <clipPath id="r"><rect width="100" height="100" rx="22"/></clipPath>
  <g${round ? ' clip-path="url(#r)"' : ''}>
  <rect width="100" height="100" fill="#1f5a43"/>
  <g transform="${g}">
    <path d="M0 78 H30 L40 68 H60 L70 78 H100" stroke="#c8793a" stroke-width="7" fill="none" stroke-linejoin="round"/>
    <circle cx="40" cy="68" r="6" fill="#b9bec4"/><circle cx="60" cy="68" r="6" fill="#b9bec4"/>
    <path d="M40 68 V56 M60 68 V56" stroke="#b9bec4" stroke-width="3"/>
    <circle cx="50" cy="40" r="30" fill="#f0b23e" opacity="0.25"/>
    <path d="M33 58 V38 a17 17 0 0 1 34 0 V58 Z" fill="#ffb21c"/>
    <rect x="30" y="56" width="40" height="6" rx="2" fill="#f0b23e"/>
    <circle cx="42" cy="34" r="5" fill="#fff4cf"/>
  </g>
  </g>
</svg>`;
}

await writeIcons(new URL('../public/icons/', import.meta.url), ({ pad, round }) => icon(pad, round));
