// Still pictures for Shift 1: no controls and no task, just a drawing that
// shows one idea from the text around it. They break up the long stretches of
// prose between the live figures.

import { el, svg } from '../dom';
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
      unstable
        ? svg('path', { d: `M${ox + 40},252 Q${ox + 100},192 ${ox + 160},252`, fill: 'none', stroke: COL.ink, 'stroke-width': 2 })
        : svg('path', { d: `M${ox + 40},212 Q${ox + 100},272 ${ox + 160},212`, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }),
      svg('circle', { cx: ox + 100, cy: unstable ? 214 : 234, r: 7, fill: COL.parcel }),
      unstable ? arrow(ox + 110, 214, ox + 130, 222, COL.ink, 1.2) : arrow(ox + 116, 226, ox + 106, 232, COL.ink, 1.2),
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
