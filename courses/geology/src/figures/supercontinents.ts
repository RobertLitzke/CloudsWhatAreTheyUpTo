// Lesson 13, The ocean before the Atlantic: the continents through a billion
// years, from the PALEOMAP plate model (paleomap.ts). The North Atlantic
// played back past the Atlantic to the Iapetus Ocean, with its two kinds of
// trilobites; the dip of a compass needle as a record of latitude; the whole
// world from Rodinia to 50 million years ahead; the Wilson cycle; and how fast
// ridges raise the sea.

import { svg } from 'didactics/dom';
import { label, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, player, slider } from './kit';
import {
  AHEAD, OLDEST, PALEOMAP_CREDIT, anchor, between, carried, centreAt, drawn, globeView, km, land, onPlateModel, plateOf,
  rotationAt, worldClip, worldView, WORLD_ASPECT, xyz, type V3,
} from './paleomap';

const SEA = '#dfeaf0';
const SHELF_FILL = '#e9dfc9';
const LAND_FILL = '#bfa982';

// ---- Grouping plates by how they moved -------------------------------------------------------

type Qt = [number, number, number, number];
const mul = ([a1, b1, c1, d1]: Qt, [a2, b2, c2, d2]: Qt): Qt => [
  a1 * a2 - b1 * b2 - c1 * c2 - d1 * d2, a1 * b2 + b1 * a2 + c1 * d2 - d1 * c2, a1 * c2 - b1 * d2 + c1 * a2 + d1 * b2, a1 * d2 + b1 * c2 - c1 * b2 + d1 * a2,
];
const inv = ([w, x, y, z]: Qt): Qt => [w, -x, -y, -z];
/** Whether plate `p` moved with plate `ref` between `t1` and `t2` million years ago (same motion within `tol` degrees). */
function movedWith(p: number, ref: number, t1: number, t2: number, tol = 10): boolean {
  const a = mul(rotationAt(p, t1), inv(rotationAt(p, t2)));
  const b = mul(rotationAt(ref, t1), inv(rotationAt(ref, t2)));
  const c = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, c)) * 180) / Math.PI < tol;
}

// ---- The trilobites of Newfoundland, and the ocean before the Atlantic ----------------------------

/** The sides of Iapetus, by which way each plate moved 490 to 430 million years ago. */
const SIDES = [
  { name: 'Laurentia', ref: 'gros_morne', color: COL.young },
  { name: 'Avalonia', ref: 'wales', color: COL.old },
  { name: 'Baltica', ref: 'scania', color: '#8a7fb8' },
] as const;
const sideCache = new Map<number, string | null>();
function sideOf(p: number): string | null {
  if (!sideCache.has(p)) {
    const s = SIDES.find((s) => movedWith(p, plateOf(s.ref), 490, 430));
    sideCache.set(p, s ? s.color : null);
  }
  return sideCache.get(p) ?? null;
}

/** Where the two kinds of Cambrian trilobites are found. */
const OLENELLUS = ['gros_morne', 'nw_scotland'];
const PARADOXIDES = ['newfoundland_e', 'boston', 'wales', 'scania'];

