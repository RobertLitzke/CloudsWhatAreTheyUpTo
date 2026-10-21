// Still pictures: no controls and no task, just a drawing that shows one idea
// from the text around it. They break up the long stretches of prose between
// the live figures.

import {  svg } from '../dom';
import type { GenusId } from '../../core/clouds';
import { drawCloud, SHEETS } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { arrow, flake, heading, hexagon, label, line, points, polyline, puff, small, still, wavy } from './draw';
import { COL, tint, type FigureFactory } from './kit';

// ---- Molecules, warm and cold ------------------------------------------------

export const moleculesDiagram: FigureFactory = () => {
  const d = still(400, 200);
  const warm: [number, number, number][] = [[40, 60, 0.3], [90, 50, 2.4], [150, 70, 4.2], [60, 110, 5.5], [120, 115, 1.2], [170, 125, 3.3], [35, 155, 1.9], [100, 160, 4.9], [155, 165, 0.8]];
  const cluster: [number, number][] = [];
  for (let row = -2; row <= 2; row++) {
    const n = 5 - Math.abs(row);
    for (let i = 0; i < n; i++) cluster.push([300 + (i - (n - 1) / 2) * 11, 115 + row * 9.5]);
  }
  const strays: [number, number, number][] = [[235, 60, 0.6], [365, 70, 2.6], [372, 160, 4.4]];
  const mol = (x: number, y: number) => svg('circle', { cx: x, cy: y, r: 5, fill: COL.dew });
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 200, height: 200, fill: COL.warmSide }),
    svg('rect', { x: 200, y: 0, width: 200, height: 200, fill: COL.air }),
    heading(100, 22, 'Warm: fast molecules bounce apart'),
    heading(300, 22, 'Cold: slow molecules stick'),
    ...warm.map(([x, y, a]) => arrow(x, y, x + 24 * Math.cos(a), y + 24 * Math.sin(a), COL.parcel, 1.5)),
    ...warm.map(([x, y]) => mol(x, y)),
    ...strays.map(([x, y, a]) => arrow(x, y, x + 16 * Math.cos(a), y + 16 * Math.sin(a), COL.cold, 1.5)),
    ...strays.map(([x, y]) => mol(x, y)),
    svg('circle', { cx: 300, cy: 115, r: 30, fill: 'none', stroke: COL.dew, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
    ...cluster.map(([x, y]) => mol(x, y)),
    small(100, 190, 'They stay apart as vapour', { anchor: 'middle' }),
    small(300, 190, 'They clump into a droplet', { anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Rising air expands and cools --------------------------------------------

export const expandDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const ground = 216;
  const yOf = (km: number) => ground - 18 - km * 72;
  const dots: SVGElement[] = [];
  // Background dots for the air, crowded near the ground and sparse aloft.
  let y = ground - 4;
  let gap = 7;
  let row = 0;
  while (y > 8) {
    for (let x = 4 + (row % 2) * gap * 0.5; x < 236; x += gap) dots.push(svg('circle', { cx: x, cy: y, r: 1.1, fill: COL.soft, opacity: 0.35 }));
    y -= gap;
    gap *= 1.045;
    row++;
  }
  const parcels: [number, number, string][] = [[0, 15, '24 °C'], [1, 20, '14 °C'], [2, 26, '4 °C']];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: COL.air }),
    ...dots,
    svg('rect', { x: 0, y: ground, width: 400, height: 240 - ground, fill: COL.ground }),
    ...[0, 1, 2].map((km) => line(0, yOf(km), 236, yOf(km), COL.grid, 1, { 'stroke-dasharray': '3 3' })),
    small(8, yOf(0) - 4, 'near the ground', { soft: true }),
    small(8, yOf(1) - 4, '1 km up', { soft: true }),
    small(8, yOf(2) - 4, '2 km up', { soft: true }),
    arrow(120, yOf(0) - 16, 120, yOf(2) + 30, COL.parcel, 1.5),
    ...parcels.map(([km, r]) => svg('circle', { cx: 160, cy: yOf(km), r, fill: tint(COL.parcel, 0.16), stroke: COL.parcel, 'stroke-width': 2 })),
    ...parcels.map(([km, r, t]) => label(160 + r + 6, yOf(km) + 4, t, { bold: true, fill: COL.parcel, halo: COL.air, haloWidth: 4 })),
    ...[1.6, 3.2, 4.7].map((a) => arrow(160 + 28 * Math.cos(a), yOf(2) + 28 * Math.sin(a), 160 + 38 * Math.cos(a), yOf(2) + 38 * Math.sin(a), COL.parcel, 1.2)),
    small(252, 44, 'Higher up there is less air'),
    small(252, 58, 'pressing down, so the parcel'),
    small(252, 72, 'spreads out as it rises.'),
    small(252, 98, 'Spreading out takes energy'),
    small(252, 112, 'from its own molecules, so'),
    small(252, 126, 'it cools: about 10 °C for'),
    small(252, 140, 'every kilometre it climbs.'),
    small(252, 172, 'The dots are the air around:', { soft: true }),
    small(252, 186, 'crowded low, thinner aloft.', { soft: true }),
  );
  return { node: d.node };
};

// ---- Stable and unstable, in numbers -------------------------------------------

