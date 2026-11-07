// Lesson 7, What a wave knows about the wind: water going round in circles
// under a passing wave (and flattening as the bottom comes near), how wind
// speed, fetch and duration each cap the waves, and an ebb current steepening
// waves until they break, as at Point Wilson.

import { svg } from 'didactics/dom';
import { arrow, label, line, polyline, redraw, small, type P } from 'didactics/draw';
import { COL, animate, figure, frame, guessFirst, slider, tint } from './kit';

const W = 400;
export const G = 9.81;
const TAU = 2 * Math.PI;

// ---- Period, wavelength and speed -------------------------------------------------------------

/** Speed of a deep-water wave of period `T` seconds, in m/s: gT/2π, about 1.56 m/s per second. */
export const deepSpeed = (T: number) => (G * T) / TAU;

/** Wavelength of a deep-water wave of period `T`, in metres: gT²/2π. */
export const deepLength = (T: number) => (G * T * T) / TAU;

/** Speed of a wave in water `h` metres deep when the water is shallow for it: √(g h). */
export const shallowSpeed = (h: number) => Math.sqrt(G * h);

/**
 * The wave number k (2π over the wavelength) of a wave of period `T` in water
 * `h` deep, from ω² = g k tanh(k h), solved by Newton's method.
 */
export function waveNumber(T: number, h: number): number {
  const w = TAU / T;
  let k = Math.max((w * w) / G, w / Math.sqrt(G * h));
  for (let i = 0; i < 40; i++) {
    const th = Math.tanh(k * h);
    const f = G * k * th - w * w;
    const df = G * th + G * k * h * (1 - th * th);
    const next = k - f / df;
    if (Math.abs(next - k) < 1e-12 * k) return next;
    k = next;
  }
  return k;
}

/** Speed of a wave of period `T` in water `h` deep, any depth. */
export const waveSpeed = (T: number, h: number) => TAU / T / waveNumber(T, h);

/** Wavelength of a wave of period `T` in water `h` deep. */
export const waveLength = (T: number, h: number) => TAU / waveNumber(T, h);

/**
 * How far a water parcel at depth `z` below the surface goes round, as shares
 * of the surface's swing [across, up and down], for wave number `k` in water
 * `h` deep: cosh and sinh of k(h - z) over sinh(k h). In deep water both are
 * e^(-k z), so the circles shrink by e^(-π), about 4%, half a wavelength down.
 */
export function orbit(k: number, h: number, z: number): [number, number] {
  if (k * h > 18) {
    const e = Math.exp(-k * z);
    return [e, e];
  }
  const s = Math.sinh(k * h);
  return [Math.cosh(k * (h - z)) / s, Math.sinh(k * (h - z)) / s];
}

const m1 = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));

