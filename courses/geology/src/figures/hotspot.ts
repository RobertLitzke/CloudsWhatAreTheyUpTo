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

/** Kilometres east and north of Kīlauea on a sinusoidal sheet (east-west distances shrunk by the cosine of each point's own latitude). */
function kmXY(lon: number, lat: number): P {
  const l = lon > 0 ? lon - 360 : lon;
  return [(l - CHAIN[0].lon) * 111.2 * Math.cos((lat * Math.PI) / 180), (lat - CHAIN[0].lat) * 111.2];
}
/** Great-circle kilometres between two volcanoes. */
function gc(a: Volcano, b: Volcano): number {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
/** Each volcano's distance from Kīlauea, measured along the chain (round the bend, not across it). */
export const ALONG: number[] = CHAIN.reduce<number[]>((acc, v, i) => [...acc, i === 0 ? 0 : acc[i - 1] + gc(CHAIN[i - 1], v)], []);
const distance = (v: Volcano) => ALONG[CHAIN.indexOf(v)];

/** The point `km` along the chain from Kīlauea, on the sheet; past Detroit it carries on in the same direction. */
function alongChain(km: number): P {
  const pts = CHAIN.map((v) => kmXY(v.lon, v.lat));
  let i = 1;
  while (i < CHAIN.length - 1 && ALONG[i] < km) i++;
  const f = (km - ALONG[i - 1]) / (ALONG[i] - ALONG[i - 1]);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
}

/** The bend, million years ago. */
const BEND = 47;

export const plumeFigure = figure(['speed'], (_ctx, t) => {
  const H = 340;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'Top: the Hawaiian-Emperor chain seen from above, Kīlauea over the plume at the bottom right, the chain running west-northwest to Midway and then bending north to Detroit Seamount. Circles are dated volcanoes; red dots are where volcanoes of each age would be if the plate moved at the chosen speed, with a thin line joining each dated volcano to the red dot of its own age. Bottom: age against distance along the chain.');
  let cm = 3;
  const MAP_H = 214;
  // Plan view: Kīlauea at the bottom right; 1 px = 20 km.
  const MX = (x: number) => 372 + x / 20;
  const MY = (y: number) => 200 - y / 20;
  // Age against distance along the chain, in its own panel below.
  const MAX_KM = 6000;
  const MAX_AGE = 80;
  const PX = (km: number) => 40 + (km / MAX_KM) * 344;
  const PY = (age: number) => H - 26 - (age / MAX_AGE) * 82;
  const paint = () => {
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: MAP_H, fill: '#dfeaf0' }),
      svg('rect', { y: MAP_H, width: W, height: H - MAP_H, fill: COL.paper }),
      small(6, 14, 'Seen from above', { bold: true, soft: true }),
      line(6, MAP_H - 10, 6 + 1000 / 20, MAP_H - 10, COL.ink, 1.2),
      small(6, MAP_H - 14, '1,000 km', { soft: true }),
    ];
    // The plume, fixed.
    parts.push(svg('circle', { cx: MX(0), cy: MY(0), r: 9, fill: COL.heat, opacity: 0.3 }));
    const kmPerMyr = cm * 10;
    const modelPt = (age: number) => alongChain(kmPerMyr * age);
    // Each dated volcano joined to the model's volcano of the same age: the joins shrink to nothing when the speed is right.
    for (const v of CHAIN.slice(1)) {
      const [x, y] = kmXY(v.lon, v.lat);
      const [mx, my] = modelPt(v.age);
      parts.push(line(MX(x), MY(y), MX(mx), MY(my), COL.heat, 0.9, { opacity: 0.55 }));
    }
    // The model: a volcano every 2 million years, carried off by the plate.
    for (let a = 2; a <= 80; a += 2) {
      const [x, y] = modelPt(a);
      if (MX(x) > -4 && MY(y) > -4) parts.push(svg('circle', { cx: MX(x), cy: MY(y), r: a % 10 === 0 ? 2.8 : 1.8, fill: COL.heat }));
    }
    // The real volcanoes.
    for (const v of CHAIN) {
      const [x, y] = kmXY(v.lon, v.lat);
      parts.push(svg('circle', { cx: MX(x), cy: MY(y), r: 3.5, fill: 'none', stroke: COL.ink, 'stroke-width': 1.3 }));
    }
    const tag = (name: string, text: string, dx: number, dy: number, anchor?: 'end' | 'middle') => {
      const v = CHAIN.find((c) => c.name === name)!;
      const [x, y] = kmXY(v.lon, v.lat);
      parts.push(small(MX(x) + dx, MY(y) + dy, text, { bold: true, anchor, halo: '#dfeaf0' }));
    };
    tag('Detroit', 'Detroit, 79 Myr', 7, 3);
    tag('Kōko', 'Kōko, 48 Myr: the bend', 7, 3);
    tag('Midway', 'Midway, 27.7 Myr', 0, 14, 'middle');
    tag('Kīlauea', 'Kīlauea, over the plume', 0, 16, 'end');
    // Age against distance.
    parts.push(
      line(PX(0), PY(0), PX(MAX_KM), PY(0), COL.ink, 0.8), line(PX(0), PY(0), PX(0), PY(MAX_AGE), COL.ink, 0.8),
      small(PX(MAX_KM), PY(0) - 4, 'distance along the chain', { anchor: 'end', soft: true }),
      small(PX(0) + 5, PY(MAX_AGE) + 4, 'age, million years', { soft: true }),
    );
    for (const km of [0, 2000, 4000]) parts.push(small(PX(km), PY(0) + 14, km ? `${km.toLocaleString('en-US')} km` : '0', { ...(km ? { anchor: 'middle' as const } : {}), soft: true }));
    for (const age of [0, 40, 80]) parts.push(small(PX(0) - 4, PY(age) + 3, `${age}`, { anchor: 'end', soft: true }));
    parts.push(line(PX(0), PY(BEND), PX(MAX_KM), PY(BEND), COL.soft, 0.6, { 'stroke-dasharray': '2 3' }), small(PX(MAX_KM), PY(BEND) - 3, 'the bend', { anchor: 'end', soft: true }));
    for (const v of CHAIN) parts.push(svg('circle', { cx: PX(distance(v)), cy: PY(v.age), r: 2.8, fill: 'none', stroke: COL.ink, 'stroke-width': 1.2 }));
    const endKm = Math.min(MAX_KM, kmPerMyr * MAX_AGE);
    parts.push(line(PX(0), PY(0), PX(endKm), PY(endKm / kmPerMyr), COL.heat, 1.8));
    parts.push(label(PX(0) + 8, PY(MAX_AGE) + 22, `${cm.toFixed(1)} cm a year`, { size: 'note', bold: true, fill: COL.heat }));
    redraw(g, ...parts);
    const kauai = distance(CHAIN[5]);
    const ok = cm >= 8 && cm <= 10.5;
    f.readout.textContent = `At ${cm.toFixed(1)} cm a year, a volcano built over the plume is carried ${Math.round(cm * 10)} km in a million years; Kauaʻi, ${Math.round(kauai / 10) * 10} km away, would be ${(kauai / (cm * 10)).toFixed(1)} million years old (measured: 5.1). ${ok ? 'The red dots now sit on the dated volcanoes as far as Midway. Past the bend they overshoot: the Emperor seamounts are closer together than this speed predicts, because before 47 million years ago the plume itself was drifting south (see below).' : cm < 8 ? 'Too slow: each red dot falls short of the volcano of its age, so the model’s islands are too old for their distance.' : 'Too fast: each red dot runs past the volcano of its age, so the model’s islands are too young for their distance.'}`;
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

