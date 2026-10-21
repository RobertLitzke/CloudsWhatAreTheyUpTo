// Figures for cloud seeding: a cold box of supercooled cloud to drop things
// into, a dry ice pellet's frozen trail, silver iodide posing as ice, a layer
// of cloud seeded from the air, how much water a cloud really holds, the
// temperatures where seeding can help, and a seeding trial against luck.

import { coldBox, judge, runTrial, seedLayer, STORMS_PER_WINTER, TRUE_EFFECT, type Agent } from '../../core/cold-cloud';
import type { GenusId } from '../../core/clouds';
import { makeRng } from '../../core/rng';
import { el, svg } from '../dom';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { arrow, flake, heading, label, line, note, redraw, still } from './draw';
import { COL, animate, frame, slider, task, type FigureFactory } from './kit';

/** A temperature with a proper minus sign. */
const deg = (c: number) => `${c < 0 ? '−' : ''}${Math.abs(c)} °C`;

function fmtCount(n: number): string {
  if (n < 0.01) return 'almost none';
  if (n < 1) return `one in every ${Math.round(1 / n).toLocaleString()} litres`;
  if (n < 1000) return `${Math.round(n).toLocaleString()} per litre`;
  if (n < 1e6) return `${Math.round(n / 1000).toLocaleString()} thousand per litre`;
  return `${Math.round(n / 1e6).toLocaleString()} million per litre`;
}

// ---- Why ice wins -----------------------------------------------------------------

/** A cloud droplet: a white ball with a teal rim. */
const droplet = (x: number, y: number, r: number) => svg('circle', { cx: x, cy: y, r, fill: '#ffffff', stroke: COL.dew, 'stroke-width': 1.2 });

export const iceStealDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const stage = (cx: number, n: string, minutes: string, eaten: number, fall: number) => {
    const cy = 100;
    const parts: SVGElement[] = [svg('rect', { x: cx - 62, y: 34, width: 124, height: 134, rx: 8, fill: '#e9eef8' })];
    const rng = makeRng(4);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rng() * 0.4;
      const r = 34 + rng() * 14;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.9;
      const dr = 6.5 * Math.cbrt(Math.max(0, 1 - eaten));
      if (dr > 0.8) parts.push(droplet(x, y, dr));
      if (eaten < 1 && dr > 0.8) {
        // Vapour leaving the droplet for the crystal.
        const k1 = 0.35;
        const k2 = 0.62;
        parts.push(arrow(x + (cx - x) * k1, y + (cy - y) * k1, x + (cx - x) * k2, y + (cy - y) * k2, COL.dew, 1.1));
      }
    }
    const size = 5 + 17 * Math.sqrt(eaten);
    parts.push(flake(cx, cy + fall, size, COL.ice, 2.2));
    if (fall) parts.push(arrow(cx + 26, cy + fall - 14, cx + 26, cy + fall + 10, COL.ice, 1.6));
    parts.push(
      svg('circle', { cx: cx - 50, cy: 46, r: 8, fill: COL.ink }),
      heading(cx - 50, 50, n, { fill: '#fff' }),
      note(cx + 56, 50, minutes, { bold: true, anchor: 'end' }),
    );
    return svg('g', {}, ...parts);
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 210, fill: COL.paper }),
    heading(200, 18, 'One crystal among supercooled droplets, at −10 °C'),
    stage(68, '1', 'start', 0.05, 0),
    stage(200, '2', '5 minutes', 0.5, 0),
    stage(332, '3', '15 minutes', 1, 34),
    note(68, 182, 'droplets (liquid)', { anchor: 'middle', fill: COL.dew }),
    note(68, 194, 'and one ice crystal', { anchor: 'middle', fill: COL.ice }),
    note(200, 182, 'vapour leaves the droplets', { anchor: 'middle', fill: COL.dew }),
    note(200, 194, 'and freezes onto the ice', { anchor: 'middle', fill: COL.dew }),
    note(332, 182, 'droplets gone; the crystal', { anchor: 'middle', fill: COL.ice }),
    note(332, 194, 'is heavy enough to fall', { anchor: 'middle', fill: COL.ice }),
  );
  return { node: d.node };
};

export const iceShortageDiagram: FigureFactory = () => {
  const d = still(400, 250);
  const rng = makeRng(9);
  // One litre, packed with droplets.
  const lx = 14;
  const ly = 44;
  const ls = 96;
  const dots = Array.from({ length: 420 }, () => svg('circle', { cx: lx + 3 + rng() * (ls - 6), cy: ly + 3 + rng() * (ls - 6), r: 1.3, fill: COL.dew, opacity: 0.55 }));
  // 250 litres, one with an ice-starting speck.
  const gx = 150;
  const gy = 44;
  const cell = 9.6;
  const boxes: SVGElement[] = [];
  for (let i = 0; i < 250; i++) {
    const x = gx + (i % 25) * cell;
    const y = gy + Math.floor(i / 25) * cell;
    boxes.push(svg('rect', { x, y, width: cell - 1.6, height: cell - 1.6, fill: i === 163 ? COL.ice : '#dfe6f1' }));
  }
  const row = (y: number, t: string, odds: string, w: number) => svg('g', {},
    note(150, y, t, { bold: true }),
    svg('rect', { x: 196, y: y - 8, width: Math.max(2, w), height: 9, rx: 2, fill: COL.ice }),
    note(200 + Math.max(2, w), y, odds),
  );
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 250, fill: COL.paper }),
    heading(200, 18, 'Plenty of water, hardly any ice'),
    svg('rect', { x: lx, y: ly, width: ls, height: ls, fill: '#ffffff', stroke: COL.soft }),
    ...dots,
    note(lx + ls / 2, ly + ls + 14, 'one litre of cloud:', { bold: true, anchor: 'middle' }),
    note(lx + ls / 2, ly + ls + 26, '100,000 droplets', { anchor: 'middle', fill: COL.dew }),
    note(lx + ls / 2, ly + ls + 38, '(a few hundred drawn)', { soft: true, anchor: 'middle' }),
    ...boxes,
    note(gx, ly + 10 * cell + 14, '250 litres at −10 °C: one ice-starting speck (blue)', { bold: true }),
    note(150, 182, 'Ice-starting specks, colder and colder (longer bar: more of them)', { soft: true }),
    row(198, '−5 °C', 'one in 5,000 litres', 2),
    row(212, '−10 °C', 'one in 250 litres', 12),
    row(226, '−15 °C', 'one in 12 litres', 44),
    row(240, '−20 °C', 'about 1 per litre', 100),
  );
  return { node: d.node };
};

// ---- Which agent works where -------------------------------------------------------

