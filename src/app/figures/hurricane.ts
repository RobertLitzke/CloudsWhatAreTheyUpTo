// Figures for hurricanes: the trade winds and the rainy belt at the equator, a
// hurricane fed by a warm sea and torn by shear, a ship sailing through one
// (the wind and the barometer, the calm of the eye and the wind back from the
// other side), the belts where they form and the paths they take, and the sea
// piled up at the shore.

import { el, svg } from 'lesson-kit/dom';
import { EYE_KM, FEED_C, category, hurricaneWind, pressureAt, surgeM, windAt } from '../../core/hurricane';
import { arrow, heapAt, label, line, note, points, polyline, redraw, small, still, type P } from './draw';
import { COL, choices, deg, figure, frame, lock, lockIn, slider, tint, type FigureFactory } from './kit';

const OCEAN = '#9cc3dc';
const LAND = '#a39150';
const MAP_SEA = '#dbe9f2';

const kmh = (ms: number) => `${Math.round(ms * 3.6)} km/h`;

/** Spiral cloud bands round (cx, cy), anticlockwise inward; `order` 0 to 1 from ragged to a tight ring with an eye. */
function hurricaneTop(cx: number, cy: number, size: number, order: number, tilt = 0): SVGElement[] {
  const out: SVGElement[] = [];
  const arms = 3;
  for (let k = 0; k < arms; k++) {
    const pts: P[] = [];
    for (let i = 0; i <= 40; i++) {
      const s = i / 40;
      const r = size * (0.2 + s * 0.9);
      const a = (k / arms) * 2 * Math.PI - s * (2 + order * 2.5);
      pts.push([cx + tilt * s * 0.5 + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]);
    }
    out.push(polyline(pts, '#ffffff', 6 + order * 10 * (1 - k * 0.15), { opacity: 0.85, 'stroke-linecap': 'round' }));
  }
  out.push(svg('circle', { cx: cx + tilt * 0.1, cy, r: size * 0.32, fill: '#ffffff', opacity: 0.6 + order * 0.4 }));
  if (order > 0.6) out.push(svg('circle', { cx, cy, r: size * 0.08, fill: OCEAN }));
  return out;
}

// ---- Trade winds -----------------------------------------------------------------

