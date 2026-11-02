// The Cascadia branch (C1-C3): a tidal marsh dropped and buried by one
// earthquake after another; the 1700 tsunami crossing the Pacific to Japan,
// timed from the depth of the ocean; a lahar from Mount Rainier running down
// the White River valley; and Mount St Helens' bulge, landslide and blast.

import { el, svg } from 'didactics/dom';
import { arrow, line, note, redraw, small } from 'didactics/draw';
import { cellSize, heightRamp, hillshade, loadRelief, mapKey, mapLabels, mapLines, mapView, reliefFor, rgb, type Relief } from 'didactics/maps';
import { slider as logSlider } from 'didactics/figure';
import { asset } from '../asset';
import { COL, figure, frame, guessFirst, player, slider } from './kit';
import { cellOf, Heap } from './mapkit';
import { FRAGMENTS, gasShare } from './volcano';

const W = 400;

// ---- C1: a marsh that keeps sinking --------------------------------------------------------

/** Years (counted from the start of the sketch) of the earthquakes that drop the marsh; Cascadia's gaps vary from a few centuries to a thousand years. */
export const MARSH_QUAKES = [550, 1350, 1700, 2600, 3200] as const;
const SPAN = 3500;

export const marshFigure = figure(['buried'], (ctx, t) => {
  const H = 240;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A cut through a tidal marsh on the Washington coast, growing upward over 3,500 years. Each earthquake drops the marsh into the reach of the tides: its soil is covered by a thin sheet of tsunami sand and then grey tidal mud, until the mud builds up to marsh level and a new soil grows. Cedar trees on the marsh die when it drops and stand as a ghost forest.');
  let years = 0;
  const paint = () => {
    const quakes = MARSH_QUAKES.filter((q) => q <= years);
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: H, fill: '#e6eef3' })];
    // Build the column from the bottom: peat while a marsh, mud after a drop until it fills back up.
    const X0 = 30;
    const X1 = 290;
    const bot = 230;
    const PX = 0.045; // px per year of peat
    let y = bot;
    let prev = 0;
    const layers: SVGElement[] = [];
    for (const q of quakes) {
      const peat = (q - prev) * PX;
      layers.push(svg('rect', { x: X0, y: y - peat, width: X1 - X0, height: peat, fill: '#6b4e33' }));
      y -= peat;
      // Tsunami sand, then tidal mud until the surface is back up to marsh level.
      const mud = Math.min(16, Math.max(2, (years - q) * 0.12));
      layers.push(svg('rect', { x: X0, y: y - 2, width: X1 - X0, height: 2, fill: '#e1c78a' }));
      layers.push(svg('rect', { x: X0, y: y - 2 - mud, width: X1 - X0, height: mud, fill: '#9aa3a8' }));
      y -= 2 + mud;
      prev = Math.min(years, q + 130);
    }
    if (years > prev) {
      const peat = (years - prev) * PX;
      layers.push(svg('rect', { x: X0, y: y - peat, width: X1 - X0, height: peat, fill: '#6b4e33' }));
      y -= peat;
    }
    parts.push(svg('rect', { x: X0, y: bot, width: X1 - X0, height: H - bot, fill: '#8b7a66' }), ...layers);
    const surface = y;
    const lastQuake = quakes[quakes.length - 1];
    const sinceLast = lastQuake === undefined ? Infinity : years - lastQuake;
    // High tide: the marsh surface sits at about high tide; just after a drop it is under the tides.
    const tide = surface - (sinceLast < 60 ? 6 : 0) - 4;
    parts.push(line(X0 - 20, tide + (sinceLast < 60 ? 24 : 0), X1 + 20, tide + (sinceLast < 60 ? 24 : 0), COL.water, 1.4, { 'stroke-dasharray': '5 3' }));
    parts.push(small(X1 + 22, tide + (sinceLast < 60 ? 24 : 0) + 3, 'high tide', { fill: COL.water }));
    // A cedar on the marsh, alive or a grey snag.
    const dead = sinceLast < 400;
    parts.push(line(X0 + 60, surface, X0 + 60, surface - 70, dead ? '#9a958f' : '#5a4630', 4));
    if (!dead) parts.push(svg('polygon', { points: `${X0 + 40},${surface - 30} ${X0 + 60},${surface - 90} ${X0 + 80},${surface - 30}`, fill: '#4e7a4b' }));
    parts.push(small(X0 + 86, surface - 50, dead ? 'dead cedar' : 'red cedar', { soft: true }));
    parts.push(note(8, 18, `Year ${Math.round(years)}: ${quakes.length} buried soil${quakes.length === 1 ? '' : 's'}`, { bold: true }));
    parts.push(small(X1 + 6, surface + 8, 'marsh soil (peat)', { fill: '#6b4e33' }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    f.readout.textContent = quakes.length === 0
      ? 'A salt marsh at the edge of a bay. Its grasses trap mud and their roots build soil, so the marsh keeps level with high tide. Play the years.'
      : sinceLast < 60
        ? `An earthquake: the coast dropped about 1.5 m in minutes. The tsunami that followed spread a thin sheet of sand over the marsh, which now lies below the tides; grey tidal mud settles on it, and salt water kills the cedars.`
        : `${quakes.length} earthquake${quakes.length > 1 ? 's' : ''} so far. After each, tidal mud built back up to marsh level and a new marsh grew, but the old soil stays buried below, capped by sand and mud: a record of the drop.`;
    if (quakes.length >= 3 && t.goal === 'buried') t.done();
  };
  const ys = slider('Years', 0, SPAN, 10, 0, (v) => `${v}`, (v) => { years = v; paint(); }, 'old');
  const isOpen = guessFirst(t, f, {
    ask: 'This marsh sits on the coast above the Cascadia megathrust, inland of the band nearest the trench. What happens to it in a great earthquake? Guess first.',
    options: ['It drops into the reach of the tides', 'It rises out of the reach of the tides', 'It stays where it is'],
    answer: 0, reveal: 'done',
    sliders: [ys],
    after: () => paint(),
  });
  f.controls.append(player(ys, ctx, { seconds: 16 }).node, ys.node);
  paint();
  return f.node;
});

