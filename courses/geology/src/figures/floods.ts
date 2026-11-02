// The ice age floods branch (F1-F4): a flood that spills out of its valley
// across low divides; a waterfall that cuts back through basalt; the ice dam
// that floats; Lake Missoula filling for decades and emptying in days across
// a map; flood beds piling up in a valley with years between them; and
// icebergs stranding Montana rocks in the Willamette Valley.

import { el, svg } from 'didactics/dom';
import { arrow, line, note, redraw, small } from 'didactics/draw';
import { heightRamp, hillshade, loadRelief, mapKey, mapLabels, mapLines, mapView, reliefFor, rgb, type Relief } from 'didactics/maps';
import { asset } from '../asset';
import { slider as logSlider } from 'didactics/figure';
import { COL, figure, frame, guessFirst, player, slider } from './kit';
import { cellOf, fillLevels, inside, lonLats } from './mapkit';

const W = 400;
const WATER = rgb('#4f8fc0');
const ICE = rgb('#eef3f6');

// ---- F1: a flood too big for its valley ------------------------------------------------------

/** Depth of water in a valley like the Spokane's for a flow of `q` cubic metres a second (a rough rating curve). */
export const floodDepth = (q: number) => 3 * (q / 1000) ** 0.42;
/** Heights of the divides between the river's valley and each channel beyond, metres above the valley floor, west to east. */
export const DIVIDES = [35, 70, 105, 140] as const;