export const orbitsFigure = figure(['reach', 'shallow'], (ctx, t) => {
  const f = frame(W, 226, 3);
  const g = svg('g');
  f.svg.append(g);
  let T = 6;
  let h = 80;
  let phase = 0;
  const top = 58;
  const room = 140;
  const AMP = 11;
  const paint = () => {
    const k = waveNumber(T, h);
    const L = TAU / k;
    const c = waveSpeed(T, h);
    const s = 300 / L; // one wavelength across 300 px
    // Shallow water is drawn deeper than true (at least 60 px), so the layer and its loops can be seen.
    const v = Math.min(8, Math.max(1, 60 / (h * s)));
    const sv = s * v;
    const floor = top + h * sv;
    const amp = Math.min(AMP, 0.3 * h * sv);
    const showFloor = floor < top + room + 8;
    const parts: SVGElement[] = [];
    // The surface, and the water under it.
    const surf: P[] = [];
    for (let x = 0; x <= W; x += 4) surf.push([x, top - amp * Math.cos((TAU * x) / 300 - phase)]);
    const bottomY = showFloor ? floor : top + room + 12;
    parts.push(svg('path', { d: `M0,${bottomY} L${surf.map((p) => p.join(',')).join(' L')} L${W},${bottomY} Z`, fill: tint(COL.salt, 0.13) }));
    parts.push(polyline(surf, COL.salt, 2));
    if (showFloor) parts.push(svg('rect', { x: 0, y: floor, width: W, height: 230 - floor, fill: tint(COL.sediment, 0.45) }), line(0, floor, W, floor, COL.sediment, 2));
    // Water parcels: each goes round its own small loop.
    for (let zp = 0; zp <= room; zp += 20) {
      if (showFloor && top + zp > floor - 4) break;
      const [a, b] = orbit(k, h, zp / sv);
      const A = Math.min(3 * amp, amp * a);
      const B = amp * b;
      for (let x0 = 25; x0 < W; x0 += 50) {
        if (x0 === 225 && zp === 0) continue;
        const th = (TAU * x0) / 300 - phase;
        const y0 = top + zp;
        if (A > 0.6) parts.push(svg('ellipse', { cx: x0, cy: y0, rx: A, ry: Math.max(0.3, B), fill: 'none', stroke: tint(COL.salt, 0.35), 'stroke-width': 0.8 }));
        parts.push(svg('circle', { cx: x0 - A * Math.sin(th), cy: y0 - B * Math.cos(th), r: 3, fill: COL.salt }));
      }
    }
    // The bottle rides the surface at x = 225.
    const th = (TAU * 225) / 300 - phase;
    const [ba] = orbit(k, h, 0);
    const bx = 225 - Math.min(3 * amp, amp * ba) * Math.sin(th);
    const by = top - amp * Math.cos(th);
    parts.push(
      svg('rect', { x: bx - 4, y: by - 13, width: 8, height: 15, rx: 3, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.3 }),
      svg('rect', { x: bx - 2, y: by - 17, width: 4, height: 4, fill: COL.ink }),
      small(bx + 10, by - 16, 'bottle', { soft: true }),
      arrow(260, 14, 330, 14, COL.flow, 2),
      small(336, 18, `${m1(c)} m/s`, { fill: COL.flow, bold: true }),
      small(254, 18, 'the wave moves', { anchor: 'end', fill: COL.flow }),
      small(6, 18, `period ${T} s, wavelength ${m1(L)} m`, { soft: true }),
      showFloor
        ? small(W - 6, floor + 14, `sea floor ${h} m down`, { anchor: 'end' })
        : small(W - 6, top + room + 24, `sea floor ${h} m down, far below`, { anchor: 'end', soft: true }),
    );
    redraw(g, ...parts);
    const shallow = h < L / 20;
    const deep = h >= L / 2;
    f.readout.textContent = deep
      ? `Deep water for this wave (deeper than half its ${m1(L)} m wavelength). Each parcel goes round a circle and comes back; the circles shrink with depth, and the bottom water does not move. Speed ${m1(c)} m/s, set by the period alone.`
      : shallow
        ? `Shallow for this wave: ${h} m is under a twentieth of its ${m1(L)} m wavelength. The circles have flattened into strokes back and forth, right down to the bottom, and the speed, ${m1(c)} m/s, is set by the depth alone: √(g × depth) = ${m1(shallowSpeed(h))} m/s.`
        : `The wave feels the bottom: the circles flatten into ellipses and the water by the floor slides back and forth. It slows to ${m1(c)} m/s, from ${m1(deepSpeed(T))} m/s in deep water, and its wavelength shortens to ${m1(L)} m.`;
    if (t.goal === 'reach' && !deep) t.done();
    if (t.goal === 'shallow' && shallow) t.done();
  };
  const period = slider('Wave period', 2, 14, 1, T, (v) => `${v} s`, (v) => { T = v; paint(); }, 'wind');
  const depth = slider('Water depth', { min: 1, max: 100, step: 1, scale: 'log', value: h, show: (v) => `${v} m`, onInput: (v) => { h = v; paint(); }, color: 'sediment' });
  f.controls.append(period.node, depth.node);
  paint();
  animate(f.node, ctx, (dt) => {
    phase = (phase + (TAU * dt) / (1.2 + T * 0.18)) % TAU;
    paint();
  });
  return f.node;
});

// ---- What the wind can build ------------------------------------------------------------------

export type Limit = 'fetch' | 'duration' | 'full';

export interface Sea {
  /** Significant wave height, metres. */
  height: number;
  /** Period at the peak of the spectrum, seconds. */
  period: number;
  /** What capped it. */
  limit: Limit;
  /** The heights each limit alone would allow, metres. */
  allows: Record<Limit, number>;
}

