// Figures for cloud seeding: a cold box of supercooled cloud to drop things
// into, a dry ice pellet's frozen trail, silver iodide posing as ice, a layer
// of cloud seeded from the air, how much water a cloud really holds, the
// temperatures where seeding can help, and a seeding trial against luck.

import { coldBox, judge, runTrial, seedLayer, STORMS_PER_WINTER, type Agent } from '../../core/cold-cloud';
import type { GenusId } from '../../core/clouds';
import { makeRng } from '../../core/rng';
import { el, svg } from '../dom';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { arrow, heading, small, still } from './front';
import { COL, animate, frame, label, line, redraw, slider, task, type FigureFactory } from './kit';

/** A six-armed crystal. */
function flake(x: number, y: number, r: number, color: string = COL.ice, width = 1.4): SVGElement {
  return svg('g', {}, ...[0, 1, 2].map((k) => line(x - r * Math.cos((k * Math.PI) / 3), y - r * Math.sin((k * Math.PI) / 3), x + r * Math.cos((k * Math.PI) / 3), y + r * Math.sin((k * Math.PI) / 3), color, width)));
}

/** A temperature with a proper minus sign. */
const deg = (c: number) => `${c < 0 ? '−' : ''}${Math.abs(c)} °C`;

function fmtCount(n: number): string {
  if (n < 0.01) return 'almost none';
  if (n < 1) return `one in every ${Math.round(1 / n).toLocaleString()} litres`;
  if (n < 1000) return `${Math.round(n).toLocaleString()} per litre`;
  if (n < 1e6) return `${Math.round(n / 1000).toLocaleString()} thousand per litre`;
  return `${Math.round(n / 1e6).toLocaleString()} million per litre`;
}

// ---- The cold box -------------------------------------------------------------

const AGENTS: { id: Agent; label: string }[] = [
  { id: 'none', label: 'Just breathe in' },
  { id: 'dust', label: 'A pinch of dust' },
  { id: 'iodide', label: 'Silver iodide smoke' },
  { id: 'dryIce', label: 'A sliver of dry ice' },
];

