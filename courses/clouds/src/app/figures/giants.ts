// Figures about the vertical giants and the rare ones: how tall heaps grow,
// a thunderstorm's life and how it looks on radar, counting the seconds to the thunder, standing waves
// over a ridge, wind-shear billows, mammatus pouches under an anvil, and
// stills of the tropopause and a storm's charges.

import { cloudBase, column, dawnTemp, envTemp, mixedTop, parcelAt, type Environment } from '../../core/air';
import { el, svg } from 'didactics/dom';
import { realClouds } from '../clouds/real';
import { celAnvil, celCumulus, celHeap } from '../clouds/flat';
import { FIGURE } from '../clouds/tones';
import { arrow, heading, heapAt, line, points, polyline, radarImage, radarKey, redraw, small, still } from './draw';
import { fbm } from '../clouds/noise';
import { COL, animate, choices, figure, frame, height, lock, lockIn, slider, type FigureFactory } from './kit';
import { strikeKm } from '../../core/sky';

// ---- How tall the clouds grow -----------------------------------------------

export const soundingFigure = figure(['cumulonimbus', 'humilis', 'mediocris', 'congestus'], (ctx, t) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 2);
  const top = 12000;
  const bottom = 276;
  const yOf = (m: number) => bottom - (m / top) * 262;
  const cx0 = 44;
  const cx1 = 262;
  const tMin = -60;
  const tMax = 36;
  const xOf = (c: number) => cx0 + ((c - tMin) / (tMax - tMin)) * (cx1 - cx0);
  const env: Environment = { dawnC: 12, lapsePerKm: 6, groundC: 20, inversion: { atM: 2400, deltaC: 3 } };
  let dewC = 9;

  const grid = svg('g');
  for (let m = 0; m <= top; m += 2000) {
    grid.append(line(cx0, yOf(m), cx1, yOf(m), COL.grid, 1));
    grid.append(small(cx0 - 4, yOf(m) + 3, height(m, ctx.save.units), { anchor: 'end' }));
  }
  for (let c = -60; c <= 30; c += 30) {
    grid.append(line(xOf(c), yOf(0), xOf(c), yOf(top), COL.grid, 1));
    grid.append(small(xOf(c), bottom + 14, `${c}°`, { anchor: 'middle' }));
  }
  const live = svg('g');
  f.svg.append(
    svg('rect', { x: 276, y: 0, width: W - 276, height: bottom, fill: '#e3eff3' }),
    svg('rect', { x: 0, y: bottom, width: W, height: H - bottom, fill: 'transparent' }),
    svg('rect', { x: 276, y: bottom, width: W - 276, height: H - bottom, fill: COL.ground }),
    grid,
    live,
  );

  const curve = (fn: (m: number) => number, to = top, step = 100): [number, number][] => {
    const pts: [number, number][] = [];
    for (let m = 0; m <= to; m += step) pts.push([xOf(fn(m)), yOf(m)]);
    return pts;
  };
  const paint = () => {
    const col = column(env, dewC);
    const start = env.groundC + 0.5;
    const stop = col.topM;
    const parcelPts = curve((m) => parcelAt(m, start, dewC).tempC, stop, 50);
    const base = cloudBase(start, dewC);
    const dewPts = curve((m) => parcelAt(m, start, dewC).dewC, Math.min(base, stop), 50);
    const cloudX = 338;
    let cloud: SVGElement | null = null;
    if (col.baseM != null) {
      const h = yOf(col.baseM) - yOf(col.topM);
      cloud = svg('g', {}, heapAt(cloudX, yOf(col.baseM), 22 + Math.min(30, h * 0.18), Math.max(10, h)));
      if (col.kind === 'cumulonimbus') {
        const ay = yOf(Math.min(col.topM, 11000));
        cloud.append(svg('polygon', { points: `${cloudX - 24},${ay + 6} ${cloudX - 56},${ay} ${cloudX + 60},${ay - 2} ${cloudX + 28},${ay + 8}`, fill: COL.cloud, stroke: COL.cloudShade }));
        for (const dx of [-14, -4, 6, 16]) cloud.append(line(cloudX + dx, yOf(col.baseM), cloudX + dx - 4, bottom, COL.rain, 1.5, { opacity: 0.7 }));
      }
    }
    redraw(live,
      polyline(curve((m) => dawnTemp(m, env)), COL.env, 1.5, { 'stroke-dasharray': '4 4', opacity: 0.7 }),
      polyline(curve((m) => envTemp(m, env)), COL.env, 2.5),
      polyline(dewPts, COL.dew, 2.5),
      polyline(parcelPts, COL.parcel, 2.5),
      col.baseM != null ? line(cx0, yOf(col.baseM), W, yOf(col.baseM), COL.ink, 1, { 'stroke-dasharray': '6 4', opacity: 0.6 }) : null,
      line(cx0, yOf(col.topM), W, yOf(col.topM), COL.ink, 1, { 'stroke-dasharray': '2 3', opacity: 0.6 }),
      small(cx1 - 2, yOf(mixedTop(env)) + 12, 'stirred layer', { soft: true, anchor: 'end' }),
      cloud,
    );
    const names: Record<string, string> = {
      none: 'No cloud: the thermals stop before they reach their dew point',
      humilis: 'Cumulus humilis: small, flat, fair-weather heaps',
      mediocris: 'Cumulus mediocris: heaps as tall as they are wide',
      congestus: 'Cumulus congestus: towering, sprouting cauliflower tops',
      cumulonimbus: 'Cumulonimbus: the top has frozen into an anvil of ice',
    };
    f.readout.textContent = `${names[col.kind]}.` + (col.baseM != null ? ` Base ${height(col.baseM, ctx.save.units)}, top ${height(col.topM, ctx.save.units)}.` : ` They stop at ${height(col.topM, ctx.save.units)}.`);
    if (t.goal && col.kind === t.goal) t.done();
  };
  f.controls.append(
    slider('Sun', 14, 32, 0.5, env.groundC, (v) => `${v} °C at the ground`, (v) => { env.groundC = v; paint(); }, 'sun').node,
    slider('Moisture', 2, 16, 0.5, dewC, (v) => `dew point ${v} °C`, (v) => { dewC = v; paint(); }, 'dew').node,
    slider('Lid', 0, 5, 0.5, env.inversion!.deltaC, (v) => (v === 0 ? 'none' : `${v} °C warmer above`), (v) => { env.inversion = v ? { atM: 2400, deltaC: v } : undefined; paint(); }, 'env').node,
  );
  if (t.goal === 'cumulonimbus') {
    f.controls.append(slider('Instability', 5, 7.5, 0.1, env.lapsePerKm, (v) => `air cools ${v.toFixed(1)} °C/km`, (v) => { env.lapsePerKm = v; paint(); }, 'env').node);
  }
  paint();
  return f.node;
});