export const spillFigure = figure(['spilled'], (_ctx, t) => {
  const H = 250;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'Top: a cross-section of a plateau with a river valley on the left and four shallower valleys beyond it, separated by low divides. Below: the same plateau from above, with the channels that carry water shown in blue and dry ground between them.');
  let q = 5000;
  const paint = () => {
    const d = floodDepth(q);
    const open = DIVIDES.filter((_h, k) => DIVIDES.slice(0, k + 1).every((x) => d > x)).length;
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    // Cross-section: the river valley and four channels.
    const base = 112;
    const M = 0.45; // px per metre
    const floors = [0, 10, 25, 30, 45];
    const xs = [40, 120, 200, 280, 360];
    const pts: string[] = ['0,' + (base - 170 * M)];
    xs.forEach((x, k) => {
      pts.push(`${x - 22},${base - (k === 0 ? 170 : DIVIDES[k - 1]) * M}`, `${x - 8},${base - floors[k] * M}`, `${x + 8},${base - floors[k] * M}`);
      pts.push(`${x + 22},${base - (DIVIDES[k] ?? 170) * M}`);
    });
    pts.push(`${W},${base - 170 * M}`, `${W},${base + 14}`, `0,${base + 14}`);
    parts.push(svg('polygon', { points: pts.join(' '), fill: '#b9a183' }));
    const level = base - d * M;
    for (let k = 0; k <= open; k++) {
      const top = Math.max(level, base - (k ? DIVIDES[k - 1] : 0) * M - 1);
      const lv = k === 0 ? level : Math.min(base - floors[k] * M, Math.max(level + (k * 8), base - (floors[k] + 12) * M));
      parts.push(svg('rect', { x: xs[k] - 20, y: Math.min(top, lv), width: 40, height: Math.max(0, base - floors[k] * M - Math.min(top, lv)), fill: COL.water, opacity: 0.7 }));
    }
    parts.push(small(xs[0], base + 26, 'the river’s valley', { anchor: 'middle', soft: true }));
    DIVIDES.forEach((h, k) => parts.push(small(xs[k] + 40, base - h * M - 6, `${h} m`, { anchor: 'middle', soft: true })));
    // Plan view: channels running south-west across the plateau.
    const top = 150;
    parts.push(svg('rect', { x: 0, y: top, width: W, height: H - top, fill: '#e2d4b4' }));
    xs.forEach((x, k) => {
      const wet = k <= open;
      const w = k === 0 ? 16 : 9;
      parts.push(svg('path', { d: `M${x},${top} C${x - 10},${top + 30} ${x + 14},${top + 60} ${x - 6},${H}`, fill: 'none', stroke: wet ? COL.water : '#cbb994', 'stroke-width': wet ? w : 3, opacity: wet ? 0.85 : 1 }));
      if (k > 0 && k < xs.length && wet && k <= open) {
        parts.push(svg('path', { d: `M${xs[k - 1] + 6},${top + 40 + k * 6} Q${(xs[k - 1] + x) / 2},${top + 30 + k * 8} ${x - 4},${top + 52 + k * 4}`, fill: 'none', stroke: COL.water, 'stroke-width': 4, opacity: 0.7 }));
      }
    });
    parts.push(small(6, top + 12, 'from above', { bold: true, soft: true }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    f.readout.textContent = open === 0
      ? `${Math.round(q).toLocaleString('en-GB')} m³/s fills the valley about ${Math.round(d)} m deep. The water stays in its valley, as every river ever measured would.`
      : `${Math.round(q).toLocaleString('en-GB')} m³/s fills the valley about ${Math.round(d)} m deep. It pours over ${open === 1 ? 'the lowest divide' : `${open} divides`} into the next valley${open > 1 ? 's' : ''}, so ${open + 1} channels carry water at once, splitting and rejoining around islands of higher ground.`;
    if (open >= 3 && t.goal === 'spilled') t.done();
  };
  const qs = logSlider('Flow', { value: q, min: 1000, max: 20_000_000, scale: 'log', show: (v) => `${v >= 1e6 ? `${(v / 1e6).toFixed(1)} million` : Math.round(v).toLocaleString('en-GB')} m³/s`, onInput: (v) => { q = v; paint(); }, color: COL.water });
  const isOpen = guessFirst(t, f, {
    ask: 'The Mississippi’s biggest recorded flood carried about 70,000 cubic metres of water a second. On this plateau, would a flood that size escape from the river’s valley into the next one? Guess first.',
    options: ['Yes, over the lowest divide', 'No, it would stay in its valley'],
    answer: 1,
    sliders: [qs],
    after: () => paint(),
  });
  f.controls.append(qs.node);
  paint();
  return f.node;
});

/** How fast a cataract cuts back through jointed basalt, km a day, under water `depth` metres deep at its lip. */
export const retreatRate = (depth: number) => Math.max(0, (depth - 10) / 90) * 0.35;

export const cataractFigure = figure(['retreated'], (ctx, t) => {
  const H = 220;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A cross-section of a coulee floor made of layers of columnar basalt, with a waterfall where the water drops over a cliff. As flood time passes, blocks of basalt are torn from the cliff and the waterfall moves upstream, leaving a deeper canyon behind it.');
  let depth = 60;
  let days = 0;
  const done = { km: 0 };
  const paint = () => {
    const km = retreatRate(depth) * days;
    done.km = Math.max(done.km, km);
    const PX = 22; // px per km
    const lip = 300 - km * PX;
    const top = 90;
    const drop = 70;
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: H, fill: '#e6eef3' })];
    // Basalt above the cliff (upstream, left) and the canyon floor below it (right).
    parts.push(svg('polygon', { points: `0,${top} ${lip},${top} ${lip},${top + drop} ${W},${top + drop} ${W},${H} 0,${H}`, fill: '#5d5a5c' }));
    for (let k = 0; k < 3; k++) parts.push(line(0, top + 22 + k * 24, lip, top + 22 + k * 24, '#7a7678', 1));
    for (let x = 6; x < lip; x += 9) parts.push(line(x, top, x, top + drop, '#4a4749', 0.7));
    // Water over the lip.
    const wd = Math.min(60, depth * 0.5);
    parts.push(svg('polygon', { points: `0,${top - wd} ${lip},${top - wd} ${lip + 20},${top + drop - wd * 0.6} ${W},${top + drop - wd * 0.6} ${W},${top + drop} ${lip},${top + drop} ${lip},${top} 0,${top}`, fill: COL.water, opacity: depth > 0 ? 0.55 : 0 }));
    // Plucked blocks scattered downstream.
    const blocks = Math.min(30, Math.round(km * 4));
    for (let k = 0; k < blocks; k++) parts.push(svg('rect', { x: lip + 30 + ((k * 37) % (W - lip - 40 > 0 ? W - lip - 40 : 1)), y: top + drop - 6 - (k % 3) * 3, width: 6, height: 5, fill: '#77726f', transform: `rotate(${(k * 23) % 40} ${lip + 30} ${top + drop})` }));
    parts.push(line(300, top - 62, 300, top + drop, COL.ink, 1, { 'stroke-dasharray': '3 3' }));
    parts.push(small(304, top - 54, 'where the falls began', { soft: true }));
    if (km > 0.2) parts.push(arrow(298, top - 44, lip + 2, top - 44, COL.heat, 1.6));
    parts.push(note(8, 18, `${days} days of flood: the falls have cut back ${km.toFixed(1)} km`, { bold: true }));
    redraw(g, ...parts);
    f.readout.textContent = depth <= 10
      ? `Water ${depth} m deep at the lip is too weak to tear blocks out of the basalt. The cliff stays put however long it runs, as Dry Falls has for 15,000 years.`
      : `Water ${depth} m deep pours over the lip and swirls at its foot. It pries apart the basalt along the cracks between its columns and carries the blocks away, so the cliff falls back upstream about ${(retreatRate(depth)).toFixed(2)} km a day.`;
    if (done.km >= 5 && t.goal === 'retreated') t.done();
  };
  const ds = slider('Water depth at the lip', 0, 100, 1, depth, (v) => `${v} m`, (v) => { depth = v; paint(); }, 'water');
  const ts = slider('Days of flood', 0, 30, 1, 0, (v) => `${v}`, (v) => { days = v; paint(); }, 'old');
  f.controls.append(ds.node, player(ts, ctx, { seconds: 10 }).node, ts.node);
  paint();
  return f.node;
});