export const coldBoxFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 4);
  const t = task();
  let tempC = 2;
  let agent: Agent | null = null;
  let age = 0; // seconds since the agent went in
  const box = { x: 70, y: 40, w: 260, h: 160 };
  // Droplets of breath: fixed specks of haze in the box.
  const rng = makeRng(7);
  const haze = Array.from({ length: 160 }, () => ({ x: box.x + 8 + rng() * (box.w - 16), y: box.y + 20 + rng() * (box.h - 30) }));
  const glints = Array.from({ length: 140 }, () => ({ x: box.x + 10 + rng() * (box.w - 20), y: box.y + 14 + rng() * (box.h - 30), r: 2 + rng() * 2.5, s: rng() }));
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
      ? `Above 0 °C there is nothing to freeze: the droplets are ordinary cloud, and ${what} changes nothing.`
      : r.result === 'nothing'
        ? `At ${deg(tempC)}, with ${what}, the droplets stay liquid. Nothing in the box can start ice.`
        : r.result === 'sparkles'
          ? `At ${deg(tempC)} a few crystals glint in the light: ${fmtCount(r.perL)}, among a hundred thousand droplets. They grow, but the cloud stays.`
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
      svg('polygon', { points: `${box.x},${box.y + 30} ${box.x + box.w},${box.y + 10} ${box.x + box.w},${box.y + box.h - 10} ${box.x},${box.y + 80}`, fill: '#fff6d8', opacity: 0.12 }),
      svg('rect', { x: box.x - 30, y: box.y + 36, width: 22, height: 30, rx: 4, fill: COL.sun }),
      small(box.x - 19, box.y + 80, 'lamp', { 'text-anchor': 'middle' }),
      ...haze.map((d) => svg('circle', { cx: d.x, cy: d.y, r: 2.2, fill: '#e6e2f3', opacity: tempC >= -40 ? 0.35 * (1 - glaciated) : 0 })),
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
      label(box.x + box.w + 16, box.y + 16, deg(tempC), { class: 'fig-label bold', fill: tempC < 0 ? COL.ice : COL.parcel }),
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
  const d = still(400, 230);
  const rng = makeRng(3);
  // The pellet falls from the top; the oldest part of its trail, highest up, has spread the most.
  const px = 132;
  const py = 204;
  const drops = Array.from({ length: 70 }, () => [10 + rng() * 380, 30 + rng() * 180] as [number, number]).filter(([x, y]) => Math.abs(x - px) > 20 + (py - y) * 0.25 && x < 230);
  const trail = Array.from({ length: 60 }, (_, i) => {
    const age = 1 - i / 60; // 1 at the top, 0 at the pellet
    return [px + (rng() - 0.5) * (6 + age * 70), 30 + i * 2.85, 1.2 + age * 1.8] as [number, number, number];
  });
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 230, fill: '#e6eef8' }),
    ...drops.map(([x, y]) => svg('circle', { cx: x, cy: y, r: 2.6, fill: COL.rain, opacity: 0.35 })),
    svg('path', { d: `M${px - 40},26 Q${px - 12},120 ${px - 5},${py - 6} L${px + 5},${py - 6} Q${px + 12},120 ${px + 40},26 Z`, fill: '#c8dcf5', opacity: 0.55 }),
    ...trail.map(([x, y, r]) => flake(x, y, r, COL.ice, 1)),
    svg('rect', { x: px - 6, y: py - 6, width: 12, height: 12, fill: '#f8fbff', stroke: COL.ice, 'stroke-width': 1.5 }),
    arrow(px + 14, py - 14, px + 14, py + 14, COL.soft, 1.4),
    heading(200, 16, 'Behind a falling pellet, the air is chilled below −40 °C'),
    small(px + 24, py + 10, 'a pellet of dry ice, −78 °C, falling'),
    small(236, 60, 'In that thin trail, droplets and', { fill: COL.ice }),
    small(236, 72, 'vapour freeze by themselves:', { fill: COL.ice }),
    small(236, 84, 'no speck needed.', { fill: COL.ice }),
    small(236, 112, 'The crystals spread out into the', { fill: COL.ice }),
    small(236, 124, 'cloud: hundreds of billions from', { fill: COL.ice }),
    small(236, 136, 'every gram of dry ice.', { fill: COL.ice }),
    small(236, 164, 'All around: supercooled', { fill: COL.rain }),
    small(236, 176, 'droplets at −10 °C,', { fill: COL.rain }),
    small(236, 188, 'waiting for ice.', { fill: COL.rain }),
  );
  return { node: d.node };
};

// ---- Silver iodide looks like ice ------------------------------------------------

export const latticeDiagram: FigureFactory = () => {
  const d = still(400, 210);
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
    return out;
  };
  const square = (cx: number, cy: number, s: number) => {
    const out: SVGElement[] = [];
    for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) out.push(svg('circle', { cx: cx + col * s, cy: cy + row * s, r: (row + col) % 2 ? 4 : 6, fill: (row + col) % 2 ? '#8f8a80' : '#c8c2b6' }));
    return out;
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 210, fill: COL.paper }),
    heading(68, 20, 'Ice'),
    ...hexGrid(68, 92, 21, COL.ice, null),
    small(68, 158, 'six-sided, its molecules', { 'text-anchor': 'middle' }),
    small(68, 170, '0.452 nm apart', { 'text-anchor': 'middle' }),
    heading(200, 20, 'Silver iodide'),
    ...hexGrid(200, 92, 21.3, '#a0a6b0', '#7a5ca3'),
    small(200, 158, 'six-sided too, its atoms', { 'text-anchor': 'middle' }),
    small(200, 170, '0.459 nm apart: 1.5% off', { 'text-anchor': 'middle' }),
    heading(332, 20, 'Salt'),
    ...square(332, 92, 21),
    small(332, 158, 'square: the wrong shape', { 'text-anchor': 'middle' }),
    small(332, 170, 'for ice to copy', { 'text-anchor': 'middle' }),
    small(200, 198, 'A supercooled droplet freezes on whatever looks enough like ice.', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
  );
  return { node: d.node };
};

// ---- Seeding a layer from the air ------------------------------------------------

