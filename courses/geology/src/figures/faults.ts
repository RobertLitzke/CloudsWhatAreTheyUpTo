// Lesson 18, Why faults snap: a fence across a locked fault, bent by the
// plates and broken by the earthquake (Reid's elastic rebound, played as a
// time lapse); a block on a spring that sticks and slips, where how hard the
// fault sticks sets how big and how often its earthquakes are; and the same
// earthquake felt by buildings on bedrock, stiff soil and old lake mud.

import { svg } from 'didactics/dom';
import { arrow, label, line, note, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, player, slider } from './kit';

const W = 400;

// ---- The fence across the fault -----------------------------------------------------------

/** How fast the plates move past each other across this fault, metres a year (about the San Andreas north of San Francisco). */
export const FAULT_RATE = 0.03;
/** The strain the locked fault holds before it breaks, as metres of slip owed. */
export const FAULT_HOLDS = 4.5;
/** Depth of the locked part of the fault, km: it sets how wide the bend is. */
const LOCKED_KM = 15;

/** Slip on the fault and slip still owed (the bend) after `years`. */
export function rebound(years: number): { slipped: number; owed: number; quakes: number } {
  const moved = FAULT_RATE * years;
  const quakes = Math.floor(moved / FAULT_HOLDS + 1e-9);
  return { slipped: quakes * FAULT_HOLDS, owed: moved - quakes * FAULT_HOLDS, quakes };
}

