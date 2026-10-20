// Still pictures: no controls and no task, just a drawing that shows one idea
// from the text around it. They break up the long stretches of prose between
// the live figures.

import { el, svg } from '../dom';
import type { GenusId } from '../../core/clouds';
import { drawCloud, SHEETS } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { COL, label, line, polyline, type FigureFactory } from './kit';

function diagram(w: number, h: number): { node: HTMLElement; svg: SVGSVGElement } {
  const s = svg('svg', { viewBox: `0 0 ${w} ${h}`, class: 'fig-svg', role: 'img' }) as SVGSVGElement;
  return { node: el('div.fig-body.fig-still', {}, s), svg: s };
}

function arrow(x1: number, y1: number, x2: number, y2: number, color: string, width = 2): SVGElement {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = 5 + width * 1.5;
  const tip = (da: number) => `${x2 - head * Math.cos(a + da)},${y2 - head * Math.sin(a + da)}`;
  return svg('g', {},
    line(x1, y1, x2 - head * 0.7 * Math.cos(a), y2 - head * 0.7 * Math.sin(a), color, width),
    svg('polygon', { points: `${x2},${y2} ${tip(0.45)} ${tip(-0.45)}`, fill: color }));
}

/** An arrow drawn as a wave, for infrared light, going straight up or down. */
function wavy(x: number, y1: number, y2: number, color: string, width = 2): SVGElement {
  const pts: [number, number][] = [];
  const dir = Math.sign(y2 - y1);
  const len = Math.abs(y2 - y1) - 8;
  for (let d = 0; d <= len; d += 2) pts.push([x + 4 * Math.sin(d / 4), y1 + dir * d]);
  return svg('g', {}, polyline(pts, color, width), arrow(x, y2 - dir * 9, x, y2, color, width));
}

/** A cumulus-like puff from circles, with a flat base cut at `base` when given. */
function puff(cx: number, cy: number, s: number, cut?: { base: number; sky: string }): SVGElement {
  const blobs: [number, number, number][] = [[-22, 6, 16], [0, -8, 22], [22, 4, 17], [-8, -24, 14], [12, -22, 15], [0, 10, 18]];
  const g = svg('g', {}, ...blobs.map(([dx, dy, r]) => svg('circle', { cx: cx + dx * s, cy: cy + dy * s, r: r * s, fill: COL.cloud, stroke: COL.cloudShade, 'stroke-width': 1 })));
  if (cut) g.append(svg('rect', { x: cx - 50 * s, y: cut.base, width: 100 * s, height: 40 * s, fill: cut.sky }));
  return g;
}

const text = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => label(x, y, s, { class: 'fig-label small', ...attrs });
const title = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => label(x, y, s, { class: 'fig-label bold', 'text-anchor': 'middle', ...attrs });

// ---- Molecules, warm and cold ------------------------------------------------

export const moleculesDiagram: FigureFactory = () => {
  const d = diagram(400, 200);
  const warm: [number, number, number][] = [[40, 60, 0.3], [90, 50, 2.4], [150, 70, 4.2], [60, 110, 5.5], [120, 115, 1.2], [170, 125, 3.3], [35, 155, 1.9], [100, 160, 4.9], [155, 165, 0.8]];
  const cluster: [number, number][] = [];
  for (let row = -2; row <= 2; row++) {
    const n = 5 - Math.abs(row);
    for (let i = 0; i < n; i++) cluster.push([300 + (i - (n - 1) / 2) * 11, 115 + row * 9.5]);
  }
  const strays: [number, number, number][] = [[235, 60, 0.6], [365, 70, 2.6], [372, 160, 4.4]];
  const mol = (x: number, y: number) => svg('circle', { cx: x, cy: y, r: 5, fill: COL.dew });
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 200, height: 200, fill: '#fbeee6' }),
    svg('rect', { x: 200, y: 0, width: 200, height: 200, fill: '#e6eef8' }),
    title(100, 22, 'Warm: fast molecules bounce apart'),
    title(300, 22, 'Cold: slow molecules stick'),
    ...warm.map(([x, y, a]) => arrow(x, y, x + 24 * Math.cos(a), y + 24 * Math.sin(a), COL.parcel, 1.5)),
    ...warm.map(([x, y]) => mol(x, y)),
    ...strays.map(([x, y, a]) => arrow(x, y, x + 16 * Math.cos(a), y + 16 * Math.sin(a), COL.cold, 1.5)),
    ...strays.map(([x, y]) => mol(x, y)),
    svg('circle', { cx: 300, cy: 115, r: 30, fill: 'none', stroke: COL.dew, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
    ...cluster.map(([x, y]) => mol(x, y)),
    text(100, 190, 'They stay apart as vapour', { 'text-anchor': 'middle' }),
    text(300, 190, 'They clump into a droplet', { 'text-anchor': 'middle' }),
  );
  return { node: d.node };
};

