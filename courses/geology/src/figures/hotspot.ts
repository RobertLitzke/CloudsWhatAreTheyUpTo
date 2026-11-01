// Lesson 12, Islands that get older in a line: the Pacific plate carried over
// a fixed plume at a speed the reader sets, against the dated volcanoes of the
// Hawaiian-Emperor chain.

import { el, svg } from 'didactics/dom';
import { label, line, redraw, small, type P } from 'didactics/draw';
import { cellSize, fromCell, hillshade, loadRelief, mapLabels, mapView, reliefFor, type Relief } from 'didactics/maps';
import { asset } from '../asset';
import { COL, figure, frame, guessFirst, player, slider } from './kit';

const W = 400;

interface Volcano {
  name: string;
  lon: number;
  lat: number;
  /** Age of the main shield, million years (potassium-argon and argon-argon dates, rounded). */
  age: number;
}

// After Clague and Dalrymple (1987) and later dates; ages rounded.
export const CHAIN: Volcano[] = [
  { name: 'Kīlauea', lon: -155.29, lat: 19.41, age: 0 },
  { name: 'West Maui', lon: -156.6, lat: 20.88, age: 1.3 },
  { name: 'East Molokaʻi', lon: -156.9, lat: 21.1, age: 1.8 },
  { name: 'Koʻolau, Oʻahu', lon: -157.75, lat: 21.4, age: 2.6 },
  { name: 'Waiʻanae, Oʻahu', lon: -158.15, lat: 21.5, age: 3.7 },
  { name: 'Kauaʻi', lon: -159.5, lat: 22.07, age: 5.1 },
  { name: 'Nihoa', lon: -161.92, lat: 23.06, age: 7.2 },
  { name: 'Necker', lon: -164.7, lat: 23.58, age: 10.3 },
  { name: 'La Pérouse', lon: -166.2, lat: 23.75, age: 12 },
  { name: 'Midway', lon: -177.37, lat: 28.2, age: 27.7 },
  { name: 'Kōko', lon: 171.6, lat: 35.25, age: 48 },
  { name: 'Suiko', lon: 170.3, lat: 44.6, age: 61 },
  { name: 'Detroit', lon: 167.7, lat: 51.0, age: 79 },
];

/** Kilometres east and north of Kīlauea, on a flat sheet (good enough for a sketch). */
function kmXY(lon: number, lat: number): P {
  const l = lon > 0 ? lon - 360 : lon;
  return [(l - CHAIN[0].lon) * 111.2 * Math.cos((32 * Math.PI) / 180), (lat - CHAIN[0].lat) * 111.2];
}
const distance = (v: Volcano) => Math.hypot(...kmXY(v.lon, v.lat));

/** The bend, million years ago, and the plate's direction of travel before and after it (degrees clockwise from north). */
const BEND = 47;
const AFTER_BEND = 292; // toward the west-northwest: the Hawaiian chain
const BEFORE_BEND = 345; // toward the north-northwest: the Emperor chain

/** Where a volcano made `age` million years ago now lies, for a plate moving `cm` a year. */
function modelAt(age: number, cm: number): P {
  const kmPerMyr = cm * 10;
  const leg = (az: number, km: number): P => [Math.sin((az * Math.PI) / 180) * km, Math.cos((az * Math.PI) / 180) * km];
  if (age <= BEND) return leg(AFTER_BEND, kmPerMyr * age);
  const [x, y] = leg(AFTER_BEND, kmPerMyr * BEND);
  const [x2, y2] = leg(BEFORE_BEND, kmPerMyr * (age - BEND));
  return [x + x2, y + y2];
}

