// Figures about the ice realm: an ice crystal growing among supercooled
// droplets, falling crystals smeared into mares' tails, the prism that makes
// the 22° halo, the halo building up crystal by crystal, a warm front sliding
// in overhead, what a radar sees of drops and of melting snow, and stills of
// what makes a droplet freeze, why ice wins the vapour, snow becoming rain,
// and where a 22° bend shows up in the sky.

import { el, svg } from '../dom';
import { genus } from '../../core/clouds';
import { drawCloud } from '../scene/drawn';
import { realClouds } from '../clouds/real';
import { DAY } from '../clouds/tones';
import { PALETTES } from '../scene/landscape';
import { arrow, crystal, flake, heading, hexagon, label, line, points, polyline, radarDish, radarImage, radarKey, redraw, small, still, type P } from './draw';
import { COL, animate, figure, frame, height, radarColor, slider, tint, type FigureFactory } from './kit';
import { fbm } from '../clouds/noise';
import { radarWords, rainDbz, sameWaterEcho, stratiformDbz } from '../../core/radar';
import { makeRng } from '../../core/rng';
import { fullOverIce, fullOverWater } from '../../core/air';
import { deviation, ICE_N, minimumDeviation, refract, type V } from '../../core/optics';
import { FRONT_KMH, FRONT_SLOPE, frontHeightM, frontSky } from '../../core/sky';

// ---- What makes a droplet freeze --------------------------------------------

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

// ---- Ice holds its molecules tighter ----------------------------------------

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

// ---- An ice crystal among supercooled droplets ------------------------------

export const iceGrowthFigure = figure(['fall'], (ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 4);
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
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.air }), scene);
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
    const size = 4 + 18 * Math.sqrt(eaten);
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
        ? hexagon(d.x, d.y, 3.2, { fill: COL.ice })
        : dropR > 0.6 ? svg('circle', { cx: d.x, cy: d.y, r: dropR, fill: COL.cloud, stroke: COL.dew, 'stroke-width': 1 }) : null),
      ...bits.map((b) => svg('circle', { cx: b.x, cy: b.y, r: 1.4, fill: COL.dew })),
      crystal(C.x, C.y + falling, size),
      small(C.x, Math.min(H - 8, C.y + falling + size + 14), 'ice crystal', { anchor: 'middle', fill: COL.ice }),
    );
    const pct = ((fullOverWater(tempC) / fullOverIce(tempC) - 1) * 100).toFixed(0);
    f.readout.textContent = tempC >= 0
      ? 'At 0 °C water and ice are even: neither is gaining on the other.'
      : glaciated
        ? 'Below about −38 °C droplets can’t stay liquid: each one freezes on its own, and the cloud turns to ice all at once.'
        : grown()
          ? 'The crystal has eaten its neighbours and is heavy enough to fall. Falling through warmer air below, it melts into a raindrop.'
          : `At ${tempC} °C the air is just full for the droplets, but for the ice it is ${pct}% overfull. Vapour leaves the droplets and freezes onto the crystal: the droplets shrink as the crystal grows.`;
    if (t.goal === 'fall' && falling > 60) t.done();
  });
  f.controls.append(slider('Temperature', -40, 0, 1, tempC, (v) => `${v} °C`, (v) => { tempC = v; }, 'ice').node);
  return f.node;
});

// ---- Snow becomes rain ------------------------------------------------------

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

// ---- What a radar sees ------------------------------------------------------

/** A count of drops, said the way a person would. */
function many(n: number): string {
  if (n >= 1e6) return `${Math.round(n / 1e6).toLocaleString()} million`;
  if (n >= 1e4) return `${Math.round(n / 1e3).toLocaleString()} thousand`;
  if (n >= 20) return `About ${Math.round(n / 10) * 10}`;
  return `About ${Math.round(n)}`;
}

/** A diameter in mm, to two figures. */
const mmText = (mm: number) => `${mm < 0.1 ? mm.toFixed(2) : mm < 1 ? mm.toFixed(1) : mm.toFixed(1).replace(/\.0$/, '')} mm`;

