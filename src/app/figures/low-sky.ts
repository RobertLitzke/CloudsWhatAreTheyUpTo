// Figures for the low sky: the sky's temperature by height, heaps spreading
// under a lid, droplets against raindrops, and stills of sharp and feathery
// edges, the six names, stratus against stratocumulus, the lid sinking air
// makes, a million droplets in a raindrop, collecting, and deep and shallow clouds.

import { svg } from 'lesson-kit/dom';
import { arrow, heading, heapAt, hexagon, label, line, points, polyline, redraw, small, still } from './draw';
import { COL, animate, figure, frame, height, slider, type FigureFactory } from './kit';
import { type GenusId } from '../../core/clouds';
import { dropFate, fallSpeed } from '../../core/drops';
import { drawCloud, SHEETS } from '../scene/drawn';
import { realClouds } from '../clouds/real';
import { GREY } from '../clouds/tones';
import { PALETTES } from '../scene/landscape';

// ---- The sky's temperature by height ----------------------------------------

export const freezingFigure: FigureFactory = (ctx) => {
  // A still picture: there is nothing to find by moving through it, so every
  // height carries its temperature and the three kinds of cloud stuff at once.
  const W = 400;
  const H = 280;
  const d = still(W, H);
  const top = 13000;
  const bottom = 262;
  const yOf = (m: number) => bottom - (m / top) * 244;
  // A standard day: 15 °C at the ground, cooling 6.5 °C per kilometre to 11 km.
  const tAt = (m: number) => 15 - 6.5 * (Math.min(m, 11000) / 1000);
  const zero = 15 / 6.5 * 1000;
  const forty = 55 / 6.5 * 1000;
  const g = svg('g');
  // Three bands of stuff: droplets, supercooled droplets and ice, ice alone.
  g.append(
    svg('rect', { x: 0, y: yOf(zero), width: W, height: bottom - yOf(zero), fill: '#eaf4f2' }),
    svg('rect', { x: 0, y: yOf(forty), width: W, height: yOf(zero) - yOf(forty), fill: COL.air }),
    svg('rect', { x: 0, y: 0, width: W, height: yOf(forty), fill: '#dfe7f7' }),
    line(0, yOf(zero), W, yOf(zero), COL.dew, 1.5, { 'stroke-dasharray': '6 4' }),
    line(0, yOf(forty), W, yOf(forty), COL.ice, 1.5, { 'stroke-dasharray': '6 4' }),
    label(W - 6, yOf(zero) - 5, '0 °C: freezing level', { anchor: 'end', fill: COL.dew }),
    label(W - 6, yOf(forty) - 5, '−40 °C: nothing stays liquid', { anchor: 'end', fill: COL.ice }),
    label(W - 6, (yOf(0) + yOf(zero)) / 2 + 4, 'droplets', { soft: true, anchor: 'end' }),
    label(W - 6, (yOf(zero) + yOf(forty)) / 2 + 4, 'supercooled droplets and ice', { soft: true, anchor: 'end' }),
    label(W - 6, yOf(forty) / 2 + 4, 'ice crystals', { soft: true, anchor: 'end' }),
  );
  // The height scale, each mark with the temperature up there.
  for (let m = 2000; m <= 12000; m += 2000) {
    const c = Math.round(tAt(m));
    const mark = small(6, yOf(m) + 4, `${height(m, ctx.save.units)} · `);
    const t = svg('tspan', { 'font-weight': 700 });
    t.textContent = `${c < 0 ? '−' : ''}${Math.abs(c)} °C`;
    mark.append(t);
    g.append(mark);
  }
  // Droplets and crystals as little marks.
  for (let i = 0; i < 14; i++) {
    const x = 90 + (i % 7) * 26;
    const m1 = 300 + (i * 397) % (zero - 400);
    g.append(svg('circle', { cx: x, cy: yOf(m1), r: 2.4, fill: COL.dew }));
    const m2 = zero + 300 + (i * 811) % (forty - zero - 600);
    g.append(i % 2 ? svg('circle', { cx: x + 8, cy: yOf(m2), r: 2.4, fill: COL.dew }) : hexagon(x + 8, yOf(m2), 3, { fill: COL.ice }));
    const m3 = forty + 300 + (i * 523) % (top - forty - 600);
    g.append(hexagon(x + 4, yOf(m3), 3.2, { fill: COL.ice }));
  }
  d.svg.append(
    svg('rect', { x: 0, y: bottom, width: W, height: H - bottom, fill: COL.ground }), g,
    small(6, H - 5, 'valley floor · 15 °C', { bold: true, fill: COL.paper }),
  );
  return { node: d.node };
};

// ---- Sharp edges and feathery edges -----------------------------------------