export const fenceFigure = figure(['snapped'], (ctx, t) => {
  const H = 250;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A map view of a straight fence crossing a fault. As the plates move, the fence bends into an S across a wide zone around the locked fault; in the earthquake the fault slips and the fence breaks at the fault, each half straight again but offset.');
  let years = 0;
  const KM = W / 120; // px per km across the map
  const PX_M = 9; // px per metre of displacement, exaggerated
  const FX = W / 2;
  const FY = 130;
  const paint = () => {
    const { slipped, owed, quakes } = rebound(years);
    const u = (x: number) => {
      const km = (x - FX) / KM;
      return (slipped / 2) * Math.sign(km) + (owed / Math.PI) * Math.atan(km / LOCKED_KM);
    };
    const left: string[] = [];
    const right: string[] = [];
    for (let x = 0; x <= W; x += 4) {
      const y = FY - u(x === FX ? FX - 0.01 : x) * PX_M;
      (x < FX ? left : right).push(`${x},${y.toFixed(1)}`);
    }
    left.push(`${FX},${(FY - u(FX - 0.01) * PX_M).toFixed(1)}`);
    right.unshift(`${FX},${(FY - u(FX + 0.01) * PX_M).toFixed(1)}`);
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: H, fill: '#efe8d6' }),
      svg('rect', { x: 0, y: 0, width: FX, height: H, fill: '#e4dcc4' }),
      line(FX, 0, FX, H, COL.heat, 2.5, { 'stroke-dasharray': '7 4' }),
      small(FX + 6, 14, 'the fault', { bold: true, fill: COL.heat }),
      small(8, 16, 'Pacific plate', { bold: true, fill: COL.soft }),
      small(W - 8, 16, 'North American plate', { bold: true, fill: COL.soft, anchor: 'end' }),
      arrow(40, 52, 40, 30, COL.soft, 1.6),
      arrow(W - 40, 30, W - 40, 52, COL.soft, 1.6),
      line(0, FY, W, FY, COL.soft, 1, { 'stroke-dasharray': '3 3', opacity: 0.7 }),
      small(6, FY + 13, 'where the fence was built', { soft: true }),
      svg('polyline', { points: left.join(' '), fill: 'none', stroke: COL.fossil, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      svg('polyline', { points: right.join(' '), fill: 'none', stroke: COL.fossil, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    ];
    // Survey markers along the fence: each has moved with its plate, more the farther it is from the fault.
    for (const km of [-50, -25, -8, 8, 25, 50]) {
      const x = FX + km * KM;
      const y = FY - u(x) * PX_M;
      parts.push(svg('circle', { cx: x, cy: y, r: 3.2, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.2 }));
    }
    // Arrows: how fast markers move between earthquakes, steady year after year.
    for (const km of [-50, -25, -8, 8, 25, 50]) {
      const x = FX + km * KM;
      const v = (1 / Math.PI) * Math.atan(km / LOCKED_KM);
      parts.push(arrow(x, 214, x, 214 - v * 60, COL.water, 1.6));
    }
    parts.push(small(8, 240, 'blue arrows: how fast markers move between earthquakes (GPS)', { fill: COL.water }));
    parts.push(note(W - 8, H - 26, `${Math.round(years)} years`, { anchor: 'end', bold: true }));
    if (quakes > 0) parts.push(label(FX + 8, FY - u(FX + 1) * PX_M + 18, `${(slipped).toFixed(1)} m offset`, { size: 'note', bold: true, fill: COL.heat, halo: '#efe8d6' }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    const moved = FAULT_RATE * years;
    f.readout.textContent = quakes === 0
      ? years === 0
        ? 'A new, straight fence across the fault. Play the years and watch it.'
        : `Year ${Math.round(years)}. Far from the fault, the plates have moved ${moved.toFixed(1)} m past each other, but the fault itself has not moved: it is stuck. The ground on each side has bent instead, and the fence with it, across a zone tens of kilometres wide. (Movements are exaggerated about 150,000 times.)`
      : `Year ${Math.round(years)}. When the bend held ${FAULT_HOLDS} m of slip, the fault broke and slipped all of it in seconds: the earthquake. The rock on each side sprang back straight, so the fence broke at the fault and its two halves are offset ${(slipped).toFixed(1)} m. ${owed > 0.3 ? 'The bending has started again.' : ''}`;
    if (quakes > 0 && t.goal === 'snapped') t.done();
  };
  const ys = slider('Years since the fence was built', 0, 320, 1, 0, (v) => `${v}`, (v) => { years = v; paint(); }, 'old');
  const isOpen = guessFirst(t, f, {
    ask: 'The plates on either side of this fault slide past each other 3 cm a year, but the fault itself is stuck. The straight fence will bend. When the fault finally slips, what will the fence look like? Guess first.',
    options: ['Broken at the fault, each side straight again but shifted', 'Back on its old straight line, unbroken', 'Still bent, with a break at the fault'],
    answer: 0, reveal: 'done',
    sliders: [ys],
    after: () => paint(),
  });
  f.controls.append(player(ys, ctx, { seconds: 16 }).node, ys.node);
  paint();
  return f.node;
});

// ---- Stick and slip ------------------------------------------------------------------------

/** Moment magnitude of a strike-slip break that slips `slip` metres; the break is about 100 km long for each metre (1906: 4–5 m over 470 km) and 12 km deep. */
export function magnitudeOf(slip: number): number {
  const area = (slip * 1e5) * 12e3;
  const moment = 3e10 * area * slip;
  return (2 / 3) * (Math.log10(moment) - 9.1);
}

/** The slips of a fault loaded at FAULT_RATE that holds `holds` metres before it breaks, each break a little different, over `years`. */
export function stickSlip(holds: number, years: number): { at: number; slip: number }[] {
  const out: { at: number; slip: number }[] = [];
  let owed = 0;
  let k = 0;
  const wobble = (i: number) => 1 + 0.18 * Math.sin(i * 2.4 + 0.7) * Math.cos(i * 1.3);
  let need = holds * wobble(0);
  for (let y = 0; y <= years; y += 0.5) {
    owed = FAULT_RATE * y - out.reduce((s, q) => s + q.slip, 0);
    if (owed >= need) {
      const slip = owed * 0.95;
      out.push({ at: y, slip });
      k++;
      need = holds * wobble(k);
    }
  }
  return out;
}

export const stickFigure = figure(['compared'], (ctx, t) => {
  const H = 250;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'Top: a block on a rough floor, pulled at a steady speed through a spring; it sticks, the spring stretches, and it lurches forward. Below: a graph of the slip on the fault over the centuries, a staircase of earthquakes beside the steady line of the plates.');
  let holds = 2;
  let years = 0;
  const SPAN = 600;
  const ran = { weak: false, strong: false };
  const paint = () => {
    const quakes = stickSlip(holds, years);
    const slipped = quakes.reduce((s, q) => s + q.slip, 0);
    const pulled = FAULT_RATE * years;
    const owed = pulled - slipped;
    // The block and spring, each metre of slip a few pixels along.
    const M = 7;
    const bx = 40 + slipped * M;
    const px = bx + 70 + owed * M;
    const coil: string[] = [];
    const n = 12;
    for (let i = 0; i <= n; i++) coil.push(`${(bx + 40 + ((px - bx - 40) * i) / n).toFixed(1)},${(52 + (i % 2 ? -7 : 7) * (i > 0 && i < n ? 1 : 0)).toFixed(1)}`);
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: H, fill: COL.paper }),
      svg('rect', { x: 0, y: 70, width: W, height: 10, fill: '#b8a58a' }),
      small(6, 92, 'the fault: rock grinding on rock', { soft: true }),
      svg('rect', { x: bx, y: 36, width: 40, height: 34, fill: '#8f7b66', rx: 2 }),
      svg('polyline', { points: coil.join(' '), fill: 'none', stroke: COL.ink, 'stroke-width': 1.5 }),
      svg('circle', { cx: px, cy: 52, r: 5, fill: COL.water }),
      arrow(px + 6, 52, px + 30, 52, COL.water, 1.8),
      small(px - 4, 34, 'the plate pulls', { fill: COL.water, anchor: 'middle' }),
    ];
    // Graph: slip against time.
    const gx = 40;
    const gy = 232;
    const gw = W - 56;
    const gh = 120;
    const maxM = FAULT_RATE * SPAN;
    const X = (y: number) => gx + (y / SPAN) * gw;
    const Y = (m: number) => gy - (m / maxM) * gh;
    parts.push(
      line(gx, gy, gx + gw, gy, COL.soft, 1),
      line(gx, gy, gx, gy - gh, COL.soft, 1),
      small(gx + gw, gy + 13, `${SPAN} years`, { anchor: 'end', soft: true }),
      small(gx - 4, gy - gh + 4, `${maxM} m`, { anchor: 'end', soft: true }),
      small(gx - 4, gy + 4, '0', { anchor: 'end', soft: true }),
      line(X(0), Y(0), X(years), Y(pulled), COL.water, 1.5, { 'stroke-dasharray': '4 3' }),
    );
    const stair: string[] = [`${X(0)},${Y(0)}`];
    let s = 0;
    for (const q of quakes) {
      stair.push(`${X(q.at).toFixed(1)},${Y(s).toFixed(1)}`);
      s += q.slip;
      stair.push(`${X(q.at).toFixed(1)},${Y(s).toFixed(1)}`);
    }
    stair.push(`${X(years).toFixed(1)},${Y(s).toFixed(1)}`);
    parts.push(svg('polyline', { points: stair.join(' '), fill: 'none', stroke: COL.heat, 'stroke-width': 2.2 }));
    parts.push(small(gx + 4, gy - gh + 4, 'red: slip on the fault; blue: how far the plates have moved', { fill: COL.ink }));
    redraw(g, ...parts);
    const mean = quakes.length ? slipped / quakes.length : 0;
    const gap = quakes.length > 1 ? (quakes[quakes.length - 1].at - quakes[0].at) / (quakes.length - 1) : 0;
    f.readout.textContent = years === 0
      ? 'The plate pulls the block through the spring at a steady 3 cm a year. Play the centuries.'
      : quakes.length === 0
        ? `Year ${Math.round(years)}: the block has not moved; the spring has stretched ${owed.toFixed(1)} m and is still holding.`
        : `Year ${Math.round(years)}: ${quakes.length} earthquake${quakes.length > 1 ? 's' : ''}, each slipping about ${mean.toFixed(1)} m (about magnitude ${magnitudeOf(mean).toFixed(1)} on a fault like the San Andreas)${gap ? `, roughly every ${Math.round(gap)} years` : ''}. Over the long run the fault keeps up with the plates either way.`;
    if (years >= 300) {
      if (holds <= 2) ran.weak = true;
      if (holds >= 5) ran.strong = true;
    }
    if (ran.weak && ran.strong && t.goal === 'compared') t.done();
  };
  const hs = slider('How hard the fault sticks', 0.5, 8, 0.5, holds, (v) => `holds ${v} m of slip`, (v) => { holds = v; paint(); }, 'heat');
  const ys = slider('Years', 0, SPAN, 1, 0, (v) => `${v}`, (v) => { years = v; paint(); }, 'old');
  f.controls.append(hs.node, player(ys, ctx, { seconds: 14 }).node, ys.node);
  paint();
  return f.node;
});

