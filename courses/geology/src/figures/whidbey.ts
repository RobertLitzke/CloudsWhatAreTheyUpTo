// The Whidbey branch (W1-W5): the bluff at Ebey's Landing built layer by layer
// as the ice comes and goes and the sea floods the pressed-down land; outwash
// and till drying out over a rainless month; a drift cell fed by a bluff and
// starved by a bulkhead; pieces riding a plate into a trench, some scraped
// off and some welded on; and a trench wall broken by earthquakes.

import { svg } from 'didactics/dom';
import { arrow, label, line, note, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, player, slider } from './kit';

const W = 400;

// ---- W1: the bluff builder -------------------------------------------------------------------

interface Layer { name: string; from: number; to: number; px: number; fill: string; ink: string }
/** The bluff at Ebey's Landing from the beach up, with when each layer was laid down (thousand years ago). Simplified. */
export const BLUFF_LAYERS: readonly Layer[] = [
  { name: 'Whidbey Formation: river sand and peat', from: 125, to: 100, px: 46, fill: '#c9a46b', ink: '#5b4325' },
  { name: 'Possession drift: an older ice age', from: 80, to: 62, px: 18, fill: '#9c968c', ink: '#3b3a36' },
  { name: 'Esperance Sand: outwash ahead of the ice', from: 18.6, to: 17.6, px: 62, fill: '#e3c98f', ink: '#6b5631' },
  { name: 'Vashon till', from: 17.6, to: 16.6, px: 20, fill: '#8f8a80', ink: '#f7f2e8' },
  { name: 'Everson clay with shells and dropstones', from: 16.4, to: 15.2, px: 18, fill: '#b9ad9a', ink: '#3b3a36' },
];
/** World sea level, metres relative to today, `ka` thousand years ago (rough). */
export function worldSea(ka: number): number {
  const pts: [number, number][] = [[125, 5], [115, -30], [80, -60], [62, -85], [30, -80], [20, -125], [16, -110], [14, -85], [11, -60], [8, -20], [6, -2], [0, 0]];
  return interp(pts, ka);
}
/** How far the land at Whidbey was pressed down by the ice, metres (rough). */
export function pressedDown(ka: number): number {
  const pts: [number, number][] = [[125, 0], [82, 0], [72, -150], [62, -150], [55, 0], [19, 0], [17.5, -250], [16.2, -250], [15.2, -230], [13.5, -60], [11, 0], [0, 0]];
  return interp(pts, ka);
}
function interp(pts: readonly [number, number][], ka: number): number {
  for (let i = 1; i < pts.length; i++) {
    const [a, va] = pts[i - 1];
    const [b, vb] = pts[i];
    if (ka <= a && ka >= b) return va + ((a - ka) / (a - b)) * (vb - va);
  }
  return ka > pts[0][0] ? pts[0][1] : pts[pts.length - 1][1];
}
/** Ice over Whidbey, `ka` thousand years ago. */
const iced = (ka: number) => (ka <= 72 && ka >= 62) || (ka <= 17.6 && ka >= 16.6);
/** Where the top of today's bluff stands above today's sea, metres. */
const BLUFF_TOP = 70;
/** The slider: 0-40 is 125 to 20 thousand years ago, 40-90 is 20 to 13, 90-100 is 13 to now. */
export const kaAt = (p: number) => (p <= 40 ? 125 - (p / 40) * 105 : p <= 90 ? 20 - ((p - 40) / 50) * 7 : 13 - ((p - 90) / 10) * 13);

