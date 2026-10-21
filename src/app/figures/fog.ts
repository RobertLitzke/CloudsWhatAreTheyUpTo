// Figures for the fog lesson: a jar of air cooled to its dew point, a clear
// night cooling to fog, and stills of molecules, day and night at the ground,
// fog and stratus, specks, a valley inversion, fog burning off, a kettle and
// why warm air is lighter.

import { dewPointOf, roomFor } from '../../core/air';
import { svg } from '../dom';
import { arrow, heading, line, polyline, redraw, small, still, wavy } from './draw';
import { COL, animate, figure, frame, slider, type FigureFactory } from './kit';
import { fogHour, nightTemp, type Night } from '../../core/sky';

// ---- A kettle: vapour is invisible ------------------------------------------

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

// ---- Molecules, warm and cold -----------------------------------------------

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

// ---- A jar of air cooled to its dew point -----------------------------------

export const jarFigure = figure(['fog'], (ctx, t) => {
  const W = 400;
  const H = 260;
  const f = frame(W, H, 4);
  let tempC = 25;
  let water = 12;
  // The chart: temperature across (0 to 30 °C), grams per cubic metre up (0 to 32).
  const x0 = 196;
  const x1 = 388;
  const y0 = 222;
  const y1 = 20;
  const xOf = (c: number) => x0 + (c / 30) * (x1 - x0);
  const yOf = (g: number) => y0 - (g / 32) * (y0 - y1);
  const curve: [number, number][] = [];
  for (let c = 0; c <= 30; c += 0.5) curve.push([xOf(c), yOf(roomFor(c))]);
  const axes = svg('g', {},
    ...[0, 10, 20, 30].map((c) => svg('g', {}, line(xOf(c), y0, xOf(c), y1, COL.grid, 1), small(xOf(c), y0 + 13, `${c} °C`, { anchor: 'middle' }))),
    ...[0, 10, 20, 30].map((g) => svg('g', {}, line(x0, yOf(g), x1, yOf(g), COL.grid, 1), small(x0 - 4, yOf(g) + 3, `${g} g`, { anchor: 'end' }))),
    polyline(curve, COL.env, 2.5),
    small(xOf(29.5), yOf(roomFor(29.5)) + 16, 'room for vapour', { anchor: 'end', fill: COL.env }),
  );
  // The jar, with molecules of vapour jostling in it and droplets once it fogs.
  const jx = 24;
  const jy = 40;
  const jw = 128;
  const jh = 180;
  const rand = (k: number) => {
    const s = Math.sin(k * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const molecules = Array.from({ length: 96 }, (_, i) => ({ x: jx + 8 + rand(i) * (jw - 16), y: jy + 12 + rand(i + 300) * (jh - 20), vx: rand(i + 600) - 0.5, vy: rand(i + 900) - 0.5 }));
  const drops = Array.from({ length: 60 }, (_, i) => ({ x: jx + 6 + rand(i + 1200) * (jw - 12), y: jy + 10 + rand(i + 1500) * (jh - 16), r: 1.6 + rand(i + 1800) * 2.2 }));
  const jarG = svg('g');
  const live = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), axes, live, jarG);
  const state = () => {
    const room = roomFor(tempC);
    return { room, vapour: Math.min(water, room), droplets: Math.max(0, water - room), dew: dewPointOf(water) };
  };
  const paintChart = () => {
    const s = state();
    redraw(live,
      line(x0, yOf(water), x1, yOf(water), COL.dew, 2.5),
      small(x0 + 4, yOf(water) - 5, `water in the jar · ${water} g`, { fill: COL.dew }),
      line(xOf(s.dew), yOf(water), xOf(s.dew), y0, COL.dew, 1, { 'stroke-dasharray': '3 3' }),
      small(xOf(s.dew), y0 - 4, 'dew point', { anchor: 'middle', fill: COL.dew }),
      svg('circle', { cx: xOf(s.dew), cy: yOf(water), r: 3.5, fill: COL.dew }),
      line(xOf(tempC), y0, xOf(tempC), y1, COL.ink, 1.5),
      svg('circle', { cx: xOf(tempC), cy: yOf(s.room), r: 4, fill: COL.env }),
    );
    f.readout.textContent = s.droplets > 0
      ? `At ${tempC} °C there is room for only ${s.room.toFixed(1)} g of vapour per cubic metre, but the jar has ${water} g. The extra ${s.droplets.toFixed(1)} g is droplets: a tiny cloud. It began at ${s.dew.toFixed(1)} °C, the dew point.`
      : `At ${tempC} °C there is room for ${s.room.toFixed(1)} g of vapour in each cubic metre. The jar has ${water} g, so it all stays vapour and the air is clear. Cool it below ${s.dew.toFixed(1)} °C and there won’t be room.`;
    if (t.goal === 'fog' && s.droplets > 0.3) t.done();
  };
  animate(f.node, ctx, (dt) => {
    const s = state();
    const speed = 30 + tempC * 2.5;
    const shown = Math.round(s.vapour * 3);
    const wet = Math.min(drops.length, Math.round(s.droplets * 12));
    for (const m of molecules) {
      m.x += m.vx * speed * dt;
      m.y += m.vy * speed * dt;
      if (m.x < jx + 4 || m.x > jx + jw - 4) m.vx = -m.vx;
      if (m.y < jy + 8 || m.y > jy + jh - 4) m.vy = -m.vy;
    }
    redraw(jarG,
      svg('rect', { x: jx, y: jy, width: jw, height: jh, rx: 14, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }),
      svg('rect', { x: jx + 18, y: jy - 10, width: jw - 36, height: 12, rx: 3, fill: COL.soft }),
      s.droplets > 0 ? svg('rect', { x: jx + 2, y: jy + 2, width: jw - 4, height: jh - 4, rx: 12, fill: COL.cloudShade, opacity: Math.min(0.6, s.droplets / 4) }) : null,
      ...molecules.slice(0, shown).map((m) => svg('circle', { cx: m.x, cy: m.y, r: 1.6, fill: COL.dew })),
      ...drops.slice(0, wet).map((d) => svg('circle', { cx: d.x, cy: d.y, r: d.r, fill: COL.cloud, stroke: COL.dew, 'stroke-width': 0.8 })),
      small(jx + jw / 2, jy + jh + 16, s.droplets > 0 ? 'vapour and droplets' : 'vapour only: clear', { soft: true, anchor: 'middle' }),
    );
  });
  f.controls.append(
    slider('Temperature', 0, 30, 1, tempC, (v) => `${v} °C`, (v) => { tempC = v; paintChart(); }, 'parcel').node,
    slider('Water in the jar', 4, 20, 1, water, (v) => `${v} g per cubic metre`, (v) => { water = v; paintChart(); }, 'dew').node,
  );
  paintChart();
  return f.node;
});