export const tradeWindsDiagram: FigureFactory = () => {
  const W = 400;
  const H = 250;
  const d = still(W, H);
  // A slice from 30° N to 30° S: rising air at the equator, sinking at 30°, trade winds blowing back in near the surface.
  const xOf = (lat: number) => 200 - lat * 6;
  const sea = 210;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: sea, fill: COL.sky }),
    svg('rect', { x: 0, y: sea, width: W, height: H - sea, fill: OCEAN }),
    heapAt(xOf(5), sea, 40, 150), heapAt(xOf(0) + 4, sea, 46, 170), heapAt(xOf(-3), sea, 36, 130),
    arrow(xOf(0), sea - 20, xOf(0), 30, COL.parcel, 3),
    arrow(xOf(2), 26, xOf(26), 26, COL.ink, 2), arrow(xOf(-2), 26, xOf(-26), 26, COL.ink, 2),
    arrow(xOf(28), 34, xOf(28), sea - 14, COL.cold, 2.5), arrow(xOf(-28), 34, xOf(-28), sea - 14, COL.cold, 2.5),
    arrow(xOf(26), sea - 8, xOf(6), sea - 8, COL.ink, 2.5), arrow(xOf(-26), sea - 8, xOf(-6), sea - 8, COL.ink, 2.5),
    small(xOf(16), sea - 14, 'trade winds', { anchor: 'middle', bold: true }), small(xOf(-16), sea - 14, 'trade winds', { anchor: 'middle', bold: true }),
    small(8, 14, 'sinking: deserts, the Pacific High', { fill: COL.coldInk }),
    small(W - 8, 14, 'sinking', { anchor: 'end', fill: COL.coldInk }),
    small(xOf(0), sea + 16, 'the equator: rising air, daily storms', { anchor: 'middle', fill: '#fff', bold: true }),
    small(xOf(30), sea + 30, '30° N', { anchor: 'middle', fill: '#fff' }), small(xOf(-30), sea + 30, '30° S', { anchor: 'middle', fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- The heat engine -----------------------------------------------------------------

export const heatEngineFigure = figure(['cat3'], (_ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 3);
  let sea = 26;
  let shear = 10;
  const g = svg('g');
  f.svg.append(g);
  const paint = () => {
    const v = hurricaneWind(sea, shear);
    const order = Math.min(1, v / 60);
    const tilt = shear * 1.6;
    const seaFill = sea >= 28 ? '#5fa7c9' : sea >= FEED_C ? '#86b9d4' : '#a9c9da';
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: H, fill: seaFill }),
      ...(v >= 12 ? hurricaneTop(170, 120, 40 + order * 50, order, tilt) : [heapAt(150, 130, 24, 14), heapAt(200, 110, 20, 12)]),
      ...(shear > 0 ? [arrow(300, 28, 300 + shear * 1.4, 28, COL.ink, 2), small(300, 20, 'wind at the top', { soft: true })] : []),
      note(W - 8, H - 26, `${Math.round(v)} m/s, ${kmh(v)}`, { anchor: 'end', bold: true, fill: '#fff' }),
      note(W - 8, H - 10, category(v), { anchor: 'end', bold: true, fill: '#fff' }),
    );
    const why = sea < FEED_C
      ? `Below ${deg(FEED_C)} the sea cannot give the rising air enough heat and vapour: a cluster of showers, nothing more.`
      : shear >= 40
        ? 'The wind at the top shears the storm’s top away from its bottom: the heat released by the rain is blown off downwind instead of warming the centre, and the storm comes apart.'
        : shear >= 20
          ? 'The shear tilts the storm, and some of its heat is blown away downwind. It survives, but lopsided and weaker.'
          : sea >= 29
            ? 'A hot sea and still air aloft: the engine runs flat out, the eye clears, and the wind round it is ferocious.'
            : 'Warm enough to run the engine: the air spiralling in picks up heat and vapour from the sea, rises in a ring of storms, and the storm deepens.';
    f.readout.textContent = why;
    if (t.goal === 'cat3' && v >= 50) t.done();
  };
  f.controls.append(
    slider('Sea temperature', 22, 31, 0.5, sea, (v) => deg(v), (v) => { sea = v; paint(); }, 'parcel').node,
    slider('Change in wind, bottom to top', 0, 60, 5, shear, (v) => `${v} km/h`, (v) => { shear = v; paint(); }, 'ink').node,
  );
  paint();
  return f.node;
});

// ---- A ship through the storm -----------------------------------------------------------