// ---- The same earthquake on three kinds of ground ------------------------------------------

export interface Ground { name: string; period: number; gain: number; color: string }
/** Each ground's own period of shaking (seconds) and how much it amplifies the waves from the rock below. */
export const GROUNDS: Ground[] = [
  { name: 'Bedrock', period: 0.2, gain: 1, color: '#9a8f86' },
  { name: 'Stiff soil', period: 0.6, gain: 1.6, color: '#c9a66b' },
  { name: 'Old lake mud', period: 2, gain: 4, color: '#7d8a6a' },
];
/** A building sways back and forth about once every 0.1 s per storey. */
export const buildingPeriod = (storeys: number) => 0.1 * storeys;
/** How hard a building of `storeys` sways on `g`, relative to a one-storey building on bedrock. */
const response = (g: Ground, storeys: number) => {
  const r = buildingPeriod(storeys) / g.period;
  const damping = 0.2;
  return g.gain / Math.sqrt((1 - r * r) ** 2 + (2 * damping * r) ** 2);
};
export const sway = (g: Ground, storeys: number): number => response(g, storeys) / response(GROUNDS[0], 1);

export const groundFigure = figure(['resonant'], (_ctx, t) => {
  const H = 250;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'Three columns side by side: a building on bedrock, one on stiff soil, and one on soft old lake mud, each drawn at the far ends of its sway. The waves come up from the same rock below all three.');
  let storeys = 4;
  const paint = () => {
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: H, fill: '#eef2f4' })];
    const colW = W / 3;
    const top = 168;
    const swayMax = Math.max(...GROUNDS.map((gr) => sway(gr, storeys)));
    GROUNDS.forEach((gr, i) => {
      const x0 = i * colW;
      const depth = gr.gain > 2 ? 50 : gr.gain > 1 ? 24 : 0;
      parts.push(svg('rect', { x: x0, y: top, width: colW, height: H - top, fill: '#8a7f78' }));
      if (depth) parts.push(svg('rect', { x: x0, y: top, width: colW, height: depth, fill: gr.color }));
      parts.push(small(x0 + colW / 2, H - 6, gr.name, { anchor: 'middle', bold: true, fill: COL.paper }));
      // The waves come up from the rock below.
      parts.push(svg('path', { d: `M${x0 + 20},${H - 22} q6,-6 12,0 q6,6 12,0 q6,-6 12,0`, fill: 'none', stroke: COL.paper, 'stroke-width': 1.2, opacity: 0.8 }));
      const s = sway(gr, storeys);
      const hgt = Math.min(140, 10 + storeys * 4.4);
      const bw = 26;
      const cx = x0 + colW / 2;
      const lean = Math.min(30, s * 4.5);
      for (const side of [-1, 1]) {
        const dx = side * lean;
        parts.push(svg('polygon', { points: `${cx - bw / 2},${top} ${cx + bw / 2},${top} ${cx + bw / 2 + dx},${top - hgt} ${cx - bw / 2 + dx},${top - hgt}`, fill: COL.ink, opacity: 0.18 }));
      }
      parts.push(svg('rect', { x: cx - bw / 2, y: top - hgt, width: bw, height: hgt, fill: '#d9d2c7', stroke: COL.ink, 'stroke-width': 1 }));
      const level = s / swayMax;
      const strong = s >= 4;
      parts.push(note(cx, 20, `sways ×${s.toFixed(1)}`, { anchor: 'middle', bold: true, fill: strong ? COL.bad : level > 0.6 ? COL.heat : COL.ink }));
      parts.push(small(cx, 33, `ground rings every ${gr.period} s`, { anchor: 'middle', soft: true }));
    });
    redraw(g, ...parts);
    if (!isOpen()) return;
    const lake = GROUNDS[2];
    const bp = buildingPeriod(storeys);
    const s = sway(lake, storeys);
    f.readout.textContent = `${storeys} storeys: the building sways back and forth about once every ${bp.toFixed(1)} s. ` + (Math.abs(bp - lake.period) / lake.period < 0.2
      ? `That is close to the ${lake.period} s that the lake mud rings at, so each push of the ground arrives in time with the last sway and builds on it: resonance. On the mud it sways ${s.toFixed(1)} times as hard as a low building on rock.`
      : bp < lake.period
        ? 'It is stiffer than the lake mud’s slow swing, so it rides the mud more or less as one piece.'
        : 'It sways more slowly than the mud rings, so the mud’s pushes partly cancel.');
    if (Math.abs(bp - lake.period) / lake.period < 0.2 && t.goal === 'resonant') t.done();
  };
  const ss = slider('Building height', 1, 30, 1, storeys, (v) => `${v} storeys`, (v) => { storeys = v; paint(); }, 'heat');
  const isOpen = guessFirst(t, f, {
    ask: 'The same earthquake waves arrive, through the same rock, under three four-storey buildings: one on bedrock, one on stiff soil and one on soft mud that settled in an old lake. Which sways hardest? Guess first.',
    options: ['On bedrock', 'On stiff soil', 'On the old lake mud'],
    answer: 2,
    sliders: [ss],
    after: () => paint(),
  });
  f.controls.append(ss.node);
  paint();
  return f.node;
});
