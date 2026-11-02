// Lesson 19, Why some volcanoes explode: magma rising up a conduit, where
// the water dissolved in it comes out as bubbles as the pressure falls, and
// how sticky the melt is decides whether the gas leaves quietly or tears the
// foam into ash; and an eruption column that either rises as a plume or, too
// heavy for its speed, falls back and pours down the mountain as a
// pyroclastic flow.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, player, slider } from './kit';

const W = 400;

// ---- The conduit -----------------------------------------------------------------------------

/** Pressure in the crust, MPa, at `km` depth (rock about 2,500 kg/m³). */
const pressureAt = (km: number) => Math.max(0.1, 24.5 * km);
/** How much water (weight %) melt can hold dissolved at `mpa`. */
export const solubility = (mpa: number) => 0.41 * Math.sqrt(mpa);
/** log10 of the melt's viscosity, Pa s, from its silica (weight %): about 10² for basalt, 10⁸ for rhyolite. */
export const logViscosity = (silica: number) => 2 + (silica - 50) * 0.24;
/** Below this viscosity bubbles can rise through the melt and leave it. */
const ESCAPE = 4;
/** A foam this full of gas breaks into shreds and ash. */
export const FRAGMENTS = 0.75;

/** Share of the volume that is gas, at `km` depth, for magma holding `water` weight % (none escaping). */
export function gasShare(water: number, km: number): number {
  const p = pressureAt(km);
  const x = Math.max(0, water - solubility(p)) / 100;
  if (x <= 0) return 0;
  const gas = x / (p * 1.81); // steam at about 1,000 °C
  const melt = (1 - x) / 2400;
  return gas / (gas + melt);
}

export type Outcome = 'fountain' | 'dome' | 'explosion';

/** What reaches the surface, and the depth (km) where the foam breaks apart, if it does. */
export function erupt(silica: number, water: number): { outcome: Outcome; breaks?: number } {
  if (logViscosity(silica) < ESCAPE) return { outcome: 'fountain' };
  for (let km = 8; km >= 0; km -= 0.01) {
    if (gasShare(water, km) >= FRAGMENTS) return km > 0.2 ? { outcome: 'explosion', breaks: km } : { outcome: 'dome' };
  }
  return { outcome: 'dome' };
}

