// Lesson 3, The map that changed the world: layers far apart are matched by
// their fossils, and tilted layers cut by valleys leave patterns on a map.

import { el, svg } from 'didactics/dom';
import { arrow, label, line, redraw, small } from 'didactics/draw';
import { cellSize, fromCell, hillshade, makeRelief, mapView, mercator, outcrops, type Relief } from 'didactics/maps';
import { segmented } from 'didactics/ui';
import { BEDS, COL, choices, figure, frame, lock, lockIn, rgbOf, slider } from './kit';

const W = 400;

// ---- Matching layers by their fossils -----------------------------------------------

type Fossil = 'none' | 'oyster' | 'ammonite' | 'lampshell' | 'sealily';

interface Bed {
  rock: string;
  fill: string;
  fossil: Fossil;
  /** Oolite: a limestone of tiny round grains, drawn with dots. */
  dots?: boolean;
}

const FOSSIL_NAME: Record<Fossil, string> = {
  none: 'no fossils',
  oyster: 'curled oysters',
  ammonite: 'ammonites',
  lampshell: 'lamp shells',
  sealily: 'sea lily stems',
};

// Bath's pile, simplified, oldest first. The two clays look alike, and so do
// the two cream limestones; only their fossils tell them apart.
const PILE: Bed[] = [
  { rock: 'red marl', fill: '#b4553a', fossil: 'none' },
  { rock: 'grey limestone', fill: '#8f9aa3', fossil: 'oyster' },
  { rock: 'blue clay', fill: '#7f8ea3', fossil: 'ammonite' },
  { rock: 'cream limestone', fill: '#e8d8b5', fossil: 'lampshell', dots: true },
  { rock: 'blue clay', fill: '#7f8ea3', fossil: 'none' },
  { rock: 'cream limestone', fill: '#e8d8b5', fossil: 'sealily', dots: true },
];

interface Column {
  name: string;
  x: number;
  /** Which beds of the pile it shows, oldest first. */
  beds: number[];
}

const COLS: Column[] = [
  { name: 'Canal cutting', x: 22, beds: [4, 5] },
  { name: 'Hill quarry', x: 155, beds: [2, 3, 4, 5] },
  { name: 'Well shaft', x: 288, beds: [0, 1, 2, 3] },
];
const CW = 90;
const BH = 34;
const TOP = 46;
/** The ties to find: each bed in the side columns to the same bed in the middle one. */
const NEEDED = ['0:4', '0:5', '2:2', '2:3'];

const bedY = (c: Column, k: number) => TOP + (c.beds.length - 1 - k) * BH;

function fossilIcon(kind: Fossil, x: number, y: number): SVGElement[] {
  const ink = { fill: 'none', stroke: COL.ink, 'stroke-width': 1.1, 'stroke-linecap': 'round' };
  switch (kind) {
    case 'ammonite': {
      const pts: string[] = [];
      for (let a = 0; a < Math.PI * 5; a += 0.25) {
        const r = 0.9 + a * 0.42;
        pts.push(`${x + r * Math.cos(a)},${y + r * Math.sin(a)}`);
      }
      return [svg('polyline', { points: pts.join(' '), ...ink })];
    }
    case 'oyster':
      return [svg('path', { d: `M ${x - 5} ${y + 5} Q ${x - 7} ${y - 6} ${x + 3} ${y - 6} Q ${x + 6} ${y - 5} ${x + 4} ${y - 2} Q ${x - 1} ${y - 3} ${x + 1} ${y + 5} Z`, ...ink })];
    case 'lampshell':
      return [
        svg('path', { d: `M ${x} ${y - 6} C ${x + 7} ${y - 5} ${x + 7} ${y + 5} ${x} ${y + 6} C ${x - 7} ${y + 5} ${x - 7} ${y - 5} ${x} ${y - 6} Z`, ...ink }),
        line(x, y - 4, x, y + 6, COL.ink, 0.8),
      ];
    case 'sealily':
      return [0, 1, 2, 3, 4].map((i) => svg('ellipse', { cx: x, cy: y - 7 + i * 3.5, rx: 3.4, ry: 1.4, ...ink }));
    default:
      return [];
  }
}

