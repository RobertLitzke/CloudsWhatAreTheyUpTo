// Figures for the lesson on rising air and heaps: a parcel lifted to its
// cloud base, thermals off a valley, a bubble nudged in stable and unstable
// air, and stills of rising air expanding, stability in numbers, the anatomy
// of a heap and why a cloudy bubble keeps rising.

import { cloudBase, parcelAt } from '../../core/air';
import { el, svg } from '../dom';
import { arrow, heading, heapAt, label, line, polyline, puff, redraw, small, still } from './draw';
import { COL, animate, figure, frame, height, slider, temp, tint, type FigureFactory } from './kit';

// ---- Rising air expands and cools -------------------------------------------

export const expandDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const ground = 216;
  const yOf = (km: number) => ground - 18 - km * 72;
  // The parcel holds the same molecules all the way up and widens as it
  // climbs, so its dots thin out. The air around is drawn just as crowded as
  // the parcel at each height: the two are at the same pressure.
  const MOLECULES = 12;
  const radiusAt = (km: number) => 15 * (26 / 15) ** (km / 2);
  const spacingAt = (y: number) => radiusAt((yOf(0) - y) / 72) * Math.sqrt(Math.PI / MOLECULES);
  const parcels: [number, string][] = [[0, '24 °C'], [1, '14 °C'], [2, '4 °C']];
  const px = 160;
  const inParcel = (x: number, y: number) => parcels.some(([km]) => Math.hypot(x - px, y - yOf(km)) < radiusAt(km) + 3);
  const dots: SVGElement[] = [];
  let y = ground - 4;
  let row = 0;
  while (y > 6) {
    const gap = spacingAt(y);
    for (let x = 4 + (row % 2) * gap * 0.5; x < 236; x += gap) {
      if (!inParcel(x, y)) dots.push(svg('circle', { cx: x, cy: y, r: 1.3, fill: COL.env, opacity: 0.45 }));
    }
    y -= gap;
    row++;
  }
  // The parcel's own molecules, spread evenly over its disc.
  const molecules = (km: number) => Array.from({ length: MOLECULES }, (_, i) => {
    const r = radiusAt(km) * 0.8 * Math.sqrt((i + 0.5) / MOLECULES);
    const a = i * 2.39996 + km;
    return svg('circle', { cx: px + r * Math.cos(a), cy: yOf(km) + r * Math.sin(a), r: 1.6, fill: COL.parcel });
  });
  const top = radiusAt(2);
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: COL.air }),
    ...dots,
    svg('rect', { x: 0, y: ground, width: 400, height: 240 - ground, fill: COL.ground }),
    ...[0, 1, 2].map((km) => line(0, yOf(km), 236, yOf(km), COL.grid, 1, { 'stroke-dasharray': '3 3' })),
    small(8, yOf(0) - 4, 'near the ground', { soft: true, halo: COL.air }),
    small(8, yOf(1) - 4, '1 km up', { soft: true, halo: COL.air }),
    small(8, yOf(2) - 4, '2 km up', { soft: true, halo: COL.air }),
    arrow(120, yOf(0) - 16, 120, yOf(2) + 30, COL.parcel, 1.5),
    ...parcels.map(([km]) => svg('circle', { cx: px, cy: yOf(km), r: radiusAt(km), fill: COL.air, stroke: COL.parcel, 'stroke-width': 2 })),
    ...parcels.flatMap(([km]) => molecules(km)),
    ...parcels.map(([km, t]) => label(px + radiusAt(km) + 6, yOf(km) + 4, t, { bold: true, fill: COL.parcel, halo: COL.air, haloWidth: 4 })),
    ...[1.6, 3.2, 4.7].map((a) => arrow(px + (top + 2) * Math.cos(a), yOf(2) + (top + 2) * Math.sin(a), px + (top + 12) * Math.cos(a), yOf(2) + (top + 12) * Math.sin(a), COL.parcel, 1.2)),
    small(252, 30, 'Higher up there is less air'),
    small(252, 44, 'pressing down, so the parcel'),
    small(252, 58, 'spreads out as it rises.'),
    small(252, 84, 'Spreading out takes energy'),
    small(252, 98, 'from its own molecules, so'),
    small(252, 112, 'it cools: about 10 °C for'),
    small(252, 126, 'every kilometre it climbs.'),
    small(252, 148, `Orange dots: the parcel’s own`, { fill: COL.parcel }),
    small(252, 161, `${MOLECULES} molecules, the same ${MOLECULES} at`, { fill: COL.parcel }),
    small(252, 174, 'every height, more spread out.', { fill: COL.parcel }),
    small(252, 190, 'Violet dots: the air around,', { fill: COL.env }),
    small(252, 203, 'thinning out just as fast.', { fill: COL.env }),
  );
  return { node: d.node };
};

