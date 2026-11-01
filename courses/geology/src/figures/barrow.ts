// Lesson 5, Garnets in the mud: buried mud is heated and squeezed into new
// minerals, in zones that map how deep and hot the rock once was.

import { svg } from 'didactics/dom';
import { arrow, label, line, polyline, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, player, slider } from './kit';

const W = 400;

// ---- Burial: depth, heat and the minerals that grow -----------------------------------

interface Zone {
  name: string;
  /** Lowest temperature, °C, along a Barrow-type path. */
  from: number;
  color: string;
  rock: string;
  says: string;
}

// The zones Barrow mapped, by the temperature each mineral first grows at (rough, at middle depths).
const ZONES: Zone[] = [
  { name: 'mud and shale', from: -Infinity, color: '#d8cdb8', rock: 'Shale', says: 'still the clay minerals it was laid down with' },
  { name: 'chlorite', from: 300, color: '#b9d1a3', rock: 'Slate', says: 'clay turns to tiny flakes of green chlorite and white mica' },
  { name: 'biotite', from: 420, color: '#9bb98a', rock: 'Phyllite', says: 'black mica (biotite) grows, and the flakes give a silky sheen' },
  { name: 'garnet', from: 480, color: '#d9a0a0', rock: 'Schist', says: 'red garnets grow, the size of peas, in a glittering schist' },
  { name: 'staurolite', from: 550, color: '#d3b07a', rock: 'Schist', says: 'brown staurolite crystals join the garnets' },
  { name: 'kyanite', from: 600, color: '#9fb6d8', rock: 'Schist', says: 'blue blades of kyanite grow' },
  { name: 'sillimanite', from: 660, color: '#c2a6cf', rock: 'Gneiss', says: 'kyanite gives way to needles of sillimanite, and the minerals sort into light and dark bands' },
];

/** Where kyanite, andalusite and sillimanite meet: about 500 °C at about 14 km down. */
const TRIPLE = { t: 500, km: 14 };

const T0 = 15;
const TX = (t: number) => 46 + (t / 800) * 340;
const KY = (km: number) => 26 + (km / 40) * 180;

function zoneAt(t: number, km: number): { zone: Zone; note?: string } {
  const z = [...ZONES].reverse().find((zz) => t >= zz.from) ?? ZONES[0];
  if (km > 15 && t / km < 10 && t >= 200) return { zone: { name: 'blueschist', from: 0, color: '#6f8fb3', rock: 'Blueschist', says: 'deep but cold, so blue minerals grow that need high pressure: this happens where one plate dives under another' } };
  if (t > 700) return { zone: z, note: 'Hot enough for the rock to start melting. Granite can form from the melt.' };
  // Shallow and hot: andalusite in place of kyanite.
  if (z.name === 'kyanite' && km < TRIPLE.km) return { zone: { name: 'andalusite', from: 600, color: '#c9c09a', rock: 'Hornfels or schist', says: 'shallow and hot, so andalusite grows in place of kyanite, as next to a body of granite' } };
  return { zone: z };
}