export const correlateFigure = figure(['matched'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let picked: [number, number] | null = null;
  let ties: string[] = Array.isArray(t.kept) ? (t.kept as string[]).filter((s) => NEEDED.includes(s)) : [];
  let wrong: [number, number, number, number] | null = null;
  const choose = (ci: number, k: number) => {
    if (!picked || picked[0] === ci) {
      picked = [ci, k];
      wrong = null;
      const b = PILE[COLS[ci].beds[k]];
      f.readout.textContent = `${capital(b.rock)} with ${FOSSIL_NAME[b.fossil]}. Now tap the layer it matches in another column.`;
      paint();
      return;
    }
    const [pc, pk] = picked;
    picked = null;
    const a = COLS[pc].beds[pk];
    const b = COLS[ci].beds[k];
    const side = pc === 1 ? ci : ci === 1 ? pc : -1;
    if (side >= 0 && !COLS[1].beds.includes(pc === 1 ? b : a)) {
      f.readout.textContent = `The ${PILE[pc === 1 ? b : a].rock} with ${FOSSIL_NAME[PILE[pc === 1 ? b : a].fossil]} is not in the hill quarry at all: it lies deeper than the quarry goes. Not every layer has a partner.`;
    } else if (side < 0) {
      f.readout.textContent = 'Tie each side column to the hill quarry in the middle, which shows the most layers.';
    } else if (a === b) {
      const key = `${side}:${a}`;
      if (!ties.includes(key)) ties.push(key);
      t.keep(ties.slice());
      wrong = null;
      f.readout.textContent = ties.length === NEEDED.length
        ? 'All tied. Together the three places show six layers in order, red marl at the bottom to cream limestone at the top, though no single place shows more than four.'
        : PILE[a].fossil === 'none'
          ? `A match: ${PILE[a].rock} with no fossils, placed by the layer with sea lily stems on top of it. ${NEEDED.length - ties.length} more to tie.`
          : `A match: ${PILE[a].rock} with ${FOSSIL_NAME[PILE[a].fossil]} in both. ${NEEDED.length - ties.length} more to tie.`;
      if (ties.length === NEEDED.length && t.goal === 'matched') t.done();
    } else {
      wrong = [pc, pk, ci, k];
      const A = PILE[a];
      const B = PILE[b];
      f.readout.textContent = A.rock === B.rock
        ? `Same rock, both ${A.rock}, but one has ${FOSSIL_NAME[A.fossil]} and the other ${FOSSIL_NAME[B.fossil]}. They are different layers.`
        : `Those are different rocks: ${A.rock} and ${B.rock}.`;
    }
    paint();
  };
  const paint = () => {
    const parts: SVGElement[] = [];
    COLS.forEach((c, ci) => {
      parts.push(label(c.x + CW / 2, TOP - 12, c.name, { anchor: 'middle', bold: true, size: 'note' }));
      c.beds.forEach((b, k) => {
        const bed = PILE[b];
        const y = bedY(c, k);
        const on = picked && picked[0] === ci && picked[1] === k;
        const bad = wrong && ((wrong[0] === ci && wrong[1] === k) || (wrong[2] === ci && wrong[3] === k));
        const rect = svg('rect', { x: c.x, y, width: CW, height: BH, fill: bed.fill, stroke: on ? COL.heat : bad ? COL.bad : COL.paper, 'stroke-width': on || bad ? 3 : 1, tabindex: 0, role: 'button', 'aria-label': `${c.name}: ${bed.rock} with ${FOSSIL_NAME[bed.fossil]}` });
        rect.style.cursor = 'pointer';
        rect.addEventListener('click', () => choose(ci, k));
        rect.addEventListener('keydown', (e) => {
          if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
            e.preventDefault();
            choose(ci, k);
          }
        });
        parts.push(rect);
        if (bed.dots) for (let i = 0; i < 9; i++) parts.push(svg('circle', { cx: c.x + 8 + ((i * 37) % 74), cy: y + 6 + ((i * 13) % 22), r: 1.3, fill: '#b9a27a', 'pointer-events': 'none' }));
        const icons = [...fossilIcon(bed.fossil, c.x + 28, y + BH / 2), ...fossilIcon(bed.fossil, c.x + 62, y + BH / 2)];
        icons.forEach((n) => n.setAttribute('pointer-events', 'none'));
        parts.push(...icons);
      });
      parts.push(small(c.x + CW / 2, bedY(c, 0) + BH + 13, 'deeper, older', { anchor: 'middle', soft: true }));
      parts.push(line(c.x - 4, TOP, c.x + CW + 4, TOP, '#6b8f4e', 3));
    });
    for (const key of ties) {
      const [side, b] = key.split(':').map(Number);
      const s = COLS[side];
      const m = COLS[1];
      const ys = bedY(s, s.beds.indexOf(b)) + BH / 2;
      const ym = bedY(m, m.beds.indexOf(b)) + BH / 2;
      parts.push(side === 0 ? line(s.x + CW, ys, m.x, ym, COL.good, 2.5) : line(m.x + CW, ym, s.x, ys, COL.good, 2.5));
    }
    redraw(g, ...parts);
  };
  paint();
  f.readout.textContent = ties.length
    ? `${ties.length} of ${NEEDED.length} tied. Tap a layer, then the layer it matches in another column.`
    : 'Three places a few miles apart, ground level at the top. Tap a layer in a side column, then the layer it matches in the middle one.';
  return f.node;
});

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

