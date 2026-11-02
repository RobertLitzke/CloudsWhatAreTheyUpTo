// The Seattle branch (S1-S4): the Puget lobe advancing over the lowland and
// back again on a map; the Seattle fault's quake about 900 CE in a cross-
// section, with the raised beach, the landslide into the lake and the wave;
// a bluff of sand on clay through a winter of rain (also used on Whidbey);
// and loose wet fill shaken until it liquefies.

import { el, svg } from 'didactics/dom';
import { arrow, label, line, note, redraw, small } from 'didactics/draw';
import { heightRamp, hillshade, loadRelief, mapKey, mapLabels, mapView, reliefFor, rgb, type Relief } from 'didactics/maps';
import { asset } from '../asset';
import { COL, figure, frame, guessFirst, player, slider } from './kit';
import { lonLats } from './mapkit';

const W = 400;
const ICE = rgb('#f2f6f9');
const SEA_TODAY = rgb('#a9c8dc');

// ---- S1: the Puget lobe ------------------------------------------------------------------

/** Where the ice front stood, latitude, `ya` years ago: south to Olympia by 16,900, then back north fast. */
export function frontLat(ya: number): number {
  const north = 48.75;
  const south = 47.0;
  if (ya >= 16900) return north - ((20000 - ya) / 3100) * (north - south);
  return Math.min(north, south + ((16900 - ya) / 900) * (north - south));
}
/** The ice surface, metres, `km` behind the front: the square-root profile of an ice sheet on a soft bed. */
export const iceSurface = (km: number) => (km <= 0 ? -Infinity : 4 * Math.sqrt(km * 1000));
const SEATTLE: [number, number] = [-122.33, 47.61];

export const lobeFigure = figure(['covered'], (ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 3 });
  let ya = 20000;
  let maxSeen = false;
  let relief: Relief | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let lats: Float64Array | null = null;
  let shade: Float32Array | null = null;
  let ramp: ReturnType<typeof heightRamp> | null = null;
  const marks = svg('g');
  const paint = () => {
    const front = frontLat(ya);
    const over = Math.max(0, iceSurface((SEATTLE[1] - front) * 111) - 50);
    if (ya <= 16950 && ya >= 16850) maxSeen = true;
    f.readout.textContent = front >= 48.7
      ? `${ya.toLocaleString('en-US')} years ago. The ice is still in Canada and the north of the Sound; ${ya > 17000 ? 'it is coming south.' : 'it has gone back north, and the sea has flooded in behind it.'}`
      : over > 0
        ? `${ya.toLocaleString('en-US')} years ago. The front is near latitude ${front.toFixed(1)}°. Over Seattle the ice is about ${Math.round(over / 50) * 50} m thick, flowing south. Only the Olympics and the Cascades stand above it.`
        : `${ya.toLocaleString('en-US')} years ago. The front is near latitude ${front.toFixed(1)}°, ${ya > 16900 ? 'advancing south toward Seattle' : 'north of Seattle now, wasting back'}.`;
    if (maxSeen && ya <= 16200 && t.goal === 'covered') t.done();
    if (!relief || !view || !lats || !shade || !ramp) return;
    const z = relief.z;
    view.paint({
      shade, relief: 0.85, ground: ramp,
      colorAt: (i) => {
        // Where the ice met the mountains it piled against them but did not bury them.
        const surf = Math.min(1100, iceSurface((lats![i] - front) * 111));
        return z[i] < surf ? ICE : z[i] <= 0 ? SEA_TODAY : null;
      },
    });
    redraw(marks, ...mapLabels(view, [
      { lon: SEATTLE[0], lat: SEATTLE[1], text: 'Seattle', side: 'right' },
      { lon: -122.9, lat: 47.04, text: 'Olympia', side: 'right' },
      { lon: -122.44, lat: 47.25, text: 'Tacoma', side: 'right' },
      { lon: -122.65, lat: 48.25, text: 'Whidbey Island', side: 'left' },
    ]));
  };
  const ts = slider('Years ago', 0, 100, 0.5, 0, (v) => `${Math.round(20000 - v * 45).toLocaleString('en-US')}`, (v) => { ya = Math.round(20000 - v * 45); paint(); }, 'water');
  f.controls.append(player(ts, ctx, { seconds: 18 }).node, ts.node);
  paint();
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), 'maps/puget').then((r) => {
      relief = r;
      const ll = lonLats(r);
      lats = new Float64Array(r.z.length);
      for (let i = 0; i < r.z.length; i++) {
        lats[i] = ll[i * 2 + 1];
      }
      shade = hillshade(r, undefined, 2);
      ramp = heightRamp(r);
      view = mapView(r, { alt: 'A shaded relief map of the Puget Lowland from the Canadian border to Olympia, between the Olympic Mountains and the Cascades. A sheet of ice comes south down the lowland, covers Seattle about a kilometre deep and reaches just past Olympia, then shrinks back north and the sea fills the troughs it leaves.' });
      view.svg.append(marks);
      holder.replaceChildren(view.node, mapKey([{ text: 'Ice', color: '#f2f6f9' }, { text: 'Sea today', color: '#a9c8dc' }]), el('p.map-credit', {}, `Heights: ${r.meta.credit}. Ice front and thickness simplified.`));
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});