/** Metres a second in a knot. */
export const KNOT = 0.5144;

/**
 * The waves a steady wind of `wind` m/s builds over `fetchKm` of open water in
 * `hours`: a simple fetch-limited growth law of the kind fitted to the North
 * Sea measurements (JONSWAP, 1973), as the US Army Corps of Engineers' manual
 * uses it. In units scaled by the wind (x = gF/U²): height 0.0016 √x U²/g,
 * period 0.286 x^⅓ U/g. A short blow reaches only the fetch x_t =
 * (g t / 68.8 U)^1.5. Neither can pass a fully developed sea, height 0.24 U²/g
 * and period 7.15 U/g.
 */
export function windSea(wind: number, fetchKm: number, hours: number): Sea {
  const U = Math.max(0.5, wind);
  const x = (G * fetchKm * 1000) / (U * U);
  const xt = Math.pow((G * hours * 3600) / (U * 68.8), 1.5);
  const hOf = (xx: number) => 0.0016 * Math.sqrt(xx) * (U * U) / G;
  const allows: Record<Limit, number> = { fetch: hOf(x), duration: hOf(xt), full: (0.24 * U * U) / G };
  const limit = (Object.keys(allows) as Limit[]).reduce((a, b) => (allows[b] < allows[a] ? b : a));
  const xe = Math.min(x, xt);
  const period = Math.min(0.286 * Math.cbrt(xe) * U / G, (7.15 * U) / G);
  return { height: allows[limit], period, limit, allows };
}

const ft = (m: number) => Math.round(m * 3.281);
const mft = (m: number) => `${m < 1 ? m.toFixed(2) : m.toFixed(1)} m (${ft(m)} ft)`;

const WHAT: Record<Limit, string> = {
  fetch: 'Fetch',
  duration: 'Duration',
  full: 'Wind speed',
};