export const bluffBuilderFigure = figure(['built'], (ctx, t) => {
  const f = frame(W, 250, 4);
  const g = svg('g');
  f.svg.append(g);
  let p = 0;
  let isOpen: () => boolean = () => false;
  const paint = () => {
    const ka = isOpen() ? kaAt(p) : 0;
    const BASE = 228;
    const X0 = 30;
    const X1 = 200;
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: 250, fill: '#f3efe6' })];
    let y = BASE;
    for (const l of BLUFF_LAYERS) {
      const frac = ka >= l.from ? 0 : ka <= l.to ? 1 : (l.from - ka) / (l.from - l.to);
      const h = l.px * frac;
      if (h > 0.5) {
        parts.push(svg('rect', { x: X0, y: y - h, width: X1 - X0, height: h, fill: l.fill, stroke: '#00000022' }));
        if (l.name.startsWith('Everson') && frac > 0.4) for (let k = 0; k < 6; k++) parts.push(svg('path', { d: `M${X0 + 16 + k * 26},${y - h / 2 + 2} a4,3 0 0 1 8,0 z`, fill: '#f7f2e8', stroke: '#6b5d4a', 'stroke-width': 0.6 }));
        if (l.name.startsWith('Vashon') && frac > 0.4) for (let k = 0; k < 7; k++) parts.push(svg('circle', { cx: X0 + 12 + k * 24, cy: y - h / 2 + (k % 2) * 4 - 2, r: 3 + (k % 3), fill: '#5d5a54' }));
        if (h > 10) parts.push(small(X0 + 6, y - h / 2 + 4, l.name, { fill: l.ink, bold: true }));
      }
      y -= h;
    }
    const top = y;
    // ice and sea over the site
    const sea = worldSea(ka);
    const down = pressedDown(ka);
    const ground = BLUFF_TOP + down;
    const under = sea > ground;
    if (iced(ka)) {
      parts.push(svg('rect', { x: X0 - 10, y: 8, width: X1 - X0 + 20, height: top - 8, fill: '#e3f0f7', stroke: '#9cc0d6' }));
      parts.push(label((X0 + X1) / 2, 30, 'ice sheet', { anchor: 'middle', bold: true, fill: '#4f7a94', size: 'note' }));
    } else if (under) {
      parts.push(svg('rect', { x: X0 - 10, y: Math.max(14, top - 60), width: X1 - X0 + 20, height: top - Math.max(14, top - 60), fill: '#a9c8dc', opacity: 0.8 }));
      parts.push(small((X0 + X1) / 2, Math.max(14, top - 60) + 14, ka < 16.6 && ka > 15 ? 'sea, with floating ice dropping stones' : 'sea', { anchor: 'middle', fill: '#2f6385', bold: true }));
    }
    if (ka < 6) {
      parts.push(svg('rect', { x: X1, y: 214, width: W - X1 - 160, height: 14, fill: '#a9c8dc' }), small(X1 + 4, 210, 'waves cut the bluff', { fill: '#2f6385' }));
    }
    // the gauge: the ground here and the sea, metres relative to today's sea
    const GX = 262;
    const yOf = (m: number) => 40 + ((100 - m) / 330) * 180;
    parts.push(
      line(GX, yOf(100), GX, yOf(-230), COL.ink, 1),
      ...[100, 0, -100, -200].map((m) => small(GX - 4, yOf(m) + 3, `${m > 0 ? '+' : ''}${m} m`, { anchor: 'end', fill: COL.soft })),
      line(GX - 2, yOf(0), GX + 50, yOf(0), COL.grid, 1, { 'stroke-dasharray': '3 3' }),
      line(GX + 6, yOf(ground), GX + 50, yOf(ground), '#8b6b3e', 4),
      small(GX + 54, yOf(ground) + 4 + (Math.abs(yOf(sea) - yOf(ground)) < 13 ? (yOf(sea) > yOf(ground) ? -7 : 7) : 0), 'the ground here', { fill: '#8b6b3e', bold: true }),
      line(GX + 6, yOf(sea), GX + 50, yOf(sea), COL.water, 4),
      small(GX + 54, yOf(sea) + 4 + (Math.abs(yOf(sea) - yOf(ground)) < 13 ? (yOf(sea) > yOf(ground) ? 7 : -7) : 0), 'the sea', { fill: COL.water, bold: true }),
    );
    if (under) parts.push(svg('rect', { x: GX + 6, y: yOf(sea), width: 44, height: yOf(ground) - yOf(sea), fill: COL.water, opacity: 0.25 }));
    parts.push(note(GX - 20, 22, `${ka >= 20 ? Math.round(ka) : ka.toFixed(1)} thousand years ago`, { bold: true }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    const what = iced(ka)
      ? `Ice covers Whidbey${ka < 20 ? ', more than a kilometre thick' : ''}, pressing the land about ${-Math.round(down)} m down.`
      : under
        ? `The ice has thinned and floated off, but the land is still pressed down and has not had time to rise: the sea stands about ${Math.round(sea - ground)} m above the ground here. Clams live in the mud, and stones drop from floating ice.`
        : ka > 100
          ? 'A warm time like today. Rivers lay down sand and silt on a floodplain, and peat grows in its swamps.'
          : ka > 20 && ka < 62
            ? 'A long time without ice here. Some of what was laid down is worn away again.'
            : ka >= 17.6 && ka <= 18.6
              ? 'The Vashon ice is coming from the north. Its meltwater spreads sand ahead of it.'
              : ka < 13
                ? `The land has sprung back up. The sea is ${sea < -1 ? 'still rising toward today’s level' : 'at today’s level'}, and waves cut into the stack of layers, opening the bluff you can walk under today.`
                : 'The land rebounds as the sea falls away from it.';
    f.readout.textContent = what;
    if (ka <= 0.5 && t.goal === 'built') t.done();
  };
  const ts = slider('Time', 0, 100, 0.25, 0, (v) => { const k = kaAt(v); return k >= 20 ? `${Math.round(k)},000 years ago` : k > 0.05 ? `${(Math.round(k * 10) * 100).toLocaleString('en-US')} years ago` : 'today'; }, (v) => { p = v; paint(); }, 'old');
  isOpen = guessFirst(t, f, {
    ask: 'This is the bluff at Ebey’s Landing, simplified, about 70 m from the beach to the top. Which layer was laid down first? Guess first, then build it.',
    options: ['The sand and peat at the bottom', 'The clay with shells at the top', 'The till in the middle'],
    answer: 0, reveal: 'done',
    sliders: [ts],
    after: () => paint(),
  });
  f.controls.append(player(ts, ctx, { seconds: 24 }).node, ts.node);
  paint();
  return f.node;
});