// ---- Rising air expands and cools --------------------------------------------

export const expandDiagram: FigureFactory = () => {
  const d = diagram(400, 240);
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
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: '#e9f1f4' }),
    ...dots,
    svg('rect', { x: 0, y: ground, width: 400, height: 240 - ground, fill: COL.ground }),
    ...[0, 1, 2].map((km) => line(0, yOf(km), 236, yOf(km), COL.grid, 1, { 'stroke-dasharray': '3 3' })),
    text(8, yOf(0) - 4, 'near the ground', { class: 'fig-label small soft' }),
    text(8, yOf(1) - 4, '1 km up', { class: 'fig-label small soft' }),
    text(8, yOf(2) - 4, '2 km up', { class: 'fig-label small soft' }),
    arrow(120, yOf(0) - 16, 120, yOf(2) + 30, COL.parcel, 1.5),
    ...parcels.map(([km, r]) => svg('circle', { cx: 160, cy: yOf(km), r, fill: 'rgba(224, 102, 63, 0.16)', stroke: COL.parcel, 'stroke-width': 2 })),
    ...parcels.map(([km, r, t]) => label(160 + r + 6, yOf(km) + 4, t, { class: 'fig-label bold', fill: COL.parcel, stroke: '#e9f1f4', 'stroke-width': 4, 'paint-order': 'stroke' })),
    ...[1.6, 3.2, 4.7].map((a) => arrow(160 + 28 * Math.cos(a), yOf(2) + 28 * Math.sin(a), 160 + 38 * Math.cos(a), yOf(2) + 38 * Math.sin(a), COL.parcel, 1.2)),
    text(252, 44, 'Higher up there is less air'),
    text(252, 58, 'pressing down, so the parcel'),
    text(252, 72, 'spreads out as it rises.'),
    text(252, 98, 'Spreading out takes energy'),
    text(252, 112, 'from its own molecules, so'),
    text(252, 126, 'it cools: about 10 °C for'),
    text(252, 140, 'every kilometre it climbs.'),
    text(252, 172, 'The dots are the air around:', { class: 'fig-label small soft' }),
    text(252, 186, 'crowded low, thinner aloft.', { class: 'fig-label small soft' }),
  );
  return { node: d.node };
};

// ---- Stable and unstable, in numbers -------------------------------------------