// ---- S2: the Seattle fault --------------------------------------------------------------

const SEA = 110;
/** Pixels for the 7 m of uplift: the heights are greatly exaggerated. */
const LIFT = 24;
const FAULT_TOP: [number, number] = [150, 140];
const FAULT_BOT: [number, number] = [92, 240];
const southSurface: [number, number][] = [[0, 92], [40, 94], [46, SEA], [62, SEA], [76, 140], [FAULT_TOP[0], 140]];
const northSurface: [number, number][] = [[FAULT_TOP[0], 140], [214, 140], [232, SEA - 2], [250, 88], [292, 86], [302, 98], [306, 100]];
/** The slope above the lake, and the slab of it that fails. */
const LAKE = 102;
const slopeEnd: [number, number][] = [[306, 100], [330, 152], [400, 152]];

export const seattleFaultFigure = figure(['raised'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let s = 0;
  let isOpen: () => boolean = () => false;
  const pts = (p: [number, number][], dy = 0, dx = 0) => p.map(([x, y]) => `${x + dx},${(y + dy).toFixed(1)}`).join(' ');
  const paint = () => {
    const slip = Math.min(1, s / 12);
    const up = LIFT * slip;
    const slide = Math.max(0, Math.min(1, (s - 14) / 18));
    const waveT = s - 10;
    const hump = (x: number) => {
      if (waveT <= 0) return 0;
      const a = 9 * Math.min(1, waveT / 4);
      const c1 = 110 + waveT * 2.4;
      const c2 = 110 - waveT * 2.4;
      return a * (Math.exp(-(((x - c1) / 16) ** 2)) + (c2 > 40 ? Math.exp(-(((x - c2) / 16) ** 2)) : 0));
    };
    const surf: string[] = [];
    for (let x = 46; x <= 232; x += 3) surf.push(`${x},${(SEA - hump(x)).toFixed(1)}`);
    const reached = waveT * 2.4 + 110 >= 226;
    const slabX = 34 * slide;
    const slabY = 44 * slide;
    const slab: [number, number][] = [[292, 86], [302, 98], [312, 112], [300, 112], [290, 98]];
    const trees = [292, 298, 304].map((x, k) => {
      const bx = x + slabX;
      const by = (k === 0 ? 88 : k === 1 ? 94 : 102) + slabY;
      return [line(bx, by, bx, by - 20, '#5a4632', 2), svg('polygon', { points: `${bx - 5},${by - 6} ${bx},${by - 24} ${bx + 5},${by - 6}`, fill: '#3f6b45' })];
    }).flat();
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: 250, fill: '#f3efe6' }),
      svg('polygon', { points: `46,${SEA} ${surf.join(' ')} 232,${SEA} 232,160 46,160`, fill: '#a9c8dc' }),
      svg('rect', { x: 300, y: LAKE, width: 100, height: 60, fill: '#a9c8dc' }),
      svg('polygon', { points: `${FAULT_BOT[0]},250 ${pts(northSurface)} ${pts(slopeEnd)} 400,250`, fill: '#b9a68c' }),
      svg('polygon', { points: `0,250 ${pts(southSurface, -up)} ${FAULT_TOP[0]},${FAULT_TOP[1] - up} ${FAULT_BOT[0]},${250 - up}`, fill: '#c9b18a' }),
      line(FAULT_TOP[0], FAULT_TOP[1] - up, FAULT_BOT[0] + 4, 246, COL.heat, 2.5),
      small(FAULT_BOT[0] + 10, 236, 'Seattle fault', { fill: COL.heat, bold: true }),
      ...(slide > 0 ? [svg('polygon', { points: pts(slab, slabY, slabX), fill: '#a8916f' })] : []),
      ...trees,
      line(46, SEA - up, 62, SEA - up, slip > 0.5 ? COL.water : 'none', 2),
      small(4, 82 - up, 'Restoration Point', { bold: true }),
      small(4, 70 - up, 'south side', { fill: COL.soft }),
      small(236, 76, 'Seattle', { bold: true }),
      small(372, 76, 'north', { fill: COL.soft, anchor: 'end' }),
      small(340, LAKE - 4, 'Lake Washington', { fill: COL.water, anchor: 'middle' }),
      small(190, SEA + 22, 'Puget Sound', { fill: '#2f6385', anchor: 'middle' }),
    ];
    if (slip > 0.5) parts.push(note(20, SEA - up + 18, `old beach, now ${Math.round(7 * slip)} m up`, { fill: COL.water, bold: true }));
    if (slip > 0 && slip < 1) parts.push(arrow(70, 200, 82, 184, COL.heat, 2));
    if (reached) parts.push(small(232, SEA + 12, 'sand washed ashore', { fill: COL.sand, bold: true }), svg('rect', { x: 226, y: SEA - 3, width: 22, height: 3, fill: COL.sand }));
    parts.push(small(W - 4, 244, 'heights greatly exaggerated', { anchor: 'end', fill: COL.soft }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    f.readout.textContent = s === 0
      ? 'Before: the fault is locked. Run the quake.'
      : s < 12
        ? `${s} s. The fault slips. The south side rides up the fault over the north side, lifting the seafloor and the shore at Restoration Point.`
        : !reached
          ? `${s} s. The south side has risen about 7 m. The seafloor's jump has lifted the water above it into a wave. Shaking loosens a slab of hillside above Lake Washington${slide >= 1 ? ', which slid in with its trees still standing' : ''}.`
          : `${s} s. The wave reaches the north shore of the Sound and leaves a sheet of sand. The old beach at Restoration Point now stands 7 m above the tide, and the slab with its forest rests on the lake floor, the trees still upright.`;
    if (reached && slide >= 1 && t.goal === 'raised') t.done();
  };
  const ss = slider('Seconds', 0, 60, 1, 0, (v) => `${v} s`, (v) => { s = v; paint(); }, 'heat');
  isOpen = guessFirst(t, f, {
    ask: 'The Seattle fault is a thrust: it slopes down to the south under the city. When it slips, which side goes up? Guess first, then run the quake.',
    options: ['The south side, riding up the slope of the fault', 'The north side, under downtown', 'Neither: the ground only shakes'],
    answer: 0, reveal: 'done',
    sliders: [ss],
    after: () => paint(),
  });
  f.controls.append(player(ss, ctx, { seconds: 14 }).node, ss.node);
  paint();
  return f.node;
});

