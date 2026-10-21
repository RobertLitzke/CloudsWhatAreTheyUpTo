// Figures about the two textures and the grey layers: stable against unstable
// air, a clear night cooling to fog, heaps spreading under a lid, raindrops
// against cloud droplets, the sun through thickening cloud, the hand trick and
// self-shadows.

import { angularSize, fogHour, layerBySize, nightTemp, type Night } from '../../core/sky';
import { genus } from '../../core/clouds';
import { svg } from '../dom';
import { heapAt, label, line, polyline, redraw, small } from './draw';
import { COL, animate, frame, height, slider, task, type FigureFactory } from './kit';

// ---- Stable and unstable: nudge a bubble ------------------------------------

/** The figure's air, from unstable (-1) to stable (1), as how fast it cools with height in °C per km. Below zero it warms with height. */
const lapseOf = (stability: number) => (stability < 0 ? 9.8 - stability * 3 : 9.8 - stability * 13);
const M_PER_PX = 10;
const START_C = 15;

/** The ceiling over the balloon, at `x` pixels to the side of the middle: domed when stable, bowed down when unstable. */
const ceilingY = (x: number, stability = 0) => 70 + stability * (x * x) / 60;

export const nudgeFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 4);
  const t = task();
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
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#eef3f6' }), svg('rect', { x: 0, y: 214, width: W, height: H - 214, fill: COL.ground }), g, cloud, ball);
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
      svg('circle', { cx: 250, cy: py, r: 10, fill: 'rgba(224,102,63,0.2)', stroke: COL.parcel, 'stroke-width': 2 }),
      label(238, py - 10, `bubble ${mine.toFixed(1)} °C`, { bold: true, anchor: 'end', fill: COL.parcel, halo: '#eef3f6' }),
      label(262, py - 10, `around it ${theirs.toFixed(1)} °C`, { bold: true, fill: COL.env, halo: '#eef3f6' }),
      small(262, py + 22, mine > theirs + 0.05 ? 'warmer, so lighter' : mine < theirs - 0.05 ? 'colder, so heavier' : 'the same', { soft: true, halo: '#eef3f6' }),
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
    if (goal === 'both' && triedStable.yes && triedUnstable.yes) t.resolve();
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
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- A clear night -----------------------------------------------------------

export const nightFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 4);
  const t = task();
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
    if (goal === 'fog' && foggy) t.resolve();
  };
  f.controls.append(
    slider('Sky', 0, 1, 0.05, n.clear, (v) => (v < 0.3 ? 'overcast' : v < 0.7 ? 'some cloud' : 'clear'), (v) => { n.clear = v; paint(); }, 'ink').node,
    slider('Wind', 0, 1, 0.05, n.wind, (v) => (v < 0.2 ? 'calm' : v < 0.6 ? 'a breeze' : 'windy'), (v) => { n.wind = v; paint(); }, 'ink').node,
    slider('Dew point', 0, 14, 0.5, n.dewC, (v) => `${v} °C`, (v) => { n.dewC = v; paint(); }, 'dew').node,
    slider('Clock', 0, 12, 0.25, hour, (v) => (v === 0 ? 'sunset' : v === 12 ? 'dawn' : `${v} h after sunset`), (v) => { hour = v; paint(); }, 'ink').node,
  );
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- Heaps spreading under a lid ---------------------------------------------