// ---- C1: the tsunami crosses the Pacific -------------------------------------------------------

/** Points along the Cascadia trench, east longitudes past 180 to match the Pacific relief. */
const TRENCH: [number, number][] = [[234.6, 40.4], [234.8, 42.0], [234.7, 44.0], [234.6, 46.0], [234.3, 47.6], [233.6, 48.6], [232.6, 49.6]];

/** Hours for a tsunami from the trench to reach each cell of sea, from the speed of a long wave, √(g × depth). */
export function arrivalHours(r: Relief): Float32Array {
  const Wd = r.width;
  const Hd = r.height;
  const hours = new Float32Array(Wd * Hd).fill(Infinity);
  const heap = new Heap();
  const sea = (i: number) => r.z[i] < -20;
  const speed = (i: number) => Math.sqrt(9.81 * Math.max(50, -r.z[i])) * 3.6; // km/h
  for (let k = 1; k < TRENCH.length; k++)
    for (let u = 0; u <= 1; u += 0.05) {
      const i = cellOf(r, TRENCH[k - 1][0] + (TRENCH[k][0] - TRENCH[k - 1][0]) * u, TRENCH[k - 1][1] + (TRENCH[k][1] - TRENCH[k - 1][1]) * u);
      if (sea(i)) { hours[i] = 0; heap.push(0, i); }
    }
  const km = Array.from({ length: Hd }, (_, row) => cellSize(r, row) / 1000);
  while (heap.size) {
    const [h, i] = heap.pop();
    if (h > hours[i]) continue;
    const x = i % Wd;
    const y = (i - x) / Wd;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if ((dx || dy) && xx >= 0 && yy >= 0 && xx < Wd && yy < Hd) {
          const j = yy * Wd + xx;
          if (!sea(j)) continue;
          const d = km[y] * Math.hypot(dx, dy);
          const nh = h + (2 * d) / (speed(i) + speed(j));
          if (nh < hours[j]) { hours[j] = nh; heap.push(nh, j); }
        }
      }
  }
  return hours;
}