export const stabilityDiagram: FigureFactory = () => {
  const d = still(400, 256);
  const panel = (ox: number, unstable: boolean): SVGElement[] => {
    const airTop = unstable ? 8 : 15;
    const top = 92;
    const bottom = 158;
    const bx = ox + 58;
    return [
      heading(ox + 100, 20, unstable ? 'Unstable' : 'Stable'),
      small(ox + 100, 34, `The air around cools ${unstable ? 12 : 5} °C per km`, { anchor: 'middle', fill: COL.env }),
      line(bx, bottom - 14, bx, top + 18, COL.parcel, 1, { 'stroke-dasharray': '2 3' }),
      small(bx + 6, (top + bottom) / 2 + 3, 'nudged up 1 km', { soft: true }),
      svg('circle', { cx: bx, cy: bottom, r: 14, fill: 'none', stroke: COL.parcel, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }),
      small(bx, bottom + 4, '20°', { anchor: 'middle', fill: COL.parcel }),
      small(ox + 112, bottom + 4, 'air 20 °C', { fill: COL.env }),
      svg('circle', { cx: bx, cy: top, r: 16, fill: unstable ? tint(COL.parcel, 0.22) : tint(COL.cold, 0.3), stroke: COL.parcel, 'stroke-width': 2 }),
      heading(bx, top + 4, '10°', { fill: COL.parcel }),
      small(ox + 112, top + 4, `air ${airTop} °C`, { fill: COL.env }),
      unstable ? arrow(bx, top - 18, bx, top - 44, COL.parcel, 2.5) : arrow(bx + 24, top - 6, bx + 24, top + 22, COL.cold, 2.5),
      small(ox + 100, 190, unstable ? 'Bubble 2° warmer: keeps rising' : 'Bubble 5° colder: sinks back', { bold: true, anchor: 'middle' }),
      // A balloon under a ceiling: it bows down when unstable, so the balloon drifts away; it is domed when stable, so the balloon floats back.
      unstable
        ? svg('path', { d: `M${ox + 40},194 L${ox + 160},194 L${ox + 160},200 Q${ox + 100},256 ${ox + 40},200 Z`, fill: COL.env, opacity: 0.18 })
        : svg('path', { d: `M${ox + 40},194 L${ox + 160},194 L${ox + 160},232 Q${ox + 100},176 ${ox + 40},232 Z`, fill: COL.env, opacity: 0.18 }),
      unstable
        ? svg('path', { d: `M${ox + 40},200 Q${ox + 100},256 ${ox + 160},200`, fill: 'none', stroke: COL.env, 'stroke-width': 2 })
        : svg('path', { d: `M${ox + 40},232 Q${ox + 100},176 ${ox + 160},232`, fill: 'none', stroke: COL.env, 'stroke-width': 2 }),
      svg('circle', { cx: ox + 130, cy: 219, r: 7, fill: 'none', stroke: COL.parcel, 'stroke-width': 1.2, 'stroke-dasharray': '2 2', opacity: unstable ? 0 : 1 }),
      svg('circle', { cx: ox + 100, cy: unstable ? 236 : 212, r: 7, fill: COL.parcel }),
      unstable ? arrow(ox + 110, 236, ox + 128, 228, COL.ink, 1.4) : arrow(ox + 122, 217, ox + 110, 213, COL.ink, 1.4),
    ];
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 200, height: 256, fill: COL.warmSide }),
    svg('rect', { x: 200, y: 0, width: 200, height: 256, fill: COL.air }),
    ...panel(0, true),
    ...panel(200, false),
  );
  return { node: d.node };
};

// ---- Anatomy of a heap ---------------------------------------------------------

export const heapDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const sky = COL.sky;
  const ground = 216;
  const base = 118;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: sky }),
    svg('rect', { x: 0, y: ground, width: 400, height: 24, fill: COL.ground }),
    svg('ellipse', { cx: 200, cy: ground, rx: 44, ry: 5, fill: COL.sun, opacity: 0.85 }),
    line(0, base, 400, base, COL.dew, 1.2, { 'stroke-dasharray': '5 4' }),
    puff(200, 84, 1.45, { base, sky }),
    arrow(200, ground - 8, 200, 40, COL.parcel, 3),
    svg('path', { d: 'M228,52 C275,36 315,50 330,84', fill: 'none', stroke: COL.env, 'stroke-width': 2 }),
    svg('path', { d: 'M172,52 C125,36 85,50 70,84', fill: 'none', stroke: COL.env, 'stroke-width': 2 }),
    arrow(330, 84, 330, 196, COL.env, 2),
    arrow(70, 84, 70, 196, COL.env, 2),
    small(396, base - 5, 'dew-point level', { anchor: 'end', fill: COL.dew }),
    small(208, 28, 'bright top, still rising', { fill: COL.ink }),
    small(208, base + 16, 'flat base: rising air', { fill: COL.parcel }),
    small(208, base + 28, 'reaches its dew point', { fill: COL.parcel }),
    small(214, ground - 14, 'sun-warmed ground', { fill: COL.ink }),
    small(338, 150, 'sinking air', { fill: COL.env }),
    small(338, 162, 'warms: clear', { fill: COL.env }),
    small(62, 150, 'sinking air', { anchor: 'end', fill: COL.env }),
    small(62, 162, 'warms: clear', { anchor: 'end', fill: COL.env }),
  );
  return { node: d.node };
};

// ---- Day and night at the ground ---------------------------------------------------