export const agentRangeDiagram: FigureFactory = () => {
  const d = still(400, 200);
  const x0 = 96;
  const x1 = 384;
  const xOf = (c: number) => x0 + (-c / 45) * (x1 - x0);
  const bar = (y: number, name: string, from: number, to: number, color: string, says: string, fade?: number) => svg('g', {},
    note(x0 - 6, y + 4, name, { bold: true, anchor: 'end' }),
    fade != null ? svg('rect', { x: xOf(from), y: y - 7, width: xOf(fade) - xOf(from), height: 14, rx: 3, fill: color, opacity: 0.35 }) : null as unknown as SVGElement,
    svg('rect', { x: xOf(fade ?? from), y: y - 7, width: xOf(to) - xOf(fade ?? from), height: 14, rx: 3, fill: color }),
    note(xOf(fade ?? from) + 6, y + 4, says, { bold: true, fill: '#fff' }),
  );
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 200, fill: COL.paper }),
    heading(200, 18, 'What starts ice, by the cloud’s temperature'),
    svg('rect', { x: xOf(-38), y: 30, width: x1 - xOf(-38), height: 132, fill: '#cfe0f6', opacity: 0.6 }),
    bar(46, 'dry ice', 0, -45, COL.ice, 'works at any temperature below 0 °C'),
    bar(76, 'silver iodide', -5, -45, '#7a5ca3', 'below −5 °C; strong below −10', -10),
    bar(106, 'natural specks', -12, -38, '#8f8a80', '', -25),
    note(xOf(-12) + 6, 110, 'few, then plenty by −25 °C', { bold: true, fill: COL.ink }),
    note(x0, 128, 'pale: works only weakly', { soft: true }),
    note(xOf(-38) - 4, 136, 'below −38 °C, the cloud', { bold: true, anchor: 'end', fill: COL.ice }),
    note(xOf(-38) - 4, 148, 'freezes by itself →', { anchor: 'end', fill: COL.ice }),
    line(x0, 166, x1, 166, COL.ink, 1),
    ...[0, -5, -10, -20, -30, -40].map((c) => note(xOf(c), 180, deg(c), { soft: true, anchor: 'middle' })),
    note(200, 196, 'Above 0 °C nothing works: there is no supercooled water to freeze.', { soft: true, anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- A fallstreak hole -------------------------------------------------------------

export const fallstreakDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const rng = makeRng(21);
  const holeX = 210;
  const puffs: SVGElement[] = [];
  for (let i = 0; i < 90; i++) {
    const x = rng() * 420 - 10;
    const y = 70 + rng() * 26;
    if (Math.hypot((x - holeX) / 1.8, y - 83) < 34) continue;
    puffs.push(svg('circle', { cx: x, cy: y, r: 7 + rng() * 6, fill: '#ffffff', opacity: 0.95 }));
  }
  const streak: SVGElement[] = [];
  for (let i = 0; i < 26; i++) {
    const y = 88 + i * 3.4;
    streak.push(svg('ellipse', { cx: holeX + (i * 0.9) + (rng() - 0.5) * 10, cy: y, rx: 8 - i * 0.2, ry: 2.2, fill: '#ffffff', opacity: 0.8 - i * 0.025 }));
  }
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 210, fill: '#86b4dc' }),
    ...puffs,
    ...streak,
    // The aeroplane's climbing path through the layer, half an hour earlier.
    line(120, 150, 300, 30, COL.ink, 1.2, { 'stroke-dasharray': '4 4', opacity: 0.6 }),
    note(292, 22, 'an aeroplane climbed', { anchor: 'end', fill: COL.ink }),
    note(292, 34, 'through here', { anchor: 'end', fill: COL.ink }),
    note(12, 62, 'supercooled altocumulus, −15 °C', { bold: true, fill: COL.ink }),
    note(holeX + 46, 120, 'half an hour later: a round hole,', { fill: COL.ink }),
    note(holeX + 46, 132, 'with a wisp of falling ice in it', { fill: COL.ink }),
    note(12, 182, 'Air over the propeller tips expands and cools below −40 °C;', { fill: COL.ink }),
    note(12, 194, 'the ice spreads, eats the droplets, and falls out as a streak.', { fill: COL.ink }),
  );
  return { node: d.node };
};

// ---- Seeding clouds over mountains --------------------------------------------------

