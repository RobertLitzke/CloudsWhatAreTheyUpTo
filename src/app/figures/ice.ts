// Figures about the ice realm: an ice crystal growing among supercooled
// droplets, falling crystals smeared into mares' tails, the
// prism that makes the 22° halo, the halo itself building up crystal by crystal,
// and a warm front sliding in overhead.

import { fullOverIce, fullOverWater } from '../../core/air';
import { deviation, minimumDeviation } from '../../core/optics';
import { FRONT_KMH, FRONT_SLOPE, frontHeightM, frontSky } from '../../core/sky';
import { genus } from '../../core/clouds';
import { svg } from '../dom';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { COL, animate, frame, height, label, line, polyline, redraw, slider, task, type FigureFactory } from './kit';

// ---- An ice crystal among supercooled droplets ---------------------------------

export const iceGrowthFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 4);
  const t = task();
  let tempC = -2;
  const C = { x: 200, y: 110 };
  let eaten = 0; // share of the droplets' water now on the crystal, 0 to 1
  let falling = 0; // px fallen
  const drops = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.3;
    const d = 70 + ((i * 37) % 90);
    return { x: C.x + Math.cos(a) * d * 1.4, y: C.y + Math.sin(a) * d * 0.75 };
  });
  let bits: { x: number; y: number; sx: number; sy: number; k: number }[] = [];
  const scene = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#e9eef8' }), scene);
  const grown = () => eaten >= 1;
  animate(f.node, ctx, (dt) => {
    const glaciated = tempC <= -38;
    // Vapour moves from droplets to ice in proportion to how much fuller the air is for the ice.
    const push = Math.max(0, fullOverWater(tempC) - fullOverIce(tempC));
    if (!glaciated && push > 0.005 && !grown()) {
      eaten = Math.min(1, eaten + push * dt * 0.3);
      if (Math.random() < push * dt * 60) {
        const d = drops[Math.floor(Math.random() * drops.length)];
        bits.push({ x: d.x, y: d.y, sx: d.x, sy: d.y, k: 0 });
      }
    }
    const crystal = 4 + 18 * Math.sqrt(eaten);
    const dropR = 5 * Math.cbrt(1 - eaten);
    for (const b of bits) {
      b.k += dt * 0.9;
      b.x = b.sx + (C.x - b.sx) * b.k;
      b.y = b.sy + (C.y + falling - b.sy) * b.k;
    }
    bits = bits.filter((b) => b.k < 1);
    if (grown()) falling = Math.min(140, falling + dt * 40);
    redraw(scene,
      ...drops.map((d) => glaciated
        ? hexagon(d.x, d.y, 3.2, COL.ice)
        : dropR > 0.6 ? svg('circle', { cx: d.x, cy: d.y, r: dropR, fill: COL.cloud, stroke: COL.dew, 'stroke-width': 1 }) : null),
      ...bits.map((b) => svg('circle', { cx: b.x, cy: b.y, r: 1.4, fill: COL.dew })),
      star(C.x, C.y + falling, crystal),
      label(C.x, Math.min(H - 8, C.y + falling + crystal + 14), 'ice crystal', { 'text-anchor': 'middle', fill: COL.ice, class: 'fig-label small' }),
    );
    const pct = ((fullOverWater(tempC) / fullOverIce(tempC) - 1) * 100).toFixed(0);
    f.readout.textContent = tempC >= 0
      ? 'At 0 °C water and ice are even: neither is gaining on the other.'
      : glaciated
        ? 'Below about −38 °C droplets can’t stay liquid: each one freezes on its own, and the cloud turns to ice all at once.'
        : grown()
          ? 'The crystal has eaten its neighbours and is heavy enough to fall. Falling through warmer air below, it melts into a raindrop.'
          : `At ${tempC} °C the air is just full for the droplets, but for the ice it is ${pct}% overfull. Vapour leaves the droplets and freezes onto the crystal: the droplets shrink as the crystal grows.`;
    if (goal === 'fall' && falling > 60) t.resolve();
  });
  f.controls.append(slider('Temperature', -40, 0, 1, tempC, (v) => `${v} °C`, (v) => { tempC = v; }, 'ice').node);
  return { node: f.node, done: goal ? t.promise : undefined };
};