export const stabilityDiagram: FigureFactory = () => {
  const d = diagram(400, 256);
  const panel = (ox: number, unstable: boolean): SVGElement[] => {
    const airTop = unstable ? 8 : 14;
    const top = 92;
    const bottom = 158;
    const bx = ox + 58;
    return [
      title(ox + 100, 20, unstable ? 'Unstable' : 'Stable'),
      text(ox + 100, 34, `The air around cools ${unstable ? 12 : 6} °C per km`, { 'text-anchor': 'middle', fill: COL.env }),
      line(bx, bottom - 14, bx, top + 18, COL.parcel, 1, { 'stroke-dasharray': '2 3' }),
      text(bx + 6, (top + bottom) / 2 + 3, 'nudged up 1 km', { class: 'fig-label small soft' }),
      svg('circle', { cx: bx, cy: bottom, r: 14, fill: 'none', stroke: COL.parcel, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }),
      label(bx, bottom + 4, '20°', { 'text-anchor': 'middle', class: 'fig-label small', fill: COL.parcel }),
      text(ox + 112, bottom + 4, 'air 20 °C', { fill: COL.env }),
      svg('circle', { cx: bx, cy: top, r: 16, fill: unstable ? 'rgba(224, 102, 63, 0.22)' : 'rgba(127, 168, 216, 0.3)', stroke: COL.parcel, 'stroke-width': 2 }),
      label(bx, top + 4, '10°', { 'text-anchor': 'middle', class: 'fig-label bold', fill: COL.parcel }),
      text(ox + 112, top + 4, `air ${airTop} °C`, { fill: COL.env }),
      unstable ? arrow(bx, top - 18, bx, top - 44, COL.parcel, 2.5) : arrow(bx + 24, top - 6, bx + 24, top + 22, COL.cold, 2.5),
      title(ox + 100, 190, unstable ? 'Bubble 2° warmer: keeps rising' : 'Bubble 4° colder: sinks back', { class: 'fig-label small bold' }),
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
    svg('rect', { x: 0, y: 0, width: 200, height: 256, fill: '#fbeee6' }),
    svg('rect', { x: 200, y: 0, width: 200, height: 256, fill: '#e6eef8' }),
    ...panel(0, true),
    ...panel(200, false),
  );
  return { node: d.node };
};

// ---- Anatomy of a heap ---------------------------------------------------------

export const heapDiagram: FigureFactory = () => {
  const d = diagram(400, 240);
  const sky = '#dcebf3';
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
    text(396, base - 5, 'dew-point level', { 'text-anchor': 'end', fill: COL.dew }),
    text(208, 28, 'bright top, still rising', { fill: COL.ink }),
    text(208, base + 16, 'flat base: rising air', { fill: COL.parcel }),
    text(208, base + 28, 'reaches its dew point', { fill: COL.parcel }),
    text(214, ground - 14, 'sun-warmed ground', { fill: COL.ink }),
    text(338, 150, 'sinking air', { fill: COL.env }),
    text(338, 162, 'warms: clear', { fill: COL.env }),
    text(62, 150, 'sinking air', { fill: COL.env, 'text-anchor': 'end' }),
    text(62, 162, 'warms: clear', { fill: COL.env, 'text-anchor': 'end' }),
  );
  return { node: d.node };
};

// ---- Day and night at the ground ---------------------------------------------------

export const dayNightDiagram: FigureFactory = () => {
  const d = diagram(400, 210);
  const ground = 160;
  const stars: [number, number][] = [[226, 22], [262, 48], [300, 18], [340, 40], [380, 24], [236, 76], [372, 84]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 200, height: ground, fill: '#dcebf3' }),
    svg('rect', { x: 200, y: 0, width: 200, height: ground, fill: '#2b2843' }),
    ...stars.map(([x, y]) => svg('circle', { cx: x, cy: y, r: 1.3, fill: '#fff' })),
    svg('circle', { cx: 34, cy: 30, r: 14, fill: COL.sun }),
    ...[60, 92, 124].map((x) => arrow(x - 18, 34, x, ground - 4, COL.sun, 3)),
    ...[150, 176].map((x) => wavy(x, ground - 4, 70, COL.warm, 1.2)),
    text(196, 64, 'infrared out', { 'text-anchor': 'end', fill: COL.parcel }),
    text(56, 22, 'sunlight in', { fill: '#b06a10' }),
    svg('rect', { x: 200, y: ground - 30, width: 200, height: 30, fill: COL.cold, opacity: 0.55 }),
    ...[222, 266, 310].map((x) => wavy(x, ground - 4, 20, COL.warm, 2)),
    text(394, 100, 'infrared out', { 'text-anchor': 'end', fill: COL.warm }),
    text(388, ground - 18, 'coldest air pools', { 'text-anchor': 'end', fill: '#fff' }),
    text(388, ground - 6, 'at the bottom', { 'text-anchor': 'end', fill: '#fff' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 50, fill: COL.ground }),
    title(100, ground + 18, 'Day: more in than out', { fill: '#fff' }),
    text(100, ground + 32, 'The ground warms.', { 'text-anchor': 'middle', fill: '#fff' }),
    title(300, ground + 18, 'Night: only out', { fill: '#fff' }),
    text(300, ground + 32, 'The ground cools, and chills', { 'text-anchor': 'middle', fill: '#fff' }),
    text(300, ground + 44, 'the air resting on it.', { 'text-anchor': 'middle', fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- Fog and stratus are one cloud ---------------------------------------------------

export const fogStratusDiagram: FigureFactory = () => {
  const d = diagram(400, 200);
  const valley = (ox: number) => `M${ox},84 L${ox + 34},92 Q${ox + 100},200 ${ox + 166},94 L${ox + 200},86 L${ox + 200},200 L${ox},200 Z`;
  const person = (x: number, y: number) => svg('g', {},
    svg('circle', { cx: x, cy: y - 13, r: 3, fill: COL.ink }),
    line(x, y - 10, x, y - 2, COL.ink, 2),
    line(x - 3, y, x, y - 3, COL.ink, 1.5), line(x + 3, y, x, y - 3, COL.ink, 1.5));
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 200, fill: '#dcebf3' }),
    // Fog: the layer sits in the valley, so the ground holds it from below.
    svg('rect', { x: 0, y: 116, width: 200, height: 84, fill: '#f4f4f8' }),
    svg('path', { d: valley(0), fill: COL.ground }),
    person(100, 147),
    svg('rect', { x: 0, y: 116, width: 200, height: 84, fill: '#f4f4f8', opacity: 0.6 }),
    svg('path', { d: valley(0), fill: COL.ground }),
    // Stratus: the same layer lifted off the valley floor, hiding the ridges.
    svg('path', { d: valley(200), fill: COL.ground }),
    svg('rect', { x: 200, y: 62, width: 200, height: 36, fill: '#e4e2ec' }),
    line(200, 98, 400, 98, COL.cloudShade, 3),
    person(300, 147),
    line(300, 128, 300, 104, COL.soft, 1, { 'stroke-dasharray': '2 3' }),
    line(200, 0, 200, 200, '#fff', 2),
    title(100, 22, 'Fog: base on the ground'),
    title(300, 22, 'Stratus: base off the ground'),
    text(100, 38, 'You are inside the cloud', { 'text-anchor': 'middle' }),
    text(300, 38, 'Same layer, lifted: a grey ceiling', { 'text-anchor': 'middle' }),
    text(308, 120, 'cloud base', { class: 'fig-label small soft' }),
  );
  return { node: d.node };
};