// ---- Darwin's atoll: a reef racing a sinking island (lesson 12) -------------------------------

/** How far the island has sunk `age` million years after it left the plume, metres: fast off the swell, then slowly as the plate cools. */
export const islandSink = (age: number) => 1500 * (1 - Math.exp(-age / 4)) + 20 * age;
/** Its summit before the waves reach it, metres above the sea: sinking and worn down by rain. */
const summitAt = (age: number) => 1800 - 900 * (1 - Math.exp(-age / 3)) - islandSink(age);
/** Latitude as the plate carries the island northwest, degrees north (Kīlauea today; Kure, at about 28°, after some 29 million years). */
const latAt = (age: number) => 19.4 + 0.31 * age;
/** How fast coral can grow at that latitude, as a fraction of its rate in the warm tropics. */
export const warmth = (age: number) => Math.max(0, Math.min(1, (29 - latAt(age)) / 6));
/** Coral lives only in the sunlit top of the sea: a reef top deeper than this is dead. */
const SUNLIT = 60;
const REEF_FROM = 0.3;

export interface AtollState {
  /** Summit of the volcanic rock, metres above sea level (negative: under water). */
  rock: number;
  /** Top of the reef, metres above sea level (0: at the surface), or null before it starts. */
  reef: number | null;
  alive: boolean;
  stage: 'island' | 'fringing' | 'barrier' | 'atoll' | 'drowned' | 'guyot';
}