// ---- S3 and W3: a bluff of sand on clay through a winter --------------------------------------

const DAYS = 120;
/** Daily rain, mm, for three winters starting 1 December. */
export function winterRain(kind: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < DAYS; d++) {
    if (kind === 0) out.push(5);
    else if (kind === 1) out.push((d >= 20 && d < 30) || (d >= 70 && d < 80) ? 30 : 0);
    else {
      // 1996-97: a snowy Christmas, then warm rain on the snow at New Year, more storms in March.
      const storm = d >= 26 && d < 33 ? 34 : d >= 88 && d < 95 ? 26 : 0;
      out.push(storm + (d % 3 === 0 ? 4 : 2));
    }
  }
  return out;
}
/** Water stored in the sand above the clay, mm, day by day: rain soaks in, the clay lets it out slowly through the bluff face. */
export function stored(rain: readonly number[]): number[] {
  const out: number[] = [];
  let s = 0;
  for (const r of rain) {
    s += 0.8 * r - 0.06 * s;
    out.push(s);
  }
  return out;
}
/** The stored water at which the slope above the clay gives way, mm. */
export const FAILS_AT = 150;
const WINTERS = ['Steady: 5 mm every day', 'Same total, in two stormy fortnights', 'Like 1996–97'];

export const bluffFigure = figure(['failed'], (ctx, t) => {
  const f = frame(W, 270, 3);
  const g = svg('g');
  f.svg.append(g);
  let kind = 0;
  let day = 0;
  let isOpen: () => boolean = () => false;
  const CONTACT = 136;
  const TOP = 46;
  const BEACH = 196;
  const face = (y: number) => 190 + ((y - TOP) / (BEACH - TOP)) * 120; // x of the bluff face at height y
  const paint = () => {
    const rain = winterRain(kind);
    const st = stored(rain);
    const failDay = st.findIndex((v) => v >= FAILS_AT);
    const failed = failDay >= 0 && day >= failDay;
    const s = st[Math.min(day, DAYS - 1)];
    const h = Math.min(70, (s / FAILS_AT) * 60);
    const wt = CONTACT - h;
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: 270, fill: '#f3efe6' }),
      svg('rect', { x: 0, y: BEACH, width: W, height: 4, fill: 'none' }),
      svg('polygon', { points: `${face(BEACH)},${BEACH} ${W},${BEACH} ${W},206 ${face(BEACH)},206`, fill: '#a9c8dc' }),
      // clay below the contact
      svg('polygon', { points: `0,${CONTACT} ${face(CONTACT)},${CONTACT} ${face(BEACH)},${BEACH} ${face(BEACH)},206 0,206`, fill: '#9b8b7a' }),
      small(8, CONTACT + 22, 'clay and silt: lake beds laid down ahead of the ice', { fill: COL.paper, bold: true }),
    ];
    // sand above, cut back if failed
    const sandFace = failed ? [[face(TOP) - 26, TOP], [face(CONTACT) - 14, CONTACT]] : [[face(TOP), TOP], [face(CONTACT), CONTACT]];
    parts.push(svg('polygon', { points: `0,${TOP} ${sandFace[0][0]},${sandFace[0][1]} ${sandFace[1][0]},${sandFace[1][1]} 0,${CONTACT}`, fill: '#e3c98f' }));
    parts.push(small(8, TOP + 18, 'sand: outwash from the advancing ice', { fill: '#6b5631', bold: true }));
    // perched water in the sand
    if (h > 1) {
      const fx = failed ? face(wt) - 16 : face(wt);
      parts.push(svg('polygon', { points: `0,${wt} ${fx},${wt} ${failed ? face(CONTACT) - 14 : face(CONTACT)},${CONTACT} 0,${CONTACT}`, fill: '#7fb0d0', opacity: 0.7 }));
      parts.push(small(10, wt - 4, 'water held up by the clay', { fill: '#2f6385', bold: true }));
      for (let k = 0; k < 3; k++) parts.push(arrow(face(CONTACT) - 8 + k * 0, CONTACT - 4 - k * 6, face(CONTACT) + 10, CONTACT - 2 - k * 6, '#2f6385', 1.2));
    }
    if (failed) {
      parts.push(svg('polygon', { points: `${face(CONTACT) - 4},${CONTACT} ${face(BEACH) - 10},${BEACH - 22} ${face(BEACH) + 50},${BEACH - 6} ${face(BEACH) + 60},${BEACH} ${face(CONTACT) + 6},${BEACH}`, fill: '#cdb27a', stroke: '#8a744b' }));
      parts.push(label(face(BEACH) + 6, BEACH - 30, 'slide', { bold: true, fill: COL.bad }));
    }
    if (rain[Math.min(day, DAYS - 1)] > 0) for (let k = 0; k < 14; k++) parts.push(line(20 + k * 26, 8 + (k % 3) * 6, 16 + k * 26, 20 + (k % 3) * 6, '#7fa3bd', 1));
    // strip chart: daily rain and stored water
    const cy = 262;
    const ch = 46;
    parts.push(line(0, cy, W, cy, COL.grid, 1));
    for (let d = 0; d < DAYS; d++) {
      const x = 4 + (d / DAYS) * (W - 8);
      if (rain[d] > 0) parts.push(svg('rect', { x, y: cy - (rain[d] / 40) * ch, width: 2.4, height: (rain[d] / 40) * ch, fill: d <= day ? '#7fa3bd' : '#d8e2ea' }));
    }
    const wl = st.slice(0, day + 1).map((v, d) => `${(4 + (d / DAYS) * (W - 8)).toFixed(1)},${(cy - Math.min(1.2, v / FAILS_AT) * ch * 0.8).toFixed(1)}`);
    parts.push(svg('polyline', { points: wl.join(' '), fill: 'none', stroke: '#2f6385', 'stroke-width': 2 }));
    parts.push(line(4, cy - ch * 0.8, W - 4, cy - ch * 0.8, COL.bad, 1, { 'stroke-dasharray': '4 3' }));
    parts.push(small(W - 6, cy - ch * 0.8 - 3, 'slope fails', { anchor: 'end', fill: COL.bad }));
    parts.push(small(6, cy - ch + 2, 'rain each day (bars), water in the sand (line)', { fill: COL.soft }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    const date = new Date(Date.UTC(1996, 11, 1 + day)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const total = rain.slice(0, day + 1).reduce((a, b) => a + b, 0);
    f.readout.textContent = failed
      ? `${date}: ${Math.round(total)} mm of rain so far. The water above the clay rose faster than the clay and the bluff face could let it out. Soaked and heavy, with water pushing the grains apart, the sand above the clay slid onto the beach on ${new Date(Date.UTC(1996, 11, 1 + failDay)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })}.`
      : `${date}: ${Math.round(total)} mm of rain so far. Water seeps out where the sand meets the clay. ${s > FAILS_AT * 0.6 ? 'The water in the sand is getting high.' : 'It drains about as fast as it comes in.'}`;
    if (failed && t.goal === 'failed') t.done();
  };
  const ks = slider('Winter', 0, 2, 1, 0, (v) => WINTERS[v], (v) => { kind = v; paint(); }, 'water');
  const ds = slider('Day', 0, DAYS - 1, 1, 0, (v) => new Date(Date.UTC(1996, 11, 1 + v)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }), (v) => { day = v; paint(); }, 'old');
  isOpen = guessFirst(t, f, {
    ask: 'Two winters bring the bluff the same 600 mm of rain. In one, a little falls every day. In the other, it all comes in two stormy fortnights. Which brings the bluff down? Guess first, then play both winters.',
    options: ['The steady winter', 'The stormy winter', 'Neither: it is the same amount of water', 'Both'],
    answer: 1, reveal: 'done',
    sliders: [ks, ds],
    after: () => paint(),
  });
  f.controls.append(ks.node, player(ds, ctx, { seconds: 14 }).node, ds.node);
  paint();
  return f.node;
});