export const conduitFigure = figure(['both'], (ctx, t) => {
  const H = 270;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A cross-section of a volcano with a conduit running down 8 km to the magma below. A batch of magma rises; bubbles appear in it and grow as it nears the surface. Beside it, a graph of how much of the magma is gas at each depth, with a line at 75% where the foam breaks apart.');
  let silica = 75;
  let water = 6;
  let rise = 0; // 0: at 8 km, 100: at the surface
  const seen = { quiet: false, explosive: false };
  const TOP = 60;
  const BOT = 250;
  const KMPX = (BOT - TOP) / 8;
  const CX = 130;
  const paint = () => {
    const depth = 8 * (1 - rise / 100);
    const res = erupt(silica, water);
    const sticky = logViscosity(silica) >= ESCAPE;
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: H, fill: '#eef2f4' }),
      svg('polygon', { points: `0,${TOP + 10} ${CX - 22},${TOP} ${CX + 22},${TOP} 260,${TOP + 10} 260,${H} 0,${H}`, fill: '#a8968a' }),
      svg('rect', { x: CX - 9, y: TOP, width: 18, height: BOT - TOP, fill: '#6d5f57' }),
      svg('ellipse', { cx: CX, cy: BOT + 12, rx: 70, ry: 14, fill: COL.heat, opacity: 0.85 }),
      small(CX, BOT + 16, 'magma chamber', { anchor: 'middle', fill: COL.paper, bold: true }),
    ];
    for (let km = 0; km <= 8; km += 2) parts.push(small(CX - 14, TOP + km * KMPX + (km ? 3 : 12), `${km} km`, { anchor: 'end', fill: km ? COL.paper : COL.ink }));
    // The magma column up to the rising batch.
    const yTop = TOP + depth * KMPX;
    parts.push(svg('rect', { x: CX - 8, y: yTop, width: 16, height: BOT - yTop, fill: COL.heat, opacity: 0.9 }));
    for (let km = depth; km <= 8; km += 0.18) {
      const y = TOP + km * KMPX;
      const share = sticky ? gasShare(water, km) : Math.min(0.25, gasShare(water, km));
      if (res.breaks !== undefined && km < res.breaks) {
        for (let k = 0; k < 4; k++) parts.push(svg('circle', { cx: CX - 6 + ((k * 5 + km * 37) % 12), cy: y + k, r: 1.2, fill: COL.glass }));
        continue;
      }
      if (share > 0.01) {
        const r = Math.min(5, 1 + share * 5);
        const n = Math.ceil(share * 4);
        for (let k = 0; k < n; k++) parts.push(svg('circle', { cx: CX - 5 + ((k * 7 + km * 23) % 10), cy: y, r, fill: '#f6efe2', opacity: 0.85 }));
      }
    }
    // At the top: what comes out.
    if (rise >= 100) {
      if (res.outcome === 'fountain') {
        parts.push(svg('path', { d: `M${CX},${TOP} q-10,-30 -26,-34 M${CX},${TOP} q0,-36 4,-44 M${CX},${TOP} q10,-30 26,-34`, fill: 'none', stroke: COL.heat, 'stroke-width': 3, 'stroke-linecap': 'round' }));
        parts.push(svg('path', { d: `M${CX + 20},${TOP + 2} q40,4 90,12`, fill: 'none', stroke: COL.heat, 'stroke-width': 4 }));
      } else if (res.outcome === 'dome') {
        parts.push(svg('ellipse', { cx: CX, cy: TOP, rx: 26, ry: 14, fill: '#5c4f49' }));
      } else {
        for (let k = 0; k < 9; k++) parts.push(svg('circle', { cx: CX + Math.sin(k * 1.7) * (8 + k * 3), cy: TOP - 8 - k * 6, r: 8 + k * 1.6, fill: '#7d7570', opacity: 0.7 }));
      }
    }
    // The graph: gas share against depth.
    const gx = 280;
    const gw = 108;
    parts.push(
      line(gx, TOP, gx, BOT, COL.soft, 1),
      line(gx, BOT, gx + gw, BOT, COL.soft, 1),
      small(gx + gw / 2, BOT + 14, 'gas, % of the volume', { anchor: 'middle', soft: true }),
      line(gx + FRAGMENTS * gw, TOP, gx + FRAGMENTS * gw, BOT, COL.bad, 1, { 'stroke-dasharray': '4 3' }),
      small(gx + FRAGMENTS * gw - 2, TOP - 4, 'foam breaks', { anchor: 'middle', fill: COL.bad }),
      small(gx + 3, BOT - 4, '0', { soft: true }),
      small(gx + gw, BOT - 4, '100', { anchor: 'end', soft: true }),
    );
    const pts: string[] = [];
    for (let km = 8; km >= depth; km -= 0.05) {
      const share = sticky ? gasShare(water, km) : Math.min(0.25, gasShare(water, km));
      pts.push(`${(gx + share * gw).toFixed(1)},${(TOP + km * KMPX).toFixed(1)}`);
    }
    if (pts.length > 1) parts.push(svg('polyline', { points: pts.join(' '), fill: 'none', stroke: COL.heat, 'stroke-width': 2 }));
    const honey = 10 ** Math.round(logViscosity(silica) - 1);
    const times = honey >= 1e6 ? `${honey / 1e6} million` : honey >= 1e3 ? `${(honey).toLocaleString('en-GB')}` : `${honey}`;
    parts.push(note(8, 18, `Silica ${silica}%: ${logViscosity(silica) < 3 ? 'runny' : logViscosity(silica) < ESCAPE ? 'thick' : logViscosity(silica) < 7 ? 'sticky' : 'very stiff'}, about ${times} times as thick as honey`, { bold: true }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    const share = gasShare(water, depth);
    if (rise < 100) {
      f.readout.textContent = share < 0.005
        ? `${depth.toFixed(1)} km down, the pressure is high enough to keep all ${water}% of the water dissolved in the melt, the way the gas stays dissolved in an unopened bottle of soda.`
        : sticky
          ? `${depth.toFixed(1)} km down, water is coming out of the melt as bubbles, and in such sticky melt they cannot rise out of it: they stay where they are and grow as the pressure drops. ${Math.round(share * 100)}% of the magma is now gas.${res.breaks !== undefined && depth < res.breaks ? ' The foam has broken apart into shreds of melt and gas, rushing upward faster and faster.' : ''}`
          : `${depth.toFixed(1)} km down, bubbles are forming, and in this runny melt they rise through it and gather, so the gas can find its way out ahead of the magma.`;
      return;
    }
    f.readout.textContent = res.outcome === 'fountain'
      ? 'At the surface the gas escapes freely: fountains of glowing lava and lava flows, as on Kilauea in Hawaii. Dangerous close by, but you can walk away from it.'
      : res.outcome === 'dome'
        ? 'Sticky but nearly dry: the little gas there is seeps away, and the stiff lava squeezes out to pile into a dome over the vent, as at Mont Pelée in 1902. A dome can still collapse.'
        : `Explosion. The foam broke apart ${(res.breaks! * 1000).toFixed(0)} m down, and gas expanding about a thousand times over blasted the shreds out as ash, as at Pinatubo in 1991.`;
    if (res.outcome === 'explosion') seen.explosive = true;
    else seen.quiet = true;
    if (seen.quiet && seen.explosive && t.goal === 'both') t.done();
  };
  const ss = slider('Silica', 48, 77, 1, silica, (v) => `${v}%`, (v) => { silica = v; paint(); }, 'crystal');
  const ws = slider('Water dissolved', 0.5, 7, 0.5, water, (v) => `${v}%`, (v) => { water = v; paint(); }, 'water');
  const rs = slider('Magma rises', 0, 100, 1, 0, (v) => (v >= 100 ? 'at the surface' : `${(8 * (1 - v / 100)).toFixed(1)} km down`), (v) => { rise = v; paint(); }, 'heat');
  const isOpen = guessFirst(t, f, {
    ask: 'This is magma like Pinatubo’s in 1991: sticky, with 75% silica in its melt, and 6% water dissolved in it under pressure. As it rises toward the surface, what happens to the water? Guess first.',
    options: ['It comes out as bubbles that rise out of the magma and escape quietly', 'It comes out as bubbles that stay trapped and tear the magma apart', 'It stays dissolved all the way to the surface'],
    answer: 1, reveal: 'done',
    sliders: [ss, ws, rs],
    after: () => paint(),
  });
  f.controls.append(ss.node, ws.node, player(rs, ctx, { seconds: 10 }).node, rs.node);
  paint();
  return f.node;
});