/** The island and its reef, `age` million years on, for coral that grows `mm` a year in warm water. */
export function atollAt(age: number, mm: number): AtollState {
  const dt = 0.02;
  let reef: number | null = null;
  let alive = true;
  let planed: number | null = null;
  for (let a = 0; a < age - 1e-9; a += dt) {
    const b = Math.min(age, a + dt);
    const sank = islandSink(b) - islandSink(a);
    if (planed === null && summitAt(b) <= 0) planed = b;
    if (reef === null) {
      if (b >= REEF_FROM) reef = 0;
      continue;
    }
    reef -= sank;
    if (alive) {
      reef = Math.min(0, reef + mm * 1000 * warmth(b) * (b - a));
      if (reef < -SUNLIT) alive = false;
    }
  }
  const rock = planed === null ? summitAt(age) : -(islandSink(age) - islandSink(planed));
  let stage: AtollState['stage'];
  if (reef === null) stage = 'island';
  else if (!alive) stage = rock > 0 ? 'drowned' : 'guyot';
  else if (rock > 0) stage = islandSink(age) - islandSink(REEF_FROM) < 400 ? 'fringing' : 'barrier';
  else stage = 'atoll';
  return { rock, reef, alive, stage };
}

export const atollFigure = figure(['atoll'], (ctx, t) => {
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let age = 0;
  let mm = 0.1;
  const SEA = 92;
  const Z = (m: number) => SEA - m / 25; // 1 px = 25 m up and down
  const CX = W / 2;
  /** The cone's flank: half-width in px at height `m` (metres above sea, for the island as built). */
  const half = (m: number) => Math.max(0, (1800 - m) / 25 / 0.55);
  const reefX = half(islandSink(REEF_FROM)); // where the shore was when the reef took hold
  const paint = () => {
    const s = atollAt(age, mm);
    const sink = islandSink(age);
    const w = warmth(age);
    const sea = `rgb(${Math.round(110 - 50 * (1 - w))},${Math.round(190 - 60 * (1 - w))},${Math.round(200 - 10 * (1 - w))})`;
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: SEA, fill: '#f3e6d4' }),
      svg('rect', { y: SEA, width: W, height: H - SEA, fill: sea }),
    ];
    // The volcano: the cone as built, sunk, with its top worn down.
    const top = Z(s.rock);
    const pts: P[] = [];
    for (let x = -W / 2; x <= W / 2; x += 4) {
      const cone = Z(1800 - Math.abs(x) * 0.55 * 25 - sink);
      // Above the sea the worn summit is rounded; once the waves reach it, they plane it flat.
      const k = 10; // px: how softly the worn top meets the flanks
      pts.push([CX + x, s.rock > 0 ? k * Math.log(Math.exp(cone / k) + Math.exp(top / k)) : Math.max(cone, top)]);
    }
    parts.push(svg('polygon', { points: [...pts.map(([x, y]) => `${x},${y}`), `${W},${H}`, `0,${H}`].join(' '), fill: '#5a4a44' }));
    // The reef: a wall of coral on the old shore, as tall as it has grown.
    if (s.reef !== null) {
      for (const side of [-1, 1]) {
        const x = CX + side * reefX;
        const foot = Z(-(sink - islandSink(REEF_FROM)));
        const y = Math.min(Z(s.reef), foot - 2);
        parts.push(svg('rect', { x: x - 6, y, width: 12, height: Math.max(2, foot - y + 4), rx: 2, fill: s.alive ? '#e7a7a0' : '#b8b0a6', stroke: s.alive ? '#c76a62' : '#8f877d', 'stroke-width': 1 }));
      }
    }
    parts.push(
      line(0, SEA, W, SEA, COL.water, 1.4),
      small(6, SEA - 4, 'sea level', { fill: COL.water, bold: true }),
      label(W - 8, 18, `${age.toFixed(1)} million years after leaving the plume`, { anchor: 'end', bold: true, size: 'note' }),
      small(W - 8, 32, `${latAt(age).toFixed(0)}°N: ${w > 0.8 ? 'warm tropical water' : w > 0.3 ? 'cooler water' : w > 0 ? 'cold for coral' : 'too cold for coral'}`, { anchor: 'end', soft: true }),
      label(CX, H - 10, { island: 'A new volcanic island', fringing: 'Fringing reef along the shore', barrier: 'Barrier reef, with a lagoon behind it', atoll: 'An atoll: a ring of reef, no rock above the sea', drowned: 'The reef has drowned', guyot: 'A drowned, flat-topped seamount: a guyot' }[s.stage], { anchor: 'middle', bold: true, halo: sea }),
    );
    redraw(g, ...parts);
    const sinkRate = (islandSink(age + 0.05) - islandSink(age)) / 0.05 / 1000;
    const growRate = mm * w;
    f.readout.textContent = `Now the island sinks ${sinkRate.toFixed(2)} mm a year; coral here can build ${growRate.toFixed(2)} mm a year. ${
      s.stage === 'island' ? 'Coral is just settling on the new shore.'
        : !s.alive ? 'The sea floor sank faster than the coral could build, and the reef slipped into the dark and died. Waves had planed the summit flat, and it goes on sinking.'
          : s.stage === 'atoll' ? 'The last of the volcano has sunk, but the reef kept pace and still breaks the surface around the lagoon.'
            : 'The reef keeps its top at the surface while the rock behind it sinks.'}`;
    if (s.stage === 'atoll' && t.goal === 'atoll') t.done();
  };
  const grow = slider('Coral growth in warm water', 0, 1, 0.05, mm, (v) => `${v.toFixed(2)} mm a year`, (v) => { mm = v; paint(); }, 'rose');
  const time = slider('Time', 0, 40, 0.1, 0, (v) => `${v.toFixed(1)} million years`, (v) => { age = v; paint(); }, 'heat');
  f.controls.append(grow.node, player(time, ctx, { seconds: 16 }).node, time.node);
  paint();
  guessFirst(t, f, {
    ask: 'The island keeps sinking long after its peak goes under. If the reef can grow upward faster than the rock sinks, what is left at the surface? Guess first.',
    options: ['Nothing: the reef sinks with the rock', 'A ring of reef around a lagoon', 'A coral hill where the peak was'],
    answer: 1, reveal: 'done',
    sliders: [grow, time],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['nothing', 'a ring of reef around a lagoon', 'a coral hill'][guess]}. Set how fast coral grows, then play the island’s next 40 million years as the plate carries it into colder water.`;
    },
  });
  return f.node;
});
