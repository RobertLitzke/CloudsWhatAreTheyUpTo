// Figures for Seeds of ice: why ice wins, the shortage of natural ice, which
// agent works where, a fallstreak hole, seeding over mountains, a cold box of
// supercooled cloud to drop things into, a dry ice pellet's trail, silver
// iodide posing as ice, and a layer of cloud seeded from the air.

import { coldBox, seedLayer, type Agent } from '../../core/cold-cloud';
import { makeRng } from '../../core/rng';
import { el, svg } from '../dom';
import { realClouds } from '../clouds/real';
import { DAY } from '../clouds/tones';
import { arrow, flake, heading, label, line, note, points, redraw, still } from './draw';
import { COL, animate, deg, figure, frame, slider, type FigureFactory } from './kit';

/** Ground for a result that seeding wants (a hole, crystals big enough to fall), and for one it overshoots. */
export const JUST_RIGHT = '#bfe3c9';
export const TOO_MUCH = '#e4dbef';

function fmtCount(n: number): string {
  if (n < 0.01) return 'almost none';
  if (n < 1) return `one in every ${Math.round(1 / n).toLocaleString()} litres`;
  if (n < 1000) return `${Math.round(n).toLocaleString()} per litre`;
  if (n < 1e6) return `${Math.round(n / 1000).toLocaleString()} thousand per litre`;
  return `${Math.round(n / 1e6).toLocaleString()} million per litre`;
}

// ---- Why ice wins -----------------------------------------------------------

/** A cloud droplet: a white ball with a teal rim. */
const droplet = (x: number, y: number, r: number) => svg('circle', { cx: x, cy: y, r, fill: '#ffffff', stroke: COL.dew, 'stroke-width': 1.2 });

export const iceStealDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const stage = (cx: number, n: string, minutes: string, eaten: number, fall: number) => {
    const cy = 100;
    const parts: SVGElement[] = [svg('rect', { x: cx - 62, y: 34, width: 124, height: 134, rx: 8, fill: COL.air })];
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

// ---- The cold box -----------------------------------------------------------

const AGENTS: { id: Agent; label: string; short: string }[] = [
  { id: 'none', label: 'Just breathe in', short: 'breath only' },
  { id: 'dust', label: 'A pinch of dust', short: 'dust' },
  { id: 'iodide', label: 'Silver iodide smoke', short: 'silver iodide' },
  { id: 'dryIce', label: 'A sliver of dry ice', short: 'dry ice' },
];

export const coldBoxFigure = figure(['snow'], (ctx, t) => {
  const W = 400;
  const H = 244;
  const f = frame(W, H, 4);
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
    if (t.goal === 'snow' && r.result === 'snow') t.done();
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
  return f.node;
});

// ---- A dry ice pellet's trail -----------------------------------------------

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
    svg('rect', { x: 0, y: 0, width: 400, height: 236, fill: COL.air }),
    ...drops.map(([x, y]) => droplet(x, y, 2.4)),
    svg('polygon', { points: points([...edge, ...[...edge2].reverse()]), fill: '#bcd3f2', opacity: 0.6 }),
    svg('polyline', { points: points(edge), fill: 'none', stroke: COL.ice, 'stroke-dasharray': '3 3' }),
    svg('polyline', { points: points(edge2), fill: 'none', stroke: COL.ice, 'stroke-dasharray': '3 3' }),
    ...trail.map(([x, y, r]) => flake(x, y, r, COL.ice, 1)),
    ...drifted.map(([x, y, r]) => flake(x, y, r, COL.blue, 1.3)),
    svg('rect', { x: px - 6, y: py - 6, width: 12, height: 12, fill: '#f8fbff', stroke: COL.ice, 'stroke-width': 1.5 }),
    arrow(px + 14, py - 14, px + 14, py + 14, COL.soft, 1.4),
    heading(200, 18, 'A falling pellet of dry ice leaves a frozen trail'),
    note(px + 30, py + 6, 'pellet of dry ice, −78 °C', { bold: true }),
    line(px + half(150) + 2, 150, 236, 136, COL.ice, 1),
    note(240, 120, 'inside the dashed line, colder', { bold: true, fill: COL.blue }),
    note(240, 132, 'than −40 °C: droplets freeze', { fill: COL.blue }),
    note(240, 144, 'by themselves, and vapour', { fill: COL.blue }),
    note(240, 156, 'turns straight to ice', { fill: COL.blue }),
    line(px + half(60) + 20, 64, 236, 64, COL.blue, 1),
    note(240, 60, 'crystals drift out and grow:', { bold: true, fill: COL.blue }),
    note(240, 72, 'hundreds of billions', { fill: COL.blue }),
    note(240, 84, 'from each gram', { fill: COL.blue }),
    line(40, 190, 236, 186, COL.dew, 1),
    droplet(40, 190, 2.4),
    note(240, 184, 'all around: supercooled', { bold: true, fill: COL.ink }),
    note(240, 196, 'droplets at −10 °C', { fill: COL.ink }),
  );
  return { node: d.node };
};

// ---- Silver iodide looks like ice -------------------------------------------

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
    out.push(svg('polygon', { points: points(ring), fill: 'none', stroke: COL.ink, 'stroke-width': 1.6 }));
    return out;
  };
  const square = (cx: number, cy: number, s: number) => {
    const out: SVGElement[] = [];
    for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) out.push(svg('circle', { cx: cx + col * s, cy: cy + row * s, r: (row + col) % 2 ? 4 : 6, fill: (row + col) % 2 ? COL.dust : '#c8c2b6' }));
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
    key(346, 150, COL.dust, 3.5, 'sodium'),
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

