// Lesson 14, The Sun bends starlight: the path on which a carried watch ticks
// the most is the path a thrown ball takes; GPS clocks gaining from height and
// losing from speed; and stills of the 1919 star shifts and an Einstein ring.

import { svg } from 'didactics/dom';
import { arrow, line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;
const G = 9.81;
const C = 299792458;

/** Seconds of flight for the thrown ball. */
export const FLIGHT = 2;

/**
 * Extra time a watch carried on an arc of peak height `h` metres collects,
 * against one left on the ground, over a flight of `t` seconds: the gain from
 * being higher (where time runs faster) less the loss from moving (moving clocks
 * run slow). Seconds.
 */
export function arcGain(h: number, t = FLIGHT): number {
  return ((2 / 3) * G * h * t - ((8 / 3) * h * h) / t) / (C * C);
}

/** The peak height the real, free-falling ball reaches, metres: where arcGain is largest. */
export const realPeak = (t = FLIGHT) => (G * t * t) / 8;

const GM = 3.986e14;
const R = 6.371e6;

/** Microseconds a day a clock at `km` above the ground gains from height, against one on the ground. */
export const heightGain = (km: number) => ((GM / (C * C)) * (1 / R - 1 / (R + km * 1000))) * 86400 * 1e6;
/** Microseconds a day a clock moving at `kms` km/s loses from its speed. */
export const speedLoss = (kms: number) => ((kms * 1000) ** 2 / (2 * C * C)) * 86400 * 1e6;

// ---- The path the clock likes best (live) -------------------------------------------------

export const bestPathFigure = figure(['best'], (_ctx, t) => {
  const H = 260;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let h = 1;
  let guessed = false;
  const top = realPeak();
  const best = arcGain(top);
  // The throw: across 20..230 for the two seconds, heights 0..12 m over 210..40.
  const px = (s: number) => 24 + (s / FLIGHT) * 200;
  const py = (m: number) => 214 - m * 14;
  // The watch's gain against peak height: across 256..388, heights 0..12 m.
  const gx = (m: number) => 256 + (m / 12) * 132;
  const gy = (v: number) => 196 - (v / best) * 100;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    parts.push(line(14, py(0), 234, py(0), COL.earth, 3), small(24, py(0) + 14, 'thrown', { soft: true }), small(224, py(0) + 14, 'caught 2 s later', { anchor: 'end', soft: true }));
    for (const m of [5, 10]) parts.push(line(14, py(m), 234, py(m), COL.grid, 1), small(14, py(m) - 3, `${m} m`, { soft: true }));
    const path: P[] = [];
    for (let i = 0; i <= 40; i++) {
      const s = (FLIGHT * i) / 40;
      path.push([px(s), py((4 * h * s * (FLIGHT - s)) / (FLIGHT * FLIGHT))]);
    }
    parts.push(polyline(path, COL.planet, 2.5));
    // Watch faces along the path, a little faster higher up and a little slower when moving fast.
    for (const i of [0, 10, 20, 30, 40]) parts.push(svg('circle', { cx: path[i][0], cy: path[i][1], r: 4.5, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.2 }));
    parts.push(note(14, 18, 'A watch on the ball', { bold: true }), small(14, 31, 'higher: time runs faster; faster: time runs slower', { soft: true }));
    // The curve of gains.
    const curve: P[] = [];
    for (let m = 0; m <= 12; m += 0.25) curve.push([gx(m), gy(Math.max(arcGain(m), -0.4 * best))]);
    parts.push(line(gx(0), gy(0), gx(12), gy(0), COL.soft, 1), polyline(curve, COL.model, 2));
    parts.push(note(256, 58, 'Extra ticks, against a', { bold: true }), note(256, 70, 'watch left on the ground', { bold: true }));
    parts.push(small(gx(0), gy(0) + 14, 'peak height: 0 to 12 m', { soft: true }));
    parts.push(svg('circle', { cx: gx(h), cy: gy(Math.max(arcGain(h), -0.4 * best)), r: 5, fill: COL.planet }));
    if (guessed && Math.abs(h - top) < 0.25) parts.push(small(gx(top), gy(best) - 10, 'the most', { anchor: 'middle', fill: COL.model, bold: true }));
    redraw(g, ...parts);
    if (!guessed) return;
    const share = arcGain(h) / best;
    const found = Math.abs(h - top) < 0.25;
    f.readout.textContent = `Up ${sig(h, 2)} m: the watch collects ${share >= 0 ? `${Math.round(share * 100)}% of the most it can` : 'less than one left on the ground'}.${h < top - 0.25 ? ' Go higher: there is more to gain from the height.' : h > top + 0.25 ? ' Too high: to get up and down in time it must move so fast that speed costs more than height gives.' : ` That is the arc a real ball takes, ${sig(top, 2)} m up. The ball needs no instructions: this is what falling is.`}`;
    if (found && t.goal === 'best') t.done();
  };
  const s = slider('How high the path goes', 0, 12, 0.1, h, (v) => `${sig(v, 2)} m`, (v) => { h = v; paint(); }, 'planet');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'A ball is thrown up and caught two seconds later. A watch riding on it runs faster the higher it goes, and slower the faster it moves. On which path does it tick the most? Guess first.',
    options: ['As high as it can go', 'About five metres up', 'Hardly leaving the ground'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Change the path’s height and watch the total. Find the path on which the watch ticks the most.`;
    },
  });
  return f.node;
});

// ---- GPS clocks (live) ----------------------------------------------------------------------

export const gpsFigure = figure(['gps'], (_ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let km = 0;
  let kms = 0;
  let guessed = false;
  const paint = () => {
    const up = heightGain(km);
    const down = speedLoss(kms);
    const net = up - down;
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    // Earth and the satellite's height, to scale.
    const ex = 70;
    const ey = 118;
    const er = 16;
    const sr = er * (1 + km / 6371);
    parts.push(svg('circle', { cx: ex, cy: ey, r: Math.min(sr, 100), fill: 'none', stroke: COL.skyLine, 'stroke-dasharray': '3 3' }), svg('circle', { cx: ex, cy: ey, r: er, fill: COL.earth }));
    parts.push(svg('circle', { cx: ex + Math.min(sr, 100) * 0.71, cy: ey - Math.min(sr, 100) * 0.71, r: 3.5, fill: COL.light }));
    // Bars, microseconds a day: scale 60 µs = 180 px, zero at x=200.
    const bx = (us: number) => 200 + (us / 60) * 180;
    const bar = (y: number, us: number, colour: string, text: string) => {
      parts.push(svg('rect', { x: Math.min(bx(0), bx(us)), y, width: Math.abs(bx(us) - bx(0)), height: 16, fill: colour }), small(196, y + 12, text, { anchor: 'end', fill: '#ece6d8' }));
      parts.push(small(us >= 0 ? bx(us) + 4 : bx(us) - 4, y + 12, `${us >= 0 ? '+' : '−'}${sig(Math.abs(us), 2)} µs`, { anchor: us >= 0 ? undefined : 'end', fill: '#ece6d8' }));
    };
    parts.push(note(14, 24, 'Gained or lost in a day, against a clock on the ground', { fill: '#ece6d8', bold: true }));
    parts.push(line(bx(0), 44, bx(0), 160, '#a9adc2', 1));
    bar(56, up, COL.good, 'from height');
    bar(86, -down, COL.bad, 'from speed');
    bar(126, net, COL.light, 'together');
    const kmOff = Math.abs(net) * 1e-6 * C / 1000;
    parts.push(small(14, 196, `Light goes ${sig(kmOff, 2)} km in that time: the position error, uncorrected, after one day.`, { fill: '#a9adc2' }));
    parts.push(small(14, 212, '(µs: a millionth of a second)', { fill: '#a9adc2' }));
    redraw(g, ...parts);
    if (!guessed) return;
    const gps = Math.abs(km - 20200) < 1000 && Math.abs(kms - 3.87) < 0.3;
    f.readout.textContent = gps
      ? `That is a GPS satellite: ${sig(up, 2)} µs gained from height, ${sig(down, 2)} lost from speed, about ${Math.round(net)} µs a day ahead. Engineers set the satellites’ clocks slow before launch to cancel it.`
      : `Raise the clock and it runs faster; speed it up and it runs slower. A GPS satellite is 20,200 km up, moving at 3.9 km a second.`;
    if (gps && t.goal === 'gps') t.done();
  };
  const sh = slider('Height above the ground', 0, 36000, 100, km, (v) => `${Math.round(v).toLocaleString('en-US')} km`, (v) => { km = v; paint(); }, 'good');
  const sv = slider('Speed', 0, 8, 0.01, kms, (v) => `${sig(v, 2)} km/s`, (v) => { kms = v; paint(); }, 'bad');
  f.controls.append(sh.node, sv.node);
  paint();
  guessFirst(t, f, {
    ask: 'GPS works by timing signals from satellites. If nobody corrected their clocks for relativity, how far off would your position drift in a day? Guess first.',
    options: ['A few centimetres', 'About ten kilometres', 'Not at all'],
    answer: 1,
    sliders: [sh, sv],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Put a clock where a GPS satellite is, 20,200 km up, moving at 3.9 km a second, and see each effect.`;
    },
  });
  return f.node;
});