export const edgesDiagram: FigureFactory = () => {
  const d = still(400, 214);
  const day = PALETTES.day;
  // Seeded scatter, so the picture is the same every time.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lens = (cx: number, cy: number, r: number, fill: string) => [
    svg('circle', { cx, cy, r, fill }),
    svg('circle', { cx, cy, r, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }),
  ];
  // Left: droplets packed close, ending at a clean edge.
  const drops: SVGElement[] = [];
  for (let y = 98; y <= 182; y += 4.2) {
    for (let x = 58; x <= 142; x += 4.2) {
      const jx = x + (rnd() - 0.5) * 2;
      const jy = y + (rnd() - 0.5) * 2;
      const edge = 104 + Math.sin(jy / 9) * 4;
      if (Math.hypot(jx - 100, jy - 140) < 39 && jx < edge) drops.push(svg('circle', { cx: jx, cy: jy, r: 1.3, fill: COL.rain }));
    }
  }
  // Right: a few large crystals, thinning out into a long trail.
  const crystals: SVGElement[] = [];
  for (let i = 0; i < 46; i++) {
    const t = rnd();
    const x = 262 + t * 76;
    const y = 106 + rnd() * 68 + t * 8;
    if (rnd() < 1 - t * 0.75 && Math.hypot(x - 300, y - 140) < 38) {
      const r = 2.2 + rnd() * 1.4;
      crystals.push(hexagon(x, y, r, { fill: 'none', stroke: COL.ice, 'stroke-width': 1.1 }));
    }
  }
  const cirrus = drawCloud('cirrus', day, 4);
  cirrus.setAttribute('transform', 'translate(296 78) scale(0.62)');
  const heap = drawCloud('cumulus', day, 4);
  heap.setAttribute('transform', 'translate(92 82) scale(1.05)');
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 200, height: 214, fill: COL.air }),
    svg('rect', { x: 200, y: 0, width: 200, height: 214, fill: '#dde6f4' }),
    svg('rect', { x: 0, y: 26, width: 400, height: 64, fill: day.sky[1] }),
    heap,
    cirrus,
    heading(100, 18, 'Low: liquid droplets'),
    heading(300, 18, 'High: ice crystals'),
    line(110, 70, 112, 104, COL.ink, 1, { 'stroke-dasharray': '2 2' }),
    line(296, 66, 296, 102, COL.ink, 1, { 'stroke-dasharray': '2 2' }),
    ...lens(100, 140, 40, '#ffffff'),
    ...drops,
    ...lens(300, 140, 40, '#ffffff'),
    ...crystals,
    small(100, 196, 'Crowded and tiny: at the edge they', { anchor: 'middle' }),
    small(100, 208, 'evaporate in seconds. A crisp outline.', { anchor: 'middle' }),
    small(300, 196, 'Few, large and slow to vanish: they', { anchor: 'middle' }),
    small(300, 208, 'drift off in trails. A feathery edge.', { anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Floors times textures: six names ---------------------------------------

export const nameGridDiagram: FigureFactory = () => {
  const d = still(400, 262);
  const day = PALETTES.day;
  const rows: [string, string, string, GenusId, GenusId][] = [
    ['High', 'cirro-', day.sky[0], 'cirrocumulus', 'cirrostratus'],
    ['Middle', 'alto-', day.sky[1], 'altocumulus', 'altostratus'],
    ['Low', 'no prefix', day.sky[2], 'cumulus', 'stratus'],
  ];
  const left = 84;
  const colW = 158;
  const top = 34;
  const rowH = 76;
  const cells: SVGElement[] = [];
  rows.forEach(([floor, prefix, sky, heap, sheet], r) => {
    const y = top + r * rowH;
    cells.push(
      heading(left / 2, y + rowH / 2 - 2, floor),
      small(left / 2, y + rowH / 2 + 12, prefix, { soft: true, anchor: 'middle' }),
    );
    [heap, sheet].forEach((id, c) => {
      const x = left + c * colW;
      const scale = id === 'cumulus' ? 0.8 : 0.9;
      const cloud = SHEETS.has(id) ? drawCloud(id, day, 3, colW / 2 / scale) : drawCloud(id, day, 3);
      cloud.setAttribute('transform', `translate(${x + colW / 2} ${y + rowH - 26}) scale(${scale})`);
      const name = heading(x + colW / 2, y + rowH - 8, id, { fill: '#fff', halo: 'rgba(11, 29, 32, 0.45)' });
      cells.push(svg('rect', { x, y, width: colW, height: rowH, fill: sky }), cloud, name);
    });
  });
  d.svg.append(
    ...cells,
    heading(left + colW / 2, 16, '+ cumulus'),
    small(left + colW / 2, 28, 'heaps', { soft: true, anchor: 'middle' }),
    heading(left + colW * 1.5, 16, '+ stratus'),
    small(left + colW * 1.5, 28, 'a layer', { soft: true, anchor: 'middle' }),
    ...[1, 2].map((r) => line(left, top + r * rowH, 400, top + r * rowH, '#fff', 2)),
    line(left + colW, top, left + colW, top + 3 * rowH, '#fff', 2),
  );
  return { node: d.node };
};

// ---- Heaps spreading under a lid --------------------------------------------

export const spreadFigure = figure(['sheet'], (_ctx, t) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 4);
  let lid = 0.2;
  let moist = 0.5;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#e3eff3' }), svg('rect', { x: 0, y: 196, width: W, height: 24, fill: COL.ground }), g);
  const paint = () => {
    const base = 150;
    const lidY = 150 - 30 - (1 - lid) * 80; // A strong lid sits low and close above the cloud base.
    const spread = 24 + lid * moist * 28;
    const n = 6;
    const parts: SVGElement[] = [];
    for (let i = 0; i < n; i++) {
      const cx = 30 + i * 68;
      const h = Math.min(base - lidY, 24 + moist * 52);
      parts.push(heapAt(cx, base, spread, h));
    }
    const coverage = Math.min(1, (spread * 2 * n) / W);
    redraw(g,
      lid > 0.05 ? svg('rect', { x: 0, y: lidY - 6, width: W, height: 6, fill: COL.env, opacity: 0.25 + lid * 0.5 }) : null,
      lid > 0.05 ? small(W - 6, lidY - 10, 'warm lid', { anchor: 'end', fill: COL.env }) : null,
      ...parts,
    );
    const sheet = coverage > 0.85;
    f.readout.textContent = sheet
      ? 'Stratocumulus: the heaps hit the lid, flatten and spread until they join into a lumpy grey sheet with gaps. It looks gloomy but rarely gives more than drizzle.'
      : lid > 0.5
        ? 'The lid flattens the tops. Add moisture and they spread sideways.'
        : 'Separate heaps: cumulus, free to grow up.';
    if (t.goal === 'sheet' && sheet) t.done();
  };
  f.controls.append(
    slider('Lid', 0, 1, 0.05, lid, (v) => (v < 0.1 ? 'none' : v < 0.6 ? 'weak' : 'strong'), (v) => { lid = v; paint(); }, 'env').node,
    slider('Moisture', 0, 1, 0.05, moist, (v) => (v < 0.35 ? 'dry' : v < 0.7 ? 'moist' : 'very moist'), (v) => { moist = v; paint(); }, 'dew').node,
  );
  paint();
  return f.node;
});