// ---- The lid at the top of the weather --------------------------------------

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
    celCumulus(95, yOf(1.2), 80, yOf(1.2) - yOf(10.4), FIGURE, 4),
    celAnvil(20, 200, 68, 124, yOf(11.3), yOf(10.1), FIGURE),
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

// ---- A thunderstorm's life --------------------------------------------------

const STORM_ENDS = ['It rains out all its water', 'Its own cold downdraft cuts off the warm air', 'The wind blows its top off'] as const;
/** The one of STORM_ENDS that is right. */
const STORM_END = 1;

export const stormFigure = figure(['end'], (_ctx, t) => {
  const W = 400;
  const H = 270;
  const f = frame(W, H, 4);
  const ground = 246;
  const tropo = 40;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#dfe7f0' }),
    line(0, tropo, W, tropo, COL.env, 1, { 'stroke-dasharray': '6 4' }),
    small(W - 6, tropo - 5, 'tropopause: the ceiling of the weather', { anchor: 'end', fill: COL.env }),
    g,
    svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.ground }),
  );
  const up = (x: number, y0: number, y1: number) => svg('g', {}, line(x, y0, x, y1, COL.parcel, 2.5), svg('polygon', { points: `${x - 5},${y1 + 6} ${x},${y1 - 2} ${x + 5},${y1 + 6}`, fill: COL.parcel }));
  const down = (x: number, y0: number, y1: number) => svg('g', {}, line(x, y0, x, y1, COL.ice, 2.5), svg('polygon', { points: `${x - 5},${y1 - 6} ${x},${y1 + 2} ${x + 5},${y1 - 6}`, fill: COL.ice }));
  const paint = (min: number) => {
    const parts: SVGElement[] = [];
    const cx = 170;
    const baseY = 190;
    let stage: string;
    if (min < 15) {
      stage = 'Cumulus stage: warm air rushes up and the tower grows taller every minute. No rain reaches the ground yet.';
      const h = 40 + (min / 15) * 100;
      parts.push(heapAt(cx, baseY, 40, h), up(cx - 14, baseY + 30, baseY - h + 30), up(cx + 14, baseY + 30, baseY - h + 40));
    } else if (min < 40) {
      stage = 'Mature stage: the top hits the tropopause and spreads into an anvil. Rain and hail drag cold air down, which spreads out along the ground as a gust front.';
      const k = (min - 15) / 25;
      const anvil = 60 + k * 90;
      parts.push(
        heapAt(cx, baseY, 46, baseY - tropo - 10),
        celAnvil(cx - 40 - anvil * 0.4, cx + 40 + anvil, cx - 40, cx + 40, tropo - 2, tropo + 22, FIGURE),
        // The overshooting top, punching just above the lid.
        celHeap([{ x: cx, y: tropo - 2, z: 0, r: 10, flat: 0.9 }], FIGURE, { bumps: false }),
        up(cx - 20, baseY + 30, tropo + 40),
        down(cx + 22, baseY - 60, ground - 6),
        ...Array.from({ length: 8 }, (_, i) => line(cx + 6 + i * 6, baseY + 4, cx + 2 + i * 6, ground, COL.rain, 1.4, { opacity: 0.8 })),
      );
      const gust = 40 + k * 120;
      parts.push(
        svg('path', { d: `M${cx + 30},${ground} q${gust / 2},-26 ${gust},0`, fill: 'none', stroke: COL.ice, 'stroke-width': 2, 'stroke-dasharray': '4 3' }),
        small(cx + 30 + gust, ground - 6, 'gust front', { fill: COL.ice }),
      );
      if (min > 22 && min < 30) parts.push(svg('polyline', { points: `${cx - 10},${baseY + 6} ${cx - 20},${baseY + 26} ${cx - 8},${baseY + 26} ${cx - 22},${ground}`, fill: 'none', stroke: COL.sun, 'stroke-width': 3 }));
    } else {
      stage = 'Dissipating stage: the cold downdraft has cut off the warm air feeding it. Rain thins out and the tower collapses, leaving the anvil drifting on alone.';
      const k = (min - 40) / 20;
      parts.push(
        svg('g', { opacity: 1 - k * 0.7 }, heapAt(cx, baseY + 10, 40, 80 - k * 50)),
        celAnvil(cx - 90 + k * 40, cx + 160 + k * 30, cx - 50 + k * 40, cx + 60 + k * 40, tropo, tropo + 22 - k * 6, FIGURE),
        down(cx, baseY - 30, ground - 6),
        ...Array.from({ length: 4 }, (_, i) => line(cx - 10 + i * 8, baseY + 14, cx - 14 + i * 8, ground, COL.rain, 1.2, { opacity: 0.6 - k * 0.5 })),
      );
    }
    redraw(g, ...parts);
    if (asking) f.readout.textContent = 'A storm like this one lives about an hour. What do you think kills it? Pick one, then run the storm.';
    else if (pick.picked() >= 0 && min >= 50) f.readout.textContent = `${min} minutes. ${stage} ` + (pick.picked() === STORM_END ? 'You guessed right.' : 'Not what you guessed: the storm still had water and warm air nearby.');
    else f.readout.textContent = `${min} minutes. ${stage}`;
    if (t.goal === 'end' && !asking && min >= 50) t.done();
  };
  // First the reader guesses what ends the storm.
  let asking = t.goal === 'end';
  const time = slider('Time', 0, 60, 1, 0, (v) => `${v} min`, paint, 'ink');
  const pick = choices(STORM_ENDS, () => (markIt.disabled = false));
  const markIt = lockIn('Run the storm', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([time], false);
    paint(time.value());
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(time.node);
  lock([time], asking);
  // Coming back to it: the guess as it was made.
  if (asking && typeof t.kept === 'number' && STORM_ENDS[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint(time.value());
  return f.node;
});

// ---- A thunderstorm on radar ------------------------------------------------

export const stormRadarDiagram: FigureFactory = (ctx) => {
  const W = 400;
  const H = 268;
  const d = still(W, H);
  const ground = 212;
  const kmPx = 14;
  const yOf = (km: number) => ground - km * kmPx;
  const panels = [24, 150, 276];
  const PW = 124;
  const bell = (v: number, s: number) => Math.exp(-((v / s) ** 2));
  // Each stage's echo, by distance from the tower's middle (px) and height (km).
  const stages: ((dx: number, km: number) => number)[] = [
    // Growing: the first rain forms high in the tower, where there is ice; none has reached the ground.
    (dx, km) => 38 * bell(dx, 15) * bell(km - 6, 1.5) + 4,
    // Mature: a core of heavy rain and hail from the ground up; a faint anvil drifting downwind.
    (dx, km) => Math.max(
      (km < 9.5 ? 52 + 12 * bell(km - 5, 1.6) - 3 * Math.max(0, km - 7) : 0) * bell(dx, 15 + km * 0.6),
      (18 - dx * 0.05) * bell(km - 10.9, 0.75) * bell((dx - 18) / 50, 1),
    ),
    // Dissipating: the downdraught has won; the last rain falls out of the bottom, the anvil lingers.
    (dx, km) => Math.max(
      (km < 4 ? 34 - km * 3 : 0) * bell(dx, 24),
      14 * bell(km - 10.5, 0.7) * bell((dx - 14) / 52, 1),
    ),
  ];
  const tower = (x: number, kind: number) => {
    const cx = x + 44;
    const base = yOf(1.4);
    const top = yOf(kind === 0 ? 8 : 12.2);
    const lobes = kind === 0
      ? `M${cx - 30},${base} C${cx - 36},${top + 60} ${cx - 22},${top} ${cx},${top} C${cx + 22},${top} ${cx + 36},${top + 60} ${cx + 30},${base} Z`
      : `M${cx - 26},${base} L${cx - 22},${yOf(9.6)} L${cx - 40},${yOf(10.2)} Q${cx - 30},${top} ${cx},${top} L${cx + 76},${yOf(11.7)} L${cx + 76},${yOf(10.3)} L${cx + 22},${yOf(9.6)} L${cx + 26},${base} Z`;
    return svg('path', { d: lobes, fill: '#ffffff', opacity: kind === 2 ? 0.55 : 0.85, stroke: COL.cloudShade, 'stroke-width': 1.2 });
  };
  const notes = [['Growing', 'first echo high up;', 'no rain at the ground'], ['Mature', 'a core from the ground', 'up; hail in the middle'], ['Dissipating', 'the rain falls out;', 'the anvil lingers']];
  d.svg.append(svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.air }));
  panels.forEach((x, k) => d.svg.append(tower(x, k)));
  d.svg.append(radarImage(0, 0, W, ground, 3, (x, y) => {
    const k = panels.findIndex((p) => x >= p && x < p + PW);
    if (k < 0) return -Infinity;
    const km = (ground - y) / kmPx;
    const v = stages[k](x - (panels[k] + 44), km);
    const n = v + (fbm(x / 9, y / 9) - 0.5) * 8;
    return n < 8 ? -Infinity : n;
  }));
  d.svg.append(
    svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.paper }),
    line(0, ground, W, ground, COL.ground, 3),
    ...[5, 10].map((km) => small(2, yOf(km) + 3, ctx.save.units === 'metric' ? `${km} km` : `${Math.round(km * 3.281)}k ft`, { soft: true })),
    ...panels.flatMap((x, k) => [
      heading(x + PW / 2, 14, notes[k][0]),
      small(x + PW / 2, ground + 12, notes[k][1], { anchor: 'middle' }),
      small(x + PW / 2, ground + 22, notes[k][2], { anchor: 'middle' }),
      k ? line(x - 2, 22, x - 2, ground, COL.grid, 1) : null,
    ].filter(Boolean) as SVGElement[]),
    small(panels[0] + 4, yOf(1.4) + 10, 'white: the cloud', { soft: true }),
    radarKey(12, 250, 376),
  );
  return { node: d.node };
};

