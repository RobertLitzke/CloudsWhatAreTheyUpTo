// Figures for why wind blows round a storm: air pushed from high pressure to
// low across a map of isobars, a ball rolled across a turntable (the spinning
// Earth's deflection, seen from the ceiling and from on board), how much the
// ground turns under you at each latitude, the balance of push, turn and
// friction that sets the wind, a low and a high side by side, and the river of
// fast wind overhead that steers storms.

import { el, svg } from 'didactics/dom';
import { arrow, heading, label, line, note, points, polyline, redraw, small, still, type P } from './draw';
import { COL, choices, figure, frame, lock, lockIn, slider, tint, type FigureFactory } from './kit';

/** The land on a weather map. */
export const MAP = '#eef0e6';
export const SEA = '#dbe9f2';

/** An arrowhead at the end of a path, pointing along its last step. */
export function head(path: P[], color: string, size = 7): SVGElement {
  const [x1, y1] = path[path.length - 1];
  const [x0, y0] = path[Math.max(0, path.length - 4)];
  const a = Math.atan2(y1 - y0, x1 - x0);
  const pt = (da: number, r: number): P => [x1 - Math.cos(a + da) * r, y1 - Math.sin(a + da) * r];
  return svg('polygon', { points: points([[x1, y1], pt(0.45, size), pt(-0.45, size)]), fill: color });
}

/** A spiral of `turns` turns from radius r0 to r1 around (cx, cy); `dir` 1 runs anticlockwise on the page. */
function spiral(cx: number, cy: number, r0: number, r1: number, start: number, turns: number, dir: 1 | -1): P[] {
  const out: P[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const r = r0 + (r1 - r0) * k;
    const a = start - dir * k * turns * 2 * Math.PI;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

// ---- Air slides downhill: the pressure map ----------------------------------

export const pressureMapDiagram: FigureFactory = () => {
  const W = 400;
  const H = 230;
  const d = still(W, H);
  const L: P = [120, 112];
  const Hc: P = [318, 128];
  // Isobars: rings round the low, packed closer on its west side, and round the high.
  const rings: SVGElement[] = [];
  [24, 46, 70, 96].forEach((r, i) => {
    rings.push(svg('ellipse', { cx: L[0] + i * 4, cy: L[1], rx: r * 1.1, ry: r * 0.9, fill: 'none', stroke: COL.env, 'stroke-width': 1.2, opacity: 0.6 }));
    rings.push(small(L[0] + i * 4, L[1] - r * 0.9 + 3, `${992 + i * 4}`, { fill: COL.env, halo: MAP, anchor: 'middle' }));
  });
  [26, 52].forEach((r, i) => {
    rings.push(svg('ellipse', { cx: Hc[0], cy: Hc[1], rx: r * 1.3, ry: r, fill: 'none', stroke: COL.env, 'stroke-width': 1.2, opacity: 0.6 }));
    rings.push(small(Hc[0], Hc[1] - r + 3, `${1024 - i * 4}`, { fill: COL.env, halo: MAP, anchor: 'middle' }));
  });
  // The push: straight across the lines, from high towards low, harder where they are close.
  const pushes: [P, P, number][] = [[[262, 150], [200, 140], 2.4], [[250, 92], [206, 100], 2.4], [[34, 40], [62, 64], 3.6], [[22, 150], [52, 132], 3.6]];
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: MAP }),
    ...rings,
    label(L[0] - 6, L[1] + 6, 'L', { bold: true, fill: COL.red, attrs: { 'font-size': 18 } }),
    label(Hc[0] - 6, Hc[1] + 6, 'H', { bold: true, fill: COL.blue, attrs: { 'font-size': 18 } }),
    ...pushes.map(([a, b, w]) => arrow(a[0], a[1], b[0], b[1], COL.parcel, w)),
    note(8, 208, 'Lines join places with the same pressure (hPa). The push on the air', { soft: true }),
    note(8, 220, 'runs straight across them, high to low, hardest where they crowd.', { soft: true }),
    heading(300, 24, 'Air slides downhill'),
    note(300, 40, 'from high pressure to low', { anchor: 'middle', soft: true }),
  );
  return { node: d.node };
};

// ---- The turntable ----------------------------------------------------------