// ---- Stratus and stratocumulus ----------------------------------------------

export const layerKindsDiagram: FigureFactory = () => {
  const d = still(400, 262);
  const grey = '#b3bccb';
  const sky = COL.sky;
  const ground = 132;
  // Side views.
  const cells: SVGElement[] = [];
  for (let i = 0; i < 4; i++) {
    // Tops pressed flat under the lid, sides rounded, a little thicker in the middle.
    const cx = 225 + i * 45;
    cells.push(svg('path', { d: `M${cx - 14},62 L${cx + 14},62 Q${cx + 21},62 ${cx + 21},74 L${cx + 21},90 Q${cx},100 ${cx - 21},90 L${cx - 21},74 Q${cx - 21},62 ${cx - 14},62 Z`, fill: grey }));
  }
  const loop = (cx: number) => svg('g', {},
    arrow(cx, 92, cx, 70, COL.parcel, 1.4),
    svg('path', { d: `M${cx + 3},68 Q${cx + 16},66 ${cx + 17},80`, fill: 'none', stroke: COL.env, 'stroke-width': 1.4 }),
    arrow(cx + 17, 80, cx + 17, 92, COL.env, 1.4));
  // Views from below, with the sun high above the layer: the stratus sheet is
  // an even grey; each stratocumulus lump is dark where it is thickest and
  // bright at its thin rims.
  const pw = 172;
  const ph = 62;
  const stratus = realClouds({ width: pw, height: ph, sun: [pw / 2, -100, 300], tones: GREY }, [
    { kind: 'sheet', x0: -60, x1: pw + 60, top: -40, bottom: ph + 40, density: 3, detail: 12 },
  ]);
  const lumps = realClouds({ width: pw, height: ph, sun: [pw / 2, ph / 2, 400], tones: GREY }, [
    { kind: 'cells', x0: -20, x1: pw + 20, top: -16, bottom: ph + 16, size: 30, r: 16, flat: 0.68, density: 0.8, seed: 7 },
  ]);
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: sky }),
    svg('rect', { x: 0, y: ground, width: 400, height: 6, fill: COL.ground }),
    heading(100, 18, 'Stratus: cooled evenly'),
    heading(300, 18, 'Stratocumulus: stirred'),
    // Stratus: an even sheet, nothing moving in it.
    svg('rect', { x: 14, y: 62, width: 172, height: 34, fill: grey }),
    ...[40, 100, 160].map((x) => arrow(x, 112, x, 126, COL.cold, 1.6)),
    small(100, 50, 'one still, even layer', { anchor: 'middle' }),
    small(100, 110, 'chilled from below', { anchor: 'middle', fill: COL.coldInk }),
    // Stratocumulus: cells under the lid, each with its own up and down.
    svg('rect', { x: 200, y: 56, width: 200, height: 6, fill: COL.env, opacity: 0.45 }),
    small(396, 50, 'warm lid', { anchor: 'end', fill: COL.env }),
    ...cells,
    loop(225), loop(315),
    small(300, 112, 'up in the middle, down at the edges', { anchor: 'middle' }),
    // From below.
    svg('rect', { x: 0, y: 138, width: 400, height: 124, fill: '#cfe0ec' }),
    small(100, 154, 'from below:', { soft: true, anchor: 'middle' }),
    small(300, 154, 'from below:', { soft: true, anchor: 'middle' }),
    svg('rect', { x: 14, y: 162, width: 172, height: 62, rx: 6, fill: grey }),
    svg('g', { transform: 'translate(14 162)', 'clip-path': 'url(#layer-kinds-clip-a)' }, stratus.node),
    svg('rect', { x: 214, y: 162, width: 172, height: 62, rx: 6, fill: '#7fb3d5' }),
    svg('g', { transform: 'translate(214 162)', 'clip-path': 'url(#layer-kinds-clip-a)' }, lumps.node),
    small(100, 240, 'an even grey ceiling, no pattern', { anchor: 'middle' }),
    small(100, 253, 'drizzle at most', { soft: true, anchor: 'middle' }),
    small(300, 240, 'lumps: dark centres, bright rims', { anchor: 'middle' }),
    small(300, 253, 'and gaps of blue between', { soft: true, anchor: 'middle' }),
  );
  // The from-below panels are cut to their rounded frames.
  d.svg.append(svg('defs', {}, svg('clipPath', { id: 'layer-kinds-clip-a' }, svg('rect', { x: 0, y: 0, width: pw, height: ph, rx: 6 }))));
  return { node: d.node };
};

