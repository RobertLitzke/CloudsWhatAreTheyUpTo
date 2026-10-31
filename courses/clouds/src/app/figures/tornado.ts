// Figures for tornadoes: a roll of air laid on its side by the wind changing
// with height, and stood up by a storm's updraft; a spinning column squeezed
// thinner and spinning faster, like a skater pulling in her arms; a supercell
// from the side with its wall cloud; its hook on the radar; and the scale
// tornadoes are rated on by the damage they do.

import { el, svg } from 'didactics/dom';
import { arrow, label, line, note, points, polyline, radarImage, radarKey, redraw, small, still, type P } from './draw';
import { COL, choices, figure, frame, lock, lockIn, slider, tint, type FigureFactory } from './kit';

const FIELD = '#a39150';

/** A circular arrow of radius r round (cx, cy), anticlockwise on the page when `dir` is 1. */
function spinArrow(cx: number, cy: number, r: number, dir: 1 | -1, color: string, width = 2, ry = r): SVGElement[] {
  const pts: P[] = [];
  for (let i = 0; i <= 30; i++) {
    const a = (dir === 1 ? -1 : 1) * (0.2 + (i / 30) * 1.6 * Math.PI);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry]);
  }
  const [x1, y1] = pts[pts.length - 1];
  const [x0, y0] = pts[pts.length - 3];
  const a = Math.atan2(y1 - y0, x1 - x0);
  const tip = (da: number): P => [x1 - Math.cos(a + da) * 7, y1 - Math.sin(a + da) * 7];
  return [polyline(pts, color, width), svg('polygon', { points: points([[x1, y1], tip(0.5), tip(-0.5)]), fill: color })];
}

// ---- The roll stood on end ------------------------------------------------------

export const shearRollFigure = figure(['spin'], (_ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 4);
  let shear = 10;
  let turn = 0;
  const g = svg('g');
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: 190, height: H, fill: COL.sky }),
    svg('rect', { x: 0, y: 200, width: 190, height: 40, fill: FIELD }),
    svg('rect', { x: 200, y: 0, width: 200, height: H, fill: '#eef0e6' }),
    note(6, 16, 'From the side', { bold: true }),
    note(206, 16, 'From above', { bold: true }),
    g,
  );
  const paint = () => {
    const streamwise = Math.sin((turn * Math.PI) / 180);
    const across = Math.cos((turn * Math.PI) / 180);
    const spin = shear * streamwise;
    const roll = Math.min(1, shear / 50);
    // From the side: wind faster with height, and the roll it makes.
    const side = [0, 1, 2].map((k) => {
      const y = 190 - k * 60;
      const len = 14 + (k * shear) / 2;
      return arrow(16, y, 16 + len, y, COL.ink, 1.6);
    });
    const rollSide = shear > 0 ? spinArrow(110, 150, 26, -1, COL.env, 1.5 + roll * 2.5) : [];
    // From above: the updraft, the inflow, the roll lying under it, and the spin the updraft takes up.
    const cx = 300;
    const cy = 130;
    const a = (turn * Math.PI) / 180;
    const rx = Math.cos(a) * 70;
    const ry = Math.sin(a) * 70;
    const parts: SVGElement[] = [
      svg('circle', { cx, cy, r: 30, fill: tint(COL.parcel, 0.2), stroke: COL.parcel, 'stroke-width': 1.5 }),
      small(cx, cy + 46, 'the updraft', { anchor: 'middle', fill: COL.warmInk, bold: true }),
      arrow(cx, 226, cx, 170, COL.ink, 2),
      small(cx + 6, 222, 'warm air flowing in', { soft: true }),
    ];
    if (shear > 0) {
      parts.push(line(cx - rx, cy + ry, cx + rx, cy - ry, COL.env, 4 + roll * 6, { opacity: 0.35, 'stroke-linecap': 'round' }));
      parts.push(small(cx + rx * 0.9 + 4, cy - ry * 0.9 - 8, 'the roll', rx > 30 ? { fill: COL.env, anchor: 'end' } : { fill: COL.env }));
      if (across > 0.25) {
        // Lifted across its length, the roll arches up: a pair of opposite spins on the updraft's flanks.
        const k = across * roll;
        parts.push(...spinArrow(cx - 46, cy, 10, 1, COL.env, 1 + k * 2.5), ...spinArrow(cx + 46, cy, 10, -1, COL.env, 1 + k * 2.5));
      }
      if (streamwise > 0.25) parts.push(...spinArrow(cx, cy, 20, 1, COL.red, 1 + streamwise * roll * 3.5));
    }
    redraw(g, ...side, ...rollSide,
      small(16, 64, shear ? 'faster up here' : 'the same at all heights', { soft: true }),
      ...(shear > 0 ? [small(110, 196, 'a roll of spinning air', { anchor: 'middle', fill: COL.env, bold: true })] : []),
      ...parts,
    );
    const what = shear === 0
      ? 'The wind is the same at every height: nothing rolls the air over, and nothing spins.'
      : streamwise < 0.25
        ? 'The roll lies across the warm inflow. The updraft lifts it in an arch, and its two legs spin opposite ways on either side of the updraft. The storm tends to split in two.'
        : streamwise > 0.9
          ? 'The wind turns as it climbs, so the roll lies along the warm inflow, and the updraft swallows it end on. Now the whole updraft spins, anticlockwise: a mesocyclone.'
          : 'The roll lies partly along the inflow: the updraft takes up some of its spin, and begins to turn.';
    f.readout.textContent = what;
    if (t.goal === 'spin' && spin >= 30) t.done();
  };
  f.controls.append(
    slider('Wind change near the ground', 0, 60, 5, shear, (v) => `${v} km/h`, (v) => { shear = v; paint(); }, 'ink').node,
    slider('How far the wind turns with height', 0, 90, 15, turn, (v) => `${v}°`, (v) => { turn = v; paint(); }, 'env').node,
  );
  paint();
  return f.node;
});