// ---- The 1919 eclipse (a still) -------------------------------------------------------------

export const eclipseStill = () => {
  const H = 230;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  const cx = 200;
  const cy = 118;
  s.append(svg('rect', { width: W, height: H, fill: COL.sky }));
  // The corona, then the Moon's black disc.
  for (let i = 0; i < 4; i++) s.append(svg('circle', { cx, cy, r: 30 + i * 8, fill: '#e9dfc6', opacity: 0.12 }));
  s.append(svg('circle', { cx, cy, r: 26, fill: '#05060c', stroke: '#e9dfc6', 'stroke-width': 1 }));
  // Stars in the Hyades, pushed outward from the Sun's centre (exaggerated): more for those nearer the edge.
  const stars: P[] = [[262, 88], [128, 76], [150, 168], [290, 150], [214, 54], [96, 128], [240, 190]];
  for (const [x, y] of stars) {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);
    const push = (26 * 26 * 1.0) / d;
    const nx = x + (dx / d) * push;
    const ny = y + (dy / d) * push;
    s.append(svg('circle', { cx: x, cy: y, r: 2.5, fill: 'none', stroke: '#a9adc2', 'stroke-width': 1 }), arrow(x, y, nx, ny, COL.light, 1.5), svg('circle', { cx: nx, cy: ny, r: 2.5, fill: '#fff8e0' }));
  }
  s.append(
    note(14, 20, 'Stars seen beside the eclipsed Sun, 29 May 1919', { bold: true, fill: '#ece6d8' }),
    small(14, 212, 'open circle: where the star is at night; dot: where it was seen. Shifts', { fill: '#a9adc2' }),
    small(14, 224, 'enlarged about 800 times; the biggest was under 2 seconds of arc.', { fill: '#a9adc2' }),
  );
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};