// ---- Sharp edges and feathery edges --------------------------------------------

export const edgesDiagram: FigureFactory = () => {
  const d = diagram(400, 214);
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
      const pts = Array.from({ length: 6 }, (_, k) => `${(x + r * Math.cos((k * Math.PI) / 3)).toFixed(1)},${(y + r * Math.sin((k * Math.PI) / 3)).toFixed(1)}`).join(' ');
      crystals.push(svg('polygon', { points: pts, fill: 'none', stroke: COL.ice, 'stroke-width': 1.1 }));
    }
  }
  const cirrus = drawCloud('cirrus', day, 4);
  cirrus.setAttribute('transform', 'translate(296 78) scale(0.62)');
  const heap = drawCloud('cumulus', day, 4);
  heap.setAttribute('transform', 'translate(92 82) scale(1.05)');
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 200, height: 214, fill: '#e6eef8' }),
    svg('rect', { x: 200, y: 0, width: 200, height: 214, fill: '#dde6f4' }),
    svg('rect', { x: 0, y: 26, width: 400, height: 64, fill: day.sky[1] }),
    heap,
    cirrus,
    title(100, 18, 'Low: liquid droplets'),
    title(300, 18, 'High: ice crystals'),
    line(110, 70, 112, 104, COL.ink, 1, { 'stroke-dasharray': '2 2' }),
    line(296, 66, 296, 102, COL.ink, 1, { 'stroke-dasharray': '2 2' }),
    ...lens(100, 140, 40, '#ffffff'),
    ...drops,
    ...lens(300, 140, 40, '#ffffff'),
    ...crystals,
    text(100, 196, 'Crowded and tiny: at the edge they', { 'text-anchor': 'middle' }),
    text(100, 208, 'evaporate in seconds. A crisp outline.', { 'text-anchor': 'middle' }),
    text(300, 196, 'Few, large and slow to vanish: they', { 'text-anchor': 'middle' }),
    text(300, 208, 'drift off in trails. A feathery edge.', { 'text-anchor': 'middle' }),
  );
  return { node: d.node };
};

// ---- Floors times textures: six names ---------------------------------------------