// ---- Sinking air makes the lid ----------------------------------------------

export const subsidenceDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const ground = 212;
  const lid = 112;
  const eddy = (cx: number, cy: number, r: number) => svg('g', {},
    svg('path', { d: `M${cx - r},${cy} A${r},${r * 0.7} 0 1 1 ${cx + r * 0.2},${cy + r * 0.68}`, fill: 'none', stroke: COL.parcel, 'stroke-width': 1.6 }),
    arrow(cx + r * 0.5, cy + r * 0.62, cx + r * 0.1, cy + r * 0.7, COL.parcel, 1.6));
  // The temperature profile on the right: cooling with height, then warming through the lid.
  const gx = (c: number) => 290 + (c - 4) * 3.5;
  const gy = (km: number) => ground - km * 52;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 262, height: ground, fill: COL.air }),
    svg('rect', { x: 0, y: lid, width: 262, height: ground - lid, fill: '#f1ece2' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 240 - ground, fill: COL.ground }),
    heading(120, 18, 'High pressure: air sinking slowly'),
    ...[18, 160, 205, 250].map((x) => arrow(x, 30, x, lid - 22, COL.env, 2)),
    small(32, 62, 'squeezed as it sinks,', { fill: COL.env }),
    small(32, 75, 'so it warms', { fill: COL.env }),
    svg('rect', { x: 0, y: lid - 8, width: 262, height: 8, fill: COL.env, opacity: 0.45 }),
    small(6, lid - 12, 'the lid: warm air resting on cool air', { fill: COL.env }),
    eddy(60, 150, 22), eddy(150, 162, 26), eddy(222, 146, 18),
    small(6, ground - 8, 'stirred by wind and thermals from the ground', { fill: COL.parcel }),
    // The profile.
    line(gx(4), 30, gx(4), ground, COL.ink, 1),
    line(gx(4), ground, 396, ground, COL.ink, 1),
    polyline([[gx(24), gy(0)], [gx(14.5), gy(1.9)], [gx(19), gy(2.15)], [gx(9), gy(3.5)]], COL.env, 2.4),
    small(398, ground + 14, 'temperature →', { anchor: 'end', fill: '#fff' }),
    small(gx(4) - 4, 36, 'height', { soft: true, anchor: 'end' }),
    small(gx(19) + 5, gy(2.15) - 2, 'warmer', { fill: COL.env }),
    small(gx(19) + 5, gy(2.15) + 9, 'going up', { fill: COL.env }),
    small(gx(20) - 6, gy(1) + 4, 'cooler', { soft: true, anchor: 'end' }),
    small(gx(20) - 6, gy(1) + 15, 'with height', { soft: true, anchor: 'end' }),
  );
  return { node: d.node };
};

