// Lesson 8, Two tides a day: the Moon's pull at points round the Earth less
// its pull at the centre (what is left raises two bulges), the Earth turning
// under the bulges (a still), and a month of the Sun's and Moon's bulges
// adding at new and full moon and partly cancelling at the quarters.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still, type P } from 'didactics/draw';
import { COL, axes, figure, frame, guessFirst, pick, player, slider, tint } from './kit';

const W = 400;
const TAU = 2 * Math.PI;

// ---- The numbers ------------------------------------------------------------------------------

/** Masses (kg) and mean distances from the Earth (m), and the Earth's radius and gravity. */
export const SKY = {
  G: 6.674e-11,
  moon: { mass: 7.342e22, distance: 3.844e8 },
  sun: { mass: 1.989e30, distance: 1.496e11 },
  earthRadius: 6.371e6,
  g: 9.81,
} as const;

/** A body's pull on the Earth's centre, m/s². */
export const pullAt = (b: { mass: number; distance: number }) => (SKY.G * b.mass) / b.distance ** 2;

/** The biggest tide-raising pull (under the body, or opposite it), m/s²: about 2 G M a / d³. */
export const tideRaising = (b: { mass: number; distance: number }) => (2 * SKY.G * b.mass * SKY.earthRadius) / b.distance ** 3;

/** The Sun's tide-raising pull over the Moon's: a bit under half. */
export const sunShare = () => tideRaising(SKY.sun) / tideRaising(SKY.moon);

/**
 * The Moon's pull at a point on the Earth's surface less its pull at the
 * Earth's centre, worked out exactly (not the small-angle formula). The point
 * is at angle `theta` from the line to the Moon, the Moon `d` Earth radii
 * away; units are the Moon's pull at one Earth radius. Returns the vector
 * [toward the Moon, across], and its part straight up from the ground.
 */
export function leftover(theta: number, d = 60.3): { x: number; y: number; up: number } {
  const px = Math.cos(theta);
  const py = Math.sin(theta);
  const dx = d - px;
  const dy = -py;
  const r3 = Math.hypot(dx, dy) ** 3;
  const x = dx / r3 - 1 / (d * d);
  const y = dy / r3;
  return { x, y, up: x * px + y * py };
}

/** The days from one new moon to the next. */
export const MONTH = 29.53;

/** How far the Moon is round from the Sun, as seen from the Earth, `day` days after new moon (radians). */
export const elongation = (day: number) => (TAU * day) / MONTH;

/**
 * The range of the tide (high water to low) on `day` days after new moon, as
 * a share of the range the Moon raises alone: the two bulges add when they
 * line up and partly cancel when they lie at right angles. √(1 + s² + 2s cos 2φ).
 */
export function springNeap(day: number, s = sunShare()): number {
  const p = elongation(day);
  return Math.sqrt(1 + s * s + 2 * s * Math.cos(2 * p));
}

/** Hours in the M2 and S2 tides: half a lunar day, and half a solar day. */
export const HALF_LUNAR_DAY = 12.42;

/** The tide at a place on the equator, `hours` after a new moon at which it was high, as a share of the Moon's own tide. */
export function tideAt(hours: number, s = sunShare()): number {
  return Math.cos((TAU * hours) / HALF_LUNAR_DAY) + s * Math.cos((TAU * hours) / 12);
}

// ---- A difference in pull ---------------------------------------------------------------------

const VIEWS = ['The Moon’s pull', 'Minus the pull at the centre', 'What is left'] as const;