export const mountainSeedDiagram: FigureFactory = () => {
  const d = still(400, 250);
  const sea = 218;
  const ridge = (x: number) => {
    if (x < 60) return sea - 4;
    if (x < 230) return sea - 4 - 130 * (0.5 - 0.5 * Math.cos(Math.PI * ((x - 60) / 170)));
    if (x < 320) return sea - 134 + 90 * (0.5 - 0.5 * Math.cos(Math.PI * ((x - 230) / 90)));
    return sea - 44;
  };
  const land: [number, number][] = [];
  for (let x = 0; x <= 400; x += 4) land.push([x, ridge(x)]);
  // The cap cloud over the windward slopes and crest.
  const cloudTop: [number, number][] = [];
  const cloudBase: [number, number][] = [];
  for (let x = 120; x <= 292; x += 4) {
    const k = (x - 120) / 172;
    cloudTop.push([x, Math.min(150, Math.min(ridge(x) - 8, 150 - 82 * Math.sin(Math.PI * k)))]);
    cloudBase.push([x, Math.min(150, ridge(x))]);
  }
  const snow: SVGElement[] = [];
  for (let x = 160; x < 226; x += 7) snow.push(flake(x, ridge(x) - 10 - ((x * 7) % 14), 2.6, COL.ice, 1.2));
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 250, fill: '#e3ecf4' }),
    svg('polygon', { points: [...cloudTop, ...[...cloudBase].reverse()].map((p) => p.join(',')).join(' '), fill: '#ffffff', stroke: COL.cloudShade }),
    ...snow,
    svg('polygon', { points: `0,250 ${land.map((p) => p.join(',')).join(' ')} 400,250`, fill: '#a39150' }),
    // Smoke from a ground burner carried up the slope into the cloud.
    svg('rect', { x: 96, y: ridge(100) - 8, width: 7, height: 8, fill: COL.ink }),
    ...Array.from({ length: 12 }, (_, i) => {
      const k = i / 11;
      const x = 100 + k * 84;
      return svg('circle', { cx: x, cy: Math.min(ridge(x) - 10 - k * 10, ridge(100) - 10 - k * 96), r: 3 + k * 6, fill: '#8f8a80', opacity: 0.35 });
    }),
    note(20, 176, 'silver iodide', { bold: true, fill: COL.ink }),
    note(20, 188, 'burner', { bold: true, fill: COL.ink }),
    line(62, 186, 94, ridge(100) - 4, COL.ink, 1),
    // An aeroplane above, as the other way in.
    svg('g', { transform: 'translate(150 34)' }, svg('ellipse', { cx: 0, cy: 0, rx: 14, ry: 3, fill: COL.ink }), line(-3, 0, 3, -8, COL.ink, 2.5), line(-13, 0, -16, -5, COL.ink, 2)),
    note(170, 30, 'or an aeroplane, from above'),
    arrow(8, 150, 80, 138, COL.parcel, 2.4),
    note(8, 120, 'wind: moist', { bold: true, fill: COL.parcel }),
    note(8, 132, 'Pacific air', { fill: COL.parcel }),
    note(206, 60, 'supercooled cloud', { bold: true, anchor: 'middle' }),
    note(160, 196, 'seeded: more of its water', { bold: true, fill: '#fff' }),
    note(160, 208, 'falls as snow on the slopes', { fill: '#fff' }),
    arrow(272, 74, 340, 120, '#c2452d', 2),
    note(280, 64, 'unseeded water crosses', { fill: '#c2452d' }),
    note(280, 76, 'the crest and evaporates', { fill: '#c2452d' }),
    note(350, sea - 26, 'dry side:', { anchor: 'middle', fill: '#fff' }),
    note(350, sea - 14, 'Columbia Basin', { anchor: 'middle', fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- The cold box -------------------------------------------------------------

const AGENTS: { id: Agent; label: string; short: string }[] = [
  { id: 'none', label: 'Just breathe in', short: 'breath only' },
  { id: 'dust', label: 'A pinch of dust', short: 'dust' },
  { id: 'iodide', label: 'Silver iodide smoke', short: 'silver iodide' },
  { id: 'dryIce', label: 'A sliver of dry ice', short: 'dry ice' },
];

export const coldBoxFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 244;
  const f = frame(W, H, 4);
  const t = task();
  let tempC = 2;
  let agent: Agent | null = null;
  let age = 0; // seconds since the agent went in
  const box = { x: 70, y: 40, w: 260, h: 160 };
  // Droplets of breath: fixed specks of haze in the box.
  const rng = makeRng(7);
  const haze = Array.from({ length: 160 }, () => ({ x: box.x + 8 + rng() * (box.w - 16), y: box.y + 20 + rng() * (box.h - 30) }));
  // The lamp's beam: crystals glint only where it lights them.
  const beamTop = (x: number) => box.y + 30 - ((x - box.x) / box.w) * 20;
  const beamBottom = (x: number) => box.y + 80 + ((x - box.x) / box.w) * 70;
  const inBeam = (x: number, y: number) => y > beamTop(x) && y < beamBottom(x);
  const glints = Array.from({ length: 400 }, () => ({ x: box.x + 10 + rng() * (box.w - 20), y: box.y + 14 + rng() * (box.h - 30), r: 2 + rng() * 2.5, s: rng() }))
    .filter((c) => inBeam(c.x, c.y)).slice(0, 140);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  const describe = () => {
    if (!agent) {
      f.readout.textContent = tempC >= 0
        ? `A freezer box of breath-cloud at ${deg(tempC)}. Above freezing, these droplets are ordinary cloud. Try something in it anyway, then cool the box.`
        : `A freezer box of breath-cloud at ${deg(tempC)}: still liquid droplets, though below freezing. Supercooled. Drop something in.`;
      return;
    }
    const r = coldBox(agent, tempC);
    const what = AGENTS.find((a) => a.id === agent)!.label.toLowerCase();
    f.readout.textContent = r.result === 'warm'
      ? `Above 0 °C there is nothing to freeze: the droplets are ordinary cloud, and ${what} changes nothing.${agent === 'dryIce' ? ' Any crystals in its cold trail melt as soon as they drift out into the box.' : ''}`
      : r.result === 'nothing'
        ? `At ${deg(tempC)}, with ${what}, the droplets stay liquid. Nothing in the box can start ice.`
        : r.result === 'sparkles'
          ? `At ${deg(tempC)} a few crystals glint in the light: ${fmtCount(r.perL)}, among a hundred thousand droplets in each litre. Each grows, but there are far too few to take the cloud’s water: the cloud stays.`
          : `At ${deg(tempC)}, ${agent === 'dryIce' ? 'the dry ice leaves a trail of' : 'the smoke starts'} ${fmtCount(r.perL)} crystals. They eat the droplets, and in a minute the box is snowing: the cloud has turned to ice.`;
    if (goal === 'snow' && r.result === 'snow') t.resolve();
  };
  animate(f.node, ctx, (dt) => {
    age += dt;
    const r = agent ? coldBox(agent, tempC) : null;
    const target = !r ? 0 : r.result === 'snow' ? glints.length : r.result === 'sparkles' ? Math.min(14, Math.max(2, Math.round(4 + Math.log10(Math.max(1, r.perL * 50)) * 3))) : 0;
    const shown = Math.round(target * Math.min(1, age / 1.6));
    const glaciated = r?.result === 'snow' ? Math.min(1, Math.max(0, (age - 1) / 3)) : 0;
    const parts: SVGElement[] = [
      // The open chest freezer, lined with black velvet, a lamp shining across it.
      svg('rect', { x: box.x - 8, y: box.y - 6, width: box.w + 16, height: box.h + 14, rx: 6, fill: '#d9dde4', stroke: COL.soft, 'stroke-width': 1.5 }),
      svg('rect', { x: box.x, y: box.y, width: box.w, height: box.h, fill: '#1c1830' }),
      svg('polygon', { points: `${box.x},${beamTop(box.x)} ${box.x + box.w},${beamTop(box.x + box.w)} ${box.x + box.w},${beamBottom(box.x + box.w)} ${box.x},${beamBottom(box.x)}`, fill: '#fff6d8', opacity: 0.2 }),
      svg('rect', { x: box.x - 30, y: box.y + 36, width: 22, height: 30, rx: 4, fill: COL.sun }),
      note(box.x - 19, box.y + 28, 'lamp', { anchor: 'middle' }),
      ...haze.map((d) => svg('circle', { cx: d.x, cy: d.y, r: 2.2, fill: '#e6e2f3', opacity: (inBeam(d.x, d.y) ? 0.5 : 0.15) * (1 - glaciated) })),
    ];
    for (let i = 0; i < shown; i++) {
      const c = glints[i];
      const fall = r?.result === 'snow' ? ((age * 14 + c.s * 140) % (box.h - 20)) : 0;
      const y = r?.result === 'snow' ? box.y + 12 + fall : c.y;
      const tw = 0.6 + 0.4 * Math.sin(age * 5 + c.s * 20);
      parts.push(flake(c.x, y, c.r, '#ffffff', 1.1), svg('circle', { cx: c.x, cy: y, r: 1, fill: '#fff', opacity: tw }));
    }
    if (agent === 'dryIce' && age < 1.4 && tempC < 40) {
      const py = box.y + Math.min(box.h - 10, age * 140);
      parts.push(svg('rect', { x: 196, y: py - 6, width: 8, height: 8, fill: '#f4f6fb', stroke: COL.ice }), line(200, box.y, 200, py - 6, '#ffffff', 1.5, { opacity: 0.5 }));
    }
    if (agent === 'iodide' && age < 2.5) parts.push(svg('ellipse', { cx: box.x + 40 + age * 40, cy: box.y + 40, rx: 20 + age * 12, ry: 10 + age * 4, fill: '#d9d4c4', opacity: 0.4 * (1 - age / 2.5) }));
    if (agent === 'dust' && age < 1.5) parts.push(...Array.from({ length: 12 }, (_, i) => svg('circle', { cx: 190 + (i % 4) * 7, cy: box.y + 6 + age * 70 + Math.floor(i / 4) * 6, r: 1.2, fill: '#a7845b' })));
    parts.push(
      svg('rect', { x: box.x, y: box.y + box.h - 6, width: box.w, height: 6, fill: '#ffffff', opacity: 0.8 * glaciated }),
      label(box.x + box.w + 16, box.y + 16, deg(tempC), { bold: true, fill: tempC < 0 ? COL.ice : COL.parcel }),
      agent && agent !== 'none' ? note(box.x + box.w + 16, box.y + 36, 'added:', { soft: true }) : null as unknown as SVGElement,
      agent && agent !== 'none' ? note(box.x + box.w + 16, box.y + 48, AGENTS.find((a) => a.id === agent)!.short, { bold: true }) : null as unknown as SVGElement,
      // The key.
      svg('circle', { cx: box.x + 4, cy: 226, r: 3, fill: '#bdb6d4' }),
      note(box.x + 12, 229, 'droplet'),
      flake(box.x + 66, 226, 4, COL.ink, 1.3),
      note(box.x + 74, 229, 'ice crystal'),
      note(box.x + 140, 229, r?.result === 'sparkles' ? 'not to scale: really far fewer' : 'not to scale', { soft: true }),
    );
    redraw(g, ...parts);
  });
  const chips = el('div.chips', {}, AGENTS.map((a) => el('button.chip', {
    type: 'button',
    onclick: () => {
      agent = a.id;
      age = 0;
      describe();
    },
  }, a.label)));
  f.controls.append(
    slider('Box temperature', -25, 5, 1, tempC, (v) => deg(v), (v) => {
      tempC = v;
      // A fresh breath of cloud for every temperature.
      agent = null;
      age = 0;
      describe();
    }, 'ice').node,
    chips,
  );
  describe();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- A dry ice pellet's trail ---------------------------------------------------

export const dryIceDiagram: FigureFactory = () => {
  const d = still(400, 236);
  const rng = makeRng(3);
  // The pellet falls from the top; the oldest part of its trail, highest up, has spread the most.
  const px = 120;
  const py = 206;
  const half = (y: number) => 4 + ((py - y) / (py - 30)) * 20;
  const drops = Array.from({ length: 90 }, () => [10 + rng() * 210, 34 + rng() * 180] as [number, number]).filter(([x, y]) => Math.abs(x - px) > half(y) + 8);
  const trail = Array.from({ length: 50 }, (_, i) => {
    const y = 34 + i * 3.3;
    return [px + (rng() - 0.5) * 2 * half(y), y, 1.3 + ((py - y) / (py - 30)) * 1.8] as [number, number, number];
  });
  // Crystals that have drifted out of the trail into the cloud, growing.
  const drifted = Array.from({ length: 10 }, (_, i) => {
    const y = 40 + i * 8;
    const side = i % 2 ? 1 : -1;
    return [px + side * (half(y) + 6 + rng() * 14), y, 2.6] as [number, number, number];
  });
  const edge: [number, number][] = [];
  for (let y = 30; y <= py - 6; y += 6) edge.push([px - half(y), y]);
  const edge2: [number, number][] = edge.map(([x, y]) => [2 * px - x, y]);
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 236, fill: '#e6eef8' }),
    ...drops.map(([x, y]) => droplet(x, y, 2.4)),
    svg('polygon', { points: [...edge, ...[...edge2].reverse()].map((p) => p.join(',')).join(' '), fill: '#bcd3f2', opacity: 0.6 }),
    svg('polyline', { points: edge.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.ice, 'stroke-dasharray': '3 3' }),
    svg('polyline', { points: edge2.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.ice, 'stroke-dasharray': '3 3' }),
    ...trail.map(([x, y, r]) => flake(x, y, r, COL.ice, 1)),
    ...drifted.map(([x, y, r]) => flake(x, y, r, '#245aa8', 1.3)),
    svg('rect', { x: px - 6, y: py - 6, width: 12, height: 12, fill: '#f8fbff', stroke: COL.ice, 'stroke-width': 1.5 }),
    arrow(px + 14, py - 14, px + 14, py + 14, COL.soft, 1.4),
    heading(200, 18, 'A falling pellet of dry ice leaves a frozen trail'),
    note(px + 30, py + 6, 'pellet of dry ice, −78 °C', { bold: true }),
    line(px + half(150) + 2, 150, 236, 136, COL.ice, 1),
    note(240, 120, 'inside the dashed line, colder', { bold: true, fill: '#245aa8' }),
    note(240, 132, 'than −40 °C: droplets freeze', { fill: '#245aa8' }),
    note(240, 144, 'by themselves, and vapour', { fill: '#245aa8' }),
    note(240, 156, 'turns straight to ice', { fill: '#245aa8' }),
    line(px + half(60) + 20, 64, 236, 64, '#245aa8', 1),
    note(240, 60, 'crystals drift out and grow:', { bold: true, fill: '#245aa8' }),
    note(240, 72, 'hundreds of billions', { fill: '#245aa8' }),
    note(240, 84, 'from each gram', { fill: '#245aa8' }),
    line(40, 190, 236, 186, COL.dew, 1),
    droplet(40, 190, 2.4),
    note(240, 184, 'all around: supercooled', { bold: true, fill: COL.ink }),
    note(240, 196, 'droplets at −10 °C', { fill: COL.ink }),
  );
  return { node: d.node };
};

