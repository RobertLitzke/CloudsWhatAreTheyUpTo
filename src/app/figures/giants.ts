// Figures about the vertical giants and the rare ones: a thunderstorm's life,
// counting the seconds to the thunder, standing waves over a ridge, wind-shear
// billows, and mammatus pouches under an anvil.

import { strikeKm } from '../../core/sky';
import { svg } from '../dom';
import { heapAt } from './air';
import { COL, animate, frame, label, line, redraw, slider, task, type FigureFactory } from './kit';

// ---- A thunderstorm's life ------------------------------------------------------

export const stormFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 270;
  const f = frame(W, H);
  const t = task();
  const ground = 246;
  const tropo = 40;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#dfe7f0' }),
    line(0, tropo, W, tropo, COL.env, 1, { 'stroke-dasharray': '6 4' }),
    label(W - 6, tropo - 5, 'tropopause: the ceiling of the weather', { 'text-anchor': 'end', fill: COL.env, class: 'fig-label small' }),
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
        svg('polygon', { points: `${cx - 40},${tropo + 18} ${cx - 40 - anvil * 0.4},${tropo + 4} ${cx + 40 + anvil},${tropo} ${cx + 40},${tropo + 22}`, fill: '#fff', stroke: COL.cloudShade }),
        svg('circle', { cx, cy: tropo - 2, r: 10, fill: '#fff', stroke: COL.cloudShade }),
        up(cx - 20, baseY + 30, tropo + 40),
        down(cx + 22, baseY - 60, ground - 6),
        ...Array.from({ length: 8 }, (_, i) => line(cx + 6 + i * 6, baseY + 4, cx + 2 + i * 6, ground, COL.rain, 1.4, { opacity: 0.8 })),
      );
      const gust = 40 + k * 120;
      parts.push(
        svg('path', { d: `M${cx + 30},${ground} q${gust / 2},-26 ${gust},0`, fill: 'none', stroke: COL.ice, 'stroke-width': 2, 'stroke-dasharray': '4 3' }),
        label(cx + 30 + gust, ground - 6, 'gust front', { fill: COL.ice, class: 'fig-label small' }),
      );
      if (min > 22 && min < 30) parts.push(svg('polyline', { points: `${cx - 10},${baseY + 6} ${cx - 20},${baseY + 26} ${cx - 8},${baseY + 26} ${cx - 22},${ground}`, fill: 'none', stroke: COL.sun, 'stroke-width': 3 }));
    } else {
      stage = 'Dissipating stage: the cold downdraft has cut off the warm air feeding it. Rain thins out and the tower collapses, leaving the anvil drifting on alone.';
      const k = (min - 40) / 20;
      parts.push(
        svg('g', { opacity: 1 - k * 0.7 }, heapAt(cx, baseY + 10, 40, 80 - k * 50)),
        svg('polygon', { points: `${cx - 50 + k * 40},${tropo + 18} ${cx - 90 + k * 40},${tropo + 4} ${cx + 160 + k * 30},${tropo} ${cx + 60 + k * 40},${tropo + 22}`, fill: '#fff', stroke: COL.cloudShade, opacity: 0.95 }),
        down(cx, baseY - 30, ground - 6),
        ...Array.from({ length: 4 }, (_, i) => line(cx - 10 + i * 8, baseY + 14, cx - 14 + i * 8, ground, COL.rain, 1.2, { opacity: 0.6 - k * 0.5 })),
      );
    }
    redraw(g, ...parts);
    f.readout.textContent = `${min} minutes. ${stage}`;
    if (goal === 'end' && min >= 50) t.resolve();
  };
  f.controls.append(slider('Time', 0, 60, 1, 0, (v) => `${v} min`, paint, 'ink').node);
  paint(0);
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- Flash, then bang ------------------------------------------------------------

export const flashFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H);
  const t = task();
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
      label(you, ground + 16, 'you', { 'text-anchor': 'middle', fill: '#fff', class: 'fig-label small' }),
      label(sx, 24, `storm · ${km} km away`, { 'text-anchor': 'middle', fill: '#fff', class: 'fig-label small' }),
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
      f.readout.textContent = `Boom: ${s} seconds. Sound covers about a kilometre every three seconds, so the strike was about ${strikeKm(s).toFixed(1)} km away.` +
        (s <= 30 ? ' Thirty seconds or less: you are within reach of the next strike. Get inside, and wait 30 minutes after the last thunder.' : ' Far enough for now, but storms move quickly.');
      if (goal === 'strike') t.resolve();
    } else f.readout.textContent = `Counting: ${Math.floor(since)}…`;
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
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- Waves over a ridge -----------------------------------------------------------