// ---- F2: the ice dam that floats -------------------------------------------------------------

/** Ice is about nine-tenths as dense as water: a dam floats once the lake is this deep against it. */
export const FLOATS_AT = 917 / 1000;

export const damFigure = figure(['floated'], (ctx, t) => {
  const H = 230;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A cross-section of a valley blocked by a glacier. Behind the ice, a lake rises year by year. When the water is deep enough, the ice dam lifts off its bed, water rushes underneath, and the dam breaks apart as the lake drains.');
  let ice = 700;
  let years = 0;
  const RATE = 13; // metres of lake rise a year, about what the Clark Fork could supply
  const paint = () => {
    const full = ice * FLOATS_AT;
    const fillYears = full / RATE;
    const broke = years >= fillYears;
    const lake = broke ? Math.max(0, full - (years - fillYears) * full * 4) : years * RATE;
    const M = 0.17;
    const floor = 205;
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: H, fill: '#e6eef3' })];
    parts.push(svg('polygon', { points: `0,${floor - 200} 30,${floor - 40} ${W - 30},${floor - 30} ${W},${floor - 210} ${W},${H} 0,${H}`, fill: '#a8968a' }));
    if (lake > 0) parts.push(svg('rect', { x: 20, y: floor - lake * M, width: 240, height: lake * M, fill: COL.water, opacity: 0.7 }));
    const lift = broke ? 8 : 0;
    if (!broke || lake > full * 0.3) {
      const iceTop = floor - ice * M - lift;
      parts.push(svg('polygon', { points: `260,${floor - lift} 260,${iceTop + 6} 300,${iceTop} ${W},${iceTop - 20} ${W},${floor - lift}`, fill: '#f2f6f8', stroke: '#9cc0d6', 'stroke-width': 1.2, opacity: broke ? 0.6 : 1 }));
      if (broke) parts.push(svg('rect', { x: 260, y: floor - lift, width: W - 260, height: lift, fill: COL.water, opacity: 0.8 }));
    }
    parts.push(line(250, floor - full * M, 268, floor - full * M, COL.bad, 1.5, { 'stroke-dasharray': '3 2' }));
    parts.push(small(246, floor - full * M + 3, 'floats here', { anchor: 'end', fill: COL.bad, bold: true }));
    parts.push(small(330, floor - ice * M + 16, `ice dam ${ice} m`, { anchor: 'middle', bold: true, fill: '#4f7a94' }));
    parts.push(note(8, 18, broke ? `The dam has failed` : `Year ${Math.round(years)}: the lake is ${Math.round(lake)} m deep at the dam`, { bold: true }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    f.readout.textContent = !broke
      ? `The Clark Fork River keeps running into the valley, but the ice blocks its way out, so the lake rises about ${RATE} m a year. The ice is ${ice} m thick; the lake is ${Math.round(lake)} m deep against it.`
      : `When the lake reached ${Math.round(full)} m, about nine-tenths of the ice’s thickness, the water pressing on the bottom of the dam matched the ice’s weight. The dam lifted, water forced its way underneath, tunnels widened in hours, and the dam broke up. The lake emptied in a few days.`;
    if (broke && t.goal === 'floated') t.done();
  };
  const is = slider('Ice dam thickness', 400, 800, 20, ice, (v) => `${v} m`, (v) => { ice = v; paint(); }, 'water');
  const ys = slider('Years', 0, 70, 0.5, 0, (v) => `${v}`, (v) => { years = v; paint(); }, 'old');
  const isOpen = guessFirst(t, f, {
    ask: 'A glacier 700 m thick blocks a valley, and a lake rises behind it. How deep must the lake get against the ice before the dam gives way? Guess first.',
    options: ['About half as deep as the ice is thick', 'About nine-tenths as deep', 'Deep enough to spill over the top'],
    answer: 1, reveal: 'done',
    sliders: [is, ys],
    after: () => paint(),
  });
  f.controls.append(is.node, player(ys, ctx, { seconds: 12 }).node, ys.node);
  paint();
  return f.node;
});