// ---- Where a droplet starts -------------------------------------------------

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

// ---- Day and night at the ground --------------------------------------------

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

// ---- Warm air is lighter ----------------------------------------------------

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

// ---- An inversion on a still morning ----------------------------------------

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

// ---- A clear night ----------------------------------------------------------

export const nightFigure = figure(['fog'], (_ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 4);
  const n: Night = { duskC: 16, dewC: 7, clear: 0.5, wind: 0.4 };
  let hour = 10;
  const x0 = 40;
  const x1 = 250;
  const xOf = (h: number) => x0 + (h / 12) * (x1 - x0);
  const yOf = (c: number) => 200 - ((c - 0) / 20) * 170;
  const chart = svg('g');
  const scene = svg('g');
  const axes = svg('g', {},
    ...[0, 5, 10, 15, 20].map((c) => svg('g', {}, line(x0, yOf(c), x1, yOf(c), COL.grid, 1), small(x0 - 4, yOf(c) + 3, `${c}°`, { anchor: 'end' }))),
    ...[0, 3, 6, 9, 12].map((h) => small(xOf(h), 216, h === 0 ? 'sunset' : h === 12 ? 'dawn' : `${h} h`, { anchor: 'middle' })),
  );
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), axes, chart, scene);
  const paint = () => {
    const pts: [number, number][] = [];
    for (let h = 0; h <= 12; h += 0.25) pts.push([xOf(h), yOf(nightTemp(h, n))]);
    const fh = fogHour(n);
    const foggy = fh != null && hour >= fh;
    redraw(chart,
      line(x0, yOf(n.dewC), x1, yOf(n.dewC), COL.dew, 2.5),
      small(x1, yOf(n.dewC) + 14, 'dew point', { anchor: 'end', fill: COL.dew }),
      polyline(pts, COL.warm, 2.5),
      small(x0 + 4, yOf(n.duskC) - 6, 'air near the ground', { fill: COL.warm }),
      line(xOf(hour), yOf(0), xOf(hour), yOf(20), COL.ink, 1, { 'stroke-dasharray': '3 3' }),
      fh != null ? svg('circle', { cx: xOf(fh), cy: yOf(n.dewC), r: 4, fill: COL.dew }) : null,
    );
    // A valley at night on the right, with fog pooled in its floor once it forms.
    const sky = `rgb(${Math.round(40 - n.clear * 10)},${Math.round(36 - n.clear * 6)},${Math.round(80 - n.clear * 10)})`;
    const stars = n.clear > 0.5 ? [[290, 40], [330, 24], [370, 52], [310, 70], [384, 30]].map(([x, y]) => svg('circle', { cx: x, cy: y, r: 1.3, fill: '#fff' })) : [];
    const overcast = n.clear < 0.5 ? [svg('rect', { x: 268, y: 10, width: 128, height: 40 * (1 - n.clear), fill: '#6a6488', opacity: 0.8 })] : [];
    redraw(scene,
      svg('rect', { x: 266, y: 6, width: 130, height: 210, rx: 8, fill: sky }),
      ...stars, ...overcast,
      svg('polygon', { points: '266,120 300,90 330,150 360,100 396,130 396,216 266,216', fill: '#2e2c53' }),
      foggy ? svg('polygon', { points: '266,170 300,160 330,166 360,158 396,168 396,216 266,216', fill: '#d9d4ea', opacity: 0.92 }) : null,
      svg('polygon', { points: '266,190 310,182 340,196 396,186 396,216 266,216', fill: '#1b172f' }),
    );
    f.readout.textContent = foggy
      ? `Fog: by ${fh!.toFixed(1)} hours after sunset the air near the ground cooled to its dew point, and its water condensed right where it was. Fog is a stratus cloud that touches the ground.`
      : fh != null
        ? `The air will reach its dew point ${fh.toFixed(1)} hours after sunset. Move the clock on.`
        : n.wind > 0.6
          ? 'Too windy: the wind stirs the chilled air at the ground up into warmer air above, so no fog. At most a low layer of stratus.'
          : 'The air never cools to its dew point tonight: a clear night, no fog.';
    if (t.goal === 'fog' && foggy) t.done();
  };
  f.controls.append(
    slider('Sky', 0, 1, 0.05, n.clear, (v) => (v < 0.3 ? 'overcast' : v < 0.7 ? 'some cloud' : 'clear'), (v) => { n.clear = v; paint(); }, 'ink').node,
    slider('Wind', 0, 1, 0.05, n.wind, (v) => (v < 0.2 ? 'calm' : v < 0.6 ? 'a breeze' : 'windy'), (v) => { n.wind = v; paint(); }, 'ink').node,
    slider('Dew point', 0, 14, 0.5, n.dewC, (v) => `${v} °C`, (v) => { n.dewC = v; paint(); }, 'dew').node,
    slider('Clock', 0, 12, 0.25, hour, (v) => (v === 0 ? 'sunset' : v === 12 ? 'dawn' : `${v} h after sunset`), (v) => { hour = v; paint(); }, 'ink').node,
  );
  paint();
  return f.node;
});

// ---- Fog and stratus are one cloud ------------------------------------------

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

// ---- Fog burning off --------------------------------------------------------

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