// ---- Layers on a map: the rule of Vs ---------------------------------------------------

/** An invented valley: a plateau sloping gently east, cut by a river flowing east. */
const VW = 400;
const VH = 240;
const ZOOM = 15;
const STEP = 3;
const ORIGIN: [number, number] = mercator(-2.36, 51.38, ZOOM);
const PLATEAU = 260;
const FALL = 0.05; // the river drops 5 m in every 100: a slope of about 3 degrees
const DEPTH = 120;

function valley(): Relief {
  const meta = { width: VW, height: VH, zoom: ZOOM, x0: ORIGIN[0], y0: ORIGIN[1], step: STEP, bounds: [0, 0, 0, 0] as [number, number, number, number] };
  const r0 = makeRelief(meta, new Float32Array(VW * VH));
  const size = cellSize(r0);
  const z = new Float32Array(VW * VH);
  for (let j = 0; j < VH; j++) {
    for (let i = 0; i < VW; i++) {
      const east = i * size;
      const across = Math.abs(j - VH / 2) / (VH * 0.42);
      // A V-shaped valley with softened shoulders, as deep everywhere along it.
      const cut = DEPTH * Math.max(0, 1 - across ** 1.3);
      const wobble = 6 * Math.sin(i / 18) * Math.cos(j / 14);
      z[j * VW + i] = PLATEAU - FALL * east - cut + wobble * across;
    }
  }
  return makeRelief(meta, z);
}

const THICK = [45, 45, 45, 45, 45, 45];