export const burialFigure = figure(['garnet'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let depth = 5;
  let grad = 25;
  const fields = () => {
    // The zones as vertical bands, by temperature; the low-pressure and the cold, deep corners marked.
    const out: SVGElement[] = [];
    ZONES.forEach((z, i) => {
      const a = Math.max(0, z.from === -Infinity ? 0 : z.from);
      const b = i + 1 < ZONES.length ? ZONES[i + 1].from : 800;
      out.push(svg('rect', { x: TX(a), y: KY(0), width: TX(b) - TX(a), height: KY(40) - KY(0), fill: z.color, opacity: 0.55 }));
      if (i > 0) {
        const x = (TX(a) + TX(b)) / 2 + 3;
        const y = KY(z.name === 'kyanite' ? TRIPLE.km + 2 : 2);
        const tx = small(x, y, z.name, { soft: true });
        tx.setAttribute('transform', `rotate(90 ${x} ${y})`);
        out.push(tx);
      }
    });
    out.push(svg('rect', { x: TX(600), y: KY(0), width: TX(660) - TX(600), height: KY(TRIPLE.km) - KY(0), fill: '#c9c09a', opacity: 0.8 }));
    const ax = TX(630) + 3;
    const an = small(ax, KY(2), 'andalusite', { soft: true });
    an.setAttribute('transform', `rotate(90 ${ax} ${KY(2)})`);
    out.push(an);
    out.push(svg('rect', { x: TX(700), y: KY(0), width: TX(800) - TX(700), height: KY(40) - KY(0), fill: COL.heat, opacity: 0.18 }));
    out.push(small(TX(750), KY(37), 'melting', { anchor: 'middle', fill: COL.heat }));
    // Cold and deep: below the 10 °C per km line.
    out.push(svg('polygon', { points: `${TX(200)},${KY(20)} ${TX(400)},${KY(40)} ${TX(200)},${KY(40)}`, fill: '#6f8fb3', opacity: 0.5 }));
    out.push(small(TX(235), KY(34), 'blueschist', { fill: '#2d4e75' }));
    return out;
  };
  const axes = () => [
    line(TX(0), KY(0), TX(800), KY(0), COL.ink, 1),
    line(TX(0), KY(0), TX(0), KY(40), COL.ink, 1),
    ...[0, 200, 400, 600, 800].map((tt) => small(TX(tt), KY(0) - 5, `${tt}°`, { anchor: 'middle', soft: true })),
    ...[0, 10, 20, 30, 40].map((d) => small(TX(0) - 4, KY(d) + 3, `${d}`, { anchor: 'end', soft: true })),
    small(TX(0) - 4, KY(0) - 14, 'km down', { soft: true }),
    small(TX(800), KY(0) - 14, 'temperature', { soft: true, anchor: 'end' }),
  ];
  const paint = () => {
    const temp = T0 + grad * depth;
    const { zone, note } = zoneAt(temp, depth);
    // The path the rock takes as it is buried: the geotherm.
    const maxKm = Math.min(40, (800 - T0) / grad);
    const path = line(TX(T0), KY(0), TX(T0 + grad * maxKm), KY(maxKm), COL.ink, 1.5, { 'stroke-dasharray': '4 3' });
    redraw(g,
      ...fields(),
      ...axes(),
      path,
      svg('circle', { cx: TX(Math.min(800, temp)), cy: KY(depth), r: 6, fill: COL.heat, stroke: COL.paper, 'stroke-width': 2 }),
      label(TX(Math.min(800, temp)) + (temp > 600 ? -10 : 10), KY(depth) + 4, zone.rock, { bold: true, anchor: temp > 600 ? 'end' : undefined }),
    );
    f.readout.textContent = `${depth} km down at ${Math.round(temp)} °C. ${zone.rock}: ${zone.says}.${note ? ` ${note}` : ''}`;
    if (zone.name === 'garnet' && t.goal === 'garnet') t.done();
  };
  const ds = slider('Depth', 0, 40, 1, depth, (v) => `${v} km`, (v) => { depth = v; paint(); }, 'old');
  const gs = slider('Warming with depth', 8, 60, 1, grad, (v) => `${v} °C per km`, (v) => { grad = v; paint(); }, 'heat');
  f.controls.append(ds.node, gs.node);
  paint();
  return f.node;
});

// ---- Squeeze: flakes line up and the rock splits along them ---------------------------

interface Flake {
  x: number;
  y: number;
  /** Starting angle, radians. */
  a: number;
  len: number;
}

const FLAKES: Flake[] = (() => {
  const rng = makeRng(5);
  return Array.from({ length: 150 }, () => ({ x: 88 + rng() * 224, y: 48 + rng() * 134, a: rng() * Math.PI, len: 0.6 + rng() * 0.8 }));
})();

