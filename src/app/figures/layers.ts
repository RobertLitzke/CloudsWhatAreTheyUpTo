// Figures about the two textures and the grey layers: stable against unstable
// air, a clear night cooling to fog, heaps spreading under a lid, raindrops
// against cloud droplets, the sun through thickening cloud, the hand trick and
// self-shadows.

import { angularSize, fogHour, layerBySize, nightTemp, type Night } from '../../core/sky';
import { genus } from '../../core/clouds';
import { svg } from '../dom';
import { heapAt } from './air';
import { COL, animate, frame, height, label, line, polyline, redraw, slider, task, type FigureFactory } from './kit';

// ---- Stable and unstable: nudge a bubble ------------------------------------

/** The figure's air, from unstable (-1) to stable (1), as how fast it cools with height in °C per km. Below zero it warms with height. */
const lapseOf = (stability: number) => (stability < 0 ? 9.8 - stability * 3 : 9.8 - stability * 13);
const M_PER_PX = 10;
const START_C = 15;
/** Labels drawn over the cloud stay readable with a rim of sky colour. */
const halo = { stroke: '#eef3f6', 'stroke-width': 3, 'paint-order': 'stroke' };

export const nudgeFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H);
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
    // The ball-on-a-hill picture of stability, on the left.
    const pts: [number, number][] = [];
    for (let x = -60; x <= 60; x += 4) pts.push([90 + x, 140 - stability * (x * x) / 60]);
    redraw(g,
      polyline(pts, COL.env, 3),
      label(90, 200, stability < -0.05 ? 'unstable: a hilltop' : stability > 0.05 ? 'stable: a valley' : 'neutral', { 'text-anchor': 'middle', class: 'fig-label' }),
      line(250, 214, 250, 20, COL.grid, 1),
      line(200, rest, 270, rest, COL.ink, 1, { 'stroke-dasharray': '4 3', opacity: 0.5 }),
      label(236, rest + 18, 'where it started', { 'text-anchor': 'end', class: 'fig-label small soft' }),
    );
  };
  const paintBall = () => {
    const x = Math.max(-60, Math.min(60, z * 0.6));
    const by = 140 - stability * (x * x) / 60 - 9;
    const py = rest - z;
    // The bubble cools at the dry rate as it climbs; the air around it at the day's own rate.
    const m = z * M_PER_PX;
    const mine = START_C - 9.8 * (m / 1000);
    const theirs = START_C - lapseOf(stability) * (m / 1000);
    redraw(ball,
      svg('circle', { cx: 90 + x, cy: by, r: 8, fill: COL.parcel }),
      svg('circle', { cx: 250, cy: py, r: 10, fill: 'rgba(224,102,63,0.2)', stroke: COL.parcel, 'stroke-width': 2 }),
      label(238, py - 10, `bubble ${mine.toFixed(1)} °C`, { 'text-anchor': 'end', fill: COL.parcel, class: 'fig-label bold', ...halo }),
      label(262, py - 10, `around it ${theirs.toFixed(1)} °C`, { fill: COL.env, class: 'fig-label bold', ...halo }),
      label(262, py + 22, mine > theirs + 0.05 ? 'warmer, so lighter' : mine < theirs - 0.05 ? 'colder, so heavier' : 'the same', { class: 'fig-label small soft', ...halo }),
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
      f.readout.textContent = 'Unstable air: the air around cools faster with height than the bubble does, so once nudged the bubble is warmer than its neighbours and keeps rising on its own, until it turns to cloud. That is how heaps are built.';
      triedUnstable.yes = true;
    } else if (stability >= 0 && Math.abs(v) < 0.4 && Math.abs(z) < 1 && dt > 0) {
      running = false;
      z = 0;
      redraw(cloud,
        svg('rect', { x: 150, y: 96, width: 240, height: 14, rx: 7, fill: COL.cloudShade, opacity: 0.85 }),
        label(270, 90, 'if a layer is cooled: a flat sheet', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
      );
      f.readout.textContent = 'Stable air: the air around cools more slowly with height than the bubble does, so the nudged bubble is colder than its neighbours, sinks back and settles. Nothing climbs on its own, so air becomes cloud only when something cools a whole layer gently and together: a flat sheet.';
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
  const f = frame(W, H);
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
    ...[0, 5, 10, 15, 20].map((c) => svg('g', {}, line(x0, yOf(c), x1, yOf(c), COL.grid, 1), label(x0 - 4, yOf(c) + 3, `${c}°`, { 'text-anchor': 'end', class: 'fig-label small' }))),
    ...[0, 3, 6, 9, 12].map((h) => label(xOf(h), 216, h === 0 ? 'sunset' : h === 12 ? 'dawn' : `${h} h`, { 'text-anchor': 'middle', class: 'fig-label small' })),
  );
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), axes, chart, scene);
  const paint = () => {
    const pts: [number, number][] = [];
    for (let h = 0; h <= 12; h += 0.25) pts.push([xOf(h), yOf(nightTemp(h, n))]);
    const fh = fogHour(n);
    const foggy = fh != null && hour >= fh;
    redraw(chart,
      line(x0, yOf(n.dewC), x1, yOf(n.dewC), COL.dew, 2.5),
      label(x1, yOf(n.dewC) + 14, 'dew point', { 'text-anchor': 'end', fill: COL.dew, class: 'fig-label small' }),
      polyline(pts, COL.warm, 2.5),
      label(x0 + 4, yOf(n.duskC) - 6, 'air near the ground', { fill: COL.warm, class: 'fig-label small' }),
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
  const f = frame(W, H);
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
      lid > 0.05 ? label(W - 6, lidY - 10, 'warm lid', { 'text-anchor': 'end', fill: COL.env, class: 'fig-label small' }) : null,
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
      return v0 + k * (v1 - v0);
    }
  }
  return FALL[FALL.length - 1][1];
}