export const turntableFigure = figure(['curve'], (ctx, t) => {
  void ctx;
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const C: P = [200, 124];
  const R = 106;
  let turn = 0;
  let riding = 0;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#f3eee6' }), g);
  const paint = () => {
    // The ball rolls from the west rim straight east through the middle, over time 0..1,
    // while the disc turns anticlockwise (seen from above) by `turn` of a circle.
    const n = 60;
    const path: P[] = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const x = -R + 2 * R * k;
      // Seen from on board, the ball's place turned back by the disc's turn so far.
      const a = riding ? -turn * 2 * Math.PI * k : 0;
      const xr = x * Math.cos(a);
      const yr = x * Math.sin(a);
      // y up in the maths, down on the page.
      path.push([C[0] + xr, C[1] - yr]);
    }
    // A painted stripe on the disc, where it started and where it got to.
    const stripe = (a: number, op: number, dash = '') => line(C[0], C[1], C[0] + Math.cos(a) * R, C[1] - Math.sin(a) * R, COL.env, 3, { opacity: op, 'stroke-dasharray': dash });
    const turned = riding ? 0 : turn * 2 * Math.PI;
    const spin = turn > 0 ? spiral(C[0], C[1], R + 14, R + 14, Math.PI * 1.15, -0.12, -1) : spiral(C[0], C[1], R + 14, R + 14, Math.PI * 1.85, -0.12, 1);
    const end = path[path.length - 1];
    redraw(g,
      svg('circle', { cx: C[0], cy: C[1], r: R + 6, fill: '#ffffff', stroke: COL.cloudShade, 'stroke-width': 2 }),
      svg('circle', { cx: C[0], cy: C[1], r: 4, fill: COL.soft }),
      stripe(Math.PI / 2, 0.8),
      !riding && turn !== 0 ? stripe(Math.PI / 2 + turned, 0.35, '6 4') : null,
      // The spin: anticlockwise like the Earth seen from above the North Pole, clockwise as seen from above the South Pole.
      turn !== 0 ? polyline(spin, COL.env, 2) : null,
      turn !== 0 ? head(spin, COL.env, 7) : null,
      polyline(path, COL.parcel, 3),
      head(path, COL.parcel, 9),
      svg('circle', { cx: path[0][0], cy: path[0][1], r: 6, fill: COL.parcel }),
      svg('circle', { cx: end[0], cy: end[1], r: 6, fill: 'none', stroke: COL.parcel, 'stroke-width': 2 }),
      note(8, 16, riding ? 'Riding the turntable' : 'Seen from the ceiling', { bold: true }),
      note(8, 30, riding ? 'the stripe stays put; the room turns' : 'the stripe turns with the disc', { soft: true }),
    );
    const deg = Math.round(Math.abs(turn) * 360);
    const side = turn > 0 ? 'right' : 'left';
    if (turn === 0) f.readout.textContent = 'The turntable is still: from anywhere, the ball rolls straight across.';
    else if (!riding) f.readout.textContent = `From the ceiling the ball rolls dead straight. While it crosses, the disc turns ${deg}° under it.`;
    else f.readout.textContent = `Riding the disc, the ball seems to swerve to the ${side} of where it was rolled, by the ${deg}° the disc turned. Nothing pushed it sideways.${turn < 0 ? ' A clockwise spin is the Earth seen from above the South Pole.' : ''}`;
    if (t.goal === 'curve' && riding && Math.abs(turn) >= 0.1) t.done();
  };
  const view = choices(['From the ceiling', 'Riding the turntable'], (i) => { riding = i; paint(); });
  view.pick(0);
  f.controls.append(
    el('div.fig-guess', {}, view.node),
    slider('Spin while it crosses', -0.25, 0.25, 0.025, 0, (v) => (v === 0 ? 'still' : `${Math.round(Math.abs(v) * 360)}° ${v > 0 ? 'anticlockwise (north)' : 'clockwise (south)'}`), (v) => { turn = v; paint(); }, 'env').node,
  );
  paint();
  return f.node;
});

// ---- How much the ground turns, by latitude ---------------------------------

