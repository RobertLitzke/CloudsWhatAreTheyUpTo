// The home page's picture, in the look of the painted course icons: a
// solder-mask green board with mustard and orange traces turning in 45° jogs,
// round pads, one chip, one lit LED and the resistor from the icon, under a
// film of grain. The middle is kept clear for the title over it; a phone
// sees the middle third (xMidYMax slice), a desktop the whole board.

const W = 1440;
const H = 520;

const C = {
  board: '#2f5a3a',
  mustard: '#d9a441',
  orange: '#e07a3a',
  cream: '#f3e0c0',
  sand: '#e6c9a0',
  gold: '#f0c56a',
  burnt: '#c0522a',
  ink: '#2b1a14',
};

const pad = (x: number, y: number, c = C.cream) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/><circle cx="${x}" cy="${y}" r="5" fill="${C.board}"/>`;
const trace = (d: string, c = C.mustard) => `<path d="${d}" stroke="${c}" stroke-width="11" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;

/** The board as an SVG element, to fill the hero. */
export function makeBanner(): SVGSVGElement {
  const traces = [
    trace('M60 100 H300 L360 160 H560 L620 100 H690'),
    trace('M60 460 H140', C.orange),
    trace('M120 300 H250 L310 240 H440', C.orange),
    trace('M1380 90 H1200 L1140 150 H980', C.orange),
    trace('M1380 470 H1180 L1120 410 H900 L860 370 H760'),
    trace('M1300 300 H1180 L1120 240 H1000'),
    trace('M700 520 V450 L740 410 H800'),
    trace('M300 520 V480', C.orange),
    trace('M1040 520 V470 L1080 430 H1160', C.orange),
  ].join('');
  const pads = [
    pad(60, 100), pad(690, 100), pad(60, 460, C.sand), pad(120, 300), pad(440, 240), pad(1380, 90),
    pad(1380, 470), pad(760, 370), pad(1300, 300), pad(1000, 240), pad(800, 410), pad(1160, 430),
  ].join('');
  const legs = [0, 1, 2, 3].map((i) => `<rect x="${222 + i * 36}" y="360" width="10" height="14" fill="${C.sand}"/><rect x="${222 + i * 36}" y="454" width="10" height="14" fill="${C.sand}"/>`).join('');
  const chip = `<g><rect x="200" y="372" width="150" height="84" rx="8" fill="${C.ink}"/>${legs}<circle cx="216" cy="388" r="5" fill="${C.sand}" opacity="0.7"/></g>`;
  const led = `<circle cx="1000" cy="150" r="46" fill="${C.gold}" opacity="0.25"/><circle cx="1000" cy="150" r="24" fill="url(#banner-led)"/><circle cx="991" cy="141" r="7" fill="${C.cream}" opacity="0.8"/>`;
  const bands = [[1222, C.orange], [1250, C.ink], [1278, C.orange], [1326, C.mustard]] as const;
  const resistor = `<g><rect x="1180" y="396" width="190" height="60" rx="30" fill="${C.sand}"/><rect x="1180" y="396" width="190" height="60" rx="30" fill="url(#banner-shine)"/>${bands.map(([x, c]) => `<rect x="${x}" y="396" width="16" height="60" fill="${c}"/>`).join('')}</g>`;

  const defs = `<defs>
    <filter id="banner-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.16 0"/></filter>
    <linearGradient id="banner-depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></linearGradient>
    <linearGradient id="banner-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.25"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></linearGradient>
    <radialGradient id="banner-led" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.burnt}"/></radialGradient>
  </defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${defs}<rect width="${W}" height="${H}" fill="${C.board}"/><rect width="${W}" height="${H}" fill="url(#banner-depth)"/>${traces}${pads}${chip}${led}${resistor}<rect width="${W}" height="${H}" filter="url(#banner-grain)" style="mix-blend-mode:multiply" opacity="0.9"/>`;
  return svg;
}