/** Japanese towns whose records of the 1700 tsunami Satake's team used, [east lon, lat]. */
const JAPAN: { name: string; at: [number, number] }[] = [
  { name: 'Miyako', at: [141.96, 39.64] },
  { name: 'Nakaminato', at: [140.6, 36.34] },
  { name: 'Tanabe', at: [135.38, 33.73] },
];

export const pacificFigure = figure(['crossed'], (ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 3 });
  let hrs = 0;
  let relief: Relief | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let arrive: Float32Array | null = null;
  let shade: Float32Array | null = null;
  let ramp: ReturnType<typeof heightRamp> | null = null;
  let japan = 10;
  const marks = svg('g');
  const SWEPT = rgb('#a9c9de');
  const FRONT = rgb('#c4462f');
  const paint = () => {
    f.readout.textContent = hrs === 0
      ? 'Cascadia breaks along about 1,000 km of its length, and the sea floor above it lifts. Play the hours that follow.'
      : hrs < japan
        ? `${hrs.toFixed(1)} hours: the wave crosses the deep Pacific at 700 to 800 km an hour, slowing over shallower water. Nobody in Japan feels anything.`
        : `${hrs.toFixed(1)} hours: the wave reaches the Pacific coast of Japan, about ${Math.round(japan)} hours after the earthquake, with no earthquake felt there. That is the orphan tsunami.`;
    if (hrs >= japan && t.goal === 'crossed') t.done();
    if (!relief || !view || !arrive || !shade || !ramp) return;
    const a = arrive;
    view.paint({
      shade, relief: 0.6, ground: ramp,
      colorAt: (i, z) => (z >= -20 ? null : Math.abs(a[i] - hrs) < 0.18 && hrs > 0 ? FRONT : a[i] <= hrs ? SWEPT : null),
    });
  };
  const ts = slider('Hours after the earthquake', 0, 12, 0.1, 0, (v) => v.toFixed(1), (v) => { hrs = v; paint(); }, 'water');
  f.controls.append(player(ts, ctx, { seconds: 14 }).node, ts.node);
  paint();
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), 'maps/pacific').then((r) => {
      relief = r;
      arrive = arrivalHours(r);
      const near = (lon: number, lat: number) => {
        const c = cellOf(r, lon, lat);
        let best = Infinity;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const j = c + dy * r.width + dx;
          if (j >= 0 && j < arrive!.length) best = Math.min(best, arrive![j]);
        }
        return best;
      };
      japan = near(JAPAN[0].at[0], JAPAN[0].at[1]);
      if (!Number.isFinite(japan)) japan = 10;
      shade = hillshade(r, undefined, 4);
      ramp = heightRamp(r);
      view = mapView(r, { alt: 'A map of the North Pacific from Japan to North America. A red wave front spreads out from the Cascadia coast, crosses the ocean, and reaches Japan about ten hours later.' });
      view.svg.append(marks);
      redraw(marks, ...mapLines(view, [{ points: TRENCH, color: '#c4462f', width: 3 }]), ...mapLabels(view, [
        ...JAPAN.map((j) => ({ lon: j.at[0], lat: j.at[1], text: j.name, side: 'left' as const })),
        { lon: 236.0, lat: 47.0, text: 'Cascadia', side: 'right' },
      ]));
      holder.replaceChildren(view.node, mapKey([{ text: 'Wave front', color: '#c4462f' }, { text: 'Sea the wave has crossed', color: '#a9c9de' }]), el('p.map-credit', {}, `Depths: ${r.meta.credit}. Travel times computed from the ocean depth, as a long wave travels at √(g × depth).`));
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});

// ---- C2: a lahar down the White River ----------------------------------------------------------

/** The lahar's path from Rainier's summit down the White River to Auburn and Kent, [lon, lat]. */
const WHITE: [number, number][] = [[-121.76, 46.853], [-121.7, 46.885], [-121.62, 46.92], [-121.55, 46.97], [-121.535, 47.02], [-121.575, 47.075], [-121.64, 47.14], [-121.76, 47.15], [-121.88, 47.15], [-121.96, 47.165], [-122.04, 47.2], [-122.15, 47.26], [-122.23, 47.31], [-122.24, 47.38]];
const TOWNS: { name: string; at: [number, number] }[] = [
  { name: 'Greenwater', at: [-121.63, 47.14] },
  { name: 'Enumclaw', at: [-121.99, 47.2] },
  { name: 'Auburn', at: [-122.23, 47.31] },
  { name: 'Kent', at: [-122.24, 47.38] },
];