/** The ice: the Purcell lobe damming the Clark Fork, the Cordilleran ice to the north, and the Flathead lobe. */
const ICE_OUTLINES: (readonly [number, number])[][] = [
  [[-117.2, 49.0], [-116.0, 49.0], [-116.0, 47.85], [-116.5, 47.75], [-117.2, 47.85]],
  [[-117.4, 49.1], [-113.5, 49.1], [-113.5, 48.25], [-117.4, 48.25]],
  [[-114.75, 48.3], [-113.6, 48.3], [-113.6, 47.72], [-114.0, 47.66], [-114.3, 47.66], [-114.75, 47.72]],
];
/** The lake's highest shoreline, metres. */
export const LAKE_TOP = 1280;
/** Where the floodwater ran, west of the dam: [lon, lat] paths. */
const ROUTES: [number, number][][] = [
  [[-116.35, 48.1], [-116.85, 47.8], [-117.42, 47.66], [-117.58, 47.49], [-117.9, 47.2], [-118.2, 46.85], [-118.22, 46.59], [-118.7, 46.35], [-119.1, 46.24], [-118.95, 46.06], [-119.35, 45.92], [-120.2, 45.73], [-121.18, 45.6], [-121.4, 45.65]],
  [[-117.42, 47.66], [-118.0, 47.45], [-118.45, 47.2], [-118.9, 47.0], [-119.17, 46.83], [-119.1, 46.24]],
  [[-117.42, 47.66], [-117.9, 47.85], [-118.25, 47.92], [-118.98, 47.95], [-119.32, 47.61], [-119.49, 47.39], [-119.6, 47.18], [-119.3, 46.95], [-119.17, 46.83]],
];
/** Hours from the dam to each point along a route, at an average 20 km/h (a rough figure). */
const KMH = 20;

