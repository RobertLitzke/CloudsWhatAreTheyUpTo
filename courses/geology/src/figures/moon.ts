// The Moon branch: why fast impacts make round craters (P1), counting craters
// against the Apollo ages (P2), the magma ocean that floated the white crust
// (P3), and the oxygen in a Moon built from an impactor (P4).

import { svg } from 'didactics/dom';
import { label, line, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;
const deg = (d: number) => (d * Math.PI) / 180;

// ---- P1: crater shape ---------------------------------------------------------------

/**
 * Below this angle (degrees above the ground) a crater comes out stretched.
 * Gun experiments (Gault and Wedekind 1978) put it near 12° at impact speeds;
 * at the speed of a thrown rock almost any slant gouges an oval.
 */
export function stretchBelow(kmps: number): number {
  if (kmps >= 5) return 12;
  const f = Math.log10(kmps / 0.1) / Math.log10(50);
  return 80 - f * 68;
}
/** Length over width of the crater. */
export const ellipticity = (kmps: number, angle: number) => {
  const c = stretchBelow(kmps);
  return angle >= c ? 1 : 1 + (2.2 * (c - angle)) / c;
};
/** Final crater diameter, m, for a 50 m stony body on the Moon (pi-scaling, after Collins, Melosh and Marcus 2005). */
export const craterSize = (kmps: number, angle: number) =>
  1.25 * 1.161 * 50 ** 0.78 * (kmps * 1000) ** 0.44 * 1.62 ** -0.22 * Math.sin(deg(angle)) ** (1 / 3);

export const impactFigure = figure(['shallow-round'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let logV = Math.log10(0.3);
  let angle = 45;
  const paint = () => {
    const v = 10 ** logV;
    const e = ellipticity(v, angle);
    const d = craterSize(v, angle);
    const r = 16 + 46 * Math.sqrt(d / 2600);
    const cx = 240 + (e - 1) * 12;
    const cy = 140;
    const parts: SVGElement[] = [svg('rect', { width: W, height: 230, fill: COL.paper }), svg('rect', { x: 110, y: 60, width: 280, height: 160, fill: '#d9d4c9' })];
    // Ejecta: lopsided below 45°, none on the up-range side below 25°.
    const lop = Math.max(0, Math.min(1, (45 - angle) / 35));
    const fast = v >= 3;
    const blanket: P[] = [];
    for (let k = 0; k <= 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const cos = Math.cos(a);
      let rr = r * (fast ? 1.9 + 1.1 * lop * cos : 1.2 + 0.3 * cos);
      if (fast && angle < 25 && cos < -0.4) rr = r * e * 0.98;
      blanket.push([cx + rr * cos * (fast ? 1 : e), cy + rr * Math.sin(a)]);
    }
    parts.push(svg('polygon', { points: blanket.map((p) => p.join(',')).join(' '), fill: '#ece8df', opacity: 0.9 }));
    if (fast) {
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + 0.2;
        if (angle < 25 && Math.cos(a) < -0.4) continue;
        const len = r * (2.4 + 1.6 * lop * Math.cos(a) + (k % 3) * 0.4);
        parts.push(line(cx + r * Math.cos(a), cy + r * Math.sin(a), cx + len * Math.cos(a), cy + len * Math.sin(a), '#f6f4ef', 2));
      }
    }
    parts.push(
      svg('ellipse', { cx, cy, rx: r * e, ry: r, fill: '#8f877a', stroke: '#f3efe6', 'stroke-width': 3 }),
      svg('ellipse', { cx: cx + r * e * 0.12, cy: cy + r * 0.12, rx: r * e * 0.7, ry: r * 0.7, fill: '#776f63' }),
      small(118, 74, 'From above', { bold: true }),
    );
    // Side view: the path in.
    const sx = 20;
    const sy = 120;
    const len = 70;
    parts.push(
      line(sx - 10, sy, sx + 90, sy, COL.soft, 1.5),
      line(sx + 60 - Math.cos(deg(angle)) * len, sy - Math.sin(deg(angle)) * len, sx + 60, sy, COL.heat, 2, { 'stroke-dasharray': '4 3' }),
      svg('circle', { cx: sx + 60 - Math.cos(deg(angle)) * len, cy: sy - Math.sin(deg(angle)) * len, r: 4, fill: COL.ink }),
      small(sx - 10, sy + 16, 'From the side', { bold: true }),
      small(sx - 10, sy + 30, `${angle}° above the ground`, { soft: true }),
      label(250, 36, `Crater ${d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`} across${e > 1.05 ? `, ${e.toFixed(1)} times as long as wide` : ', round'}`, { size: 'note', bold: true, anchor: 'middle' }),
      small(250, 50, 'flying from left to right', { anchor: 'middle', soft: true }),
    );
    redraw(g, ...parts);
    const round = e <= 1.02;
    f.readout.textContent = v < 3
      ? `At ${v < 1 ? `${Math.round(v * 1000)} m` : `${v.toFixed(1)} km`} a second, the rock ploughs in and pushes material ahead of it, so a slanting hit leaves ${round ? 'a round pit only because it came in steeply' : 'a stretched gouge'}.`
      : round
        ? `At ${v.toFixed(0)} km a second the rock stops in a fraction of a second and its energy bursts out as a shock wave from one spot, like a buried explosion. The crater is round${angle < 45 ? '; only the spray of ejecta shows which way the rock came from' : ''}.`
        : `Even at ${v.toFixed(0)} km a second, a grazing hit at ${angle}° stretches the crater. Only about ${Math.max(1, Math.round(100 * Math.sin(deg(angle)) ** 2))} impacts in a hundred come in this low.`;
    if (v >= 10 && angle <= 20 && round && t.goal === 'shallow-round') t.done();
  };
  const sv = slider('Impact speed', -1, Math.log10(30), 0.01, logV, (x) => { const v = 10 ** x; return v < 1 ? `${Math.round(v * 1000)} m/s` : `${v.toFixed(1)} km/s`; }, (x) => { logV = x; paint(); }, 'heat');
  const sa = slider('Angle above the ground', 5, 90, 1, angle, (x) => `${x}°`, (x) => { angle = x; paint(); }, 'pressure');
  f.controls.append(sv.node, sa.node);
  paint();
  guessFirst(t, f, {
    ask: 'A rock hits the Moon at 20 km a second, coming in 30° above the ground. What shape is its crater? Guess first.',
    options: ['Round', 'An oval stretched along its path', 'A teardrop'],
    sliders: [sv, sa],
    after: (guess) => {
      logV = Math.log10(20);
      angle = 30;
      sv.set(logV);
      sa.set(angle);
      paint();
      f.readout.textContent = `You guessed ${['round', 'an oval', 'a teardrop'][guess]}. ${f.readout.textContent} Now slow it down, and lower the angle.`;
    },
  });
  return f.node;
});

// ---- P2: counting craters ------------------------------------------------------------

/** Craters at least 1 km across per km² on a surface `gyr` billion years old (Neukum's 2001 lunar chronology). */
export const perKm2 = (gyr: number) => 5.44e-14 * (Math.exp(6.93 * gyr) - 1) + 8.38e-4 * gyr;
/** The patch of surface drawn: 50 km by 50 km. */
const AREA = 2500;
const CAP = 900;
const CRATERS = (() => {
  const rng = makeRng(42);
  return Array.from({ length: CAP }, () => ({ x: rng(), y: rng(), d: Math.min(16, 1 / Math.sqrt(Math.max(1e-3, rng()))) }));
})();
/** Samples that calibrate the curve: billion years. */
const SAMPLES = [
  { name: 'Tycho (Apollo 17)', gyr: 0.11 },
  { name: 'Copernicus (Apollo 12)', gyr: 0.8 },
  { name: 'Apollo 12', gyr: 3.15 },
  { name: 'Apollo 15', gyr: 3.3 },
  { name: 'Luna 16', gyr: 3.41 },
  { name: 'Apollo 11', gyr: 3.6 },
  { name: 'Apollo 17', gyr: 3.75 },
  { name: 'Apollo 16 highlands', gyr: 3.9 },
];
/** The mystery plain the reader dates. */
const MYSTERY = 3.8;
export const MYSTERY_COUNT = Math.round(perKm2(MYSTERY) * AREA);

export const countFigure = figure(['date'], (_ctx, t) => {
  const f = frame(W, 220, 4);
  const g = svg('g');
  f.svg.append(g);
  let gyr = 1;
  const PX = 10;
  const PS = 160;
  const X0 = 222;
  const X1 = 390;
  const Y0 = 30;
  const Y1 = 190;
  const ax = (a: number) => X0 + (a / 4.5) * (X1 - X0);
  const ay = (n: number) => Y1 - ((Math.log10(Math.max(n, 1e-4)) + 4) / 4) * (Y1 - Y0);
  const paint = () => {
    const n = perKm2(gyr) * AREA;
    const shown = Math.min(CAP, Math.round(n));
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 220, fill: COL.paper }),
      svg('rect', { x: PX, y: Y0, width: PS, height: PS, fill: '#cfc9bc' }),
    ];
    for (let i = 0; i < shown; i++) {
      const c = CRATERS[i];
      const r = (c.d / 50) * PS * 0.5;
      parts.push(svg('circle', { cx: PX + c.x * PS, cy: Y0 + c.y * PS, r: Math.max(0.8, r), fill: '#a39c8f', stroke: '#ece7dc', 'stroke-width': 0.6 }));
    }
    parts.push(
      small(PX, Y0 - 8, `50 km square: ${Math.round(n) > CAP ? 'full (saturated)' : `${Math.round(n)} craters over 1 km`}`, { bold: true }),
      // The curve.
      svg('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: '#f3ead9' }),
      ...[0, 1, 2, 3, 4].map((a) => small(ax(a), Y1 + 11, `${a}`, { anchor: 'middle', soft: true })),
      small(X1, Y1 + 23, 'billion years old', { anchor: 'end', soft: true }),
      small(X0 - 3, ay(1) + 3, '1', { anchor: 'end', soft: true }),
      small(X0 - 3, ay(0.01) + 3, '0.01', { anchor: 'end', soft: true }),
      small(X0 - 3, ay(1e-4) + 3, '10⁻⁴', { anchor: 'end', soft: true }),
      small(X0, Y0 - 8, 'craters over 1 km per km²', { soft: true }),
      polyline(Array.from({ length: 91 }, (_, k) => [ax(k / 20), ay(perKm2(k / 20))] as P), COL.old, 2),
      ...SAMPLES.map((s) => svg('circle', { cx: ax(s.gyr), cy: ay(perKm2(s.gyr)), r: 3, fill: COL.young, stroke: COL.ink, 'stroke-width': 0.6 })),
      line(ax(gyr), Y0, ax(gyr), Y1, COL.heat, 1.2, { 'stroke-dasharray': '3 3' }),
      small(X1 - 4, Y1 - 6, 'gold: dated samples', { fill: COL.young, bold: true, anchor: 'end' }),
    );
    redraw(g, ...parts);
    const match = Math.abs(Math.round(n) - MYSTERY_COUNT) <= 3;
    f.readout.textContent = `A surface ${gyr.toFixed(2)} billion years old collects ${Math.round(n)} craters over 1 km in this square. The mystery plain has ${MYSTERY_COUNT}. ${match ? `Matched: it is about ${gyr.toFixed(1)} billion years old.` : gyr > 3 ? 'Near 3.5 billion years the count climbs steeply: small changes in age make big changes in craters.' : 'Over the last 3 billion years craters have come at a slow, steady rate.'}`;
    if (match && t.goal === 'date') t.done();
  };
  const sa = slider('Age of the surface', 0, 4.4, 0.01, gyr, (v) => `${v.toFixed(2)} billion years`, (v) => { gyr = v; paint(); }, 'old');
  f.controls.append(sa.node);
  paint();
  guessFirst(t, f, {
    ask: 'A highland surface has about ten times as many craters as a mare plain that Apollo 11 dated to 3.6 billion years. How old is the highland surface? Guess first.',
    options: ['Ten times older than the mare', 'Twice as old', 'Only a few hundred million years older'],
    sliders: [sa],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['ten times older', 'twice as old', 'a few hundred million years older'][guess]}. Move the age and watch the count, then date the mystery plain, which has ${MYSTERY_COUNT} craters.`;
    },
  });
  return f.node;
});