function hexagon(cx: number, cy: number, r: number, fill: string): SVGElement {
  const pts = Array.from({ length: 6 }, (_, k) => `${(cx + r * Math.cos((Math.PI / 3) * k)).toFixed(1)},${(cy + r * Math.sin((Math.PI / 3) * k)).toFixed(1)}`).join(' ');
  return svg('polygon', { points: pts, fill });
}

/** A six-armed crystal of radius `r`. */
function star(cx: number, cy: number, r: number): SVGElement {
  const g = svg('g');
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    g.append(line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a), COL.ice, Math.max(1.5, r / 6)));
  }
  g.append(hexagon(cx, cy, Math.max(2, r * 0.3), COL.ice));
  return g;
}

// ---- Mares' tails -------------------------------------------------------------

export const streaksFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H);
  const t = task();
  let shear = 0.1;
  let fall = 0.5;
  let drift = 0;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#5d8fc0' }), g);
  const arrows = svg('g');
  f.svg.append(arrows);
  const paintArrows = () => {
    // Wind arrows: full speed at the top, slower below.
    redraw(arrows, ...[30, 90, 150, 200].map((y) => {
      const len = 30 + (1 - shear * ((y - 30) / 170)) * 30;
      return svg('g', { opacity: 0.6 }, line(8, y, 8 + len, y, '#fff', 1.5), svg('polygon', { points: `${8 + len},${y - 3} ${14 + len},${y} ${8 + len},${y + 3}`, fill: '#fff' }));
    }));
  };
  animate(f.node, ctx, (dt) => {
    drift = (drift + dt * 18) % 100;
    const tails: SVGElement[] = [];
    for (let i = 0; i < 5; i++) {
      const hx = ((i * 100 + drift) % 500) - 50;
      const hy = 34 + (i % 2) * 14;
      // A crystal released from the head falls at `vs` and, as it reaches
      // slower air, lags further and further behind the head that dropped it.
      const vs = 40 + fall * 60;
      const pts: [number, number][] = [];
      for (let tau = 0; tau <= 2.6; tau += 0.1) {
        const y = hy + vs * tau;
        if (y > H) break;
        const lag = shear * 60 * tau * tau * (vs / 70);
        pts.push([hx - lag, y]);
      }
      tails.push(polyline(pts, '#fff', 3.2, { opacity: 0.75 }));
      tails.push(svg('circle', { cx: hx, cy: hy, r: 6, fill: '#fff' }));
    }
    redraw(g, ...tails);
  });
  const paint = () => {
    paintArrows();
    f.readout.textContent = shear < 0.25
      ? 'Little change in wind with height: the ice falls nearly straight down in streaks below each tuft.'
      : shear < 0.6
        ? 'The wind slows lower down, so falling crystals drift back behind their tuft and the streaks curve.'
        : 'Strong shear: long sweeping tails ending in a hook where the crystals formed. Mares’ tails: cirrus uncinus, Latin for hooked.';
    if (goal === 'hooks' && shear >= 0.6) t.resolve();
  };
  f.controls.append(
    slider('Wind shear', 0, 1, 0.01, shear, (v) => (v < 0.25 ? 'little' : v < 0.6 ? 'some' : 'strong'), (v) => { shear = v; paint(); }, 'ice').node,
    slider('Crystal size', 0, 1, 0.01, fall, (v) => (v < 0.35 ? 'tiny, falls slowly' : v < 0.7 ? 'medium' : 'large, falls fast'), (v) => { fall = v; }, 'ice').node,
  );
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- One prism -----------------------------------------------------------------

type V = [number, number];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1];
const unit = (deg: number): V => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

/** Refract unit direction d at a surface with unit normal n (pointing against d), from index n1 to n2. */
function refract(d: V, n: V, n1: number, n2: number): V | null {
  const r = n1 / n2;
  const c = -dot(n, d);
  const k = 1 - r * r * (1 - c * c);
  if (k < 0) return null;
  return add(mul(d, r), mul(n, r * c - Math.sqrt(k)));
}