// ---- W2: a dry month in outwash and in till ----------------------------------------------------

/** Water a young tree can use in the top 60 cm, mm, when the soil is full. */
export const HOLDS = { gravel: 30, till: 110 } as const;
/** What a summer day draws out, mm. */
const PER_DAY = 4;

export const soilWaterFigure = figure(['dried'], (ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let day = 0;
  let isOpen: () => boolean = () => false;
  const column = (x0: number, kind: 'gravel' | 'till'): (SVGElement | null)[] => {
    const full = HOLDS[kind];
    const left = Math.max(0, full - PER_DAY * day);
    const frac = left / full;
    const wilted = left < 0.15 * full;
    const out: (SVGElement | null)[] = [svg('rect', { x: x0, y: 80, width: 140, height: 120, fill: kind === 'gravel' ? '#d8c39b' : '#a99572', stroke: COL.ink })];
    out.push(svg('rect', { x: x0, y: 80 + 120 * (1 - frac), width: 140, height: 120 * frac, fill: '#5d93bb', opacity: 0.45 }));
    if (kind === 'gravel') for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) out.push(svg('circle', { cx: x0 + 10 + c * 20 + (r % 2) * 8, cy: 90 + r * 20, r: 7, fill: 'none', stroke: '#8a744b', 'stroke-width': 1 }));
    else for (let r = 0; r < 12; r++) for (let c = 0; c < 14; c++) out.push(svg('circle', { cx: x0 + 5 + c * 10 + (r % 2) * 4, cy: 85 + r * 10, r: 1.6, fill: '#6e5d45' }));
    const cx = x0 + 70;
    const col = wilted ? '#a8875a' : '#3f6b45';
    out.push(line(cx, 80, cx, 44, '#5a4632', 2));
    for (let k = 0; k < 3; k++) out.push(svg('polygon', { points: `${cx - 14 + k * 3},${76 - k * 11} ${cx},${50 - k * 11} ${cx + 14 - k * 3},${76 - k * 11}`, fill: col, transform: wilted ? `rotate(12 ${cx} 80)` : '' }));
    out.push(label(x0 + 70, 214, kind === 'gravel' ? 'outwash gravel (the prairie)' : 'till (the forest around it)', { anchor: 'middle', bold: true, size: 'note' }));
    out.push(small(x0 + 70, 230, `${Math.round(left)} of ${full} mm left`, { anchor: 'middle', fill: wilted ? COL.bad : COL.soft, bold: wilted }));
    return out;
  };
  const paint = () => {
    redraw(g, svg('rect', { width: W, height: 240, fill: '#f3efe6' }), ...column(30, 'gravel'), ...column(230, 'till'), note(200, 16, `${day} days without rain`, { anchor: 'middle', bold: true }));
    if (!isOpen()) return;
    const gDry = HOLDS.gravel - PER_DAY * day < 0.15 * HOLDS.gravel;
    const tDry = HOLDS.till - PER_DAY * day < 0.15 * HOLDS.till;
    f.readout.textContent = day === 0
      ? 'Both soils are full after the last rain. Let the dry summer go on.'
      : !gDry
        ? `${day} dry days. Water drains straight through the big pores of the gravel, and what clings to the stones goes fast; the fine-grained till holds far more.`
        : !tDry
          ? `${day} dry days. The gravel has nothing left for a young fir's roots, and the seedling wilts. In the till, the seedling still has water. A few rainless weeks each summer are enough to keep firs off the gravel.`
          : `${day} dry days. Even the till is dry now; older trees with deep roots would still reach water.`;
    if (gDry && !tDry && t.goal === 'dried') t.done();
  };
  const ds = slider('Days without rain', 0, 35, 1, 0, (v) => `${v}`, (v) => { day = v; paint(); }, 'heat');
  isOpen = guessFirst(t, f, {
    ask: 'A young Douglas fir grows on each soil. After a few rainless weeks of summer, which one runs out of water first? Guess first.',
    options: ['The one on outwash gravel', 'The one on till', 'Both at once'],
    answer: 0, reveal: 'done',
    sliders: [ds],
    after: () => paint(),
  });
  f.controls.append(player(ds, ctx, { seconds: 10 }).node, ds.node);
  paint();
  return f.node;
});