export const nameGridDiagram: FigureFactory = () => {
  const d = diagram(400, 262);
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
      title(left / 2, y + rowH / 2 - 2, floor),
      text(left / 2, y + rowH / 2 + 12, prefix, { 'text-anchor': 'middle', class: 'fig-label small soft' }),
    );
    [heap, sheet].forEach((id, c) => {
      const x = left + c * colW;
      const scale = id === 'cumulus' ? 0.8 : 0.9;
      const cloud = SHEETS.has(id) ? drawCloud(id, day, 3, colW / 2 / scale) : drawCloud(id, day, 3);
      cloud.setAttribute('transform', `translate(${x + colW / 2} ${y + rowH - 26}) scale(${scale})`);
      const name = label(x + colW / 2, y + rowH - 8, id, { 'text-anchor': 'middle', class: 'fig-label bold', fill: '#fff', stroke: 'rgba(11, 29, 32, 0.45)', 'stroke-width': 3, 'paint-order': 'stroke' });
      cells.push(svg('rect', { x, y, width: colW, height: rowH, fill: sky }), cloud, name);
    });
  });
  d.svg.append(
    ...cells,
    title(left + colW / 2, 16, '+ cumulus'),
    text(left + colW / 2, 28, 'heaps', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
    title(left + colW * 1.5, 16, '+ stratus'),
    text(left + colW * 1.5, 28, 'a layer', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
    ...[1, 2].map((r) => line(left, top + r * rowH, 400, top + r * rowH, '#fff', 2)),
    line(left + colW, top, left + colW, top + 3 * rowH, '#fff', 2),
  );
  return { node: d.node };
};

// ---- Stratus and stratocumulus ----------------------------------------------------------

export const layerKindsDiagram: FigureFactory = () => {
  const d = diagram(400, 262);
  const grey = '#b3bccb';
  const dark = '#8f98ab';
  const sky = '#dcebf3';
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
    title(100, 18, 'Stratus: cooled evenly'),
    title(300, 18, 'Stratocumulus: stirred'),
    // Stratus: an even sheet, nothing moving in it.
    svg('rect', { x: 14, y: 62, width: 172, height: 34, fill: grey }),
    ...[40, 100, 160].map((x) => arrow(x, 112, x, 126, COL.cold, 1.6)),
    text(100, 50, 'one still, even layer', { 'text-anchor': 'middle' }),
    text(100, 110, 'chilled from below', { 'text-anchor': 'middle', fill: '#4f79a8' }),
    // Stratocumulus: cells under the lid, each with its own up and down.
    svg('rect', { x: 200, y: 56, width: 200, height: 6, fill: COL.env, opacity: 0.45 }),
    text(396, 50, 'warm lid', { 'text-anchor': 'end', fill: COL.env }),
    ...cells,
    loop(225), loop(315),
    text(300, 112, 'up in the middle, down at the edges', { 'text-anchor': 'middle' }),
    // From below.
    svg('rect', { x: 0, y: 138, width: 400, height: 124, fill: '#cfe0ec' }),
    text(100, 154, 'from below:', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
    text(300, 154, 'from below:', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
    svg('rect', { x: 14, y: 162, width: 172, height: 62, rx: 6, fill: grey }),
    svg('rect', { x: 214, y: 162, width: 172, height: 62, rx: 6, fill: '#7fb3d5' }),
    text(100, 240, 'an even grey ceiling, no pattern', { 'text-anchor': 'middle' }),
    text(100, 253, 'drizzle at most', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
    text(300, 240, 'lumps: dark centres, bright rims', { 'text-anchor': 'middle' }),
    text(300, 253, 'and gaps of blue between', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
  );
  // The from-below panel is cut to its frame.
  const clip = svg('clipPath', { id: 'layer-kinds-clip' }, svg('rect', { x: 214, y: 162, width: 172, height: 62, rx: 6 }));
  const g = svg('g', { 'clip-path': 'url(#layer-kinds-clip)' }, ...blobs);
  d.svg.append(svg('defs', {}, clip), g);
  return { node: d.node };
};

// ---- Sinking air makes the lid -------------------------------------------------------------

export const subsidenceDiagram: FigureFactory = () => {
  const d = diagram(400, 240);
  const ground = 212;
  const lid = 112;
  const eddy = (cx: number, cy: number, r: number) => svg('g', {},
    svg('path', { d: `M${cx - r},${cy} A${r},${r * 0.7} 0 1 1 ${cx + r * 0.2},${cy + r * 0.68}`, fill: 'none', stroke: COL.parcel, 'stroke-width': 1.6 }),
    arrow(cx + r * 0.5, cy + r * 0.62, cx + r * 0.1, cy + r * 0.7, COL.parcel, 1.6));
  // The temperature profile on the right: cooling with height, then warming through the lid.
  const gx = (c: number) => 290 + (c - 4) * 3.5;
  const gy = (km: number) => ground - km * 52;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 262, height: ground, fill: '#e9f1f4' }),
    svg('rect', { x: 0, y: lid, width: 262, height: ground - lid, fill: '#f1ece2' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 240 - ground, fill: COL.ground }),
    title(120, 18, 'High pressure: air sinking slowly'),
    ...[18, 160, 205, 250].map((x) => arrow(x, 30, x, lid - 22, COL.env, 2)),
    text(32, 62, 'squeezed as it sinks,', { fill: COL.env }),
    text(32, 75, 'so it warms', { fill: COL.env }),
    svg('rect', { x: 0, y: lid - 8, width: 262, height: 8, fill: COL.env, opacity: 0.45 }),
    text(6, lid - 12, 'the lid: warm air resting on cool air', { fill: COL.env }),
    eddy(60, 150, 22), eddy(150, 162, 26), eddy(222, 146, 18),
    text(6, ground - 8, 'stirred by wind and thermals from the ground', { fill: COL.parcel }),
    // The profile.
    line(gx(4), 30, gx(4), ground, COL.ink, 1),
    line(gx(4), ground, 396, ground, COL.ink, 1),
    polyline([[gx(24), gy(0)], [gx(14.5), gy(1.9)], [gx(19), gy(2.15)], [gx(9), gy(3.5)]], COL.env, 2.4),
    label(398, ground + 14, 'temperature →', { class: 'fig-label small', fill: '#fff', 'text-anchor': 'end' }),
    label(gx(4) - 4, 36, 'height', { class: 'fig-label small soft', 'text-anchor': 'end' }),
    label(gx(19) + 5, gy(2.15) - 2, 'warmer', { class: 'fig-label small', fill: COL.env }),
    label(gx(19) + 5, gy(2.15) + 9, 'going up', { class: 'fig-label small', fill: COL.env }),
    label(gx(20) - 6, gy(1) + 4, 'cooler', { class: 'fig-label small soft', 'text-anchor': 'end' }),
    label(gx(20) - 6, gy(1) + 15, 'with height', { class: 'fig-label small soft', 'text-anchor': 'end' }),
  );
  return { node: d.node };
};

// ---- A million droplets in one raindrop -----------------------------------------------------

export const millionDiagram: FigureFactory = () => {
  const d = diagram(400, 210);
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
  const face = (pts: [number, number][], fill: string) => svg('polygon', { points: pts.map((p) => p.join(',')).join(' '), fill, stroke: COL.ink, 'stroke-width': 1 });
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
    title(cx, 24, 'One raindrop, 1 mm'),
    text(cx, cy - 8, '100 cloud droplets', { 'text-anchor': 'middle' }),
    text(cx, cy + 16, 'fit side by side', { 'text-anchor': 'middle' }),
    svg('circle', { cx: 30, cy: 188, r: 0.8, fill: COL.ink }),
    text(38, 191, 'one cloud droplet, 0.01 mm, at the same scale', { class: 'fig-label small soft' }),
    face([[ox, oy], [ox + s, oy], [ox + s, oy + s], [ox, oy + s]], '#d9e6f5'),
    face([[ox, oy], [ox + s * k, oy - s * k], [ox + s + s * k, oy - s * k], [ox + s, oy]], '#eef3fa'),
    face([[ox + s, oy], [ox + s + s * k, oy - s * k], [ox + s + s * k, oy + s - s * k], [ox + s, oy + s]], '#b9cde6'),
    ...grid,
    title(ox + s * 0.7, 24, 'Wide, tall and deep'),
    text(ox + s / 2, oy + s + 18, '100 × 100 × 100', { 'text-anchor': 'middle' }),
    title(ox + s / 2, oy + s + 34, '= 1,000,000 droplets'),
  );
  return { node: d.node };
};

