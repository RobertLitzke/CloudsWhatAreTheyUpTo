// The home page's picture (defineCourse `hero`), in the look of the painted
// course icon: an unconformity. Tilted beds below a flat line, level beds on
// top of it, and on the right the level beds rise into a hill whose slope
// cuts across them; a cream moon in a navy sky warmed with violet, and a film
// of grain. The title sits over the sky; a phone sees the middle third
// (xMidYMax slice), a desktop the hill as well.

const W = 1440;
const H = 520;

const C = {
  night: '#141a2e',
  violet: '#8a5a9a',
  cream: '#f3e0c0',
  sand: '#e6c9a0',
  mustard: '#d9a441',
  orange: '#e07a3a',
  burnt: '#c0522a',
  rust: '#8f3a2a',
  teal: '#2f7f78',
  brown: '#5a3a28',
  soil: '#3d2618',
  ink: '#2b1a14',
};

const star = (x: number, y: number, r: number) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${C.cream}"/>`;

/** The outcrop as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  // The lower, tilted beds: wide stripes turned 28°, cut off at the unconformity.
  const lower = [C.rust, C.mustard, C.teal, C.burnt, C.sand, C.brown, C.orange, C.rust, C.mustard, C.teal, C.burnt, C.sand, C.brown, C.orange, C.rust, C.mustard];
  const stripes = lower.map((c, i) => `<rect x="${-400 + i * 150}" y="-400" width="150" height="1600" fill="${c}"/>`).join('');
  const tilted = `<g clip-path="url(#banner-below)"><g transform="rotate(-28 720 400)">${stripes}</g></g>`;
  // The upper, level beds, from the hilltop down to the unconformity.
  const level = ([[206, 40, C.sand], [246, 30, C.brown], [276, 24, C.soil], [300, 38, C.sand], [338, 26, C.brown], [364, 20, C.soil]] as const)
    .map(([y, h, c]) => `<rect y="${y}" width="${W}" height="${h}" fill="${c}"/>`).join('');
  const line = `<rect y="384" width="${W}" height="4" fill="${C.ink}" opacity="0.5"/>`;
  // The sky, drawn over the beds down to the ground: flat, then rising into the hill at the right edge.
  const skyline = `M0 0 H${W} V206 C1240 206 1100 348 880 348 H0 Z`;
  const sky = `<path d="${skyline}" fill="${C.night}"/><path d="${skyline}" fill="url(#banner-sky)"/>`;
  const stars = ([[120, 60, 5], [400, 40, 4], [660, 90, 3], [1330, 70, 5], [1180, 140, 3], [900, 50, 3], [560, 160, 2.5]] as const).map(([x, y, r]) => star(x, y, r)).join('');
  const moon = `<circle cx="300" cy="120" r="54" fill="${C.cream}"/>`;
  const defs = `<defs>
    <filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.16 0"/></filter>
    <linearGradient id="banner-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.night}"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0.5"/></linearGradient>
    <clipPath id="banner-below"><rect y="386" width="${W}" height="200"/></clipPath>
  </defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}${tilted}${level}${line}${sky}${stars}${moon}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