export const dayNightDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const ground = 160;
  const stars: [number, number][] = [[226, 22], [262, 48], [300, 18], [340, 40], [380, 24], [236, 76], [372, 84]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 200, height: ground, fill: COL.sky }),
    svg('rect', { x: 200, y: 0, width: 200, height: ground, fill: '#2b2843' }),
    ...stars.map(([x, y]) => svg('circle', { cx: x, cy: y, r: 1.3, fill: '#fff' })),
    svg('circle', { cx: 34, cy: 30, r: 14, fill: COL.sun }),
    ...[60, 92, 124].map((x) => arrow(x - 18, 34, x, ground - 4, COL.sun, 3)),
    ...[150, 176].map((x) => wavy(x, ground - 4, 70, COL.warm, 1.2)),
    small(196, 64, 'infrared out', { anchor: 'end', fill: COL.parcel }),
    small(56, 22, 'sunlight in', { fill: COL.sunInk }),
    svg('rect', { x: 200, y: ground - 30, width: 200, height: 30, fill: COL.cold, opacity: 0.55 }),
    ...[222, 266, 310].map((x) => wavy(x, ground - 4, 20, COL.warm, 2)),
    small(394, 100, 'infrared out', { anchor: 'end', fill: COL.warm }),
    small(388, ground - 18, 'coldest air pools', { anchor: 'end', fill: '#fff' }),
    small(388, ground - 6, 'at the bottom', { anchor: 'end', fill: '#fff' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 50, fill: COL.ground }),
    heading(100, ground + 18, 'Day: more in than out', { fill: '#fff' }),
    small(100, ground + 32, 'The ground warms.', { anchor: 'middle', fill: '#fff' }),
    heading(300, ground + 18, 'Night: only out', { fill: '#fff' }),
    small(300, ground + 32, 'The ground cools, and chills', { anchor: 'middle', fill: '#fff' }),
    small(300, ground + 44, 'the air resting on it.', { anchor: 'middle', fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- Fog and stratus are one cloud ---------------------------------------------------

export const fogStratusDiagram: FigureFactory = () => {
  const d = still(400, 200);
  const valley = (ox: number) => `M${ox},84 L${ox + 34},92 Q${ox + 100},200 ${ox + 166},94 L${ox + 200},86 L${ox + 200},200 L${ox},200 Z`;
  const person = (x: number, y: number) => svg('g', {},
    svg('circle', { cx: x, cy: y - 13, r: 3, fill: COL.ink }),
    line(x, y - 10, x, y - 2, COL.ink, 2),
    line(x - 3, y, x, y - 3, COL.ink, 1.5), line(x + 3, y, x, y - 3, COL.ink, 1.5));
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 200, fill: COL.sky }),
    // Fog: the layer sits in the valley, so the ground holds it from below.
    svg('rect', { x: 0, y: 116, width: 200, height: 84, fill: COL.fog }),
    svg('path', { d: valley(0), fill: COL.ground }),
    person(100, 147),
    svg('rect', { x: 0, y: 116, width: 200, height: 84, fill: COL.fog, opacity: 0.6 }),
    svg('path', { d: valley(0), fill: COL.ground }),
    // Stratus: the same layer lifted off the valley floor, hiding the ridges.
    svg('path', { d: valley(200), fill: COL.ground }),
    svg('rect', { x: 200, y: 62, width: 200, height: 36, fill: COL.stratus }),
    line(200, 98, 400, 98, COL.cloudShade, 3),
    person(300, 147),
    line(300, 128, 300, 104, COL.soft, 1, { 'stroke-dasharray': '2 3' }),
    line(200, 0, 200, 200, '#fff', 2),
    heading(100, 22, 'Fog: base on the ground'),
    heading(300, 22, 'Stratus: base off the ground'),
    small(100, 38, 'You are inside the cloud', { anchor: 'middle' }),
    small(300, 38, 'Same layer, lifted: a grey ceiling', { anchor: 'middle' }),
    small(308, 120, 'cloud base', { soft: true }),
  );
  return { node: d.node };
};

// ---- Sharp edges and feathery edges --------------------------------------------

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

// ---- Floors times textures: six names ---------------------------------------------

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

// ---- Stratus and stratocumulus ----------------------------------------------------------

export const layerKindsDiagram: FigureFactory = () => {
  const d = still(400, 262);
  const grey = '#b3bccb';
  const dark = '#8f98ab';
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
  // Views from below.
  const blobs: SVGElement[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const cx = 214 + c * 33 + (r % 2) * 15 + ((r * 7 + c * 5) % 6);
      const cy = 168 + r * 18 + ((c * 3) % 4);
      const rx = 16 + ((r + c) % 3) * 1.5;
      blobs.push(
        svg('ellipse', { cx, cy, rx, ry: 10, fill: '#d3d8e2' }),
        svg('ellipse', { cx: cx + 1, cy: cy + 1, rx: rx * 0.72, ry: 7, fill: grey }),
        svg('ellipse', { cx: cx + 1.5, cy: cy + 1.5, rx: rx * 0.4, ry: 4, fill: dark, opacity: 0.7 }),
      );
    }
  }
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
    svg('rect', { x: 214, y: 162, width: 172, height: 62, rx: 6, fill: '#7fb3d5' }),
    small(100, 240, 'an even grey ceiling, no pattern', { anchor: 'middle' }),
    small(100, 253, 'drizzle at most', { soft: true, anchor: 'middle' }),
    small(300, 240, 'lumps: dark centres, bright rims', { anchor: 'middle' }),
    small(300, 253, 'and gaps of blue between', { soft: true, anchor: 'middle' }),
  );
  // The from-below panel is cut to its frame.
  const clip = svg('clipPath', { id: 'layer-kinds-clip' }, svg('rect', { x: 214, y: 162, width: 172, height: 62, rx: 6 }));
  const g = svg('g', { 'clip-path': 'url(#layer-kinds-clip)' }, ...blobs);
  d.svg.append(svg('defs', {}, clip), g);
  return { node: d.node };
};

// ---- Sinking air makes the lid -------------------------------------------------------------

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

// ---- A million droplets in one raindrop -----------------------------------------------------

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

// ---- Collecting: a big drop sweeps up small ones ------------------------------------------------

export const collideDiagram: FigureFactory = () => {
  const d = still(400, 230);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dropX = 120;
  const dropY = 72;
  const dropR = 9;
  const specks: SVGElement[] = [];
  for (let i = 0; i < 70; i++) {
    const x = 12 + rnd() * 226;
    const y = 30 + rnd() * 190;
    if (Math.hypot(x - dropX, y - dropY) < dropR + 6) continue;
    const inPath = Math.abs(x - dropX) < dropR && y > dropY;
    specks.push(svg('circle', { cx: x, cy: y, r: 1.6 + rnd() * 1.2, fill: inPath ? COL.dew : COL.rain, opacity: inPath ? 1 : 0.55 }));
    if (i % 5 === 0 && !inPath) specks.push(line(x, y + 4, x, y + 9, COL.soft, 1));
  }
  // The same drop a little later, and later still: bigger, faster.
  const stages: [number, number, number][] = [[50, 4, 14], [110, 7, 26], [180, 11, 40]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 250, height: 230, fill: '#eceaf2' }),
    heading(125, 18, 'Inside a warm cloud'),
    line(dropX - dropR, dropY, dropX - dropR, 228, COL.dew, 1, { 'stroke-dasharray': '3 3' }),
    line(dropX + dropR, dropY, dropX + dropR, 228, COL.dew, 1, { 'stroke-dasharray': '3 3' }),
    ...specks,
    svg('circle', { cx: dropX, cy: dropY, r: dropR, fill: COL.rain }),
    arrow(dropX, dropY + dropR + 2, dropX, dropY + dropR + 34, COL.ink, 2),
    small(dropX + 14, dropY - 4, 'a bigger drop falls faster'),
    small(dropX + 16, 150, 'droplets in its path', { fill: COL.dew }),
    small(dropX + 16, 162, 'are swept up', { fill: COL.dew }),
    small(14, 222, 'small droplets barely fall', { soft: true }),
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

