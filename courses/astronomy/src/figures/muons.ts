// Lesson 13, Muons that live too long: a clock made of light, seen from the
// train and from the ground; muons falling down Mount Washington, counted with
// and without slow clocks; and the light cone, a map of place against time.

import { svg } from 'didactics/dom';
import { arrow, line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider, toggles } from './kit';

const W = 400;

/** How much slower a clock moving at `v` (a fraction of light's speed) ticks, as seen by someone it passes. */
export const slowing = (v: number) => 1 / Math.sqrt(1 - v * v);

/** A muon's average life at rest, microseconds. */
export const MUON_LIFE = 2.2;
/** Mount Washington's summit above the sea-level station, metres (Frisch and Smith, 1963). */
export const DROP = 1907;
/** Muons an hour Frisch and Smith counted at the summit, and at sea level. */
export const SUMMIT = 563;
export const SEA = 408;

/** Of `SUMMIT` muons, how many reach sea level at speed `v`, with or without slow clocks. */
export function survivors(v: number, einstein: boolean): number {
  const travel = DROP / (v * 299.792458); // microseconds
  return SUMMIT * Math.exp(-travel / (MUON_LIFE * (einstein ? slowing(v) : 1)));
}

/** Pick exactly one of a row of chips. */
function oneOf(names: string[], first: number, onPick: (i: number) => void) {
  let at = first;
  const row = toggles(names, names.map((_, i) => i === first), (on) => {
    const k = on.findIndex((v, i) => v && i !== at);
    at = k >= 0 ? k : at;
    names.forEach((_, i) => row.set(i, i === at));
    onPick(at);
  });
  return row;
}

// ---- The light clock (live) ---------------------------------------------------------------