export const spreadFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 4);
  const t = task();
  let lid = 0.2;
  let moist = 0.5;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#e3eff3' }), svg('rect', { x: 0, y: 196, width: W, height: 24, fill: COL.ground }), g);
  const paint = () => {
    const base = 150;
    const lidY = 150 - 30 - (1 - lid) * 80; // A strong lid sits low and close above the cloud base.
    const spread = 18 + lid * moist * 34;
    const n = 6;
    const parts: SVGElement[] = [];
    for (let i = 0; i < n; i++) {
      const cx = 30 + i * 68;
      const h = Math.min(base - lidY, 26 + moist * 70);
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
    if (goal === 'sheet' && sheet) t.resolve();
  };
  f.controls.append(
    slider('Lid', 0, 1, 0.05, lid, (v) => (v < 0.1 ? 'none' : v < 0.6 ? 'weak' : 'strong'), (v) => { lid = v; paint(); }, 'env').node,
    slider('Moisture', 0, 1, 0.05, moist, (v) => (v < 0.35 ? 'dry' : v < 0.7 ? 'moist' : 'very moist'), (v) => { moist = v; paint(); }, 'dew').node,
  );
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- Droplets and drops --------------------------------------------------------

const FALL: [number, number][] = [[0.01, 0.003], [0.05, 0.08], [0.1, 0.27], [0.2, 0.7], [0.5, 2.1], [1, 4], [2, 6.5], [3, 8], [5, 9.1]];

function fallSpeed(mm: number): number {
  if (mm <= FALL[0][0]) return FALL[0][1];
  for (let i = 1; i < FALL.length; i++) {
    if (mm <= FALL[i][0]) {
      const [d0, v0] = FALL[i - 1];
      const [d1, v1] = FALL[i];
      const k = (Math.log(mm) - Math.log(d0)) / (Math.log(d1) - Math.log(d0));
      return Math.exp(Math.log(v0) + k * (Math.log(v1) - Math.log(v0)));
    }
  }
  return FALL[FALL.length - 1][1];
}

/**
 * How far a drop falls below the cloud base before it has evaporated, in
 * metres, by diameter in mm, for air at 90% humidity (after Rogers and Yau).
 * Its life grows with the square of its size and so does its fall speed, so
 * the distance grows roughly with the fourth power: a cloud droplet is gone in
 * a few centimetres, a raindrop lasts for kilometres.
 */
const SURVIVE: [number, number][] = [[0.01, 0.002], [0.02, 0.033], [0.2, 150], [2, 42000], [5, 260000]];

function surviveM(mm: number, humidity: number): number {
  let i = 1;
  while (i < SURVIVE.length - 1 && mm > SURVIVE[i][0]) i++;
  const [d0, l0] = SURVIVE[i - 1];
  const [d1, l1] = SURVIVE[i];
  const k = (Math.log(mm) - Math.log(d0)) / (Math.log(d1) - Math.log(d0));
  // Drier air takes the water away faster, in proportion to how far it is from saturated.
  return Math.exp(Math.log(l0) + k * (Math.log(l1) - Math.log(l0))) * (0.1 / (1 - humidity));
}

const BASE_M = 1000;

export const dropsFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 4);
  const t = task();
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
    svg('rect', { x: 0, y: top, width: sceneW, height: ground - top, fill: '#e7eef4' }),
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
  type Trip = { mm: number; fall: number; net: number; lastsM: number; lands: boolean };
  let trip: Trip;
  let y = top + 20;
  let pause = 0;
  const work = (): Trip => {
    const mm = 10 ** logD;
    const fall = fallSpeed(mm);
    const lastsM = surviveM(mm, humidity);
    return { mm, fall, net: fall - up, lastsM, lands: fall > up && lastsM > BASE_M };
  };
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
    if (goal === 'rain' && lands) t.resolve();
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
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- The sun through thickening cloud ----------------------------------------

export const sunThroughFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H);
  const t = task();
  const g = svg('g');
  f.svg.append(g);
  const paint = (thick: number) => {
    const stage = thick < 0.33 ? 'cirrostratus' : thick < 0.72 ? 'altostratus' : 'nimbostratus';
    const skyL = 80 - thick * 45;
    const sky = `hsl(250, ${18 - thick * 10}%, ${skyL}%)`;
    const sunOpacity = Math.max(0, 1 - thick * 1.25);
    const blur = thick * 14;
    const shadow = Math.max(0, 1 - thick * 3);
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: H, fill: sky }),
      svg('circle', { cx: 200, cy: 70, r: 14 + blur, fill: '#fff8e0', opacity: sunOpacity * (blur > 2 ? 0.6 : 1) }),
      svg('circle', { cx: 200, cy: 70, r: 14, fill: '#fffbe9', opacity: sunOpacity * (1 - thick) }),
      stage === 'cirrostratus' ? svg('circle', { cx: 200, cy: 70, r: 52, fill: 'none', stroke: '#fff', 'stroke-width': 4, opacity: 0.6 * (1 - thick * 2) }) : null,
      stage === 'nimbostratus' ? svg('g', { opacity: (thick - 0.72) * 3 }, ...Array.from({ length: 30 }, (_, i) => line(i * 14, 100 + (i % 3) * 10, i * 14 - 8, 196, COL.rain, 1.3))) : null,
      svg('rect', { x: 0, y: 196, width: W, height: 34, fill: '#4d5a3f' }),
      line(140, 196, 140, 150, '#3b2f28', 4),
      svg('polygon', { points: `140,198 ${140 + 60},${206} ${140 + 60},${202}`, fill: '#000', opacity: 0.45 * shadow }),
    );
    const words: Record<string, string> = {
      cirrostratus: 'Cirrostratus: a thin ice veil. The sun is sharp, posts still cast shadows, and there is often a halo.',
      altostratus: 'Altostratus: a thicker sheet of droplets and ice. The sun shows as if through frosted glass: no halo, no shadows.',
      nimbostratus: 'Nimbostratus: the sun is gone and rain or snow is falling steadily.',
    };
    f.readout.textContent = words[stage];
    if (goal === stage) t.resolve();
  };
  f.controls.append(slider('Thickness', 0, 1, 0.01, 0.1, (v) => (v < 0.33 ? 'thin' : v < 0.72 ? 'thick' : 'very thick'), paint, 'ink').node);
  paint(0.1);
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- The hand trick ----------------------------------------------------------

