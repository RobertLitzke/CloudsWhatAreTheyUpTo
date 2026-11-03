// The home page's picture, in the look of the painted course icon: ridges of
// evergreens at dusk with the sun setting, seen through a lens. Six aperture
// blades close in from the edge, each with a coloured inner edge in the
// icon's colours, and on the blades the spiral of edges an iris makes as it
// stops down. The title sits over the sky; a phone sees only the opening
// (xMidYMax slice), a desktop the blades as well.

const W = 1440;
const H = 520;

const C = {
  night: '#141a2e',
  navy: '#1d2240',
  teal: '#2f7f78',
  deepTeal: '#1f4f4a',
  pine: '#173a36',
  black: '#0d1f1c',
  steel: '#101a22',
  mustard: '#d9a441',
  gold: '#f0c56a',
  burnt: '#c0522a',
  orange: '#e07a3a',
  cream: '#f3e0c0',
  sand: '#e6c9a0',
};

/** A band from y0 at the left, waving by `amp`, filled to the bottom. */
function wave(y0: number, amp: number, period: number, phase: number, fill: string): string {
  let d = `M0 ${y0}`;
  for (let x = 0; x <= W; x += 20) d += ` L${x} ${(y0 + Math.sin((x / period) * Math.PI * 2 + phase) * amp).toFixed(1)}`;
  return `<path d="${d} L${W} ${H} L0 ${H}Z" fill="${fill}"/>`;
}

const star = (x: number, y: number, r: number) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${C.cream}"/>`;

const fir = (x: number, y: number, h: number, fill: string) =>
  `<path d="M${x} ${y - h} L${x + h * 0.22} ${y - h * 0.62} L${x + h * 0.12} ${y - h * 0.62} L${x + h * 0.32} ${y - h * 0.3} L${x + h * 0.18} ${y - h * 0.3} L${x + h * 0.4} ${y} L${x - h * 0.4} ${y} L${x - h * 0.18} ${y - h * 0.3} L${x - h * 0.32} ${y - h * 0.3} L${x - h * 0.12} ${y - h * 0.62} L${x - h * 0.22} ${y - h * 0.62}Z" fill="${fill}"/>`;

/** The scene as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  const stars = ([[200, 50, 4], [1250, 40, 5], [1000, 110, 3], [380, 130, 3], [620, 70, 3], [840, 40, 4]] as const).map(([x, y, r]) => star(x, y, r)).join('');
  const sun = `<circle cx="720" cy="372" r="74" fill="url(#banner-sun)"/>`;
  const ridges = wave(370, 20, 1500, 2.6, C.teal) + wave(406, 24, 900, 0.8, C.deepTeal) + wave(452, 18, 700, 1.9, C.pine) + wave(494, 10, 500, 0.4, C.black);
  const trees = ([
    [80, 420, 90, C.pine], [160, 438, 70, C.pine], [1300, 430, 100, C.pine], [1380, 445, 70, C.pine], [430, 455, 62, C.black],
    [1120, 462, 54, C.black], [1010, 450, 70, C.pine], [260, 470, 48, C.black], [590, 462, 44, C.black], [860, 468, 40, C.black],
  ] as const).map(([x, y, h, c]) => fir(x, y, h, c)).join('');

  // The iris: centre, the opening's radius, and an outer radius past the corners.
  const cx = 720;
  const cy = 280;
  const R = 1400;
  const r = 470;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const p = (ang: number, radius: number) => `${(cx + Math.cos(ang) * radius).toFixed(1)} ${(cy + Math.sin(ang) * radius).toFixed(1)}`;
  const edge = [C.burnt, C.mustard, C.cream, C.teal, C.sand, C.orange];
  // A blade's inner edge, offset 14° the way real blades overlap, turned by `turn`.
  const bladeEdge = (i: number, radius: number, turn: number): [string, string] =>
    [p(rad(i * 60 - 90 + 14 + turn), radius), p(rad(i * 60 - 30 + 14 + turn), radius)];
  const blades = edge.map((_, i) => {
    const [i0, i1] = bladeEdge(i, r, 0);
    return `<path d="M${p(rad(i * 60 - 90), R)} L${p(rad(i * 60 - 30), R)} L${i1} L${i0}Z" fill="${C.steel}"/>`;
  }).join('');
  // The same six edges again and again, each ring a little further out and
  // turned a little further: the spiral a lens shows as it stops down.
  let spiral = '';
  for (let k = 1; k <= 18; k++) {
    for (let i = 0; i < 6; i++) {
      const [a0, a1] = bladeEdge(i, r + k * 26, k * 6);
      spiral += `<path d="M${a0} L${a1}" stroke="${C.cream}" stroke-opacity="${(0.42 - k * 0.02).toFixed(3)}" stroke-width="2.5"/>`;
    }
  }
  const edges = edge.map((c, i) => { const [i0, i1] = bladeEdge(i, r, 0); return `<path d="M${i0} L${i1}" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`; }).join('');

  const defs = `<defs>
    <filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.16 0"/></filter>
    <linearGradient id="banner-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.night}"/><stop offset="0.5" stop-color="${C.navy}"/><stop offset="0.78" stop-color="${C.teal}"/><stop offset="1" stop-color="${C.mustard}"/></linearGradient>
    <linearGradient id="banner-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.burnt}"/></linearGradient>
  </defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}<rect width="${W}" height="${H}" fill="url(#banner-sky)"/>${stars}${sun}${ridges}${trees}${blades}${spiral}${edges}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