// ---- S4: liquefaction -------------------------------------------------------------------------

/** How fast the water pressure between loose grains builds, per second, at a peak shaking of `g`. Dense ground never gets there. */
export const buildRate = (g: number, loose: boolean) => (loose ? Math.max(0, g - 0.08) * 0.35 : Math.max(0, g - 0.6) * 0.35);
const SHAKE_S = 30;

export const liquefyFigure = figure(['liquefied'], (ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let peak = 0.05;
  let sec = 0;
  let isOpen: () => boolean = () => false;
  const box = (x0: number, loose: boolean): (SVGElement | null)[] => {
    const ru = Math.min(1, buildRate(peak, loose) * sec);
    const liqAt = buildRate(peak, loose) > 0 ? 1 / buildRate(peak, loose) : Infinity;
    const after = Math.max(0, sec - liqAt);
    const sink = Math.min(30, after * 4);
    const tilt = Math.min(8, after * 1.2);
    const jig = sec > 0 && sec < SHAKE_S ? Math.sin(sec * 7.3) * peak * 10 : 0;
    const out: (SVGElement | null)[] = [
      svg('rect', { x: x0, y: 90, width: 170, height: 110, fill: loose ? '#9cc3dc' : '#c7b89d', stroke: COL.ink, 'stroke-width': 1 }),
    ];
    const gap = loose ? 1 + ru * 2.2 : 0;
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 11; c++) {
        const x = x0 + 9 + c * 15 + (r % 2) * 7 + jig + (loose ? Math.sin(r * 3 + c) * gap : 0);
        const y = 100 + r * 14.5 + (loose ? Math.cos(r + c * 2) * gap : 0);
        out.push(svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: loose ? 6.2 : 7.2, fill: loose ? '#e3c98f' : '#a99572', stroke: '#6b5631', 'stroke-width': 0.6 }));
      }
    const bx = x0 + 55 + jig;
    out.push(svg('g', { transform: `rotate(${tilt} ${bx + 30} ${90 + sink})` },
      svg('rect', { x: bx, y: 30 + sink, width: 60, height: 60, fill: '#e9e2d0', stroke: COL.ink }),
      ...[0, 1].flatMap((r) => [0, 1, 2].map((c) => svg('rect', { x: bx + 8 + c * 17, y: 38 + sink + r * 24, width: 10, height: 12, fill: '#a9c8dc' }))),
    ));
    if (ru >= 1) out.push(svg('path', { d: `M${x0 + 140},90 q-4,-14 0,-22 q4,8 0,22`, fill: '#8aa8bc' }), small(x0 + 128, 62, 'sand boil', { fill: '#2f6385', bold: true }));
    out.push(label(x0 + 85, 218, loose ? 'loose wet fill' : 'dense glacial soil', { anchor: 'middle', bold: true, size: 'note' }));
    out.push(small(x0 + 85, 228, `water pressure ${Math.round(ru * 100)}% of the weight`, { anchor: 'middle', fill: ru >= 1 ? COL.bad : COL.soft }));
    return out;
  };
  const paint = () => {
    redraw(g, svg('rect', { width: W, height: 230, fill: '#f3efe6' }), ...box(20, false), ...box(210, true));
    if (!isOpen()) return;
    const ruL = Math.min(1, buildRate(peak, true) * sec);
    f.readout.textContent = sec === 0
      ? `Peak shaking ${peak.toFixed(2)} g. Start the quake.`
      : ruL >= 1
        ? `${sec} s at ${peak.toFixed(2)} g. In the fill, each shake packed the loose grains a little tighter and squeezed the water between them. The water could not escape fast enough, its pressure rose until it carried the whole weight, and the grains lost touch: the sand flows like a liquid, the building sinks and tilts, and water and sand spout at the surface. The dense soil, already tightly packed, holds.`
        : `${sec} s at ${peak.toFixed(2)} g. The water pressure between the loose grains is ${Math.round(ruL * 100)}% of the weight they carry. ${peak < 0.1 ? 'Shaking this gentle never gets there.' : 'It is still rising.'}`;
    if (ruL >= 1 && t.goal === 'liquefied') t.done();
  };
  const ps = slider('Peak shaking', 0.05, 0.4, 0.01, peak, (v) => `${v.toFixed(2)} g`, (v) => { peak = v; paint(); }, 'heat');
  const ss = slider('Seconds of shaking', 0, SHAKE_S, 1, 0, (v) => `${v} s`, (v) => { sec = v; paint(); }, 'old');
  isOpen = guessFirst(t, f, {
    ask: 'The same earthquake shakes two buildings. One stands on dense soil the glaciers packed down. The other stands on loose sand pumped in as fill a century ago, soaked with seawater. What happens to the building on fill? Guess first.',
    options: ['It sinks and tilts as the sand starts to flow like a liquid', 'Nothing different: sand is sand', 'It is safer, because loose sand soaks up the shaking'],
    answer: 0, reveal: 'done',
    sliders: [ps, ss],
    after: () => paint(),
  });
  f.controls.append(ps.node, player(ss, ctx, { seconds: 10 }).node, ss.node);
  paint();
  return f.node;
});