// ---- Shallow and deep clouds -----------------------------------------------------------------

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

// ---- Where a droplet starts ------------------------------------------------------------------

export const specksDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const mol = (x: number, y: number) => svg('circle', { cx: x, cy: y, r: 3.2, fill: COL.dew });
  // Left: a bare cluster, too tightly curved to hold on to its molecules.
  const bare: [number, number][] = [[62, 92], [69, 88], [66, 98], [74, 96], [58, 99]];
  const escaping: [number, number, number][] = [[46, 76, 3.8], [92, 80, 5.9], [86, 114, 0.7], [44, 112, 2.6]];
  // Middle: a speck of dust or salt with water gathered round it.
  const coat: [number, number][] = [];
  for (let ring = 0; ring < 2; ring++) {
    const r = 15 + ring * 6.5;
    const n = 12 + ring * 6;
    for (let i = 0; i < n; i++) coat.push([200 + r * Math.cos((i * 2 * Math.PI) / n + ring * 0.2), 96 + r * Math.sin((i * 2 * Math.PI) / n + ring * 0.2)]);
  }
  // Right: a hair, a droplet and a drizzle drop at one scale (1 px = 1 µm, roughly).
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 266, height: 210, fill: COL.air }),
    svg('rect', { x: 266, y: 0, width: 134, height: 210, fill: '#efe9f4' }),
    heading(66, 22, 'Alone: falls apart'),
    ...escaping.map(([x, y, a]) => arrow(x, y, x + 14 * Math.cos(a), y + 14 * Math.sin(a), COL.parcel, 1.3)),
    ...escaping.map(([x, y]) => mol(x, y)),
    ...bare.map(([x, y]) => mol(x, y)),
    small(66, 150, 'A few molecules make', { anchor: 'middle' }),
    small(66, 163, 'a ball so tiny that they', { anchor: 'middle' }),
    small(66, 176, 'escape faster than', { anchor: 'middle' }),
    small(66, 189, 'new ones stick.', { anchor: 'middle' }),
    heading(200, 22, 'On a speck: grows'),
    svg('polygon', { points: '191,90 204,84 211,95 206,107 193,105', fill: '#a7845b' }),
    ...coat.map(([x, y]) => mol(x, y)),
    small(200, 150, 'Dust, smoke or salt', { anchor: 'middle' }),
    small(200, 163, 'gives them a wide, flat', { anchor: 'middle' }),
    small(200, 176, 'surface to gather on:', { anchor: 'middle' }),
    small(200, 189, 'a droplet starts.', { anchor: 'middle' }),
    heading(333, 22, 'How small?'),
    svg('circle', { cx: 333, cy: 76, r: 35, fill: '#6b5440', opacity: 0.85 }),
    small(333, 124, 'a hair, end on', { soft: true, anchor: 'middle' }),
    svg('circle', { cx: 333, cy: 76, r: 5, fill: '#ffffff', stroke: COL.dew, 'stroke-width': 1.5 }),
    small(333, 150, 'The white dot is a', { anchor: 'middle' }),
    small(333, 163, 'cloud droplet. Seven', { anchor: 'middle' }),
    small(333, 176, 'fit across a hair. It', { anchor: 'middle' }),
    small(333, 189, 'falls under 1 cm a second.', { anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- An inversion on a still morning -----------------------------------------------------------

export const inversionDiagram: FigureFactory = () => {
  const d = still(400, 230);
  const ground = 206;
  const lid = 92;
  const hills = 'M0,120 L40,128 Q130,240 220,132 L262,122 L262,230 L0,230 Z';
  // Smoke climbs from the chimney, then flattens out under the warm layer.
  const smoke: [number, number, number][] = [[128, 150, 4], [127, 140, 5], [127, 132, 7], [129, 118, 8], [128, 104, 8], [142, 98, 8], [158, 99, 8], [176, 98, 8], [196, 99, 7], [114, 98, 8], [98, 99, 7], [80, 98, 6]];
  // The profile on the right: colder going up, except through the warm layer.
  const gy = (h: number) => ground - h;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 262, height: ground, fill: COL.air }),
    svg('rect', { x: 0, y: lid - 20, width: 262, height: 20, fill: COL.warm, opacity: 0.25 }),
    svg('rect', { x: 0, y: lid, width: 262, height: ground - lid, fill: COL.cold, opacity: 0.28 }),
    svg('path', { d: hills, fill: COL.ground }),
    svg('rect', { x: 118, y: 170, width: 22, height: 16, fill: '#e8d9c0' }),
    svg('polygon', { points: '114,171 129,160 144,171', fill: '#9b6b52' }),
    svg('rect', { x: 125, y: 156, width: 5, height: 12, fill: '#9b6b52' }),
    ...smoke.map(([x, y, r]) => svg('circle', { cx: x, cy: y, r, fill: '#a9a3b4', opacity: 0.5 })),
    small(6, lid - 26, 'warmer layer above: the lid', { fill: COL.warmInk }),
    small(6, lid + 14, 'smoke rises, then spreads flat', { soft: true }),
    small(6, 200, 'coldest, heaviest air pools in the bottom', { fill: '#fff' }),
    heading(130, 18, 'A still morning in a valley'),
    // The profile.
    svg('rect', { x: 262, y: 0, width: 138, height: ground, fill: '#f6f2ea' }),
    svg('rect', { x: 262, y: ground, width: 138, height: 230 - ground, fill: COL.ground }),
    svg('rect', { x: 0, y: ground, width: 262, height: 230 - ground, fill: COL.ground }),
    line(272, 30, 272, ground, COL.ink, 1),
    polyline([[290, ground], [362, lid], [318, 30]], COL.env, 2.4),
    line(262, lid, 400, lid, COL.grid, 1, { 'stroke-dasharray': '3 3' }),
    heading(331, 18, 'Temperature'),
    small(306, gy(4), 'cold at the ground', { fill: COL.coldInk }),
    small(318, gy(78), 'warmer', { anchor: 'end', fill: COL.env }),
    small(318, gy(66), 'going up', { anchor: 'end', fill: COL.env }),
    small(326, 56, 'then colder', { soft: true, anchor: 'end' }),
    small(326, 68, 'as usual', { soft: true, anchor: 'end' }),
    small(396, 222, 'warmer →', { anchor: 'end', fill: '#fff' }),
    small(270, 222, 'height ↑', { fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- Fog burning off ---------------------------------------------------------------------------

export const burnOffDiagram: FigureFactory = () => {
  const d = still(400, 224);
  const w = 400 / 3;
  const panel = (i: number): SVGElement[] => {
    const ox = i * w;
    const valley = `M${ox},74 L${ox + 22},80 Q${ox + w / 2},186 ${ox + w - 22},82 L${ox + w},76 L${ox + w},176 L${ox},176 Z`;
    const sun: [number, number] = [[ox + 18, 66], [ox + 30, 34], [ox + w / 2, 18]][i] as [number, number];
    const out: SVGElement[] = [
      svg('rect', { x: ox, y: 0, width: w, height: 176, fill: ['#e7e3ef', COL.sky, '#cfe6f5'][i] }),
      svg('circle', { cx: sun[0], cy: sun[1], r: 9, fill: COL.sun }),
    ];
    if (i === 0) out.push(svg('rect', { x: ox, y: 96, width: w, height: 80, fill: COL.fog }));
    out.push(svg('path', { d: valley, fill: COL.ground }));
    if (i === 0) out.push(svg('rect', { x: ox, y: 96, width: w, height: 80, fill: COL.fog, opacity: 0.6 }));
    if (i === 1) {
      out.push(
        svg('rect', { x: ox, y: 60, width: w, height: 32, fill: COL.stratus }),
        line(ox, 92, ox + w, 92, COL.cloudShade, 2.5),
        ...[ox + 46, ox + 66, ox + 86].map((x) => arrow(x, 150, x, 112, COL.parcel, 1.4)),
      );
    }
    if (i === 2) {
      out.push(...[[ox + 34, 64, 18], [ox + 92, 58, 14]].map(([x, y, r]) => svg('ellipse', { cx: x, cy: y, rx: r, ry: 5, fill: '#ffffff', opacity: 0.85 })));
    }
    return out;
  };
  const captions: [string, string, string][] = [
    ['Dawn: fog', 'chilled air at its dew', 'point, on the ground'],
    ['Mid-morning: stratus', 'the sun warms the ground;', 'the bottom evaporates first'],
    ['Late morning: gone', 'the air is warmer than', 'its dew point again'],
  ];
  d.svg.append(
    ...[0, 1, 2].flatMap(panel),
    svg('rect', { x: 0, y: 176, width: 400, height: 48, fill: COL.ground }),
    ...captions.flatMap(([t, a, b], i) => [
      small(i * w + w / 2, 192, t, { bold: true, anchor: 'middle', fill: '#fff' }),
      small(i * w + w / 2, 205, a, { anchor: 'middle', fill: '#fff' }),
      small(i * w + w / 2, 217, b, { anchor: 'middle', fill: '#fff' }),
    ]),
    line(w, 0, w, 176, '#fff', 2),
    line(2 * w, 0, 2 * w, 176, '#fff', 2),
  );
  return { node: d.node };
};

// ---- Why a cloudy bubble keeps rising --------------------------------------------------------------

export const latentDiagram: FigureFactory = () => {
  const d = still(400, 250);
  const x0 = 40;
  const y0 = 222;
  const gx = (c: number) => x0 + (c + 2) * 9.5;
  const gy = (km: number) => y0 - km * 64;
  // The air around: well stirred below the base (10 °C per km), then 7 °C per km.
  const env: [number, number][] = [[25, 0], [15, 1], [8, 2], [1, 3]];
  const dry: [number, number][] = [[26, 0], [16, 1], [6, 2], [-2, 2.8]];
  const wet: [number, number][] = [[16, 1], [11, 2], [6, 3]];
  const pts = (a: [number, number][]) => a.map(([c, km]) => [gx(c), gy(km)] as [number, number]);
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: y0, fill: COL.air }),
    svg('rect', { x: x0, y: gy(3), width: 400 - x0, height: gy(1) - gy(3), fill: '#ffffff', opacity: 0.7 }),
    line(x0, gy(1), 400, gy(1), COL.dew, 1.2, { 'stroke-dasharray': '5 4' }),
    small(396, gy(1) + 14, 'cloud base', { anchor: 'end', fill: COL.dew }),
    ...[1, 2, 3].map((km) => small(x0 - 6, gy(km) + 4, `${km} km`, { soft: true, anchor: 'end' })),
    small(x0 - 6, y0 + 4, 'ground', { soft: true, anchor: 'end' }),
    line(x0, 10, x0, y0, COL.ink, 1),
    line(x0, y0, 400, y0, COL.ink, 1),
    small(398, y0 + 18, 'warmer →', { soft: true, anchor: 'end' }),
    polyline(pts(env), COL.env, 2.6),
    polyline(pts(dry.slice(1)), COL.parcel, 1.6, { 'stroke-dasharray': '4 4' }),
    polyline(pts(dry.slice(0, 2)), COL.parcel, 2.6),
    polyline(pts(wet), COL.parcel, 2.6),
    small(gx(25) + 6, gy(0.15), 'air around', { fill: COL.env }),
    svg('circle', { cx: gx(8), cy: gy(2), r: 4, fill: COL.env }),
    svg('circle', { cx: gx(6), cy: gy(2), r: 4, fill: '#fff', stroke: COL.parcel, 'stroke-width': 2 }),
    svg('circle', { cx: gx(11), cy: gy(2), r: 4, fill: COL.parcel }),
    small(gx(20) + 6, gy(0.55), 'bubble: 10 °C per km', { fill: COL.parcel }),
    small(gx(8) + 10, gy(2.6), 'in cloud: 5 °C per km', { fill: COL.parcel }),
    small(gx(13) - 10, gy(1.3), 'if it stayed dry', { anchor: 'end', fill: COL.parcel }),
    small(252, 62, 'At 2 km:', { bold: true }),
    small(252, 78, 'cloudy bubble 11 °C', { bold: true, fill: COL.parcel }),
    small(252, 92, 'air around 8 °C', { fill: COL.env }),
    small(252, 106, 'dry bubble 6 °C', { fill: COL.parcel }),
    small(252, 124, 'The cloudy one is 3° warmer'),
    small(252, 137, 'and keeps rising; a dry one'),
    small(252, 150, 'would be 2° colder and stop.'),
  );
  return { node: d.node };
};