// ---- Where a storm keeps its charge -----------------------------------------

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

// ---- Flash, then bang -------------------------------------------------------

export const flashFigure = figure(['strike'], (ctx, t) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H, 4);
  const ground = 170;
  const you = 40;
  let km = 6;
  let since = -1; // seconds since the flash, in the story; -1 when idle
  let heard = false;
  const SPEED = 4; // the figure runs four times faster than real time
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#4b4766' }), svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: '#2b2843' }), g);
  const xOf = (k: number) => you + k * 16;
  const paint = () => {
    const sx = xOf(km);
    const parts: SVGElement[] = [
      svg('rect', { x: sx - 40, y: 30, width: 80, height: 34, rx: 14, fill: '#2e2a45' }),
      svg('rect', { x: you - 4, y: ground - 14, width: 8, height: 14, fill: '#fff' }),
      small(you, ground + 16, 'you', { anchor: 'middle', fill: '#fff' }),
      small(sx, 24, `storm · ${km} km away`, { anchor: 'middle', fill: '#fff' }),
    ];
    if (since >= 0 && since < 0.4) parts.push(svg('polyline', { points: `${sx},64 ${sx - 10},100 ${sx + 4},104 ${sx - 8},${ground}`, fill: 'none', stroke: '#fff7c2', 'stroke-width': 3 }), svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff', opacity: 0.25 }));
    if (since >= 0 && !heard) {
      const r = (since * 343 / 1000) * 16;
      parts.push(svg('circle', { cx: sx, cy: ground, r, fill: 'none', stroke: '#c9c3e6', 'stroke-width': 2, opacity: 0.7 }));
    }
    redraw(g, ...parts);
  };
  animate(f.node, ctx, (dt) => {
    if (since < 0 || heard) return;
    since += dt * SPEED;
    const arrive = (km * 1000) / 343;
    if (since >= arrive) {
      heard = true;
      f.node.classList.add('shake');
      setTimeout(() => f.node.classList.remove('shake'), 400);
      const s = Math.round(arrive);
      f.readout.textContent = `Boom: ${s} seconds. Sound covers a kilometre in about three, so the strike was about ${strikeKm(s).toFixed(1)} km away.` +
        (s <= 30 ? ' Within 30 seconds: get inside, and stay 30 minutes after the last thunder.' : ' Far enough for now, but storms move quickly.');
      if (t.goal === 'strike') t.done();
    } else f.readout.textContent = `Counting (sped up four times, in real seconds): ${Math.floor(since)}…`;
    paint();
  });
  const strike = document.createElement('button');
  strike.type = 'button';
  strike.className = 'btn btn-small';
  strike.textContent = 'Strike';
  strike.addEventListener('click', () => { since = 0; heard = false; paint(); });
  f.controls.append(slider('Storm distance', 1, 20, 1, km, (v) => `${v} km`, (v) => { km = v; since = -1; paint(); }, 'ink').node, strike);
  f.readout.textContent = 'Set the storm’s distance, then make it strike. Light arrives at once; the thunder takes its time. (Four times real speed.)';
  paint();
  return f.node;
});