export const missoulaFigure = figure(['drained'], (ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 4 });
  const FILL = 50; // years the lake takes to fill, on the slider
  let pos = 0;
  let relief: Relief | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let need: Float32Array | null = null;
  let iceMask: Uint8Array | null = null;
  let shade: Float32Array | null = null;
  let ramp: ReturnType<typeof heightRamp> | null = null;
  const marks = svg('g');
  const levelAt = (p: number) => {
    if (p <= FILL) return 750 + (LAKE_TOP - 750) * Math.sqrt(p / FILL);
    const hours = ((p - FILL) / (100 - FILL)) * 72;
    return Math.max(750, LAKE_TOP - (LAKE_TOP - 750) * Math.min(1, hours / 48) ** 0.7);
  };
  const paint = () => {
    const filling = pos < FILL;
    const hours = filling ? 0 : ((pos - FILL) / (100 - FILL)) * 72;
    const level = levelAt(pos);
    f.readout.textContent = filling
      ? `Year ${Math.round(pos)}. The ice blocks the Clark Fork, and the lake behind it creeps up the valleys of western Montana: it now stands at ${Math.round(level)} m above sea level.`
      : hours === 0
        ? `The lake has reached ${LAKE_TOP} m, about 600 m deep at the dam, holding some 2,000 km³ of water. The ice dam floats and breaks.`
        : `${Math.round(hours)} hours after the dam broke. The lake is down to ${Math.round(level)} m. The water has poured across the Rathdrum Prairie into the Spokane valley and spread over the plateau in several channels at once, ${hours < 30 ? 'heading for the narrow gap at Wallula' : 'and backed up behind Wallula Gap before squeezing through the Columbia Gorge toward the sea'}.`;
    if (hours >= 60 && t.goal === 'drained') t.done();
    if (!relief || !view || !need || !iceMask || !shade || !ramp) return;
    const ground = ramp;
    view.paint({
      shade, relief: 0.85, ground,
      colorAt: (i) => (iceMask![i] ? ICE : need![i] <= level ? WATER : null),
    });
    const reach = hours * KMH;
    const lines = ROUTES.map((r, k) => {
      // The part of each route the water has reached by now.
      const start = k === 0 ? 0 : 90; // side routes start at Spokane, about 90 km from the dam
      const got = reach - start;
      if (got <= 0) return null;
      const pts: [number, number][] = [r[0]];
      let d = 0;
      for (let j = 1; j < r.length; j++) {
        const seg = Math.hypot((r[j][0] - r[j - 1][0]) * 75, (r[j][1] - r[j - 1][1]) * 111);
        if (d + seg <= got) {
          pts.push(r[j]);
          d += seg;
        } else {
          const u = (got - d) / seg;
          pts.push([r[j - 1][0] + (r[j][0] - r[j - 1][0]) * u, r[j - 1][1] + (r[j][1] - r[j - 1][1]) * u]);
          break;
        }
      }
      return { points: pts, color: '#2f6f9f', width: k === 0 ? 7 : 5 };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
    redraw(marks, ...(hours > 0 ? mapLines(view, lines) : []), ...mapLabels(view, [
      { lon: -114.0, lat: 46.87, text: 'Missoula', side: 'right' },
      { lon: -116.35, lat: 48.1, text: 'ice dam', side: 'above' },
      { lon: -117.42, lat: 47.66, text: 'Spokane', side: 'below' },
      { lon: -118.9, lat: 46.03, text: 'Wallula Gap', side: 'left' },
      { lon: -119.32, lat: 47.61, text: 'Dry Falls', side: 'left' },
    ]));
  };
  const ts = slider('Time', 0, 100, 0.5, 0, (v) => (v < FILL ? `year ${Math.round(v)} of filling` : `${Math.round(((v - FILL) / (100 - FILL)) * 72)} hours after the dam broke`), (v) => { pos = v; paint(); }, 'water');
  f.controls.append(player(ts, ctx, { seconds: 20 }).node, ts.node);
  paint();
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), 'maps/missoula').then((r) => {
      relief = r;
      const ll = lonLats(r);
      const ground = new Float32Array(r.z);
      iceMask = new Uint8Array(r.z.length);
      for (let i = 0; i < r.z.length; i++) {
        const lon = ll[i * 2];
        const lat = ll[i * 2 + 1];
        if (ICE_OUTLINES.some((o) => inside(lon, lat, o))) {
          ground[i] = Math.max(ground[i], 1500);
          if (r.z[i] < 1900) iceMask[i] = 1;
        }
      }
      need = fillLevels(r, ground, cellOf(r, -114.0, 46.87));
      shade = hillshade(r, undefined, 2);
      ramp = heightRamp(r);
      view = mapView(r, { alt: 'A shaded relief map from the Cascades to western Montana. Ice blocks the Clark Fork valley at the Idaho border; behind it a lake fills the valleys around Missoula. When the dam breaks, the lake shrinks and floodwater spreads west across eastern Washington to Wallula Gap and the Columbia Gorge.' });
      view.svg.append(marks);
      holder.replaceChildren(view.node, mapKey([{ text: 'Ice', color: '#eef3f6' }, { text: 'Lake and floodwater', color: '#4f8fc0' }]), el('p.map-credit', {}, `Heights: ${r.meta.credit}. Ice outlines simplified; flood routes and timing approximate.`));
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});