export const lightClockFigure = figure(['clock'], (_ctx, t) => {
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let v = 0.3;
  let guessed = false;
  const paint = () => {
    const k = slowing(v);
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    // Riding along: light goes straight up and down.
    parts.push(note(16, 18, 'On the train', { bold: true }), small(16, 31, 'light goes up and down', { soft: true }));
    const mx = 70;
    parts.push(line(mx - 22, 46, mx + 22, 46, COL.ink, 3), line(mx - 22, 116, mx + 22, 116, COL.ink, 3), arrow(mx - 5, 113, mx - 5, 50, COL.light, 2), arrow(mx + 5, 50, mx + 5, 113, COL.light, 2));
    parts.push(small(16, 132, 'one tick: one trip up and down', { soft: true }));
    // From the platform: the mirrors move on while the light travels, so its path is a zigzag.
    const x0 = 150;
    const x1 = 388;
    const legs = 4;
    parts.push(note(x0, 18, 'From the platform', { bold: true }), small(x0, 31, `the clock moves on at ${Math.round(v * 100)}% of light’s speed`, { soft: true }));
    // Each leg covers 70 up and 70·v/√(1−v²) along, scaled to fit the width.
    const along = (70 * v) / Math.sqrt(1 - v * v);
    const scale = Math.min(1, (x1 - x0) / Math.max(1, along * legs));
    const pts: P[] = [];
    for (let i = 0; i <= legs; i++) pts.push([x0 + along * scale * i, i % 2 ? 46 : 116]);
    const ticksShown = Math.min(legs, Math.floor((x1 - x0) / Math.max(1e-6, along * scale)));
    parts.push(polyline(pts.slice(0, ticksShown + 1), COL.light, 2));
    for (let i = 0; i <= ticksShown; i += 2) {
      const x = pts[i][0];
      parts.push(line(x - 14, 46, x + 14, 46, COL.soft, 2, { opacity: 0.45 }), line(x - 14, 116, x + 14, 116, COL.soft, 2, { opacity: 0.45 }));
    }
    if (scale < 1) parts.push(small(x1, 132, `(squeezed sideways ${sig(1 / scale, 2)} times to fit)`, { anchor: 'end', soft: true }));
    // Ticks counted against the platform's clock.
    const by = 172;
    parts.push(note(16, by, 'Ticks while the platform clock ticks 10 times', { bold: true }));
    const bar = (y: number, n: number, colour: string, text: string) => {
      parts.push(svg('rect', { x: 16, y, width: 300, height: 14, fill: COL.grid }), svg('rect', { x: 16, y, width: (300 * n) / 10, height: 14, fill: colour }));
      for (let i = 1; i < 10; i++) parts.push(line(16 + i * 30, y, 16 + i * 30, y + 14, COL.paper, 1));
      parts.push(small(324, y + 11, text, {}));
    };
    bar(by + 10, 10, COL.ink, 'platform: 10');
    bar(by + 34, 10 / k, COL.light, `train: ${sig(10 / k, 3)}`);
    parts.push(small(16, H - 6, 'Each traveller’s own watch ticks normally. Only the comparison differs.', { soft: true }));
    redraw(g, ...parts);
    if (!guessed) return;
    f.readout.textContent = `At ${Math.round(v * 100)}% of light’s speed the light’s slanted path is ${sig(k, 3)} times as long as the straight one, and light’s speed is the same for both watchers. So the platform sees the train’s clock tick once for every ${sig(k, 3)} of its own.`;
    if (v >= 0.86 && t.goal === 'clock') {
      f.readout.textContent += ' At 87% it is half speed.';
      t.done();
    }
  };
  const s = slider('Train’s speed, share of light’s', 0, 0.99, 0.01, v, (x) => `${Math.round(x * 100)}%`, (x) => { v = x; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'A train passes at 87% of the speed of light. Seen from the platform, how fast does the clock on the train tick? Guess first.',
    options: ['Almost normally', 'About half as fast', 'It stops'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Speed the train up and watch the light’s path from the platform. Take it to 87%.`;
    },
  });
  return f.node;
});

// ---- Muons down a mountain (live) -----------------------------------------------------------

export const muonRainFigure = figure(['count'], (_ctx, t) => {
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let v = 0.95;
  let einstein = false;
  let guessed = false;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    // The mountain, summit at 40, sea at 210.
    parts.push(svg('path', { d: 'M0 214 L120 214 L190 44 L215 40 L240 46 L330 214 L400 214 L400 250 L0 250 Z', fill: '#2c3350', opacity: 0.6 }), svg('rect', { x: 0, y: 214, width: W, height: 36, fill: '#25456a' }), line(0, 40, W, 40, '#a9adc2', 1, { 'stroke-dasharray': '3 3' }));
    parts.push(small(392, 34, `summit, ${big(DROP)} m: ${SUMMIT} an hour`, { anchor: 'end', fill: '#ece6d8' }), small(8, 232, `sea level: about ${Math.round(survivors(v, einstein))} an hour`, { fill: '#ece6d8' }));
    const n = survivors(v, einstein);
    // Twenty tracks: each one reaches the sea, or stops where its muon decayed.
    const share = n / SUMMIT;
    for (let i = 0; i < 20; i++) {
      const x = 196 + (i - 9.5) * 9;
      const reaches = ((i * 7) % 20) / 20 < share;
      const y1 = reaches ? 214 : 40 + 174 * ((i * 37) % 20) / 20 * (einstein ? 1 : 0.35) + 6;
      parts.push(line(x, 40, x, y1, reaches ? COL.light : '#8a8fa8', 1.5, { opacity: reaches ? 1 : 0.7 }));
      if (!reaches) parts.push(svg('circle', { cx: x, cy: y1, r: 2.2, fill: COL.planet }));
    }
    parts.push(small(392, 120, 'each line: a muon', { anchor: 'end', fill: '#a9adc2' }), small(392, 133, 'red dot: it decayed', { anchor: 'end', fill: '#a9adc2' }));
    parts.push(note(8, 18, einstein ? 'Moving clocks slowed' : 'Every clock ticking alike', { bold: true, fill: '#ece6d8' }));
    redraw(g, ...parts);
    if (!guessed) return;
    const travel = DROP / (v * 299.792458);
    const close = Math.abs(n - SEA) / SEA < 0.08;
    f.readout.textContent = `The fall takes ${sig(travel, 2)} millionths of a second, ${sig(travel / MUON_LIFE, 2)} of a muon’s lifetimes${einstein ? `, but its clock runs ${sig(slowing(v), 2)} times slow, so it ages only ${sig(travel / slowing(v), 2)}` : ''}. About ${Math.round(n)} of the ${SUMMIT} should reach the sea; Frisch and Smith counted about ${SEA}.${close ? ' A match.' : ''}`;
    if (close && einstein && t.goal === 'count') t.done();
  };
  const s = slider('Muons’ speed, share of light’s', 0.9, 0.999, 0.0005, v, (x) => `${sig(x * 100, 3)}%`, (x) => { v = x; paint(); }, 'light');
  const clocks = oneOf(['Clocks all alike', 'Moving clocks slow'], 0, (i) => { einstein = i === 1; paint(); });
  f.controls.append(s.node, clocks.node);
  paint();
  guessFirst(t, f, {
    ask: 'Of 563 muons an hour passing the summit, how many should reach sea level, 1.9 km below, if their clocks tick like ours? Guess first.',
    options: ['Nearly all of them', 'About 30', 'None at all'],
    answer: 1,
    sliders: [s],
    buttons: clocks.buttons,
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}With clocks all alike, only a few dozen survive. Now let moving clocks run slow, and find the speed that matches the count at sea level.`;
    },
  });
  return f.node;
});

