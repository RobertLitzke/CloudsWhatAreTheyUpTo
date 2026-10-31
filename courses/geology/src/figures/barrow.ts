// Lesson 5, Garnets in the mud: buried mud is heated and squeezed into new
// minerals, in zones that map how deep and hot the rock once was.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, slider } from './kit';

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