export const radarEchoFigure = figure(['rain'], (ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 5);
  const ground = 196;
  const C: P = [196, 92];
  const R = 54;
  const dish: P = [40, 180];
  const grams = 0.5;
  let mm = 0.02;
  let ice = false;
  let phase = 0;
  // Drop positions inside the cubic metre, dealt once so the picture holds still as they change.
  const rng = makeRng(11);
  const spots: P[] = [];
  while (spots.length < 260) {
    const x = (rng() * 2 - 1) * (R - 4);
    const y = (rng() * 2 - 1) * (R - 4);
    if (x * x + y * y < (R - 6) ** 2) spots.push([C[0] + x, C[1] + y]);
  }
  const a = Math.atan2(C[1] - dish[1], C[0] - dish[0]);
  const dist = Math.hypot(C[0] - dish[0], C[1] - dish[1]);
  const spread = Math.asin(R / dist);
  const arc = (r: number) => {
    const pts: P[] = [];
    for (let k = -1; k <= 1; k += 0.2) pts.push([dish[0] + r * Math.cos(a + k * spread * 0.8), dish[1] + r * Math.sin(a + k * spread * 0.8)]);
    return pts;
  };
  const drops = svg('g');
  const pulse = svg('g');
  const screen = svg('g');
  const key = svg('g');
  const beamEdge = (s: number): P => [dish[0] + dist * Math.cos(a + s * spread), dish[1] + dist * Math.sin(a + s * spread)];
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.air }),
    svg('polygon', { points: points([dish, beamEdge(1), beamEdge(-1)]), fill: tint(COL.env, 0.1) }),
    svg('circle', { cx: C[0], cy: C[1], r: R, fill: '#ffffff', opacity: 0.7, stroke: COL.soft, 'stroke-dasharray': '4 3' }),
    drops, pulse,
    svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.paper }),
    line(0, ground, W, ground, COL.ground, 3),
    radarDish(30, ground, 30),
    small(44, ground - 3, 'radar', { soft: true }),
    small(C[0], C[1] + R + 12, 'a cubic metre of air: half a gram of water', { anchor: 'middle', soft: true }),
    small(C[0], C[1] + R + 22, 'drops not to scale', { anchor: 'middle', soft: true }),
    heading(345, 22, 'On the screen'),
    screen, key,
  );
  const echo = () => sameWaterEcho(mm, grams, ice);
  const paint = () => {
    const e = echo();
    const n = Math.max(6, Math.min(260, Math.round(6 * (5 / mm) ** 0.8)));
    const r = Math.min(8.5, 0.9 + 1.5 * mm);
    redraw(drops, ...spots.slice(0, n).map(([x, y]) => ice
      ? hexagon(x, y, r + 0.4, { fill: COL.ice })
      : svg('circle', { cx: x, cy: y, r, fill: COL.rain })));
    const c = radarColor(e.dbz);
    redraw(screen,
      svg('rect', { x: 300, y: 32, width: 90, height: 90, fill: '#eef0e6', stroke: COL.grid }),
      c ? svg('rect', { x: 330, y: 62, width: 30, height: 30, fill: c }) : small(345, 81, 'nothing', { anchor: 'middle', soft: true }),
      heading(345, 142, `${e.dbz < 0 ? '−' : ''}${Math.abs(Math.round(e.dbz))} dBZ`),
    );
    redraw(key, radarKey(12, 214, 376, -30, e.dbz));
    const kind = mm < 0.1 ? 'cloud droplets' : mm < 0.5 ? 'drizzle drops' : 'raindrops';
    const lesson = ice
      ? 'Frozen, the same water sends back only a fifth of the echo.'
      : mm < 0.1
        ? 'Cloud droplets are so small that even the thickest cloud barely shows on radar.'
        : 'Each time the drops double in width, the echo grows eightfold, though the water is the same.';
    f.readout.textContent = `${many(e.perM3)} ${ice ? `ice pellets ${mmText(mm)} across` : `${kind}, ${mmText(mm)} across`}: ${Math.round(e.dbz) < 0 ? '−' : ''}${Math.abs(Math.round(e.dbz))} dBZ, ${radarWords(e.dbz)}. ${lesson}`;
    if (t.goal === 'rain' && e.dbz >= 20) t.done();
  };
  animate(f.node, ctx, (dt) => {
    // A pulse goes out to the drops; its echo comes back, as strong as they make it.
    phase = (phase + dt * 0.8) % 2;
    const out = phase < 1;
    const k = out ? phase : 2 - phase;
    const s = Math.max(0, Math.min(1, (echo().dbz + 30) / 85));
    redraw(pulse, polyline(arc(14 + k * (dist - 14)), out ? COL.env : COL.sunInk, out ? 2 : 0.8 + s * 4, { opacity: out ? 0.8 : 0.1 + 0.9 * s }));
  });
  const seg = el('div.seg', {}, ...[['Water', false], ['Ice', true]].map(([text, v]) => el('button', {
    type: 'button',
    className: v === ice ? 'on' : '',
    onclick: (ev: MouseEvent) => {
      ice = v as boolean;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === ev.currentTarget));
      paint();
    },
  }, text as string)));
  f.controls.append(
    slider('Drop size', 0, 1, 0.005, Math.log(mm / 0.01) / Math.log(500), (v) => mmText(0.01 * 500 ** v), (v) => { mm = 0.01 * 500 ** v; paint(); }, 'rain').node,
    el('label.fig-slider', {}, el('span', {}, 'Made of'), seg),
  );
  paint();
  return f.node;
});