// ---- A million droplets in one raindrop -------------------------------------

export const millionDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const cx = 104;
  const cy = 104;
  const r = 60;
  // A hundred droplets side by side across the drop: 1.2 units each.
  const row = Array.from({ length: 100 }, (_, i) => svg('circle', { cx: cx - r + 0.6 + i * 1.2, cy, r: 0.55, fill: COL.ink }));
  // A cube of droplets, 100 on each edge, drawn as a 10 by 10 grid on each face.
  const s = 74;
  const ox = 262;
  const oy = 70;
  const k = 0.45; // depth offset
  const face = (pts: [number, number][], fill: string) => svg('polygon', { points: points(pts), fill, stroke: COL.ink, 'stroke-width': 1 });
  const grid: SVGElement[] = [];
  for (let i = 1; i < 10; i++) {
    const t = (i / 10) * s;
    grid.push(
      line(ox + t, oy, ox + t, oy + s, COL.ink, 0.4, { opacity: 0.5 }),
      line(ox, oy + t, ox + s, oy + t, COL.ink, 0.4, { opacity: 0.5 }),
      line(ox + t, oy, ox + t + s * k, oy - s * k, COL.ink, 0.4, { opacity: 0.5 }),
      line(ox + s + (t * k), oy - t * k, ox + s + t * k, oy + s - t * k, COL.ink, 0.4, { opacity: 0.5 }),
    );
  }
  d.svg.append(
    svg('circle', { cx, cy, r, fill: COL.rain, opacity: 0.35 }),
    svg('circle', { cx, cy, r, fill: 'none', stroke: COL.rain, 'stroke-width': 2 }),
    ...row,
    heading(cx, 24, 'One raindrop, 1 mm'),
    small(cx, cy - 8, '100 cloud droplets', { anchor: 'middle' }),
    small(cx, cy + 16, 'fit side by side', { anchor: 'middle' }),
    svg('circle', { cx: 30, cy: 188, r: 0.8, fill: COL.ink }),
    small(38, 191, 'one cloud droplet, 0.01 mm, at the same scale', { soft: true }),
    face([[ox, oy], [ox + s, oy], [ox + s, oy + s], [ox, oy + s]], '#d9e6f5'),
    face([[ox, oy], [ox + s * k, oy - s * k], [ox + s + s * k, oy - s * k], [ox + s, oy]], '#eef3fa'),
    face([[ox + s, oy], [ox + s + s * k, oy - s * k], [ox + s + s * k, oy + s - s * k], [ox + s, oy + s]], '#b9cde6'),
    ...grid,
    heading(ox + s * 0.7, 24, 'Wide, tall and deep'),
    small(ox + s / 2, oy + s + 18, '100 × 100 × 100', { anchor: 'middle' }),
    heading(ox + s / 2, oy + s + 34, '= 1,000,000 droplets'),
  );
  return { node: d.node };
};

// ---- Droplets and drops -----------------------------------------------------

const BASE_M = 1000;