export const squeezeFigure = figure(['cleavage'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let squeeze = 0;
  let heat = 0;
  const paint = () => {
    const s = squeeze / 100;
    const size = 4 + heat * 0.06;
    // Each flake turns toward lying across the squeeze (flat, angle 0) as it is pressed.
    const angle = (a: number) => {
      const flat = a > Math.PI / 2 ? Math.PI : 0;
      return a + (flat - a) * Math.min(1, s * 1.15);
    };
    const parts: SVGElement[] = [svg('rect', { x: 60, y: 30 + s * 14, width: 280, height: 170 - s * 28, fill: '#8d8579', rx: 3 })];
    for (const fl of FLAKES) {
      const a = angle(fl.a);
      const L = size * fl.len * (1 + s * 0.3);
      const y = 115 + (fl.y - 115) * (1 - s * 0.16);
      const dx = Math.cos(a) * L;
      const dy = Math.sin(a) * L;
      parts.push(line(fl.x - dx, y - dy, fl.x + dx, y + dy, heat > 50 ? '#e9e2cf' : '#d6d0c2', 1.3 + heat * 0.012));
    }
    if (s >= 0.7) for (let k = 0; k < 5; k++) parts.push(line(62, 60 + k * 26, 338, 60 + k * 26, COL.ink, 0.8, { 'stroke-dasharray': '3 4', opacity: 0.6 }));
    if (s > 0) {
      const w = 1.5 + s * 3;
      parts.push(arrow(200, 4, 200, 26 + s * 12, COL.pressure, w), arrow(200, 226, 200, 204 - s * 12, COL.pressure, w));
      parts.push(small(212, 18, 'squeeze', { fill: COL.pressure, bold: true }));
    }
    redraw(g, ...parts);
    const rock = heat < 25 ? 'slate' : heat < 60 ? 'phyllite' : 'schist';
    f.readout.textContent = s < 0.3
      ? 'Mud: the clay flakes lie every which way. Squeeze it from above and below.'
      : s < 0.7
        ? 'As the rock is squeezed, new flakes grow lying across the squeeze, and old ones turn to join them.'
        : `The flakes all lie flat across the squeeze, so the rock now splits easily along them (dashed lines). This is ${rock}: ${rock === 'slate' ? 'tiny flakes, so it splits into thin, smooth sheets for roofs' : rock === 'phyllite' ? 'flakes big enough to give a silky sheen' : 'flakes big enough to see, glittering on every split face'}.`;
    if (s >= 0.7 && t.goal === 'cleavage') t.done();
  };
  const ss = slider('Squeeze', 0, 100, 1, 0, (v) => (v < 30 ? 'none' : v < 70 ? 'some' : 'strong'), (v) => { squeeze = v; paint(); }, 'pressure');
  const hs = slider('Heat', 0, 100, 1, 0, (v) => (v < 25 ? 'warm' : v < 60 ? 'hot' : 'very hot'), (v) => { heat = v; paint(); }, 'heat');
  f.controls.append(ss.node, hs.node);
  paint();
  return f.node;
});

// ---- Roots: a range built by a collision, then worn down to its roots ---------------------

// A cross-section across the belt, true to scale (heights and depths in km),
// run as a timeline from 490 million years ago to today. Islands meet the
// continent, the edge thickens and pushes a root into the mantle, the buried
// mud is heated into Barrow's zones, and then weather and rivers wear the top
// away while the light crust floats up, so ever deeper rock reaches the surface.

/** Crust and mantle densities, g/cm³: unloading the top lifts the column by RHO_C / RHO_M of what was removed. */
const RHO_C = 2.8;
const RHO_M = 3.3;
const LIFT = RHO_C / RHO_M;
/** Normal crust, km thick; the range's height at its highest, km; how much rock is gone from its crest by today, km. */
const CRUST = 35;
const PEAK = 5;
const WORN = 27;
/** The marked rock: how deep below the highest surface it grew kyanite, km. */
const MARKED = 24;

/** Each zone's top as depth below the range's highest surface, km, at 25 °C per km: ZONES' temperatures over again. */
const ZONE_DEPTH = ZONES.slice(1).map((z) => (z.from - T0) / 25);
/** How thick the buried muds become in the middle of the belt, km. */
const MUD_DEEP = 30;

const RW = 400;
const RH = 290;
const KM = 2.6;
const ZY = (z: number) => 58 - z * KM;
const COLS = 100;
const XS = Array.from({ length: COLS + 1 }, (_, i) => i / COLS);
const RX = (x: number) => x * RW;

/** How much of the range stands over each place, 0 to 1: a bulge centred on the belt. */
const CORE = 0.6;
const belt = (x: number) => {
  const u = (x - CORE) / 0.33;
  return Math.abs(u) >= 1 ? 0 : Math.cos((Math.PI / 2) * u);
};

/** The timeline: slider positions 0 to 1000 to millions of years ago, slower where most happens. */
const STOPS: [number, number][] = [[0, 490], [150, 475], [350, 465], [450, 455], [850, 380], [1000, 0]];
function maOf(pos: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, t1] = STOPS[i];
    const [p0, t0] = STOPS[i - 1];
    if (pos <= p1) return t0 + ((pos - p0) / (p1 - p0)) * (t1 - t0);
  }
  return 0;
}