// ---- The skater -----------------------------------------------------------------

/** The spin of a column squeezed from 2 km across, where it turns at 5 m/s, to `m` across: the speed at its edge, m/s. */
export const squeezed = (m: number) => (5 * 2000) / m;

/** The Enhanced Fujita scale: estimated gust speeds, m/s, from the damage. */
export const EF: [string, number, string][] = [
  ['EF0', 29, 'shingles off, branches down'],
  ['EF1', 38, 'roofs peeled, mobile homes overturned'],
  ['EF2', 50, 'roofs off, big trees snapped'],
  ['EF3', 61, 'walls down, trains overturned'],
  ['EF4', 75, 'houses levelled'],
  ['EF5', 90, 'houses swept off their foundations'],
];
export function efRating(ms: number): string | null {
  let out: string | null = null;
  for (const [name, from] of EF) if (ms >= from) out = name;
  return out;
}

const SKATE_GUESSES = ['Spins at the same speed', 'Spins twice as fast', 'Spins four times as fast'] as const;
const SKATE_RIGHT = 1;

export const skaterFigure = figure(['tornado'], (_ctx, t) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 3);
  let width = 2000;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }), svg('rect', { x: 0, y: 196, width: W, height: 24, fill: FIELD }), g);
  const paint = () => {
    const v = squeezed(width);
    const px = 14 + (Math.log(width / 100) / Math.log(20)) * 110;
    const rating = efRating(v);
    // The column from the side: from the cloud base down to the ground, as wide as it is.
    const base = 40;
    const funnel = svg('path', { d: `M${160 - px},${base} C${160 - px * 0.7},${110} ${160 - px * 0.6},${170} ${160 - px * 0.55},196 L${160 + px * 0.55},196 C${160 + px * 0.6},${170} ${160 + px * 0.7},${110} ${160 + px},${base} Z`, fill: tint(COL.cloudShade, 0.6), stroke: COL.soft, 'stroke-width': 1 });
    const rings = [70, 120, 170].flatMap((y) => spinArrow(160, y, px * (0.75 - (y - 70) / 900), 1, COL.red, 1 + Math.min(4, v / 25), 6));
    redraw(g,
      svg('rect', { x: 0, y: 20, width: 320, height: 22, fill: '#8e8aa3' }),
      funnel,
      ...rings,
      note(310, 80, `${Math.round(width).toLocaleString()} m across`, { bold: true }),
      note(310, 100, `${Math.round(v)} m/s`, { bold: true, fill: COL.red }),
      note(310, 116, `(${Math.round(v * 3.6)} km/h)`, { soft: true }),
      note(310, 140, rating ? `${rating}-strength` : 'a breeze', { bold: true }),
    );
    if (asking) {
      f.readout.textContent = 'A spinning column under the storm, 2 km across, turning slowly: 5 m/s at its edge. The updraft stretches it upward, and squeezes it to half as wide. It…';
      return;
    }
    const verdict = pick.picked() < 0 || width !== 1000 ? '' : pick.picked() === SKATE_RIGHT ? 'As you guessed. ' : 'Not what you guessed. ';
    f.readout.textContent = `${verdict}Half as wide, twice as fast: a column squeezed thin keeps its spin, like a skater pulling in her arms. ${width <= 200 ? `At ${Math.round(width)} m across, the edge is moving at ${Math.round(v)} m/s: a tornado, ${rating ? `with ${rating} winds` : ''}. Near the ground, friction drags some of that back.` : `At ${Math.round(width).toLocaleString()} m across, ${Math.round(v)} m/s.`}`;
    if (t.goal === 'tornado' && !asking && v >= 50) t.done();
  };
  let asking = t.goal === 'tornado';
  const widthS = slider('Width of the spinning column', 100, 2000, 50, width, (v) => `${v.toLocaleString()} m`, (v) => { width = v; paint(); }, 'env');
  const pick = choices(SKATE_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Squeeze it', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([widthS], false);
    width = 1000;
    widthS.set(1000);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(widthS.node);
  lock([widthS], asking);
  if (asking && typeof t.kept === 'number' && SKATE_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- A supercell from the side ------------------------------------------------------

export const supercellDiagram: FigureFactory = () => {
  const W = 400;
  const H = 260;
  const d = still(W, H);
  const ground = 236;
  const base = 176;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.sky }),
    svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: FIELD }),
    // The anvil, blown off downwind (east, to the right), and the overshooting top.
    svg('path', { d: `M110,44 Q230,20 396,34 L396,52 Q250,46 150,64 Z`, fill: '#f4f2f8', stroke: COL.cloudShade }),
    svg('path', { d: `M80,${base} C70,120 100,50 150,40 C160,22 190,22 196,40 C240,52 260,120 270,${base} Z`, fill: '#ffffff', stroke: COL.cloudShade }),
    // Rain and hail under the forward part.
    ...Array.from({ length: 12 }, (_, i) => line(214 + i * 6, base + 2, 210 + i * 6, ground - 2, COL.rain, 1.4)),
    // The wall cloud and the tornado under the rain-free base.
    svg('path', { d: `M100,${base} L150,${base} L146,${base + 16} L104,${base + 16} Z`, fill: '#cfcadb', stroke: COL.cloudShade }),
    svg('path', { d: `M122,${base + 16} C124,${base + 30} 120,${base + 46} 124,${ground} L130,${ground} C130,${base + 46} 132,${base + 30} 130,${base + 16} Z`, fill: '#8e8aa3' }),
    arrow(20, ground - 10, 92, ground - 24, COL.parcel, 2.5),
    small(8, ground - 30, 'warm, damp air in', { fill: COL.warmInk, bold: true }),
    arrow(126, 120, 126, 60, COL.parcel, 3),
    ...[1].map(() => svg('ellipse', { cx: 126, cy: 110, rx: 24, ry: 7, fill: 'none', stroke: COL.red, 'stroke-width': 2 })),
    small(152, 108, 'rotating updraft', { fill: COL.red, bold: true, halo: '#fff' }),
    arrow(72, 100, 92, base - 6, COL.cold, 2),
    small(8, 92, 'rear downdraft', { fill: COL.coldInk, bold: true }),
    small(126, base + 12, 'wall cloud', { anchor: 'middle', bold: true }),
    small(127, ground + 16, 'tornado', { fill: '#fff', bold: true, anchor: 'middle' }),
    small(244, ground + 16, 'rain and hail', { fill: '#fff', bold: true, anchor: 'middle' }),
    small(176, 30, 'overshooting top', { anchor: 'middle', soft: true }),
    small(300, 26, 'anvil', { soft: true }),
    arrow(330, 90, 390, 90, COL.ink, 1.6),
    small(330, 84, 'storm moves', { soft: true }),
  );
  return { node: d.node };
};