export const dropsFigure = figure(['rain'], (ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 4);
  let logD = -2;
  let up = 0.3;
  let humidity = 0.7;
  // The side view: cloud above the base line, then a kilometre of clear air.
  const top = 14;
  const baseY = 74;
  const ground = 226;
  const colX = 124;
  const sceneW = 236;
  const mPerPx = BASE_M / (ground - baseY);
  // The fall-speed chart, log on both axes.
  const cx0 = 300;
  const cx1 = 390;
  const cy0 = 200;
  const cy1 = 30;
  const xOf = (mm: number) => cx0 + ((Math.log10(mm) + 2) / 2.7) * (cx1 - cx0);
  const yOf = (v: number) => cy0 - ((Math.log10(Math.max(v, 0.001)) + 3) / 4) * (cy0 - cy1);
  const curve: [number, number][] = [];
  for (let l = -2; l <= 0.7; l += 0.05) curve.push([xOf(10 ** l), yOf(fallSpeed(10 ** l))]);
  const square: [number, number][] = [];
  for (let l = -2; l <= -0.25; l += 0.05) square.push([xOf(10 ** l), yOf(0.003 * (10 ** l / 0.01) ** 2)]);

  const scene = svg('g');
  const chart = svg('g');
  const dropG = svg('g');
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }),
    svg('rect', { x: 0, y: top, width: sceneW, height: ground - top, fill: COL.air }),
    // The cloud, the base line and the ground.
    svg('rect', { x: 0, y: top, width: sceneW, height: baseY - top, fill: '#d6d3e3' }),
    line(0, baseY, sceneW, baseY, COL.cloudShade, 3),
    small(6, baseY + 13, `cloud base, ${height(BASE_M, ctx.save.units)} up`, { soft: true }),
    ...Array.from({ length: 70 }, (_, i) => svg('circle', { cx: (i * 37) % sceneW, cy: top + 4 + ((i * 23) % (baseY - top - 8)), r: 0.9, fill: COL.rain, opacity: 0.35 })),
    small(6, top + 12, 'inside the cloud', { soft: true }),
    small(6, (baseY + ground) / 2, 'clear air below', { soft: true }),
    svg('rect', { x: 0, y: ground, width: sceneW, height: H - ground, fill: '#b9a55a' }),
    small(6, ground - 6, 'the wheat', { soft: true }),
    scene,
    dropG,
    // The chart's frame.
    small(cx0 - 26, 18, 'Fall speed', { bold: true }),
    line(cx0, cy1 - 4, cx0, cy0, COL.ink, 1),
    line(cx0, cy0, cx1, cy0, COL.ink, 1),
    ...([[0.01, '1 cm/s'], [0.1, '10 cm/s'], [1, '1 m/s'], [10, '10 m/s']] as const).flatMap(([v, s]) => [
      line(cx0 - 3, yOf(v), cx0, yOf(v), COL.ink, 1),
      small(cx0 - 5, yOf(v) + 3, s, { soft: true, anchor: 'end' }),
    ]),
    ...([[0.01, '0.01'], [0.1, '0.1'], [1, '1 mm']] as const).flatMap(([d, s]) => [
      line(xOf(d), cy0, xOf(d), cy0 + 3, COL.ink, 1),
      small(xOf(d), cy0 + 13, s, { soft: true, anchor: 'middle' }),
    ]),
    small((cx0 + cx1) / 2, cy0 + 25, 'drop size', { soft: true, anchor: 'middle' }),
    polyline(square, COL.soft, 1.2, { 'stroke-dasharray': '3 3' }),
    small(xOf(0.3) - 6, yOf(2.2), 'if speed grew', { soft: true, anchor: 'end' }),
    small(xOf(0.3) - 6, yOf(2.2) + 11, 'as size²', { soft: true, anchor: 'end' }),
    polyline(curve, COL.rain, 2.4),
    small(cx1, yOf(0.3), 'drag', { anchor: 'end', fill: COL.rain }),
    small(cx1, yOf(0.3) + 11, 'bends it', { anchor: 'end', fill: COL.rain }),
    chart,
  );

  // The drop's trip, worked out once per setting and then played over and over.
  let trip: ReturnType<typeof dropFate>;
  let y = top + 20;
  let pause = 0;
  const work = () => dropFate(10 ** logD, up, humidity, BASE_M);
  const rOf = (mm: number) => 1.8 + Math.max(0, Math.log10(mm / 0.01)) * 3.2;
  const kindOf = (mm: number) => (mm < 0.05 ? 'cloud droplet' : mm < 0.5 ? 'drizzle drop' : mm < 2.5 ? 'raindrop' : 'big shower drop');
  const speed = (v: number) => (v < 0.1 ? `${(v * 100).toFixed(v < 0.01 ? 1 : 0)} cm` : `${v.toFixed(1)} m`);
  const updraftArrows = () => up < 0.02
    ? []
    : [24, 210].map((x) => svg('g', { opacity: 0.8 },
      line(x, baseY - 6, x, baseY - 6 - Math.min(48, 10 + up * 9), COL.parcel, 2),
      svg('polygon', { points: `${x - 4},${baseY - 4 - Math.min(48, 10 + up * 9)} ${x + 4},${baseY - 4 - Math.min(48, 10 + up * 9)} ${x},${baseY - 11 - Math.min(48, 10 + up * 9)}`, fill: COL.parcel }),
    ));

  const paint = () => {
    trip = work();
    y = top + 24;
    pause = 0;
    const { mm, fall, net, lastsM, lands } = trip;
    const gone = Math.min(ground, baseY + lastsM / mPerPx);
    redraw(scene,
      ...updraftArrows(),
      up >= 0.02 ? small(32, baseY - 14, `updraft ${speed(up)}/s`, { fill: COL.parcel }) : null,
      net > 0 ? line(colX, baseY, colX, gone, COL.rain, 1, { 'stroke-dasharray': '2 3', opacity: 0.6 }) : null,
      net > 0 && !lands ? small(colX + 10, Math.max(gone + 4, baseY + 26), `gone after ${lastsM < 1 ? 'under a metre' : height(lastsM, ctx.save.units)}`, { fill: COL.rain }) : null,
    );
    redraw(chart,
      up >= 0.02 ? line(cx0, yOf(up), cx1, yOf(up), COL.parcel, 1.4, { 'stroke-dasharray': '4 3' }) : null,
      up >= 0.02 ? small(cx0 + 3, yOf(up) - 4, 'updraft', { fill: COL.parcel }) : null,
      svg('circle', { cx: xOf(mm), cy: yOf(fall), r: 4.5, fill: COL.rain, stroke: '#fff', 'stroke-width': 1.5 }),
    );
    const size = `${mm < 0.1 ? mm.toFixed(3) : mm.toFixed(2)} mm`;
    const air = humidity > 0.85 ? 'humid' : humidity > 0.55 ? 'fairly dry' : 'dry';
    f.readout.textContent = net <= 0
      ? `A ${size} ${kindOf(mm)} falls ${speed(fall)} a second through the air, but the air is rising faster, so it is carried up and stays in the cloud, where it can go on growing.`
      : lands
        ? `A ${size} ${kindOf(mm)} falls ${speed(fall)} a second, faster than the updraft, and is big enough to cross a kilometre of ${air} air: it reaches the ground${mm < 0.5 ? ' as drizzle' : ' as rain'}.`
        : `A ${size} ${kindOf(mm)} falls ${speed(fall)} a second and drops out of the base, but in ${air} air it evaporates after ${lastsM < 0.1 ? 'a few centimetres' : lastsM < 1 ? 'less than a metre' : `about ${height(lastsM, ctx.save.units)}`}${mm >= 0.2 ? ': a grey streak of virga that never reaches the ground' : ''}.`;
    if (t.goal === 'rain' && lands) t.done();
  };

  animate(f.node, ctx, (dt) => {
    const { mm, net, lastsM } = trip;
    let r = rOf(mm);
    if (pause > 0) {
      pause -= dt;
      if (pause <= 0) y = top + 24;
      redraw(dropG);
      return;
    }
    if (net <= 0) {
      // Carried up: it rides the updraft to the top of the cloud and comes round again.
      y -= dt * (8 + Math.min(40, -net * 12));
      if (y < top + 6) y = baseY - 8;
    } else {
      // Time is sped up, more for the slow ones, so every trip takes a few seconds.
      y += dt * (22 + Math.min(70, Math.log10(1 + net * 100) * 24));
      if (y > baseY) {
        const below = (y - baseY) * mPerPx;
        if (below >= lastsM) {
          pause = 0.8;
          redraw(dropG, svg('circle', { cx: colX, cy: baseY + lastsM / mPerPx, r: r + 3, fill: 'none', stroke: COL.rain, 'stroke-width': 1, 'stroke-dasharray': '1 2' }));
          return;
        }
        r *= Math.pow(1 - below / lastsM, 0.25);
        if (y >= ground) {
          pause = 0.8;
          redraw(dropG, svg('path', { d: `M${colX - 8},${ground} q4,-7 8,0 q4,-7 8,0`, fill: 'none', stroke: COL.rain, 'stroke-width': 1.5 }));
          return;
        }
      }
    }
    redraw(dropG, svg('circle', { cx: colX, cy: y, r: Math.max(0.8, r), fill: COL.rain, stroke: '#fff', 'stroke-width': 0.8 }));
  });

  f.controls.append(
    slider('Drop size', -2, 0.7, 0.01, logD, (v) => `${10 ** v < 0.1 ? (10 ** v).toFixed(3) : (10 ** v).toFixed(2)} mm`, (v) => { logD = v; paint(); }, 'dew').node,
    slider('Updraft', 0, 5, 0.05, up, (v) => (v < 0.02 ? 'none' : `${v < 0.1 ? (v * 100).toFixed(0) + ' cm' : v.toFixed(1) + ' m'}/s`), (v) => { up = v; paint(); }, 'parcel').node,
    slider('Air below', 0.3, 0.95, 0.01, humidity, (v) => `${Math.round(v * 100)}% humid`, (v) => { humidity = v; paint(); }, 'env').node,
  );
  paint();
  return f.node;
});