const smooth = (a: number) => a * a * (3 - 2 * a);
const clamp01 = (a: number) => Math.max(0, Math.min(1, a));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

interface Section {
  /** By column: the ground or seafloor, the base of the crust, the top and bottom of the muds, km above sea level. */
  top: number[];
  moho: number[];
  mudTop: number[];
  mudBot: number[];
  /** How far the islands have come, 0 to 1, and how far the squeeze has gone. */
  near: number;
  squeeze: number;
  /** How hot the buried muds have grown, 0 to 1 (zones fade in). */
  heat: number;
  /** Rock gone from the crest, km. */
  worn: number;
  /** Red sandstone on the lowland beside the range, km thick at its edge. */
  sand: number;
  /** The marked rock, km above sea level. */
  marked: number;
}

const MARGIN = 0.8;

/** The section before the collision: continent on the left, its muddy margin, then the sea and the islands coming. */
function before(near: number): Omit<Section, 'near' | 'squeeze' | 'heat' | 'worn' | 'sand' | 'marked'> {
  const arc = 1.06 - 0.2 * near;
  const top: number[] = [];
  const moho: number[] = [];
  const mudTop: number[] = [];
  const mudBot: number[] = [];
  for (const x of XS) {
    const ocean = smooth(clamp01((x - MARGIN) / 0.04));
    const lump = Math.max(0, 1 - ((x - arc) / 0.06) ** 2);
    top.push(mix(0, -4, ocean) + lump * 5.5);
    moho.push(mix(-CRUST, -11, ocean) - lump * 16);
    const mud = 3 * smooth(clamp01((x - 0.32) / 0.2)) * (1 - ocean);
    mudTop.push(0);
    mudBot.push(-mud);
  }
  return { top, moho, mudTop, mudBot };
}

/** The section at a moment, in millions of years ago. */
function sectionAt(ma: number): Section {
  const near = clamp01((490 - ma) / 15);
  const squeeze = smooth(clamp01((475 - ma) / 10));
  const heat = clamp01((468 - ma) / 12);
  const worn = ma >= 465 ? 0 : WORN * (1 - Math.exp(-(465 - ma) / 25));
  const sand = 1.6 * clamp01((425 - ma) / 30);
  const a = before(near);
  const top: number[] = [];
  const moho: number[] = [];
  const mudTop: number[] = [];
  const mudBot: number[] = [];
  XS.forEach((x, i) => {
    const b = belt(x);
    const e = worn * b;
    const high = PEAK * b;
    // At the height of the range: crust floating on the mantle (Airy), the muds stacked 30 km deep.
    const mTop = high - (1 - LIFT) * e;
    const mMoho = -CRUST - (RHO_C / (RHO_M - RHO_C)) * mTop;
    const muds = a.mudBot[i] < 0 || x > MARGIN ? MUD_DEEP * b : 0;
    top.push(mix(a.top[i], mTop, squeeze));
    moho.push(mix(a.moho[i], mMoho, squeeze));
    mudTop.push(mix(a.mudTop[i], Math.min(mTop, high + LIFT * e), squeeze));
    mudBot.push(mix(a.mudBot[i], Math.min(mTop, high - muds + LIFT * e), squeeze));
  });
  const c = Math.round(CORE * COLS);
  const markedThen = -1.5;
  const markedNow = Math.min(top[c], PEAK - MARKED + LIFT * worn);
  return { top, moho, mudTop, mudBot, near, squeeze, heat, worn, sand, marked: mix(markedThen, markedNow, squeeze) };
}

const area = (upper: number[], lower: number[], fill: string, extra: Record<string, string | number> = {}) =>
  svg('polygon', {
    points: [...XS.map((x, i) => `${RX(x).toFixed(1)},${ZY(upper[i]).toFixed(1)}`), ...XS.map((x, i) => `${RX(x).toFixed(1)},${ZY(lower[i]).toFixed(1)}`).reverse()].join(' '),
    fill,
    ...extra,
  });

const MANTLE = '#b98a6c';
const CRUST_FILL = '#cfc6b8';
const MUD = '#d8cdb8';
const SAND = '#b4553a';