export const spinLatitudeDiagram: FigureFactory = () => {
  const W = 400;
  const H = 230;
  const d = still(W, H);
  const C: P = [96, 120];
  const R = 82;
  const at = (latDeg: number): P => {
    const a = (latDeg * Math.PI) / 180;
    return [C[0] + Math.cos(a) * R, C[1] - Math.sin(a) * R];
  };
  /** A little turntable lying flat on the ground at that latitude, with how far it turns in a day. */
  const disc = (lat: number, text: string, sub: string, y: number) => {
    const [x, yy] = at(lat);
    const spin = Math.sin((lat * Math.PI) / 180);
    const tx = 214;
    return svg('g', {},
      line(x, yy, tx - 26, y, COL.cloudShade, 1, { 'stroke-dasharray': '3 3' }),
      svg('circle', { cx: x, cy: yy, r: 4, fill: COL.parcel }),
      svg('ellipse', { cx: tx - 6, cy: y, rx: 20, ry: 7, fill: '#ffffff', stroke: COL.soft, 'stroke-width': 1.2 }),
      ...(spin > 0.05 ? [polyline(spiral(tx - 6, y, 24, 24, Math.PI * 0.3, -0.6 * spin, -1).map(([px, py]): P => [px, y + (py - y) * 0.35]), COL.env, 2)] : []),
      note(tx + 22, y - 2, text, { bold: true }),
      small(tx + 22, y + 10, sub, { soft: true }),
    );
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#f3eee6' }),
    svg('circle', { cx: C[0], cy: C[1], r: R, fill: SEA, stroke: COL.soft, 'stroke-width': 1.5 }),
    line(C[0] - R, C[1], C[0] + R, C[1], COL.soft, 1, { 'stroke-dasharray': '4 3' }),
    small(C[0] - R + 4, C[1] - 4, 'equator', { soft: true }),
    line(C[0], C[1] - R - 16, C[0], C[1] + R + 6, COL.ink, 1.5),
    polyline(spiral(C[0], C[1] - R - 10, 14, 14, Math.PI * 0.1, -0.55, -1).map(([px, py]): P => [px, C[1] - R - 10 + (py - (C[1] - R - 10)) * 0.35]), COL.env, 2),
    small(C[0] + 18, C[1] - R - 12, 'the Earth turns', { fill: COL.env }),
    disc(90, 'North Pole', 'a full turn a day', 40),
    disc(47, 'Washington, 47° N', 'about ¾ of a turn a day', 100),
    disc(0, 'Equator', 'no turn at all', 160),
    note(8, 220, 'The ground turns about your feet. South of the equator, the other way.', { soft: true }),
  );
  return { node: d.node };
};

// ---- The balance: push, turn and friction -----------------------------------

const WIND_GUESSES = ['Straight into the low', 'Along the lines, with the low on its left', 'Round and round on the spot'] as const;
const WIND_RIGHT = 1;