// ---- Collecting: a big drop sweeps up small ones ------------------------------------------------

export const collideDiagram: FigureFactory = () => {
  const d = diagram(400, 230);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dropX = 120;
  const dropY = 72;
  const dropR = 9;
  const small: SVGElement[] = [];
  for (let i = 0; i < 70; i++) {
    const x = 12 + rnd() * 226;
    const y = 30 + rnd() * 190;
    if (Math.hypot(x - dropX, y - dropY) < dropR + 6) continue;
    const inPath = Math.abs(x - dropX) < dropR && y > dropY;
    small.push(svg('circle', { cx: x, cy: y, r: 1.6 + rnd() * 1.2, fill: inPath ? COL.dew : COL.rain, opacity: inPath ? 1 : 0.55 }));
    if (i % 5 === 0 && !inPath) small.push(line(x, y + 4, x, y + 9, COL.soft, 1));
  }
  // The same drop a little later, and later still: bigger, faster.
  const stages: [number, number, number][] = [[50, 4, 14], [110, 7, 26], [180, 11, 40]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 250, height: 230, fill: '#eceaf2' }),
    title(125, 18, 'Inside a warm cloud'),
    line(dropX - dropR, dropY, dropX - dropR, 228, COL.dew, 1, { 'stroke-dasharray': '3 3' }),
    line(dropX + dropR, dropY, dropX + dropR, 228, COL.dew, 1, { 'stroke-dasharray': '3 3' }),
    ...small,
    svg('circle', { cx: dropX, cy: dropY, r: dropR, fill: COL.rain }),
    arrow(dropX, dropY + dropR + 2, dropX, dropY + dropR + 34, COL.ink, 2),
    text(dropX + 14, dropY - 4, 'a bigger drop falls faster'),
    text(dropX + 16, 150, 'droplets in its path', { fill: COL.dew }),
    text(dropX + 16, 162, 'are swept up', { fill: COL.dew }),
    text(14, 222, 'small droplets barely fall', { class: 'fig-label small soft' }),
    title(325, 18, 'It snowballs'),
    ...stages.flatMap(([y, r, len], i) => [
      svg('circle', { cx: 300, cy: y + 10, r, fill: COL.rain }),
      arrow(300, y + 12 + r, 300, y + 12 + r + len * 0.6, COL.ink, 1.6),
      text(318, y + 14, ['grows a little,', 'falls faster,', 'sweeps a wider'][i]),
      text(318, y + 26, ['falls a little faster', 'grows faster', 'path each second'][i]),
    ]),
  );
  return { node: d.node };
};