// ---- Silver iodide looks like ice ------------------------------------------------

export const latticeDiagram: FigureFactory = () => {
  const d = still(400, 250);
  const hexGrid = (cx: number, cy: number, s: number, a: string, b: string | null) => {
    const out: SVGElement[] = [];
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const x = cx + (col + (row % 2 ? 0.5 : 0)) * s;
        const y = cy + row * s * 0.866;
        if (Math.abs(x - cx) > 2.6 * s) continue;
        const alt = b && (row + col) % 2 !== 0;
        out.push(svg('circle', { cx: x, cy: y, r: 5, fill: alt ? b! : a }));
      }
    }
    // One six-sided ring outlined.
    const ring = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]].map(([c, r]) => [cx + (c + (r % 2 ? 0.5 : 0)) * s, cy + r * s * 0.866]);
    out.push(svg('polygon', { points: ring.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.ink, 'stroke-width': 1.6 }));
    return out;
  };
  const square = (cx: number, cy: number, s: number) => {
    const out: SVGElement[] = [];
    for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) out.push(svg('circle', { cx: cx + col * s, cy: cy + row * s, r: (row + col) % 2 ? 4 : 6, fill: (row + col) % 2 ? '#8f8a80' : '#c8c2b6' }));
    out.push(svg('rect', { x: cx - s, y: cy - s, width: s, height: s, fill: 'none', stroke: COL.ink, 'stroke-width': 1.6 }));
    return out;
  };
  const key = (x: number, y: number, fill: string, r: number, text: string) => svg('g', {}, svg('circle', { cx: x, cy: y - 3, r, fill }), note(x + 8, y, text));
  // Spacing, as bars: the difference drawn ten times bigger than it is.
  const sp = (y: number, w: number, color: string, text: string) => svg('g', {}, svg('rect', { x: 120, y, width: w, height: 7, fill: color }), note(124 + w, y + 7, text));
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 250, fill: COL.paper }),
    heading(200, 16, 'Looking straight down on one flat layer of each crystal'),
    heading(68, 36, 'Ice'),
    ...hexGrid(68, 96, 21, COL.ice, null),
    key(30, 150, COL.ice, 4, 'water molecule'),
    heading(200, 36, 'Silver iodide'),
    ...hexGrid(200, 96, 21.3, '#a0a6b0', '#7a5ca3'),
    key(158, 150, '#a0a6b0', 4, 'silver'),
    key(206, 150, '#7a5ca3', 4, 'iodine'),
    heading(332, 36, 'Salt'),
    ...square(332, 96, 21),
    key(292, 150, '#c8c2b6', 5, 'chlorine'),
    key(346, 150, '#8f8a80', 3.5, 'sodium'),
    note(68, 170, 'six-sided', { bold: true, anchor: 'middle' }),
    note(200, 170, 'six-sided, nearly the same size', { bold: true, anchor: 'middle' }),
    note(332, 170, 'square: the wrong shape', { bold: true, anchor: 'middle' }),
    note(10, 194, 'spacing,', { soft: true }),
    note(10, 206, 'gap drawn ×10:', { soft: true }),
    sp(186, 120, COL.ice, 'ice 0.452 nm'),
    sp(198, 139, '#7a5ca3', 'silver iodide 0.459 nm (+1.5%)'),
    note(200, 230, 'A supercooled droplet freezes on whatever looks enough like ice. Salt is a fine speck', { soft: true, anchor: 'middle' }),
    note(200, 242, 'for droplets to form on (Lesson 1), but useless for starting ice.', { soft: true, anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Seeding a layer from the air ------------------------------------------------

/** Two log scales under the seeded layer: how many crystals, and how big each grows. */
function gauges(s: { perL: number; sizeMm: number; result: string }): SVGElement[] {
  const x0 = 110;
  const x1 = 390;
  const scale = (y: number, lo: number, hi: number, v: number, zones: [number, number, string, string][], ticks: [number, string][], name: string) => {
    const xOf = (q: number) => x0 + ((Math.log10(q) - lo) / (hi - lo)) * (x1 - x0);
    const vx = Math.max(x0, Math.min(x1, xOf(Math.max(v, 10 ** lo))));
    return [
      note(x0 - 6, y + 8, name, { bold: true, anchor: 'end' }),
      ...zones.map(([a, b, fill, text]) => svg('g', {},
        svg('rect', { x: xOf(a), y, width: xOf(b) - xOf(a), height: 11, fill }),
        note((xOf(a) + xOf(b)) / 2, y + 8.5, text, { anchor: 'middle', fill: COL.ink }))),
      ...ticks.map(([q, text]) => note(xOf(q), y + 21, text, { soft: true, anchor: 'middle' })),
      svg('polygon', { points: `${vx},${y - 1} ${vx - 5},${y - 8} ${vx + 5},${y - 8}`, fill: COL.ink }),
    ];
  };
  if (s.result === 'warm') return [note(200, 262, 'Above 0 °C: no supercooled water, nothing to seed.', { bold: true, anchor: 'middle' })];
  return [
    ...scale(236, -1, 4, s.perL, [[0.1, 0.3, '#eeeeee', ''], [0.3, 5, '#dfe9f6', 'flurries'], [5, 3000, '#bfe3c9', 'a hole'], [3000, 1e4, '#e4dbef', 'veil']], [[1, '1'], [10, '10'], [100, '100'], [1000, '1,000']], 'crystals a litre'),
    ...scale(272, -1.5, 0.7, s.sizeMm, [[10 ** -1.5, 0.15, '#e4dbef', 'too small to fall'], [0.15, 10 ** 0.7, '#bfe3c9', 'big enough to fall']], [[0.1, '0.1 mm'], [1, '1 mm']], 'each crystal'),
  ];
}

export const seedLayerFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 4);
  const t = task();
  const top = 70;
  const base = 112;
  const ground = 206;
  const x0 = 130;
  const x1 = 270;
  let lb = 0.001;
  let tempC = -10;
  let age = 0;
  const rng = makeRng(11);
  const puffs = Array.from({ length: 70 }, (_, i) => ({ x: (i / 70) * (W + 20) - 10, y: top + 8 + rng() * (base - top - 16), r: 9 + rng() * 9 }));
  const flakes = Array.from({ length: 50 }, () => ({ x: x0 + rng() * (x1 - x0), s: rng() }));
  const g = svg('g');
  f.svg.append(g);
  const describe = () => {
    const s = seedLayer(lb, tempC);
    const size = `${s.sizeMm >= 1 ? s.sizeMm.toFixed(1) : s.sizeMm.toFixed(2)} mm`;
    f.readout.textContent = s.result === 'warm'
      ? `At ${deg(tempC)} the layer is not supercooled: the dry ice chills a trail for a moment, and the cloud closes behind it. Nothing changes.`
      : s.result === 'nothing'
        ? `Hardly any ice: ${fmtCount(s.perL)}. The supercooled layer carries on as it was.`
        : s.result === 'flurries'
          ? `${fmtCount(s.perL)}: each crystal has plenty of water to itself and grows to ${size}, but there are too few to empty the layer. A few flurries; the cloud stays.`
          : s.result === 'hole'
            ? `${fmtCount(s.perL)}, each growing to about ${size}: big enough to fall. In half an hour the crystals have taken the layer’s water and snowed out of it, leaving a hole.`
            : `${fmtCount(s.perL)}: so many that each gets only a speck of water and stays ${size} across, too small to fall. Overseeded: the layer turns to a veil of ice that hangs there.`;
    if (goal === 'hole' && s.result === 'hole') t.resolve();
  };
  animate(f.node, ctx, (dt) => {
    age += dt;
    const s = seedLayer(lb, tempC);
    const k = Math.min(1, Math.max(0, (age - 1.2) / 4)); // how far the seeded patch has gone
    const spread = 16 * k;
    const inPatch = (x: number) => x > x0 - spread && x < x1 + spread;
    const parts: SVGElement[] = [
      svg('rect', { x: 0, y: 0, width: W, height: ground, fill: '#7fb0d6' }),
      svg('rect', { x: 0, y: ground, width: W, height: 14, fill: '#b3b072' }),
      svg('rect', { x: 0, y: ground + 14, width: W, height: H - ground - 14, fill: COL.paper }),
      ...[40, 120, 200, 280, 360].map((x) => line(x, ground + 3, x + 30, ground + 11, '#a39150', 2)),
    ];
    for (const p of puffs) {
      let op = 0.95;
      let fill = '#ffffff';
      if (inPatch(p.x)) {
        if (s.result === 'hole') op = 0.95 * (1 - k);
        if (s.result === 'overseeded') op = 0.95 * (1 - k);
      }
      if (op > 0.02) parts.push(svg('circle', { cx: p.x, cy: p.y, r: p.r, fill, opacity: op }));
    }
    if (s.result === 'overseeded' && k > 0) {
      // A smooth, silky veil of tiny ice where the puffy layer was.
      parts.push(svg('rect', { x: x0 - spread, y: top + 2, width: x1 - x0 + 2 * spread, height: base - top - 4, rx: 10, fill: '#c3cfe6', opacity: 0.9 * k }));
      for (let x = x0 - spread + 4; x < x1 + spread - 10; x += 8) parts.push(line(x, top + 8, x + 10, base - 8, '#ffffff', 1, { opacity: 0.7 * k }));
      if (k > 0.5) parts.push(note((x0 + x1) / 2, base + 16, 'a veil of ice too fine to fall', { bold: true, anchor: 'middle', fill: COL.ink }));
    }
    // Snow out of the bottom of the patch, as big as the crystals have grown.
    const snowing = s.result === 'hole' ? 1 : s.result === 'flurries' ? 0.12 : 0;
    if (snowing && k > 0) {
      const r = Math.max(1.5, Math.min(5, 1.5 + s.sizeMm * 1.6));
      for (const fl of flakes.slice(0, Math.max(3, Math.round(flakes.length * snowing)))) {
        const y = base + ((age * 22 + fl.s * 100) % (ground - base));
        parts.push(flake(fl.x + (y - base) * 0.2, y, r, '#ffffff', 1.3));
      }
      parts.push(note(x1 + 24, base + 40, s.result === 'hole' ? 'snow' : 'a few flurries', { bold: true, fill: '#fff' }));
    }
    // The aeroplane, across and round again, dropping pellets on its first pass.
    const px = -40 + ((age / 4) % 1) * (W + 80);
    parts.push(
      svg('g', { transform: `translate(${px} 48)` },
        svg('ellipse', { cx: 0, cy: 0, rx: 16, ry: 3.5, fill: COL.ink }),
        svg('rect', { x: -4, y: -1.5, width: 8, height: 3, fill: COL.ink, transform: 'scale(1 1)' }),
        line(-3, 0, 3, -9, COL.ink, 3), line(-3, 0, 3, 9, COL.ink, 2),
        line(-15, 0, -18, -6, COL.ink, 2.5)),
    );
    if (lb > 0.005 && age < 4) for (let x = x0; x < Math.min(x1, px); x += 14) parts.push(svg('rect', { x, y: 52 + (age * 60 - (x - x0) / 30) % 40, width: 3, height: 3, fill: '#ffffff' }));
    parts.push(
      line(x0, 36, x1, 36, COL.ink, 1, { 'stroke-dasharray': '3 3' }),
      note((x0 + x1) / 2, 32, 'seeded from here to here', { anchor: 'middle' }),
      note(10, top - 6, `a supercooled layer at ${deg(tempC)}`, { bold: true, fill: COL.ink }),
      ...gauges(s),
    );
    redraw(g, ...parts);
  });
  const restart = () => {
    age = 0;
    describe();
  };
  f.controls.append(
    slider('Dry ice, pounds a mile', -3, 2, 0.05, -3, (v) => {
      const lbs = Math.pow(10, v);
      return `${lbs < 0.1 ? lbs.toFixed(3) : lbs < 10 ? lbs.toFixed(1) : lbs.toFixed(0)} lb a mile`;
    }, (v) => { lb = Math.pow(10, v); restart(); }, 'ice').node,
    slider('Layer temperature', -15, 3, 1, tempC, (v) => deg(v), (v) => { tempC = v; restart(); }, 'ice').node,
  );
  describe();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- How much water a cloud holds --------------------------------------------------

export const cloudWaterDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const base = 180;
  const mmPx = 10; // a bar 10 px tall per millimetre of water
  const bar = (x: number, mm: number, value: string, broken = false) => {
    const h = Math.max(1.5, Math.min(140, mm * mmPx));
    return svg('g', {},
      svg('rect', { x: x - 22, y: base - h, width: 44, height: h, fill: COL.rain }),
      broken ? svg('g', {}, svg('rect', { x: x - 26, y: base - 104, width: 52, height: 8, fill: COL.paper }), line(x - 26, base - 98, x + 26, base - 104, COL.ink, 1), line(x - 26, base - 90, x + 26, base - 96, COL.ink, 1)) : null as unknown as SVGElement,
      note(x, base - h - 6, value, { bold: true, anchor: 'middle' }),
    );
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 240, fill: COL.paper }),
    line(20, base, 380, base, COL.ink, 1.5),
    bar(70, 0.2, '0.2 mm'), bar(200, 12, '10 to 15 mm'), bar(330, 250, '250 mm', true),
    arrow(30, 146, 46, base - 2, COL.ink, 1.2),
    note(30, 140, 'this sliver', { anchor: 'middle' }),
    note(200, 34, '60 times the cloud', { soft: true, anchor: 'middle' }),
    note(200, base + 46, 'The year’s bar is cut short to fit: it is really 20 storm days’ worth.', { soft: true, anchor: 'middle' }),
    note(70, base + 14, 'all the water in a', { anchor: 'middle' }),
    note(70, base + 26, 'cloud layer 1 km deep', { anchor: 'middle' }),
    note(200, base + 14, 'a day of steady rain', { anchor: 'middle' }),
    note(200, base + 26, 'from a passing storm', { anchor: 'middle' }),
    note(330, base + 14, 'a whole year in the', { anchor: 'middle' }),
    note(330, base + 26, 'dry Columbia Basin', { anchor: 'middle' }),
  );
  return { node: d.node };
};