export const windBalanceFigure = figure(['balance'], (ctx, t) => {
  void ctx;
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const top = 36;
  const bottom = 232;
  const left = 30;
  const px = 26; // drawing units per unit of distance in the model
  let spin = 0;
  let rub = 0;
  const g = svg('g');
  const iso: SVGElement[] = [];
  for (let i = 0; i < 5; i++) {
    const y = top + i * ((bottom - top) / 4);
    iso.push(line(0, y, W, y, COL.env, 1.2, { opacity: 0.55 }), small(W - 8, y - 4, `${996 + i * 5} hPa`, { anchor: 'end', fill: COL.env }));
  }
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: MAP }),
    svg('rect', { x: 0, y: 0, width: W, height: top, fill: tint(COL.red, 0.08) }),
    ...iso,
    label(8, 24, 'LOW pressure, to the north', { bold: true, fill: COL.redInk }),
    label(8, H - 4, 'HIGH pressure', { bold: true, fill: COL.blue }),
    g,
  );
  /**
   * The air's path from rest over a few hours: pushed north (up the page) by
   * the pressure, turned to the right of its motion by the spin, and slowed by
   * friction. Units: push 1, spin up to 1, friction up to 1.
   */
  const run = () => {
    let x = 0;
    let y = 0;
    let u = 0;
    let v = 0;
    const dt = 0.02;
    const out: P[] = [[left, bottom - 16]];
    for (let s = 0; s < 16 / dt; s++) {
      const au = spin * v - rub * u;
      const av = 1 - spin * u - rub * v;
      u += au * dt;
      v += av * dt;
      x += u * dt;
      y += v * dt;
      const p: P = [left + x * px, bottom - 16 - y * px];
      if (s % 5 === 0) out.push(p);
      if (p[1] <= top + 4 || p[0] >= W - 20) {
        out.push(p);
        break;
      }
    }
    return { path: out, u, v };
  };
  const paint = () => {
    const { path, u, v } = run();
    const speed = Math.hypot(u, v);
    const across = Math.round((Math.atan2(v, u) * 180) / Math.PI);
    redraw(g, polyline(path, COL.parcel, 3), head(path, COL.parcel, 9), svg('circle', { cx: path[0][0], cy: path[0][1], r: 5, fill: COL.parcel }));
    if (asking) f.readout.textContent = 'With the Earth still, the air runs straight downhill into the low. Now let the Earth turn under it. Where does the air end up going?';
    else if (spin === 0) f.readout.textContent = 'No spin: the air runs straight across the lines into the low, faster and faster, and fills it in within hours.';
    else if (rub === 0) f.readout.textContent = `The turn bends the air to its right until it runs along the lines, low on its left: the push and the turn balance (${Math.abs(across) < 8 ? 'crossing the lines hardly at all' : `still crossing them by ${across}°`}). The low is not filled in.${guessNote()}`;
    else f.readout.textContent = `Friction near the ground slows the wind, the turn weakens, and the push wins a little: the wind crosses the lines by about ${across}° into the low, at ${Math.round((speed / (spin || 1)) * 100)}% of the speed aloft.${guessNote()}`;
    if (t.goal === 'balance' && !asking && spin >= 1 && rub >= 0.4) t.done();
  };
  const guessNote = () => (pick.picked() < 0 ? '' : pick.picked() === WIND_RIGHT ? ' As you guessed.' : ' Not what you guessed.');
  let asking = t.goal === 'balance';
  const spinS = slider('Earth’s spin', 0, 1, 0.25, 0, (v) => `${Math.round(v * 100)}%`, (v) => { spin = v; paint(); }, 'env');
  const rubS = slider('Friction with the ground', 0, 1, 0.2, 0, (v) => (v === 0 ? 'none (high up)' : v <= 0.4 ? 'sea' : 'land'), (v) => { rub = v; paint(); }, 'soft');
  const pick = choices(WIND_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Let the Earth turn', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([spinS, rubS], false);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(spinS.node, rubS.node);
  lock([spinS, rubS], asking);
  if (asking && typeof t.kept === 'number' && WIND_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- A low and a high -------------------------------------------------------

export const lowHighDiagram: FigureFactory = () => {
  const W = 400;
  const H = 296;
  const d = still(W, H);
  const L: P = [100, 84];
  const Hc: P = [300, 84];
  const arms = (c: P, inward: boolean, color: string) => [0, 1, 2, 3].flatMap((i) => {
    const start = (i * Math.PI) / 2 + 0.3;
    // Into a low: anticlockwise, spiralling in. Out of a high: clockwise, spiralling out.
    const p = inward ? spiral(c[0], c[1], 64, 18, start, 0.3, -1) : spiral(c[0], c[1], 16, 62, start, 0.3, 1);
    return [polyline(p, color, 2), head(p, color, 7)];
  });
  const side = (cx: number, rising: boolean) => {
    const y0 = 282;
    const parts: SVGElement[] = [line(cx - 80, y0, cx + 80, y0, COL.ground, 3)];
    if (rising) {
      parts.push(
        arrow(cx - 74, y0 - 8, cx - 18, y0 - 10, COL.parcel, 2), arrow(cx + 74, y0 - 8, cx + 18, y0 - 10, COL.parcel, 2),
        arrow(cx, y0 - 14, cx, y0 - 66, COL.parcel, 2.4),
        svg('ellipse', { cx, cy: y0 - 76, rx: 46, ry: 12, fill: '#ffffff', stroke: COL.cloudShade }),
        ...[-20, -8, 4, 16].map((dx) => line(cx + dx, y0 - 64, cx + dx - 3, y0 - 14, COL.rain, 1.2, { opacity: 0.7 })),
      );
    } else {
      parts.push(
        arrow(cx, y0 - 80, cx, y0 - 22, COL.blue, 2.4),
        arrow(cx - 14, y0 - 10, cx - 74, y0 - 8, COL.blue, 2), arrow(cx + 14, y0 - 10, cx + 74, y0 - 8, COL.blue, 2),
      );
    }
    return parts;
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: MAP }),
    line(200, 8, 200, H - 8, COL.cloudShade, 1),
    ...arms(L, true, COL.redInk),
    ...arms(Hc, false, COL.blue),
    label(L[0] - 6, L[1] + 6, 'L', { bold: true, fill: COL.red, attrs: { 'font-size': 18 } }),
    label(Hc[0] - 6, Hc[1] + 6, 'H', { bold: true, fill: COL.blue, attrs: { 'font-size': 18 } }),
    note(L[0], 166, 'in, anticlockwise, and up:', { anchor: 'middle', fill: COL.redInk, bold: true }),
    note(L[0], 178, 'cloud and rain', { anchor: 'middle', fill: COL.redInk }),
    note(Hc[0], 166, 'down, out, clockwise:', { anchor: 'middle', fill: COL.blue, bold: true }),
    note(Hc[0], 178, 'clear and dry', { anchor: 'middle', fill: COL.blue }),
    ...side(L[0], true),
    ...side(Hc[0], false),
    small(W - 6, 14, 'seen from above, north at the top', { anchor: 'end', soft: true }),
  );
  return { node: d.node };
};