// ---- The hook on the radar ---------------------------------------------------------

export const hookEchoDiagram: FigureFactory = () => {
  const W = 400;
  const H = 250;
  const d = still(W, H);
  const cx = 210;
  const cy = 120;
  // The storm's echo: a broad blob of rain to the north-east, and a hook of rain wrapped round the rotating updraft at its south-west corner.
  const dbz = (x: number, y: number) => {
    const dx = (x - cx) / 80;
    const dy = (y - cy) / 55;
    const body = 62 - 30 * (dx * dx + dy * dy);
    // The hook: an arc round a point south-west of the core.
    const hx = cx - 50;
    const hy = cy + 46;
    const r = Math.hypot(x - hx, y - hy);
    const ang = Math.atan2(y - hy, x - hx);
    const onArc = ang > -0.6 && ang < 2.6 ? Math.exp(-(((r - 30) / 10) ** 2)) : 0;
    const notch = Math.exp(-((r / 18) ** 2));
    return Math.max(body - 40 * notch, 56 * onArc - 60 * notch);
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#2a2547' }),
    radarImage(20, 10, 360, 200, 4, dbz),
    svg('circle', { cx: cx - 50, cy: cy + 46, r: 7, fill: 'none', stroke: '#fff', 'stroke-width': 2 }),
    small(cx - 62, cy + 80, 'the hook: rain wrapped', { halo: '#2a2547', fill: '#fff', anchor: 'end', bold: true }),
    small(cx - 62, cy + 92, 'round the rotating updraft', { halo: '#2a2547', fill: '#fff', anchor: 'end', bold: true }),
    small(cx - 38, cy + 50, 'tornado here', { halo: '#2a2547', fill: '#fff' }),
    small(cx + 70, cy - 64, 'heavy rain and hail', { halo: '#2a2547', fill: '#fff' }),
    radarKey(30, 228, 340),
  );
  return { node: d.node };
};

// ---- Rated by the damage -------------------------------------------------------------

export const efScaleDiagram: FigureFactory = () => {
  const W = 400;
  const H = 210;
  const d = still(W, H);
  const barX = 112;
  const barW = (ms: number) => ms * 1.3;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }),
    ...EF.flatMap(([name, from, damage], i) => {
      const y = 14 + i * 30;
      const to = EF[i + 1]?.[1] ?? 120;
      return [
        label(42, y + 14, name, { anchor: 'end', bold: true }),
        small(50, y + 14, `${Math.round(from * 3.6)}${EF[i + 1] ? `–${Math.round(to * 3.6) - 1}` : '+'}`, { bold: true }),
        svg('rect', { x: barX, y, width: barW(from), height: 20, rx: 3, fill: tint(COL.red, 0.25 + i * 0.13) }),
        small(barX + barW(from) + 4, y + 14, damage, { soft: true }),
      ];
    }),
    note(4, H - 6, 'Gusts in km/h, estimated from the damage, never measured.', { soft: true }),
  );
  return { node: d.node };
};

