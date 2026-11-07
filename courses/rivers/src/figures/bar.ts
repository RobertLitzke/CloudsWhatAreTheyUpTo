// C3, The bar at the mouth: swell steepening as it meets the ebb over the
// Columbia bar, through a tide, with the bar open, rough or breaking (live,
// guess first); and a plan of the mouth with its jetties, spits and channel
// (still).

import { svg } from 'didactics/dom';
import { arrow, label, line, polyline, redraw, small, still, type P } from 'didactics/draw';
import { COL, animate, figure, frame, guessFirst, player, slider, tint, type FigureFactory } from './kit';

const W = 400;
const G = 9.81;
const pts = (p: readonly P[]) => p.map((q) => q.join(',')).join(' ');

// ---- Waves on a current ------------------------------------------------------------------------------

/** The wave's frequency relative to the moving water, for wavenumber k in depth h: σ² = g k tanh(kh). */
const sigma = (k: number, h: number) => Math.sqrt(G * k * Math.tanh(k * h));
/** Group speed relative to the water: how fast a wave's energy moves through it. */
export function groupSpeed(k: number, h: number): number {
  const kh = k * h;
  const n = 0.5 * (1 + (2 * kh) / Math.sinh(2 * kh));
  return n * (sigma(k, h) / k);
}

/**
 * The wavenumber (radians per metre) of a wave of period T seconds in water h
 * metres deep running at U m/s along the wave's direction (negative: against
 * it, as the ebb meets incoming swell). The frequency seen from the ground
 * stays the same: ω = σ + kU. Returns null when the current is strong enough
 * to stop the waves' energy from getting through (the waves are blocked and
 * break).
 */
export function waveNumber(T: number, h: number, U: number): number | null {
  const w = (2 * Math.PI) / T;
  const f = (k: number) => sigma(k, h) + k * U - w;
  // Against a current, f rises, peaks where the energy stands still (cg + U = 0), then falls.
  let top = 50;
  if (U < 0) {
    let lo = 1e-6;
    let hi = 50;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (groupSpeed(mid, h) + U > 0) lo = mid;
      else hi = mid;
    }
    top = lo;
    if (f(top) < 0) return null;
  }
  let lo = 1e-6;
  let hi = top;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface BarWaves {
  /** Wave height over the bar, m (the significant height, as forecasts give it). */
  height: number;
  /** Crest to crest, m. */
  length: number;
  /** Height over length. */
  steepness: number;
  /** The steepest a wave can be here before it breaks (Miche: 0.142 tanh kh). */
  limit: number;
  /** The biggest waves (about 1.8 times the significant height) as a share of the breaking limit. */
  big: number;
  blocked: boolean;
}

/** How much bigger than the significant height the highest waves in a few hundred run. */
export const BIGGEST = 1.8;

/**
 * Swell of height H0 and period T arriving from deep water with no current,
 * crossing water h deep that runs at U. Its energy flux, counted as wave
 * action (energy over the relative frequency, carried at cg + U), is kept,
 * so a wave slowed by an opposing current grows.
 */
export function overBar(H0: number, T: number, h: number, U: number): BarWaves {
  const w = (2 * Math.PI) / T;
  const cg0 = (G * T) / (4 * Math.PI);
  const k = waveNumber(T, h, U);
  if (k === null) return { height: Infinity, length: 0, steepness: Infinity, limit: 0, big: Infinity, blocked: true };
  const s = sigma(k, h);
  const cg = groupSpeed(k, h);
  const height = H0 * Math.sqrt((cg0 / w) / ((cg + U) / s));
  const length = (2 * Math.PI) / k;
  const limit = 0.142 * Math.tanh(k * h);
  const steepness = height / length;
  // The biggest waves break on steepness, or on depth (about 0.78 of it).
  const big = Math.max((BIGGEST * steepness) / limit, (BIGGEST * height) / (0.78 * h));
  return { height, length, steepness, limit, big, blocked: false };
}