// ---- The bright band --------------------------------------------------------

export const brightBandFigure = figure(['snow'], (ctx, t) => {
  const W = 400;
  const H = 256;
  const f = frame(W, H, 4);
  const ground = 200;
  const kmPx = 24;
  const yOf = (km: number) => ground - km * kmPx;
  const RAIN = rainDbz(3);
  const SLICE = 296;
  let freezeKm = 2.2;
  const field = svg('g');
  const over = svg('g');
  // The profile chart on the right: echo across, height up.
  const px0 = 310;
  const xOf = (d: number) => px0 + (Math.max(0, d) / 45) * 78;
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: SLICE, height: ground, fill: COL.air }),
    field, over,
    svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.paper }),
    line(0, ground, SLICE, ground, COL.ground, 3),
    radarDish(16, ground, 40),
    line(px0, yOf(0), px0, yOf(7.5), COL.soft, 1),
    line(px0, yOf(0), xOf(45), yOf(0), COL.soft, 1),
    ...[0, 20, 40].map((d) => small(xOf(d), ground + 11, String(d), { anchor: 'middle', soft: true })),
    small(xOf(22), ground + 21, 'echo, dBZ', { anchor: 'middle', soft: true }),
    radarKey(12, 236, 376),
  );
  const paint = () => {
    const top = (x: number) => 6.2 + (fbm(x / 50, 3) - 0.5) * 2;
    redraw(field, radarImage(0, 8, SLICE, ground - 8, 3, (x, y) => {
      const km = (ground - y) / kmPx;
      if (x < 40 + fbm(3, y / 30) * 24) return -Infinity;
      return stratiformDbz(km, freezeKm, RAIN, top(x)) + (fbm(x / 16, y / 7) - 0.5) * 8;
    }));
    const profile: P[] = [];
    for (let km = 0; km <= 6.2; km += 0.05) profile.push([xOf(stratiformDbz(km, freezeKm, RAIN, 6.2)), yOf(km)]);
    const melting = freezeKm > 0.15;
    const lab = (km: number, text: string, fill: string = COL.ink) => small(xOf(stratiformDbz(km, freezeKm, RAIN, 6.2)) - 4, yOf(km) + 3, text, { fill, anchor: 'end', halo: COL.paper });
    redraw(over,
      melting ? line(0, yOf(freezeKm), SLICE, yOf(freezeKm), COL.dew, 1.5, { 'stroke-dasharray': '6 4' }) : null,
      melting ? small(SLICE - 4, yOf(freezeKm) - 5, '0 °C', { anchor: 'end', bold: true, fill: COL.dew, halo: COL.air }) : null,
      ...[2, 4, 6].map((km) => small(4, yOf(km) + 3, height(km * 1000, ctx.save.units), { soft: true, halo: COL.air })),
      polyline(profile, COL.ink, 1.8),
      melting ? line(px0, yOf(freezeKm), xOf(45), yOf(freezeKm), COL.dew, 1, { 'stroke-dasharray': '3 3' }) : null,
      lab(Math.max(freezeKm, 0) + 2.4, 'snow', COL.ice),
      melting ? lab(freezeKm - 0.2, 'melting', COL.sunInk) : null,
      melting && freezeKm > 0.9 ? lab(freezeKm / 2, 'rain', COL.rain) : null,
    );
    const peak = Math.round(RAIN + 9);
    f.readout.textContent = melting
      ? `The band lies just under the 0 °C line, where snowflakes melt: about ${peak} dBZ, against ${Math.round(RAIN)} in the rain below and less in the snow above. As much water falls all the way down; only its form changes.`
      : 'Freezing right down to the ground: nothing melts, so there is no band, and snow reaches the ground. Its echo is weaker than the rain’s, though just as much water is falling.';
    if (t.goal === 'snow' && !melting) t.done();
  };
  f.controls.append(slider('Freezing level', 0, 3, 0.1, freezeKm, (v) => (v <= 0.15 ? 'at the ground' : height(v * 1000, ctx.save.units)), (v) => { freezeKm = v; paint(); }, 'dew').node);
  paint();
  return f.node;
});