// ---- Shallow and deep clouds -----------------------------------------------------------------

export const depthDiagram: FigureFactory = () => {
  const d = diagram(400, 240);
  const ground = 214;
  const cloud = '#d6d3e3';
  // Shallow: the drop leaves the base still small and dries out on the way down.
  const shallow: [number, number, number, number][] = [[100, 46, 1.5, 1], [100, 58, 2, 1], [100, 70, 2.4, 1], [100, 96, 2.1, 0.8], [100, 120, 1.6, 0.55], [100, 142, 1, 0.3]];
  // Deep: carried up and down by the updraft, it grows until it falls through.
  const path: [number, number][] = [[300, 140], [292, 110], [300, 70], [312, 40], [320, 60], [316, 100], [306, 130], [300, 160], [300, 200]];
  const along: [number, number, number][] = [[292, 110, 1.6], [312, 40, 2.4], [316, 100, 3.6], [306, 130, 4.6], [300, 186, 5.4]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: '#e7eef4' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 240 - ground, fill: '#b9a55a' }),
    line(200, 0, 200, ground, '#fff', 2),
    title(100, 18, 'Shallow: no time to grow'),
    title(300, 18, 'Deep: time to grow'),
    svg('rect', { x: 20, y: 38, width: 160, height: 40, rx: 8, fill: cloud }),
    ...shallow.map(([x, y, r, o]) => svg('circle', { cx: x, cy: y, r, fill: COL.rain, opacity: o })),
    text(112, 124, 'falls out small', { fill: COL.rain }),
    text(112, 136, 'and evaporates', { fill: COL.rain }),
    text(100, 196, 'grey, maybe drizzle', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
    svg('rect', { x: 220, y: 30, width: 160, height: 120, rx: 10, fill: cloud }),
    ...[240, 360].map((x) => arrow(x, 136, x, 60, COL.parcel, 2)),
    text(232, 146, 'updraft', { fill: COL.parcel, class: 'fig-label small' }),
    polyline(path, COL.rain, 1, { 'stroke-dasharray': '2 3', opacity: 0.7 }),
    ...along.map(([x, y, r]) => svg('circle', { cx: x, cy: y, r, fill: COL.rain })),
    svg('path', { d: `M292,${ground} q4,-7 8,0 q4,-7 8,0`, fill: 'none', stroke: COL.rain, 'stroke-width': 1.5 }),
    text(312, 182, 'falls out big:', { fill: COL.rain }),
    text(312, 194, 'rain', { fill: COL.rain }),
  );
  return { node: d.node };
};