function drawSection(s: Section): SVGElement[] {
  const parts: SVGElement[] = [];
  const floor = XS.map(() => -78);
  const sea = XS.map(() => 0);
  parts.push(area(s.moho, floor, MANTLE));
  parts.push(area(s.top, s.moho, CRUST_FILL));
  // Water wherever the crust lies below sea level.
  parts.push(area(sea, s.top.map((z) => Math.min(0, z)), COL.water, { opacity: 0.45 }));
  parts.push(area(s.mudTop, s.mudBot, MUD));
  // Barrow's zones, set by depth below the highest surface and carried up with the rock as it rises.
  if (s.heat > 0) {
    ZONES.slice(1).forEach((z, k) => {
      const d0 = ZONE_DEPTH[k];
      const d1 = k + 1 < ZONE_DEPTH.length ? ZONE_DEPTH[k + 1] : MUD_DEEP;
      const at = (d: number) => XS.map((x, i) => {
        const b = belt(x);
        const z0 = PEAK * b - Math.min(d, MUD_DEEP * b) + LIFT * s.worn * b;
        return Math.max(s.mudBot[i], Math.min(s.top[i], z0));
      });
      parts.push(area(at(d0), at(d1), z.color, { opacity: s.heat }));
    });
  }
  if (s.sand > 0) {
    const sandTop = XS.map((x, i) => s.top[i] + s.sand * smooth(clamp01((0.3 - x) / 0.12)));
    parts.push(area(sandTop, s.top, SAND));
  }
  parts.push(polyline(XS.map((x, i) => [RX(x), ZY(s.top[i])]), COL.ink, 1.2));
  parts.push(polyline(XS.map((x, i) => [RX(x), ZY(s.moho[i])]), COL.ink, 0.8, { opacity: 0.5 }));
  // Where the surface stood at its highest, once the wearing down has begun.
  if (s.worn > 0.5) parts.push(polyline(XS.map((x) => [RX(x), ZY(PEAK * belt(x))]), COL.ink, 1, { 'stroke-dasharray': '3 3', opacity: 0.6 }));
  return parts;
}

function labelsFor(s: Section): SVGElement[] {
  const out: SVGElement[] = [];
  const c = Math.round(CORE * COLS);
  out.push(small(8, ZY(-72), 'mantle', { soft: true }));
  out.push(small(8, ZY(-20), 'crust', { soft: true }));
  if (s.squeeze < 0.5) {
    out.push(small(RX(0.5), ZY(-3) + 12, 'mud and sand', { anchor: 'middle' }));
    out.push(small(Math.min(RW - 4, RX(1.06 - 0.2 * s.near) + 30), ZY(5.5) - 6, 'volcanic islands', { anchor: 'end', fill: COL.heat }));
    if (s.near < 1) out.push(arrow(RX(1.0 - 0.2 * s.near), ZY(-8), RX(0.92 - 0.2 * s.near), ZY(-8), COL.pressure, 2));
  }
  if (s.squeeze > 0.6) {
    out.push(small(RX(CORE) + 8, ZY(s.moho[c]) - 6, 'root', { bold: true }));
    if (s.worn > 0.5) out.push(small(RW - 4, ZY(PEAK * belt(0.88)) - 5, 'surface at its highest', { soft: true, anchor: 'end' }));
  }
  if (s.sand > 0.6) out.push(small(4, ZY(s.top[0]) - 6, 'red sandstone', { fill: SAND, bold: true }));
  // The marked rock.
  const y = ZY(s.marked);
  out.push(svg('circle', { cx: RX(CORE), cy: y, r: 4.5, fill: COL.heat, stroke: COL.paper, 'stroke-width': 1.5 }));
  out.push(small(RX(CORE) - 8, y + 3, 'this rock', { anchor: 'end', bold: true, halo: COL.paper }));
  return out;
}

/** What lies at the surface along the section, as a strip over it: the zones a walk across the belt would cross, as on Barrow's map. */
function surfaceStrip(s: Section): SVGElement[] {
  if (s.worn < 0.5) return [];
  const y = 20;
  const out: SVGElement[] = [small(4, y + 7, 'at the surface', { soft: true })];
  const w = RW / COLS;
  XS.forEach((x, i) => {
    if (i === COLS) return;
    const b = belt(x + 0.5 / COLS);
    const d = s.worn * b;
    let fill = CRUST_FILL;
    if (x < 0.3 && s.sand > 0.2) fill = SAND;
    else if (b > 0 && d < MUD_DEEP * b) {
      const k = ZONE_DEPTH.filter((z) => d >= z).length;
      fill = k === 0 ? MUD : ZONES[k].color;
    }
    if (RX(x) >= 70) out.push(svg('rect', { x: RX(x), y, width: w + 0.4, height: 9, fill }));
  });
  out.push(svg('rect', { x: 70, y, width: RW - 70, height: 9, fill: 'none', stroke: COL.ink, 'stroke-width': 0.6, opacity: 0.6 }));
  return out;
}

