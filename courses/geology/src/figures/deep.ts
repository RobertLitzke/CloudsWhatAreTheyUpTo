// The Deep Earth branch: Schiehallion's plumb line and a two-layer Earth (D1),
// a hidden quake found from three stations (D2), Mohorovičić's crossover (D3),
// waves traced through the Earth with a core (D4) and an inner core (D5), and
// how hot rock stops a drill (D6).

import { svg } from 'didactics/dom';
import { label, line, polyline, redraw, small, still, type P } from 'didactics/draw';
import { segmented } from 'didactics/ui';
import { arrivals, fan, R_EARTH, shadow, type EarthModel } from './rays';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;
const deg = (d: number) => (d * Math.PI) / 180;

// ---- D1: Schiehallion ---------------------------------------------------------------

/** Maskelyne's measured deflection, both stations together, seconds of arc. */
const MEASURED_ARC = 11.6;
/** Hutton's density for the mountain, and the Earth density his sums gave from the measurement. */
const HILL = 2.5;
const HUTTON = 4.5;
/** The deflection (both sides) the mountain would give if the Earth's mean density were rho. */
export const deflection = (rho: number) => (MEASURED_ARC * HUTTON) / rho;

export const plumbFigure = figure(['match'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let rho = HILL;
  const paint = () => {
    const arc = deflection(rho);
    // Drawn about 4,000 times larger than life, so the lean shows.
    const lean = deg((arc / 2 / 3600) * 4000);
    const ground = 170;
    const hill = 'M40,170 C120,165 150,60 200,55 C250,60 280,165 360,170 Z';
    const bob = (x: number, side: 1 | -1): SVGElement[] => {
      const top = 70;
      const len = 80;
      const bx = x + side * Math.sin(lean) * len;
      const by = top + Math.cos(lean) * len;
      return [
        line(x, top, x, top + len + 6, COL.soft, 0.8, { 'stroke-dasharray': '3 3' }),
        line(x, top, bx, by, COL.ink, 1.4),
        svg('circle', { cx: bx, cy: by, r: 5, fill: COL.pressure }),
        line(x - 10, top, x + 10, top, COL.ink, 2),
      ];
    };
    redraw(g,
      svg('rect', { width: W, height: 200, fill: COL.paper }),
      svg('path', { d: hill, fill: '#b7aa94' }),
      line(0, ground, W, ground, COL.soft, 1),
      ...bob(70, 1),
      ...bob(330, -1),
      small(70, 62, 'south station', { anchor: 'middle', bold: true }),
      small(330, 62, 'north station', { anchor: 'middle', bold: true }),
      small(200, 120, `Schiehallion (${HILL} g/cm³)`, { anchor: 'middle', fill: COL.paper, bold: true }),
      small(200, 190, `Each line leans ${(arc / 2).toFixed(1)}″ toward the hill; drawn 4,000 times larger`, { anchor: 'middle', soft: true }),
    );
    const near = Math.abs(arc - MEASURED_ARC) < 0.5;
    f.readout.textContent = `With the whole Earth at ${rho.toFixed(1)} g/cm³, the mountain pulls the two plumb lines apart by ${arc.toFixed(1)} seconds of arc. Maskelyne measured ${MEASURED_ARC}. ${
      near ? `A match: the Earth is about ${(rho / HILL).toFixed(1)} times as dense as the mountain, so about ${rho.toFixed(1)} g/cm³.`
      : arc > MEASURED_ARC ? 'Too much lean: the Earth must pull harder than this, so it must be denser.' : 'Too little lean: the Earth pulls too hard here, so it must be less dense than this.'}`;
    if (near && t.goal === 'match') t.done();
  };
  const s = slider('Earth’s average density', 2, 8, 0.1, rho, (v) => `${v.toFixed(1)} g/cm³`, (v) => { rho = v; paint(); }, 'pressure');
  f.controls.append(s.node);
  paint();
  return f.node;
});

// ---- D1: a two-layer Earth -----------------------------------------------------------