// ---- Seeding clouds over mountains ------------------------------------------

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
    svg('rect', { x: 0, y: 0, width: 400, height: 250, fill: COL.air }),
    svg('polygon', { points: points([...cloudTop, ...[...cloudBase].reverse()]), fill: '#ffffff', stroke: COL.cloudShade }),
    ...snow,
    svg('polygon', { points: `0,250 ${points(land)} 400,250`, fill: COL.field }),
    // Smoke from a ground burner carried up the slope into the cloud.
    svg('rect', { x: 96, y: ridge(100) - 8, width: 7, height: 8, fill: COL.ink }),
    ...Array.from({ length: 12 }, (_, i) => {
      const k = i / 11;
      const x = 100 + k * 84;
      return svg('circle', { cx: x, cy: Math.min(ridge(x) - 10 - k * 10, ridge(100) - 10 - k * 96), r: 3 + k * 6, fill: COL.dust, opacity: 0.35 });
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
    arrow(272, 74, 340, 120, COL.redInk, 2),
    note(280, 64, 'unseeded water crosses', { fill: COL.redInk }),
    note(280, 76, 'the crest and evaporates', { fill: COL.redInk }),
    note(350, sea - 26, 'dry side:', { anchor: 'middle', fill: '#fff' }),
    note(350, sea - 14, 'Columbia Basin', { anchor: 'middle', fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- Which agent works where ------------------------------------------------

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
    svg('rect', { x: xOf(-38), y: 30, width: x1 - xOf(-38), height: 132, fill: COL.subzero, opacity: 0.6 }),
    bar(46, 'dry ice', 0, -45, COL.ice, 'works at any temperature below 0 °C'),
    bar(76, 'silver iodide', -5, -45, '#7a5ca3', 'below −5 °C; strong below −10', -10),
    bar(106, 'natural specks', -12, -38, COL.dust, '', -25),
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

// ---- Seeding a layer from the air -------------------------------------------

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
    ...scale(236, -1, 4, s.perL, [[0.1, 0.3, '#eeeeee', ''], [0.3, 5, '#dfe9f6', 'flurries'], [5, 3000, JUST_RIGHT, 'a hole'], [3000, 1e4, TOO_MUCH, 'veil']], [[1, '1'], [10, '10'], [100, '100'], [1000, '1,000']], 'crystals a litre'),
    ...scale(272, -1.5, 0.7, s.sizeMm, [[10 ** -1.5, 0.15, TOO_MUCH, 'too small to fall'], [0.15, 10 ** 0.7, JUST_RIGHT, 'big enough to fall']], [[0.1, '0.1 mm'], [1, '1 mm']], 'each crystal'),
  ];
}

export const seedLayerFigure = figure(['hole'], (ctx, t) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 4);
  const top = 70;
  const base = 112;
  const ground = 206;
  const x0 = 130;
  const x1 = 270;
  let lb = 0.001;
  let tempC = -10;
  let age = 0;
  const rng = makeRng(11);
  const clouds = realClouds({ width: W, height: H, sun: [W * 0.7, -200, -160], tones: DAY });
  let drawn = '';
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
    if (t.goal === 'hole' && s.result === 'hole') t.done();
  };
  animate(f.node, ctx, (dt) => {
    age += dt;
    const s = seedLayer(lb, tempC);
    const k = Math.min(1, Math.max(0, (age - 1.2) / 4)); // how far the seeded patch has gone
    const spread = 16 * k;
    const parts: SVGElement[] = [
      svg('rect', { x: 0, y: 0, width: W, height: ground, fill: '#7fb0d6' }),
      svg('rect', { x: 0, y: ground, width: W, height: 14, fill: '#b3b072' }),
      svg('rect', { x: 0, y: ground + 14, width: W, height: H - ground - 14, fill: COL.paper }),
      ...[40, 120, 200, 280, 360].map((x) => line(x, ground + 3, x + 30, ground + 11, COL.field, 2)),
    ];
    // The layer, with the seeded patch eaten away as the crystals take its water
    // (redrawn in tenths, as the patch goes).
    const gone = s.result === 'hole' || s.result === 'overseeded' ? Math.round(k * 10) / 10 : 0;
    const key = `${gone}`;
    if (key !== drawn) {
      drawn = key;
      const half = ((x1 - x0) / 2 + 16 * gone) * gone;
      clouds.draw([{ kind: 'cells', x0: -10, x1: W + 10, top: top - 4, bottom: base + 4, size: 14, r: 10, flat: 0.7, density: 0.6, seed: 11,
        hole: half > 1 ? [(x0 + x1) / 2, (top + base) / 2, half, 60] : undefined }]);
    }
    parts.push(clouds.node);
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
  return f.node;
});

// ---- A fallstreak hole ------------------------------------------------------

export const fallstreakDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const holeX = 210;
  // A wisp of ice falling out of the hole, drifting a little as it goes.
  const wisp = Array.from({ length: 12 }, (_, i): [number, number, number] => [holeX + i * 2.4 + Math.sin(i) * 2, 84 + i * 8, Math.max(1.2, 7 - i * 0.5)]);
  const clouds = realClouds({ width: 400, height: 210, sun: [300, -200, -160], tones: DAY }, [
    { kind: 'cells', x0: -10, x1: 410, top: 62, bottom: 102, size: 12, r: 8.5, flat: 0.7, density: 0.6, seed: 21, hole: [holeX, 83, 60, 30] },
    { kind: 'cirrus', strands: [{ pts: wisp }] },
  ]);
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 210, fill: '#86b4dc' }),
    clouds.node,
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