export const iapetusFigure = figure(['iapetus'], (ctx, t) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 4);
  return onPlateModel(t, f, () => {
    const g = svg('g');
    const clipId = `iapetus-clip-${Math.random().toString(36).slice(2, 8)}`;
    f.svg.append(svg('defs', {}, svg('clipPath', { id: clipId }, svg('rect', { x: 0, y: 0, width: W, height: H }))), g);
    g.setAttribute('clip-path', `url(#${clipId})`);
    const START = 0;
    const END = 500;
    let ma = 0;
    const paint = () => {
      const mid = between(anchor('gros_morne', ma), anchor('newfoundland_e', ma), 0.5);
      const view = globeView(W / 2, H / 2 + 6, 300, mid);
      const parts: SVGElement[] = [svg('rect', { x: 0, y: 0, width: W, height: H, fill: SEA })];
      // Lines of latitude, every 15°.
      for (let lat = -75; lat <= 75; lat += 15) {
        const pts: V3[] = [];
        for (let lon = -180; lon <= 180; lon += 3) pts.push(xyz(lon, lat));
        const ps = pts.map(view.at);
        let d = '';
        ps.forEach(([x, y, front], i) => { if (front) d += `${i && ps[i - 1][2] ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; });
        parts.push(svg('path', { d, fill: 'none', stroke: lat === 0 ? '#9fb7c6' : '#fff', 'stroke-width': lat === 0 ? 1.2 : 0.8, 'stroke-dasharray': lat === 0 ? '5 3' : '' }));
        if (lat === 0) {
          const vis = ps.filter((p) => p[2] && p[0] > 10 && p[0] < W - 60 && p[1] > 20 && p[1] < H - 10);
          if (vis.length) parts.push(small(vis[vis.length - 1][0], vis[vis.length - 1][1] - 4, 'equator', { soft: true, halo: SEA }));
        }
      }
      // Shelf, then land, coloured by the side of Iapetus each piece was on.
      const groups = new Map<string, { land: V3[][]; shelf: V3[][] }>();
      const add = (key: string, kind: 'land' | 'shelf', pts: V3[]) => {
        if (!groups.has(key)) groups.set(key, { land: [], shelf: [] });
        groups.get(key)![kind].push(pts);
      };
      for (const s of carried(land(), ma)) add(sideOf(s.p) ?? LAND_FILL, 'land', s.pts);
      for (const [key, v] of groups) {
        parts.push(svg('path', { d: view.rings(v.land), fill: key, stroke: COL.ink, 'stroke-width': 0.4, 'stroke-opacity': 0.5, 'fill-opacity': key === LAND_FILL ? 0.8 : 0.85 }));
      }
      // The trilobites.
      const mark = (name: string, kind: 'o' | 'p') => {
        const [x, y, front] = view.at(anchor(name, ma));
        if (!front) return [];
        return kind === 'o'
          ? [svg('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: COL.ink, 'stroke-width': 1.6 })]
          : [svg('rect', { x: x - 4, y: y - 4, width: 8, height: 8, fill: COL.ink, stroke: '#fff', 'stroke-width': 1, transform: `rotate(45 ${x} ${y})` })];
      };
      for (const n of OLENELLUS) parts.push(...mark(n, 'o'));
      for (const n of PARADOXIDES) parts.push(...mark(n, 'p'));
      // Names that move with their land.
      const name = (where: string, text: string, color: string, dy = 0) => {
        const [x, y, front] = view.at(anchor(where, ma));
        return front && x > 30 && x < W - 30 && y > 30 && y < H - 30 ? [small(x, y + dy, text, { bold: true, anchor: 'middle', fill: color, halo: '#fff' })] : [];
      };
      parts.push(
        ...name('laurentia', ma > 300 ? 'Laurentia' : 'North America', COL.ink),
        ...name('baltica', ma > 300 ? 'Baltica' : 'Europe', COL.ink, 14),
        ...name('africa', ma > 300 ? 'Gondwana' : 'Africa', COL.ink),
      );
      if (ma > 445) {
        const [x, y, front] = view.at(between(anchor('gros_morne', ma), anchor('newfoundland_e', ma)));
        if (front) parts.push(label(x, y, 'Iapetus Ocean', { anchor: 'middle', fill: COL.water, bold: true, halo: SEA, attrs: { 'font-style': 'italic' } }));
      } else if (ma < 170) {
        const [x, y, front] = view.at(between(anchor('newfoundland_e', ma), anchor('wales', ma)));
        if (front) parts.push(label(x, y + 30, 'Atlantic', { anchor: 'middle', fill: COL.water, bold: true, halo: SEA, attrs: { 'font-style': 'italic' } }));
      }
      // The key.
      parts.push(
        svg('rect', { x: 6, y: H - 50, width: 176, height: 44, rx: 4, fill: '#fff', opacity: 0.85 }),
        svg('circle', { cx: 16, cy: H - 38, r: 4.5, fill: '#fff', stroke: COL.ink, 'stroke-width': 1.6 }),
        small(26, H - 35, 'Olenellus trilobites', { bold: true }),
        svg('rect', { x: 12, y: H - 22, width: 8, height: 8, fill: COL.ink, transform: `rotate(45 16 ${H - 18})` }),
        small(26, H - 15, 'Paradoxides trilobites', { bold: true }),
        label(W - 8, 18, ma < 0.5 ? 'Today' : `${Math.round(ma)} million years ago`, { anchor: 'end', bold: true, halo: SEA }),
      );
      redraw(g, ...parts);
      const width = km(anchor('gros_morne', ma), anchor('newfoundland_e', ma));
      const atlantic = km(anchor('newfoundland_e', ma), anchor('wales', ma));
      f.readout.textContent = ma < 1
        ? 'Today. Western Newfoundland and northwest Scotland (orange) hold Olenellus trilobites; eastern Newfoundland, Boston, Wales and Sweden (purple) hold Paradoxides. Run the clock back.'
        : ma < 190
          ? `${Math.round(ma)} million years ago. The Atlantic narrows as it is run back: Newfoundland is now ${Math.round(atlantic / 100) * 100} km from Wales.`
          : ma < 425
            ? `${Math.round(ma)} million years ago. The Atlantic has closed. Newfoundland lies against Ireland and Britain, all one continent, and the two kinds of trilobite sit side by side.`
            : ma < 445
              ? `${Math.round(ma)} million years ago. Laurentia, Avalonia and Baltica are colliding. The squeezed rock between them is rising into the Caledonian mountains of Scotland and Norway and the northern Appalachians.`
              : `${Math.round(ma)} million years ago. An ocean about ${Math.round(width / 100) * 100} km wide, Iapetus, separates the two halves of Newfoundland. Olenellus lives on the shelves of Laurentia, Paradoxides on the far side, near Gondwana and Baltica.`;
      if (ma >= 490 && t.goal === 'iapetus') t.done();
    };
    const ts = slider('Time', START, END, 1, 0, (v) => (v < 1 ? 'today' : `${v} million years ago`), (v) => { ma = v; paint(); }, 'heat');
    f.controls.append(player(ts, ctx, { seconds: 16 }).node, ts.node);
    paint();
    guessFirst(t, f, {
      ask: 'Western Newfoundland’s trilobites match Scotland’s northwest; eastern Newfoundland’s match Wales. Run the clock back 500 million years. Once the Atlantic has closed, what do you expect next?',
      options: ['Nothing more changes', 'An older ocean opens', 'The island splits'],
      answer: 1, reveal: 'done', sliders: [ts],
      after: () => paint(),
    });
    const credit = document.createElement('p');
    credit.className = 'map-credit';
    credit.textContent = PALEOMAP_CREDIT;
    f.node.append(credit);
  });
});

// ---- A compass needle records latitude ------------------------------------------------------------

/** Field dip for a latitude (degrees, down positive), for a dipole: tan I = 2 tan latitude. */
const dipAt = (lat: number) => (Math.atan(2 * Math.tan((lat * Math.PI) / 180)) * 180) / Math.PI;
/** The Deccan lavas: latitude now, and the dip frozen into them (north end up). */
const DECCAN_NOW = 19;
const DECCAN_THEN = -28;
const DECCAN_DIP = Math.round(dipAt(DECCAN_THEN));

export const dipFigure = figure(['deccan'], (ctx, t) => {
  void ctx;
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const cx = 120;
  const cy = 125;
  const R = 78;
  let lat = DECCAN_NOW;
  // Field lines of a dipole: r = L cos² latitude.
  const lines: SVGElement[] = [];
  for (const L of [1.25, 1.6, 2.2, 3.2]) {
    for (const side of [1, -1]) {
      let d = '';
      for (let a = -80; a <= 80; a += 2) {
        const r = R * L * Math.cos((a * Math.PI) / 180) ** 2;
        if (r < R) continue;
        const x = cx + side * r * Math.cos((a * Math.PI) / 180);
        const y = cy - r * Math.sin((a * Math.PI) / 180);
        d += `${d ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      }
      lines.push(svg('path', { d, fill: 'none', stroke: COL.pressure, 'stroke-width': 0.9, opacity: 0.55 }));
    }
  }
  const needle = (x: number, y: number, len: number, dip: number, tilt: number, color: string, w = 3) => {
    // Along the ground (tilted by `tilt` radians, the local horizontal), north to the left as drawn on the globe's right side.
    const a = tilt + (dip * Math.PI) / 180;
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    return [
      svg('line', { x1: x, y1: y, x2: x - dx, y2: y - dy, stroke: '#9aa3ab', 'stroke-width': w, 'stroke-linecap': 'round' }),
      svg('line', { x1: x + dx, y1: y + dy, x2: x, y2: y, stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }),
    ];
  };
  const paint = () => {
    const I = dipAt(lat);
    const a = (lat * Math.PI) / 180;
    const px = cx + R * Math.cos(a);
    const py = cy - R * Math.sin(a);
    // Big dial on the right: the ground level, the needle now, and the lava's needle.
    const bx = 300;
    const by = 118;
    const L = 62;
    const match = Math.abs(lat - DECCAN_THEN) <= 2;
    redraw(g,
      ...lines,
      svg('circle', { cx, cy, r: R, fill: '#e8dcc4', stroke: COL.ink, 'stroke-width': 1.2 }),
      svg('line', { x1: cx, y1: cy - R - 12, x2: cx, y2: cy + R + 12, stroke: COL.soft, 'stroke-width': 0.8, 'stroke-dasharray': '3 3' }),
      small(cx, cy - R - 16, 'N', { anchor: 'middle', bold: true }),
      small(cx, cy + R + 24, 'S', { anchor: 'middle', bold: true }),
      svg('line', { x1: cx - R, y1: cy, x2: cx + R, y2: cy, stroke: COL.soft, 'stroke-width': 0.8 }),
      small(cx - R + 4, cy - 4, 'equator', { soft: true }),
      svg('circle', { cx: px, cy: py, r: 4, fill: COL.heat }),
      ...(() => {
        // The needle beside the point: north end along the field, north and (in the north) down.
        const ii = (I * Math.PI) / 180;
        const ux = Math.cos(ii) * -Math.sin(a) + Math.sin(ii) * -Math.cos(a);
        const uy = Math.cos(ii) * -Math.cos(a) + Math.sin(ii) * Math.sin(a);
        const nx = px + Math.cos(a) * 16;
        const ny = py - Math.sin(a) * 16;
        return [
          svg('line', { x1: nx, y1: ny, x2: nx - ux * 11, y2: ny - uy * 11, stroke: '#9aa3ab', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
          svg('line', { x1: nx, y1: ny, x2: nx + ux * 11, y2: ny + uy * 11, stroke: COL.heat, 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
        ];
      })(),
      // The dial.
      svg('line', { x1: bx - L - 14, y1: by, x2: bx + L + 14, y2: by, stroke: COL.mud, 'stroke-width': 2 }),
      svg('rect', { x: bx - L - 14, y: by, width: 2 * L + 28, height: 10, fill: '#e8dcc4' }),
      small(bx + L + 14, by + 22, 'ground', { anchor: 'end', soft: true }),
      small(bx - L - 14, by - 6, '← north', { soft: true }),
      small(bx, by + 88, 'coloured end: the end that points north', { anchor: 'middle', soft: true }),
      ...needle(bx, by, L, -DECCAN_DIP, Math.PI, COL.old, 5).map((n) => { n.setAttribute('opacity', '0.55'); return n; }),
      ...needle(bx, by, L, -I, Math.PI, COL.heat, 3),
      svg('circle', { cx: bx, cy: by, r: 3.5, fill: COL.ink }),
      small(bx, 30, `Needle here: dips ${Math.abs(Math.round(I))}° ${I >= 0 ? 'down' : 'up'}`, { anchor: 'middle', bold: true, fill: COL.heat }),
      small(bx, 44, `Deccan lava: ${Math.abs(DECCAN_DIP)}° up`, { anchor: 'middle', bold: true, fill: COL.old }),
      small(bx, by + 60, `${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'}`, { anchor: 'middle', bold: true }),
      small(bx, by + 74, 'tan(dip) = 2 × tan(latitude)', { anchor: 'middle', soft: true }),
    );
    f.readout.textContent = match
      ? `At ${Math.abs(lat)}° S the north end of the needle points ${Math.abs(Math.round(I))}° up, as it does in the lava. The Deccan lavas cooled about ${Math.abs(DECCAN_THEN)}° south of the equator, some ${Math.round(((DECCAN_NOW - DECCAN_THEN) * 111.2) / 100) * 100} km south of where they are now.`
      : `At ${Math.abs(lat)}° ${lat >= 0 ? 'north' : 'south'} the field ${Math.abs(I) < 2 ? 'runs level' : `dips ${Math.abs(Math.round(I))}° ${I > 0 ? 'into the ground' : 'out of the ground'}`}${lat === DECCAN_NOW ? ', as it does in India today' : ''}. Find the latitude where the needle lies along the lava’s.`;
    if (match && t.goal === 'deccan') t.done();
  };
  const s = slider('Latitude', -80, 80, 1, DECCAN_NOW, (v) => (v === 0 ? '0°' : `${Math.abs(v)}° ${v > 0 ? 'N' : 'S'}`), (v) => { lat = v; paint(); }, 'heat');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: `The Deccan lavas lie at ${DECCAN_NOW}° N, where a compass needle now dips ${Math.round(dipAt(DECCAN_NOW))}° into the ground. The magnetism frozen into them points ${Math.abs(DECCAN_DIP)}° up out of it. Where did they cool?`,
    options: ['About where they are now', 'On the equator', 'South of the equator'],
    answer: 2, reveal: 'done', sliders: [s],
    after: () => paint(),
  });
  return f.node;
});

// ---- A billion years of continents ---------------------------------------------------------------------

interface Tag { text: string; from: number; to: number; at: (ma: number, lon0: number) => V3 | 'off' | [number, number]; kind: 'land' | 'sea' | 'event' }
const at = (name: string) => (ma: number) => anchor(name, ma);
const mid = (a: string, b: string, k = 0.5) => (ma: number) => between(anchor(a, ma), anchor(b, ma), k);
/** A point out in the open ocean, `dlon` degrees from the map's middle (screen-fixed). */
const open = (dlon: number, lat: number) => (_ma: number, _lon0: number): [number, number] => [dlon, lat];

const TAGS: Tag[] = [
  { text: 'Rodinia', from: 1000, to: 760, at: at('laurentia'), kind: 'land' },
  { text: 'Mirovia', from: 1000, to: 760, at: open(150, -5), kind: 'sea' },
  { text: 'Grenville mountains', from: 1000, to: 960, at: at('grenville'), kind: 'event' },
  { text: 'Laurentia', from: 740, to: 420, at: at('laurentia'), kind: 'land' },
  { text: 'Gondwana', from: 580, to: 340, at: at('africa'), kind: 'land' },
  { text: 'Baltica', from: 560, to: 430, at: at('baltica'), kind: 'land' },
  { text: 'Siberia', from: 560, to: 300, at: at('siberia'), kind: 'land' },
  { text: 'Iapetus Ocean', from: 560, to: 445, at: mid('gros_morne', 'wales'), kind: 'sea' },
  { text: 'Pan-African mountains', from: 620, to: 540, at: at('east_africa'), kind: 'event' },
  { text: 'Caledonian mountains', from: 440, to: 395, at: at('caledonides'), kind: 'event' },
  { text: 'Rheic Ocean', from: 440, to: 345, at: mid('boston', 'morocco'), kind: 'sea' },
  { text: 'Appalachians', from: 330, to: 270, at: at('appalachians'), kind: 'event' },
  { text: 'Urals', from: 300, to: 255, at: at('urals'), kind: 'event' },
  { text: 'Pangaea', from: 320, to: 190, at: mid('atlas', 'africa', 0.75), kind: 'land' },
  { text: 'Panthalassa', from: 340, to: 180, at: open(-125, -10), kind: 'sea' },
  { text: 'Tethys', from: 280, to: 120, at: mid('arabia', 'china', 0.55), kind: 'sea' },
  { text: 'Siberian Traps', from: 256, to: 246, at: at('siberian_traps'), kind: 'event' },
  { text: 'Atlantic opens', from: 195, to: 165, at: mid('appalachians', 'atlas'), kind: 'event' },
  { text: 'Laurasia', from: 175, to: 70, at: at('greenland'), kind: 'land' },
  { text: 'Gondwana', from: 175, to: 115, at: at('africa'), kind: 'land' },
  { text: 'India', from: 110, to: 40, at: at('india'), kind: 'land' },
  { text: 'Himalaya', from: 48, to: -AHEAD, at: at('himalaya'), kind: 'event' },
  { text: 'Atlantic', from: 120, to: -AHEAD, at: mid('newfoundland_e', 'atlas', 0.5), kind: 'sea' },
  { text: 'Pacific', from: 160, to: -AHEAD, at: open(-150, 5), kind: 'sea' },
  { text: 'Southern Ocean opens', from: 36, to: 24, at: mid('drake_sa', 'drake_an'), kind: 'event' },
];

/** Ice on the map: which pole, down to what latitude, and whether the sea froze too. */
const ICE: { from: number; to: number; south?: number; north?: number; sea?: boolean; name: string }[] = [
  { from: 717, to: 660, south: -10, north: 10, sea: true, name: 'Snowball Earth' },
  { from: 650, to: 635, south: -10, north: 10, sea: true, name: 'Snowball Earth' },
  { from: 450, to: 440, south: -55, name: 'Ordovician ice' },
  { from: 340, to: 260, south: -50, name: 'Gondwana ice' },
  { from: 34, to: -AHEAD, south: -66, name: 'Antarctic ice' },
  { from: 3, to: -AHEAD, north: 62, name: 'Northern ice ages' },
];

/** The timeline under the map. */
const BARS: { row: number; from: number; to: number; text: string; color: string }[] = [
  { row: 0, from: 1000, to: 750, text: 'Rodinia', color: COL.old },
  { row: 0, from: 330, to: 175, text: 'Pangaea', color: COL.heat },
  { row: 1, from: 560, to: 175, text: 'Gondwana', color: COL.young },
  { row: 2, from: 717, to: 635, text: 'Snowball', color: '#7fa7c4' },
  { row: 2, from: 450, to: 440, text: '', color: '#7fa7c4' },
  { row: 2, from: 340, to: 260, text: 'ice', color: '#7fa7c4' },
  { row: 2, from: 34, to: 0, text: '', color: '#7fa7c4' },
];
/** The five great mass extinctions, million years ago. */
const EXTINCTIONS = [445, 372, 252, 201, 66];

/** What the readout says, by age: each line holds from its age down to the next one's. */
const STORY: [number, string][] = [
  [1000, 'Rodinia. Most of the land is gathered in one supercontinent, with Laurentia, the core of North America, near its middle. The Grenville mountains, where the last pieces were stitched on, run from Labrador to Texas.'],
  [900, 'Rodinia holds together for a quarter of a billion years. Around it lies a single world ocean, sometimes called Mirovia.'],
  [770, 'Rodinia tears apart. Rifts split it into pieces, and new oceans open between them.'],
  [717, 'Snowball Earth. With much of the land near the equator, ice sheets twice reach the sea in the tropics, 717 to 660 and about 650 to 635 million years ago.'],
  [632, 'The pieces regroup. The southern ones collide into Gondwana, raising the Pan-African mountains. Laurentia drifts on its own, and the Iapetus Ocean opens between it, Baltica and Gondwana.'],
  [539, 'The Cambrian. Animals with shells and skeletons appear, on the warm, shallow shelves around the scattered continents.'],
  [450, 'Gondwana drifts over the South Pole. Ice spreads across it, sea level falls, and the shelves drain: the first of the five great mass extinctions follows, 445 million years ago.'],
  [438, 'Iapetus closes. Baltica and Avalonia collide with Laurentia, raising the Caledonian mountains of Scotland and Norway and the northern Appalachians.'],
  [390, 'The Rheic Ocean narrows as Gondwana closes on the northern continents. The second great extinction comes about 372 million years ago, in the Late Devonian.'],
  [330, 'Pangaea. Gondwana collides with North America and Europe. The Appalachians, the Atlas of Morocco and the mountains of central Europe rise as one long range. Ice covers southern Gondwana (lesson 9), while coal swamps grow along the equator.'],
  [290, 'Siberia and Kazakhstan join from the east, raising the Urals. Nearly all the land is one continent, with a dry interior far from any sea, and one ocean, Panthalassa, covers the rest of the globe.'],
  [256, 'The end of the Permian, 252 million years ago: the Siberian Traps pour out millions of cubic kilometres of basalt, and the worst extinction of all kills most species in the sea.'],
  [245, 'Pangaea at its largest. The Tethys Ocean cuts a wedge into its eastern side.'],
  [201, 'Pangaea splits. Basalt floods out along the rift that becomes the central Atlantic, and a fourth great extinction comes with it, 201 million years ago.'],
  [175, 'Two continents again: Laurasia in the north, Gondwana in the south, with Tethys between them.'],
  [130, 'Gondwana breaks up. The South Atlantic opens (lesson 10), and India sets off north. Ridges spread fast, sea level stands 100 to 250 m above today’s, and shallow seas cover much of the continents.'],
  [66, 'An asteroid hits Mexico 66 million years ago, the fifth great extinction. India is still crossing the ocean toward Asia.'],
  [50, 'India hits Asia. The Himalaya and the Tibetan Plateau rise, and are still rising.'],
  [36, 'Australia and South America pull away from Antarctica. A current now circles it unbroken, and an ice sheet grows over it.'],
  [3, 'North and South America join at Panama. Ice sheets begin to come and go over the northern continents (lessons 15 to 17).'],
  [0, 'Today. Every ocean floor in the figure is younger than about 200 million years; the older ones have gone down trenches. The continents keep the record.'],
  [-5, 'Ahead, if today’s plate motions held: the Atlantic keeps widening, Australia pushes into Southeast Asia, and Africa closes the Mediterranean against Europe. Beyond about 50 million years, nobody can say which ocean will close.'],
];
const storyAt = (ma: number) => STORY.find(([from], i) => ma <= from && (i === STORY.length - 1 || ma > STORY[i + 1][0]))?.[1] ?? STORY[0][1];

export const supercontinentsFigure = figure(['played'], (ctx, t) => {
  const W = 400;
  const MAPW = 392;
  const MAPH = MAPW / WORLD_ASPECT;
  const TOP = 24;
  const TL = TOP + MAPH + 12;
  const H = TL + 74;
  const f = frame(W, H, 4);
  return onPlateModel(t, f, () => {
    const clipView = worldView(4, TOP, MAPW, 0);
    const clip = worldClip(f.svg, clipView);
    const landClipId = `land-clip-${Math.random().toString(36).slice(2, 8)}`;
    const landClipPath = svg('path', { d: '' });
    f.svg.append(svg('defs', {}, svg('clipPath', { id: landClipId }, landClipPath)));
    const map = svg('g', { 'clip-path': clip });
    const over = svg('g');
    const line = svg('g');
    f.svg.append(map, over, line);
    const START = OLDEST;
    const span = START + AHEAD;
    let ma = START;
    // The timeline's scale.
    const tx0 = 46;
    const tx1 = W - 10;
    const tx = (a: number) => tx0 + ((START - a) / span) * (tx1 - tx0);
    const rowY = (r: number) => TL + 12 + r * 12;
    const timeline: SVGElement[] = [
      small(4, rowY(0) + 3, 'Land', { soft: true }),
      small(4, rowY(2) + 3, 'Ice', { soft: true }),
      small(4, rowY(3) + 6, 'Extinctions', { soft: true, attrs: { 'font-size': 8 } }),
      ...BARS.flatMap((b) => [
        svg('rect', { x: tx(b.from), y: rowY(b.row) - 4, width: Math.max(2, tx(b.to) - tx(b.from)), height: 8, rx: 2, fill: b.color, opacity: 0.8 }),
        b.text ? small(tx(b.from) + 3, rowY(b.row) + 3, b.text, { fill: b.row === 2 ? COL.ink : '#fff', bold: true, attrs: { 'font-size': 8 } }) : null,
      ].filter((x): x is SVGElement => !!x)),
      ...EXTINCTIONS.map((e) => svg('path', { d: `M${tx(e) - 3},${rowY(3) - 1}l6,6m0,-6l-6,6`, stroke: COL.bad, 'stroke-width': 1.6 })),
      svg('line', { x1: tx0, y1: rowY(3) + 12, x2: tx1, y2: rowY(3) + 12, stroke: COL.soft, 'stroke-width': 0.8 }),
      ...[1000, 750, 500, 250, 0].map((a) => small(tx(a), rowY(3) + 22, a === 0 ? 'today' : `${a}`, { anchor: 'middle', soft: true })),
      svg('rect', { x: tx(0), y: rowY(0) - 6, width: tx1 - tx(0), height: rowY(3) + 6 - rowY(0) + 6, fill: COL.paper, opacity: 0.0, stroke: COL.soft, 'stroke-dasharray': '2 2', 'stroke-width': 0.6 }),
    ];
    const paint = () => {
      const lon0 = centreAt(ma);
      const view = worldView(4, TOP, MAPW, lon0);
      const { shelf, land } = drawn(view.rings, ma);
      landClipPath.setAttribute('d', land);
      const ice = ICE.filter((i) => ma <= i.from && ma >= i.to);
      const cap = (lat: number, pole: 90 | -90) => {
        let d = '';
        for (let lon = -180; lon <= 180; lon += 10) d += `${d ? 'L' : 'M'}${view.ll(lon, lat).map((n) => n.toFixed(1)).join(',')}`;
        d += `L${view.ll(180, pole).join(',')}L${view.ll(-180, pole).join(',')}Z`;
        return d;
      };
      const iceParts: SVGElement[] = [];
      for (const i of ice) {
        for (const [lat, pole] of [[i.south, -90], [i.north, 90]] as const) {
          if (lat === undefined) continue;
          iceParts.push(svg('path', { d: cap(lat, pole), fill: '#fff', opacity: i.sea ? 0.55 : 0.85, 'clip-path': i.sea ? '' : `url(#${landClipId})` }));
        }
      }
      redraw(map,
        svg('path', { d: view.outline, fill: SEA }),
        ...[-60, -30, 30, 60].map((lat) => svg('path', { d: view.parallel(lat), stroke: '#fff', 'stroke-width': 0.8, fill: 'none' })),
        svg('path', { d: view.parallel(0), stroke: '#9fb7c6', 'stroke-width': 1, 'stroke-dasharray': '5 3', fill: 'none' }),
        svg('path', { d: shelf, fill: SHELF_FILL }),
        svg('path', { d: land, fill: LAND_FILL }),
        ...iceParts,
        svg('path', { d: land, fill: 'none', stroke: '#8f7853', 'stroke-width': 0.5 }),
      );
      // Names.
      const tags: SVGElement[] = [];
      for (const tag of TAGS) {
        if (ma > tag.from || ma < tag.to) continue;
        const p = tag.at(ma, lon0);
        if (p === 'off') continue;
        const [x, y] = Array.isArray(p) && p.length === 2 ? view.ll(p[0], p[1]) : view.at(p as V3);
        if (x < 8 || x > W - 8 || y < TOP + 4 || y > TOP + MAPH - 2) continue;
        if (tag.kind === 'event') {
          tags.push(
            svg('path', { d: `M${x},${y - 5}l5,8h-10z`, fill: COL.heat, stroke: '#fff', 'stroke-width': 1 }),
            small(x, y + 14, tag.text, { anchor: 'middle', bold: true, fill: COL.heat, halo: '#fff' }),
          );
        } else if (tag.kind === 'sea') {
          tags.push(small(x, y, tag.text, { anchor: 'middle', bold: true, fill: COL.water, halo: SEA, attrs: { 'font-style': 'italic' } }));
        } else {
          tags.push(label(x, y, tag.text, { anchor: 'middle', bold: true, halo: '#fff' }));
        }
      }
      const iceName = ice.length ? ice[ice.length - 1].name : '';
      redraw(over,
        svg('path', { d: view.outline, fill: 'none', stroke: COL.soft, 'stroke-width': 0.8 }),
        ...tags,
        label(W - 6, 15, ma < -0.5 ? `${Math.round(-ma)} million years ahead` : ma < 0.5 ? 'Today' : `${Math.round(ma)} million years ago`, { anchor: 'end', bold: true }),
        iceName ? small(6, 15, iceName, { bold: true, fill: COL.water }) : null as unknown as SVGElement,
      );
      redraw(line,
        ...timeline,
        svg('line', { x1: tx(ma), y1: rowY(0) - 8, x2: tx(ma), y2: rowY(3) + 12, stroke: COL.ink, 'stroke-width': 1.5 }),
        svg('path', { d: `M${tx(ma) - 4},${rowY(0) - 12}h8l-4,5z`, fill: COL.ink }),
      );
      f.readout.textContent = storyAt(ma);
      if (ma <= 0 && t.goal === 'played') t.done();
    };
    const ts = slider('Time', 0, span, 1, 0, (v) => {
      const a = START - v;
      return a < -0.5 ? `${-a} million years ahead` : a < 0.5 ? 'today' : `${a} million years ago`;
    }, (v) => { ma = START - v; paint(); }, 'heat');
    f.controls.append(player(ts, ctx, { seconds: 40 }).node, ts.node);
    paint();
    guessFirst(t, f, {
      ask: 'Pangaea broke up about 200 million years ago. What do you expect to find before it?',
      options: ['No land at all', 'Scattered continents', 'An earlier supercontinent'],
      answer: 2, reveal: 'lock', sliders: [ts],
      after: () => paint(),
    });
    const credit = document.createElement('p');
    credit.className = 'map-credit';
    credit.textContent = `${PALEOMAP_CREDIT}. Ice and named features simplified.`;
    f.node.append(credit);
  });
});

// ---- The Wilson cycle ---------------------------------------------------------------------------

export const wilsonStill = () => {
  const W = 400;
  const H = 300;
  const { node, svg: s } = still(W, H);
  const PW = 124;
  const PH = 118;
  const C = '#d9c39a';
  const OC = '#4a4a5a';
  const MANTLE = COL.mantle;
  const panel = (i: number, title: string, where: string, draw: (x: number, y: number) => SVGElement[]) => {
    const x = 6 + (i % 3) * (PW + 8);
    const y = 6 + Math.floor(i / 3) * (PH + 30);
    return [
      svg('rect', { x, y: y + 34, width: PW, height: PH - 34, fill: MANTLE }),
      svg('rect', { x, y: y + 14, width: PW, height: 20, fill: SEA, opacity: 0.0 }),
      ...draw(x, y + 50),
      small(x, y + 8, `${i + 1}. ${title}`, { bold: true }),
      small(x, y + PH + 12, where, { soft: true }),
    ];
  };
  const sea = (x: number, y: number, x1: number, x2: number, depth = 26) => svg('rect', { x: x + x1, y: y - 8, width: x2 - x1, height: depth, fill: SEA });
  const block = (pts: [number, number][], fill: string) => svg('path', { d: `M${pts.map((p) => p.join(',')).join('L')}Z`, fill, stroke: COL.ink, 'stroke-width': 0.6 });
  s.append(
    ...panel(0, 'A continent rifts', 'East Africa today', (x, y) => [
      block([[x, y - 8], [x + 52, y - 8], [x + 58, y + 2], [x + 62, y + 2], [x + 66, y - 8], [x + PW, y - 8], [x + PW, y + 24], [x, y + 24]], C),
      svg('path', { d: `M${x + 55},${y - 8}l5,-9l5,9z`, fill: COL.heat }),
      svg('path', { d: `M${x + 60},${y + 52}C${x + 60},${y + 40} ${x + 60},${y + 32} ${x + 60},${y + 26}`, stroke: COL.heat, 'stroke-width': 3, fill: 'none', opacity: 0.6 }),
    ]),
    ...panel(1, 'A narrow sea', 'The Red Sea', (x, y) => [
      sea(x, y, 44, 80),
      block([[x, y - 8], [x + 44, y - 8], [x + 50, y + 16], [x + 50, y + 24], [x, y + 24]], C),
      block([[x + 80, y - 8], [x + PW, y - 8], [x + PW, y + 24], [x + 74, y + 24], [x + 74, y + 16]], C),
      block([[x + 50, y + 16], [x + 74, y + 16], [x + 74, y + 22], [x + 50, y + 22]], OC),
      svg('path', { d: `M${x + 62},${y + 14}v-4`, stroke: COL.heat, 'stroke-width': 2 }),
    ]),
    ...panel(2, 'A wide ocean', 'The Atlantic', (x, y) => [
      sea(x, y, 18, PW - 18),
      block([[x, y - 8], [x + 18, y - 8], [x + 24, y + 16], [x + 24, y + 24], [x, y + 24]], C),
      block([[x + PW - 18, y - 8], [x + PW, y - 8], [x + PW, y + 24], [x + PW - 24, y + 24], [x + PW - 24, y + 16]], C),
      block([[x + 24, y + 16], [x + 58, y + 10], [x + 62, y + 8], [x + 66, y + 10], [x + PW - 24, y + 16], [x + PW - 24, y + 22], [x + 24, y + 22]], OC),
      svg('path', { d: `M${x + 50},${y + 30}h-14m0,0l4,-3m-4,3l4,3M${x + 74},${y + 30}h14m0,0l-4,-3m4,3l-4,3`, stroke: COL.ink, 'stroke-width': 1, fill: 'none' }),
    ]),
    ...panel(3, 'Old floor sinks', 'The Andes, the Pacific rim', (x, y) => [
      sea(x, y, 0, 86),
      block([[x + 86, y - 8], [x + PW, y - 8], [x + PW, y + 24], [x + 84, y + 24], [x + 80, y + 14]], C),
      block([[x, y + 16], [x + 78, y + 16], [x + 110, y + 60], [x + 102, y + 64], [x + 74, y + 22], [x, y + 22]], OC),
      svg('path', { d: `M${x + 95},${y - 8}l5,-9l5,9z`, fill: COL.heat }),
      small(x + 72, y + 12, 'trench', { anchor: 'end', soft: true }),
    ]),
    ...panel(4, 'The ocean closes', 'The Mediterranean', (x, y) => [
      sea(x, y, 34, 86),
      block([[x, y - 8], [x + 34, y - 8], [x + 40, y + 16], [x + 40, y + 24], [x, y + 24]], C),
      block([[x + 86, y - 8], [x + PW, y - 8], [x + PW, y + 24], [x + 84, y + 24], [x + 80, y + 14]], C),
      block([[x + 40, y + 16], [x + 78, y + 16], [x + 100, y + 56], [x + 92, y + 60], [x + 74, y + 22], [x + 40, y + 22]], OC),
      svg('path', { d: `M${x + 22},${y + 32}h12m0,0l-4,-3m4,3l-4,3`, stroke: COL.ink, 'stroke-width': 1, fill: 'none' }),
    ]),
    ...panel(5, 'Continents collide', 'The Himalaya', (x, y) => [
      block([[x, y - 8], [x + 44, y - 8], [x + 52, y - 26], [x + 62, y - 34], [x + 72, y - 24], [x + 82, y - 12], [x + PW, y - 10], [x + PW, y + 34], [x + 60, y + 40], [x, y + 24]], C),
      svg('path', { d: `M${x + 50},${y - 18}C${x + 56},${y} ${x + 60},${y + 20} ${x + 62},${y + 38}`, stroke: COL.ink, 'stroke-width': 1.2, 'stroke-dasharray': '3 2', fill: 'none' }),
      small(x + 66, y + 16, 'suture', { soft: true }),
      block([[x + 70, y + 40], [x + 96, y + 44], [x + 98, y + 60], [x + 92, y + 62]], OC),
    ]),
  );
  s.setAttribute('aria-label', 'The Wilson cycle in six cross-sections. 1: a continent stretches and cracks along a rift valley, as in East Africa today. 2: the sea floods in and a narrow strip of new ocean floor forms, as in the Red Sea. 3: the ocean widens, with a spreading ridge in the middle and continents on either side, as in the Atlantic. 4: the old, cold ocean floor at one edge sinks down a trench under the continent, as along the Andes. 5: the ocean narrows as it is swallowed, as in the Mediterranean. 6: the continents collide, the ocean is gone, and a mountain range rises over the join, or suture, as in the Himalaya.');
  return { node };
};

// ---- Fast ridges raise the sea ---------------------------------------------------------------------

/** Depth of ocean floor of a given age, m (Stein and Stein 1992, GDH1). */
const depthAt = (age: number) => (age < 20 ? 2600 + 365 * Math.sqrt(age) : 5651 - 2473 * Math.exp(-0.0278 * age));
/** Distance from the ridge to the far edge of the ocean floor, km. */
const BASIN = 3000;
const meanDepth = (cmYr: number) => {
  const T = BASIN / (10 * cmYr);
  let s = 0;
  for (let i = 0; i < 200; i++) s += depthAt((T * (i + 0.5)) / 200);
  return s / 200;
};
const TODAY_RATE = 3;
/** Sea level against today's, m: the water the shallower floor pushes out, less the floor's sinking under the extra water's weight. */
export const seaRise = (cmYr: number) => 0.7 * (meanDepth(TODAY_RATE) - meanDepth(cmYr));
const CRETACEOUS = 200;

export const seaLevelFigure = figure(['flooded'], (_ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let rate = TODAY_RATE;
  // Left: the ocean floor from the ridge out, depth to 6.5 km. Right: the continent's edge, heights to 600 m.
  const ox0 = 8;
  const ox1 = 190;
  const oy0 = 40;
  const oy = (m: number) => oy0 + (m / 6500) * 150;
  const cx0 = 212;
  const cx1 = W - 8;
  const cy = (m: number) => 150 - (m / 600) * 100;
  /** The continent's height, m, from its coast (0) inland (1). */
  const ground = (k: number) => -60 + 560 * k ** 1.15;
  const paint = () => {
    const rise = seaRise(rate);
    const T = BASIN / (10 * rate);
    const floor = (cm: number) => {
      const TT = BASIN / (10 * cm);
      let d = '';
      for (let i = 0; i <= 60; i++) {
        const x = (i / 60) * BASIN;
        d += `${i ? 'L' : 'M'}${(ox0 + (x / BASIN) * (ox1 - ox0)).toFixed(1)},${oy(depthAt((x / BASIN) * TT)).toFixed(1)}`;
      }
      return d;
    };
    let land = `M${cx0},${cy(-150)}`;
    for (let i = 0; i <= 50; i++) land += `L${(cx0 + (i / 50) * (cx1 - cx0)).toFixed(1)},${cy(ground(i / 50)).toFixed(1)}`;
    land += `L${cx1},${H - 30}L${cx0},${H - 30}Z`;
    // Where the shore stands now.
    let k = 0;
    while (k < 1 && ground(k) < rise) k += 0.002;
    const shoreX = cx0 + k * (cx1 - cx0);
    let kc = 0;
    while (kc < 1 && ground(kc) < CRETACEOUS) kc += 0.002;
    const cretX = cx0 + kc * (cx1 - cx0);
    const flooded = Math.round((k * 2000) / 50) * 50;
    const match = Math.abs(rise - CRETACEOUS) <= 25;
    redraw(g,
      small(ox0, 14, 'Ocean floor, ridge to far edge', { bold: true }),
      small(ox0, 26, `3,000 km wide, down to 6.5 km deep`, { soft: true }),
      svg('rect', { x: ox0, y: oy(0) - 1, width: ox1 - ox0, height: oy(6500) - oy(0), fill: SEA }),
      svg('path', { d: `${floor(rate)}L${ox1},${oy(6500)}L${ox0},${oy(6500)}Z`, fill: '#4a4a5a' }),
      svg('path', { d: floor(TODAY_RATE), fill: 'none', stroke: '#fff', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
      small(ox0 + 4, oy(6500) - 6, `oldest floor ${Math.round(T)} Myr`, { fill: '#fff' }),
      small(ox1 - 4, oy(2600) - 4, 'dashed: today’s rate', { anchor: 'end', soft: true }),
      small(ox0 + 2, oy(2600) - 4, 'ridge', { soft: true }),
      // The continent, zoomed.
      small(cx0, 14, 'The continent’s edge, heights × 10', { bold: true }),
      small(cx0, 26, '2,000 km inland', { soft: true }),
      svg('rect', { x: cx0, y: cy(rise), width: cx1 - cx0, height: H - 30 - cy(rise), fill: SEA }),
      svg('path', { d: land, fill: LAND_FILL }),
      svg('line', { x1: cx0, y1: cy(0), x2: cx1, y2: cy(0), stroke: COL.soft, 'stroke-width': 0.8, 'stroke-dasharray': '3 3' }),
      small(cx1, cy(0) + 12, 'today’s sea level', { anchor: 'end', soft: true }),
      svg('line', { x1: cretX, y1: cy(CRETACEOUS) - 14, x2: cretX, y2: cy(CRETACEOUS) + 4, stroke: COL.fossil, 'stroke-width': 1.5 }),
      small(cretX, cy(CRETACEOUS) - 18, 'Cretaceous shore', { anchor: 'middle', bold: true, fill: COL.fossil }),
      svg('line', { x1: cx0, y1: cy(rise), x2: shoreX, y2: cy(rise), stroke: COL.water, 'stroke-width': 1.5 }),
      label(cx0 + 4, H - 10, `Sea level ${rise >= 0 ? '+' : '−'}${Math.abs(Math.round(rise / 5) * 5)} m`, { bold: true, fill: COL.water }),
    );
    f.readout.textContent = match
      ? `At ${rate} cm a year the young, swollen floor makes the ocean basin ${Math.round(meanDepth(TODAY_RATE) - meanDepth(rate))} m shallower on average, and the sea rises about ${Math.round(rise / 10) * 10} m, flooding the continent ${flooded} km inland to the Cretaceous shoreline.`
      : `Ridges spreading ${rate} cm a year: the oldest floor is ${Math.round(T)} million years old when it reaches the far edge, and the basin is ${Math.abs(Math.round(meanDepth(TODAY_RATE) - meanDepth(rate)))} m ${rate >= TODAY_RATE ? 'shallower' : 'deeper'} on average than at today’s ${TODAY_RATE} cm. ${rise > 10 ? `The sea spills ${flooded} km inland.` : rise < -10 ? 'The sea draws back off the shelf.' : ''}`;
    if (match && t.goal === 'flooded') t.done();
  };
  const s = slider('Spreading rate', 1, 8, 0.5, TODAY_RATE, (v) => `${v} cm a year`, (v) => { rate = v; paint(); }, 'heat');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Suppose the ridges spread faster, with no change in the amount of water in the sea. What happens to sea level on the continents?',
    options: ['It rises', 'It falls', 'It stays the same'],
    answer: 0, sliders: [s],
    after: () => paint(),
  });
  return f.node;
});