export const dropsFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H);
  const t = task();
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  const paint = (logD: number) => {
    const mm = Math.pow(10, logD);
    // Drawn at 40 px per millimetre: a raindrop is big, a cloud droplet a speck.
    const r = Math.max(0.6, mm * 20);
    const v = fallSpeed(mm);
    const count = Math.pow(mm / 0.01, 3);
    const kind = mm < 0.05 ? 'a cloud droplet' : mm < 0.5 ? 'drizzle' : mm < 2.5 ? 'rain' : 'a big shower drop';
    redraw(g,
      svg('circle', { cx: 120, cy: 100, r, fill: COL.rain, opacity: 0.85 }),
      line(240, 30, 240, 170, COL.ink, 2.8),
      label(246, 36, 'a hair, 0.07 mm', { class: 'fig-label small soft' }),
      svg('circle', { cx: 300, cy: 100, r: 0.6, fill: COL.rain }),
      label(306, 104, 'cloud droplet', { class: 'fig-label small soft' }),
      label(20, 190, `${mm < 0.1 ? mm.toFixed(3) : mm.toFixed(2)} mm: ${kind}`, { class: 'fig-label bold' }),
    );
    const speed = v < 0.1 ? `${(v * 100).toFixed(1)} cm` : `${v.toFixed(1)} m`;
    f.readout.textContent = `Falls ${speed} a second.` + (count > 2 ? ` It takes about ${count >= 1e6 ? `${(count / 1e6).toFixed(count >= 1e7 ? 0 : 1)} million` : Math.round(count).toLocaleString()} cloud droplets to make one.` : ' The faintest updraft holds it up; this is what clouds are made of.') +
      (mm >= 0.5 ? ' Only a deep, long-lived cloud can grow drops this big: nimbostratus, or a shower cloud.' : mm >= 0.05 ? ' Shallow low cloud such as stratus and stratocumulus manages drizzle at most.' : '');
    if (goal === 'rain' && mm >= 0.5) t.resolve();
  };
  f.controls.append(slider('Drop size', -2, 0.7, 0.01, -2, (v) => `${Math.pow(10, v) < 0.1 ? Math.pow(10, v).toFixed(3) : Math.pow(10, v).toFixed(2)} mm`, paint, 'dew').node);
  paint(-2);
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
  const f = frame(W, H);
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
    label(290 + fistW / 2, 232, 'fist ≈ 10°', { 'text-anchor': 'middle', class: 'fig-label small' }),
    label(290 - PX_PER_DEG, 214, 'thumb ≈ 2°', { 'text-anchor': 'middle', class: 'fig-label small' }),
    label(290 + fistW - 2, 118, 'nail ≈ 1°', { 'text-anchor': 'middle', class: 'fig-label small' }),
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