// ---- F3: beds with years between them ---------------------------------------------------------

/** Floods that left beds at Burlingame Canyon in Waitt's count, roughly. */
export const BEDS_SEEN = 40;
/** The flood after which Mount St Helens ash fell, in this sketch (the set S ashes lie high in the pile). */
const ASH_AFTER = 28;

export const bedsFigure = figure(['counted'], (ctx, t) => {
  const H = 250;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A cut through a valley floor built up by flood beds. Each flood leaves a bed that grades from sand at the bottom to silt at the top. With years between floods, burrows dug down from the top of a bed are filled by the next bed, and a thin layer of volcanic ash lies between two beds.');
  let gap = 0;
  let n = 0;
  const paint = () => {
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: H, fill: '#e9e2d0' })];
    const bot = 236;
    const bh = 5;
    for (let k = 0; k < n; k++) {
      const y = bot - (k + 1) * bh;
      parts.push(svg('rect', { x: 20, y, width: 300, height: bh, fill: k % 2 ? '#cbb68f' : '#d8c59f' }));
      parts.push(svg('rect', { x: 20, y, width: 300, height: 1.6, fill: '#a9967a' }));
      if (gap >= 1 && k < n - 1) {
        for (let b = 0; b < 3; b++) {
          const bx = 40 + ((k * 71 + b * 97) % 260);
          parts.push(svg('path', { d: `M${bx},${y} q2,6 -1,${bh + 4}`, fill: 'none', stroke: '#7d6a50', 'stroke-width': 1.4 }));
        }
      }
      if (k === ASH_AFTER && n > ASH_AFTER + 1) parts.push(svg('rect', { x: 20, y: y - 1.2, width: 300, height: 1.6, fill: gap >= 1 ? '#f4f1ea' : '#e2dbc9' }));
    }
    parts.push(svg('rect', { x: 20, y: bot, width: 300, height: H - bot, fill: '#8b7a66' }));
    if (n > ASH_AFTER + 1) parts.push(small(326, bot - (ASH_AFTER + 1) * bh + 3, gap >= 1 ? 'ash layer' : 'ash, mixed in', { fill: COL.ink, bold: true }));
    parts.push(small(326, bot - n * bh + 4, n ? `${n} beds` : '', { bold: true }));
    parts.push(note(8, 18, gap === 0 ? 'All in one flood, surge after surge' : `${gap} years between floods`, { bold: true }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    f.readout.textContent = n === 0
      ? 'An empty side valley off the flood route. Play the floods.'
      : gap === 0
        ? `${n} beds, laid one on another within days. Nothing lived on any of them, so no burrows cross from one bed to the next, and ash falling during the flood would be stirred into the water.`
        : `${n} beds with ${gap} years between floods. Each bed dried out and ground squirrels dug into it before the next flood buried their burrows with its own sand. Mount St Helens ash settled on one dry bed as a thin, clean layer.`;
    if (gap >= 10 && n >= BEDS_SEEN && t.goal === 'counted') t.done();
  };
  const gs = slider('Years between floods', 0, 80, 1, gap, (v) => (v === 0 ? 'none' : `${v}`), (v) => { gap = v; paint(); }, 'old');
  const ns = slider('Floods', 0, BEDS_SEEN, 1, 0, (v) => `${v}`, (v) => { n = v; paint(); }, 'water');
  const isOpen = guessFirst(t, f, {
    ask: 'Waitt found animal burrows dug down from the top of one flood bed and filled with the sand of the next. What does that say about the two floods? Guess first.',
    options: ['They were separate floods, with time between them for animals to live on the dry bed', 'They were two surges of the same flood, minutes apart', 'Nothing: burrows can form underwater'],
    answer: 0,
    sliders: [gs, ns],
    after: () => paint(),
  });
  f.controls.append(gs.node, player(ns, ctx, { seconds: 12 }).node, ns.node);
  paint();
  return f.node;
});