// ---- A parcel lifted --------------------------------------------------------

export const parcelFigure = figure(['base'], (ctx, t) => {
  const W = 400;
  const H = 260;
  const f = frame(W, H, 3);
  const ground = 236;
  const top = 3000;
  const yOf = (m: number) => ground - (m / top) * 200;
  // Temperature chart on the right: 0 to 30 °C.
  const x0 = 236;
  const x1 = 388;
  const xOf = (c: number) => x0 + ((c - 0) / 30) * (x1 - x0);
  let tempC = 24;
  let dewC = 12;
  let lift = 0;

  const sky = svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.air });
  const grid = svg('g');
  for (let m = 0; m <= top; m += 500) {
    grid.append(line(x0, yOf(m), x1, yOf(m), COL.grid, 1));
    grid.append(small(x0 - 4, yOf(m) + 3, height(m, ctx.save.units), { anchor: 'end' }));
  }
  for (let c = 0; c <= 30; c += 10) {
    grid.append(line(xOf(c), yOf(0), xOf(c), yOf(top), COL.grid, 1));
    grid.append(small(xOf(c), ground + 14, `${c} °C`, { anchor: 'middle', fill: '#fff' }));
  }
  const live = svg('g');
  f.svg.append(sky, svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.ground }), grid, live);

  const paint = () => {
    const p = parcelAt(lift, tempC, dewC);
    const base = cloudBase(tempC, dewC);
    const temps: [number, number][] = [];
    const dews: [number, number][] = [];
    for (let m = 0; m <= lift; m += 50) {
      const q = parcelAt(m, tempC, dewC);
      temps.push([xOf(q.tempC), yOf(m)]);
      dews.push([xOf(q.dewC), yOf(m)]);
    }
    temps.push([xOf(p.tempC), yOf(lift)]);
    dews.push([xOf(p.dewC), yOf(lift)]);
    const bx = 110;
    const by = yOf(lift);
    const bubble = p.cloud
      ? svg('g', {},
          ...[[-14, 4, 12], [0, -4, 15], [14, 4, 11], [0, 8, 12]].map(([dx, dy, r]) => svg('circle', { cx: bx + dx, cy: by + dy - 6, r, fill: COL.cloud, stroke: COL.cloudShade, 'stroke-width': 1 })),
          svg('rect', { x: bx - 28, y: by + 6, width: 56, height: 8, fill: COL.air }))
      : svg('circle', { cx: bx, cy: by - 10, r: 10, fill: tint(COL.parcel, 0.18), stroke: COL.parcel, 'stroke-width': 2 });
    redraw(live,
      line(bx, ground, bx, by, COL.parcel, 1, { 'stroke-dasharray': '2 4' }),
      p.cloud ? line(20, yOf(base), x1, yOf(base), COL.ink, 1, { 'stroke-dasharray': '6 4' }) : null,
      p.cloud ? small(24, yOf(base) - 5, `cloud base · ${height(base, ctx.save.units)}`) : null,
      polyline(dews, COL.dew, 2.5),
      polyline(temps, COL.parcel, 2.5),
      svg('circle', { cx: xOf(p.tempC), cy: yOf(lift), r: 3.5, fill: COL.parcel }),
      svg('circle', { cx: xOf(p.dewC), cy: yOf(lift), r: 3.5, fill: COL.dew }),
      bubble,
    );
    f.readout.replaceChildren(
      `At ${height(lift, ctx.save.units)} the air is `,
      el('b', { style: { color: COL.parcel } }, temp(p.tempC)),
      ' and its dew point is ',
      el('b', { style: { color: COL.dew } }, temp(p.dewC)),
      p.cloud ? '. They have met: the air is cloud.' : `. ${(p.tempC - p.dewC).toFixed(1)}° to go.`,
    );
    if (p.cloud && t.goal === 'base') t.done();
  };
  const lifter = slider('Lift the air', 0, top, 25, 0, (v) => height(v, ctx.save.units), (v) => { lift = v; paint(); }, 'parcel');
  const dew = slider('Dew point at the ground', 4, 22, 1, dewC, (v) => `${v} °C`, (v) => { dewC = v; paint(); }, 'dew');
  f.controls.append(lifter.node);
  if (t.goal !== 'base') f.controls.append(dew.node);
  else void t.promise.then(() => f.controls.append(dew.node));
  paint();
  return f.node;
});

