// Lesson 20, Barnacles above the tide: a subduction zone whose plates are
// locked, played through centuries of squeezing and then the earthquake,
// with three places marked (an island near the trench, a coast town, a town
// inland) that rise or sink; and minutes after it, the tsunami leaving the
// raised sea floor. Plus a still of how a barnacle line measures uplift.

import { svg } from 'didactics/dom';
import { arrow, line, note, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, player, slider } from './kit';

const W = 400;

/** Years of squeezing before the earthquake. */
export const CYCLE = 300;

/** Height change of the ground in the earthquake, metres, at `km` from the trench (Alaska 1964 in shape and size, simplified). */
export function coseismic(km: number): number {
  return 9 * Math.exp(-(((km - 110) / 55) ** 2)) - 2.2 * Math.exp(-(((km - 230) / 70) ** 2));
}

/** Height change at `km` after `years` of the cycle; the squeezing between earthquakes undoes the jump, slowly. */
export function uplift(km: number, years: number): number {
  // At the end of the cycle the earthquake gives it all back.
  return years < CYCLE ? -coseismic(km) * (years / CYCLE) : 0;
}

export const PLACES = [
  { name: 'island', km: 120 },
  { name: 'coast town', km: 225 },
  { name: 'inland town', km: 360 },
] as const;