export const waveFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H);
  const t = task();
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
      parts.push(svg('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.ice, 'stroke-width': 1.2, opacity: 0.6 }));
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
      label(W - 6, condY + 12, 'condensation level', { 'text-anchor': 'end', fill: COL.dew, class: 'fig-label small' }),
      svg('polygon', { points: `0,${H} ${tp.map((p) => p.join(',')).join(' ')} ${W},${H}`, fill: COL.ground }),
    );
    redraw(g, ...parts);
    f.readout.textContent = lenses
      ? `Lenticular clouds: the air bobs up and down in standing waves downwind of the ridge, and where it rises above its condensation level a smooth lens forms. The air streams through it, but the cloud stays put.`
      : 'Air flowing over the ridge bobs in waves downwind of it. Lower the condensation level (more moisture) or strengthen the wind until the crests turn to cloud.';
    if (goal === 'lens' && lenses > 0) t.resolve();
  };
  f.controls.append(
    slider('Wind', 0, 1, 0.01, wind, (v) => (v < 0.35 ? 'light' : v < 0.7 ? 'strong' : 'gale'), (v) => { wind = v; paint(); }, 'ice').node,
    slider('Moisture', 0, 1, 0.01, level, (v) => (v < 0.35 ? 'dry' : v < 0.7 ? 'moist' : 'very moist'), (v) => { level = v; paint(); }, 'dew').node,
  );
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- Kelvin-Helmholtz billows ---------------------------------------------------

export const billowFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H);
  const t = task();
  let shear = 0.2;
  let phase = 0;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: 100, fill: '#88b6dc' }), svg('rect', { x: 0, y: 100, width: W, height: 100, fill: '#a9c9e4' }), g);
  animate(f.node, ctx, (dt) => {
    phase += dt * (0.4 + shear);
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
      svg('g', { opacity: 0.7 }, line(10, 30, 10 + 40 + shear * 60, 30, '#fff', 2), label(16, 22, 'fast air above', { fill: '#fff', class: 'fig-label small' })),
      svg('g', { opacity: 0.7 }, line(10, 170, 40, 170, '#fff', 2), label(16, 162, 'slow air below', { fill: '#fff', class: 'fig-label small' })),
    );
    redraw(g, ...parts);
  });
  const paint = () => {
    f.readout.textContent = shear < 0.3
      ? 'Two layers sliding past each other slowly: the top of the cloud layer stays smooth.'
      : shear < 0.6
        ? 'The faster upper air drags waves into the top of the layer.'
        : 'Kelvin-Helmholtz billows (fluctus): the waves curl over like breakers. They last only minutes, and they mark turbulence pilots avoid.';
    if (goal === 'curl' && shear >= 0.6) t.resolve();
  };
  f.controls.append(slider('Difference in wind', 0, 1, 0.01, shear, (v) => (v < 0.3 ? 'small' : v < 0.6 ? 'large' : 'very large'), (v) => { shear = v; paint(); }, 'ice').node);
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- Mammatus --------------------------------------------------------------------

export const mammaFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 180;
  const f = frame(W, H);
  const t = task();
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#e9b48f' }), g);
  const paint = (sink: number) => {
    const parts: SVGElement[] = [svg('rect', { x: 0, y: 0, width: W, height: 60, fill: '#8f6f8e' })];
    for (let i = 0; i < 12; i++) {
      const cx = 18 + i * 34 + (i % 2) * 6;
      const r = 10 + sink * 10;
      parts.push(svg('ellipse', { cx, cy: 58 + sink * 14, rx: r + 4, ry: 6 + sink * 22, fill: '#a07c98' }));
      parts.push(svg('ellipse', { cx: cx - 3, cy: 56 + sink * 10, rx: r, ry: 3 + sink * 14, fill: '#b98fa8', opacity: 0.8 }));
    }
    redraw(g, ...parts);
    f.readout.textContent = sink < 0.3
      ? 'The underside of an anvil, smooth while little is happening.'
      : 'Mammatus: pockets of cold, cloudy air sinking out of the anvil’s base, like an upside-down cumulus. They look ominous and often follow a strong storm, but they are a sign of its passing, not of a new one.';
    if (goal === 'pouches' && sink >= 0.6) t.resolve();
  };
  f.controls.append(slider('Sinking air', 0, 1, 0.01, 0.1, (v) => (v < 0.3 ? 'little' : v < 0.6 ? 'some' : 'a lot'), paint, 'ice').node);
  paint(0.1);
  return { node: f.node, done: goal ? t.promise : undefined };
};