// ---- Collecting: a big drop sweeps up small ones ----------------------------

export const collideDiagram: FigureFactory = () => {
  const d = still(400, 230);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dropX = 120;
  const dropY = 72;
  const dropR = 9;
  // The drop grows as it sweeps droplets up, so the path it clears widens on the way down.
  const laterR = 14;
  const pathR = (y: number) => dropR + ((laterR - dropR) * (y - dropY)) / (228 - dropY);
  const specks: SVGElement[] = [];
  for (let i = 0; i < 70; i++) {
    const x = 12 + rnd() * 226;
    const y = 30 + rnd() * 190;
    if (Math.hypot(x - dropX, y - dropY) < dropR + 6) continue;
    if (Math.hypot(x - dropX, y - 196) < pathR(196) + 3) continue;
    const inPath = y > dropY && Math.abs(x - dropX) < pathR(y);
    specks.push(svg('circle', { cx: x, cy: y, r: 1.6 + rnd() * 1.2, fill: inPath ? COL.dew : COL.rain, opacity: inPath ? 1 : 0.55 }));
    if (i % 5 === 0 && !inPath) specks.push(line(x, y + 4, x, y + 9, COL.soft, 1));
  }
  // The same drop a little later, and later still: bigger, faster.
  const stages: [number, number, number][] = [[50, 4, 14], [110, 7, 26], [180, 11, 40]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 250, height: 230, fill: '#eceaf2' }),
    heading(125, 18, 'Inside a warm cloud'),
    line(dropX - dropR, dropY, dropX - laterR, 228, COL.dew, 1, { 'stroke-dasharray': '3 3' }),
    line(dropX + dropR, dropY, dropX + laterR, 228, COL.dew, 1, { 'stroke-dasharray': '3 3' }),
    ...specks,
    svg('circle', { cx: dropX, cy: 196, r: pathR(196), fill: 'none', stroke: COL.rain, 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }),
    svg('circle', { cx: dropX, cy: dropY, r: dropR, fill: COL.rain }),
    arrow(dropX, dropY + dropR + 2, dropX, dropY + dropR + 34, COL.ink, 2),
    small(dropX + 14, dropY - 4, 'a bigger drop falls faster'),
    small(dropX + 16, 150, 'droplets in its path', { fill: COL.dew }),
    small(dropX + 16, 162, 'are swept up', { fill: COL.dew }),
    small(14, 210, 'small droplets', { soft: true }),
    small(14, 222, 'barely fall', { soft: true }),
    small(dropX + 18, 199, 'later: bigger,', { fill: COL.rain }),
    small(dropX + 18, 211, 'a wider path', { fill: COL.rain }),
    heading(325, 18, 'It snowballs'),
    ...stages.flatMap(([y, r, len], i) => [
      svg('circle', { cx: 300, cy: y + 10, r, fill: COL.rain }),
      arrow(300, y + 12 + r, 300, y + 12 + r + len * 0.6, COL.ink, 1.6),
      small(318, y + 14, ['grows a little,', 'falls faster,', 'sweeps a wider'][i]),
      small(318, y + 26, ['falls a little faster', 'grows faster', 'path each second'][i]),
    ]),
  );
  return { node: d.node };
};