export const prismFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H);
  const t = task();
  const g = svg('g');
  const plot = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g, plot);
  const C: V = [110, 130];
  const R = 64;
  // A hexagon with two faces 60° apart: light goes in the lower-left face and
  // out the lower-right one, skipping the bottom face between them.
  const verts: V[] = Array.from({ length: 6 }, (_, k) => add(C, mul(unit(60 * k), R)));
  const faceIn: [V, V] = [verts[2], verts[3]]; // outward normal at 150°
  const faceOut: [V, V] = [verts[0], verts[1]]; // normal at 30°
  const nIn = unit(150); // outward normal of the entry face
  const nOut = unit(30);
  const minD = minimumDeviation();
  // Deviation plot on the right.
  const px0 = 236;
  const px1 = 390;
  const py0 = 200;
  const xOf = (i: number) => px0 + (i / 90) * (px1 - px0);
  const yOf = (d: number) => py0 - ((d - 10) / 50) * 160;
  const curve: V[] = [];
  for (let i = 0; i <= 90; i += 0.5) {
    const d = deviation(i);
    if (d != null) curve.push([xOf(i), yOf(d)]);
  }
  const paint = (inc: number) => {
    // The incoming ray, at `inc` degrees from the entry face's inward normal.
    const inward = mul(nIn, -1);
    const a = (Math.atan2(inward[1], inward[0]) * 180) / Math.PI + inc;
    const d0 = unit(a);
    const mid = mul(add(faceIn[0], faceIn[1]), 0.5);
    const entry = mid;
    const start = add(entry, mul(d0, -90));
    const d1 = refract(d0, nIn, 1, 1.31);
    let exit: V | null = null;
    let d2: V | null = null;
    if (d1) {
      // Where the inside ray meets the exit face's line.
      const p = faceOut[0];
      const tHit = dot(add(p, mul(entry, -1)), nOut) / dot(d1, nOut);
      exit = add(entry, mul(d1, tHit));
      d2 = refract(d1, mul(nOut, -1), 1.31, 1);
    }
    const dev = deviation(inc);
    const parts: SVGElement[] = [
      svg('polygon', { points: verts.map((v) => v.join(',')).join(' '), fill: '#dfe9f7', stroke: COL.ice, 'stroke-width': 2 }),
      line(faceIn[0][0], faceIn[0][1], faceIn[1][0], faceIn[1][1], COL.ice, 4),
      line(faceOut[0][0], faceOut[0][1], faceOut[1][0], faceOut[1][1], COL.ice, 4),
      line(start[0], start[1], entry[0], entry[1], COL.sun, 3),
    ];
    if (exit && d2) {
      const end = add(exit, mul(d2, 90));
      const ghost = add(exit, mul(d0, 70));
      parts.push(
        line(entry[0], entry[1], exit[0], exit[1], COL.sun, 3),
        line(exit[0], exit[1], end[0], end[1], COL.sun, 3),
        line(exit[0], exit[1], ghost[0], ghost[1], COL.soft, 1.2, { 'stroke-dasharray': '4 4' }),
        label(end[0] + 4, end[1] + 4, dev != null ? `bent ${dev.toFixed(1)}°` : '', { class: 'fig-label bold' }),
      );
    } else {
      parts.push(label(20, 226, 'The light is trapped inside and comes out another face.', { class: 'fig-label small soft' }));
    }
    redraw(g, ...parts);
    redraw(plot,
      line(px0, py0, px1, py0, COL.grid, 1),
      line(px0, yOf(minD), px1, yOf(minD), COL.parcel, 1.2, { 'stroke-dasharray': '5 4' }),
      label(px1, yOf(minD) + 12, '22°: the least it can bend', { 'text-anchor': 'end', fill: COL.parcel, class: 'fig-label small' }),
      polyline(curve, COL.ice, 2.5),
      dev != null ? svg('circle', { cx: xOf(inc), cy: yOf(dev), r: 4.5, fill: COL.sun, stroke: COL.ink }) : null,
      label(px0, py0 + 14, 'angle the light comes in at →', { class: 'fig-label small soft' }),
      label(px0, 34, 'how much it is bent', { class: 'fig-label small soft' }),
    );
    f.readout.textContent = dev == null
      ? 'At this angle the light cannot get out of the far face.'
      : Math.abs(dev - minD) < 0.6
        ? `Bent ${dev.toFixed(1)}°: the minimum. Nearby angles all bend almost exactly this much, so light piles up here.`
        : `Bent ${dev.toFixed(1)}°. Turn the crystal and find the angle where the bend is smallest.`;
    if (goal === 'min' && dev != null && Math.abs(dev - minD) < 0.6) t.resolve();
  };
  f.controls.append(slider('Turn the crystal', 14, 89, 0.5, 70, (v) => `${v.toFixed(0)}°`, paint, 'ice').node);
  paint(70);
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- The halo, crystal by crystal ----------------------------------------------