export const seedLayerFigure: FigureFactory = (ctx, goal) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 4);
  const t = task();
  const top = 70;
  const base = 112;
  const ground = 214;
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
    const size = s.sizeMm >= 1 ? `${s.sizeMm.toFixed(1)} mm` : `${(s.sizeMm * 1000).toFixed(0)} µm`;
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
      svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: '#b3b072' }),
      ...[40, 120, 200, 280, 360].map((x) => line(x, ground + 4, x + 30, ground + 14, '#a39150', 2)),
    ];
    for (const p of puffs) {
      let op = 0.95;
      let fill = '#ffffff';
      if (inPatch(p.x)) {
        if (s.result === 'hole') op = 0.95 * (1 - k);
        if (s.result === 'overseeded') fill = '#dfeaf8';
        if (s.result === 'overseeded') op = 0.95 - 0.35 * k;
      }
      if (op > 0.02) parts.push(svg('circle', { cx: p.x, cy: p.y, r: p.r, fill, opacity: op }));
    }
    if (s.result === 'overseeded' && k > 0.2) {
      for (let x = x0 - spread; x < x1 + spread; x += 9) parts.push(line(x, top + 6, x + 14, base - 6, '#ffffff', 1.2, { opacity: 0.6 * k }));
    }
    // Snow out of the bottom of the patch: a fall streak that evaporates in the dry air below.
    const snowing = s.result === 'hole' ? 1 : s.result === 'flurries' ? 0.18 : 0;
    if (snowing && k > 0) {
      for (const fl of flakes.slice(0, Math.round(flakes.length * snowing))) {
        const y = base + ((age * 22 + fl.s * 80) % 80);
        const fade = 1 - (y - base) / 80;
        parts.push(flake(fl.x + (y - base) * 0.2, y, s.result === 'flurries' ? 3 : 2, '#ffffff', 1.2), svg('circle', { cx: fl.x + (y - base) * 0.2, cy: y, r: 0.1, opacity: fade }));
      }
      parts.push(small(x1 + 20, base + 40, 'snow, evaporating', { fill: '#fff' }), small(x1 + 20, base + 52, 'as it falls', { fill: '#fff' }));
    }
    // The aeroplane, once across, dropping pellets.
    const px = -40 + Math.min(1, age / 1.6) * (W + 80);
    parts.push(
      svg('g', { transform: `translate(${px} 48)` },
        svg('ellipse', { cx: 0, cy: 0, rx: 16, ry: 3.5, fill: COL.ink }),
        svg('rect', { x: -4, y: -1.5, width: 8, height: 3, fill: COL.ink, transform: 'scale(1 1)' }),
        line(-3, 0, 3, -9, COL.ink, 3), line(-3, 0, 3, 9, COL.ink, 2),
        line(-15, 0, -18, -6, COL.ink, 2.5)),
    );
    if (lb > 0.005 && age < 2.4) for (let x = x0; x < Math.min(x1, px); x += 14) parts.push(svg('rect', { x, y: 52 + (age * 60 - (x - x0) / 30) % 40, width: 3, height: 3, fill: '#ffffff' }));
    parts.push(
      line(x0, 36, x1, 36, COL.ink, 1, { 'stroke-dasharray': '3 3' }),
      small((x0 + x1) / 2, 32, 'seeded from here to here', { 'text-anchor': 'middle' }),
      small(6, top - 4, `a layer of cloud at ${deg(tempC)}`, { fill: '#fff' }),
    );
    redraw(g, ...parts);
  });
  const restart = () => {
    age = 0;
    describe();
  };
  f.controls.append(
    slider('Dry ice per mile', -3, 2, 0.05, -3, (v) => {
      const lbs = Math.pow(10, v);
      const g = (lbs * 453.6) / 1.609;
      return `${lbs < 0.1 ? lbs.toFixed(3) : lbs < 10 ? lbs.toFixed(1) : lbs.toFixed(0)} lb (${g < 10 ? g.toFixed(1) : Math.round(g).toLocaleString()} g a km)`;
    }, (v) => { lb = Math.pow(10, v); restart(); }, 'ice').node,
    slider('Layer temperature', -15, 3, 1, tempC, (v) => deg(v), (v) => { tempC = v; restart(); }, 'ice').node,
  );
  describe();
  return { node: f.node, done: goal ? t.promise : undefined };
};