// ---- F4: icebergs in the Willamette Valley ------------------------------------------------------

/** The point a share `u` of the way along a path. */
function along(path: [number, number][], u: number): [number, number] {
  const seg = path.slice(1).map((p, k) => Math.hypot(p[0] - path[k][0], (p[1] - path[k][1]) * 1.4));
  let d = u * seg.reduce((a, b) => a + b, 0);
  for (let k = 0; k < seg.length; k++) {
    if (d <= seg[k]) {
      const f = seg[k] ? d / seg[k] : 0;
      return [path[k][0] + (path[k + 1][0] - path[k][0]) * f, path[k][1] + (path[k + 1][1] - path[k][1]) * f];
    }
    d -= seg[k];
  }
  return path[path.length - 1];
}
interface Berg { from: [number, number]; to: [number, number]; draft: number }
/** Bergs afloat along the middle of the valley, each drifting toward somewhere else in it, each with its own draft (m). */
const BERGS: Berg[] = Array.from({ length: 24 }, (_, k) => {
  const a = (k * 0.618) % 1;
  const b = (k * 0.381 + 0.17) % 1;
  return { from: along([[-122.78, 45.3], [-123.02, 44.95]], (k % 8) / 8), to: [-123.4 + a * 0.75, 44.85 + b * 0.45], draft: 15 + ((k * 7) % 30) };
});
/** Highest water at Portland during the largest floods, metres above today's sea level. */
export const FLOOD_TOP = 120;