// ---- Waves over a ridge -----------------------------------------------------

export const waveFigure = figure(['lens'], (_ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 4);
  let wind = 0.5;
  let level = 0.5;
  const ground = 210;
  const ridgeX = 90;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#e0ebf3' }), g);
  const terrain = (x: number) => ground - 70 * Math.exp(-(((x - ridgeX) / 34) ** 2));
  const paint = () => {
    const lambda = 60 + wind * 90; // Faster wind, longer waves.
    const amp = 10 + wind * 18;
    const condY = 60 + (1 - level) * 90; // More moisture, lower condensation level.
    const stream = (y0: number) => {
      const pts: [number, number][] = [];
      for (let x = 0; x <= W; x += 4) {
        const decayUp = Math.exp(-(ground - y0) / 260);
        let y = y0 - (ground - terrain(x)) * decayUp * 0.9;
        if (x > ridgeX) y -= amp * decayUp * Math.sin(((x - ridgeX) / lambda) * Math.PI * 2 - Math.PI / 2) * Math.exp(-(x - ridgeX) / 600);
        pts.push([x, y]);
      }
      return pts;
    };
    const parts: SVGElement[] = [];
    let lenses = 0;
    for (const y0 of [70, 100, 130, 160, 190]) {
      const pts = stream(y0);
      parts.push(svg('polyline', { points: points(pts), fill: 'none', stroke: COL.ice, 'stroke-width': 1.2, opacity: 0.6 }));
      // Wherever this line of air is lifted above the condensation level, it is cloud.
      let run: [number, number][] = [];
      const flush = () => {
        if (run.length > 3) {
          const top = run.map(([x, y]) => `${x},${y}`).join(' ');
          const bottom = run.slice().reverse().map(([x, y]) => `${x},${Math.min(condY + 2, y + 10)}`).join(' ');
          parts.push(svg('polygon', { points: `${top} ${bottom}`, fill: '#fff', stroke: COL.cloudShade }));
          if (run[0][0] > ridgeX + 20) lenses++;
        }
        run = [];
      };
      for (const p of pts) (p[1] < condY ? run.push(p) : flush());
      flush();
    }
    const tp: [number, number][] = [];
    for (let x = 0; x <= W; x += 4) tp.push([x, terrain(x)]);
    parts.push(
      line(0, condY, W, condY, COL.dew, 1, { 'stroke-dasharray': '5 4' }),
      small(W - 6, condY + 12, 'condensation level', { anchor: 'end', fill: COL.dew }),
      svg('polygon', { points: `0,${H} ${points(tp)} ${W},${H}`, fill: COL.ground }),
    );
    redraw(g, ...parts);
    f.readout.textContent = lenses
      ? 'Lenticular clouds: where a standing wave lifts the air above its condensation level, a smooth lens forms. The air streams through it, but the cloud stays put.'
      : 'Air flowing over the ridge bobs in waves downwind of it. Lower the condensation level (more moisture) or strengthen the wind until the crests turn to cloud.';
    if (t.goal === 'lens' && lenses > 0) t.done();
  };
  f.controls.append(
    slider('Wind', 0, 1, 0.01, wind, (v) => (v < 0.35 ? 'light' : v < 0.7 ? 'strong' : 'gale'), (v) => { wind = v; paint(); }, 'ice').node,
    slider('Moisture', 0, 1, 0.01, level, (v) => (v < 0.35 ? 'dry' : v < 0.7 ? 'moist' : 'very moist'), (v) => { level = v; paint(); }, 'dew').node,
  );
  paint();
  return f.node;
});