export const shipThroughFigure = figure(['eye'], (_ctx, t) => {
  const W = 400;
  const H = 290;
  const f = frame(W, H, 3);
  const x0 = 30;
  const x1 = 390;
  const xOf = (km: number) => x0 + ((km + 300) / 600) * (x1 - x0);
  const windY = (ms: number) => 236 - (ms / 70) * 70;
  const pY = (hPa: number) => 112 + (1015 - hPa) * 0.9;
  const windPts: P[] = [];
  const pPts: P[] = [];
  for (let km = -300; km <= 300; km += 3) {
    windPts.push([xOf(km), windY(windAt(km))]);
    pPts.push([xOf(km), pY(pressureAt(km))]);
  }
  const g = svg('g');
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: 100, fill: OCEAN }),
    ...hurricaneTop(xOf(0), 50, 50, 1),
    svg('rect', { x: 0, y: 100, width: W, height: H - 100, fill: COL.paper }),
    polyline(pPts, COL.env, 2.5),
    small(x0, pY(1010) - 4, 'barometer', { fill: COL.env, bold: true }),
    polyline(windPts, COL.parcel, 2.5),
    small(x0, windY(windAt(-300)) - 6, 'wind', { fill: COL.warmInk, bold: true }),
    line(x0, 240, x1, 240, COL.ink, 1),
    ...[-300, -150, 0, 150, 300].map((km) => small(xOf(km), 254, km === 0 ? 'centre' : `${Math.abs(km)} km`, km === -300 ? { soft: true } : { anchor: km === 300 ? 'end' : 'middle', soft: true })),
    g,
  );
  let at = -300;
  const paint = () => {
    const w = windAt(at);
    const p = pressureAt(at);
    // The ship sails east. The wind blows anticlockwise round the centre: from the north on its west side, from the south on its east side.
    const from = Math.abs(at) < EYE_KM ? 'calm' : at < 0 ? 'north' : 'south';
    redraw(g,
      line(xOf(at), 100, xOf(at), 240, COL.ink, 1, { 'stroke-dasharray': '3 3' }),
      svg('path', { d: `M${xOf(at) - 8},${92} L${xOf(at) + 8},${92} L${xOf(at) + 5},${98} L${xOf(at) - 5},${98} Z`, fill: COL.ink }),
      line(xOf(at), 92, xOf(at), 82, COL.ink, 1.5),
      svg('circle', { cx: xOf(at), cy: windY(w), r: 4, fill: COL.parcel }),
      svg('circle', { cx: xOf(at), cy: pY(p), r: 4, fill: COL.env }),
      ...(from === 'calm' ? [] : [arrow(xOf(at) + 16, from === 'north' ? 62 : 86, xOf(at) + 16, from === 'north' ? 86 : 62, '#fff', 2)]),
      note(W / 2 - 8, 278, `${Math.round(p)} hPa`, { anchor: 'end', bold: true, fill: COL.env }),
      note(W / 2 + 8, 278, from === 'calm' ? 'calm' : `${kmh(w)} from the ${from}`, { bold: true, fill: COL.warmInk }),
    );
    f.readout.textContent = Math.abs(at) < EYE_KM
      ? 'The eye. The wind drops to a breeze, the sun may break through, and the barometer is at its lowest. Sinking air in the eye has cleared the cloud. Half the storm is still to come.'
      : Math.abs(at) < 40
        ? 'The eyewall: the strongest winds and the heaviest rain, in the ring of storms round the eye.'
        : at < 0
          ? 'Heading in: the barometer falls faster and faster, and the wind rises, from the north.'
          : 'Out the other side: the wind is back, as strong as before, but from the opposite direction, and the barometer climbs.';
    if (t.goal === 'eye' && at > 60) t.done();
  };
  f.controls.append(slider('The ship’s course', -300, 300, 5, at, (v) => (v === 0 ? 'the centre' : `${Math.abs(v)} km ${v < 0 ? 'before' : 'past'} the centre`), (v) => { at = v; paint(); }, 'ink').node);
  paint();
  return f.node;
});

// ---- Where they form, and where they go ------------------------------------------------

export const hurricaneBeltDiagram: FigureFactory = () => {
  const W = 400;
  const H = 210;
  const d = still(W, H);
  const yOf = (lat: number) => 105 - lat * 2.6;
  const tracks: P[][] = [
    [[300, yOf(12)], [250, yOf(16)], [200, yOf(22)], [180, yOf(30)], [200, yOf(36)]],
    [[120, yOf(13)], [80, yOf(17)], [50, yOf(24)], [55, yOf(32)]],
    [[330, yOf(-14)], [290, yOf(-18)], [270, yOf(-26)], [285, yOf(-32)]],
  ];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: MAP_SEA }),
    svg('rect', { x: 0, y: yOf(30), width: W, height: yOf(5) - yOf(30), fill: tint(COL.parcel, 0.18) }),
    svg('rect', { x: 0, y: yOf(-5), width: W, height: yOf(-30) - yOf(-5), fill: tint(COL.parcel, 0.18) }),
    line(0, yOf(0), W, yOf(0), COL.ink, 1, { 'stroke-dasharray': '4 3' }),
    small(8, yOf(0) - 4, 'equator: no turn, no hurricanes', { soft: true }),
    small(W - 8, yOf(5) - 5, 'warm sea, and enough turn', { anchor: 'end', fill: COL.warmInk }),
    ...[30, -30].map((lat) => small(W - 4, yOf(lat) - 3, `${Math.abs(lat)}° ${lat > 0 ? 'N' : 'S'}`, { anchor: 'end', soft: true })),
    ...tracks.flatMap((tr) => [polyline(tr, COL.red, 2.5), svg('circle', { cx: tr[0][0], cy: tr[0][1], r: 4, fill: COL.red })]),
    small(210, yOf(37), 'curving away north-east', { fill: COL.redInk }),
    note(8, H - 6, 'Born (●) in the trade winds, steered west, then curving away from the equator.', { soft: true }),
  );
  return { node: d.node };
};