// ---- Mares' tails -----------------------------------------------------------

export const streaksFigure = figure(['hooks'], (_ctx, t) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H);
  let shear = 0.1;
  let fall = 0.5;
  const clouds = realClouds({ width: W, height: H, sun: [W * 0.7, -200, -100], tones: DAY });
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#5d8fc0' }), clouds.node);
  const arrows = svg('g');
  f.svg.append(arrows);
  const paintArrows = () => {
    // Wind arrows: full speed at the top, slower below.
    redraw(arrows, ...[30, 90, 150, 200].map((y) => {
      const len = 30 + (1 - shear * ((y - 30) / 170)) * 30;
      return svg('g', { opacity: 0.6 }, line(8, y, 8 + len, y, '#fff', 1.5), svg('polygon', { points: `${8 + len},${y - 3} ${14 + len},${y} ${8 + len},${y + 3}`, fill: '#fff' }));
    }));
  };
  const paintStreaks = () => {
    const strands = [0, 1, 2, 3, 4].map((i) => {
      const hx = 70 + i * 78 + (i % 2) * 10;
      const hy = 30 + (i % 2) * 14;
      // A crystal released from the head falls at `vs` and, as it reaches
      // slower air, lags further and further behind the head that dropped it.
      const vs = 40 + fall * 60;
      const pts: [number, number, number][] = [];
      for (let tau = 0; tau <= 2.6; tau += 0.13) {
        const y = hy + vs * tau;
        if (y > H + 10) break;
        const lag = shear * 60 * tau * tau * (vs / 70);
        // A dense tuft at the head, the streak thinning as its crystals spread out.
        pts.push([hx - lag, y, tau < 0.15 ? 5.5 : Math.max(0.8, 3.4 - tau * 1.1)]);
      }
      return { pts };
    });
    clouds.draw([{ kind: 'cirrus', strands }]);
  };
  const paint = () => {
    paintArrows();
    paintStreaks();
    f.readout.textContent = shear < 0.25
      ? 'Little change in wind with height: the ice falls nearly straight down in streaks below each tuft.'
      : shear < 0.6
        ? 'The wind slows lower down, so falling crystals drift back behind their tuft and the streaks curve.'
        : 'Strong shear: long sweeping tails ending in a hook where the crystals formed. Mares’ tails: cirrus uncinus, Latin for hooked.';
    if (t.goal === 'hooks' && shear >= 0.6) t.done();
  };
  f.controls.append(
    slider('Wind shear', 0, 1, 0.01, shear, (v) => (v < 0.25 ? 'little' : v < 0.6 ? 'some' : 'strong'), (v) => { shear = v; paint(); }, 'ice').node,
    slider('Crystal size', 0, 1, 0.01, fall, (v) => (v < 0.35 ? 'tiny, falls slowly' : v < 0.7 ? 'medium' : 'large, falls fast'), (v) => { fall = v; paintStreaks(); }, 'ice').node,
  );
  paint();
  return f.node;
});

// ---- One prism --------------------------------------------------------------

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1];
const unit = (deg: number): V => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