export const fetchFigure = figure(['every'], (_ctx, t) => {
  const f = frame(W, 196, 3);
  const g = svg('g');
  f.svg.append(g);
  let kn = 30;
  let km = 40;
  let hours = 12;
  const seen = new Set<Limit>();
  const paint = () => {
    const sea = windSea(kn * KNOT, km, hours);
    const L = deepLength(sea.period);
    // The waves to scale across (250 m wide), three times taller than true.
    const sx = 388 / 250;
    const sy = sx * 3;
    const mid = 52;
    const pts: P[] = [];
    for (let x = 6; x <= 394; x += 2) pts.push([x, mid - (sea.height / 2) * sy * Math.cos((TAU * (x - 6)) / sx / L)]);
    const wave = [
      svg('path', { d: `M6,98 L${pts.map((p) => p.join(',')).join(' L')} L394,98 Z`, fill: tint(COL.salt, 0.15) }),
      polyline(pts, COL.salt, 2),
      small(6, 112, 'Across: 250 m, to scale. Up and down: three times true size.', { soft: true }),
    ];
    // Three bars: the height each limit alone would allow, on a ratio scale from 0.1 m to 20 m.
    const X = (m: number) => 120 + (Math.log(Math.max(0.1, Math.min(20, m)) / 0.1) / Math.log(200)) * 210;
    const bars: SVGElement[] = [];
    (['full', 'fetch', 'duration'] as Limit[]).forEach((k, i) => {
      const y = 126 + i * 22;
      const on = k === sea.limit;
      const col = k === 'full' ? COL.wind : k === 'fetch' ? COL.salt : COL.soft;
      bars.push(
        small(114, y + 10, k === 'full' ? 'Wind speed allows' : k === 'fetch' ? 'Fetch allows' : 'Duration allows', { anchor: 'end', bold: on }),
        svg('rect', { x: 120, y, width: Math.max(2, X(sea.allows[k]) - 120), height: 13, rx: 2, fill: on ? col : tint(col, 0.35) }),
        small(X(sea.allows[k]) + 4, y + 10, `${sea.allows[k] < 1 ? sea.allows[k].toFixed(2) : sea.allows[k].toFixed(1)} m${on ? '  ← the limit' : ''}`, { bold: on }),
      );
    });
    redraw(g, ...wave, ...(open() ? bars : [small(120, 150, 'The three limits show once you have guessed.', { soft: true })]), label(6, 14, `Waves ${mft(sea.height)} high, period ${sea.period.toFixed(1)} s, ${Math.round(L)} m from crest to crest`, { bold: true }));
    if (!open()) return;
    seen.add(sea.limit);
    const which = sea.limit === 'fetch'
      ? `The fetch: ${km} km of water is not enough room for this wind to build bigger waves, however long it blows.`
      : sea.limit === 'duration'
        ? `The duration: in ${hours} hours the waves have not had time to grow across all ${km} km. They would keep growing if the wind held.`
        : `The wind speed: the sea is fully developed. The waves move about as fast as the wind and take no more from it, so more fetch or time adds nothing.`;
    const left = (['fetch', 'duration', 'full'] as Limit[]).filter((l) => !seen.has(l)).map((l) => WHAT[l].toLowerCase());
    f.readout.textContent = `${which}${left.length ? ` Still to find a setting where it is ${left.join(' or ')}.` : ''}`;
    if (seen.size === 3) t.done();
  };
  const wind = slider('Wind', 5, 60, 1, kn, (v) => `${v} kn (${Math.round(v * KNOT)} m/s)`, (v) => { kn = v; paint(); }, 'wind');
  const fetch = slider('Fetch', { min: 1, max: 2000, step: 1, scale: 'log', value: km, show: (v) => `${v} km`, onInput: (v) => { km = v; paint(); }, color: 'salt' });
  const dur = slider('Duration', { min: 1, max: 72, step: 1, scale: 'log', value: hours, show: (v) => `${v} h`, onInput: (v) => { hours = v; paint(); }, color: 'soft' });
  f.controls.append(wind.node, fetch.node, dur.node);
  const open = guessFirst(t, f, {
    ask: 'A 30-knot southerly has blown for 12 hours up the main basin of Puget Sound, about 40 km of open water. What sets the size of its waves?',
    options: ['The wind speed', 'The fetch', 'How long it has blown'],
    answer: 1,
    sliders: [wind, fetch, dur],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Against the current ----------------------------------------------------------------------

/** The wave in the ebb figure: a 4-second wind sea, 0.8 m high in still water. */
export const EBB_WAVE = { period: 4, height: 0.8 } as const;

/** Waves break when their height passes about a seventh of their length. */
export const BREAK_STEEPNESS = 1 / 7;

/**
 * A deep-water wave of period `T` meeting a current of `U` m/s (negative runs
 * against the waves). The wave keeps its period as seen from the shore, so it
 * shortens and, keeping its flow of energy, grows (Longuet-Higgins and
 * Stewart, 1961): c/c0 = (1 + √(1 + 4U/c0)) / 2 and H/H0 = c0 / √(c (c + 2U)).
 * `blocked` when the current is faster than the waves can carry energy upstream.
 */
export function onCurrent(T: number, U: number): { length: number; height: number; blocked: boolean } {
  const c0 = deepSpeed(T);
  const d = 1 + (4 * U) / c0;
  if (d <= 0) return { length: 0, height: Infinity, blocked: true };
  const c = (c0 / 2) * (1 + Math.sqrt(d));
  const q = c * (c + 2 * U);
  if (q <= 0) return { length: 0, height: Infinity, blocked: true };
  return { length: (c / c0) ** 2, height: c0 / Math.sqrt(q), blocked: false };
}

/** The steepness (height over length) of the ebb figure's wave on a current of `U` m/s. */
export function ebbSteepness(U: number): number {
  const r = onCurrent(EBB_WAVE.period, U);
  if (r.blocked) return Infinity;
  return (EBB_WAVE.height * r.height) / (deepLength(EBB_WAVE.period) * r.length);
}

export const ebbFigure = figure(['break'], (ctx, t) => {
  const f = frame(W, 176, 3);
  const g = svg('g');
  f.svg.append(g);
  let ebb = 0;
  let phase = 0;
  const L0 = deepLength(EBB_WAVE.period);
  const paint = () => {
    const U = -ebb * KNOT;
    const r = onCurrent(EBB_WAVE.period, U);
    const steep = ebbSteepness(U);
    const breaking = steep >= BREAK_STEEPNESS;
    const H = EBB_WAVE.height * Math.min(r.height, 4);
    const L = L0 * Math.max(r.length, 0.2);
    // 400 px for 100 m across; up and down drawn four times true size.
    const sx = 4;
    const sy = sx * 4;
    const mid = 80;
    const pts: P[] = [];
    for (let x = 0; x <= W; x += 2) {
      const th = (TAU * x) / (L * sx) - phase;
      // A crest sharpens as the wave steepens (a second harmonic, as real crests do).
      const sharp = Math.min(0.45, steep * 3);
      pts.push([x, mid - (H / 2) * sy * (Math.cos(th) + sharp * Math.cos(2 * th))]);
    }
    const parts: SVGElement[] = [
      svg('path', { d: `M0,150 L${pts.map((p) => p.join(',')).join(' L')} L${W},150 Z`, fill: tint(COL.salt, 0.15) }),
      polyline(pts, COL.salt, 2),
    ];
    if (breaking) {
      for (let x = 0; x <= W; x += 2) {
        const th = (TAU * x) / (L * sx) - phase;
        const k = Math.round(th / TAU);
        if (Math.abs(th - k * TAU) < (TAU * 2) / (L * sx)) {
          const y = pts[x / 2][1];
          parts.push(svg('path', { d: `M${x - 7},${y + 2} Q${x},${y - 7} ${x + 7},${y + 3}`, fill: 'none', stroke: COL.paper, 'stroke-width': 3 }), svg('path', { d: `M${x - 7},${y + 2} Q${x},${y - 7} ${x + 7},${y + 3}`, fill: 'none', stroke: COL.ink, 'stroke-width': 1 }));
        }
      }
    }
    // The wind from the west, the ebb from the east.
    parts.push(arrow(10, 16, 70, 16, COL.wind, 2), small(76, 20, 'westerly wind, waves moving east', { fill: COL.wind }));
    const n = Math.round(ebb * 2);
    for (let i = 0; i < n; i++) {
      const y = 116 + (i % 3) * 12;
      const x = 360 - Math.floor(i / 3) * 70 - (i % 3) * 18;
      parts.push(arrow(x, y, x - 22 - ebb * 6, y, COL.flow, 1.8));
    }
    parts.push(small(W - 6, 170, ebb === 0 ? 'slack water' : `ebb ${ebb.toFixed(1)} knots, running west`, { anchor: 'end', fill: COL.flow, bold: true }));
    parts.push(small(6, 170, `height ${H.toFixed(1)} m, length ${Math.round(L)} m, 1 in ${Math.round(1 / Math.min(steep, 1))}`, { soft: true }));
    redraw(g, ...parts);
    if (!open()) return;
    f.readout.textContent = ebb === 0
      ? `Slack water: a 4-second sea ${EBB_WAVE.height} m high and ${Math.round(L0)} m long, one in ${Math.round(1 / steep)} steep. Run the ebb against it.`
      : breaking
        ? `Against ${ebb.toFixed(1)} knots of ebb the waves are ${r.height.toFixed(1)} times higher and ${Math.round(r.length * 100)}% as long: steeper than about one in seven, so the crests topple. The same wind on slack water made an easy sea.`
        : `Against ${ebb.toFixed(1)} knots of ebb the waves keep their period but shorten to ${Math.round(r.length * 100)}% of their length, and grow ${r.height.toFixed(1)} times higher to carry the same energy. One in ${Math.round(1 / steep)} steep.`;
    if (breaking) t.done();
  };
  const cur = slider('Ebb current', 0, 3, 0.1, 0, (v) => `${v.toFixed(1)} kn`, (v) => { ebb = Math.round(v * 10) / 10; paint(); }, 'flow');
  f.controls.append(cur.node);
  const open = guessFirst(t, f, {
    ask: 'A 4-second sea, 0.8 m high, runs into an ebb flowing against it. How fast must the ebb run before the waves begin to break?',
    options: ['Under half a knot', 'About two knots', 'About ten knots'],
    answer: 1,
    sliders: [cur],
    after: () => paint(),
  });
  paint();
  animate(f.node, ctx, (dt) => {
    phase = (phase + (TAU * dt) / 2.4) % TAU;
    paint();
  });
  return f.node;
});

export const figures = {
  'waves-orbits': orbitsFigure,
  'waves-fetch': fetchFigure,
  'waves-ebb': ebbFigure,
};