const MEAN = 5.51;
/** The Earth's moment of inertia as a fraction of M·R², from the wobble of its axis. */
const MOI = 0.3307;
/** Mantle density with a core of radius fraction x and density rc, so the whole Earth averages MEAN. */
export const mantleDensity = (x: number, rc: number) => (MEAN - rc * x ** 3) / (1 - x ** 3);
/** I / (M R²) for that two-layer Earth. */
export const inertia = (x: number, rc: number) => (0.4 * (mantleDensity(x, rc) * (1 - x ** 5) + rc * x ** 5)) / MEAN;

export const layersFigure = figure(['core'], (_ctx, t) => {
  const f = frame(W, 210, 4);
  const g = svg('g');
  f.svg.append(g);
  let x = 0.2;
  let rc = 5.5;
  const paint = () => {
    const rm = mantleDensity(x, rc);
    const i = inertia(x, rc);
    const ok = rm >= 3.3 && Math.abs(i - MOI) <= 0.016;
    const cx = 105;
    const cy = 105;
    const R = 92;
    const shade = (rho: number) => `hsl(25, ${Math.min(70, 20 + rho * 4)}%, ${Math.max(22, 78 - rho * 4.5)}%)`;
    // The gauge: where the moment of inertia sits between a hollow shell (0.67) and all mass at the centre (0).
    const gx = (v: number) => 230 + (v / 0.45) * 155;
    redraw(g,
      svg('rect', { width: W, height: 210, fill: COL.paper }),
      svg('circle', { cx, cy, r: R, fill: rm > 0 ? shade(rm) : '#ddd' }),
      svg('circle', { cx, cy, r: R * x, fill: shade(rc), stroke: COL.ink, 'stroke-width': 0.6 }),
      small(cx, cy + 3, `core ${rc.toFixed(1)}`, { anchor: 'middle', bold: true, fill: COL.paper, halo: shade(rc) }),
      small(cx, cy - R + 18, `mantle ${rm.toFixed(1)}`, { anchor: 'middle', bold: true, fill: COL.paper, halo: shade(Math.max(rm, 0)) }),
      label(230, 26, 'Whole Earth', { size: 'note', bold: true }),
      small(230, 42, `${MEAN} g/cm³ on average (Cavendish)`),
      small(230, 56, rm < 2.7 ? 'Mantle lighter than surface rock' : rm < 3.3 ? 'Mantle too light for its rock' : 'Mantle density plausible', { fill: rm < 3.3 ? COL.bad : COL.good, bold: true }),
      label(230, 92, 'How the mass is spread', { size: 'note', bold: true }),
      line(gx(0), 120, gx(0.45), 120, COL.soft, 2),
      ...[0, 0.1, 0.2, 0.3, 0.4].map((v) => small(gx(v), 134, v.toFixed(1), { anchor: 'middle', soft: true })),
      svg('rect', { x: gx(MOI - 0.016), y: 113, width: gx(MOI + 0.016) - gx(MOI - 0.016), height: 14, fill: COL.good, opacity: 0.3 }),
      small(gx(MOI), 108, 'measured', { anchor: 'middle', fill: COL.good, bold: true }),
      svg('circle', { cx: gx(Math.max(0, Math.min(0.45, i))), cy: 120, r: 5, fill: COL.heat }),
      small(gx(0.4), 150, 'even ball', { anchor: 'middle', soft: true }),
      small(gx(0), 150, 'all at centre', { soft: true }),
      small(230, 176, `This Earth: ${i.toFixed(3)}; real: ${MOI.toFixed(3)}`, { bold: true }),
    );
    f.readout.textContent = ok
      ? `This fits both: a core ${Math.round(x * R_EARTH)} km in radius at ${rc.toFixed(1)} g/cm³, under a mantle of ${rm.toFixed(1)}. The real core is 3,480 km in radius and averages about 11.`
      : x < 0.3 ? 'A small core barely changes anything. To raise the average to 5.5 the mantle itself must be far denser than any rock at the surface.'
      : `Mantle at ${rm.toFixed(1)} g/cm³; mass spread ${i.toFixed(3)} against the measured ${MOI}. ${i > MOI ? 'Too much mass far from the centre: make the core denser or larger.' : 'Too much mass at the centre.'}`;
    if (ok && t.goal === 'core') t.done();
  };
  const sx = slider('Core radius', 0.05, 0.9, 0.01, x, (v) => `${Math.round(v * R_EARTH).toLocaleString('en-US')} km`, (v) => { x = v; paint(); }, 'heat');
  const sr = slider('Core density', 5.5, 16, 0.1, rc, (v) => `${v.toFixed(1)} g/cm³`, (v) => { rc = v; paint(); }, 'old');
  f.controls.append(sx.node, sr.node);
  paint();
  guessFirst(t, f, {
    ask: 'Rock at the surface averages about 2.7 g/cm³, but the whole Earth averages 5.5. Where is the extra mass? Guess first.',
    options: ['Spread evenly: all the rock is denser', 'Packed at the centre', 'In a dense layer near the surface'],
    sliders: [sx, sr],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['spread evenly', 'packed at the centre', 'near the surface'][guess]}. The wobble of the Earth’s axis measures how the mass is spread. Find a core that fits both numbers.`;
    },
  });
  return f.node;
});

// ---- D2: finding a quake ---------------------------------------------------------------

/** S minus P, seconds, for each km of distance: P at 6 km/s and S at 3.5 km/s. */
export const SP_PER_KM = 1 / 3.5 - 1 / 6;
const STATIONS: { name: string; x: number; y: number }[] = [
  { name: 'A', x: 40, y: 40 },
  { name: 'B', x: 270, y: 60 },
  { name: 'C', x: 130, y: 190 },
];
/** The hidden quake, km east and north of the map's corner. */
const QUAKE: P = [190, 130];
const dist = (a: P, b: { x: number; y: number }) => Math.hypot(a[0] - b.x, a[1] - b.y);

export const epicentreFigure = figure(['found'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let trial: P = [150, 100];
  let circles = false;
  const MX = (km: number) => 12 + km * 0.72;
  const MY = (km: number) => 218 - km * 0.72;
  const paint = () => {
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 230, fill: COL.paper }),
      svg('rect', { x: MX(0), y: MY(210), width: 300 * 0.72, height: 210 * 0.72, fill: '#efe6d6' }),
      small(MX(0) + 2, MY(210) - 4, '300 km × 210 km', { soft: true }),
    ];
    for (const s of STATIONS) {
      if (circles) parts.push(svg('circle', { cx: MX(s.x), cy: MY(s.y), r: dist(QUAKE, s) * 0.72, fill: 'none', stroke: COL.pressure, 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
      parts.push(svg('polygon', { points: `${MX(s.x)},${MY(s.y) - 7} ${MX(s.x) - 6},${MY(s.y) + 4} ${MX(s.x) + 6},${MY(s.y) + 4}`, fill: COL.pressure }), small(MX(s.x) + 8, MY(s.y) + 3, s.name, { bold: true, fill: COL.pressure }));
    }
    parts.push(svg('circle', { cx: MX(trial[0]), cy: MY(trial[1]), r: 6, fill: 'none', stroke: COL.heat, 'stroke-width': 2 }), line(MX(trial[0]) - 9, MY(trial[1]), MX(trial[0]) + 9, MY(trial[1]), COL.heat, 1), line(MX(trial[0]), MY(trial[1]) - 9, MX(trial[0]), MY(trial[1]) + 9, COL.heat, 1));
    // The seismograms: P at the left edge of each strip, the recorded S, and where S would be from the trial spot.
    const X0 = 246;
    const X1 = 392;
    const ts = (sec: number) => X0 + (sec / 40) * (X1 - X0);
    STATIONS.forEach((s, k) => {
      const y = 30 + k * 66;
      const real = dist(QUAKE, s) * SP_PER_KM;
      const mine = dist(trial, s) * SP_PER_KM;
      const trace: P[] = [];
      for (let x = X0; x <= X1; x += 1) {
        const sec = ((x - X0) / (X1 - X0)) * 40;
        const pAmp = sec >= 0 ? 5 * Math.exp(-sec / 6) : 0;
        const sAmp = sec >= real ? 14 * Math.exp(-(sec - real) / 5) : 0;
        trace.push([x, y + Math.sin(sec * 9) * pAmp + Math.sin(sec * 4.3) * sAmp]);
      }
      parts.push(
        small(X0, y - 18, `Station ${s.name}`, { bold: true, fill: COL.pressure }),
        polyline(trace, COL.ink, 1),
        small(ts(0), y + 26, 'P', { anchor: 'middle', bold: true }),
        small(ts(real), y + 26, 'S', { anchor: 'middle', bold: true }),
        line(ts(Math.min(40, mine)), y - 16, ts(Math.min(40, mine)), y + 16, COL.heat, 1.5, { 'stroke-dasharray': '3 2' }),
        small(X1, y - 18, `gap ${real.toFixed(1)} s`, { anchor: 'end', soft: true }),
      );
    });
    parts.push(small(X0, 222, 'red dashes: S from your spot', { fill: COL.heat }));
    redraw(g, ...parts);
    const off = Math.hypot(trial[0] - QUAKE[0], trial[1] - QUAKE[1]);
    const found = off < 10;
    f.readout.textContent = found
      ? `Found: all three gaps match. The quake was ${Math.round(dist(QUAKE, STATIONS[0]))} km from A, ${Math.round(dist(QUAKE, STATIONS[1]))} km from B and ${Math.round(dist(QUAKE, STATIONS[2]))} km from C, about 8 km for every second of gap.`
      : `From your spot, S would arrive ${STATIONS.map((s) => `${(dist(trial, s) * SP_PER_KM).toFixed(1)} s`).join(', ')} after P at A, B and C. The records say ${STATIONS.map((s) => `${(dist(QUAKE, s) * SP_PER_KM).toFixed(1)} s`).join(', ')}. A gap too long means you are too far from that station.`;
    if (found && t.goal === 'found') t.done();
  };
  const sx = slider('East', 0, 300, 2, trial[0], (v) => `${v} km`, (v) => { trial = [v, trial[1]]; paint(); }, 'heat');
  const sy = slider('North', 0, 210, 2, trial[1], (v) => `${v} km`, (v) => { trial = [trial[0], v]; paint(); }, 'heat');
  const sc = segmented([{ value: 'off', label: 'No circles' }, { value: 'on', label: 'Distance circles' }] as const, 'off', (v) => { circles = v === 'on'; paint(); });
  f.controls.append(sx.node, sy.node, sc);
  paint();
  return f.node;
});

/** A P wave and an S wave passing along a row of particles. */
export const wavesStill = () => {
  const { node, svg: s } = still(W, 150);
  const row = (y: number, kind: 'P' | 'S'): SVGElement[] => {
    const out: SVGElement[] = [];
    for (let k = 0; k < 34; k++) {
      const x0 = 30 + k * 10;
      const ph = (k / 34) * Math.PI * 4;
      const dx = kind === 'P' ? 4 * Math.sin(ph) : 0;
      const dy = kind === 'S' ? 9 * Math.sin(ph) : 0;
      out.push(svg('circle', { cx: x0 + dx, cy: y + dy, r: 2.6, fill: kind === 'P' ? COL.pressure : COL.heat }));
    }
    out.push(
      label(30, y - 22, kind === 'P' ? 'P wave: push and pull along the way it travels' : 'S wave: shaking across the way it travels', { size: 'note', bold: true, fill: kind === 'P' ? COL.pressure : COL.heat }),
      svg('path', { d: `M${376},${y} l10,0`, stroke: COL.ink, 'stroke-width': 1.5 }),
      svg('polygon', { points: `392,${y} 385,${y - 4} 385,${y + 4}`, fill: COL.ink }),
    );
    return out;
  };
  s.append(svg('rect', { width: W, height: 150, fill: COL.paper }), ...row(45, 'P'), ...row(115, 'S'));
  s.setAttribute('aria-label', 'Two rows of particles. In the P wave they bunch up and spread out along the direction the wave travels. In the S wave they move up and down, across the direction of travel.');
  return { node };
};

// ---- D3: Mohorovičić's crossover --------------------------------------------------------

/** Mohorovičić's speeds, km/s: in the crust and below the boundary. */
const V1 = 5.6;
const V2 = 7.8;
/** His depth for the boundary, km. */
const H_1909 = 54;
const IC = Math.asin(V1 / V2);
export const direct = (x: number) => x / V1;
export const head = (x: number, h: number) => x / V2 + (2 * h * Math.cos(IC)) / V1;
export const crossover = (h: number) => 2 * h * Math.sqrt((V2 + V1) / (V2 - V1));
/** Arrivals made from his model, with a little scatter, as the "records". */
const RECORDS = [60, 110, 160, 210, 260, 320, 390, 460, 540, 620].flatMap((x, k) => {
  const jit = ((k * 37) % 7) / 7 - 0.5;
  const out: { x: number; t: number; deep: boolean }[] = [{ x, t: direct(x) + jit, deep: false }];
  if (x > 2 * H_1909 * Math.tan(IC) + 40) out.push({ x, t: head(x, H_1909) - jit, deep: true });
  return out;
});

export const mohoFigure = figure(['fit'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let h = 25;
  const X0 = 40;
  const X1 = 390;
  const xs = (km: number) => X0 + (km / 700) * (X1 - X0);
  const zs = (km: number) => 18 + km * 0.7; // depth, exaggerated about 1.4 times
  const T0 = 226;
  const tt = (sec: number) => T0 - (sec / 130) * 116;
  const paint = () => {
    const xc = crossover(h);
    const station = 520;
    const down = h * Math.tan(IC);
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 250, fill: COL.paper }),
      svg('rect', { x: X0, y: zs(0), width: X1 - X0, height: zs(h) - zs(0), fill: '#e3c9a0' }),
      svg('rect', { x: X0, y: zs(h), width: X1 - X0, height: zs(80) - zs(h), fill: '#a9b59a' }),
      small(X1 - 4, zs(h) - 4, `crust, ${V1} km/s`, { anchor: 'end' }),
      small(X1 - 4, Math.min(zs(80) - 4, zs(h) + 12), `mantle, ${V2} km/s`, { anchor: 'end' }),
      polyline([[xs(0), zs(0)], [xs(station), zs(0)]], COL.young, 2),
      polyline([[xs(0), zs(0)], [xs(down), zs(h)], [xs(station - down), zs(h)], [xs(station), zs(0)]], COL.pressure, 2),
      svg('circle', { cx: xs(0), cy: zs(0), r: 4, fill: COL.heat }),
      svg('polygon', { points: `${xs(station)},${zs(0) - 7} ${xs(station) - 5},${zs(0) + 2} ${xs(station) + 5},${zs(0) + 2}`, fill: COL.ink }),
      // The travel-time plot.
      line(X0, T0, X1, T0, COL.soft, 1), line(X0, T0, X0, T0 - 116, COL.soft, 1),
      ...[0, 200, 400, 600].map((km) => small(xs(km), T0 + 10, `${km}`, { anchor: 'middle', soft: true })),
      small(X1, T0 + 21, 'km from the quake', { anchor: 'end', soft: true }),
      ...[0, 50, 100].map((sec) => small(X0 - 4, tt(sec) + 3, `${sec} s`, { anchor: 'end', soft: true })),
      polyline([[xs(0), tt(0)], [xs(700), tt(direct(700))]], COL.young, 1.8),
      polyline([[xs(2 * down), tt(head(2 * down, h))], [xs(700), tt(head(700, h))]], COL.pressure, 1.8),
      ...RECORDS.map((r) => svg('circle', { cx: xs(r.x), cy: tt(r.t), r: 2.8, fill: 'none', stroke: COL.ink, 'stroke-width': 1.2 })),
    ];
    if (xc < 700) parts.push(line(xs(xc), tt(0) , xs(xc), tt(direct(xc)), COL.heat, 1, { 'stroke-dasharray': '3 3' }), small(xs(xc) + 3, T0 - 4, `crossover ${Math.round(xc)} km`, { fill: COL.heat, bold: true }));
    redraw(g, ...parts);
    const fits = Math.abs(h - H_1909) <= 4;
    f.readout.textContent = `Crust ${h} km thick. Waves that dive to the boundary and run along it in the faster rock overtake the direct waves ${Math.round(xc)} km from the quake. ${fits ? `That matches the records (circles): Mohorovičić’s answer was ${H_1909} km.` : xc < crossover(H_1909) ? 'In the records the deep waves overtake later than that: the boundary must be deeper.' : 'In the records the deep waves overtake sooner: the boundary must be shallower.'}`;
    if (fits && t.goal === 'fit') t.done();
  };
  const sh = slider('Crust thickness', 10, 70, 1, h, (v) => `${v} km`, (v) => { h = v; paint(); }, 'old');
  f.controls.append(sh.node);
  paint();
  guessFirst(t, f, {
    ask: 'Deep waves take a detour down to faster rock and back. If the crust were thicker, where would they start to arrive first? Guess first.',
    options: ['Nearer the quake', 'Farther from the quake', 'At the same distance'],
    sliders: [sh],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['nearer', 'farther', 'the same distance'][guess]}. Change the crust and watch the crossover.`;
    },
  });
  return f.node;
});