export const pullFigure = figure(['left'], (_ctx, t) => {
  const f = frame(W, 228, 3);
  const g = svg('g');
  f.svg.append(g);
  let view = 0;
  const cx = 150;
  const cy = 112;
  const R = 70;
  const D = 60.3;
  const paint = () => {
    const parts: SVGElement[] = [];
    // The water shell: round until the leftover is shown, then stretched toward and away from the Moon.
    if (view === 2) parts.push(svg('ellipse', { cx, cy, rx: R + 14, ry: R - 6, fill: tint(COL.salt, 0.3), stroke: COL.salt, 'stroke-width': 1.5 }));
    else parts.push(svg('circle', { cx, cy, r: R + 5, fill: tint(COL.salt, 0.3), stroke: COL.salt, 'stroke-width': 1.5 }));
    parts.push(svg('circle', { cx, cy, r: R, fill: tint(COL.land, 0.55), stroke: COL.land, 'stroke-width': 1 }));
    parts.push(
      svg('circle', { cx: 356, cy, r: 12, fill: tint(COL.moon, 0.35), stroke: COL.moon, 'stroke-width': 1.5 }),
      small(W - 8, cy + 28, 'Moon', { anchor: 'end', fill: COL.moon, bold: true }),
      small(W - 8, cy + 40, '60 Earth radii away,', { anchor: 'end', soft: true }),
      small(W - 8, cy + 52, 'not to scale', { anchor: 'end', soft: true }),
    );
    const pullLen = 46;
    const centre = 1 / (D * D);
    // The biggest leftover, under the Moon, sets the scale of the leftover arrows.
    const most = leftover(0, D).x;
    const scale = 34 / most;
    for (let i = 0; i < 12; i++) {
      const th = (i * TAU) / 12;
      const x = cx + R * Math.cos(th);
      const y = cy - R * Math.sin(th);
      const lo = leftover(th, D);
      // The pull itself, toward the Moon: almost the same everywhere.
      const px = (lo.x + centre) * D * D;
      const py = lo.y * D * D;
      if (view === 0) parts.push(arrow(x, y, x + pullLen * px, y - pullLen * py, COL.moon, 1.8));
      else if (view === 1) {
        parts.push(
          arrow(x, y, x + pullLen * px, y - pullLen * py, tint(COL.moon, 0.45), 1.6),
          arrow(x, y, x - pullLen, y, COL.ink, 1.4),
        );
      } else {
        const ex = x + scale * lo.x;
        const ey = y - scale * lo.y;
        parts.push(arrow(x, y, ex, ey, COL.moon, 2));
      }
      parts.push(svg('circle', { cx: x, cy: y, r: 2.4, fill: COL.ink }));
    }
    parts.push(svg('circle', { cx, cy, r: 3, fill: COL.ink }));
    if (view === 0) parts.push(arrow(cx, cy, cx + pullLen, cy, COL.moon, 1.8), small(cx - 8, cy + 16, 'centre', { soft: true }));
    if (view === 1) parts.push(arrow(cx, cy, cx + pullLen, cy, COL.moon, 1.8), small(cx - 8, cy + 16, 'centre', { soft: true }));
    parts.push(label(6, 16, VIEWS[view], { bold: true, fill: COL.moon }));
    if (view === 1) parts.push(small(6, 30, 'Black: the centre’s pull, taken away at every point', { soft: true }));
    if (view === 2) parts.push(small(6, 30, `Drawn ${Math.round((scale * centre) / pullLen)} times longer than the pull arrows`, { soft: true }));
    redraw(g, ...parts);
    if (!open()) return;
    f.readout.textContent = view === 0
      ? 'The Moon pulls every point toward it, a little harder on the near side (closer) and a little less on the far side. The differences are only about 3% either way, too small to see at this scale.'
      : view === 1
        ? 'The whole Earth falls round the Moon as if pulled at its centre. Take that shared pull (black) away from each point, and only the differences remain.'
        : 'What is left points away from the Earth’s centre on both the near and the far side, and inward round the middle. The ocean is stretched into two bulges, one under the Moon and one opposite it.';
    if (view === 2) t.done();
  };
  const views = pick(VIEWS, 0, (i) => { view = i; paint(); });
  f.controls.append(views.node);
  const open = guessFirst(t, f, {
    ask: 'Take away the pull the whole Earth feels at its centre. On the side of the Earth facing away from the Moon, which way is the water left being pulled?',
    options: ['Toward the Moon, a little', 'Away from the Moon', 'Nowhere: it all cancels'],
    answer: 1,
    sliders: [],
    buttons: views.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The Earth turns under the bulges (a still) -----------------------------------------------

export const turnStill = () => {
  const s = still(W, 258);
  const cx = 196;
  const cy = 128;
  const R = 62;
  const pts: P[] = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i * TAU) / 72;
    const r = R + 8 + 12 * Math.cos(2 * a);
    pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
  }
  const city = (a: number, text: string, sub: string, anchor: 'start' | 'middle' | 'end', dx: number, dy: number) => {
    const x = cx + R * Math.cos(a);
    const y = cy - R * Math.sin(a);
    const at = anchor === 'start' ? undefined : anchor;
    return [
      svg('circle', { cx: x, cy: y, r: 4.5, fill: COL.ink, stroke: COL.paper, 'stroke-width': 1.5 }),
      small(x + dx, y + dy, text, { anchor: at, bold: true }),
      small(x + dx, y + dy + 12, sub, { anchor: at, soft: true }),
    ];
  };
  // The Earth turns anticlockwise seen from above the North Pole.
  const turn: P[] = [];
  for (let a = -0.9; a <= 3.5; a += 0.1) turn.push([cx + 24 * Math.cos(a), cy - 24 * Math.sin(a)]);
  const [p1, p2] = turn.slice(-2);
  s.svg.append(
    svg('path', { d: `M${pts.map((p) => p.join(',')).join(' L')} Z`, fill: tint(COL.salt, 0.3), stroke: COL.salt, 'stroke-width': 1.5 }),
    svg('circle', { cx, cy, r: R, fill: tint(COL.land, 0.55), stroke: COL.land }),
    svg('polyline', { points: turn.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.ink, 'stroke-width': 1.5 }),
    arrow(p1[0], p1[1], p2[0], p2[1], COL.ink, 1.5),
    small(cx, cy + 4, 'turns', { anchor: 'middle', soft: true }),
    svg('circle', { cx: 376, cy, r: 11, fill: tint(COL.moon, 0.35), stroke: COL.moon, 'stroke-width': 1.5 }),
    small(W - 6, cy + 26, 'to the Moon', { anchor: 'end', fill: COL.moon, bold: true }),
    ...city(0, 'High water', '0 h', 'start', 26, -14),
    ...city(Math.PI / 2, 'Low water', '6 h 12 min', 'middle', 0, -32),
    ...city(Math.PI, 'High water', '12 h 25 min', 'end', -26, -14),
    ...city(-Math.PI / 2, 'Low water', '18 h 37 min', 'middle', 0, 30),
    label(6, 14, 'Looking down on the North Pole', { bold: true }),
    small(6, 252, 'Back to high water after 24 h 50 min, as the Moon has moved on', { soft: true }),
  );
  return { node: s.node };
};

// ---- Spring and neap --------------------------------------------------------------------------

const phaseName = (day: number): string => {
  const near = (d: number) => Math.abs(day - d) <= 1;
  if (near(0) || near(MONTH)) return 'New moon';
  if (near(MONTH / 4)) return 'First quarter';
  if (near(MONTH / 2)) return 'Full moon';
  if (near((3 * MONTH) / 4)) return 'Last quarter';
  if (day < MONTH / 4) return 'Waxing crescent';
  if (day < MONTH / 2) return 'Waxing gibbous';
  if (day < (3 * MONTH) / 4) return 'Waning gibbous';
  return 'Waning crescent';
};

export const monthFigure = figure(['month'], (ctx, t) => {
  const f = frame(W, 268, 3);
  const g = svg('g');
  f.svg.append(g);
  let day = 0;
  const s = sunShare();
  const A = axes({ x: 34, y: 160, w: 356, h: 80, xmin: 0, xmax: MONTH, ymin: -1.6, ymax: 1.6, xticks: [0, 7, 14, 21, 28], xlabel: 'days after new moon', ink: COL.ink, grid: COL.grid });
  const paint = () => {
    const parts: SVGElement[] = [];
    const cx = 150;
    const cy = 74;
    const R = 26;
    const phi = elongation(day);
    // The Sun is far to the left; the Moon starts between us and it (new moon) and goes round anticlockwise.
    const lamS = Math.PI;
    const lamM = Math.PI + phi;
    const shape = (fn: (a: number) => number): string => {
      const pts: string[] = [];
      for (let i = 0; i <= 90; i++) {
        const a = (i * TAU) / 90;
        const r = fn(a);
        pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy - r * Math.sin(a)).toFixed(1)}`);
      }
      return `M${pts.join(' L')} Z`;
    };
    const k = 9;
    parts.push(
      svg('path', { d: shape((a) => R + 14 + k * (Math.cos(2 * (a - lamM)) + s * Math.cos(2 * (a - lamS)))), fill: tint(COL.salt, 0.35), stroke: COL.salt, 'stroke-width': 1.5 }),
      svg('path', { d: shape((a) => R + 14 + k * Math.cos(2 * (a - lamM))), fill: 'none', stroke: COL.moon, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
      svg('path', { d: shape((a) => R + 14 + k * s * Math.cos(2 * (a - lamS))), fill: 'none', stroke: COL.sun, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
      svg('circle', { cx, cy, r: R, fill: tint(COL.land, 0.55), stroke: COL.land }),
    );
    // The Moon on its orbit, lit on the side toward the Sun.
    const mx = cx + 60 * Math.cos(lamM);
    const my = cy - 60 * Math.sin(lamM);
    parts.push(
      svg('circle', { cx, cy, r: 60, fill: 'none', stroke: COL.grid, 'stroke-dasharray': '2 3' }),
      svg('circle', { cx: mx, cy: my, r: 8, fill: tint(COL.ink, 0.75) }),
      svg('path', { d: `M${mx},${my - 8} A 8 8 0 0 0 ${mx},${my + 8} Z`, fill: '#f4f1e4' }),
      svg('circle', { cx: mx, cy: my, r: 8, fill: 'none', stroke: COL.moon, 'stroke-width': 1.5 }),
      arrow(46, 16, 10, 16, COL.sun, 2),
      small(50, 20, 'to the Sun', { fill: COL.sun, bold: true }),
    );
    const ratio = springNeap(day, s);
    const kind = ratio > 1.3 ? 'spring tides' : ratio < 0.7 ? 'neap tides' : ratio > 1 ? 'toward springs' : 'toward neaps';
    if (open()) parts.push(
      label(250, 40, phaseName(day), { bold: true }),
      small(250, 56, `day ${day.toFixed(1)}`, { soft: true }),
      label(250, 80, `Range ${ratio.toFixed(2)} ×`, { bold: true, fill: COL.salt }),
      small(250, 94, 'the Moon’s alone', { soft: true }),
      label(250, 116, kind, { bold: ratio > 1.3 || ratio < 0.7 }),
      line(250, 128, 262, 128, COL.moon, 1.5, { 'stroke-dasharray': '4 3' }),
      small(266, 131, 'Moon’s bulge', { fill: COL.moon }),
      line(330, 128, 342, 128, COL.sun, 1.5, { 'stroke-dasharray': '4 3' }),
      small(346, 131, 'Sun’s', { fill: COL.sun }),
    );
    // The tide at one place through the month, drawn up to today.
    parts.push(...A.parts, small(34, 152, 'Tide at one place on the equator (the Moon’s alone reaches the dashed lines)', { soft: true }));
    parts.push(line(A.X(0), A.Y(1), A.X(MONTH), A.Y(1), COL.moon, 1, { 'stroke-dasharray': '3 3' }), line(A.X(0), A.Y(-1), A.X(MONTH), A.Y(-1), COL.moon, 1, { 'stroke-dasharray': '3 3' }));
    const curve: [number, number][] = [];
    for (let h = 0; h <= day * 24; h += 0.75) curve.push([h / 24, tideAt(h, s)]);
    if (curve.length > 1) parts.push(A.path(curve, COL.salt, 1));
    parts.push(line(A.X(day), A.o.y, A.X(day), A.o.y + A.o.h, COL.ink, 1));
    redraw(g, ...parts);
    if (!open()) return;
    const name = phaseName(day);
    f.readout.textContent = name === 'New moon'
      ? `New moon: the Moon and the Sun lie on the same line, so their bulges line up and add. The range is ${ratio.toFixed(2)} times the Moon's alone: spring tides.`
      : name === 'Full moon'
        ? `Full moon: the Moon is on the far side from the Sun, but each makes a bulge on both sides of the Earth, so the bulges still line up. Spring tides again, ${ratio.toFixed(2)} times the Moon's alone.`
        : name.endsWith('quarter')
          ? `${name}: the Sun's bulge lies across the Moon's and partly fills its low places. The range falls to ${ratio.toFixed(2)} of the Moon's alone: neap tides.`
          : `Day ${Math.round(day)}: the bulges lie at an angle, and the range is ${ratio.toFixed(2)} times the Moon's alone, ${ratio < springNeap(day + 0.5, s) ? 'growing toward the next springs' : 'shrinking toward the next neaps'}.`;
    if (day >= MONTH - 0.5) t.done();
  };
  const days = slider('Day', 0, MONTH, 0.25, 0, (v) => `${v.toFixed(1)}`, (v) => { day = v; paint(); }, 'moon');
  const play = player(days, ctx, { seconds: 14 });
  f.controls.append(play.node, days.node);
  const open = guessFirst(t, f, {
    ask: 'Over one month, at which phases of the Moon will the range of the tide be biggest?',
    options: ['New moon and full moon', 'Full moon only', 'First and last quarter'],
    answer: 0,
    sliders: [days],
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures = {
  'tides-pull': pullFigure,
  'tides-turn': turnStill,
  'tides-month': monthFigure,
};