// ---- A kettle: vapour is invisible -------------------------------------------------------------

export const kettleDiagram: FigureFactory = () => {
  const d = still(400, 200);
  // The spout's mouth, and the plume that starts a little way out from it.
  const mx = 128;
  const my = 120;
  const plume: [number, number, number, number][] = [[178, 108, 9, 0.75], [196, 100, 12, 0.85], [218, 90, 15, 0.9], [244, 80, 18, 0.85], [272, 70, 21, 0.7], [302, 62, 23, 0.5], [332, 56, 24, 0.3]];
  const vapour: [number, number][] = [[136, 116], [144, 121], [150, 113], [158, 118], [140, 110], [164, 111], [154, 124]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 200, fill: COL.air }),
    svg('path', { d: 'M10,200 L10,150 Q10,118 46,116 L70,116 Q98,116 98,146 L98,200 Z', fill: '#8a7fa6' }),
    svg('rect', { x: 40, y: 108, width: 26, height: 9, rx: 3, fill: '#6f6590' }),
    svg('path', { d: `M94,150 L${mx},${my - 6} L${mx + 4},${my + 6} L96,172 Z`, fill: '#8a7fa6' }),
    ...plume.map(([x, y, r, o]) => svg('circle', { cx: x, cy: y, r, fill: '#ffffff', opacity: o })),
    ...vapour.map(([x, y]) => svg('circle', { cx: x, cy: y, r: 1.6, fill: COL.dew })),
    line(mx + 4, 140, 172, 140, COL.ink, 1),
    line(mx + 4, 136, mx + 4, 144, COL.ink, 1),
    line(172, 136, 172, 144, COL.ink, 1),
    small(150, 158, 'clear gap', { anchor: 'middle' }),
    small(150, 171, 'invisible vapour:', { anchor: 'middle', fill: COL.dew }),
    small(150, 184, 'single molecules', { anchor: 'middle', fill: COL.dew }),
    small(250, 130, 'white plume: the vapour', { fill: COL.ink }),
    small(250, 143, 'has cooled and clumped', { fill: COL.ink }),
    small(250, 156, 'into tiny droplets that', { fill: COL.ink }),
    small(250, 169, 'scatter light', { fill: COL.ink }),
    heading(200, 22, 'Steam you can see is not vapour'),
  );
  return { node: d.node };
};