// ---- The jet stream, winter and summer --------------------------------------

/** The North Pacific, schematically: x from 150° E to 110° W, y from 20° N to 65° N. */
export const pacificX = (lonW: number) => 400 - ((lonW - 110) / 100) * 400;
export const pacificY = (lat: number, top = 20, h = 200) => top + ((65 - lat) / 45) * h;

/** North America's west coast, schematically, from 22° N to 62° N (longitude °W by latitude). */
export const WEST_COAST: [number, number][] = [
  [110, 22], [112, 24], [114, 28], [116, 31], [117.5, 33], [120.5, 34.5], [122.5, 37.5], [124, 40.5], [124.2, 43], [124, 46], [124.7, 48.4], [128, 51], [131, 54], [135, 57], [140, 59.8], [146, 61], [152, 60], [158, 57], [166, 54],
];
/** North America, east of the coast; Asia and the Aleutians are left out, and the map runs off its west side. */
export function westCoast(top = 20, h = 200): SVGElement {
  const pts = WEST_COAST.map(([lon, lat]): P => [pacificX(lon), pacificY(lat, top, h)]);
  return svg('polygon', { points: points([...pts, [pts[pts.length - 1][0], top], [400, top], [400, top + h]]), fill: MAP, stroke: '#b9b28a', 'stroke-width': 1.2 });
}

export const jetStreamDiagram: FigureFactory = () => {
  const W = 400;
  const H = 236;
  const d = still(W, H);
  const top = 16;
  const h = 200;
  const jet = (lat: number, amp: number): P[] => Array.from({ length: 41 }, (_, i) => {
    const lon = 210 - i * 2.5;
    return [pacificX(lon), pacificY(lat + amp * Math.sin(i / 6.5), top, h)];
  });
  const winter = jet(42, 4);
  const summer = jet(54, 3);
  const lows = [10, 22, 34].map((i) => winter[i]);
  d.svg.append(
    svg('rect', { x: 0, y: top, width: W, height: h, fill: SEA }),
    westCoast(top, h),
    ...[30, 40, 50, 60].map((lat) => small(4, pacificY(lat, top, h) - 2, `${lat}° N`, { soft: true })),
    polyline(summer, COL.sunInk, 6, { opacity: 0.35 }),
    head(summer, COL.sunInk, 12),
    note(pacificX(196), pacificY(57.5, top, h), 'summer: far north', { fill: COL.sunInk, bold: true }),
    polyline(winter, COL.env, 7, { opacity: 0.5 }),
    head(winter, COL.env, 13),
    note(pacificX(204), pacificY(36, top, h), 'winter: aimed at Oregon and Washington', { fill: COL.env, bold: true }),
    ...lows.map(([x, y]) => label(x - 5, y + 18, 'L', { bold: true, fill: COL.red })),
    svg('circle', { cx: pacificX(122.3), cy: pacificY(47.6, top, h), r: 3.5, fill: COL.ink }),
    small(pacificX(122.3) + 6, pacificY(47.6, top, h) + 3, 'Seattle'),
    note(4, H - 6, 'The fast wind about 10 km up, and the lows it carries east.', { soft: true }),
  );
  return { node: d.node };
};