/** What the bar is like for a small boat, from the biggest waves' share of the breaking limit. */
export function barState(b: Pick<BarWaves, 'big' | 'blocked'>): 'open' | 'rough' | 'breaking' {
  if (b.blocked || b.big >= 1) return 'breaking';
  if (b.big >= 0.6) return 'rough';
  return 'open';
}

/** The model bar: its depth (m), the swell's period (s), the tide's own current (m/s) and the tide's length (h). */
export const BAR = { depth: 12, period: 10, tide: 1.8, hours: 12.4 };

/** The surface current over the bar at `hour` after low water (positive: flood, running in), with the river's outflow `river` m/s added to the ebb. */
export const barCurrent = (hour: number, river: number) => BAR.tide * Math.sin((2 * Math.PI * hour) / BAR.hours) - river;

/** The river's push on the surface current over the bar, m/s, for a flow in m³/s (a model: the fresh water spreads out over the salt in a thin layer). */
export const riverPush = (q: number) => q / 20000;

/** m/s to knots. */
export const KNOTS = 1.9438;

export const barFigure = figure(['closed'], (ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  const sea = svg('g');
  f.svg.append(g, sea);
  let hour = 2;
  let swell = 2;
  let river = 7000;
  let phase = 0;
  // Along the section: offshore at the left, the bar, then inside the mouth. x in drawing units.
  const depthAt = (x: number) => {
    const bar = 230;
    if (x < bar) return 26 - (26 - BAR.depth) * Math.min(1, Math.max(0, (x - 40) / (bar - 40))) ** 1.4;
    return BAR.depth + (18 - BAR.depth) * Math.min(1, (x - bar) / 120);
  };
  // The ebb or flood runs strongest in the mouth and fades offshore.
  const share = (x: number) => Math.min(1, Math.max(0, (x - 60) / 190));
  const SURF = 70;
  /** Waves are drawn taller than the depths: drawing units per metre of wave height. */
  const WAVE = 8;
  const ZY = (m: number) => SURF + m * 4.2;
  const X0 = 6;
  const X1 = 394;
  const paint = () => {
    const U = barCurrent(hour, riverPush(river));
    const bed: P[] = [];
    for (let x = X0; x <= X1; x += 4) bed.push([x, ZY(depthAt(x))]);
    redraw(g,
      svg('polygon', { points: pts([[X0, SURF], ...bed.map(([x, y]): P => [x, y]), [X1, SURF]]), fill: tint(COL.salt, 0.18) }),
      svg('polygon', { points: pts([...bed, [X1, 200], [X0, 200]]), fill: tint(COL.sediment, 0.6) }),
      small(X0 + 4, 196, 'Pacific', { soft: true }),
      small(230, ZY(BAR.depth) + 14, 'the bar', { anchor: 'middle', fill: COL.sediment, bold: true }),
      small(X1 - 4, 196, 'river mouth', { anchor: 'end', soft: true }),
      ...currentArrows(U),
    );
    paintSea();
    if (!open()) return;
    const b = overBar(swell, BAR.period, BAR.depth, U);
    const state = barState(b);
    const flowing = Math.abs(U) < 0.15 ? 'slack water' : U > 0 ? `flood tide running in at ${(U * KNOTS).toFixed(1)} knots` : `ebb tide running out at ${(-U * KNOTS).toFixed(1)} knots`;
    const waves = b.blocked ? 'the ebb stops the swell outright and it breaks' : `the ${swell.toFixed(1)} m swell is ${b.height.toFixed(1)} m over the bar, ${Math.round(b.length)} m crest to crest`;
    const verdict = state === 'open' ? 'Bar open.' : state === 'rough' ? 'Rough: small boats should wait.' : 'Breaking: the bar is closed to small boats.';
    f.readout.textContent = `Hour ${hour.toFixed(1)} after low water, ${flowing}: ${waves}. ${verdict}`;
    if (state === 'breaking' && swell <= 3 && t.goal === 'closed') t.done();
  };
  const currentArrows = (U: number): SVGElement[] => {
    if (Math.abs(U) < 0.15) return [small(300, 150, 'slack', { anchor: 'middle', fill: COL.flow })];
    const out: SVGElement[] = [];
    for (const x of [180, 260, 340]) {
      const len = 14 * Math.abs(U) * share(x) + 4;
      const y = SURF + 40;
      out.push(U > 0 ? arrow(x - len / 2, y, x + len / 2, y, COL.flow, 1.6) : arrow(x + len / 2, y, x - len / 2, y, COL.flow, 1.6));
    }
    out.push(small(160, SURF + 44, U > 0 ? 'flood tide' : 'ebb tide', { anchor: 'end', fill: COL.flow, bold: true }));
    return out;
  };
  const paintSea = () => {
    const U = barCurrent(hour, riverPush(river));
    // Each column: the local wave, from the local depth and current. Metres along the section per drawing unit.
    const per = 3;
    const surf: P[] = [];
    const foam: SVGElement[] = [];
    let k0 = 0;
    let gone = false;
    let ph = phase;
    for (let x = X0; x <= X1; x += 2) {
      const h = depthAt(x);
      const u = U * share(x);
      const b = overBar(swell, BAR.period, h, u);
      const k = waveNumber(BAR.period, h, u);
      if (k === null || b.blocked) gone = true;
      const kk = k ?? k0;
      k0 = kk;
      ph += kk * per * 2;
      let H = gone ? 0.4 : b.height;
      const breaking = gone || barState(b) === 'breaking';
      if (breaking && !gone) H = Math.min(H, (b.limit * b.length) / 1.2);
      const eta = (H / 2) * Math.cos(ph) * WAVE;
      surf.push([x, SURF - eta]);
      if (breaking && Math.cos(ph) > 0.92) foam.push(svg('circle', { cx: x, cy: SURF - eta - 1, r: 2.2, fill: COL.paper, stroke: COL.salt, 'stroke-width': 0.5 }));
    }
    redraw(sea,
      polyline(surf, COL.salt, 1.6),
      ...foam,
      small(X0 + 4, SURF - 26, 'swell from the ocean', { fill: COL.wind }),
      arrow(X0 + 104, SURF - 29, X0 + 124, SURF - 29, COL.wind, 1.4),
    );
  };
  animate(f.svg, ctx, (dt) => {
    phase -= ((2 * Math.PI) / BAR.period) * dt * 0.6;
    paintSea();
  });
  const hours = slider('Hours after low water', 0, 12.4, 0.2, hour, (v) => v.toFixed(1), (v) => { hour = v; paint(); }, 'flow');
  const play = player(hours, ctx, { seconds: 14 });
  const sw = slider('Swell offshore', 0.5, 6, 0.5, swell, (v) => `${v.toFixed(1)} m`, (v) => { swell = v; paint(); }, 'wind');
  const rv = slider('River', 3000, 15000, 1000, river, (v) => `${(v / 1000).toFixed(0)},000 m³/s`, (v) => { river = v; paint(); }, 'water');
  f.controls.append(play.node, hours.node, sw.node, rv.node);
  const open = guessFirst(t, f, {
    ask: 'The same 2 m swell rolls in from the Pacific all day. When is the Columbia bar worse to cross?',
    options: ['On the flood tide, as the sea runs in', 'On the ebb tide, as the river runs out', 'No difference: the waves come from the sea'],
    answer: 1,
    sliders: [hours, sw, rv],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The mouth from above (still) ---------------------------------------------------------------------

export const mouthStill = () => {
  const s = still(W, 270);
  const parts: SVGElement[] = [];
  // Sea to the west (left), the river from the east. Washington to the north, Oregon to the south.
  parts.push(
    svg('rect', { x: 0, y: 0, width: W, height: 252, fill: tint(COL.salt, 0.22) }),
    // The river, widening into the estuary.
    svg('path', { d: 'M196,70 C250,78 320,66 400,74 L400,190 C320,186 260,196 196,178 Z', fill: tint(COL.water, 0.5) }),
    // Washington: Cape Disappointment and North Head, Benson Beach and the Long Beach peninsula.
    svg('path', { d: 'M400,0 L170,0 C164,20 158,36 172,52 C180,60 190,62 200,70 C250,76 320,64 400,72 Z', fill: COL.land }),
    svg('path', { d: 'M170,0 C150,20 146,40 160,56 L172,52 C158,36 164,20 170,0 Z', fill: tint(COL.sediment, 0.8) }),
    // Oregon: Clatsop Spit and the beach running south.
    svg('path', { d: 'M400,192 C330,186 260,198 200,182 C186,178 176,182 168,196 C160,214 156,234 150,252 L400,252 Z', fill: COL.land }),
    svg('path', { d: 'M200,182 C186,178 176,182 168,196 L150,252 L136,252 C142,226 150,200 166,186 C178,176 190,176 200,182 Z', fill: tint(COL.sediment, 0.8) }),
    // The ebb-tidal delta: the bar, an arc of shoals off the mouth.
    svg('path', { d: 'M70,50 C40,80 40,140 72,170 C88,140 88,78 70,50 Z', fill: tint(COL.sediment, 0.45) }),
    // Jetties.
    line(172, 56, 122, 86, COL.works, 4),
    line(196, 66, 186, 82, COL.works, 3.5),
    line(176, 186, 92, 128, COL.works, 4),
    // The channel.
    svg('path', { d: 'M400,128 C330,126 240,122 170,120 C140,118 120,110 104,106 L10,100', fill: 'none', stroke: COL.ink, 'stroke-width': 1, 'stroke-dasharray': '5 4' }),
  );
  const halo = COL.paper;
  parts.push(
    small(290, 22, 'Washington', { anchor: 'middle', bold: true }),
    small(290, 236, 'Oregon', { anchor: 'middle', bold: true }),
    small(300, 114, 'Columbia River', { anchor: 'middle', fill: COL.salt, bold: true }),
    small(186, 14, 'Cape Disappointment', { anchor: 'end', halo }),
    small(148, 40, 'Peacock Spit', { anchor: 'end', fill: COL.sediment, bold: true, halo }),
    small(118, 80, 'North Jetty', { anchor: 'end', fill: COL.works, bold: true, halo }),
    small(204, 96, 'Jetty A', { fill: COL.works }),
    small(136, 150, 'South Jetty', { anchor: 'middle', fill: COL.works, bold: true, halo, attrs: { transform: 'rotate(34.6 136 150)' } }),
    small(146, 222, 'Clatsop Spit', { anchor: 'end', fill: COL.sediment, bold: true, halo }),
    small(66, 186, 'the bar', { anchor: 'middle', fill: COL.sediment, bold: true, halo }),
    small(8, 94, 'ship channel', { soft: true }),
    small(8, 244, 'Pacific Ocean', { fill: COL.salt, bold: true }),
    arrow(14, 210, 40, 204, COL.wind, 1.4), arrow(10, 62, 36, 68, COL.wind, 1.4), small(10, 56, 'swell', { fill: COL.wind }),
    arrow(250, 144, 210, 144, COL.flow, 1.6), small(254, 147, 'ebb', { fill: COL.flow }),
    line(372, 104, 372, 80, COL.ink, 1), small(372, 76, 'N', { anchor: 'middle', bold: true }),
    label(W / 2, 266, 'The mouth of the Columbia, from above: a sketch, not a chart.', { anchor: 'middle', size: 'small', soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

export const figures: Record<string, FigureFactory> = {
  'bar-waves': barFigure,
  'bar-mouth': mouthStill,
};
