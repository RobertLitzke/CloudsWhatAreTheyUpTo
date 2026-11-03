// The app icon: a cliff of tilted layers under flat ones (an unconformity),
// drawn as SVG, and the PNGs the manifest and phones need, made from it.
//   npm run icons -w geology    (the files, via tools/lib/icons.mjs at the root)

import { writeIcons } from '../../../tools/lib/icons.mjs';

/** Tilted beds below, flat beds above, with the line between them. `pad` shrinks it for the maskable icon. */
function icon(pad = 0, round = 22) {
  const s = 100 - 2 * pad;
  const t = (x, y) => `${pad + (x * s) / 100},${pad + (y * s) / 100}`;
  const tilted = ['#5b4b8a', '#b4553a', '#d4a54a', '#8f9aa3', '#b4553a', '#d4a54a', '#5b4b8a'];
  const beds = tilted.map((c, i) => {
    const x = -40 + i * 22;
    return `<polygon points="${t(x, 100)} ${t(x + 22, 100)} ${t(x + 22 + 40, 52)} ${t(x + 40, 52)}" fill="${c}"/>`;
  }).join('');
  const flat = [['#e9d9b0', 52, 44], ['#d9b98a', 44, 36], ['#c99a6b', 36, 28]]
    .map(([c, a, b]) => `<rect x="${pad}" y="${pad + (b * s) / 100}" width="${s}" height="${((a - b) * s) / 100}" fill="${c}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><rect width="100" height="100" rx="${round}"/></clipPath><g clip-path="url(#c)"><rect width="100" height="100" fill="#2a2420"/>${beds}${flat}<polyline points="${t(0, 52)} ${t(30, 50)} ${t(62, 53)} ${t(100, 51)}" fill="none" stroke="#2a2420" stroke-width="${2.2 * s / 100}"/><circle cx="${pad + (78 * s) / 100}" cy="${pad + (15 * s) / 100}" r="${(7 * s) / 100}" fill="#fbf6ec"/></g></svg>`;
}

await writeIcons(new URL('../public/icons/', import.meta.url), ({ pad, round }) => icon(pad * 100, round ? 22 : 0));