export const plumeFigure = figure(['speed'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let cm = 3;
  // Plan view: Kīlauea at the bottom right; 1 px = 20 km.
  const MX = (x: number) => 372 + x / 20;
  const MY = (y: number) => 205 - y / 20;
  // The age-distance plot along the Hawaiian chain.
  const PX = (km: number) => 34 + (km / 2600) * 150;
  const PY = (age: number) => 236 - (age / 30) * 90;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: 250, fill: '#dfeaf0' })];
    // The plume, fixed.
    parts.push(svg('circle', { cx: MX(0), cy: MY(0), r: 9, fill: COL.heat, opacity: 0.35 }), small(MX(0) - 10, MY(0) - 10, 'plume', { anchor: 'middle', fill: COL.heat, bold: true }));
    // The model: a volcano every 2 million years, carried off by the plate.
    const track: P[] = [];
    for (let a = 0; a <= 80; a += 2) track.push(modelAt(a, cm));
    parts.push(svg('polyline', { points: track.map(([x, y]) => `${MX(x)},${MY(y)}`).join(' '), fill: 'none', stroke: COL.heat, 'stroke-width': 1, opacity: 0.5 }));
    for (const [x, y] of track) parts.push(svg('circle', { cx: MX(x), cy: MY(y), r: 2.2, fill: COL.heat }));
    // The real volcanoes.
    for (const v of CHAIN) {
      const [x, y] = kmXY(v.lon, v.lat);
      parts.push(svg('circle', { cx: MX(x), cy: MY(y), r: 3.5, fill: 'none', stroke: COL.ink, 'stroke-width': 1.3 }));
      if (['Kīlauea', 'Midway', 'Kōko', 'Detroit'].includes(v.name)) {
        const k = v.name === 'Kīlauea';
        parts.push(small(MX(x) + (k ? 0 : 6), MY(y) + (k ? 30 : 3), `${v.name}, ${v.age} Myr`, { bold: true, anchor: k ? 'end' : undefined, halo: '#dfeaf0' }));
      }
    }
    // Age against distance, Hawaiian chain only.
    parts.push(
      svg('rect', { x: PX(0), y: PY(30), width: PX(2600) - PX(0), height: PY(0) - PY(30), fill: COL.paper, opacity: 0.85 }),
      line(PX(0), PY(0), PX(2600), PY(0), COL.ink, 0.8), line(PX(0), PY(0), PX(0), PY(30), COL.ink, 0.8),
      small(PX(2600), PY(0) - 3, 'km from Kīlauea', { anchor: 'end', soft: true }),
      small(PX(0) + 5, PY(30) + 9, 'age, million years', { soft: true }),
      small(PX(0) - 3, PY(30) + 3, '30', { anchor: 'end', soft: true }),
      small(PX(0) - 3, PY(0) + 3, '0', { anchor: 'end', soft: true }),
    );
    for (const v of CHAIN.filter((c) => c.age < 30)) parts.push(svg('circle', { cx: PX(distance(v)), cy: PY(v.age), r: 2.6, fill: 'none', stroke: COL.ink, 'stroke-width': 1.2 }));
    const endKm = Math.min(2600, cm * 10 * 30);
    parts.push(line(PX(0), PY(0), PX(endKm), PY(endKm / (cm * 10)), COL.heat, 1.8));
    parts.push(label(PX(2600) - 4, PY(30) + 22, `${cm.toFixed(1)} cm a year`, { size: 'note', anchor: 'end', bold: true, fill: COL.heat }));
    redraw(g, ...parts);
    const kauai = distance(CHAIN[5]);
    const ok = cm >= 8 && cm <= 10.5;
    f.readout.textContent = `At ${cm.toFixed(1)} cm a year, a volcano built over the plume is carried ${Math.round(cm * 10)} km in a million years; Kauaʻi, ${Math.round(kauai / 10) * 10} km away, would be ${(kauai / (cm * 10)).toFixed(1)} million years old (measured: 5.1). ${ok ? 'The model now runs through the dated islands as far as Midway, and with the turn 47 million years ago, on up the Emperor chain.' : cm < 8 ? 'Too slow: the model’s islands are too old for their distance.' : 'Too fast: the model’s islands are too young for their distance.'}`;
    if (ok && t.goal === 'speed') t.done();
  };
  const sp = slider('Plate speed', 1, 20, 0.1, cm, (v) => `${v.toFixed(1)} cm a year`, (v) => { cm = v; paint(); }, 'heat');
  f.controls.append(sp.node);
  paint();
  guessFirst(t, f, {
    ask: 'Kauaʻi is about 520 km from Kīlauea and about 5 million years old. How fast must the Pacific plate be moving? Guess first.',
    options: ['About 1 mm a year', 'About 10 cm a year', 'About 10 m a year'],
    answer: 1, reveal: 'done',
    sliders: [sp],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['about 1 mm a year', 'about 10 cm a year', 'about 10 m a year'][guess]}. Set the plate’s speed so the model’s volcanoes (red dots) land on the real ones (circles).`;
    },
  });
  return f.node;
});

// ---- The islands carried off the plume, played on the map ---------------------------------

/** The shield volcanoes on the map, with rounded ages of their main shield stage, million years. */
const SHIELDS: { name: string; lon: number; lat: number; age: number }[] = [
  { name: 'Kauaʻi', lon: -159.5, lat: 22.07, age: 5.1 },
  { name: 'Niʻihau', lon: -160.15, lat: 21.9, age: 4.9 },
  { name: 'Waiʻanae', lon: -158.15, lat: 21.5, age: 3.7 },
  { name: 'Koʻolau', lon: -157.75, lat: 21.4, age: 2.6 },
  { name: 'West Molokaʻi', lon: -157.2, lat: 21.15, age: 1.9 },
  { name: 'East Molokaʻi', lon: -156.9, lat: 21.1, age: 1.8 },
  { name: 'Lānaʻi', lon: -156.93, lat: 20.83, age: 1.3 },
  { name: 'West Maui', lon: -156.6, lat: 20.88, age: 1.3 },
  { name: 'Kahoʻolawe', lon: -156.6, lat: 20.55, age: 1.1 },
  { name: 'Haleakalā', lon: -156.25, lat: 20.71, age: 0.9 },
  { name: 'Kohala', lon: -155.73, lat: 20.08, age: 0.45 },
  { name: 'Mauna Kea', lon: -155.47, lat: 19.82, age: 0.25 },
  { name: 'Hualālai', lon: -155.87, lat: 19.69, age: 0.13 },
  { name: 'Mauna Loa', lon: -155.6, lat: 19.47, age: 0.1 },
  { name: 'Kīlauea', lon: -155.29, lat: 19.41, age: 0 },
];
/**
 * The plate's motion over the plume, km per million years east and north:
 * the direction of the straight-line fit to the shields' ages and places,
 * at the speed that carries Kauaʻi to where it is in its 5.1 million years
 * (the young shields on Hawaiʻi alone would make it faster).
 */
export const PLATE_VEL: P = (() => {
  const k = SHIELDS[SHIELDS.length - 1];
  const kx = 111.32 * Math.cos((20.5 * Math.PI) / 180);
  let ae = 0;
  let an = 0;
  let aa = 0;
  for (const v of SHIELDS) {
    ae += v.age * (v.lon - k.lon) * kx;
    an += v.age * (v.lat - k.lat) * 110.6;
    aa += v.age * v.age;
  }
  const n = Math.hypot(ae, an);
  const kauai = Math.hypot((SHIELDS[0].lon - k.lon) * kx, (SHIELDS[0].lat - k.lat) * 110.6) / SHIELDS[0].age;
  return [(ae / n) * kauai, (an / n) * kauai];
})();
/** The same, cm a year. */
const PLATE_CM = Math.round(Math.hypot(...PLATE_VEL)) / 10;
/** The deep-ocean floor around the chain, m. */
const ABYSS = -4600;
/** How far a volcano has sunk since it was built, m, by its age in million years: fast at first, then slower. */
export const sunk = (age: number) => 1500 * (1 - Math.exp(-Math.max(0, age) / 1.5));
/** How long a volcano takes to grow from the sea floor to its full height, million years. */
const GROW = 0.6;

/** An arrow showing the plate's travel, centred at (x, y), with its speed. */
function arrowAlong(x: number, y: number): SVGElement[] {
  const n = Math.hypot(...PLATE_VEL);
  const ux = PLATE_VEL[0] / n;
  const uy = -PLATE_VEL[1] / n;
  const L = 34;
  const [x0, y0, x1, y1] = [x - ux * L, y - uy * L, x + ux * L, y + uy * L];
  const hx = (a: number) => x1 - 9 * (ux * Math.cos(a) - uy * Math.sin(a));
  const hy = (a: number) => y1 - 9 * (uy * Math.cos(a) + ux * Math.sin(a));
  return [
    svg('path', { d: `M${x0},${y0} L${x1},${y1} M${hx(0.5)},${hy(0.5)} L${x1},${y1} L${hx(-0.5)},${hy(-0.5)}`, fill: 'none', stroke: COL.ink, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    small(x, y + 40, `Pacific plate, ${PLATE_CM} cm a year`, { anchor: 'middle', bold: true }),
  ];
}

export const driftMapFigure = figure(['played'], (ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 3 });
  const START = 5.5;
  let pos = 0;
  let base: Relief | null = null;
  let live: Relief | null = null;
  let owner: Int16Array | null = null;
  let weight: Float32Array | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let painted = -1;
  const marks = svg('g');
  const paint = () => {
    const ma = START - pos / 100;
    if (pos >= START * 100 && t.goal === 'played') t.done();
    const over = SHIELDS.filter((v) => v.age >= ma - 0.15).sort((a, b) => a.age - b.age)[0];
    const away = Math.round(Math.hypot(...PLATE_VEL) * ma);
    f.readout.textContent = ma < 0.05
      ? 'Today. Kīlauea sits over the plume. Every older volcano has been carried west-northwest, and the farther it has gone, the lower it has sunk: Kauaʻi, 5 million years old and about 500 km away, has sunk about 1,500 m and been worn down too.'
      : `${ma.toFixed(1)} million years ago, with today’s islands ${away} km back toward the plume. ${over ? `Growing over the plume: ${over.name}.` : 'Kauaʻi is still to come.'} The plate carries each volcano off the plume at about ${PLATE_CM} cm a year; cut off from its magma, it stops growing and starts to sink.`;
    if (!base || !live || !owner || !weight || !view) return;
    const key = Math.round(ma * 50);
    if (key === painted) return;
    painted = key;
    // The plate as it lay `ma` million years ago: everything moved back toward the plume (east-southeast),
    // the volcanoes younger than that not yet built, and the older ones not yet sunk so far.
    const cell = cellSize(base) / 1000;
    const dx = (-PLATE_VEL[0] * ma) / cell;
    const dy = (PLATE_VEL[1] * ma) / cell;
    const { width: w, height: h, z } = base;
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const sc = Math.round(col - dx);
        const sr = Math.round(row - dy);
        let v = ABYSS;
        if (sc >= 0 && sc < w && sr >= 0 && sr < h) {
          const j = sr * w + sc;
          v = z[j];
          if (owner[j * 3] >= 0) {
            let lift = 0;
            let grown = 0;
            for (let k = 0; k < 3; k++) {
              const o = owner[j * 3 + k];
              if (o < 0) continue;
              const a = SHIELDS[o].age;
              const then = a - ma;
              const wk = weight[j * 3 + k];
              lift += wk * (sunk(a) - sunk(then));
              grown += wk * Math.max(0, Math.min(1, then / GROW + 1));
            }
            v = ABYSS + (v + lift - ABYSS) * grown;
          }
        }
        live.z[row * w + col] = v;
      }
    }
    view.paint({ shade: hillshade(live, undefined, 3), water: 0, relief: 0.8 });
    const [px, py] = view.xy(SHIELDS[SHIELDS.length - 1].lon, SHIELDS[SHIELDS.length - 1].lat);
    redraw(marks,
      svg('circle', { cx: px, cy: py, r: 30, fill: COL.heat, opacity: 0.18 }),
      svg('circle', { cx: px, cy: py, r: 8, fill: COL.heat, opacity: 0.4 }),
      ...mapLabels(view, [{ lon: -155.0, lat: 19.0, text: 'plume', area: true, color: COL.heat }]),
      ...arrowAlong(70, view.h - 56),
    );
  };
  const ts = slider('Time', 0, START * 100, 1, 0, (v) => (v >= START * 100 ? 'today' : `${(START - v / 100).toFixed(1)} million years ago`), (v) => { pos = v; paint(); }, 'heat');
  f.controls.append(player(ts, ctx, { seconds: 18 }).node, ts.node);
  paint();
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), 'maps/hawaii').then((r) => {
      base = r;
      live = { ...r, z: new Float32Array(r.z.length) };
      // Each cell standing above the deep floor belongs to its three nearest shield volcanoes, the nearest
      // counting most, so the join between two volcanoes of different ages is a slope, not a cliff.
      owner = new Int16Array(r.z.length * 3).fill(-1);
      weight = new Float32Array(r.z.length * 3);
      const kx = 111.32 * Math.cos((20.5 * Math.PI) / 180);
      for (let row = 0; row < r.height; row++) {
        for (let col = 0; col < r.width; col++) {
          const i = row * r.width + col;
          if (r.z[i] < -3800) continue;
          const [lon, lat] = fromCell(r, col, row);
          const near = SHIELDS.map((v, k) => ({ k, d: Math.hypot((lon - v.lon) * kx, (lat - v.lat) * 110.6) })).sort((a, b) => a.d - b.d).slice(0, 3);
          if (near[0].d > 140) continue;
          const ws = near.map((n) => Math.exp(-(((n.d - near[0].d) / 12) ** 2)));
          const sum = ws.reduce((a, b) => a + b, 0);
          near.forEach((n, m) => { owner![i * 3 + m] = n.k; weight![i * 3 + m] = ws[m] / sum; });
        }
      }
      view = mapView(live, { alt: 'A shaded relief map of the main Hawaiian Islands, played over the last 5.5 million years: the islands rise one after another over the plume at the southeast and are carried northwest, sinking as they go.' });
      view.svg.append(marks);
      holder.replaceChildren(view.node, el('p.map-credit', {}, `Heights: ${r.meta.credit}. Past heights simplified: each volcano grows over the plume, then sinks; wear by rain and waves is left out.`));
      painted = -1;
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});