// ---- How much water a cloud holds --------------------------------------------------

export const cloudWaterDiagram: FigureFactory = () => {
  const d = still(400, 250);
  const base = 200;
  const mmPx = 10; // a bar 10 px tall per millimetre of water
  const bar = (x: number, mm: number, value: string, broken = false) => {
    const h = Math.max(1.5, Math.min(140, mm * mmPx));
    return svg('g', {},
      svg('rect', { x: x - 22, y: base - h, width: 44, height: h, fill: COL.rain }),
      broken ? svg('g', {}, svg('rect', { x: x - 26, y: base - 104, width: 52, height: 8, fill: COL.paper }), line(x - 26, base - 98, x + 26, base - 104, COL.ink, 1), line(x - 26, base - 90, x + 26, base - 96, COL.ink, 1)) : null as unknown as SVGElement,
      small(x, base - h - 6, value, { 'text-anchor': 'middle', class: 'fig-label small bold' }),
    );
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 250, fill: COL.paper }),
    heading(200, 18, 'Water on the ground, wrung out of the sky'),
    small(200, 34, 'A cloud is not a full bucket: a storm keeps making new cloud for hours.', { 'text-anchor': 'middle', class: 'fig-label small soft' }),
    line(20, base, 380, base, COL.ink, 1.5),
    bar(70, 0.2, '0.2 mm'), bar(200, 12, '10 to 15 mm'), bar(330, 250, '250 mm', true),
    small(70, base + 14, 'all the water in a', { 'text-anchor': 'middle' }),
    small(70, base + 26, 'cloud layer 1 km deep', { 'text-anchor': 'middle' }),
    small(200, base + 14, 'a day of steady rain', { 'text-anchor': 'middle' }),
    small(200, base + 26, 'from a passing storm', { 'text-anchor': 'middle' }),
    small(330, base + 14, 'a whole year in the', { 'text-anchor': 'middle' }),
    small(330, base + 26, 'Columbia Basin', { 'text-anchor': 'middle' }),
  );
  return { node: d.node };
};

// ---- Where seeding can help ----------------------------------------------------------

export const seedWindowDiagram: FigureFactory = () => {
  const d = still(400, 300);
  const yOf = (c: number) => 10 + ((10 - c) / 50) * 280;
  const band = (from: number, to: number, fill: string, lines: string[], color: string) => {
    const mid = (yOf(from) + yOf(to)) / 2 - ((lines.length - 1) * 12) / 2 + 3;
    return svg('g', {},
      svg('rect', { x: 0, y: yOf(from), width: 400, height: yOf(to) - yOf(from), fill }),
      ...lines.map((text, i) => small(52, mid + i * 12, text, { fill: color, ...(i === 0 ? { class: 'fig-label small bold' } : {}) })),
    );
  };
  const cloud = (id: GenusId, x: number, c: number, s: number) => svg('g', { transform: `translate(${x} ${yOf(c)}) scale(${s})` }, drawCloud(id, PALETTES.day, 4));
  d.svg.append(
    band(10, 0, '#f8e3d6', ['Above 0 °C: water, but nothing to freeze;', 'seeding with ice does nothing'], '#b0583a'),
    band(0, -5, '#e8eef8', ['0 to −5 °C: dry ice works, silver iodide not yet'], COL.ink),
    band(-5, -25, '#cfe0f6', ['−5 to −25 °C: the seeding window', 'plenty of supercooled water,', 'and little ice of its own'], '#2f5fa8'),
    band(-25, -38, '#e8eef8', ['−25 to −38 °C: nature’s own specks', 'freeze enough of it already'], COL.ink),
    band(-38, -40, '#f2f6fc', ['Below −38 °C: all ice'], COL.ink),
    ...[10, 0, -10, -20, -30, -40].map((c) => small(6, Math.min(296, yOf(c) + 3), `${c < 0 ? '−' : ''}${Math.abs(c)} °C`, { class: 'fig-label small soft' })),
    cloud('cumulus', 330, 5, 0.45),
    small(330, yOf(5) + 12, 'summer cumulus', { 'text-anchor': 'middle' }),
    cloud('stratocumulus', 330, -9, 0.45),
    small(330, yOf(-9) + 12, 'winter fog and stratus', { 'text-anchor': 'middle' }),
    cloud('altocumulus', 330, -19, 0.45),
    small(330, yOf(-19) + 12, 'altocumulus', { 'text-anchor': 'middle' }),
    cloud('cirrus', 330, -33, 0.55),
    small(330, yOf(-33) + 12, 'cirrus', { 'text-anchor': 'middle' }),
  );
  return { node: d.node };
};

