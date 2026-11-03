// The home page's picture, in the look of the painted course icon: a dusk
// sky in hard horizontal bands, a low sun, heaped cream cumulus with flat
// bases and shaded undersides, Harrow's elevator and water tower on the
// horizon and the wheat hills below, under a film of grain. The poster
// lettering sits over the upper half; a phone sees the middle third
// (xMidYMax slice), a desktop the whole sky.

const W = 1440;
const H = 520;

const C = {
  maroon: '#5a2a2a',
  rust: '#8f3a2a',
  burnt: '#c0522a',
  orange: '#e07a3a',
  peach: '#f0b27a',
  apricot: '#f4c88a',
  rose: '#d98a8a',
  violet: '#8a5a9a',
  plum: '#4a2a4a',
  cream: '#f3e0c0',
  gold: '#f0c56a',
  mustard: '#d9a441',
  town: '#2a1830',
};

/** A band from y0 at the left, waving by `amp`, filled to the bottom. */
function wave(y0: number, amp: number, period: number, phase: number, fill: string): string {
  let d = `M0 ${y0}`;
  for (let x = 0; x <= W; x += 20) d += ` L${x} ${(y0 + Math.sin((x / period) * Math.PI * 2 + phase) * amp).toFixed(1)}`;
  return `<path d="${d} L${W} ${H} L0 ${H}Z" fill="${fill}"/>`;
}

/**
 * A heaped cloud: round humps standing on a straight base, their bottoms cut
 * off by it, bigger in the middle, with a shaded underside.
 */
function cumulus(x: number, y: number, w: number, h: number, top: string, under: string, id: string): string {
  const humps: [number, number][] = [[0.08, 0.5], [0.26, 0.82], [0.48, 1], [0.7, 0.78], [0.9, 0.52]];
  const circles = (fill: string) => humps.map(([fx, fh]) => `<circle cx="${(x + fx * w).toFixed(1)}" cy="${(y - fh * h * 0.62).toFixed(1)}" r="${(fh * h * 0.72).toFixed(1)}" fill="${fill}"/>`).join('');
  return `<clipPath id="${id}"><rect x="${x - h}" y="${y - 2 * h}" width="${w + 2 * h}" height="${2 * h}"/></clipPath>` +
    `<clipPath id="${id}u"><rect x="${x - h}" y="${y - h * 0.26}" width="${w + 2 * h}" height="${h * 0.26}"/></clipPath>` +
    `<g clip-path="url(#${id})">${circles(top)}</g><g clip-path="url(#${id}u)">${circles(under)}</g>`;
}

/** The sky as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  const bands = [C.maroon, C.rust, C.burnt, C.orange, C.peach, C.apricot, C.rose, C.violet];
  const sky = bands.map((c, i) => `<rect y="${i * 46}" width="${W}" height="${i === bands.length - 1 ? H - i * 46 : 48}" fill="${c}"/>`).join('');
  const sun = `<circle cx="720" cy="300" r="150" fill="${C.gold}" opacity="0.35"/><circle cx="720" cy="300" r="112" fill="${C.gold}"/><circle cx="720" cy="300" r="112" fill="${C.mustard}" opacity="0.5"/>`;
  const clouds = cumulus(40, 250, 420, 130, C.cream, C.rose, 'banner-c1') + cumulus(960, 236, 460, 150, C.cream, C.peach, 'banner-c2')
    + cumulus(500, 150, 200, 54, C.apricot, C.rose, 'banner-c3') + cumulus(1200, 330, 190, 50, C.peach, C.rose, 'banner-c4') + cumulus(420, 352, 230, 62, C.apricot, C.rose, 'banner-c5');
  const stratus = `<rect x="0" y="330" width="420" height="10" rx="5" fill="${C.rose}" opacity="0.8"/><rect x="60" y="346" width="300" height="7" rx="4" fill="${C.rose}" opacity="0.6"/><rect x="900" y="338" width="540" height="8" rx="4" fill="${C.rose}" opacity="0.7"/>`;
  const far = wave(372, 10, 900, 1.2, C.plum) + wave(400, 14, 620, 0.3, '#3b2140');
  // Harrow at the horizon: the grain elevator, a water tower, a few roofs.
  const town = `<g fill="${C.town}">
    <rect x="1040" y="318" width="44" height="80"/><path d="M1040 318 L1062 300 L1084 318Z"/><rect x="1086" y="340" width="26" height="58"/>
    <rect x="980" y="360" width="30" height="20"/><path d="M980 360 L995 350 L1010 360Z"/>
    <rect x="1150" y="342" width="22" height="14" rx="3"/><path d="M1152 356 L1150 392 M1170 356 L1172 392" stroke="${C.town}" stroke-width="3"/>
    <rect x="300" y="366" width="34" height="22"/><path d="M300 366 L317 352 L334 366Z"/><rect x="345" y="374" width="20" height="14"/>
  </g>`;
  const fields = wave(420, 16, 1100, 2.1, '#2f1a3a') + wave(455, 20, 700, 0.6, '#241433') + wave(492, 10, 500, 2.8, '#1d1030');
  const furrows = [430, 458, 486].map((y, i) => `<path d="M0 ${y + 20} Q 720 ${y - 30 + i * 8} ${W} ${y + 10}" stroke="${C.violet}" stroke-opacity="0.22" stroke-width="3" fill="none"/>`).join('');
  const defs = `<defs><filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.16 0"/></filter></defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}${sky}${sun}${clouds}${stratus}${far}${town}${fields}${furrows}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