export const handFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 2);
  const t = task();
  const PX_PER_DEG = 9; // about 44° of sky across the figure
  let pieceM = 250;
  let layerM = 4000;
  const seen = new Set<string>();
  const sky = svg('g');
  const hand = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#7fb4d6' }), sky, hand);
  // The hand at arm's length, drawn at its true angular size: fist about 10°,
  // three fingers about 5°, thumb about 2°, little-finger nail about 1°.
  const fistW = 10 * PX_PER_DEG;
  hand.append(
    svg('rect', { x: 290, y: 140, width: fistW, height: 70, rx: 18, fill: '#e6b89c', opacity: 0.92 }),
    svg('rect', { x: 290 - 2 * PX_PER_DEG, y: 150, width: 2 * PX_PER_DEG, height: 46, rx: 8, fill: '#ddaa8c', opacity: 0.95 }),
    svg('rect', { x: 290 + fistW - 1 * PX_PER_DEG - 2, y: 124, width: PX_PER_DEG, height: 22, rx: 4, fill: '#ddaa8c' }),
    small(290 + fistW / 2, 232, 'fist ≈ 10°', { anchor: 'middle' }),
    small(290 - PX_PER_DEG, 214, 'thumb ≈ 2°', { anchor: 'middle' }),
    small(290 + fistW - 2, 118, 'nail ≈ 1°', { anchor: 'middle' }),
  );
  const paint = () => {
    // Looking up high in the sky (about 60° up), so the distance is a little more than the height.
    const deg = angularSize(pieceM, layerM / Math.sin((60 * Math.PI) / 180));
    const px = deg * PX_PER_DEG;
    const kind = layerBySize(deg);
    seen.add(kind);
    const pieces: SVGElement[] = [];
    const step = Math.max(px * 1.5, 8);
    let row = 0;
    for (let y = 18; y < 130; y += step * 0.8, row++) {
      for (let x = 8 + (row % 2) * step * 0.5; x < W; x += step) {
        pieces.push(svg('ellipse', { cx: x, cy: y, rx: px / 2, ry: px / 2.6, fill: '#fff', opacity: 0.95 }));
        if (kind !== 'cirrocumulus') pieces.push(svg('ellipse', { cx: x + px * 0.05, cy: y + px * 0.18, rx: px / 2.4, ry: px / 5, fill: kind === 'stratocumulus' ? '#8c8aa6' : '#b9bfd3', opacity: 0.8 }));
      }
    }
    redraw(sky, ...pieces);
    f.readout.textContent = `Each piece looks ${deg < 1 ? deg.toFixed(1) : deg.toFixed(0)}° wide: ${deg < 1 ? 'smaller than your little-finger nail' : deg <= 2.5 ? 'about a thumb' : deg <= 5 ? 'between a thumb and three fingers' : 'a fist or more'}. Call it ${genus(kind).name.toLowerCase()}.`;
    if (goal === 'all' && seen.size === 3) t.resolve();
  };
  f.controls.append(
    slider('Layer height', 500, 10000, 100, layerM, (v) => height(v, ctx.save.units), (v) => { layerM = v; paint(); }, 'ink').node,
    slider('Piece size', 50, 800, 10, pieceM, (v) => `${v} m across`, (v) => { pieceM = v; paint(); }, 'ink').node,
  );
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- Self-shadows ------------------------------------------------------------

export const shadowFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 180;
  const f = frame(W, H);
  const t = task();
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#86b8d8' }), g);
  const paint = (depth: number) => {
    // Light coming from above and behind: thin pieces glow through, thick ones
    // block it and their undersides go grey.
    const dark = Math.min(0.85, depth / 1200);
    const parts: SVGElement[] = [];
    for (let i = 0; i < 5; i++) {
      const x = 44 + i * 78;
      const r = 18 + depth / 60;
      parts.push(
        svg('ellipse', { cx: x, cy: 80, rx: r, ry: r * 0.7, fill: '#fff' }),
        svg('ellipse', { cx: x + 2, cy: 80 + r * 0.32, rx: r * 0.9, ry: r * 0.38, fill: `rgba(70, 64, 100, ${dark})` }),
      );
    }
    redraw(g, ...parts);
    const kind = depth < 200 ? 'cirrocumulus' : depth < 700 ? 'altocumulus' : 'stratocumulus';
    f.readout.textContent = kind === 'cirrocumulus'
      ? 'Thin pieces let the light through: pure white, no shading at all. High cloud never has self-shadows.'
      : kind === 'altocumulus'
        ? 'Thicker pieces block some light: grey shading on their undersides. Altocumulus is usually shaded on part of each piece.'
        : 'Thick pieces block most of the light: dark grey bellies. Low, thick cloud such as stratocumulus has the darkest shading.';
    if (goal === 'shade' && depth >= 700) t.resolve();
  };
  f.controls.append(slider('Thickness', 50, 1400, 10, 100, (v) => `${v} m deep`, paint, 'ink').node);
  paint(100);
  return { node: f.node, done: goal ? t.promise : undefined };
};