export const conveyorDiagram: FigureFactory = () => {
  const d = still(400, 230);
  const ground = 196;
  const cloud = svg('path', { d: 'M120,112 Q118,84 146,82 Q156,58 190,64 Q214,46 244,64 Q276,60 282,86 Q306,92 298,114 Z', fill: '#ffffff', stroke: COL.cloudShade, 'stroke-width': 1.2 });
  const rain = Array.from({ length: 14 }, (_, i) => line(140 + i * 11, 118, 134 + i * 11, ground - 2, COL.rain, 1.4, { opacity: 0.7 }));
  const gauge = (x: number, mm: number, when: string) => svg('g', {},
    svg('rect', { x: x - 9, y: ground - 46, width: 18, height: 46, fill: '#ffffff', stroke: COL.soft }),
    svg('rect', { x: x - 8, y: ground - 1 - mm * 3, width: 16, height: mm * 3, fill: COL.rain }),
    note(x, ground + 14, when, { anchor: 'middle', fill: '#fff' }),
    note(x, ground - 52, `${mm} mm`, { bold: true, anchor: 'middle' }),
  );
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: '#e3ecf4' }),
    svg('rect', { x: 0, y: ground, width: 400, height: 34, fill: COL.ground }),
    // New moist air streams in and is lifted through the cloud.
    arrow(4, 170, 100, 160, COL.parcel, 2.6),
    arrow(4, 150, 96, 140, COL.parcel, 2.6),
    arrow(118, 150, 150, 104, COL.parcel, 2),
    note(112, 160, 'lifted', { anchor: 'end', fill: COL.parcel }),
    note(6, 118, 'new moist air keeps', { bold: true, fill: COL.parcel }),
    note(6, 130, 'arriving off the Pacific', { fill: COL.parcel }),
    arrow(300, 70, 380, 54, COL.soft, 1.6),
    note(306, 48, 'dried air leaves', { fill: COL.soft }),
    ...rain,
    cloud,
    note(210, 90, 'holds only 0.2 mm', { bold: true, anchor: 'middle' }),
    note(210, 102, 'at any moment', { anchor: 'middle' }),
    gauge(312, 1, '1 h'), gauge(346, 6, '6 h'), gauge(380, 12, '12 h'),
    note(346, 124, 'rain gauge', { soft: true, anchor: 'middle' }),
    heading(200, 20, 'A cloud is a conveyor, not a bucket'),
  );
  return { node: d.node };
};