// ---- W3: a drift cell and a bulkhead ------------------------------------------------------------

/** Beach width, px, at `x` along the shore, with waves from `angle` degrees (negative from the left), after `years` behind a bulkhead (or none). */
export function beachWidth(x: number, angle: number, bulkhead: boolean, years: number): number {
  const BL = 150;
  const BR = 230;
  const q = Math.sin((2 * Math.abs(angle) * Math.PI) / 180);
  const dir = angle < 0 ? 1 : -1; // waves from the left push sand right
  const dist = dir > 0 ? x - BR : BL - x; // distance downdrift of the bluff
  if (x >= BL && x <= BR) return bulkhead ? 2 : 10;
  if (dist < 0) return 5; // updrift: little supply
  const fed = 6 + 18 * q * Math.exp(-dist / 400);
  if (!bulkhead) return fed;
  const front = years * 6 * q; // how far the starved stretch has moved down the shore
  const gone = Math.max(0, Math.min(1, (front - dist) / 40));
  return fed - (fed - 3) * gone;
}

export const driftCellFigure = figure(['starved'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let angle = -30;
  let bulk = 0;
  let years = 0;
  let isOpen: () => boolean = () => false;
  const SHORE = 100;
  const paint = () => {
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: 220, fill: '#a9c8dc' }), svg('rect', { width: W, height: SHORE, fill: '#c9d3a5' })];
    const sand: string[] = [];
    for (let x = 0; x <= W; x += 4) sand.push(`${x},${(SHORE + 1.6 * beachWidth(x, angle, bulk === 1, years)).toFixed(1)}`);
    parts.push(svg('polygon', { points: `0,${SHORE} ${sand.join(' ')} ${W},${SHORE}`, fill: '#e8d39a' }));
    parts.push(svg('rect', { x: 150, y: SHORE - 26, width: 80, height: 26, fill: '#b08a5a' }), small(190, SHORE - 30, 'feeder bluff', { anchor: 'middle', bold: true }));
    if (bulk) parts.push(line(150, SHORE + 1, 230, SHORE + 1, '#555', 5), small(190, SHORE + 18, 'bulkhead', { anchor: 'middle', bold: true, fill: '#333' }));
    // wave crests
    const a = (angle * Math.PI) / 180;
    for (let k = 0; k < 7; k++) {
      const cx = 30 + k * 60;
      const cy = 175;
      parts.push(line(cx - 30 * Math.cos(a), cy + 30 * Math.sin(a), cx + 30 * Math.cos(a), cy - 30 * Math.sin(a), '#ffffff', 2));
    }
    parts.push(arrow(200, 212, 200 - 26 * Math.sin(a), 212 - 26 * Math.cos(a), '#2f6385', 2), small(214, 214, 'waves', { fill: '#2f6385' }));
    if (Math.abs(angle) > 4) {
      const dir = angle < 0 ? 1 : -1;
      for (const x0 of [60, 300]) parts.push(arrow(x0 - dir * 20, SHORE + 50, x0 + dir * 20, SHORE + 50, '#8a6a2b', 1.6));
      parts.push(small(dir > 0 ? 300 : 60, SHORE + 64, 'sand drifts along the shore', { anchor: 'middle', fill: '#6b5631' }));
    }
    parts.push(note(8, 16, bulk ? `${years} years after the bulkhead` : 'No bulkhead', { bold: true }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    const downX = angle < 0 ? 330 : 50;
    const w = beachWidth(downX, angle, bulk === 1, years);
    f.readout.textContent = Math.abs(angle) <= 4
      ? 'Waves arriving straight on stir the sand up and down the beach but carry it nowhere. Turn the waves.'
      : !bulk
        ? `Waves come in at an angle, wash sand up the beach slantwise and drag it straight back, so every wave moves it a step along the shore. The bluff feeds the beach ${angle < 0 ? 'to its right' : 'to its left'}, which stays wide. Now armour the bluff.`
        : w < 8
          ? `${years} years on. The bulkhead stopped the bluff from feeding the beach, but the waves kept carrying the old sand away. The beach down the shore has been stripped to cobbles, even though nobody built anything there.`
          : `${years} years on. Nothing new comes from the bluff, and the waves keep moving sand away. The starved stretch is creeping down the shore.`;
    if (bulk && w < 8 && t.goal === 'starved') t.done();
  };
  const as = slider('Waves from', -45, 45, 1, angle, (v) => (v === 0 ? 'straight on' : `${Math.abs(v)}° ${v < 0 ? 'left' : 'right'}`), (v) => { angle = v; paint(); }, 'water');
  const bs = slider('Bulkhead', 0, 1, 1, 0, (v) => (v ? 'built' : 'none'), (v) => { bulk = v; paint(); }, 'ink');
  const ys = slider('Years since', 0, 60, 1, 0, (v) => `${v}`, (v) => { years = v; paint(); }, 'old');
  isOpen = guessFirst(t, f, {
    ask: 'Someone builds a concrete bulkhead at the foot of this eroding bluff to protect a house on top. What happens to the beach a kilometre down the shore? Guess first.',
    options: ['It narrows over the years, because the bluff no longer feeds it', 'Nothing: the bulkhead only changes that one property', 'It grows, because less mud washes onto it'],
    answer: 0, reveal: 'done',
    sliders: [as, bs, ys],
    after: () => paint(),
  });
  f.controls.append(as.node, bs.node, player(ys, ctx, { seconds: 10 }).node, ys.node);
  paint();
  return f.node;
});