export const prismFigure = figure(['min'], (_ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H);
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
    const d1 = refract(d0, nIn, 1, ICE_N);
    let exit: V | null = null;
    let d2: V | null = null;
    if (d1) {
      // Where the inside ray meets the exit face's line.
      const p = faceOut[0];
      const tHit = dot(add(p, mul(entry, -1)), nOut) / dot(d1, nOut);
      exit = add(entry, mul(d1, tHit));
      d2 = refract(d1, mul(nOut, -1), ICE_N, 1);
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
        label(end[0] + 4, end[1] + 4, dev != null ? `bent ${dev.toFixed(1)}°` : '', { bold: true }),
      );
    } else {
      parts.push(small(20, 226, 'The light is trapped inside and comes out another face.', { soft: true }));
    }
    redraw(g, ...parts);
    redraw(plot,
      line(px0, py0, px1, py0, COL.grid, 1),
      line(px0, yOf(minD), px1, yOf(minD), COL.parcel, 1.2, { 'stroke-dasharray': '5 4' }),
      small(px1, yOf(minD) + 12, '22°: the least it can bend', { anchor: 'end', fill: COL.parcel }),
      polyline(curve, COL.ice, 2.5),
      dev != null ? svg('circle', { cx: xOf(inc), cy: yOf(dev), r: 4.5, fill: COL.sun, stroke: COL.ink }) : null,
      small(px0, py0 + 14, 'angle the light comes in at →', { soft: true }),
      small(px0, 34, 'how much it is bent', { soft: true }),
    );
    f.readout.textContent = dev == null
      ? 'At this angle the light cannot get out of the far face.'
      : Math.abs(dev - minD) < 0.6
        ? `Bent ${dev.toFixed(1)}°: the minimum. Nearby angles all bend almost exactly this much, so light piles up here.`
        : `Bent ${dev.toFixed(1)}°. Turn the crystal and find the angle where the bend is smallest.`;
    if (t.goal === 'min' && dev != null && Math.abs(dev - minD) < 0.6) t.done();
  };
  f.controls.append(slider('Turn the crystal', 14, 89, 0.5, 70, (v) => `${v.toFixed(0)}°`, paint, 'ice').node);
  paint(70);
  return f.node;
});

// ---- The halo, crystal by crystal -------------------------------------------

export const haloFigure = figure(['ring'], (_ctx, t) => {
  const W = 400;
  const H = 260;
  const f = frame(W, H);
  const C: V = [200, 130];
  const PX = 4.4; // px per degree
  const SCALE = 2; // canvas pixels per figure unit, for a crisp picture
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const g = canvas.getContext('2d'); // null only where there is no canvas, as in tests
  const sky = svg('image', { x: 0, y: 0, width: W, height: H });
  const overlay = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#6d8fbf' }), sky, overlay,
    svg('circle', { cx: C[0], cy: C[1], r: 9, fill: '#fffbe9' }),
  );
  // Crystals are scattered evenly over the whole sky, each turned at random.
  // A crystal sends sunlight to your eye only if the bend its angle gives
  // matches how far it sits from the sun (within a degree, the sun's own
  // width plus a little). The rest are lit too, but their light goes elsewhere.
  const crystals: { x: number; y: number; lit: boolean; red: boolean }[] = [];
  const grow = (n: number) => {
    while (crystals.length < n) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const away = Math.hypot(x - C[0], y - C[1]) / PX;
      const d = deviation(Math.random() * 90);
      const lit = d != null && Math.abs(d - away) < 1;
      crystals.push({ x, y, lit, red: lit && away < 22.4 });
    }
    crystals.length = n;
  };
  let hand = false;
  const paint = (n: number) => {
    grow(n);
    const lit = crystals.reduce((k, c) => k + (c.lit ? 1 : 0), 0);
    if (g) {
      g.clearRect(0, 0, canvas.width, canvas.height);
      // Crystals whose light misses you: faint specks, which add up to a milky veil.
      g.fillStyle = 'rgba(220, 232, 255, 0.3)';
      for (const c of crystals) if (!c.lit) g.fillRect(c.x * SCALE - 1.5, c.y * SCALE - 1.5, 3, 3);
      for (const c of crystals) {
        if (!c.lit) continue;
        // The red end of the spectrum bends least, so the ring is reddish inside.
        g.fillStyle = c.red ? '#ffd0b8' : '#ffffff';
        g.beginPath();
        g.arc(c.x * SCALE, c.y * SCALE, 1.5 * SCALE, 0, Math.PI * 2);
        g.fill();
      }
      sky.setAttribute('href', canvas.toDataURL());
    }
    redraw(overlay, hand ? svg('g', {},
      line(C[0], C[1], C[0] + 22 * PX, C[1], '#fff', 1, { 'stroke-dasharray': '3 3' }),
      small(C[0] + 11 * PX, C[1] - 6, 'hand span ≈ 22°', { anchor: 'middle', fill: '#fff' }),
    ) : null);
    f.readout.textContent = n < 3000
      ? `${n.toLocaleString()} crystals all over the sky. Only ${lit} happen to be turned to send light to your eye.`
      : `${n.toLocaleString()} crystals all over the sky; ${lit.toLocaleString()} send you light. None of them sit closer than 22° to the sun, and most sit right at 22°: a ring, with darker sky inside.`;
    if (t.goal === 'ring' && n >= 10000) t.done();
  };
  const toCount = (v: number) => Math.round(Math.pow(10, v)) * 10;
  const count = slider('Crystals', 1, 3.5, 0.01, 1.5, (v) => toCount(v).toLocaleString(), (v) => paint(toCount(v)), 'ice');
  const handBtn = document.createElement('button');
  handBtn.type = 'button';
  handBtn.className = 'btn btn-small btn-ghost';
  handBtn.textContent = 'Measure with a hand';
  handBtn.addEventListener('click', () => { hand = !hand; paint(toCount(count.value())); });
  f.controls.append(count.node, handBtn);
  paint(toCount(1.5));
  return f.node;
});