export const haloFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 260;
  const f = frame(W, H);
  const t = task();
  const C: V = [200, 130];
  const PX = 4.4; // px per degree
  const dots = svg('g');
  const overlay = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#6d8fbf' }), dots, overlay,
    svg('circle', { cx: C[0], cy: C[1], r: 9, fill: '#fffbe9' }),
  );
  const points: { r: number; a: number; d: number }[] = [];
  const grow = (n: number) => {
    while (points.length < n) {
      const inc = Math.random() * 90;
      const d = deviation(inc);
      if (d == null || d > 28) continue; // Light bent further is spread thin over the sky.
      points.push({ r: d * PX, a: Math.random() * Math.PI * 2, d });
    }
    points.length = n;
  };
  let hand = false;
  const paint = (n: number) => {
    grow(n);
    redraw(dots, ...points.map((p) => svg('circle', {
      cx: C[0] + Math.cos(p.a) * p.r,
      cy: C[1] + Math.sin(p.a) * p.r,
      r: 1.4,
      // The red end of the spectrum bends least, so the ring is reddish inside.
      fill: p.d < 22.4 ? '#ffd0b8' : '#ffffff',
      opacity: 0.75,
    })));
    redraw(overlay, hand ? svg('g', {},
      line(C[0], C[1], C[0] + 22 * PX, C[1], '#fff', 1, { 'stroke-dasharray': '3 3' }),
      label(C[0] + 11 * PX, C[1] - 6, 'hand span ≈ 22°', { 'text-anchor': 'middle', fill: '#fff', class: 'fig-label small' }),
    ) : null);
    f.readout.textContent = n < 200
      ? `${n} crystals: each sends a speck of light out at its own angle.`
      : `${n.toLocaleString()} crystals: the light crowds at 22° from the sun into a ring, with a sharp, reddish inner edge and darker sky inside.`;
    if (goal === 'ring' && n >= 1500) t.resolve();
  };
  const count = slider('Crystals', 0, 3, 0.01, 1, (v) => Math.round(Math.pow(10, v + 0.6)).toLocaleString(), (v) => paint(Math.round(Math.pow(10, v + 0.6))), 'ice');
  const handBtn = document.createElement('button');
  handBtn.type = 'button';
  handBtn.className = 'btn btn-small btn-ghost';
  handBtn.textContent = 'Measure with a hand';
  handBtn.addEventListener('click', () => { hand = !hand; paint(Math.round(Math.pow(10, count.value() + 0.6))); });
  f.controls.append(count.node, handBtn);
  paint(Math.round(Math.pow(10, 1.6)));
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- A warm front comes in ----------------------------------------------------