// ---- W4: what the trench keeps ---------------------------------------------------------------

const RIDERS = ['Ordinary seafloor, with chert on top', 'A seamount', 'An island arc'];

export const accreteFigure = figure(['accreted'], (ctx, t) => {
  const f = frame(W, 240, 4);
  const g = svg('g');
  f.svg.append(g);
  let kind = 0;
  let p = 0;
  let isOpen: () => boolean = () => false;
  const SEA = 80;
  const TOP = 130;
  const TRENCH = 250;
  const slabY = (x: number) => TOP + Math.max(0, x - TRENCH) * 0.75;
  const paint = () => {
    const x = 20 + p * 3.2;
    const at = x >= TRENCH - (kind === 2 ? 40 : 0);
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: 240, fill: '#f3efe6' }),
      svg('rect', { x: 0, y: TOP, width: W, height: 240 - TOP, fill: COL.mantle }),
      small(8, 226, 'mantle', { fill: '#8a4f36', bold: true }),
      svg('rect', { x: 0, y: SEA, width: TRENCH + 10, height: TOP - SEA, fill: '#a9c8dc' }),
      // the plate, flat then diving
      svg('polygon', { points: `0,${TOP} ${TRENCH},${TOP} 400,${slabY(400)} 400,${slabY(400) + 22} ${TRENCH},${TOP + 22} 0,${TOP + 22}`, fill: '#4f4a5e' }),
      small(8, TOP + 15, 'ocean plate', { fill: COL.paper, bold: true }),
      arrow(40, TOP + 36, 90, TOP + 36, COL.ink, 1.5),
      // the continent
      svg('polygon', { points: `${TRENCH},${TOP} ${TRENCH + 30},${SEA - 6} 400,${SEA - 16} 400,${slabY(400) - 2} ${TRENCH + 4},${TOP + 2}`, fill: '#c9a98a' }),
      small(390, SEA - 22, 'North America', { anchor: 'end', bold: true }),
      ...(kind === 2 && p >= 90 ? [] : [small(TRENCH - 6, TOP + 36, 'trench', { anchor: 'end', fill: COL.soft })]),
    ];
    // the wedge of scraped-off slivers at the toe of the continent
    const scraped = kind === 0 && x > TRENCH ? Math.min(1, (x - TRENCH) / 60) : 0;
    const topped = kind === 1 && x > TRENCH ? Math.min(1, (x - TRENCH) / 40) : 0;
    if (scraped > 0) parts.push(svg('polygon', { points: `${TRENCH - 6},${TOP} ${TRENCH + 18},${TOP - 8 * scraped - 4} ${TRENCH + 26},${TOP + 2}`, fill: '#b5473a', stroke: '#3b3a48', 'stroke-width': 0.8 }), small(TRENCH - 30, TOP - 14, 'scraped off', { fill: COL.bad, bold: true }));
    if (kind === 0) {
      const xx = Math.min(x, 400);
      const y = slabY(xx);
      if (x <= 400) parts.push(svg('rect', { x: xx - 20, y: y - 6, width: 40, height: 6, fill: '#b5473a', transform: x > TRENCH ? `rotate(37 ${xx} ${y})` : '' }));
    } else if (kind === 1) {
      const xx = Math.min(x, 420);
      const y = slabY(xx);
      const rot = x > TRENCH ? `rotate(37 ${xx} ${y})` : '';
      parts.push(svg('polygon', { points: `${xx - 28},${y} ${xx},${y - 34 * (1 - topped * 0.55)} ${xx + 28},${y}`, fill: '#3b3a48', transform: rot }));
      if (topped > 0) parts.push(svg('polygon', { points: `${TRENCH + 2},${TOP - 2} ${TRENCH + 14},${TOP - 16} ${TRENCH + 28},${TOP - 2}`, fill: '#3b3a48' }), small(TRENCH - 40, TOP - 24, 'top sheared off', { fill: COL.bad, bold: true }));
    } else {
      const xx = Math.min(x, TRENCH - 40);
      parts.push(svg('polygon', { points: `${xx - 46},${TOP} ${xx - 10},${SEA - 22} ${xx + 10},${SEA - 18} ${xx + 40},${TOP} ${xx + 20},${TOP + 40} ${xx - 30},${TOP + 40}`, fill: '#a7739a' }));
      parts.push(small(xx, TOP - 22, 'island arc', { anchor: 'middle', bold: true, fill: COL.paper }));
      if (at && p >= 90) {
        parts.push(svg('rect', { x: xx - 70, y: SEA, width: 20, height: TOP - SEA, fill: '#a9c8dc' }), small(xx - 60, TOP + 36, 'new trench', { anchor: 'middle', fill: COL.soft }), line(xx - 50, TOP, xx - 50, TOP + 22, COL.bad, 2, { 'stroke-dasharray': '3 2' }));
      }
    }
    redraw(g, ...parts);
    if (!isOpen()) return;
    f.readout.textContent = !at
      ? `${RIDERS[kind]}, riding the plate toward the trench at a few centimetres a year. Each step is millions of years.`
      : kind === 0
        ? 'Ordinary ocean crust is cold and heavy, and most of it dives under the continent. But the top layers, the chert and the pillow basalt, are scraped off at the trench and stacked against the continent’s edge, slice by slice.'
        : kind === 1
          ? 'The seamount is thicker and lighter. As it goes down, its top is sheared off and stuck onto the continent; the rest goes down with the plate.'
          : p < 90
            ? 'The island arc is thick and light, too buoyant to sink. It jams the trench and is pushed against the continent.'
            : 'The arc is welded on: a new piece of North America. The plate breaks behind it, and a new trench starts on its far side. Pieces added this way are called terranes.';
    if (kind === 2 && p >= 90 && t.goal === 'accreted') t.done();
  };
  const ks = slider('On the plate', 0, 2, 1, 0, (v) => RIDERS[v], (v) => { kind = v; paint(); }, 'rose');
  const ps = slider('Time', 0, 100, 1, 0, (v) => `${Math.round(v * 0.6)} million years`, (v) => { p = v; paint(); }, 'old');
  isOpen = guessFirst(t, f, {
    ask: 'Three things ride an ocean plate into a trench: ordinary seafloor topped with chert, a seamount, and a whole island arc. Which of them end up added to the continent? Guess first, then send each one in.',
    options: ['All three, whole', 'Only the island arc', 'The arc whole, plus the seamount’s top and slivers of the seafloor', 'None: the trench swallows everything'],
    answer: 2, reveal: 'done',
    sliders: [ks, ps],
    after: () => paint(),
  });
  f.controls.append(ks.node, player(ps, ctx, { seconds: 10 }).node, ps.node);
  paint();
  return f.node;
});