// ---- Did it work? ----------------------------------------------------------------------

export const trialFigure: FigureFactory = (_ctx, goal) => {
  const W = 400;
  const H = 210;
  const f = frame(W, H, 4);
  const t = task();
  let winters = 1;
  let random = true;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  const x0 = 70;
  const x1 = 390;
  const xOf = (mm: number) => x0 + ((Math.log(mm) - Math.log(1.5)) / (Math.log(45) - Math.log(1.5))) * (x1 - x0);
  const rows = { seeded: 62, unseeded: 142 };
  const paint = () => {
    // The same storms each time, so more winters only add to what was seen.
    const storms = runTrial(winters, random, random ? 1 : 2);
    const v = judge(storms);
    const jitter = makeRng(5);
    const dots = storms.map((s) => {
      const y = (s.seeded ? rows.seeded : rows.unseeded) + (jitter() - 0.5) * 50;
      return svg('circle', { cx: Math.max(x0, Math.min(x1, xOf(s.mm))), cy: y, r: winters > 12 ? 1.8 : 2.6, fill: s.seeded ? COL.ice : COL.soft, opacity: 0.6 });
    });
    const gm = (seeded: boolean) => {
      const l = storms.filter((s) => s.seeded === seeded).map((s) => Math.log(s.mm));
      return Math.exp(l.reduce((a, b) => a + b, 0) / Math.max(1, l.length));
    };
    redraw(g,
      ...dots,
      line(xOf(gm(true)), rows.seeded - 30, xOf(gm(true)), rows.seeded + 30, COL.ice, 2.5),
      line(xOf(gm(false)), rows.unseeded - 30, xOf(gm(false)), rows.unseeded + 30, COL.ink, 2.5),
      label(6, rows.seeded + 4, 'seeded', { class: 'fig-label bold', fill: COL.ice }),
      label(6, rows.unseeded + 4, 'not seeded', { class: 'fig-label bold', fill: COL.soft }),
      line(x0, 188, x1, 188, COL.ink, 1),
      ...[2, 5, 10, 20, 40].map((mm) => small(xOf(mm), 200, `${mm} mm`, { 'text-anchor': 'middle', class: 'fig-label small soft' })),
      small(x0, 14, `${storms.length} storms; a line marks each group’s typical storm`, { class: 'fig-label small soft' }),
    );
    const times = `${v.ratio.toFixed(2)} times`;
    const range = `Luck alone could have made it anywhere from ${v.low.toFixed(2)} to ${v.high.toFixed(2)} times.`;
    f.readout.textContent = !random
      ? `The seeded storms brought ${times} the snow of the others. But the seeder picked the storms that looked most promising, and those would have snowed more anyway. Most of this is the storms, not the dry ice.`
      : v.low > 1
        ? `Seeded storms brought ${times} the snow of the others. ${range} The whole range is above 1: after ${winters} winters, seeding has made a difference, and a small one.`
        : `Seeded storms brought ${times} the snow of the others. ${range} That takes in 1, “no difference”, so ${winters === 1 ? 'one winter' : `${winters} winters`} can’t tell.`;
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
  f.controls.append(
    slider('Winters', 1, 30, 1, winters, (v) => `${v} (${v * STORMS_PER_WINTER} storms)`, (v) => { winters = v; paint(); }, 'ice').node,
    el('label.fig-slider', {}, el('span', {}, 'Which storms are seeded'), seg),
  );
  paint();
  return { node: f.node, done: goal ? t.promise : undefined };
};