// ---- Where seeding can help ----------------------------------------------------------

export const seedWindowDiagram: FigureFactory = () => {
  const d = still(400, 320);
  const yOf = (c: number) => 12 + ((10 - c) / 60) * 290;
  const bx = 124; // bands start here; the height scales sit to the left
  const band = (from: number, to: number, fill: string, lines: string[], color: string) => {
    const mid = (yOf(from) + yOf(to)) / 2 - ((lines.length - 1) * 12) / 2 + 3.5;
    return svg('g', {},
      svg('rect', { x: bx, y: yOf(from), width: 400 - bx, height: yOf(to) - yOf(from), fill }),
      ...lines.map((text, i) => note(bx + 6, mid + i * 12, text, { fill: color, bold: i === 0 })),
    );
  };
  // How high each temperature is, in summer (warm ground) and in winter (0 °C at the ground).
  const heightScale = (x: number, groundC: number, title: string) => svg('g', {},
    note(x - 6, 9, title, { bold: true }),
    note(x - 6, yOf(-50) + 14, groundC > 10 ? 'ground 20 °C' : 'ground 0 °C', { soft: true }),
    line(x, yOf(Math.min(10, groundC)), x, yOf(-50), COL.soft, 1),
    ...[0, 2, 4, 6, 8].map((km) => {
      const c = groundC - 6.5 * km;
      return c <= 10 && c >= -50 ? svg('g', {}, line(x - 3, yOf(c), x + 3, yOf(c), COL.soft, 1), note(x + 5, yOf(c) + 3.5, `${km} km`, { soft: true })) : null as unknown as SVGElement;
    }),
  );
  const cloud = (id: GenusId, x: number, c: number, s: number) => svg('g', { transform: `translate(${x} ${yOf(c)}) scale(${s})` }, drawCloud(id, PALETTES.day, 4));
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 320, fill: COL.paper }),
    band(10, 0, '#f8e3d6', ['Above 0 °C: nothing to freeze'], '#b0583a'),
    band(0, -5, '#f3e6b8', ['0 to −5 °C: dry ice only'], '#7a5a10'),
    band(-5, -25, '#cfe0f6', ['−5 to −25 °C: the seeding window', 'supercooled water, and', 'little ice of its own'], '#2f5fa8'),
    band(-25, -38, '#e4dbef', ['−25 to −38 °C: natural specks', 'take over, more so the colder'], COL.env),
    band(-38, -50, '#f2f6fc', ['Below −38 °C: all ice'], COL.ink),
    ...[10, 0, -10, -20, -30, -40, -50].map((c) => note(bx - 4, yOf(c) + 3.5, deg(c), { soft: true, anchor: 'end' })),
    heightScale(10, 20, 'summer'),
    heightScale(54, 0, 'winter'),
    cloud('cumulus', 350, 4, 0.42),
    note(350, yOf(4) + 14, 'summer cumulus', { anchor: 'middle' }),
    cloud('stratus', 350, -8, 0.42),
    note(350, yOf(-8) + 14, 'winter fog, stratus', { anchor: 'middle' }),
    cloud('altocumulus', 350, -18, 0.42),
    note(350, yOf(-18) + 14, 'winter altocumulus', { anchor: 'middle' }),
    cloud('cirrus', 350, -44, 0.5),
    note(350, yOf(-44) + 14, 'cirrus', { anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Where it works: fog, and a fair test -------------------------------------------

export const fogHoleDiagram: FigureFactory = () => {
  const d = still(400, 204);
  const ground = 170;
  const rng = makeRng(31);
  const fog: SVGElement[] = [];
  for (let i = 0; i < 120; i++) {
    const x = rng() * 420 - 10;
    const y = 96 + rng() * 70;
    if (Math.abs(x - 210) < 70 - (y - 96) * 0.2) continue;
    fog.push(svg('circle', { cx: x, cy: y, r: 10 + rng() * 8, fill: '#f2f2f6', opacity: 0.9 }));
  }
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: '#9cc0e0' }),
    ...fog,
    ...Array.from({ length: 16 }, (_, i) => flake(160 + (i % 8) * 14, 120 + Math.floor(i / 8) * 22 + (i % 3) * 5, 2.4, '#ffffff', 1.2)),
    svg('rect', { x: 0, y: ground, width: 400, height: 34, fill: '#8a8f7a' }),
    svg('rect', { x: 130, y: ground + 8, width: 160, height: 12, fill: '#4a4a52' }),
    ...[150, 180, 210, 240, 270].map((x) => line(x, ground + 14, x + 12, ground + 14, '#ffffff', 1.5)),
    svg('g', { transform: 'translate(120 60)' }, svg('ellipse', { cx: 0, cy: 0, rx: 14, ry: 3, fill: COL.ink }), line(-3, 0, 3, -8, COL.ink, 2.5), line(-13, 0, -16, -5, COL.ink, 2)),
    line(140, 62, 290, 62, COL.ink, 1, { 'stroke-dasharray': '3 3' }),
    note(140, 54, 'dry ice dropped along the runway'),
    note(8, 112, 'supercooled fog, −7 °C', { bold: true }),
    note(296, 112, 'a clear hole for', { bold: true }),
    note(296, 124, 'an hour or so'),
    note(8, 20, 'Fog warmer than 0 °C: no effect at all.', { soft: true }),
  );
  return { node: d.node };
};