// ---- W5: a trench across a fault scarp --------------------------------------------------------

interface Step { when: string; quake?: boolean; layer?: { name: string; px: number; fill: string } }
/** A made-up history, simplified from the kind of trench logs dug across the faults of the Puget Lowland. */
export const TRENCH_STEPS: readonly Step[] = [
  { when: '16,000 years ago', layer: { name: 'outwash gravel', px: 40, fill: '#cdb27a' } },
  { when: '12,000 years ago', layer: { name: 'pond silt', px: 26, fill: '#a7a2c2' } },
  { when: 'about 10,000 years ago', quake: true },
  { when: '8,000 years ago', layer: { name: 'peaty soil', px: 22, fill: '#6e5a45' } },
  { when: 'about 6,000 years ago', quake: true },
  { when: '5,000 years ago', layer: { name: 'sand', px: 24, fill: '#e3c98f' } },
  { when: 'about 3,000 years ago', quake: true },
  { when: 'since then', layer: { name: 'topsoil', px: 18, fill: '#8a7354' } },
];
export const TRENCH_QUAKES = TRENCH_STEPS.filter((s) => s.quake).length;
const STEP_PX = 14;

export const trenchFigure = figure(['counted'], (ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 0;
  let isOpen: () => boolean = () => false;
  const paint = () => {
    const upTo = isOpen() ? n : TRENCH_STEPS.length - 1;
    const FX = 200;
    const BASE = 210;
    // Each layer: base and top on the left (raised) and right sides.
    const layers: { name: string; fill: string; lb: number; lt: number; rb: number; rt: number }[] = [];
    let L = 0;
    let R = 0;
    for (let i = 0; i <= upTo; i++) {
      const s = TRENCH_STEPS[i];
      if (s.quake) {
        for (const l of layers) {
          l.lb += STEP_PX;
          l.lt += STEP_PX;
        }
        L += STEP_PX;
      } else if (s.layer) {
        const top = Math.max(L, R) + s.layer.px;
        layers.push({ name: s.layer.name, fill: s.layer.fill, lb: L, lt: top, rb: R, rt: top });
        L = top;
        R = top;
      }
    }
    const lift = Math.max(0, ...layers.map((l) => l.lt)) - 150;
    const y = (h: number) => BASE - h + Math.max(0, lift);
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: 230, fill: '#f3efe6' })];
    for (const l of layers) {
      parts.push(svg('rect', { x: 20, y: y(l.lt), width: FX - 20, height: Math.max(0, l.lt - l.lb), fill: l.fill, stroke: '#00000022' }));
      parts.push(svg('rect', { x: FX, y: y(l.rt), width: 380 - FX, height: Math.max(0, l.rt - l.rb), fill: l.fill, stroke: '#00000022' }));
      if (l.rt - l.rb > 12) parts.push(small(FX + 10, y((l.rt + l.rb) / 2) + 4, l.name, { fill: l.fill === '#6e5a45' || l.fill === '#8a7354' ? COL.paper : COL.ink, bold: true }));
    }
    const quakes = TRENCH_STEPS.slice(0, upTo + 1).filter((s) => s.quake).length;
    parts.push(line(FX, y(0) + 6, FX, y(Math.max(L, R)) - 2, COL.heat, 2));
    parts.push(small(FX - 6, y(0) + 16, 'fault', { anchor: 'end', fill: COL.heat, bold: true }));
    parts.push(note(20, 20, isOpen() ? TRENCH_STEPS[upTo].when : 'The trench wall today', { bold: true }));
    if (isOpen() && TRENCH_STEPS[upTo].quake) parts.push(label(FX + 6, 40, 'earthquake!', { fill: COL.heat, bold: true, size: 'note' }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    const s = TRENCH_STEPS[upTo];
    f.readout.textContent = s.quake
      ? `${s.when}: an earthquake. The fault slips about a metre, and every layer that exists now is broken and lifted on the left. ${quakes} so far.`
      : `${s.when}: ${s.layer!.name} spreads across the ground, filling the low side first. ${quakes === 0 ? 'Nothing is broken yet.' : `It lies across the fault unbroken, so it is younger than earthquake ${quakes}.`}`;
    if (upTo === TRENCH_STEPS.length - 1) {
      f.readout.textContent += ` The gravel at the bottom is lifted ${TRENCH_QUAKES} steps, the sand only one, and the topsoil none: ${TRENCH_QUAKES} earthquakes, each dated by the youngest layer it broke and the oldest one it did not.`;
      if (t.goal === 'counted') t.done();
    }
  };
  const ns = slider('Step', 0, TRENCH_STEPS.length - 1, 1, 0, (v) => TRENCH_STEPS[v].when, (v) => { n = v; paint(); }, 'old');
  isOpen = guessFirst(t, f, {
    ask: 'This is a trench wall cut across a small scarp, simplified. Each earthquake on the fault lifts the left side about a metre. How many earthquakes broke these layers? Guess first, then replay the history.',
    options: ['Two', 'Three', 'Four'],
    answer: 1, reveal: 'done',
    sliders: [ns],
    after: () => paint(),
  });
  f.controls.append(player(ns, ctx, { seconds: 12 }).node, ns.node);
  paint();
  return f.node;
});
