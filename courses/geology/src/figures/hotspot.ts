// Lesson 11, Islands that get older in a line: the Pacific plate carried over
// a fixed plume at a speed the reader sets, against the dated volcanoes of the
// Hawaiian-Emperor chain.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider } from './kit';

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