// ---- Shallow and deep clouds ------------------------------------------------

export const depthDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const ground = 214;
  const cloud = '#d6d3e3';
  // Shallow: the drop leaves the base still small and dries out on the way down.
  const shallow: [number, number, number, number][] = [[100, 46, 1.5, 1], [100, 58, 2, 1], [100, 70, 2.4, 1], [100, 96, 2.1, 0.8], [100, 120, 1.6, 0.55], [100, 142, 1, 0.3]];
  // Deep: carried up and down by the updraft, it grows until it falls through.
  const path: [number, number][] = [[300, 140], [292, 110], [300, 70], [312, 40], [320, 60], [316, 100], [306, 130], [300, 160], [300, 200]];
  const along: [number, number, number][] = [[292, 110, 1.6], [312, 40, 2.4], [316, 100, 3.6], [306, 130, 4.6], [300, 186, 5.4]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: COL.air }),
    svg('rect', { x: 0, y: ground, width: 400, height: 240 - ground, fill: '#b9a55a' }),
    line(200, 0, 200, ground, '#fff', 2),
    heading(100, 18, 'Shallow: no time to grow'),
    heading(300, 18, 'Deep: time to grow'),
    svg('rect', { x: 20, y: 38, width: 160, height: 40, rx: 8, fill: cloud }),
    ...shallow.map(([x, y, r, o]) => svg('circle', { cx: x, cy: y, r, fill: COL.rain, opacity: o })),
    small(112, 124, 'falls out small', { fill: COL.rain }),
    small(112, 136, 'and evaporates', { fill: COL.rain }),
    small(100, 196, 'grey, maybe drizzle', { soft: true, anchor: 'middle' }),
    svg('rect', { x: 220, y: 30, width: 160, height: 120, rx: 10, fill: cloud }),
    ...[240, 360].map((x) => arrow(x, 136, x, 60, COL.parcel, 2)),
    small(232, 146, 'updraft', { fill: COL.parcel }),
    polyline(path, COL.rain, 1, { 'stroke-dasharray': '2 3', opacity: 0.7 }),
    ...along.map(([x, y, r]) => svg('circle', { cx: x, cy: y, r, fill: COL.rain })),
    svg('path', { d: `M292,${ground} q4,-7 8,0 q4,-7 8,0`, fill: 'none', stroke: COL.rain, 'stroke-width': 1.5 }),
    small(312, 182, 'falls out big:', { fill: COL.rain }),
    small(312, 194, 'rain', { fill: COL.rain }),
  );
  return { node: d.node };
};