// ---- D4 and D5: waves through the Earth ------------------------------------------------------

function rayFigure(goal: 'shadow' | 'lehmann') {
  return figure([goal], (_ctx, t) => {
    const f = frame(W, 250, 4);
    const g = svg('g');
    f.svg.append(g);
    const inner = goal === 'lehmann';
    const m: EarthModel = { core: inner ? 3480 : 0, coreSpeed: 8, inner: 0, innerSpeed: 11.1, wave: 'P' };
    const cx = 130;
    const cy = 125;
    const R = 112;
    const k = R / R_EARTH;
    const at = (r: number, th: number): P => [cx + Math.sin(th) * r * k, cy - Math.cos(th) * r * k];
    const paint = () => {
      const rays = fan(m, 240, 20);
      const { bins, fromInner } = arrivals(rays);
      const sh = shadow(bins);
      const innerIn = fromInner.slice(110, 141).reduce((a, b) => a + b, 0);
      const parts: SVGElement[] = [
        svg('rect', { width: W, height: 250, fill: COL.paper }),
        svg('circle', { cx, cy, r: R, fill: '#efe2cc', stroke: COL.soft, 'stroke-width': 1 }),
      ];
      if (m.core > 0) parts.push(svg('circle', { cx, cy, r: m.core * k, fill: m.wave === 'S' ? '#e9c9a8' : '#e6c08f' }));
      if (m.inner > 0) parts.push(svg('circle', { cx, cy, r: m.inner * k, fill: '#cf9a5c' }));
      // Every sixth ray, coloured by where it went.
      rays.forEach((ray, i) => {
        if (i % 6 !== 3) return;
        const color = ray.inner ? COL.rose : ray.core ? COL.heat : m.wave === 'S' ? COL.old : COL.pressure;
        parts.push(polyline(ray.path.map(([r, th]) => at(r, th)), color, 0.9, { opacity: ray.lands === null ? 0.5 : 0.85 }));
      });
      // The surface from 0° to 180°: where waves arrive.
      for (let d = 0; d < 180; d++) {
        if (!bins[d]) continue;
        const [x1, y1] = at(R_EARTH * 1.04, deg(d));
        const [x2, y2] = at(R_EARTH * 1.04, deg(d + 1));
        parts.push(line(x1, y1, x2, y2, fromInner[d] && inner ? COL.rose : COL.good, 3));
      }
      if (sh) {
        const pts: P[] = [];
        for (let d = sh[0]; d <= Math.min(180, sh[1]); d++) pts.push(at(R_EARTH * 1.04, deg(d)));
        parts.push(polyline(pts, COL.bad, 3, { opacity: 0.35 }));
        const mid = at(R_EARTH * 1.17, deg((sh[0] + Math.min(180, sh[1])) / 2));
        parts.push(small(mid[0], mid[1], 'shadow', { bold: true, fill: COL.bad }));
      }
      for (const d of [0, 45, 90, 135, 180]) {
        const [x, y] = at(R_EARTH * 1.12, deg(d));
        parts.push(small(x, y + 3, `${d}°`, { anchor: d === 0 || d === 180 ? 'middle' : undefined, soft: true }));
      }
      parts.push(svg('circle', { cx, cy: cy - R, r: 4, fill: COL.ink }), small(cx - 8, cy - R - 4, 'quake', { anchor: 'end', bold: true }));
      parts.push(
        small(262, 30, 'green: waves arrive', { fill: COL.good, bold: true }),
        small(262, 44, 'red: no direct wave', { fill: COL.bad, bold: true }),
        small(262, 58, inner ? 'rose: through the inner core' : 'orange: through the core', { fill: inner ? COL.rose : COL.heat, bold: true }),
      );
      redraw(g, ...parts);
      const where = sh ? `No direct ${m.wave} waves arrive from ${sh[0]}° to ${Math.min(180, sh[1])}° away.` : `${m.wave} waves arrive everywhere around the Earth.`;
      if (!inner) {
        const good = m.wave === 'P' && sh && sh[0] >= 98 && sh[0] <= 106 && m.coreSpeed < 13;
        f.readout.textContent = m.core === 0
          ? `No core: speed only rises with depth, so every ray curves gently back up and ${m.wave} waves arrive all around the Earth.`
          : m.wave === 'S'
            ? `S waves can’t travel through liquid. Every S wave that reaches the core stops there. ${where}`
            : `${where} ${good ? 'That is the shadow Gutenberg mapped, from about 104° (here 100°) to 140°.' : m.coreSpeed >= 13.7 ? 'A core faster than the mantle above it bends waves outward instead.' : ''}`;
        if (good && t.goal === 'shadow') t.done();
      } else {
        f.readout.textContent = m.inner === 0
          ? `A liquid core alone leaves the shadow empty. ${where}`
          : `${innerIn ? `${innerIn} of these rays speed up in the inner core and land inside the old shadow, between 110° and 140°, as Lehmann’s faint waves did.` : 'The inner core is too small to bend any waves into the shadow.'} ${where}`;
        if (innerIn > 0 && m.inner >= 900 && t.goal === 'lehmann') t.done();
      }
    };
    const sliders = inner
      ? [slider('Inner core radius', 0, 2500, 20, 0, (v) => `${v.toLocaleString('en-US')} km`, (v) => { m.inner = v; paint(); }, 'rose')]
      : [
        slider('Core radius', 0, 5000, 20, 0, (v) => `${v.toLocaleString('en-US')} km`, (v) => { m.core = v; paint(); }, 'heat'),
        slider('P speed in the core', 5, 16, 0.1, 8, (v) => `${v.toFixed(1)} km/s`, (v) => { m.coreSpeed = v; paint(); }, 'pressure'),
      ];
    f.controls.append(...sliders.map((s) => s.node));
    if (!inner) f.controls.append(segmented([{ value: 'P', label: 'P waves' }, { value: 'S', label: 'S waves' }] as const, 'P', (v) => { m.wave = v; paint(); }));
    paint();
    return f.node;
  });
}