// ---- Mammatus ---------------------------------------------------------------

export const mammaFigure = figure(['pouches'], (_ctx, t) => {
  const W = 400;
  const H = 180;
  const f = frame(W, H, 4);
  // Late light from low in the west, under the anvil: pouches lit from below and the side.
  const clouds = realClouds({ width: W, height: H, sun: [-200, H + 60, -150], tones: { cloudShade: '#5e4466', cloudMid: '#a97f9e', cloudLight: '#f6cdb4' } });
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#e9b48f' }), clouds.node);
  const paint = (sink: number) => {
    const pouches = Array.from({ length: 12 }, (_, i) => {
      const r = 12 + sink * 10;
      return { x: 18 + i * 34 + (i % 2) * 6, y: 50 + sink * 16, z: 0, r, flat: (5 + sink * 22) / r };
    });
    clouds.draw([
      { kind: 'sheet', x0: -60, x1: W + 60, top: -40, bottom: 54, density: 3, detail: 6 },
      { kind: 'layer', x0: 0, x1: W, top: 40, bottom: 90, puffs: pouches, density: 1.2, detail: 30 },
    ]);
    f.readout.textContent = sink < 0.3
      ? 'The underside of an anvil, smooth while little is happening.'
      : 'Mammatus: pouches of cold, cloudy air sinking from the anvil’s base, an upside-down cumulus. Ominous, but usually a sign the storm is moving away.';
    if (t.goal === 'pouches' && sink >= 0.6) t.done();
  };
  f.controls.append(slider('Sinking air', 0, 1, 0.01, 0.1, (v) => (v < 0.3 ? 'little' : v < 0.6 ? 'some' : 'a lot'), paint, 'ice').node);
  paint(0.1);
  return f.node;
});