export const veesFigure = figure(['downstream'], (_ctx, t) => {
  const r = valley();
  const size = cellSize(r);
  const shade = hillshade(r, undefined, 2);
  const view = mapView(r, { alt: 'A valley seen from above, with a river flowing from left to right, and the layers of rock coloured where they meet the ground.' });
  const section = svg('svg', { viewBox: `0 0 ${W} 110`, class: 'fig-svg' }) as SVGSVGElement;
  const sg = svg('g');
  section.append(sg);
  const drawing = el('div', {}, view.node, section);
  const f = frame({ drawing, lines: 3 });
  let dip = 0;
  let down = true;
  let open = false;
  const through = () => {
    const [lon, lat] = fromCell(r, VW / 2, VH / 2);
    return [lon, lat, PLATEAU - FALL * (VW / 2) * size - DEPTH - 30] as [number, number, number];
  };
  const riverDip = (Math.atan(FALL) * 180) / Math.PI;
  const paint = () => {
    const layers = open ? outcrops(r, { dipDirection: down ? 90 : 270, dip, through: through(), thickness: THICK }) : null;
    const cols = BEDS.map(rgbOf);
    view.paint({
      shade,
      relief: 0.85,
      ground: '#efe6d2',
      colorAt: layers ? (i) => cols[((layers[i] % cols.length) + cols.length) % cols.length] : undefined,
    });
    redraw(view.svg as unknown as SVGElement,
      line(0, view.h / 2, W, view.h / 2, COL.water, 2.4),
      svg('rect', { x: 146, y: view.h / 2 - 26, width: 110, height: 24, rx: 4, fill: COL.paper, opacity: 0.85 }),
      arrow(152, view.h / 2 - 8, 250, view.h / 2 - 8, COL.water, 2),
      small(154, view.h / 2 - 15, 'river flows this way', { fill: COL.water, bold: true }),
      svg('rect', { x: 2, y: 2, width: 58, height: 15, rx: 3, fill: COL.paper, opacity: 0.85 }),
      svg('rect', { x: W - 74, y: 2, width: 72, height: 15, rx: 3, fill: COL.paper, opacity: 0.85 }),
      small(6, 13, 'upstream', { soft: true }),
      small(W - 6, 13, 'downstream', { soft: true, anchor: 'end' }),
    );
    paintSection();
    if (!open) return;
    const along = !down ? 'upstream' : 'downstream';
    f.readout.textContent = dip === 0
      ? 'Flat layers. Each band follows the valley side at one height, so where the river cuts down it runs up the valley: the V points upstream.'
      : !down
        ? `Layers sloping ${dip}° upstream. The bands still make a V pointing upstream, tighter than for flat layers.`
        : dip < riverDip - 0.4
          ? `Layers sloping ${dip}° downstream, less steeply than the river falls (${riverDip.toFixed(0)}°). The river reaches older layers going upstream, so the V still points upstream.`
          : dip <= riverDip + 0.4
            ? `Layers sloping ${dip}°, the same as the river. The river runs along one layer, which fills the valley floor.`
            : dip >= 85
              ? 'Layers standing on end. The bands cross the valley in straight lines: height makes no difference to where they meet the ground.'
              : `Layers sloping ${dip}° ${along}, more steeply than the river. Now the V points downstream, the way the layers slope.`;
    if (down && dip > riverDip + 0.4 && dip < 85 && t.goal === 'downstream') t.done();
  };
  // A slice along the middle of the valley, heights stretched.
  const paintSection = () => {
    const hi = PLATEAU + 10;
    const lo = PLATEAU - FALL * (VW - 1) * size - DEPTH - 20;
    const sy = (z: number) => 18 + ((hi - z) / (hi - lo)) * 86;
    const sx = (i: number) => (i / (VW - 1)) * W;
    const ground = (i: number, across: number) => PLATEAU - FALL * i * size - DEPTH * Math.max(0, 1 - across ** 1.3);
    const parts: SVGElement[] = [];
    if (open) {
      const cos = Math.cos((dip * Math.PI) / 180);
      const tan = Math.tan((dip * Math.PI) / 180) * (down ? 1 : -1);
      const base = through()[2];
      const mid = VW / 2;
      const t0 = THICK[0] / Math.max(0.02, cos);
      for (let k = -40; k < 40; k++) {
        const z0 = (i: number) => base + k * t0 - (i - mid) * size * tan;
        const ends = [0, VW - 1];
        const pts = [...ends.map((i) => `${sx(i)},${sy(z0(i))}`), ...ends.reverse().map((i) => `${sx(i)},${sy(z0(i) + t0)}`)];
        parts.push(svg('polygon', { points: pts.join(' '), fill: BEDS[((k % BEDS.length) + BEDS.length) % BEDS.length] }));
      }
    }
    // Air above the river's bed; the hilltops on either side as a dashed line.
    const bed = Array.from({ length: VW }, (_, i) => `${sx(i)},${sy(ground(i, 0))}`);
    const tops = Array.from({ length: VW }, (_, i) => `${sx(i)},${sy(ground(i, 1))}`);
    parts.push(svg('polygon', { points: `0,0 ${bed.join(' ')} ${W},0`, fill: COL.paper }));
    if (!open) parts.push(svg('polygon', { points: `${bed.join(' ')} ${W},110 0,110`, fill: '#d8ccb4' }));
    parts.push(svg('polyline', { points: tops.join(' '), fill: 'none', stroke: COL.soft, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
    parts.push(svg('polyline', { points: bed.join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2.4 }));
    parts.push(small(6, 12, 'Slice along the river (heights stretched)', { soft: true }));
    parts.push(small(W - 6, sy(ground(VW - 1, 1)) - 5, 'hilltops either side', { anchor: 'end', soft: true }));
    parts.push(small(W - 6, sy(ground(VW - 1, 0)) - 5, 'river', { anchor: 'end', fill: COL.water, bold: true }));
    parts.push(svg('rect', { x: 0, y: 106, width: W, height: 4, fill: COL.paper }));
    redraw(sg, ...parts);
  };
  const ds = slider('Slope of the layers', 0, 90, 1, 0, (v) => `${v}°`, (v) => { dip = v; paint(); }, 'old');
  const way = segmented([{ value: 'down', label: 'Sloping downstream' }, { value: 'up', label: 'Upstream' }] as const, 'down', (v) => { down = v === 'down'; paint(); });
  way.style.display = 'none';
  const pick = choices(['A V pointing upstream', 'A V pointing downstream', 'Straight across the valley'], () => (go.disabled = false));
  const go = lockIn('Lock it in', () => {
    const guess = pick.picked();
    if (guess < 0) return;
    t.keep(guess);
    pick.freeze(true);
    go.remove();
    lock([ds], false);
    way.style.display = '';
    open = true;
    paint();
    f.readout.textContent = guess === 0
      ? 'Right: flat layers make a V pointing upstream. Now tilt them.'
      : 'Flat layers make a V pointing upstream: each band keeps to one height, and the valley floor climbs as you go upstream. Now tilt them.';
  });
  go.disabled = true;
  lock([ds], true);
  f.controls.append(pick.node, go, way, ds.node);
  paint();
  f.readout.textContent = 'A river has cut a valley into flat layers of rock. Seen from above, what shape will one layer make where it crosses the valley? Guess first.';
  if (typeof t.kept === 'number') {
    pick.pick(t.kept);
    go.click();
  }
  return f.node;
});