export const fairTestDiagram: FigureFactory = () => {
  const d = still(400, 230);
  const coins = ['H', 'T', 'T', 'H', 'H', 'T', 'H', 'T', 'T', 'H'];
  const row = coins.map((c, i) => {
    const x = 30 + i * 37;
    return svg('g', {},
      svg('path', { d: `M${x - 13},48 Q${x - 14},36 ${x - 4},36 Q${x},28 ${x + 8},34 Q${x + 16},34 ${x + 14},48 Z`, fill: c === 'H' ? '#bcd3f2' : '#ffffff', stroke: COL.cloudShade }),
      svg('circle', { cx: x, cy: 66, r: 8, fill: '#e2c46d', stroke: '#b0894f' }),
      heading(x, 70, c, { fill: '#6b5420' }),
      note(x, 88, c === 'H' ? 'seed' : 'leave', { anchor: 'middle', fill: c === 'H' ? COL.ice : COL.soft }),
    );
  });
  const area = (x: number, name: string, fill: string, says: string) => svg('g', {},
    svg('ellipse', { cx: x, cy: 168, rx: 62, ry: 30, fill, stroke: COL.soft }),
    note(x, 166, name, { bold: true, anchor: 'middle' }),
    note(x, 178, says, { anchor: 'middle' }),
  );
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 230, fill: COL.paper }),
    heading(200, 18, 'Two ways to keep luck out'),
    ...row,
    line(10, 104, 390, 104, COL.grid, 1),
    note(10, 122, 'Toss a coin for each storm before it comes, and compare.', { bold: true }),
    arrow(10, 152, 392, 152, COL.soft, 1.6),
    arrow(10, 186, 392, 186, COL.soft, 1.6),
    note(10, 146, 'storms', { fill: COL.soft }),
    area(150, 'target area', '#cfe0f6', 'seeded'),
    area(300, 'control area', '#ece8df', 'never seeded'),
    note(8, 214, 'The same storms cross both areas. Compare the target with the control.'),
  );
  return { node: d.node };
};