export const raysFigure = rayFigure('shadow');
export const innerFigure = rayFigure('lehmann');

/** The layers, to scale, with depths and what they are made of. */
export const earthStill = () => {
  const { node, svg: s } = still(W, 220);
  const cx = 20;
  const cy = 110;
  const k = 104 / R_EARTH;
  const ring = (r: number, fill: string) => svg('path', { d: `M${cx},${cy - r * k} A${r * k},${r * k} 0 0 1 ${cx},${cy + r * k} Z`, fill });
  const tag = (r: number, y: number, text: string, sub: string) => [
    line(cx + r * k, cy, 236, y, COL.soft, 0.6),
    label(240, y, text, { size: 'note', bold: true }),
    small(240, y + 12, sub, { soft: true }),
  ];
  s.append(
    svg('rect', { width: W, height: 220, fill: COL.paper }),
    ring(6371, '#a9b59a'), ring(3480, '#e6c08f'), ring(1220, '#cf9a5c'),
    svg('path', { d: `M${cx},${cy - 6371 * k} A${6371 * k},${6371 * k} 0 0 1 ${cx},${cy + 6371 * k}`, fill: 'none', stroke: '#8b6f4e', 'stroke-width': 2 }),
    ...tag(6360, 26, 'Crust, 5–70 km', 'solid rock'),
    ...tag(5000, 70, 'Mantle, to 2,890 km', 'solid, slowly creeping rock'),
    ...tag(2400, 122, 'Outer core, to 5,150 km', 'liquid iron and nickel'),
    ...tag(600, 174, 'Inner core, to the centre', 'solid iron and nickel, over 5,000 °C'),
  );
  s.setAttribute('aria-label', 'A half section of the Earth to scale: a thin crust, a mantle to 2,890 km, a liquid outer core to 5,150 km and a solid inner core at the centre, with their densities.');
  return { node };
};