/** Cross-section and footprint of a lahar of `v` cubic metres (Iverson, Schilling and Vallance, 1998). */
export const laharSection = (v: number) => 0.05 * v ** (2 / 3);
export const laharArea = (v: number) => 200 * v ** (2 / 3);

/** Stations along the path, about every 100 m: position, km from the summit, and the direction across. */
function stations(): { lon: number; lat: number; km: number; nx: number; ny: number }[] {
  const out: { lon: number; lat: number; km: number; nx: number; ny: number }[] = [];
  let km = 0;
  for (let k = 1; k < WHITE.length; k++) {
    const [x0, y0] = WHITE[k - 1];
    const [x1, y1] = WHITE[k];
    const ex = (x1 - x0) * 76;
    const ey = (y1 - y0) * 111;
    const len = Math.hypot(ex, ey);
    const n = Math.max(1, Math.round(len / 0.1));
    for (let s = 0; s < n; s++) {
      const u = s / n;
      out.push({ lon: x0 + (x1 - x0) * u, lat: y0 + (y1 - y0) * u, km: km + len * u, nx: -ey / len, ny: ex / len });
    }
    km += len;
  }
  return out;
}
const STATIONS = stations();

/** Which cells a lahar of `v` m³ covers, and the km along the path each is reached at. */
export function inundation(r: Relief, v: number): Float32Array {
  const at = new Float32Array(r.width * r.height).fill(Infinity);
  const A = laharSection(v);
  let B = laharArea(v);
  const cell = cellSize(r);
  const half = 30; // samples each side
  for (const s of STATIONS) {
    if (B <= 0) break;
    const prof: { i: number; z: number }[] = [];
    for (let k = -half; k <= half; k++) {
      const lon = s.lon + (s.nx * k * cell) / 1000 / 76;
      const lat = s.lat + (s.ny * k * cell) / 1000 / 111;
      const i = cellOf(r, lon, lat);
      prof.push({ i, z: r.z[i] });
    }
    const zmin = Math.min(...prof.map((p) => p.z));
    let lo = zmin;
    let hi = zmin + 400;
    for (let it = 0; it < 24; it++) {
      const mid = (lo + hi) / 2;
      let area = 0;
      for (const p of prof) area += Math.max(0, mid - p.z) * cell;
      if (area < A) lo = mid; else hi = mid;
    }
    for (const p of prof) {
      if (p.z < lo && at[p.i] === Infinity) {
        at[p.i] = s.km;
        B -= cell * 100; // stations are 100 m apart, so each cell crossed adds a strip that long
      }
    }
  }
  return at;
}

/** Speed of the lahar's front, km/h, at `km` from the summit: fast on the mountain, slower on the lowland. */
const frontKmh = (km: number) => (km < 30 ? 70 : km < 60 ? 45 : 30);
const frontHours = (km: number) => {
  let h = 0;
  for (let d = 0; d < km; d += 1) h += 1 / frontKmh(d);
  return h;
};