export const megathrustFigure = figure(['wave'], (ctx, t) => {
  const H = 260;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  f.svg.setAttribute('aria-label', 'A cross-section of a subduction zone: an ocean plate sinks under a continent at a trench on the left. An island stands near the trench, a coast town further in, and a town inland. Over centuries the locked edge of the continent is dragged down near the trench and bulges up inland; in the earthquake it springs back, lifting the island and the sea floor and dropping the coast town, and a tsunami spreads from the raised sea.');
  let years = 0;
  let minutes = 0;
  let quaked = false;
  const KMX = W / 420; // px per km
  const SEA = 120;
  const MPX = 4; // px per metre of uplift, exaggerated
  /** Ground height before any of this, metres, as a sketch: deep sea floor, the island, the coast, hills. */
  const base = (km: number) => {
    if (km < 0) return -5000;
    const island = 420 * Math.exp(-(((km - 120) / 11) ** 2));
    if (km < 110) return -5000 + 4850 * (km / 110) ** 1.5 + island;
    if (km < 210) return -150 + island;
    return 20 + (km - 210) * 3;
  };
  const yOf = (m: number) => SEA - (m >= 0 ? m / 25 : m / 120);
  const paint = () => {
    const now = quaked ? CYCLE : years;
    const parts: (SVGElement | null)[] = [svg('rect', { width: W, height: H, fill: '#e6eef3' })];
    // The ocean plate, sinking under the continent.
    parts.push(svg('polygon', { points: `0,${yOf(-5000) + 4} ${30 * KMX},${yOf(-5000) + 4} ${W},${H - 10} ${W},${H} 0,${H}`, fill: '#5d5f6e' }));
    // The sea, with the tsunami on it after the quake.
    const waveAt = (km: number) => {
      if (!quaked || minutes === 0) return 0;
      const speed = 3.6; // km per minute: about 220 m/s in 4 km of water
      const out = minutes * speed;
      const lift = coseismic(Math.max(60, Math.min(200, km)));
      const seaward = Math.exp(-(((km - (110 - out)) / 30) ** 2));
      const landward = Math.exp(-(((km - (110 + out * 0.5)) / 22) ** 2));
      return lift * 0.5 * (seaward + landward) * (km < 205 ? 1 : 0);
    };
    const sea: string[] = [];
    for (let km = 0; km <= 215; km += 2) {
      const h = !quaked || minutes > 0 ? waveAt(km) : Math.max(0, coseismic(km)) * (km < 205 ? 1 : 0);
      sea.push(`${(km * KMX).toFixed(1)},${(SEA - h * MPX).toFixed(1)}`);
    }
    parts.push(svg('polygon', { points: `0,${H} ${sea.join(' ')} ${215 * KMX},${H}`, fill: COL.water, opacity: 0.45 }));
    // The continent's edge, moved by the cycle.
    const ground: string[] = [];
    for (let km = 0; km <= 420; km += 3) {
      ground.push(`${(km * KMX).toFixed(1)},${(yOf(base(km)) - uplift(km, now) * MPX).toFixed(1)}`);
    }
    parts.push(svg('polygon', { points: `${20 * KMX},${H} ${ground.slice(7).join(' ')} ${W},${H}`, fill: '#b19b80' }));
    parts.push(small(W - 8, H - 30, 'continent', { anchor: 'end', bold: true, fill: COL.paper }));
    parts.push(line(14 * KMX, yOf(-5000) - 6, 60 * KMX, yOf(-3800), COL.heat, 2.5));
    parts.push(small(4, yOf(-5000) - 10, 'trench', { soft: true }));
    // The ocean plate again, over the continent's lower edge: the continent ends at the fault, and the plate is under it.
    const [ex, ey, cx, cy] = [300 * KMX, H - 30, 150 * KMX, yOf(-4000) + 16];
    const endY = ey + ((ey - cy) / (ex - cx)) * (W - ex);
    parts.push(svg('path', { d: `M0,${yOf(-5000) + 4} L${20 * KMX},${yOf(-5000)} Q${cx},${cy} ${ex},${ey} L${W},${endY} L${W},${H} L0,${H} Z`, fill: '#5d5f6e' }));
    parts.push(small(8, H - 14, 'ocean plate, sinking', { fill: COL.paper, bold: true }));
    parts.push(svg('path', { d: `M${20 * KMX},${yOf(-5000)} Q${cx},${cy} ${ex},${ey} L${W},${endY}`, fill: 'none', stroke: COL.heat, 'stroke-width': 2, 'stroke-dasharray': quaked ? '0' : '5 4' }));
    parts.push(small(140 * KMX, yOf(-4000) + 12, quaked ? 'the fault slipped' : 'locked: the plates are stuck here', { anchor: 'middle', fill: COL.heat, bold: true }));
    // The places and how far each has moved.
    for (const p of PLACES) {
      const x = p.km * KMX;
      const y = yOf(base(p.km)) - uplift(p.km, now) * MPX;
      const dz = quaked ? coseismic(p.km) : uplift(p.km, now);
      parts.push(svg('circle', { cx: x, cy: y - 3, r: 3.5, fill: COL.ink }));
      parts.push(small(x, y - 12, p.name, { anchor: 'middle', bold: true, halo: '#e6eef3' }));
      if (Math.abs(dz) > 0.05) parts.push(small(x, y - 24, `${dz > 0 ? '+' : ''}${dz.toFixed(1)} m`, { anchor: 'middle', fill: dz > 0 ? COL.good : COL.bad, bold: true, halo: '#e6eef3' }));
    }
    if (!quaked && years > 0) parts.push(arrow(30, 40, 80, 40, COL.soft, 1.6), small(30, 32, 'the ocean plate keeps moving', { soft: true }));
    parts.push(note(W - 8, 18, quaked ? (minutes ? `${minutes} minutes after the earthquake` : 'the earthquake') : `${Math.round(years)} years since the last earthquake`, { anchor: 'end', bold: true }));
    redraw(g, ...parts);
    if (!isOpen()) return;
    const [isl, coast] = PLACES.map((p) => uplift(p.km, now));
    const inland = coseismic(PLACES[2].km);
    f.readout.textContent = !quaked
      ? years === 0
        ? 'Just after an earthquake. The plates are locked again. Play the centuries. (Heights are exaggerated.)'
        : `Year ${Math.round(years)}. The sinking plate drags the stuck edge of the continent down with it: the island has sunk ${(-isl).toFixed(1)} m, while the squeezed crust bulges up behind it, and the coast town has risen ${coast.toFixed(1)} m. Nobody notices; it is a few millimetres a year.`
      : minutes === 0
        ? `The fault lets go and the edge springs back in minutes. The island jumps up ${coseismic(PLACES[0].km).toFixed(1)} m and the sea floor around it rises too, lifting the sea above it. The coast town drops ${(-coseismic(PLACES[1].km)).toFixed(1)} m, and the sea floods in. The inland town barely moves (${inland.toFixed(1)} m). Now play the minutes after.`
        : `${minutes} minutes later. The sea that was lifted runs off in both directions as a tsunami, racing out across the deep ocean at about 800 km an hour and in toward the coast, which has just dropped to meet it.`;
    if (quaked && minutes >= 20 && t.goal === 'wave') t.done();
  };
  const ys = slider('Years', 0, CYCLE, 1, 0, (v) => (v >= CYCLE ? 'the earthquake' : `${v}`), (v) => {
    years = v;
    if (v >= CYCLE && !quaked) {
      quaked = true;
      ms.input.disabled = false;
    }
    if (v < CYCLE) {
      quaked = false;
      minutes = 0;
      ms.set(0);
      ms.input.disabled = true;
    }
    paint();
  }, 'old');
  const ms = slider('Minutes after the earthquake', 0, 30, 1, 0, (v) => `${v}`, (v) => { minutes = v; paint(); }, 'water');
  ms.input.disabled = true;
  const isOpen = guessFirst(t, f, {
    ask: 'The plates under this coast have been locked for 300 years. When the earthquake comes, will the coast town go up or down? Guess first.',
    options: ['Up', 'Down', 'Neither'],
    answer: 1, reveal: 'done',
    sliders: [ys],
    after: () => paint(),
  });
  f.controls.append(player(ys, ctx, { seconds: 10 }).node, ys.node, player(ms, ctx, { seconds: 8 }).node, ms.node);
  paint();
  return f.node;
});

