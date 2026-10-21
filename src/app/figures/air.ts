// Figures about rising air: a parcel lifted to its dew point, the temperature
// of the sky by height, thermals off a sunny valley, and the glider pilot's
// chart that says how tall the afternoon's clouds will grow.

import { cloudBase, column, dewPointOf, roomFor, dawnTemp, envTemp, mixedTop, parcelAt, type Environment } from '../../core/air';
import { el, svg } from '../dom';
import { heapAt, hexagon, label, line, polyline, redraw, small, still } from './draw';
import { COL, animate, frame, height, slider, task, temp, tint, type FigureFactory } from './kit';

// ---- A parcel lifted --------------------------------------------------------

export const parcelFigure: FigureFactory = (ctx, goal) => {
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
  const t = task();

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
    if (p.cloud && goal === 'base') t.resolve();
  };
  const lifter = slider('Lift the air', 0, top, 25, 0, (v) => height(v, ctx.save.units), (v) => { lift = v; paint(); }, 'parcel');
  const dew = slider('Dew point at the ground', 4, 22, 1, dewC, (v) => `${v} °C`, (v) => { dewC = v; paint(); }, 'dew');
  f.controls.append(lifter.node);
  if (goal !== 'base') f.controls.append(dew.node);
  else void t.promise.then(() => f.controls.append(dew.node));
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- A jar of air cooled to its dew point --------------------------------------

export const jarFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 260;
  const f = frame(W, H, 4);
  const t = task();
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
    if (goal === 'fog' && s.droplets > 0.3) t.resolve();
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
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- The sky's temperature by height ----------------------------------------

export const freezingFigure: FigureFactory = (ctx) => {
  // A still picture: there is nothing to find by moving through it, so every
  // height carries its temperature and the three kinds of cloud stuff at once.
  const W = 400;
  const H = 280;
  const d = still(W, H);
  const top = 13000;
  const bottom = 262;
  const yOf = (m: number) => bottom - (m / top) * 244;
  // A standard day: 15 °C at the ground, cooling 6.5 °C per kilometre to 11 km.
  const tAt = (m: number) => 15 - 6.5 * (Math.min(m, 11000) / 1000);
  const zero = 15 / 6.5 * 1000;
  const forty = 55 / 6.5 * 1000;
  const g = svg('g');
  // Three bands of stuff: droplets, supercooled droplets and ice, ice alone.
  g.append(
    svg('rect', { x: 0, y: yOf(zero), width: W, height: bottom - yOf(zero), fill: '#eaf4f2' }),
    svg('rect', { x: 0, y: yOf(forty), width: W, height: yOf(zero) - yOf(forty), fill: COL.air }),
    svg('rect', { x: 0, y: 0, width: W, height: yOf(forty), fill: '#dfe7f7' }),
    line(0, yOf(zero), W, yOf(zero), COL.dew, 1.5, { 'stroke-dasharray': '6 4' }),
    line(0, yOf(forty), W, yOf(forty), COL.ice, 1.5, { 'stroke-dasharray': '6 4' }),
    label(W - 6, yOf(zero) - 5, '0 °C: freezing level', { anchor: 'end', fill: COL.dew }),
    label(W - 6, yOf(forty) - 5, '−40 °C: nothing stays liquid', { anchor: 'end', fill: COL.ice }),
    label(W - 6, (yOf(0) + yOf(zero)) / 2 + 4, 'droplets', { soft: true, anchor: 'end' }),
    label(W - 6, (yOf(zero) + yOf(forty)) / 2 + 4, 'supercooled droplets and ice', { soft: true, anchor: 'end' }),
    label(W - 6, yOf(forty) / 2 + 4, 'ice crystals', { soft: true, anchor: 'end' }),
  );
  // The height scale, each mark with the temperature up there.
  for (let m = 2000; m <= 12000; m += 2000) {
    const c = Math.round(tAt(m));
    const mark = small(6, yOf(m) + 4, `${height(m, ctx.save.units)} · `);
    const t = svg('tspan', { 'font-weight': 700 });
    t.textContent = `${c < 0 ? '−' : ''}${Math.abs(c)} °C`;
    mark.append(t);
    g.append(mark);
  }
  // Droplets and crystals as little marks.
  for (let i = 0; i < 14; i++) {
    const x = 90 + (i % 7) * 26;
    const m1 = 300 + (i * 397) % (zero - 400);
    g.append(svg('circle', { cx: x, cy: yOf(m1), r: 2.4, fill: COL.dew }));
    const m2 = zero + 300 + (i * 811) % (forty - zero - 600);
    g.append(i % 2 ? svg('circle', { cx: x + 8, cy: yOf(m2), r: 2.4, fill: COL.dew }) : hexagon(x + 8, yOf(m2), 3, { fill: COL.ice }));
    const m3 = forty + 300 + (i * 523) % (top - forty - 600);
    g.append(hexagon(x + 4, yOf(m3), 3.2, { fill: COL.ice }));
  }
  d.svg.append(
    svg('rect', { x: 0, y: bottom, width: W, height: H - bottom, fill: COL.ground }), g,
    small(6, H - 5, 'valley floor · 15 °C', { bold: true, fill: COL.paper }),
  );
  return { node: d.node };
};

// ---- Thermals off a sunny valley ---------------------------------------------

export const thermalsFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H);
  const ground = 210;
  const t = task();
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
    if (goal === 'clouds' && formed >= 2) t.resolve();
  });
  f.controls.append(
    slider('Sun', 0, 1, 0.01, sun, (v) => (v < 0.15 ? 'dawn' : v < 0.5 ? 'morning' : v < 0.85 ? 'late morning' : 'midday'), (v) => { sun = v; paintStatic(); }, 'sun').node,
    slider('Moisture', 50, 150, 1, base - 40, (v) => (v < 80 ? 'dry' : v < 120 ? 'moderate' : 'humid'), (v) => { base = 40 + v; paintStatic(); }, 'dew').node,
  );
  paintStatic();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- How tall the clouds grow --------------------------------------------------

export const soundingFigure: FigureFactory = (ctx, goal) => {
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
  const t = task();

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
    if (goal && col.kind === goal) t.resolve();
  };
  f.controls.append(
    slider('Sun', 14, 32, 0.5, env.groundC, (v) => `${v} °C at the ground`, (v) => { env.groundC = v; paint(); }, 'sun').node,
    slider('Moisture', 2, 16, 0.5, dewC, (v) => `dew point ${v} °C`, (v) => { dewC = v; paint(); }, 'dew').node,
    slider('Lid', 0, 5, 0.5, env.inversion!.deltaC, (v) => (v === 0 ? 'none' : `${v} °C warmer above`), (v) => { env.inversion = v ? { atM: 2400, deltaC: v } : undefined; paint(); }, 'env').node,
  );
  if (goal === 'cumulonimbus') {
    f.controls.append(slider('Instability', 5, 7.5, 0.1, env.lapsePerKm, (v) => `air cools ${v.toFixed(1)} °C/km`, (v) => { env.lapsePerKm = v; paint(); }, 'env').node);
  }
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};