// ---- Kelvin-Helmholtz billows -----------------------------------------------

// Billows curl over when the shear across the boundary beats the stiffness of
// warmer air lying on colder: when the Richardson number, g·(Δθ/θ)·depth ÷
// (Δwind)², falls below a quarter. Here the layer is 300 m deep at about 280 K.
const BILLOW_DEPTH = 300;
/** The wind difference, m/s, at which billows start to curl over a lid `lidC` warmer. */
const curlWind = (lidC: number) => Math.sqrt((9.8 * (lidC / 280) * BILLOW_DEPTH) / 0.25);
const STRONG_LID = 3;
const LID_GUESSES = ['More difference in wind', 'Less difference in wind', 'The same'] as const;

export const billowFigure = figure(['curl'], (ctx, t) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H, 4);
  let wind = 3;
  let lid = 1;
  let phase = 0;
  // How far past the curling point: under 1 the layer holds, over 1 it breaks.
  const k = () => wind / curlWind(lid);
  const upper = svg('rect', { x: 0, y: 0, width: W, height: 100 });
  const g = svg('g');
  f.svg.append(upper, svg('rect', { x: 0, y: 100, width: W, height: 100, fill: '#a9c9e4' }), g);
  animate(f.node, ctx, (dt) => {
    const shear = Math.min(1, 0.55 * k());
    phase += dt * (0.4 + wind / 20);
    const parts: SVGElement[] = [];
    const amp = shear * 22;
    const curl = Math.max(0, shear - 0.5) * 2; // Beyond a point the waves overturn.
    for (let i = -1; i < 6; i++) {
      const x0 = i * 80 + ((phase * 30) % 80);
      // Each billow: the crest of the cloud layer pushed forward by the faster air above.
      parts.push(svg('path', {
        d: `M${x0},112 q20,${-amp} 40,${-amp * 1.2} q${20 + curl * 20},${-curl * 10} ${10 + curl * 26},${curl * 18} q-10,${10 + curl * 6} -20,${4} L${x0 + 80},112 Z`,
        fill: '#fff', stroke: COL.cloudShade,
      }));
    }
    parts.push(svg('rect', { x: 0, y: 110, width: W, height: 22, fill: '#fff', stroke: 'none' }));
    parts.push(
      svg('g', { opacity: 0.7 }, line(10, 30, 10 + 40 + wind * 4, 30, '#fff', 2), small(16, 22, `fast air above, ${lid} °C warmer`, { fill: '#fff' })),
      svg('g', { opacity: 0.7 }, line(10, 170, 40, 170, '#fff', 2), small(16, 162, 'slow, colder air below', { fill: '#fff' })),
    );
    redraw(g, ...parts);
  });
  const paint = () => {
    // The warmer the top layer, the warmer its blue.
    const mix = (a: number, b: number) => Math.round(a + (b - a) * (lid / 5) * 0.55);
    upper.setAttribute('fill', `rgb(${mix(0x88, 0xe8)}, ${mix(0xb6, 0xb0)}, ${mix(0xdc, 0xa0)})`);
    const state = k() < 0.55
      ? 'The top of the cloud layer stays smooth: the warm air above holds it flat.'
      : k() < 1
        ? 'The faster upper air drags waves into the top of the layer, but the warm lid holds them down.'
        : 'Kelvin-Helmholtz billows (fluctus): the waves curl over like breakers. They last only minutes, and they mark turbulence pilots avoid.';
    if (asking) f.readout.textContent = 'Warmer air lying on colder holds the boundary flat. If the warm layer on top is warmer still, will it take more or less difference in wind to make the waves curl over?';
    else if (t.goal === 'curl' && k() >= 1 && lid >= STRONG_LID) f.readout.textContent = `${state} With a ${lid} °C lid it took ${Math.ceil(curlWind(lid))} m/s; a 1 °C lid curls at ${Math.ceil(curlWind(1))}. ` + (pick.picked() === 0 ? 'You guessed right.' : 'Not what you guessed.');
    else f.readout.textContent = state;
    if (t.goal === 'curl' && !asking && k() >= 1 && lid >= STRONG_LID) t.done();
  };
  let asking = t.goal === 'curl';
  const shear = slider('Difference in wind', 0, 25, 1, wind, (v) => `${v} m/s`, (v) => { wind = v; paint(); }, 'ice');
  const stiff = slider('Warmer on top by', 0.5, 5, 0.5, lid, (v) => `${v} °C`, (v) => { lid = v; paint(); }, 'parcel');
  const pick = choices(LID_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Mark it', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([shear, stiff], false);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(shear.node, stiff.node);
  lock([shear, stiff], asking);
  if (asking && typeof t.kept === 'number' && LID_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});