// ---- Storm surge --------------------------------------------------------------------------

const SURGE_GUESSES = ['Higher on the shallow coast', 'Higher on the steep coast', 'The same: it is the same wind'] as const;
const SURGE_RIGHT = 0;

export const surgeFigure = figure(['surge'], (_ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 4);
  let wind = 58;
  let shallow = 0;
  const g = svg('g');
  f.svg.append(g);
  const mPx = 14;
  const paint = () => {
    const isShallow = shallow === 1;
    const s = surgeM(wind, isShallow);
    const coast = 300;
    const sea = 120;
    const bed = (x: number) => (isShallow ? sea + 6 + ((coast - x) / coast) * 40 : x > coast - 40 ? sea + 6 + ((coast - x) / 40) * 90 : sea + 100);
    const bedPts: P[] = [];
    for (let x = 0; x <= coast; x += 10) bedPts.push([x, bed(x)]);
    const water: P[] = [];
    for (let x = 0; x <= coast + 10; x += 10) water.push([x, sea - s * mPx * Math.exp(-(((coast - x) / 90) ** 2))]);
    const flood = Math.min(W, coast + s * 22);
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }),
      svg('polygon', { points: points([...water, [coast + 10, H], [0, H]]), fill: OCEAN }),
      ...(s > 0.3 ? [svg('rect', { x: coast, y: sea - s * mPx * 0.7, width: flood - coast, height: s * mPx * 0.7, fill: OCEAN, opacity: 0.85 })] : []),
      svg('polygon', { points: points([[0, H], ...bedPts, [coast, sea], [W, sea - 4], [W, H]]), fill: LAND }),
      svg('rect', { x: 340, y: sea - 22, width: 26, height: 18, fill: '#f6e7c8', stroke: COL.ink }),
      svg('polygon', { points: points([[336, sea - 22], [353, sea - 34], [370, sea - 22]]), fill: COL.red }),
      line(0, sea, coast, sea, COL.ink, 1, { 'stroke-dasharray': '4 3' }),
      small(8, sea + 14, 'normal sea level', { soft: true }),
      arrow(40, 40, 120, 40, COL.ink, 1.5 + wind / 25),
      small(40, 32, `onshore wind ${kmh(wind)}`, { bold: true }),
      label(coast - 6, sea - s * mPx - 8, `${s.toFixed(1)} m`, { anchor: 'end', bold: true, fill: COL.blue }),
      small(150, H - 8, isShallow ? 'a wide, shallow shelf' : 'a steep shelf: deep water close in', { anchor: 'middle', fill: '#fff', bold: true }),
    );
    if (asking) {
      f.readout.textContent = `A Category 4 hurricane drives its wind straight onshore. Here the sea floor drops away steeply near the coast, and the sea at the shore rises ${s.toFixed(1)} m. The same storm hits a coast with a wide, shallow shelf…`;
      return;
    }
    const verdict = pick.picked() < 0 || wind !== 58 || !isShallow ? '' : pick.picked() === SURGE_RIGHT ? 'As you guessed. ' : 'Not what you guessed. ';
    f.readout.textContent = `${verdict}The wind drags the sea towards the shore. Over deep water the push spreads through a deep layer, and water can flow back underneath; over a wide shallow shelf it has nowhere to go but up. ${s.toFixed(1)} m of surge${s >= 4 ? ', with waves on top: enough to sweep houses away' : ''}.`;
    if (t.goal === 'surge' && !asking && isShallow && s >= 5) t.done();
  };
  let asking = t.goal === 'surge';
  const windS = slider('Wind', 20, 80, 2, wind, (v) => `${kmh(v)}, ${category(v)}`, (v) => { wind = v; paint(); }, 'ink');
  const shelf = choices(['Steep shelf', 'Shallow shelf'], (i) => { shallow = i; paint(); });
  const pick = choices(SURGE_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Send it to the shallow coast', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([windS], false);
    shelf.freeze(false);
    shelf.pick(1);
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(el('div.fig-guess', {}, shelf.node), windS.node);
  shelf.pick(0);
  shelf.freeze(asking);
  lock([windS], asking);
  if (asking && typeof t.kept === 'number' && SURGE_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});