// ---- Did it work? ----------------------------------------------------------------------

export const trialFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 292;
  const f = frame(W, H, 5);
  const t = task();
  let winters = 1;
  let random = true;
  let draw = 0; // which run of winters: "new winters" deals another
  let truth = false;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  const x0 = 84;
  const x1 = 390;
  const xOf = (mm: number) => x0 + ((Math.log(mm) - Math.log(1.5)) / (Math.log(45) - Math.log(1.5))) * (x1 - x0);
  const rows = { seeded: 50, unseeded: 118 };
  // The number line for the result: how many times the snow, 0.5 to 2.5.
  const r0 = 84;
  const r1 = 390;
  const rOf = (v: number) => r0 + ((Math.min(2.5, Math.max(0.5, v)) - 0.5) / 2) * (r1 - r0);
  const paint = () => {
    // The same storms each time, so more winters only add to what was seen.
    const storms = runTrial(winters, random, (random ? 1 : 2) + draw * 10);
    const v = judge(storms);
    const jitter = makeRng(5);
    const dots = storms.map((s) => {
      const y = (s.seeded ? rows.seeded : rows.unseeded) + (jitter() - 0.5) * 44;
      return svg('circle', { cx: Math.max(x0, Math.min(x1, xOf(s.mm))), cy: y, r: winters > 12 ? 1.8 : 2.6, fill: s.seeded ? COL.ice : COL.soft, opacity: 0.6 });
    });
    const gm = (list: number[]) => Math.exp(list.map((m) => Math.log(m)).reduce((a, b) => a + b, 0) / Math.max(1, list.length));
    const seededMm = gm(storms.filter((s) => s.seeded).map((s) => s.mm));
    const otherMm = gm(storms.filter((s) => !s.seeded).map((s) => s.mm));
    const pickedNatural = gm(storms.filter((s) => s.seeded).map((s) => s.natural));
    const ry = 238;
    redraw(g,
      ...dots,
      line(xOf(seededMm), rows.seeded - 26, xOf(seededMm), rows.seeded + 26, COL.ice, 2.5),
      line(xOf(otherMm), rows.unseeded - 26, xOf(otherMm), rows.unseeded + 26, COL.ink, 2.5),
      !random ? line(xOf(pickedNatural), rows.seeded - 26, xOf(pickedNatural), rows.seeded + 26, COL.ice, 1.5, { 'stroke-dasharray': '3 3' }) : null,
      !random ? note(Math.min(x1 - 4, xOf(pickedNatural) - 4), rows.seeded + 38, 'dashed: the same storms, unseeded', { anchor: 'end', fill: COL.ice }) : null,
      label(6, rows.seeded + 4, random ? 'seeded' : 'picked,', { bold: true, fill: COL.ice }),
      !random ? label(6, rows.seeded + 17, 'seeded', { bold: true, fill: COL.ice }) : null,
      label(6, rows.unseeded + 4, 'not seeded', { bold: true, fill: COL.soft }),
      line(x0, 148, x1, 148, COL.ink, 1),
      ...[2, 5, 10, 20, 40].map((mm) => note(xOf(mm), 160, `${mm}`, { soft: true, anchor: 'middle' })),
      note(x0 - 6, 160, 'mm of water', { soft: true, anchor: 'end' }),
      note(x0, 14, `${storms.length} storms; each dot is one storm’s snow; the line is each group’s middle storm`, { soft: true }),
      // The verdict: how many times the snow, and the range luck allows.
      note(x0 - 6, ry + 4, 'seeded ÷', { bold: true, anchor: 'end' }),
      note(x0 - 6, ry + 16, 'not seeded', { bold: true, anchor: 'end' }),
      line(r0, ry + 14, r1, ry + 14, COL.ink, 1),
      ...[0.5, 1, 1.5, 2, 2.5].map((k) => note(rOf(k), ry + 27, `${k}×`, { soft: true, anchor: 'middle' })),
      line(rOf(1), ry - 22, rOf(1), ry + 14, COL.ink, 1.2, { 'stroke-dasharray': '3 3' }),
      note(rOf(1), ry - 26, 'no difference', { soft: true, anchor: 'middle' }),
      random ? svg('rect', { x: rOf(v.low), y: ry - 5, width: rOf(v.high) - rOf(v.low), height: 10, rx: 5, fill: v.low > 1 ? '#bfe3c9' : '#e4dbef' }) : null,
      random ? note(r1, ry - 26, 'bar: the range luck allows', { soft: true, anchor: 'end' }) : null,
      svg('circle', { cx: rOf(v.ratio), cy: ry, r: 4.5, fill: COL.ice }),
      v.ratio > 2.5 ? note(r1 - 8, ry - 8, `${v.ratio.toFixed(1)}× →`, { bold: true, anchor: 'end', fill: COL.ice }) : null,
      truth ? line(rOf(TRUE_EFFECT), ry - 22, rOf(TRUE_EFFECT), ry + 14, '#3f9b6a', 2.2) : null,
      truth ? note(rOf(TRUE_EFFECT) + 4, ry + 42, 'the truth: seeding adds 15%', { bold: true, fill: '#3f9b6a' }) : null,
    );
    const times = `${v.ratio.toFixed(2)} times`;
    const range = `Luck alone could have put it anywhere from ${v.low.toFixed(2)} to ${v.high.toFixed(2)} times.`;
    f.readout.textContent = !random
      ? `The picked storms brought ${times} the snow of the others. But unseeded, the same storms would still have brought ${(pickedNatural / otherMm).toFixed(2)} times as much: the seeder picked storms that were going to snow anyway. Most of the gap is the pick, not the dry ice.`
      : v.low > 1
        ? `Seeded storms brought ${times} the snow of the others. ${range} The whole range is above 1: after ${winters} winters, seeding has made a difference, and a small one.`
        : `Seeded storms brought ${times} the snow of the others. ${range} That range includes 1, “no difference”, so ${winters === 1 ? 'one winter' : `${winters} winters`} can’t tell.`;
    if (goal === 'clear' && random && v.low > 1) t.resolve();
  };
  const seg = el('div.seg', {}, ...[['Coin toss', true], ['Seeder’s pick', false]].map(([text, r]) => el('button', {
    type: 'button',
    className: r === random ? 'on' : '',
    onclick: (e: MouseEvent) => {
      random = r as boolean;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
      paint();
    },
  }, text as string)));
  const buttons = el('div.chips', {},
    el('button.chip', { type: 'button', onclick: () => { draw++; paint(); } }, 'New winters'),
    el('button.chip', { type: 'button', onclick: (e: MouseEvent) => { truth = !truth; (e.currentTarget as HTMLElement).textContent = truth ? 'Hide the truth' : 'Show the true effect'; paint(); } }, 'Show the true effect'),
  );
  f.controls.append(
    slider('Winters', 1, 30, 1, winters, (v) => `${v} (${v * STORMS_PER_WINTER} storms)`, (v) => { winters = v; paint(); }, 'ice').node,
    el('label.fig-slider', {}, el('span', {}, 'Which storms are seeded'), seg),
    buttons,
  );
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};