export const laharFigure = figure(['reached'], (ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 4 });
  let vol = 0.1; // km³
  let mins = 0;
  let relief: Relief | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let shade: Float32Array | null = null;
  let ramp: ReturnType<typeof heightRamp> | null = null;
  const cache = new Map<number, Float32Array>();
  const marks = svg('g');
  const MUD = rgb('#8a6d4e');
  const townKm = TOWNS.map((tw) => {
    let best = Infinity;
    let k = 0;
    for (const s of STATIONS) {
      const d = Math.hypot((s.lon - tw.at[0]) * 76, (s.lat - tw.at[1]) * 111);
      if (d < best) { best = d; k = s.km; }
    }
    return k;
  });
  const paint = () => {
    const front = ((): number => {
      let km = 0;
      while (frontHours(km + 1) * 60 <= mins && km < 140) km++;
      return km;
    })();
    if (!relief || !view || !shade || !ramp) return;
    const key = Math.round(vol * 100);
    let at = cache.get(key);
    if (!at) {
      at = inundation(relief, vol * 1e9);
      cache.set(key, at);
    }
    let reach = 0;
    for (let i = 0; i < at.length; i++) if (at[i] < Infinity) reach = Math.max(reach, at[i]);
    const shown = Math.min(front, reach);
    const a = at;
    view.paint({ shade, relief: 0.85, ground: ramp, colorAt: (i) => (a[i] <= shown ? MUD : null) });
    const hit = TOWNS.filter((_, k) => townKm[k] <= shown && townKm[k] <= reach + 1);
    redraw(marks, ...mapLabels(view, TOWNS.map((tw) => ({ lon: tw.at[0], lat: tw.at[1], text: tw.name, side: 'right' as const, color: hit.includes(tw) ? '#c0392b' : undefined }))));
    f.readout.textContent = mins === 0
      ? `A collapse of ${vol} km³ of Rainier’s weakened rock, mixed with water and snow, starts down the White River. Play the minutes.`
      : `${mins} minutes: the front is ${Math.round(shown)} km down the valley${front > reach ? `, where it has stopped: ${vol} km³ spreads thin after about ${Math.round(reach)} km` : ''}. ${hit.length ? `It has buried ${hit.map((h) => h.name).join(', ')}.` : 'No town reached yet.'}`;
    if (vol >= 3.7 && hit.some((h) => h.name === 'Auburn') && t.goal === 'reached') t.done();
  };
  const vs = logSlider('Lahar volume', { value: vol, min: 0.01, max: 4, scale: 'log', step: 0.01, show: (v) => `${v} km³`, onInput: (v) => { vol = v; paint(); }, color: COL.mud });
  const ms = slider('Minutes', 0, 240, 1, 0, (v) => `${v}`, (v) => { mins = v; paint(); }, 'old');
  guessFirst(t, f, {
    ask: 'About 5,600 years ago a lahar of nearly 4 km³ swept down from Rainier. Auburn is about 100 km down the valley from the summit. Did it get that far? Guess first.',
    options: ['Yes', 'No, it stopped in the mountains'],
    answer: 0, reveal: 'done',
    sliders: [vs, ms],
    after: () => paint(),
  });
  f.controls.append(vs.node, player(ms, ctx, { seconds: 14 }).node, ms.node);
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), 'maps/rainier').then((r) => {
      relief = r;
      shade = hillshade(r, undefined, 1.5);
      ramp = heightRamp(r);
      view = mapView(r, { alt: 'A shaded relief map from Mount Rainier north-west to Auburn and Kent. A brown lahar spreads from the summit down the White River valley and out over the lowland around Enumclaw and Auburn.' });
      view.svg.append(marks);
      holder.replaceChildren(view.node, mapKey([{ text: 'Lahar', color: '#8a6d4e' }]), el('p.map-credit', {}, `Heights: ${r.meta.credit}. Lahar footprint from the LAHARZ method (Iverson and others, 1998), simplified.`));
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});

// ---- C3: the bulge and the blast -------------------------------------------------------------

/** Days from 20 March 1980; the bulge grew about 1.5 to 2.5 m a day from late March. */
export const SLIDE_DAY = 59;
/** Water in the 1980 magma, weight %. */
const HELENS_WATER = 4.6;