export const frontFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 260;
  const f = frame(W, H);
  const t = task();
  const ground = 226;
  const obsX = 40;
  const KM_PX = 0.34; // 1,000 km across the figure
  const yOf = (m: number) => ground - (m / 12000) * 190;
  const g = svg('g');
  const inset = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#dfe8f2' }), g, inset);
  const paint = (hours: number) => {
    const frontX = obsX + hours * FRONT_KMH * KM_PX;
    const surf = (x: number) => yOf(((frontX - x) / KM_PX) * 1000 / FRONT_SLOPE);
    // The warm air (right of and above the surface) and the cold wedge under it.
    const pts: [number, number][] = [];
    for (let x = frontX; x >= -10; x -= 4) pts.push([x, Math.max(surf(x), 0)]);
    const parts: SVGElement[] = [
      svg('polygon', { points: `${frontX},${ground} ${pts.map((p) => p.join(',')).join(' ')} -10,0 ${W + 10},0 ${W + 10},${ground}`, fill: '#f6dccf', opacity: 0.7 }),
      polyline(pts, COL.warm, 2.5),
      label(Math.min(W - 60, frontX + 8), ground - 10, 'warm front', { fill: COL.warm, class: 'fig-label small' }),
      label(Math.min(W - 70, frontX + 30), 40, 'warm air', { fill: COL.warm, class: 'fig-label' }),
      label(8, ground - 8, 'cold air', { fill: COL.cold, class: 'fig-label' }),
    ];
    // Cloud along the frontal surface: thick and low near the front, thin and high far ahead.
    const bands: [number, number, string, string][] = [
      [0, 2500, '#8a86a3', 'nimbostratus'], [2500, 5500, '#b8b5cc', 'altostratus'], [5500, 8000, '#e5e6f2', 'cirrostratus'], [8000, 11000, '#ffffff', 'cirrus'],
    ];
    for (const [h0, h1, fill, name] of bands) {
      const xa = frontX - (h0 / 1000) * FRONT_SLOPE * KM_PX;
      const xb = frontX - (h1 / 1000) * FRONT_SLOPE * KM_PX;
      const thick = name === 'nimbostratus' ? 3500 : name === 'altostratus' ? 1800 : 700;
      parts.push(svg('polygon', { points: `${xa},${yOf(h0)} ${xb},${yOf(h1)} ${xb},${yOf(h1 + thick * 0.3)} ${xa},${yOf(h0 + thick)}`, fill, opacity: 0.9 }));
      if (name === 'nimbostratus') for (let x = xb; x < xa; x += 9) parts.push(line(x, yOf(h0 + 200) + 2, x - 4, ground, COL.rain, 1.2, { opacity: 0.6 }));
      parts.push(label((xa + xb) / 2, yOf((h0 + h1) / 2) - 14, name, { 'text-anchor': 'middle', class: 'fig-label small soft' }));
    }
    parts.push(
      svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.ground }),
      svg('rect', { x: obsX - 5, y: ground - 16, width: 10, height: 10, fill: COL.ink }),
      line(obsX - 4, ground, obsX - 2, ground - 6, COL.ink, 1.5), line(obsX + 4, ground, obsX + 2, ground - 6, COL.ink, 1.5),
      label(obsX, ground + 16, 'you', { 'text-anchor': 'middle', fill: '#fff', class: 'fig-label small' }),
    );
    redraw(g, ...parts);
    // What you see overhead.
    const sky = frontSky(hours);
    const cx = 340;
    const cy = 60;
    const view: SVGElement[] = [svg('circle', { cx, cy, r: 44, fill: sky === 'nimbostratus' ? '#5e5a76' : sky === 'altostratus' ? '#9c9ab5' : '#6fa3d6', stroke: COL.ink, 'stroke-width': 2 })];
    if (sky !== 'nimbostratus') view.push(svg('circle', { cx: cx - 12, cy: cy - 6, r: sky === 'altostratus' ? 12 : 7, fill: '#fffbe9', opacity: sky === 'altostratus' ? 0.55 : 1 }));
    if (sky === 'cirrostratus') view.push(svg('circle', { cx: cx - 12, cy: cy - 6, r: 30, fill: 'none', stroke: '#fff', 'stroke-width': 2.5, opacity: 0.7 }));
    if (sky === 'cirrus') view.push(svg('g', { transform: `translate(${cx - 6} ${cy + 14}) scale(0.4)` }, drawCloud('cirrus', PALETTES.day, 3)));
    if (sky === 'nimbostratus') for (let i = -3; i <= 3; i++) view.push(line(cx + i * 10, cy - 30, cx + i * 10 - 5, cy + 30, COL.rain, 1.4));
    view.push(label(cx, cy + 60, 'overhead', { 'text-anchor': 'middle', class: 'fig-label small' }));
    redraw(inset, ...view);
    const h = frontHeightM(hours);
    f.readout.textContent = sky === 'clear'
      ? `${hours} hours out. The front is ${Math.round(hours * FRONT_KMH)} km away and its cloud is still beyond the horizon.`
      : `${hours} hours before the front. Overhead, its surface is ${height(h, ctx.save.units)} up: ${genus(sky).name.toLowerCase()}.` +
        (sky === 'cirrostratus' ? ' Watch for the halo: rain is likely within a day.' : sky === 'nimbostratus' ? ' Steady rain.' : '');
    if (goal === 'arrive' && hours <= 3) t.resolve();
  };
  f.controls.append(slider('Hours before it arrives', 0, 48, 1, 48, (v) => `${v} h`, paint, 'warm').node);
  // The slider runs forward in time from left to right.
  const s = f.controls.querySelector('input')!;
  s.style.direction = 'rtl';
  paint(48);
  return { node: f.node, done: goal ? t.promise : undefined };
};