// ---- D6: how hot rock stops a drill ---------------------------------------------------------

const HOLES = [
  { name: 'Kola, 1989', depth: 12.26, temp: 180 },
  { name: 'KTB, 1994', depth: 9.1, temp: 265 },
];
/** Temperature at depth z km for a surface at 10 °C. */
export const tempAt = (z: number, grad: number) => 10 + z * grad;
/** How deep the drill can go before the rock is hotter than it can stand. */
export const reach = (grad: number, limit: number) => (limit - 10) / grad;

export const drillFigure = figure(['ktb'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let grad = 15;
  let limit = 200;
  const X0 = 50;
  const X1 = 300;
  const Y0 = 22;
  const Y1 = 210;
  const tx = (c: number) => X0 + (c / 400) * (X1 - X0);
  const zy = (z: number) => Y0 + (z / 16) * (Y1 - Y0);
  const paint = () => {
    const z = Math.min(16, reach(grad, limit));
    redraw(g,
      svg('rect', { width: W, height: 230, fill: COL.paper }),
      svg('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: '#f0e4d0' }),
      ...[0, 100, 200, 300, 400].map((c) => small(tx(c), Y0 - 6, `${c}°`, { anchor: 'middle', soft: true })),
      ...[0, 4, 8, 12, 16].map((d) => small(X0 - 5, zy(d) + 3, `${d}`, { anchor: 'end', soft: true })),
      small(X0 - 5, Y1 + 13, 'km down', { anchor: 'end', soft: true }),
      small(X1, Y1 + 13, 'temperature, °C', { anchor: 'end', soft: true }),
      // The limit, the rock's temperature, and where they cross.
      line(tx(limit), Y0, tx(limit), Y1, COL.bad, 1.2, { 'stroke-dasharray': '4 3' }),
      small(tx(limit) + 3, Y1 - 6, 'drill’s limit', { fill: COL.bad, bold: true }),
      polyline([[tx(10), zy(0)], [tx(tempAt(16, grad)), zy(16)]].map(([x, y]) => [Math.min(x, X1 + 60), y] as P), COL.heat, 2.2),
      line(tx(10), zy(0), tx(10), zy(z), COL.ink, 4, { opacity: 0.6 }),
      small(tx(10) + 6, zy(z) + 4, `hole stops at ${z.toFixed(1)} km`, { bold: true }),
      // Kola as predicted (100 °C at 12 km) and the real holes.
      line(tx(10), zy(0), tx(100), zy(12), COL.soft, 1, { 'stroke-dasharray': '2 3' }),
      small(tx(58) + 4, zy(6), 'Kola, as predicted', { soft: true }),
      ...HOLES.flatMap((h) => [svg('circle', { cx: tx(h.temp), cy: zy(h.depth), r: 4, fill: COL.old }), small(tx(h.temp) + 6, zy(h.depth) + 3, h.name, { fill: COL.old, bold: true })]),
    );
    const ktb = grad >= 25 && grad <= 31 && Math.abs(z - 9.1) <= 0.5;
    f.readout.textContent = `Rock warming ${grad} °C per km reaches ${limit} °C at ${z.toFixed(1)} km. ${ktb ? 'That is about where KTB in Germany stopped, at 9.1 km and 265 °C.' : grad <= 16 ? 'Cold old crust like Kola’s lets a hole go deep before the heat wins.' : 'In hotter crust the limit comes sooner.'}`;
    if (ktb && t.goal === 'ktb') t.done();
  };
  const sg = slider('Warming with depth', 8, 40, 1, grad, (v) => `${v} °C per km`, (v) => { grad = v; paint(); }, 'heat');
  const sl = slider('Hottest the drill can stand', 120, 320, 5, limit, (v) => `${v} °C`, (v) => { limit = v; paint(); }, 'bad');
  f.controls.append(sg.node, sl.node);
  paint();
  guessFirst(t, f, {
    ask: 'Germany’s KTB hole went through rock that warms about 28 °C per kilometre, nearly twice Kola’s rate. Did it get deeper or shallower than Kola? Guess first.',
    options: ['Deeper', 'Shallower', 'About the same'],
    sliders: [sg, sl],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['deeper', 'shallower', 'about the same'][guess]}. Set the warming to 28 °C per km and the drill’s limit to 265 °C.`;
    },
  });
  return f.node;
});