// ---- Warm air is lighter --------------------------------------------------------------------------

export const densityDiagram: FigureFactory = () => {
  const d = still(400, 220);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const box = (ox: number, n: number, len: number, color: string): SVGElement[] => {
    const out: SVGElement[] = [svg('rect', { x: ox, y: 40, width: 150, height: 120, rx: 6, fill: '#ffffff', stroke: COL.ink, 'stroke-width': 1.5 })];
    for (let i = 0; i < n; i++) {
      const x = ox + 12 + rnd() * 126;
      const y = 52 + rnd() * 96;
      const a = rnd() * Math.PI * 2;
      out.push(arrow(x, y, x + len * Math.cos(a), y + len * Math.sin(a), color, 1.2), svg('circle', { cx: x, cy: y, r: 3, fill: COL.ink }));
    }
    return out;
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 220, fill: '#f3eff6' }),
    heading(100, 24, 'Warm: fast, fewer'),
    heading(300, 24, 'Cold: slow, more'),
    ...box(25, 9, 22, COL.parcel),
    ...box(225, 20, 14, COL.cold),
    small(100, 180, 'Each fast molecule hits hard, so', { anchor: 'middle' }),
    small(100, 193, 'fewer are needed to push back:', { anchor: 'middle' }),
    small(100, 206, 'lighter, so it rises', { bold: true, anchor: 'middle', fill: COL.parcel }),
    small(300, 180, 'Slow molecules hit gently, so', { anchor: 'middle' }),
    small(300, 193, 'it takes more of them:', { anchor: 'middle' }),
    small(300, 206, 'heavier, so it sinks', { bold: true, anchor: 'middle', fill: COL.coldInk }),
  );
  return { node: d.node };
};

// ---- Warm air gliding up over cold ----------------------------------------------------------------