// ---- Plume or flow -----------------------------------------------------------------------------

/** Speed of the gas and ash leaving the vent, m/s, for magma with `water` weight %. */
export const ventSpeed = (water: number) => 180 * Math.sqrt(water);
/** Speed a jet from a vent `radius` metres across needs to draw in enough air to rise, m/s. */
export const speedNeeded = (radius: number) => 150 * Math.sqrt(radius / 40);
export const collapses = (water: number, radius: number) => ventSpeed(water) < speedNeeded(radius);

export const columnFigure = figure(['collapsed'], (_ctx, t) => {
  const H = 260;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A volcano with an eruption jet rising from its summit. Either the jet mixes in air, turns buoyant and climbs as a tall plume that spreads into an umbrella, or it runs out of upward speed, falls back around the vent, and pours down the slopes as a ground-hugging flow toward a town at the foot.');
  let water = 5;
  let radius = 60;
  const paint = () => {
    const falls = collapses(water, radius);
    const vx = 200;
    const vy = 180;
    const jw = 4 + radius / 18;
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: H, fill: '#dfe8ef' }),
      svg('polygon', { points: `0,250 120,232 ${vx - jw},${vy} ${vx + jw},${vy} 300,236 ${W},248 ${W},${H} 0,${H}`, fill: '#8e7f74' }),
      svg('rect', { x: 340, y: 236, width: 8, height: 10, fill: '#c8b8a2' }),
      svg('rect', { x: 352, y: 238, width: 8, height: 9, fill: '#c8b8a2' }),
      svg('rect', { x: 364, y: 236, width: 7, height: 11, fill: '#c8b8a2' }),
      small(356, 230, 'town', { anchor: 'middle', soft: true }),
    ];
    if (!falls) {
      parts.push(svg('polygon', { points: `${vx - jw},${vy} ${vx + jw},${vy} ${vx + 26},70 ${vx - 26},70`, fill: '#7d7570', opacity: 0.85 }));
      parts.push(svg('ellipse', { cx: vx + 30, cy: 52, rx: 120, ry: 24, fill: '#7d7570', opacity: 0.75 }));
      parts.push(small(vx + 30, 22, 'a plume: buoyant, rising 20–40 km', { anchor: 'middle', bold: true }));
    } else {
      parts.push(svg('polygon', { points: `${vx - jw},${vy} ${vx + jw},${vy} ${vx + jw + 18},120 ${vx - jw - 18},120`, fill: '#7d7570', opacity: 0.85 }));
      for (const s of [-1, 1]) parts.push(svg('path', { d: `M${vx + s * (jw + 18)},120 q${s * 20},10 ${s * 26},50`, fill: 'none', stroke: '#7d7570', 'stroke-width': 10, opacity: 0.7, 'stroke-linecap': 'round' }));
      parts.push(svg('path', { d: `M${vx + 30},${vy + 4} C${vx + 70},${vy + 26} 300,234 ${W - 10},246`, fill: 'none', stroke: '#5f5753', 'stroke-width': 14, opacity: 0.8, 'stroke-linecap': 'round' }));
      parts.push(svg('path', { d: `M${vx - 30},${vy + 4} C${vx - 70},${vy + 26} 120,236 10,248`, fill: 'none', stroke: '#5f5753', 'stroke-width': 14, opacity: 0.8, 'stroke-linecap': 'round' }));
      parts.push(small(vx, 106, 'the column falls back', { anchor: 'middle', bold: true, fill: COL.bad }));
      parts.push(small(310, 204, 'pyroclastic flow', { anchor: 'middle', bold: true, fill: COL.bad }));
    }
    redraw(g, ...parts);
    if (!isOpen()) return;
    const v = ventSpeed(water);
    const need = speedNeeded(radius);
    f.readout.textContent = falls
      ? `Gas and ash leave the vent at about ${Math.round(v)} m/s, but a jet this wide needs ${Math.round(need)} m/s to draw in enough air before it slows. It runs out of speed while still heavier than air, falls back, and pours down the slopes as a pyroclastic flow, faster than anyone can run.`
      : `Gas and ash leave at about ${Math.round(v)} m/s, more than the ${Math.round(need)} m/s a vent ${radius} m across needs. The jet draws in air, the air heats and expands, and the whole mixture turns lighter than the air around it and climbs as a plume.`;
    if (falls && t.goal === 'collapsed') t.done();
  };
  const ws = slider('Water in the magma', 1, 7, 0.5, water, (v) => `${v}%`, (v) => { water = v; paint(); }, 'water');
  const rs = slider('Vent radius', 20, 600, 10, radius, (v) => `${v} m`, (v) => { radius = v; paint(); }, 'heat');
  const isOpen = guessFirst(t, f, {
    ask: 'An explosive eruption is throwing ash high above the volcano. Now the vent widens as its walls are blasted away, so far more ash pours out each second, while the gas in the magma stays the same. What happens to the column? Guess first.',
    options: ['It rises even higher', 'It falls back and pours down the mountain', 'Nothing changes'],
    answer: 1, reveal: 'done',
    sliders: [ws, rs],
    after: () => paint(),
  });
  f.controls.append(ws.node, rs.node);
  paint();
  return f.node;
});