// ---- The barnacle line: a still -----------------------------------------------------------------

export const barnacleStill = () => {
  const { node, svg: s } = still(W, 200);
  const panel = (x0: number, title: string, lift: number): SVGElement[] => {
    const w = 180;
    const hi = 70;
    const lo = 120;
    const out: SVGElement[] = [
      svg('rect', { x: x0, y: 20, width: w, height: 150, fill: '#e6eef3' }),
      svg('rect', { x: x0, y: hi + 10, width: w, height: 150 - hi + 10, fill: COL.water, opacity: 0.18 }),
      svg('polygon', { points: `${x0 + 70},20 ${x0 + w},20 ${x0 + w},170 ${x0 + 40},170`, fill: '#8e8378' }),
      line(x0, hi + 10, x0 + w, hi + 10, COL.water, 1.2, { 'stroke-dasharray': '4 3' }),
      line(x0, lo, x0 + w, lo, COL.water, 1.2, { 'stroke-dasharray': '4 3' }),
      small(x0 + 4, hi + 6, 'high tide', { fill: COL.water }),
      small(x0 + 4, lo - 4, 'low tide', { fill: COL.water }),
    ];
    const top = hi + 10 - lift;
    out.push(svg('rect', { x: x0 + 60, y: top, width: 14, height: 22, fill: lift ? '#f3efe6' : '#d8cfb8', stroke: COL.soft, 'stroke-width': 0.6 }));
    out.push(small(x0 + 80, top + 10, lift ? 'barnacles, dead and bleached' : 'barnacles live here', { bold: true }));
    if (lift) {
      out.push(arrow(x0 + 150, hi + 10, x0 + 150, top + 2, COL.good, 1.6));
      out.push(small(x0 + 154, (hi + 10 + top) / 2 + 3, 'uplift', { fill: COL.good, bold: true }));
    }
    out.push(note(x0 + w / 2, 190, title, { anchor: 'middle', bold: true }));
    return out;
  };
  s.append(svg('rect', { width: W, height: 200, fill: COL.paper }), ...panel(10, 'Before the earthquake', 0), ...panel(210, 'After: the top of the band, lifted', 34));
  s.setAttribute('aria-label', 'Two panels of a rocky shore. Before: a band of barnacles grows on the rock just below high tide. After the earthquake: the whole rock has been lifted, and the band of dead white barnacles stands above the new high tide; the height of its top above where barnacles now grow measures the uplift.');
  return { node };
};