// ---- An Einstein ring (a still) -------------------------------------------------------------

export const ringStill = () => {
  const H = 200;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: COL.sky }));
  // Side view: a far galaxy, a near galaxy, and us; rays bending round the near one.
  const far: P = [30, 100];
  const lens: P = [200, 100];
  const eye: P = [370, 100];
  for (const sgn of [-1, 1]) {
    const bend: P = [200, 100 + sgn * 34];
    s.append(polyline([far, bend], COL.light, 1.5), arrow(bend[0], bend[1], eye[0] - 8, eye[1] + sgn * 2, COL.light, 1.5));
    // Where we think the light came from: straight back along the arriving ray.
    s.append(line(bend[0], bend[1], 30, 100 + sgn * 34 * (340 / 170), COL.light, 1, { 'stroke-dasharray': '3 3', opacity: 0.6 }));
  }
  s.append(
    svg('ellipse', { cx: far[0], cy: far[1], rx: 9, ry: 5, fill: '#9fc3ff' }),
    svg('ellipse', { cx: lens[0], cy: lens[1], rx: 18, ry: 9, fill: '#e9c98a' }),
    svg('circle', { cx: eye[0], cy: eye[1], r: 5, fill: COL.earth }),
    small(far[0], far[1] + 20, 'far galaxy', { anchor: 'middle', fill: '#ece6d8' }),
    small(lens[0], lens[1] + 4, 'near galaxy', { anchor: 'middle', fill: COL.ink, bold: true }), small(lens[0], 160, 'its mass bends the light', { anchor: 'middle', fill: '#ece6d8', halo: COL.sky }),
    small(eye[0], eye[1] + 18, 'us', { anchor: 'middle', fill: '#ece6d8' }),
    small(36, 26, 'dashed: where the light seems to come from', { fill: '#a9adc2' }),
    note(14, 190, 'Lined up exactly, the far galaxy is seen as a ring round the near one.', { fill: '#ece6d8' }),
  );
  // The view from us, inset: a ring.
  s.append(svg('circle', { cx: 340, cy: 40, r: 22, fill: 'none', stroke: '#9fc3ff', 'stroke-width': 4, opacity: 0.85 }), svg('circle', { cx: 340, cy: 40, r: 6, fill: '#e9c98a' }), small(340, 76, 'what we see', { anchor: 'middle', fill: '#ece6d8' }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