// ---- P3: the magma ocean ---------------------------------------------------------------

/** Minerals in the order they crystallise from the lunar magma ocean: percent crystallised when each starts and stops, and density. */
const MINERALS = [
  { name: 'olivine', from: 0, to: 50, rho: 3.3, color: '#7d8f4e' },
  { name: 'pyroxene', from: 50, to: 95, rho: 3.3, color: '#4e5a3a' },
  { name: 'plagioclase', from: 78, to: 99, rho: 2.7, color: '#f3efe6' },
  { name: 'ilmenite', from: 95, to: 99, rho: 4.7, color: '#2d2a2a' },
] as const;

/** Percent of the ocean between percents a and b that has crystallised once `done` percent has. */
const span = (done: number, a: number, b: number) => Math.max(0, Math.min(done, b) - a);
/** How much of each mineral has formed (percent of the ocean) when `done` percent has crystallised: late on, minerals grow side by side. */
export const formed = (done: number): number[] => [
  span(done, 0, 50),
  span(done, 50, 78) + 0.45 * span(done, 78, 95),
  0.55 * span(done, 78, 95) + 0.6 * span(done, 95, 99),
  0.4 * span(done, 95, 99),
];

export const oceanFigure = figure(['crust'], (_ctx, t) => {
  const f = frame(W, 220, 4);
  const g = svg('g');
  f.svg.append(g);
  let done = 0;
  let melt = 2.9;
  const X0 = 30;
  const X1 = 268;
  const TOP = 30;
  const BOT = 200;
  const H = BOT - TOP;
  const paint = () => {
    const amounts = formed(done);
    const sink: { m: (typeof MINERALS)[number]; h: number }[] = [];
    const float: { m: (typeof MINERALS)[number]; h: number }[] = [];
    MINERALS.forEach((m, i) => {
      const h = (amounts[i] / 100) * H;
      if (h <= 0) return;
      (m.rho > melt ? sink : float).push({ m, h });
    });
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 220, fill: COL.paper }),
      svg('rect', { x: X0, y: TOP, width: X1 - X0, height: H, fill: '#e07a3f', opacity: 0.85 }),
      small(X0, TOP - 8, 'surface', { soft: true }),
      small(X0, BOT + 13, 'about 400 km down: solid interior', { soft: true }),
    ];
    let y = BOT;
    for (const s of sink) {
      y -= s.h;
      parts.push(svg('rect', { x: X0, y, width: X1 - X0, height: s.h, fill: s.m.color }));
    }
    let top = TOP;
    for (const s of float) {
      parts.push(svg('rect', { x: X0, y: top, width: X1 - X0, height: s.h, fill: s.m.color, stroke: '#cfc6b4', 'stroke-width': 0.5 }));
      top += s.h;
    }
    // Crystals still forming in the melt: a few drifting dots of each live mineral.
    const rng = makeRng(Math.round(done * 10) + 3);
    MINERALS.forEach((m) => {
      if (done < m.from || done >= m.to) return;
      for (let k = 0; k < 12; k++) {
        const cy = top + 4 + rng() * Math.max(2, y - top - 8);
        parts.push(svg('rect', { x: X0 + 6 + rng() * (X1 - X0 - 12), y: cy, width: 4, height: 2.4, fill: m.color, stroke: COL.ink, 'stroke-width': 0.3 }));
      }
    });
    if (done >= 99) parts.push(svg('rect', { x: X0, y: top, width: X1 - X0, height: Math.max(2, y - top), fill: '#8a3a6a' }), small(X1 - 4, (top + y) / 2 + 3, 'KREEP: the last melt', { fill: COL.paper, halo: '#8a3a6a', bold: true, anchor: 'end' }));
    MINERALS.forEach((m, i) => {
      parts.push(svg('rect', { x: 280, y: 40 + i * 30, width: 12, height: 12, fill: m.color, stroke: COL.ink, 'stroke-width': 0.5 }), small(298, 50 + i * 30, `${m.name}`, { bold: true }), small(298, 61 + i * 30, `${m.rho} g/cm³, ${m.rho > melt ? 'sinks' : 'floats'}`, { soft: true }));
    });
    redraw(g, ...parts);
    const plagFloats = 2.7 < melt;
    const crust = plagFloats && done >= 95;
    f.readout.textContent = done === 0
      ? `An ocean of molten rock hundreds of kilometres deep, at ${melt.toFixed(1)} g/cm³. Let it cool.`
      : `${Math.round(done)}% crystallised. ${done < 78 ? 'So far only olivine and pyroxene, denser than the melt: they settle to the bottom.' : plagFloats ? `Plagioclase, lighter than the melt, rises and gathers at the top${crust ? ': a white crust over the whole Moon, the highlands' : ''}.` : 'With the melt this light, plagioclase sinks with the rest, and no white crust forms.'}`;
    if (crust && Math.abs(melt - 2.9) <= 0.2 && t.goal === 'crust') t.done();
  };
  const sd = slider('Cooled', 0, 100, 1, done, (v) => `${v}% crystallised`, (v) => { done = v; paint(); }, 'old');
  const sm = slider('Density of the melt', 2.4, 3.6, 0.05, melt, (v) => `${v.toFixed(2)} g/cm³`, (v) => { melt = v; paint(); }, 'heat');
  f.controls.append(sd.node, sm.node);
  paint();
  guessFirst(t, f, {
    ask: 'Late in the cooling, crystals of plagioclase feldspar start to grow in the magma ocean. Where do they go? Guess first.',
    options: ['They sink to the bottom', 'They float to the top', 'They stay spread through the melt'],
    sliders: [sd, sm],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed that they ${['sink', 'float', 'stay spread out'][guess]}. Cool the ocean and see.`;
    },
  });
  return f.node;
});

// ---- P4: building the Moon from an impactor ------------------------------------------------

/** Measured difference in Δ¹⁷O between Moon and Earth rocks, parts per thousand, and its uncertainty (Young and others, 2016). */
const MEASURED_DIFF = 0.001;
const MEASURED_ERR = 0.005;

export const mixFigure = figure(['mars-like'], (_ctx, t) => {
  const f = frame(W, 200, 4);
  const g = svg('g');
  f.svg.append(g);
  let share = 80;
  let offset = 0.32;
  const X0 = 40;
  const X1 = 380;
  const sx = (v: number) => X0 + ((v + 0.05) / 0.4) * (X1 - X0);
  const paint = () => {
    const predicted = (share / 100) * offset;
    const fits = Math.abs(predicted - MEASURED_DIFF) <= MEASURED_ERR;
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 200, fill: COL.paper }),
      label(X0, 26, 'Oxygen fingerprint: how far a rock sits from Earth’s line', { size: 'note', bold: true }),
      line(X0, 120, X1, 120, COL.soft, 1.5),
      ...[0, 0.1, 0.2, 0.3].map((v) => small(sx(v), 136, `${v.toFixed(1)}‰`, { anchor: 'middle', soft: true })),
      svg('rect', { x: sx(MEASURED_DIFF - MEASURED_ERR), y: 104, width: Math.max(2, sx(MEASURED_ERR) - sx(-MEASURED_ERR)), height: 32, fill: COL.good, opacity: 0.45 }),
      small(sx(0), 98, 'Apollo samples', { anchor: 'middle', fill: COL.good, bold: true }),
      svg('circle', { cx: sx(0.32), cy: 160, r: 4, fill: '#b5532f' }), small(sx(0.32), 176, 'Mars', { anchor: 'middle', soft: true }),
      svg('circle', { cx: sx(0), cy: 160, r: 4, fill: COL.water }), small(sx(0), 176, 'Earth', { anchor: 'middle', soft: true }),
      svg('circle', { cx: sx(offset), cy: 70, r: 6, fill: COL.old }), small(sx(offset), 58, 'impactor', { anchor: 'middle', bold: true, fill: COL.old }),
      svg('circle', { cx: sx(predicted), cy: 120, r: 6, fill: fits ? COL.good : COL.heat, stroke: COL.ink, 'stroke-width': 0.8 }),
      small(sx(predicted), 152, 'your Moon', { anchor: 'middle', bold: true, fill: fits ? COL.good : COL.heat }),
      polyline([[sx(offset), 76], [sx(predicted), 114]], COL.soft, 1, { 'stroke-dasharray': '3 3' }),
    ];
    redraw(g, ...parts);
    f.readout.textContent = `A Moon made ${share}% from the impactor sits ${predicted.toFixed(3)}‰ from Earth. The samples measure ${MEASURED_DIFF.toFixed(3)} ± ${MEASURED_ERR.toFixed(3)}‰. ${
      fits ? (offset >= 0.25 ? `A match, but only with ${share}% of the Moon from a Mars-like impactor, and the simulations give 60 to 90%. That is the puzzle.` : 'A match: an impactor whose oxygen was already like Earth’s gives a Moon like Earth, whatever the share.')
      : 'Too far from Earth: either less of the impactor went into the Moon, or the impactor’s oxygen was more like Earth’s.'}`;
    if (fits && offset >= 0.25 && t.goal === 'mars-like') t.done();
  };
  const ss = slider('Moon made from impactor', 0, 100, 1, share, (v) => `${v}%`, (v) => { share = v; paint(); }, 'old');
  const so = slider('Impactor’s oxygen, away from Earth’s', 0, 0.35, 0.01, offset, (v) => `${v.toFixed(2)}‰`, (v) => { offset = v; paint(); }, 'rose');
  f.controls.append(ss.node, so.node);
  paint();
  return f.node;
});