const big = (n: number) => Math.round(n).toLocaleString('en-US');

// ---- The light cone (a still) ---------------------------------------------------------------

export const lightConeStill = () => {
  const H = 260;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  const cx = 200;
  const cy = 136;
  const r = 104;
  s.append(
    svg('rect', { width: W, height: H, fill: COL.paper }),
    svg('path', { d: `M${cx} ${cy} L${cx - r} ${cy - r} L${cx + r} ${cy - r} Z`, fill: COL.light, opacity: 0.22 }),
    svg('path', { d: `M${cx} ${cy} L${cx - r} ${cy + r} L${cx + r} ${cy + r} Z`, fill: COL.hot, opacity: 0.18 }),
    line(cx - r, cy - r, cx + r, cy + r, COL.light, 2),
    line(cx - r, cy + r, cx + r, cy - r, COL.light, 2),
    arrow(cx, cy + r + 8, cx, cy - r - 12, COL.ink, 1.5),
    arrow(cx - r - 40, cy, cx + r + 46, cy, COL.soft, 1.2),
    small(cx + 6, cy - r - 4, 'time', { bold: true }),
    small(cx + r + 46, cy - 6, 'place', { anchor: 'end', soft: true }),
    svg('circle', { cx, cy, r: 4.5, fill: COL.ink }),
    small(cx + 8, cy + 14, 'here, now', { bold: true }),
    note(cx, cy - 62, 'the future you can reach', { anchor: 'middle', halo: COL.paper }),
    note(cx, cy + 70, 'the past that can reach you', { anchor: 'middle', halo: COL.paper }),
    small(cx - r - 34, cy - 30, 'elsewhere:', { anchor: 'middle', soft: true }),
    small(cx - r - 34, cy - 18, 'too far to', { anchor: 'middle', soft: true }),
    small(cx - r - 34, cy - 6, 'reach in time', { anchor: 'middle', soft: true }),
    small(cx + r + 30, cy + 22, 'elsewhere', { anchor: 'middle', soft: true }),
    small(cx - r + 14, cy - r - 4, 'a flash of light', { fill: '#a87b0c', bold: true }),
    note(14, 18, 'A map of place against time. Light runs at 45°.', { bold: true }),
  );
  // A slower traveller's path stays inside the cone.
  s.append(polyline([[cx, cy], [cx + 18, cy - 40], [cx + 26, cy - 80], [cx + 22, cy - r]], COL.planet, 2), small(cx + 30, cy - 86, 'you, travelling', { fill: COL.planet }));
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