export const blastFigure = figure(['blasted'], (ctx, t) => {
  const H = 250;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A cross-section of Mount St Helens from south to north. A body of magma pushes into the volcano and the north flank bulges outward over weeks. Then the bulge slides away as a huge landslide, the magma under it is suddenly unloaded, and it explodes sideways to the north.');
  let day = 0;
  const paint = () => {
    const slid = day >= SLIDE_DAY;
    const grow = Math.max(0, Math.min(1, (day - 7) / (SLIDE_DAY - 7)));
    const out = grow * 26; // px of bulge, greatly exaggerated
    const base = 230;
    const peak = 60;
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: H, fill: '#e6eef3' })];
    // The cone: south flank left, north flank right, bulging.
    const north = slid
      ? `L200,${peak + 70} Q230,${peak + 110} 250,${peak + 130} L290,${base - 50} L${W},${base - 10}`
      : `Q${240 + out},${peak + 40 - out * 0.3} ${270 + out},${peak + 100} L${W},${base - 10}`;
    parts.push(svg('path', { d: `M0,${base} L120,${base - 70} L200,${peak} ${north} L${W},${H} L0,${H} Z`, fill: '#a8968a' }));
    // The magma body.
    const mx = 215 + out * 0.4;
    parts.push(svg('ellipse', { cx: mx, cy: peak + 85, rx: 22 + grow * 6, ry: 16, fill: COL.heat, opacity: 0.9 }));
    parts.push(line(200, base + 20, mx - 4, peak + 100, COL.heat, 6));
    if (slid) {
      // The landslide, the blast spreading north along the ground.
      parts.push(svg('path', { d: `M270,${base - 30} q40,10 120,18`, fill: 'none', stroke: '#7d6a58', 'stroke-width': 14, opacity: 0.6 }));
      for (let k = 0; k < 8; k++) parts.push(svg('circle', { cx: 250 + k * 20, cy: peak + 70 + k * 8, r: 12 + k * 2, fill: '#6f6a66', opacity: 0.55 }));
      parts.push(small(330, peak + 30, 'lateral blast', { anchor: 'middle', bold: true, fill: COL.bad }));
      parts.push(small(330, base - 36, 'landslide', { anchor: 'middle', bold: true, fill: '#5d4535' }));
    } else if (grow > 0) {
      parts.push(arrow(260 + out, peak + 60, 285 + out, peak + 56, COL.heat, 1.6));
      parts.push(small(292 + out, peak + 52, 'the bulge', { fill: COL.heat, bold: true }));
    }
    parts.push(small(10, 18, 'south', { soft: true }), small(W - 10, 18, 'north', { soft: true, anchor: 'end' }));
    // The pressure on the magma and its gas share.
    const depthKm = slid ? 0 : 0.9;
    const share = gasShare(HELENS_WATER, depthKm);
    parts.push(note(8, 38, slid ? 'Rock on the magma: gone' : `Rock on the magma: about ${Math.round(24.5 * depthKm)} MPa`, { bold: true }));
    parts.push(note(8, 54, `Gas share of the magma: ${Math.round(share * 100)}%`, { bold: true, fill: share >= FRAGMENTS ? COL.bad : COL.ink }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    f.readout.textContent = !slid
      ? day < 7
        ? `March 1980: small earthquakes and steam explosions. Magma is pushing up into the volcano from below, but it has not broken through. Play the weeks.`
        : `Day ${Math.round(day)}: the magma is forcing its way in under the north flank, which bulges outward about 1.5 to 2.5 m a day, ${Math.round(grow * 140)} m so far. The rock above holds the gas in the magma under pressure.`
      : `18 May, 8:32 a.m.: an earthquake shook the bulge loose, and the whole north flank slid away, the largest landslide ever recorded. With the rock gone, the pressure on the magma fell almost at once, the gas expanded to ${Math.round(share * 100)}% of the volume, and the magma blasted out sideways through the gap, flattening forest over 600 km².`;
    if (slid && t.goal === 'blasted') t.done();
  };
  const ds = slider('Days from 20 March 1980', 0, SLIDE_DAY, 1, 0, (v) => (v >= SLIDE_DAY ? '18 May' : `${v}`), (v) => { day = v; paint(); }, 'old');
  const isOpen = guessFirst(t, f, {
    ask: 'Magma full of dissolved gas sits under the bulging north flank, held in by the rock on top of it. If a landslide suddenly takes that rock away, what will the magma do? Guess first.',
    options: ['Explode, sideways through the gap', 'Ooze out slowly as lava', 'Nothing: it is still too deep'],
    answer: 0, reveal: 'done',
    sliders: [ds],
    after: () => paint(),
  });
  f.controls.append(player(ds, ctx, { seconds: 12 }).node, ds.node);
  paint();
  return f.node;
});
