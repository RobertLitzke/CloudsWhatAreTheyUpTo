// The home page's picture, in the look of the painted course icon: a soil
// profile in cross-section, mostly soil. A thin band of the icon's sunset
// arcs at the top, behind a fence and leafy rows; then three soil horizons,
// darkest on top, with one clean tap root per plant at the sides, stones
// sorted by depth (small ones high, big ones low), a worm, and a film of
// grain. The middle is kept clear for the title over it; a phone sees the
// middle third (xMidYMax slice), a desktop the whole profile.

const W = 1440;
const H = 520;
const HORIZON = 92;

const C = {
  maroon: '#5a2a2a',
  rust: '#8f3a2a',
  burnt: '#c0522a',
  orange: '#e07a3a',
  mustard: '#d9a441',
  gold: '#f0c56a',
  cream: '#f3e0c0',
  sand: '#e6c9a0',
  soil: '#3d2618',
  brown: '#5a3a28',
  loam: '#6e4a30',
  rose: '#d98a8a',
  leaf: '#8db24a',
  moss: '#4f7a3a',
};

/** A band from y0 at the left, waving by `amp`, filled to the bottom. */
function wave(y0: number, amp: number, period: number, phase: number, fill: string): string {
  let d = `M0 ${y0}`;
  for (let x = 0; x <= W; x += 20) d += ` L${x} ${(y0 + Math.sin((x / period) * Math.PI * 2 + phase) * amp).toFixed(1)}`;
  return `<path d="${d} L${W} ${H} L0 ${H}Z" fill="${fill}"/>`;
}

const plant = (x: number, s: number) =>
  `<g transform="translate(${x} ${HORIZON}) scale(${s})"><path d="M0 0 c-8 -20 -30 -30 -46 -24 2 22 22 32 46 24Z" fill="${C.moss}"/><path d="M0 0 c8 -20 30 -30 46 -24 -2 22 -22 32 -46 24Z" fill="${C.leaf}"/><path d="M0 0 c-4 -34 -2 -50 0 -62 2 12 4 28 0 62Z" fill="${C.moss}"/></g>`;

/** One plant's roots, drawn clean: a tap root and a few side roots, no tangle. */
const roots = (x: number, depth: number) => `<g stroke="${C.sand}" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M${x} ${HORIZON} q4 ${depth * 0.5} 0 ${depth}" stroke-width="7"/>
  <path d="M${x} ${HORIZON + depth * 0.25} q-30 20 -56 60 M${x} ${HORIZON + depth * 0.45} q36 16 60 54 M${x} ${HORIZON + depth * 0.65} q-26 14 -40 44" stroke-width="4"/>
  <path d="M${x - 56} ${HORIZON + depth * 0.25 + 60} q-10 10 -24 14 M${x + 60} ${HORIZON + depth * 0.45 + 54} q10 10 22 10" stroke-width="2.5"/></g>`;

/** The profile as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  const rings: [string, number][] = [[C.maroon, 700], [C.rust, 560], [C.burnt, 430], [C.orange, 320], [C.mustard, 220], [C.gold, 130]];
  const sky = `<rect width="${W}" height="${HORIZON}" fill="${C.maroon}"/>` + rings.map(([c, r]) => `<circle cx="720" cy="${HORIZON}" r="${r}" fill="${c}"/>`).join('');
  const plants = ([[90, 0.9], [230, 1.1], [370, 0.8], [1070, 1], [1210, 0.85], [1350, 1.1]] as const).map(([x, s]) => plant(x, s)).join('');
  const posts = [20, 60, 100, 140, 180, 220, 260, 300, 340, 380, 420, 460, 980, 1020, 1060, 1100, 1140, 1180, 1220, 1260, 1300, 1340, 1380, 1420];
  const fence = `<g fill="${C.cream}" opacity="0.9">${posts.map((x) => `<rect x="${x - 4}" y="${HORIZON - 44}" width="8" height="44" rx="2"/>`).join('')}<rect x="0" y="${HORIZON - 36}" width="470" height="6"/><rect x="970" y="${HORIZON - 36}" width="470" height="6"/></g>`;
  const ground = wave(HORIZON, 0, 1000, 0, C.soil) + wave(250, 10, 900, 0.6, C.brown) + wave(380, 12, 700, 2.2, C.loam) + wave(470, 8, 500, 1.1, C.sand);
  const specks = Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 197) % W}" cy="${110 + ((i * 89) % 130)}" r="${1.5 + (i % 3) * 0.6}" fill="${C.sand}" opacity="0.35"/>`).join('');
  const allRoots = roots(230, 230) + roots(1070, 200) + roots(370, 120) + roots(1210, 110) + roots(90, 140) + roots(1350, 160);
  const stones = ([[560, 300, 8], [900, 310, 8], [150, 330, 10], [1300, 320, 9], [430, 420, 16], [1010, 430, 18], [720, 440, 14], [700, 500, 22], [1240, 505, 20], [250, 490, 14], [560, 495, 12], [880, 480, 12]] as const)
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.35}" ry="${r}" fill="${C.sand}" opacity="0.5"/>`).join('');
  const worm = `<path d="M640 384 q 26 -22 52 0 t 52 0" stroke="${C.rose}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  const defs = `<defs><filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.16 0"/></filter></defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}${sky}${plants}${fence}${ground}${specks}${allRoots}${stones}${worm}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