export const glideDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const ground = 180;
  // The cold wedge: its top slopes gently up from the front (right) to the left.
  const wedge = `M0,${ground} L0,96 L330,${ground} Z`;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: COL.warmSide }),
    svg('path', { d: wedge, fill: COL.cold, opacity: 0.45 }),
    svg('rect', { x: 0, y: ground, width: 400, height: 30, fill: COL.ground }),
    // Sheets of cloud along the slope, highest and thinnest far ahead.
    svg('rect', { x: 20, y: 40, width: 120, height: 8, rx: 4, fill: '#ffffff', stroke: COL.cloudShade }),
    svg('rect', { x: 110, y: 76, width: 140, height: 16, rx: 6, fill: '#ece9f2', stroke: COL.cloudShade }),
    svg('rect', { x: 210, y: 112, width: 120, height: 30, rx: 8, fill: '#d6d2e2', stroke: COL.cloudShade }),
    arrow(390, 168, 300, 126, COL.parcel, 2.5),
    arrow(290, 120, 170, 66, COL.parcel, 2.5),
    arrow(160, 60, 60, 30, COL.parcel, 2),
    small(396, 98, 'warm, moist air', { anchor: 'end', fill: COL.parcel }),
    small(6, 160, 'cold, heavy air', { fill: COL.coldInk }),
    small(330, ground + 18, 'the front, on the ground', { anchor: 'middle', fill: '#fff' }),
    small(80, 62, 'high, thin', { soft: true, anchor: 'middle' }),
    small(180, 106, 'middle sheets', { soft: true, anchor: 'middle' }),
    small(270, 156, 'thick, low', { soft: true, anchor: 'middle' }),
    heading(200, 18, 'Seen from far ahead, the cloud comes first'),
    small(6, ground + 18, '← hundreds of km ahead', { fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- A cloud layer turning over ----------------------------------------------------------------------

export const overturnDiagram: FigureFactory = () => {
  const d = still(400, 230);
  const top = 92;
  const base = 152;
  const cells: SVGElement[] = [];
  for (let i = 0; i < 4; i++) {
    const cx = 50 + i * 100;
    cells.push(
      svg('ellipse', { cx, cy: (top + base) / 2, rx: 44, ry: 34, fill: '#ffffff' }),
      arrow(cx, base - 6, cx, top + 8, COL.parcel, 1.6),
      arrow(cx + 50, top + 10, cx + 50, base - 8, COL.cold, 1.6),
    );
  }
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 230, fill: COL.sky }),
    svg('rect', { x: 0, y: top, width: 400, height: base - top, fill: '#eceaf2' }),
    ...cells,
    ...[60, 160, 260, 360].map((x) => wavy(x, top - 4, 48, COL.warm, 1.6)),
    small(6, 18, 'The top radiates heat to the cold, clear sky', { fill: COL.warmInk }),
    small(6, 32, 'and gets little back: it cools.', { fill: COL.warmInk }),
    small(6, 176, 'The base is kept warm by heat from the ground below.', { fill: COL.warmInk }),
    small(6, 208, 'Chilled air at the top sinks (blue), warmer air rises (orange):'),
    small(6, 222, 'lumps where it rises, thin gaps where it sinks.'),
  );
  return { node: d.node };
};

// ---- What makes a droplet freeze ----------------------------------------------------------------------

export const freezeSeedsDiagram: FigureFactory = () => {
  const d = still(400, 200);
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 200, fill: COL.air }),
    line(200, 0, 200, 176, '#fff', 2),
    heading(100, 22, 'On salt or soot'),
    svg('circle', { cx: 100, cy: 92, r: 40, fill: COL.rain, opacity: 0.3, stroke: COL.rain, 'stroke-width': 2 }),
    svg('rect', { x: 92, y: 84, width: 16, height: 16, fill: COL.dust }),
    small(100, 152, 'Wrong shape: no template.', { anchor: 'middle' }),
    small(100, 166, 'Stays liquid, supercooled.', { anchor: 'middle', fill: COL.rain }),
    heading(300, 22, 'On a rare dust grain'),
    hexagon(300, 92, 40, { fill: '#eef5ff', stroke: COL.ice, 'stroke-width': 2 }, Math.PI / 6),
    hexagon(300, 92, 10, { fill: '#a7845b' }, Math.PI / 6),
    small(300, 152, 'Its atoms line up like ice:', { anchor: 'middle' }),
    small(300, 166, 'the droplet freezes.', { anchor: 'middle', fill: COL.ice }),
    small(200, 190, 'About one speck in a million can do this. Below −38 °C, every droplet freezes anyway.', { soft: true, anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Ice holds its molecules tighter -------------------------------------------------------------------

export const escapeDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const mol = (x: number, y: number) => svg('circle', { cx: x, cy: y, r: 2.6, fill: COL.dew });
  const out = (cx: number, cy: number, r: number, angles: number[]) => angles.flatMap((a) => {
    const x = cx + (r + 4) * Math.cos(a);
    const y = cy + (r + 4) * Math.sin(a);
    return [arrow(x, y, x + 16 * Math.cos(a), y + 16 * Math.sin(a), COL.parcel, 1.3), mol(x + 20 * Math.cos(a), y + 20 * Math.sin(a))];
  });
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 210, fill: COL.air }),
    heading(100, 22, 'Supercooled droplet'),
    heading(300, 22, 'Ice crystal'),
    svg('circle', { cx: 100, cy: 96, r: 34, fill: COL.rain, opacity: 0.35, stroke: COL.rain, 'stroke-width': 2 }),
    ...out(100, 96, 34, [0.2, 1.1, 2.0, 2.9, 3.8, 4.6, 5.5]),
    hexagon(300, 96, 34, { fill: '#f4f9ff', stroke: COL.ice, 'stroke-width': 2 }),
    ...out(300, 96, 34, [0.9, 3.6]),
    small(100, 160, 'Molecules escape easily,', { anchor: 'middle' }),
    small(100, 173, 'so it needs more vapour', { anchor: 'middle' }),
    small(100, 186, 'around to stay in balance', { anchor: 'middle' }),
    small(300, 160, 'Locked in the lattice, few', { anchor: 'middle' }),
    small(300, 173, 'escape: less vapour is', { anchor: 'middle' }),
    small(300, 186, 'enough to make it grow', { anchor: 'middle' }),
    arrow(146, 60, 254, 60, COL.dew, 2),
    small(200, 52, 'vapour drifts over', { anchor: 'middle', fill: COL.dew }),
    small(200, 204, 'At −12 °C, air just right for the droplet has 13% more vapour than the ice needs.', { soft: true, anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Snow becomes rain ----------------------------------------------------------------------------------

export const snowToRainDiagram: FigureFactory = () => {
  const d = still(400, 250);
  const ground = 228;
  const freeze = 150;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: COL.air }),
    svg('rect', { x: 20, y: 18, width: 250, height: 150, rx: 14, fill: '#e1deea' }),
    svg('rect', { x: 20, y: 40, width: 250, height: 36, fill: '#d3e1f3', opacity: 0.8 }),
    line(0, freeze, 400, freeze, COL.dew, 1.4, { 'stroke-dasharray': '5 4' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 22, fill: COL.ground }),
    flake(140, 56, 4, COL.ice, 1.6), flake(140, 96, 7, COL.ice, 1.6), flake(140, 128, 10, COL.ice, 1.6),
    svg('ellipse', { cx: 140, cy: 160, rx: 9, ry: 7, fill: COL.rain, opacity: 0.6 }),
    svg('rect', { x: 110, y: 152, width: 60, height: 16, fill: COL.sun, opacity: 0.25 }),
    svg('circle', { cx: 140, cy: 192, r: 3, fill: COL.rain }),
    svg('circle', { cx: 140, cy: 214, r: 3, fill: COL.rain }),
    small(280, 50, '−10 to −15 °C: ice crystals', { fill: COL.ice }),
    small(280, 63, 'grow fastest', { fill: COL.ice }),
    small(280, 100, 'they fall, catch droplets', { fill: COL.ink }),
    small(280, 113, 'and clump into snowflakes', { fill: COL.ink }),
    small(396, freeze - 6, '0 °C: freezing level', { anchor: 'end', fill: COL.dew }),
    small(280, 168, 'melting: a bright band', { fill: COL.sunInk }),
    small(280, 181, 'on weather radar', { fill: COL.sunInk }),
    small(280, 206, 'raindrops', { fill: COL.rain }),
  );
  return { node: d.node };
};