// ---- Stable and unstable, in numbers ----------------------------------------

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

// ---- Stable and unstable: nudge a bubble ------------------------------------

/** The figure's air, from unstable (-1) to stable (1), as how fast it cools with height in °C per km. Below zero it warms with height. */
const lapseOf = (stability: number) => (stability < 0 ? 9.8 - stability * 3 : 9.8 - stability * 13);
const M_PER_PX = 10;
const START_C = 15;

/** The ceiling over the balloon, at `x` pixels to the side of the middle: domed when stable, bowed down when unstable. */
const ceilingY = (x: number, stability = 0) => 70 + stability * (x * x) / 60;

export const nudgeFigure = figure(['both'], (ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 4);
  let stability = -0.6; // below zero unstable, above stable
  let z = 0;
  let v = 0;
  let running = false;
  const triedStable = { yes: false };
  const triedUnstable = { yes: false };
  const rest = 170;
  const g = svg('g');
  const ball = svg('g');
  const cloud = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.air }), svg('rect', { x: 0, y: 214, width: W, height: H - 214, fill: COL.ground }), g, cloud, ball);
  const paintCurve = () => {
    // The balloon-under-a-ceiling picture of stability, on the left: a domed
    // ceiling when stable, one that bows down when unstable.
    const pts: [number, number][] = [];
    for (let x = -60; x <= 60; x += 4) pts.push([90 + x, ceilingY(x, stability)]);
    const caption = stability < -0.05 ? ['unstable: the ceiling bows down,', 'so the balloon drifts away'] : stability > 0.05 ? ['stable: a domed ceiling,', 'so the balloon floats back'] : ['neutral: a flat ceiling,', 'so the balloon stays put'];
    redraw(g,
      svg('polygon', { points: `30,6 150,6 ${pts.map(([x, y]) => `${x},${y}`).reverse().join(' ')}`, fill: COL.env, opacity: 0.12 }),
      polyline(pts, COL.env, 3),
      small(90, 196, caption[0], { anchor: 'middle' }),
      small(90, 209, caption[1], { anchor: 'middle' }),
      line(250, 214, 250, 20, COL.grid, 1),
      line(200, rest, 270, rest, COL.ink, 1, { 'stroke-dasharray': '4 3', opacity: 0.5 }),
      small(236, rest + 18, 'where it started', { soft: true, anchor: 'end' }),
    );
  };
  const paintBall = () => {
    const x = Math.max(-60, Math.min(60, z * 0.6));
    const by = ceilingY(x, stability) + 9;
    const py = rest - z;
    // The bubble cools at the dry rate as it climbs; the air around it at the day's own rate.
    const m = z * M_PER_PX;
    const mine = START_C - 9.8 * (m / 1000);
    const theirs = START_C - lapseOf(stability) * (m / 1000);
    redraw(ball,
      line(90 + x, by + 8, 90 + x, by + 20, COL.ink, 1),
      svg('circle', { cx: 90 + x, cy: by, r: 8, fill: COL.parcel }),
      svg('circle', { cx: 250, cy: py, r: 10, fill: tint(COL.parcel, 0.2), stroke: COL.parcel, 'stroke-width': 2 }),
      label(238, py - 10, `bubble ${mine.toFixed(1)} °C`, { bold: true, anchor: 'end', fill: COL.parcel, halo: COL.air }),
      label(262, py - 10, `around it ${theirs.toFixed(1)} °C`, { bold: true, fill: COL.env, halo: COL.air }),
      small(262, py + 22, mine > theirs + 0.05 ? 'warmer, so lighter' : mine < theirs - 0.05 ? 'colder, so heavier' : 'the same', { soft: true, halo: COL.air }),
    );
  };
  animate(f.node, ctx, (dt) => {
    if (!running) return;
    const k = 9;
    const a = stability < 0 ? -stability * k * z : -stability * k * z - 1.6 * v;
    v += a * dt * 6;
    z += v * dt * 6;
    if (stability < 0 && z > 150) {
      // It keeps going: the bubble climbs until it reaches cloud and beyond.
      running = false;
      z = 150;
      redraw(cloud, heapAt(250, 120, 34, 90));
      f.readout.textContent = 'Unstable air: the air around cools faster with height than the bubble, so the nudged bubble stays warmer than its neighbours and rises on its own until it is a heap of cloud.';
      triedUnstable.yes = true;
    } else if (stability >= 0 && Math.abs(v) < 0.4 && Math.abs(z) < 1 && dt > 0) {
      running = false;
      z = 0;
      redraw(cloud,
        svg('rect', { x: 150, y: 96, width: 240, height: 14, rx: 7, fill: COL.cloudShade, opacity: 0.85 }),
        small(270, 90, 'if a layer is cooled: a flat sheet', { soft: true, anchor: 'middle' }),
      );
      f.readout.textContent = 'Stable air: the air around cools more slowly than the bubble, so the nudged bubble is soon colder and sinks back. Only a whole layer cooled together makes cloud: a flat sheet.';
      triedStable.yes = true;
    }
    paintBall();
    if (t.goal === 'both' && triedStable.yes && triedUnstable.yes) t.done();
  });
  const nudge = document.createElement('button');
  nudge.className = 'btn btn-small';
  nudge.type = 'button';
  nudge.textContent = 'Nudge the bubble up';
  nudge.addEventListener('click', () => {
    z = 6;
    v = 6;
    running = true;
    redraw(cloud);
    f.readout.textContent = 'Watch where it goes…';
  });
  f.controls.append(
    slider('Air', -1, 1, 0.05, stability, (s) => `${s < -0.05 ? 'unstable' : s > 0.05 ? 'stable' : 'neutral'}: the air around ${lapseOf(s) >= 0 ? `cools ${lapseOf(s).toFixed(1)} °C` : `warms ${(-lapseOf(s)).toFixed(1)} °C`} per km`, (s) => { stability = s; running = false; z = 0; v = 0; redraw(cloud); paintCurve(); paintBall(); }, 'env').node,
    nudge,
  );
  paintCurve();
  paintBall();
  f.readout.textContent = 'Set the air, then nudge the bubble.';
  return f.node;
});

