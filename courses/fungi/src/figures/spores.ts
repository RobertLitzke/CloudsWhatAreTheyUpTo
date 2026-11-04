// Lesson 4, Seven trillion spores: how far a spore drifts as it falls (by its
// size and the wind), why gills must hang within a few degrees of vertical,
// and Buller's drop, the catapult that launches a spore (a still).

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider, wrapped } from './kit';

const W = 400;

/**
 * How fast a spore of diameter `um` micrometres falls through still air, in
 * millimetres a second: Stokes's law for a small sphere a little denser than
 * water (1,100 kg per cubic metre) in air (viscosity 1.8e-5 Pa s).
 */
export function fallSpeed(um: number): number {
  const r = (um / 2) * 1e-6;
  return ((2 / 9) * 1100 * 9.81 * r * r) / 1.8e-5 * 1000;
}

/** How far a spore drifts, in metres, falling `heightCm` in a steady wind of `wind` metres a second. */
export function drift(um: number, heightCm: number, wind: number): number {
  const seconds = (heightCm / 100) / (fallSpeed(um) / 1000);
  return wind * seconds;
}

const metres = (m: number) => (m < 1 ? `${Math.round(m * 100)} cm` : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

export const fallFigure = figure(['tiny'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let size = 10;
  let wind = 1;
  let sawSmall = false;
  let sawBig = false;
  const height = 8;
  const paint = () => {
    const v = fallSpeed(size);
    const d = drift(size, height, wind);
    const s = height / 100 / (v / 1000);
    // The path drawn on a squeezed scale: the cap at left, the ground below.
    const capX = 40;
    const ground = 150;
    const reach = Math.min(340, 40 + 300 * Math.log10(1 + d) / Math.log10(1 + 2000));
    const pts = Array.from({ length: 20 }, (_, i) => {
      const k = i / 19;
      return [capX + 6 + (reach - 6) * k, 70 + (ground - 70) * k];
    });
    redraw(g,
      line(0, ground, W, ground, COL.soil, 2),
      svg('rect', { x: capX - 3, y: 70, width: 6, height: ground - 70, fill: '#efe6cf', stroke: COL.cap, 'stroke-width': 0.8 }),
      svg('path', { d: `M${capX - 22},72 Q${capX},40 ${capX + 22},72 Z`, fill: COL.cap }),
      ...pts.map(([x, y], i) => svg('circle', { cx: x, cy: y, r: 1.2 + size / 14, fill: COL.spore, opacity: 0.2 + (0.8 * i) / 19 })),
      arrow(140, 30, 190, 30, COL.water, 1.5),
      small(196, 34, `wind ${wind} m/s`, { fill: COL.water }),
      small(capX + reach, ground + 16, `lands ${metres(d)} away`, { anchor: reach > 300 ? 'end' : 'middle', bold: true }),
      small(6, 186, `Spore ${size} µm across falls ${v < 1 ? v.toFixed(2) : v.toFixed(1)} mm a second; from a cap ${height} cm up it takes ${s < 120 ? `${Math.round(s)} seconds` : `${Math.round(s / 60)} minutes`}.`, { soft: true }),
      small(W - 6, 14, 'Distance on a squeezed scale', { anchor: 'end', soft: true }),
    );
    if (size <= 4) sawSmall = true;
    if (size >= 20) sawBig = true;
    f.readout.textContent = size <= 4
      ? `A spore this small falls so slowly that any breeze carries it ${metres(d)} before it lands, and the faintest updraft lifts it. Once above the trees, such spores can travel for days.`
      : size >= 20
        ? `A big spore falls fast and lands within ${metres(d)}. Most fungi with spores this large spread them some other way: by animals, insects or rain splash.`
        : `Fall speed goes with the square of size: halve a spore's width and it falls four times slower, so it drifts four times as far.`;
    if (sawSmall && sawBig) t.done();
  };
  const sz = slider('Spore size', 2, 30, 1, size, (v) => `${v} µm`, (v) => { size = v; paint(); }, 'spore');
  const wd = slider('Wind under the trees', 0.2, 3, 0.2, wind, (v) => `${v.toFixed(1)} m/s`, (v) => { wind = Math.round(v * 10) / 10; paint(); }, 'water');
  f.controls.append(sz.node, wd.node);
  paint();
  return f.node;
});

// ---- Gills that hang straight -----------------------------------------------------------------------

/** Gill depth and gap in millimetres, and how far a spore is shot out before it falls. */
export const GILL = { depth: 8, gap: 0.6, shot: 0.1 } as const;

/**
 * The share of spores that fall clear of the gills when the cap is tilted
 * `deg` degrees. Spores are shot from both faces of each gap. On the face that
 * leans out over the gap, a falling spore meets its own gill again unless it
 * starts within (shot / tan) of the bottom; on the other face it has the gap's
 * width less the shot to fall through before the leaning gill opposite catches it.
 */
export function escape(deg: number): number {
  const tan = Math.tan((deg * Math.PI) / 180);
  if (tan === 0) return 1;
  const clear = (room: number) => Math.min(1, room / (GILL.depth * tan));
  return (clear(GILL.shot) + clear(GILL.gap - GILL.shot)) / 2;
}

export const gillFigure = figure(['tilt'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let tilt = 0;
  const paint = () => {
    const share = escape(tilt);
    const tan = Math.tan((tilt * Math.PI) / 180);
    // Drawn in millimetres: across 66 px a millimetre, down 16 px a millimetre.
    const top = 26;
    const x0 = 150;
    const X = (mm: number) => x0 + mm * 66;
    const Y = (mm: number) => top + mm * 16;
    const face = (gill: number, y: number) => gill * GILL.gap + y * tan;
    const spores: SVGElement[] = [];
    for (let k = 0; k < 6; k++) {
      const fromLeft = k % 2 === 0;
      const y0 = GILL.depth * (0.12 + 0.76 * (Math.floor(k / 2) / 2));
      const xs = fromLeft ? face(0, y0) + GILL.shot : face(1, y0) - GILL.shot;
      // Where it meets a gill face, falling straight down.
      const room = fromLeft ? GILL.shot : GILL.gap - GILL.shot;
      const hitY = tan > 0 ? y0 + room / tan : Infinity;
      const blocked = hitY < GILL.depth;
      const endY = blocked ? hitY : GILL.depth + 2;
      spores.push(
        line(X(fromLeft ? face(0, y0) : face(1, y0)), Y(y0), X(xs), Y(y0), COL.spore, 1, { 'stroke-dasharray': '2 2' }),
        line(X(xs), Y(y0), X(xs), Y(endY), COL.spore, 1),
        svg('circle', { cx: X(xs), cy: Y(endY), r: 3, fill: blocked ? COL.bad : COL.spore }),
      );
    }
    redraw(g,
      line(X(-0.4), Y(0) - 3, X(GILL.gap + 0.4 + 1.6), Y(0) - 3, COL.cap, 6),
      line(X(face(0, 0)) - 4, Y(0), X(face(0, GILL.depth)) - 4, Y(GILL.depth), COL.cap, 8),
      line(X(face(1, 0)) + 4, Y(0), X(face(1, GILL.depth)) + 4, Y(GILL.depth), COL.cap, 8),
      ...spores,
      small(12, 40, 'Two gills, edge on,', { soft: true }),
      small(12, 52, 'drawn wider than', { soft: true }),
      small(12, 64, 'they are deep', { soft: true }),
      label(W - 12, 40, `tilt ${tilt}°`, { anchor: 'end', bold: true }),
      small(W - 12, 56, `${Math.round(share * 100)}% fall clear`, { anchor: 'end', bold: true, fill: share > 0.5 ? COL.good : COL.bad }),
      ...wrapped(12, 196, `Gill ${GILL.depth} mm deep, gap ${GILL.gap} mm; each spore is shot about ${GILL.shot} mm off its gill, then falls straight down.`, 72, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = tilt === 0
      ? 'Hanging straight, every spore shot into the gap falls clear and drops out below the cap.'
      : share > 0.5
        ? `At ${tilt}° the gills lean into the falling spores. Those shot from the overhanging face land back on their own gill: ${Math.round(share * 100)}% still fall clear.`
        : `At ${tilt}° most spores land on a gill: only ${Math.round(share * 100)}% fall clear. A mushroom knocked over bends its stem upward within hours to bring its gills back to vertical.`;
    if (tilt >= 4 && share < 0.5) t.done();
  };
  const ts = slider('Tilt of the cap', 0, 20, 1, tilt, (v) => `${v}°`, (v) => { tilt = v; paint(); }, 'cap');
  f.controls.append(ts.node);
  const open = guessFirst(t, f, {
    ask: 'Gills are about 8 mm deep with gaps under a millimetre wide. How far can a cap tilt before most of its spores hit a gill?',
    options: ['A few degrees', 'About 20 degrees', 'About 45 degrees'],
    answer: 0,
    sliders: [ts],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Buller's drop (still) ------------------------------------------------------------------------

export const launchStill = () => {
  const s = still(W, 192);
  const parts: SVGElement[] = [];
  const pic: SVGElement[] = [];
  const stage = (x: number, title: string, body: string, merged: boolean, gone: boolean) => {
    // A basidium's prong with a spore on it.
    pic.push(
      svg('path', { d: `M${x - 10},140 L${x - 10},100 Q${x},86 ${x + 10},100 L${x + 10},140`, fill: '#f6eedb', stroke: COL.hypha, 'stroke-width': 1.5 }),
      line(x, 92, x + 4, 80, COL.hypha, 1.5),
    );
    if (!gone) {
      pic.push(svg('ellipse', { cx: x + 10, cy: 66, rx: 9, ry: 13, fill: COL.spore, transform: `rotate(20 ${x + 10} 66)` }));
      if (!merged) pic.push(svg('circle', { cx: x + 2, cy: 80, r: 4, fill: COL.water, opacity: 0.7 }), svg('ellipse', { cx: x + 14, cy: 60, rx: 4, ry: 6, fill: COL.water, opacity: 0.5 }));
      else pic.push(svg('ellipse', { cx: x + 12, cy: 62, rx: 8, ry: 10, fill: COL.water, opacity: 0.55 }));
    } else {
      pic.push(
        svg('ellipse', { cx: x + 52, cy: 40, rx: 9, ry: 13, fill: COL.spore, transform: `rotate(60 ${x + 52} 40)` }),
        svg('ellipse', { cx: x + 58, cy: 36, rx: 7, ry: 8, fill: COL.water, opacity: 0.55 }),
        arrow(x + 14, 60, x + 40, 46, COL.ink, 1.5),
      );
    }
    parts.push(label(x, 186, title, { anchor: 'middle', bold: true }), ...wrapped(x - 56, 14, body, 24, { soft: true }));
  };
  stage(60, '1. Two drops', 'A drop grows at the spore’s base; a film of water spreads on its side.', false, false);
  stage(190, '2. They merge', 'The drop runs onto the spore and its weight shifts in a millionth of a second.', true, false);
  stage(320, '3. Launched', 'The jolt snaps the spore off, a tenth of a millimetre into the gap.', false, true);
  s.svg.append(svg('g', { transform: 'translate(0 24)' }, ...pic), ...parts);
  return { node: s.node };
};