// ---- The lid at the top of the weather ----------------------------------------------------------------

export const tropopauseDiagram: FigureFactory = () => {
  const d = still(400, 250);
  const ground = 230;
  const yOf = (km: number) => ground - km * 13.5;
  const xOf = (c: number) => 262 + (c + 60) * 1.6;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: yOf(11), fill: '#e6e2f3' }),
    svg('rect', { x: 0, y: yOf(11), width: 400, height: ground - yOf(11), fill: COL.air }),
    svg('rect', { x: 0, y: ground, width: 400, height: 20, fill: COL.ground }),
    line(0, yOf(11), 400, yOf(11), COL.env, 1.4, { 'stroke-dasharray': '5 4' }),
    // A storm tower whose top spreads into an anvil under the lid.
    svg('path', { d: `M60,${ground} L60,${yOf(4)} Q50,${yOf(8)} 80,${yOf(10)} L20,${yOf(10.6)} Q90,${yOf(11.6)} 200,${yOf(10.8)} L120,${yOf(10)} Q150,${yOf(7)} 130,${yOf(4)} L130,${ground} Z`, fill: '#ffffff', stroke: COL.cloudShade, 'stroke-width': 1.2 }),
    arrow(95, yOf(2), 95, yOf(9.6), COL.parcel, 2.2),
    arrow(110, yOf(10.4), 180, yOf(10.5), COL.parcel, 1.6),
    // The temperature profile.
    line(xOf(-60), 20, xOf(-60), ground, COL.ink, 1),
    polyline([[xOf(20), yOf(0)], [xOf(-55), yOf(11)], [xOf(-55), yOf(13)], [xOf(-45), yOf(16)]], COL.env, 2.4),
    heading(325, 16, 'Temperature'),
    small(6, yOf(15.6), 'stratosphere: warmer going up', { fill: COL.env }),
    small(142, yOf(3), 'troposphere:', { soft: true }),
    small(142, yOf(2), 'colder going up', { soft: true }),
    small(396, yOf(11) + 12, 'tropopause, 10–12 km', { anchor: 'end', fill: COL.env }),
    small(6, yOf(12.6), 'the tower can’t climb on: its top spreads into an anvil'),
    small(396, ground + 14, 'warmer →', { anchor: 'end', fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- Where a storm keeps its charge ------------------------------------------------------------------

export const chargeDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const ground = 218;
  const sign = (x: number, y: number, plus: boolean) => heading(x, y, plus ? '+' : '−', { fill: plus ? COL.redInk : COL.blue });
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: '#dfe3ec' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 22, fill: COL.ground }),
    svg('path', { d: `M110,170 L100,90 Q100,50 70,44 L40,38 Q140,20 300,34 L230,46 Q200,60 210,100 L220,170 Q165,182 110,170 Z`, fill: '#ffffff', stroke: COL.cloudShade, 'stroke-width': 1.4 }),
    ...[[90, 40], [130, 36], [170, 34], [210, 36], [250, 36]].map(([x, y]) => sign(x, y + 4, true)),
    ...[[130, 120], [160, 128], [190, 120], [145, 140], [175, 142]].map(([x, y]) => sign(x, y, false)),
    small(260, 24, 'light ice crystals: +', { fill: COL.redInk }),
    small(260, 36, 'swept up into the anvil', { fill: COL.redInk }),
    small(165, 158, 'heavier soft hail: −', { anchor: 'middle', fill: COL.blue }),
    polyline([[160, 172], [150, 190], [164, 196], [152, ground]], '#f2c12e', 3),
    polyline([[292, 40], [302, 100], [290, 120], [306, 180], [296, 200], [304, ground]], '#f2c12e', 2.4),
    small(316, 150, 'a bolt from'),
    small(316, 162, 'the anvil can'),
    small(316, 174, 'land 10 km off'),
    small(20, 200, 'collisions in the cold middle', { soft: true }),
    small(20, 212, 'sort the charges apart', { soft: true }),
  );
  return { node: d.node };
};