// ---- Thermals off a sunny valley --------------------------------------------

export const thermalsFigure = figure(['clouds'], (ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H);
  const ground = 210;
  let sun = 0.2;
  let base = 130; // y of the cloud base: humid air condenses sooner, so its base is lower
  // Fields: dark ones (ploughed, rock, town) warm faster than light ones (forest, lake).
  const fields = [
    { x: 0, w: 60, dark: false }, { x: 60, w: 50, dark: true }, { x: 110, w: 70, dark: false },
    { x: 180, w: 40, dark: true }, { x: 220, w: 80, dark: false }, { x: 300, w: 55, dark: true }, { x: 355, w: 45, dark: false },
  ];
  const darkFields = fields.filter((d) => d.dark);
  const sunG = svg('g');
  const bubbleG = svg('g');
  const cloudG = svg('g');
  const baseG = svg('g');
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: ground, fill: '#e3eff3' }),
    sunG,
    ...fields.map((d) => svg('rect', { x: d.x, y: ground, width: d.w, height: H - ground, fill: d.dark ? '#5b4a3c' : '#5d7d5a' })),
    baseG, bubbleG, cloudG,
  );
  interface Bubble { x: number; y: number; r: number; v: number }
  let bubbles: Bubble[] = [];
  const clouds = darkFields.map((d) => ({ x: d.x + d.w / 2, size: 0 }));
  let spawn = 0;
  const paintStatic = () => {
    const sy = 150 - sun * 120;
    redraw(sunG, svg('circle', { cx: 340, cy: sy, r: 16, fill: COL.sun }), svg('circle', { cx: 340, cy: sy, r: 26, fill: COL.sun, opacity: 0.25 }));
    redraw(baseG, line(0, base, W, base, COL.ink, 1, { 'stroke-dasharray': '5 5', opacity: 0.5 }), small(6, base + 12, 'cloud base', { soft: true }));
  };
  animate(f.node, ctx, (dt) => {
    spawn += dt * sun * 6;
    while (spawn > 1) {
      spawn--;
      const d = darkFields[Math.floor(Math.random() * darkFields.length)];
      bubbles.push({ x: d.x + 10 + Math.random() * (d.w - 20), y: ground - 4, r: 4, v: 20 + sun * 40 });
    }
    for (const b of bubbles) {
      b.y -= b.v * dt;
      b.r += dt * 2.5; // Bubbles spread out as they rise into thinner air.
    }
    const arrived = bubbles.filter((b) => b.y <= base);
    for (const b of arrived) {
      const c = clouds.reduce((a, c2) => (Math.abs(c2.x - b.x) < Math.abs(a.x - b.x) ? c2 : a));
      c.size = Math.min(1, c.size + 0.06 * (0.4 + sun));
    }
    bubbles = bubbles.filter((b) => b.y > base);
    for (const c of clouds) c.size = Math.max(0, c.size - dt * 0.03); // Cloud edges mix with dry air and evaporate.
    redraw(bubbleG, ...bubbles.map((b) => svg('circle', { cx: b.x, cy: b.y, r: b.r, fill: tint(COL.parcel, 0.15), stroke: COL.parcel, 'stroke-width': 1 })));
    redraw(cloudG, ...clouds.filter((c) => c.size > 0.05).map((c) => heapAt(c.x, base, 18 + c.size * 26, 8 + c.size * (20 + sun * 40))));
    const formed = clouds.filter((c) => c.size > 0.35).length;
    f.readout.textContent = sun < 0.15
      ? 'Early morning: the ground is barely warm and the air is still.'
      : formed
        ? formed === 1
          ? 'A cloud has formed over a patch of ground that heats quickly. Its base sits where the bubbles reach their dew point.'
          : `${formed} clouds have formed, each over a patch of ground that heats quickly, and every one with its base on the same level.`
        : 'Bubbles of warm air are rising off the darker ground.';
    if (t.goal === 'clouds' && formed >= 2) t.done();
  });
  f.controls.append(
    slider('Sun', 0, 1, 0.01, sun, (v) => (v < 0.15 ? 'dawn' : v < 0.5 ? 'morning' : v < 0.85 ? 'late morning' : 'midday'), (v) => { sun = v; paintStatic(); }, 'sun').node,
    slider('Moisture', 50, 150, 1, base - 40, (v) => (v < 80 ? 'dry' : v < 120 ? 'moderate' : 'humid'), (v) => { base = 40 + v; paintStatic(); }, 'dew').node,
  );
  paintStatic();
  return f.node;
});

// ---- Why a cloudy bubble keeps rising ---------------------------------------

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

// ---- Anatomy of a heap ------------------------------------------------------

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