export const bergsFigure = figure(['stranded'], (ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 4 });
  let pos = 0; // 0..100: water rising to 50, falling after
  let relief: Relief | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let need: Float32Array | null = null;
  let shade: Float32Array | null = null;
  let ramp: ReturnType<typeof heightRamp> | null = null;
  const marks = svg('g');
  const levelAt = (p: number) => (p <= 50 ? FLOOD_TOP * Math.sin((p / 50) * (Math.PI / 2)) : FLOOD_TOP * Math.cos(((p - 50) / 50) * (Math.PI / 2)));
  /** Where each berg is at `p`, and whether it has run aground; run forward from the start each time, which is cheap. */
  const track = (p: number) => BERGS.map((b, k) => {
    let at: [number, number] = b.from;
    let stuck = false;
    const start = 26 + k * 0.6; // bergs arrive one after another while the water is high
    const depthAt = (q: [number, number], lvl: number) => (relief ? lvl - relief.z[cellOf(relief, q[0], q[1])] : lvl);
    let u = 0;
    for (let s = start; s <= p; s += 1) {
      const lvl = levelAt(s);
      // Ground where it floats if the water has fallen under its keel; otherwise drift on where the water is deep enough.
      if (depthAt(at, lvl) < b.draft) { stuck = true; break; }
      const nu = Math.min(1, u + 1 / 30);
      const next = along([b.from, b.to], nu);
      if (depthAt(next, lvl) >= b.draft) { at = next; u = nu; }
    }
    return { at, stuck, afloat: p >= start, z: relief ? relief.z[cellOf(relief, at[0], at[1])] : 0 };
  });
  const paint = () => {
    const level = levelAt(pos);
    const where = track(pos);
    const aground = where.filter((w) => w.stuck);
    const top = aground.length ? Math.max(...aground.map((w) => w.z)) : 0;
    f.readout.textContent = pos === 0
      ? 'The Willamette Valley before the flood. Water backing up the Columbia from the narrow gorge at Kalama will flood it. Play the flood.'
      : `${pos <= 50 ? 'The water is rising' : 'The water is draining away'}: ${Math.round(level)} m above today’s sea level at Portland. ${aground.length} of the ${BERGS.length} icebergs have run aground${aground.length ? `, the highest at about ${Math.round(top)} m, where the water was shallower than the ice was deep` : ''}.`;
    if (pos >= 100 && t.goal === 'stranded') t.done();
    if (!relief || !view || !need || !shade || !ramp) return;
    view.paint({ shade, relief: 0.85, ground: ramp, colorAt: (i) => (need![i] <= level ? WATER : null) });
    redraw(marks, ...where.filter((w) => w.afloat).flatMap((w) => {
      const [x, y] = view!.xy(w.at[0], w.at[1]);
      return [w.stuck
        ? svg('circle', { cx: x, cy: y, r: 3.4, fill: COL.fossil, stroke: COL.paper, 'stroke-width': 1 })
        : svg('polygon', { points: `${x - 4},${y + 2} ${x},${y - 4} ${x + 4},${y + 2}`, fill: '#f6fbff', stroke: '#6f9fbf', 'stroke-width': 1 })];
    }), ...mapLabels(view, [
      { lon: -122.68, lat: 45.52, text: 'Portland', side: 'right' },
      { lon: -123.03, lat: 44.94, text: 'Salem', side: 'right' },
      { lon: -123.36, lat: 45.11, text: 'Erratic Rock', side: 'left' },
    ]));
  };
  const ts = slider('Flood', 0, 100, 1, 0, (v) => (v === 0 ? 'before' : v <= 50 ? 'rising' : v < 100 ? 'draining' : 'over'), (v) => { pos = v; paint(); }, 'water');
  guessFirst(t, f, {
    ask: 'Icebergs from the broken ice dam, some carrying boulders from Montana, float into the flooded valley. Where will most of their boulders end up? Guess first.',
    options: ['On the valley floor, under the deepest water', 'Around the edges and up the sides, where the water was shallow', 'All in one pile at the valley’s entrance'],
    answer: 1, reveal: 'done',
    sliders: [ts],
    after: () => paint(),
  });
  f.controls.append(player(ts, ctx, { seconds: 14 }).node, ts.node);
  paint();
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), 'maps/willamette').then((r) => {
      relief = r;
      need = fillLevels(r, r.z, cellOf(r, -122.76, 45.9));
      shade = hillshade(r, undefined, 3);
      ramp = heightRamp(r);
      view = mapView(r, { alt: 'A shaded relief map of the northern Willamette Valley from Portland to south of Salem, between the Coast Range and the Cascades. Floodwater fills the valley floor and then drains; icebergs drift in from Portland and run aground around the valley edges.' });
      view.svg.append(marks);
      holder.replaceChildren(view.node, el('p.map-credit', {}, `Heights: ${r.meta.credit}. Water level and icebergs simplified.`));
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});