function legend(heat: number): SVGElement[] {
  if (heat <= 0) return [];
  return ZONES.slice(1).flatMap((z, k) => {
    const x = 6 + k * 65;
    const words = small(x + 13, 12.5, z.name, { soft: true });
    words.setAttribute('opacity', String(heat));
    return [svg('rect', { x, y: 5, width: 10, height: 8, fill: z.color, opacity: heat }), words];
  });
}

function timeline(ma: number): SVGElement[] {
  const y = RH - 18;
  const X = (pos: number) => 10 + (pos / 1000) * (RW - 20);
  const pos = (() => {
    for (let i = 1; i < STOPS.length; i++) {
      const [p1, t1] = STOPS[i];
      const [p0, t0] = STOPS[i - 1];
      if (ma >= t1) return p0 + ((t0 - ma) / (t0 - t1)) * (p1 - p0);
    }
    return 1000;
  })();
  const phases: [number, number, string, string][] = [[0, 150, 'islands come', COL.pressure], [150, 450, 'collision and heat', COL.heat], [450, 1000, 'wearing down', COL.soft]];
  return [
    ...phases.flatMap(([a, b, says, color]) => [
      svg('rect', { x: X(a) + 1, y: y - 3, width: X(b) - X(a) - 2, height: 6, rx: 3, fill: color, opacity: 0.35 }),
      small((X(a) + X(b)) / 2, y + 12, says, { anchor: 'middle', soft: true }),
    ]),
    svg('circle', { cx: X(pos), cy: y, r: 5, fill: COL.ink }),
  ];
}

function sayRoots(ma: number, s: Section): string {
  const when = ma < 0.5 ? 'Today' : `${Math.round(ma)} million years ago`;
  if (ma > 475) return `${when}. A chain of volcanic islands rides toward the edge of the continent on the ocean floor. Mud and sand lie on the continent's sunken margin.`;
  if (ma > 465) return `${when}. The islands jam against the continent. Its edge crumples and thickens, pushing the muds down into the crust and a root of light crust down into the mantle, as a loaded barge sinks deeper.`;
  if (s.worn < 2) return `${when}. The range stands about ${PEAK} km high on a root reaching ${Math.round(-s.moho[Math.round(CORE * COLS)])} km down. Buried 20 km and more, the mud warms and recrystallises into Barrow's zones: the deeper, the hotter.`;
  const c = Math.round(CORE * COLS);
  const high = s.top[c];
  const below = s.top[c] - s.marked;
  const rock = below < 0.3
    ? 'The marked rock, which grew kyanite 24 km down, is now at the surface.'
    : `The marked rock, which grew kyanite ${MARKED} km down, is ${below.toFixed(0)} km below the surface.`;
  if (ma < 0.5) return `Today. About ${Math.round(s.worn)} km of rock has gone from the crest, yet hills about ${high.toFixed(0)} km high remain, on a shallow root. Walking in from the edge you cross every zone in turn, as Barrow did. ${rock}`;
  return `${when}. Weather and rivers have taken ${Math.round(s.worn)} km off the crest, but the peaks are only ${(PEAK - high).toFixed(1)} km lower: as the load comes off, the light crust floats up and the root shrinks. ${rock}`;
}

export const rootsFigure = figure(['roots'], (ctx, t) => {
  const f = frame(RW, RH, 3);
  const g = svg('g');
  f.svg.append(g);
  let pos = 0;
  const paint = () => {
    const ma = maOf(pos);
    const s = sectionAt(ma);
    redraw(g, ...drawSection(s), ...labelsFor(s), ...legend(s.heat), ...surfaceStrip(s), ...timeline(ma));
    f.readout.textContent = sayRoots(ma, s);
    if (pos >= 1000 && t.goal === 'roots') t.done();
  };
  const ts = slider('Time', 0, 1000, 1, 0, (v) => (v >= 1000 ? 'today' : `${Math.round(maOf(v))} million years ago`), (v) => { pos = v; paint(); }, 'old');
  const play = player(ts, ctx, { seconds: 14 });
  f.controls.append(play.node, ts.node);
  paint();
  return f.node;
});