// ---- Where a 22° bend shows up in the sky -----------------------------------

export const haloSightDiagram: FigureFactory = () => {
  const W = 400;
  const H = 250;
  const d = still(W, H);
  const E: V = [250, 222]; // the watcher's eye
  const SUN = 120; // direction of the sun from the eye, degrees above the right horizon
  const at = (deg: number, r: number): V => [E[0] + r * Math.cos((deg * Math.PI) / 180), E[1] - r * Math.sin((deg * Math.PI) / 180)];
  const toward = (p: V, deg: number, r: number): V => [p[0] + r * Math.cos((deg * Math.PI) / 180), p[1] - r * Math.sin((deg * Math.PI) / 180)];
  // An arc around p from angle a to angle b (degrees, counter-clockwise on screen).
  const arc = (p: V, r: number, a: number, b: number, stroke: string) => {
    const [x0, y0] = toward(p, a, r);
    const [x1, y1] = toward(p, b, r);
    return svg('path', { d: `M${x0},${y0} A${r},${r} 0 0 0 ${x1},${y1}`, fill: 'none', stroke, 'stroke-width': 1.6 });
  };
  const sunAt = at(SUN, 225);
  const R = 170; // how far up the veil is, in drawing units
  const bright = at(SUN - 22, R); // 22° from the sun: a crystal can bend light here
  const other = at(SUN + 22, R); // the same on the other side of the sun
  const near = at(SUN - 9, R); // 9° from the sun: would need a 9° bend
  // Every crystal is lit by the same parallel sunlight, travelling away from the sun.
  const sunRay = (p: V) => line(...toward(p, SUN, 120), p[0], p[1], COL.sun, 2.4);
  const xtal = (p: V) => hexagon(p[0], p[1], 7, { fill: '#eef5ff', stroke: COL.ice, 'stroke-width': 1.6 }, Math.PI / 6);
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.air }),
    svg('rect', { x: 0, y: 226, width: W, height: H - 226, fill: COL.ground }),
    // The line of sight to the sun, and the sun far off along it.
    line(E[0], E[1], ...toward(E, SUN, 210), COL.soft, 1.2, { 'stroke-dasharray': '4 4' }),
    svg('circle', { cx: sunAt[0], cy: sunAt[1], r: 14, fill: '#fff1c6', stroke: COL.sun, 'stroke-width': 2 }),
    small(sunAt[0] - 20, sunAt[1] + 5, 'sun', { anchor: 'end' }),
    sunRay(bright), sunRay(other), sunRay(near),
    small(296, 34, 'sunlight: parallel rays,', { fill: COL.sunInk }),
    small(296, 47, 'all from one direction', { fill: COL.sunInk }),
    // Where the light would have gone unbent, and where it actually goes.
    line(bright[0], bright[1], ...toward(bright, SUN + 180, 60), COL.soft, 1.2, { 'stroke-dasharray': '3 3' }),
    line(bright[0], bright[1], E[0], E[1], COL.sun, 2.4),
    line(other[0], other[1], E[0], E[1], COL.sun, 2.4),
    arc(bright, 34, SUN + 180, SUN - 22 + 180, COL.parcel),
    small(bright[0] + 22, bright[1] + 30, 'bent 22°', { fill: COL.parcel, bold: true }),
    arc(E, 44, SUN - 22, SUN, COL.parcel),
    small(...toward(E, SUN - 27, 48), '22°', { fill: COL.parcel, bold: true }),
    arc(E, 52, SUN, SUN + 22, COL.parcel),
    small(...toward(E, SUN + 11, 68), '22°', { anchor: 'middle', fill: COL.parcel, bold: true }),
    // The crystal closer to the sun cannot send any light down to the eye.
    line(near[0], near[1], E[0], E[1], COL.soft, 1, { 'stroke-dasharray': '2 4' }),
    xtal(bright), xtal(other),
    hexagon(near[0], near[1], 7, { fill: '#e4e1ea', stroke: COL.soft, 'stroke-width': 1.6 }, Math.PI / 6),
    small(bright[0] + 12, bright[1] - 8, 'bright', { bold: true }),
    small(other[0] - 12, other[1] - 12, 'bright', { anchor: 'end', bold: true }),
    small(16, 176, 'The grey crystal is only 9°', { fill: COL.soft }),
    small(16, 189, 'from the sun. No ice prism', { fill: COL.soft }),
    small(16, 202, 'bends light that little, so', { fill: COL.soft }),
    small(16, 215, 'it sends you nothing: dark.', { fill: COL.soft }),
    svg('circle', { cx: E[0], cy: E[1], r: 4, fill: COL.ink }),
    small(E[0] + 10, E[1] + 2, 'your eye'),
    small(W / 2, 244, 'How far from the sun you look = how much the light was bent.', { anchor: 'middle', fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- A warm front comes in --------------------------------------------------

export const frontFigure = figure(['arrive'], (ctx, t) => {
  const W = 400;
  const H = 260;
  const f = frame(W, H);
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
      svg('polygon', { points: `${frontX},${ground} ${points(pts)} -10,0 ${W + 10},0 ${W + 10},${ground}`, fill: '#f6dccf', opacity: 0.7 }),
      polyline(pts, COL.warm, 2.5),
      small(Math.min(W - 60, frontX + 8), ground - 10, 'warm front', { fill: COL.warm }),
      label(Math.min(W - 70, frontX + 30), 40, 'warm air', { fill: COL.warm }),
      label(8, ground - 8, 'cold air', { fill: COL.cold }),
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
      parts.push(small((xa + xb) / 2, yOf((h0 + h1) / 2) - 14, name, { soft: true, anchor: 'middle' }));
    }
    parts.push(
      svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.ground }),
      svg('rect', { x: obsX - 5, y: ground - 16, width: 10, height: 10, fill: COL.ink }),
      line(obsX - 4, ground, obsX - 2, ground - 6, COL.ink, 1.5), line(obsX + 4, ground, obsX + 2, ground - 6, COL.ink, 1.5),
      small(obsX, ground + 16, 'you', { anchor: 'middle', fill: '#fff' }),
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
    view.push(small(cx, cy + 60, 'overhead', { anchor: 'middle' }));
    redraw(inset, ...view);
    const h = frontHeightM(hours);
    f.readout.textContent = sky === 'clear'
      ? `${hours} hours out. The front is ${Math.round(hours * FRONT_KMH)} km away and its cloud is still beyond the horizon.`
      : `${hours} hours before the front. Overhead, its surface is ${height(h, ctx.save.units)} up: ${genus(sky).name.toLowerCase()}.` +
        (sky === 'cirrostratus' ? ' Watch for the halo: rain is likely within a day.' : sky === 'nimbostratus' ? ' Steady rain.' : '');
    if (t.goal === 'arrive' && hours <= 3) t.done();
  };
  f.controls.append(slider('Hours before it arrives', 0, 48, 1, 48, (v) => `${v} h`, paint, 'warm').node);
  // The slider runs forward in time from left to right.
  const s = f.controls.querySelector('input')!;
  s.style.direction = 'rtl';
  paint(48);
  return f.node;
});
