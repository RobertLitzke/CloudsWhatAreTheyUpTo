// Lesson 6, Fossils in the schist: the three families of rock as the
// conditions a rock has met. Pick a starting rock, move it through depth and
// temperature, and see what it becomes; the igneous rocks set out by cooling
// and make-up; and Bowen's order of crystals, which ties melting, cooling and
// weathering together.

import { svg } from 'didactics/dom';
import { hexagon, label, line, note, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { segmented } from 'didactics/ui';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

// ---- Swatches: a drawn hand sample of each kind of rock ---------------------------------

type Texture =
  | 'sediment' | 'layers' | 'grains' | 'shells' | 'slate' | 'phyllite' | 'schist' | 'gneiss' | 'migmatite'
  | 'quartzite' | 'marble' | 'granite' | 'basalt' | 'greenschist' | 'amphibolite' | 'blueschist' | 'melt' | 'diorite' | 'gabbro' | 'rhyolite' | 'andesite';

/** Grains scattered at random: each colour with its share, at a grain size in drawing units. */
function speckle(x: number, y: number, w: number, h: number, mix: [string, number][], size: number, seed: number, stretch = 1): SVGElement[] {
  const rng = makeRng(seed);
  const total = mix.reduce((s, [, k]) => s + k, 0);
  const n = Math.round((w * h) / (size * size * 1.3));
  const out: SVGElement[] = [];
  for (let i = 0; i < n; i++) {
    let r = rng() * total;
    const c = mix.find(([, k]) => (r -= k) < 0)?.[0] ?? mix[0][0];
    const s = size * (0.6 + rng() * 0.8);
    out.push(svg('rect', { x: x + rng() * (w - s * stretch), y: y + rng() * (h - s / stretch), width: s * stretch, height: s / stretch, fill: c, rx: s * 0.2 }));
  }
  return out;
}

/** Wavy bands across a box, alternating two colours. */
function bands(x: number, y: number, w: number, h: number, a: string, b: string, n: number, wave: number, seed: number): SVGElement[] {
  const rng = makeRng(seed);
  const out: SVGElement[] = [svg('rect', { x, y, width: w, height: h, fill: a })];
  for (let i = 0; i < n; i++) {
    const y0 = y + ((i + 0.5) / n) * h;
    const th = (h / n) * (0.25 + rng() * 0.3);
    const ph = rng() * 6;
    const top: string[] = [];
    const bot: string[] = [];
    for (let k = 0; k <= 20; k++) {
      const xx = x + (k / 20) * w;
      const dy = Math.sin(k / 3 + ph) * wave;
      top.push(`${xx},${Math.max(y, y0 + dy - th / 2)}`);
      bot.unshift(`${xx},${Math.min(y + h, y0 + dy + th / 2)}`);
    }
    out.push(svg('polygon', { points: [...top, ...bot].join(' '), fill: b }));
  }
  return out;
}

function swatch(tex: Texture, x: number, y: number, w: number, h: number): SVGElement[] {
  const box = (fill: string) => svg('rect', { x, y, width: w, height: h, fill });
  const lines = (n: number, color: string, width: number, tilt = 0, dash?: string) =>
    Array.from({ length: n }, (_, i) => {
      const yy = y + ((i + 0.5) / n) * h;
      return line(x + 1, yy - tilt / 2, x + w - 1, yy + tilt / 2, color, width, dash ? { 'stroke-dasharray': dash } : {});
    });
  const s = 7 + tex.length;
  switch (tex) {
    case 'sediment': {
      const rng = makeRng(s);
      return [box('#efe3c8'), ...Array.from({ length: 70 }, () => svg('circle', { cx: x + 3 + rng() * (w - 6), cy: y + h * 0.35 + rng() * h * 0.62, r: 1 + rng() * 2.5, fill: ['#b9a27c', '#8b7a66', '#d4a54a'][Math.floor(rng() * 3)] })), small(x + w / 2, y + 14, 'loose', { anchor: 'middle', soft: true })];
    }
    case 'layers':
      return [box('#6f675d'), ...lines(9, '#59524a', 2.2), ...lines(9, '#857c70', 0.7).map((l, i) => (l.setAttribute('transform', `translate(0 ${3 + (i % 2)})`), l))];
    case 'grains':
      return [box('#c9a66b'), ...speckle(x, y, w, h, [['#e3c27a', 6], ['#d9b98a', 3], ['#a8865a', 1]], 6, s)];
    case 'shells': {
      const rng = makeRng(s);
      return [box('#cfc6b4'), ...speckle(x, y, w, h, [['#c3b9a5', 1], ['#d9d1c0', 1]], 3, s), ...Array.from({ length: 9 }, () => {
        const cx = x + 10 + rng() * (w - 20);
        const cy = y + 10 + rng() * (h - 20);
        return svg('path', { d: `M${cx - 6},${cy} a6,5 0 0,1 12,0`, fill: 'none', stroke: '#8a7d68', 'stroke-width': 1.6 });
      })];
    }
    case 'slate':
      return [box('#4c5058'), ...lines(16, '#5d626b', 1, -10)];
    case 'phyllite':
      return [box('#6b6f6a'), ...lines(12, '#a7aca3', 1.4, -8, '6 3')];
    case 'schist': {
      const rng = makeRng(s);
      return [box('#8d8a80'), ...speckle(x, y, w, h, [['#d8d4c4', 4], ['#5b5a55', 2]], 5, s, 2.6),
        ...Array.from({ length: 6 }, () => svg('circle', { cx: x + 8 + rng() * (w - 16), cy: y + 8 + rng() * (h - 16), r: 3.5, fill: '#9c2f3a', stroke: '#5e1a22', 'stroke-width': 0.8 }))];
    }
    case 'gneiss':
      return bands(x, y, w, h, '#e7ddd0', '#3e3a3a', 6, 3, s);
    case 'migmatite': {
      const rng = makeRng(s + 3);
      return [...bands(x, y, w, h, '#e7ddd0', '#3e3a3a', 5, 6, s),
        ...Array.from({ length: 5 }, () => svg('ellipse', { cx: x + 10 + rng() * (w - 20), cy: y + 10 + rng() * (h - 20), rx: 6 + rng() * 9, ry: 4 + rng() * 5, fill: '#f3e6e0', opacity: 0.95 }))];
    }
    case 'quartzite': {
      const out = [box('#e9e1d6')];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) out.push(hexagon(x + 6 + c * 13.5 + (r % 2) * 6.5, y + 6 + r * 13, 7.3, { fill: r % 3 === 0 && c % 2 ? '#ddd2c2' : '#f1ebe1', stroke: '#c9bba6', 'stroke-width': 0.7 }));
      return out;
    }
    case 'marble': {
      const out = [box('#f4f1ec')];
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) out.push(hexagon(x + 8 + c * 16 + (r % 2) * 8, y + 8 + r * 15, 8.6, { fill: (r + c) % 4 ? '#f6f3ee' : '#e9e5df', stroke: '#d8d2c8', 'stroke-width': 0.7 }));
      out.push(svg('path', { d: `M${x},${y + h * 0.6} C${x + w * 0.3},${y + h * 0.4} ${x + w * 0.6},${y + h * 0.9} ${x + w},${y + h * 0.5}`, fill: 'none', stroke: '#b7b3ad', 'stroke-width': 1.5, opacity: 0.7 }));
      return out;
    }
    case 'granite':
      return [box('#e8d6c8'), ...speckle(x, y, w, h, [['#e3a99a', 4], ['#f2ece4', 3], ['#a9a7a6', 3], ['#2f2c2c', 1.2]], 9, s)];
    case 'diorite':
      return [box('#bdbab4'), ...speckle(x, y, w, h, [['#efebe5', 5], ['#2f2c2c', 4], ['#8e8c88', 1]], 8, s)];
    case 'gabbro':
      return [box('#3e3c3c'), ...speckle(x, y, w, h, [['#2a2828', 5], ['#7d7f84', 3], ['#3b4a36', 1]], 8, s)];
    case 'rhyolite':
      return [box('#d9b3a8'), ...speckle(x, y, w, h, [['#c99e93', 3], ['#eadbd3', 1], ['#f5f0ea', 0.4]], 2.4, s)];
    case 'andesite':
      return [box('#8c8a86'), ...speckle(x, y, w, h, [['#7b7975', 3], ['#a3a19c', 2], ['#eeeae4', 0.5]], 2.4, s)];
    case 'basalt':
      return [box('#34343a'), ...speckle(x, y, w, h, [['#2a2a2f', 3], ['#4a4a52', 2], ['#6c6f78', 0.4]], 2.2, s)];
    case 'greenschist':
      return [box('#5f7a5b'), ...speckle(x, y, w, h, [['#7d9a74', 3], ['#4c6648', 2], ['#c8c19a', 0.6]], 4, s, 2.8)];
    case 'amphibolite':
      return [box('#2f3a33'), ...speckle(x, y, w, h, [['#1f2723', 4], ['#e9e4d8', 2], ['#3f5047', 2]], 5, s, 2.4)];
    case 'blueschist':
      return [box('#4f6687'), ...speckle(x, y, w, h, [['#3c5274', 3], ['#7e94b3', 2], ['#8a3a44', 0.3]], 4, s, 2.8)];
    case 'melt': {
      const rng = makeRng(s);
      return [box('#e0662f'), svg('rect', { x, y, width: w, height: h * 0.5, fill: '#f29a3d', opacity: 0.6 }),
        ...Array.from({ length: 10 }, () => svg('rect', { x: x + 4 + rng() * (w - 12), y: y + 4 + rng() * (h - 12), width: 4 + rng() * 5, height: 2 + rng() * 3, fill: '#5b2a1b', opacity: 0.7, transform: '' }))];
    }
  }
}

// ---- Conditions: one rock, any depth and temperature --------------------------------------

type Parent = 'mud' | 'sand' | 'lime' | 'basalt' | 'granite';
type Family = 'sedimentary' | 'metamorphic' | 'igneous' | 'sediment' | 'partly molten' | 'molten';

interface Result {
  name: string;
  family: Family;
  tex: Texture;
  says: string;
}

interface ParentRock {
  label: string;
  /** Where it starts to melt (with a little water about, as in most crust), °C; and where it is all melt. Undefined: not in the crust. */
  solidus?: number;
  liquidus?: number;
  /** What it is at a temperature, deeper than the surface, from cold to the start of melting. */
  steps: [number, Result][];
  /** Cold but deep (a sinking plate): blueschist. */
  cold?: boolean;
  /** Its melt: what it makes when it cools deep down, and when it erupts. */
  magma?: { deep: string; erupted: string };
  /** What it makes when the weather gets at it. */
  weathers: string;
}

const meta = (name: string, tex: Texture, says: string): Result => ({ name, family: 'metamorphic', tex, says });

const PARENTS: Record<Parent, ParentRock> = {
  mud: {
    label: 'Mudstone',
    solidus: 680, liquidus: 900, cold: true,
    steps: [
      [-Infinity, { name: 'Shale', family: 'sedimentary', tex: 'layers', says: 'mud pressed and dried into rock that splits along its beds' }],
      [200, meta('Slate', 'slate', 'the clay recrystallises into tiny aligned flakes, and the rock splits into thin sheets')],
      [350, meta('Phyllite', 'phyllite', 'the flakes grow big enough to give a silky sheen')],
      [450, meta('Schist', 'schist', 'glittering mica, with garnets growing in it')],
      [620, meta('Gneiss', 'gneiss', 'the minerals sort into pale and dark bands')],
    ],
    magma: { deep: 'granite', erupted: 'rhyolite or obsidian' },
    weathers: 'it crumbles back to mud',
  },
  sand: {
    label: 'Sandstone',
    steps: [
      [-Infinity, { name: 'Sandstone', family: 'sedimentary', tex: 'grains', says: 'grains of quartz sand glued together by a mineral cement' }],
      [250, meta('Quartzite', 'quartzite', 'the quartz grains grow into one another until the rock breaks across the grains, not around them')],
    ],
    weathers: 'it falls apart into sand again',
  },
  lime: {
    label: 'Limestone',
    steps: [
      [-Infinity, { name: 'Limestone', family: 'sedimentary', tex: 'shells', says: 'shells and lime mud from a warm sea floor' }],
      [250, meta('Marble', 'marble', 'the calcite regrows as interlocking crystals, and the fossils are wiped out')],
    ],
    weathers: 'rainwater, slightly acid, dissolves it away',
  },
  basalt: {
    label: 'Basalt',
    solidus: 850, liquidus: 1150, cold: true,
    steps: [
      [-Infinity, { name: 'Basalt', family: 'igneous', tex: 'basalt', says: 'dark lava rock, cooled fast at the surface' }],
      [300, meta('Greenschist', 'greenschist', 'green chlorite and epidote grow from the dark minerals')],
      [500, meta('Amphibolite', 'amphibolite', 'black needles of amphibole and white feldspar, lined up')],
    ],
    magma: { deep: 'gabbro', erupted: 'basalt' },
    weathers: 'it rots to clay and iron oxide quickly',
  },
  granite: {
    label: 'Granite',
    solidus: 680, liquidus: 900,
    steps: [
      [-Infinity, { name: 'Granite', family: 'igneous', tex: 'granite', says: 'coarse crystals of quartz, feldspar and mica, cooled slowly underground' }],
      [200, { name: 'Granite', family: 'igneous', tex: 'granite', says: 'almost unchanged: quartz and feldspar already belong at these temperatures' }],
      [500, meta('Gneiss', 'gneiss', 'squeezed while hot, its minerals sort into bands: granite has become gneiss')],
    ],
    magma: { deep: 'granite', erupted: 'rhyolite or obsidian' },
    weathers: 'the feldspar rots to clay and the quartz is set free as sand',
  },
};

export function rockAt(parent: Parent, t: number, km: number): Result {
  const p = PARENTS[parent];
  if (p.liquidus !== undefined && t >= p.liquidus) {
    const m = p.magma!;
    return km < 1
      ? { name: 'Lava', family: 'molten', tex: 'melt', says: `all melted, and at the surface: it will cool fast to ${m.erupted}` }
      : { name: 'Magma', family: 'molten', tex: 'melt', says: `all melted. Cooled slowly down here it makes ${m.deep}; erupted, the same melt makes ${m.erupted}` };
  }
  if (p.solidus !== undefined && t >= p.solidus) {
    return { name: 'Migmatite', family: 'partly molten', tex: 'migmatite', says: `the first melt gathers in pale veins and pods that would cool to ${p.magma!.deep}, while the rest stays solid` };
  }
  if (km < 1 && t < 60) return { name: 'Sediment', family: 'sediment', tex: 'sediment', says: `at the surface, wind, water and frost get at it: ${p.weathers}` };
  if (p.cold && km > 15 && t >= 200 && t / km < 10) return meta('Blueschist', 'blueschist', 'deep but cold, as where a plate sinks: blue minerals grow that need high pressure');
  return [...p.steps].reverse().find(([from]) => t >= from)![1];
}

const FAMILY_COL: Record<Family, string> = {
  sediment: '#d4a54a',
  sedimentary: '#c9a66b',
  metamorphic: '#a8448f',
  'partly molten': '#d9733b',
  molten: COL.heat,
  igneous: '#5d5a63',
};

const T_MAX = 1200;
const KM_MAX = 40;
const CX0 = 40;
const CX1 = 268;
const CY0 = 30;
const CY1 = 222;
const TX = (t: number) => CX0 + (t / T_MAX) * (CX1 - CX0);
const KY = (km: number) => CY0 + (km / KM_MAX) * (CY1 - CY0);

const PICKS: { value: Parent; label: string }[] = (Object.keys(PARENTS) as Parent[]).map((k) => ({ value: k, label: PARENTS[k].label }));

export const conditionsFigure = figure(['migmatite'], (_ctx, t) => {
  const f = frame(W, 236, 4);
  const g = svg('g');
  f.svg.append(g);
  let parent: Parent = 'mud';
  let km = 10;
  let temp = 100;
  let open = false;

  const fields = (p: ParentRock): SVGElement[] => {
    const out: SVGElement[] = [];
    const band = (a: number, b: number, fill: string, opacity: number) =>
      out.push(svg('rect', { x: TX(a), y: KY(0), width: TX(b) - TX(a), height: KY(KM_MAX) - KY(0), fill, opacity }));
    const meltAt = p.solidus ?? T_MAX;
    band(0, 200, FAMILY_COL.sedimentary, 0.28);
    band(200, meltAt, FAMILY_COL.metamorphic, 0.16);
    if (p.solidus !== undefined) {
      band(p.solidus, p.liquidus!, FAMILY_COL['partly molten'], 0.3);
      band(p.liquidus!, T_MAX, COL.heat, 0.38);
    }
    if (p.cold) out.push(svg('polygon', { points: `${TX(200)},${KY(20)} ${TX(400)},${KY(KM_MAX)} ${TX(200)},${KY(KM_MAX)}`, fill: '#6f8fb3', opacity: 0.45 }));
    // Each band's name, written down its length at the top, so narrow bands still fit.
    const tag = (a: number, b: number, text: string, color: string = COL.soft) => {
      if (TX(b) - TX(a) < 12) return;
      const xx = (TX(a) + TX(b)) / 2 + 3;
      const yy = KY(1);
      const tx = small(xx, yy, text, { fill: color, bold: true });
      tx.setAttribute('transform', `rotate(90 ${xx} ${yy})`);
      out.push(tx);
    };
    tag(0, 200, 'surface rock');
    tag(200, meltAt, 'solid, recrystallises', '#7a2f68');
    if (p.solidus !== undefined) {
      tag(p.solidus, p.liquidus!, 'part melts', '#9a4317');
      tag(p.liquidus!, T_MAX, 'all melt', COL.heat);
    } else out.push(small(TX(1180), KY(KM_MAX) - 6, 'never melts in the crust', { anchor: 'end', soft: true }));
    return out;
  };
  const axes = () => [
    line(TX(0), KY(0), TX(T_MAX), KY(0), COL.ink, 1),
    line(TX(0), KY(0), TX(0), KY(KM_MAX), COL.ink, 1),
    ...[0, 400, 800, 1200].map((tt) => small(TX(tt), KY(0) - 5, `${tt}°`, { anchor: 'middle', soft: true })),
    ...[0, 10, 20, 30, 40].map((d) => small(TX(0) - 4, KY(d) + 3, `${d}`, { anchor: 'end', soft: true })),
    small(TX(0) - 30, KY(0) - 16, 'km down', { soft: true }),
    small(TX(T_MAX), KY(0) - 16, 'temperature, °C', { soft: true, anchor: 'end' }),
    // The usual warming with depth in continental crust.
    line(TX(15), KY(0), TX(15 + 25 * KM_MAX), KY(KM_MAX), COL.ink, 1, { 'stroke-dasharray': '4 3', opacity: 0.6 }),
  ];

  const paint = () => {
    const p = PARENTS[parent];
    const r = rockAt(parent, temp, km);
    const px = TX(temp);
    const py = KY(km);
    const sx = 288;
    const sy = 40;
    const sw = 100;
    redraw(g,
      ...fields(p),
      ...axes(),
      svg('circle', { cx: px, cy: py, r: 7, fill: FAMILY_COL[r.family], stroke: COL.paper, 'stroke-width': 2.5 }),
      note(sx + sw / 2, 22, `${p.label} becomes`, { anchor: 'middle', soft: true }),
      svg('rect', { x: sx - 2, y: sy - 2, width: sw + 4, height: sw + 4, rx: 5, fill: FAMILY_COL[r.family] }),
      ...swatch(r.tex, sx, sy, sw, sw),
      label(sx + sw / 2, sy + sw + 22, r.name, { anchor: 'middle', bold: true }),
      small(sx + sw / 2, sy + sw + 38, r.family === 'sediment' ? 'loose sediment' : r.family === 'molten' ? 'melt (igneous when cool)' : r.family === 'partly molten' ? 'metamorphic and igneous' : r.family, { anchor: 'middle', fill: FAMILY_COL[r.family], bold: true }),
    );
    if (!open) return;
    f.readout.textContent = `${km} km down at ${temp} °C. ${r.name}: ${r.says}.`;
    if (parent === 'mud' && r.name === 'Migmatite' && t.goal === 'migmatite') t.done();
  };

  const ds = slider('Depth', 0, KM_MAX, 1, km, (v) => `${v} km`, (v) => { km = v; paint(); }, 'old');
  const ts = slider('Temperature', 0, T_MAX, 10, temp, (v) => `${v} °C`, (v) => { temp = v; paint(); }, 'heat');
  const pick = segmented(PICKS, parent, (v) => { parent = v; paint(); });

  // Drag the dot (or tap the chart) to set both at once.
  const hit = svg('rect', { x: CX0, y: CY0, width: CX1 - CX0, height: CY1 - CY0, fill: 'transparent', style: 'cursor: crosshair; touch-action: none' });
  f.svg.append(hit);
  const toChart = (e: PointerEvent) => {
    const m = f.svg.getScreenCTM?.();
    if (!m) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    ts.set(Math.round(Math.min(T_MAX, Math.max(0, ((pt.x - CX0) / (CX1 - CX0)) * T_MAX)) / 10) * 10);
    ds.set(Math.round(Math.min(KM_MAX, Math.max(0, ((pt.y - CY0) / (CY1 - CY0)) * KM_MAX))));
  };
  let dragging = false;
  hit.addEventListener('pointerdown', (e) => {
    if (!open) return;
    dragging = true;
    hit.setPointerCapture?.(e.pointerId);
    toChart(e);
  });
  hit.addEventListener('pointermove', (e) => { if (dragging) toChart(e); });
  hit.addEventListener('pointerup', () => { dragging = false; });

  f.controls.append(pick, ds.node, ts.node);
  paint();
  guessFirst(t, f, {
    ask: 'A slab of granite and a slab of basalt are buried side by side and slowly heated. Which starts to melt first? Guess first.',
    options: ['Granite', 'Basalt', 'Both at the same temperature'],
    answer: 0,
    sliders: [ds, ts],
    hidden: [pick],
    after: (guess) => {
      open = true;
      paint();
      f.readout.textContent = `You guessed ${['granite', 'basalt', 'both at once'][guess]}. Pick each rock in turn and drag the dot across the chart, or use the sliders: the shaded bands move with the rock.`;
    },
  });
  return f.node;
});

// ---- The igneous rocks on two axes: how fast they cooled, and what the melt was made of ---------

export const igneousStill = () => {
  const { node, svg: s } = still(W, 250);
  const cols = [
    { head: 'Rich in silica', sub: 'about 70%, pale', fine: 'Rhyolite', coarse: 'Granite', tf: 'rhyolite' as Texture, tc: 'granite' as Texture },
    { head: 'In between', sub: 'about 60%', fine: 'Andesite', coarse: 'Diorite', tf: 'andesite' as Texture, tc: 'diorite' as Texture },
    { head: 'Iron, magnesium', sub: 'about 50% silica, dark', fine: 'Basalt', coarse: 'Gabbro', tf: 'basalt' as Texture, tc: 'gabbro' as Texture },
  ];
  const x0 = 96;
  const cw = 100;
  const sw = 62;
  const parts: SVGElement[] = [svg('rect', { width: W, height: 250, fill: COL.paper })];
  cols.forEach((c, i) => {
    const cx = x0 + i * cw + cw / 2;
    parts.push(
      small(cx, 16, c.head, { anchor: 'middle', bold: true }),
      small(cx, 29, c.sub, { anchor: 'middle', soft: true }),
      ...swatch(c.tf, cx - sw / 2, 40, sw, sw * 0.7),
      small(cx, 40 + sw * 0.7 + 13, c.fine, { anchor: 'middle', bold: true }),
      ...swatch(c.tc, cx - sw / 2, 120, sw, sw * 0.7),
      small(cx, 120 + sw * 0.7 + 13, c.coarse, { anchor: 'middle', bold: true }),
    );
  });
  parts.push(
    small(8, 62, 'Cooled fast,', { bold: true }), small(8, 75, 'at the surface:', { soft: true }), small(8, 88, 'fine grains', { soft: true }),
    small(8, 142, 'Cooled slowly,', { bold: true }), small(8, 155, 'underground:', { soft: true }), small(8, 168, 'coarse crystals', { soft: true }),
    line(x0, 210, x0 + 3 * cw, 210, COL.ink, 1),
    small(x0, 224, 'last to crystallise (quartz, potassium feldspar)', { soft: true }),
    small(x0 + 3 * cw, 238, 'first to crystallise (olivine, pyroxene)', { soft: true, anchor: 'end' }),
    svg('polygon', { points: `${x0},210 ${x0 + 8},206 ${x0 + 8},214`, fill: COL.ink }),
    svg('polygon', { points: `${x0 + 3 * cw},210 ${x0 + 3 * cw - 8},206 ${x0 + 3 * cw - 8},214`, fill: COL.ink }),
  );
  s.append(...parts);
  s.setAttribute('aria-label', 'Six igneous rocks in a grid. Across, the melt goes from rich in silica and pale to rich in iron and magnesium and dark. The top row cooled fast at the surface and is fine-grained: rhyolite, andesite, basalt. The bottom row cooled slowly underground and is coarse: granite, diorite, gabbro.');
  return { node };
};

// ---- Bowen: the order crystals form as a melt cools -----------------------------------------

interface Crystal {
  name: string;
  /** Starts to crystallise at, °C (rough, for a basalt melt cooling slowly). */
  at: number;
  /** Until, for one that reacts away into the next. */
  until?: number;
  color: string;
  /** Place in the diagram: left arm, right arm, or the stem below. */
  x: number;
  y: number;
}

const CRYSTALS: Crystal[] = [
  { name: 'olivine', at: 1250, color: '#7f9a3a', x: 22, y: 50 },
  { name: 'pyroxene', at: 1150, color: '#3f4a3a', x: 22, y: 82 },
  { name: 'amphibole', at: 1000, color: '#2b2d2b', x: 22, y: 114 },
  { name: 'biotite mica', at: 850, color: '#4a3526', x: 22, y: 146 },
  { name: 'feldspar, calcium-rich', at: 1200, color: '#c9cfd6', x: 132, y: 50 },
  { name: 'feldspar, sodium-rich', at: 950, color: '#e6e8ea', x: 132, y: 114 },
  { name: 'potassium feldspar', at: 760, color: '#e3a99a', x: 78, y: 182 },
  { name: 'white mica', at: 730, color: '#d9d2bd', x: 78, y: 204 },
  { name: 'quartz', at: 700, color: '#f3f1ec', x: 78, y: 226 },
];

const T_TOP = 1300;
const T_END = 650;

/** Share of the starting melt still liquid at a temperature, if each crystal is taken out as it forms. */
export const meltLeft = (t: number) => Math.max(0, Math.min(1, (t - 690) / (1260 - 690))) ** 0.85;
/** Silica in what is left of the melt, % by weight: basalt at the start, rhyolite near the end. */
export const meltSilica = (t: number) => 50 + 25 * (1 - meltLeft(t)) ** 1.25;
const lavaName = (si: number) => (si < 52 ? 'basalt' : si < 63 ? 'andesite' : si < 68 ? 'dacite' : 'rhyolite');

export const bowenFigure = figure(['quartz'], (_ctx, t) => {
  const f = frame(W, 236, 4);
  const g = svg('g');
  f.svg.append(g);
  let temp = T_TOP;
  const paint = () => {
    const parts: SVGElement[] = [];
    // Two columns that join: the dark minerals one after another, the feldspar changing as it grows; then the last three.
    parts.push(
      line(22, 50, 22, 146, COL.soft, 1.2, { 'stroke-dasharray': '3 3' }),
      line(132, 50, 132, 114, COL.soft, 1.2, { 'stroke-dasharray': '3 3' }),
      line(22, 146, 78, 182, COL.soft, 1.2, { 'stroke-dasharray': '3 3' }),
      line(132, 114, 78, 182, COL.soft, 1.2, { 'stroke-dasharray': '3 3' }),
      small(12, 26, 'dark minerals', { soft: true, bold: true }),
      small(122, 26, 'pale feldspar', { soft: true, bold: true }),
      small(12, 38, 'hottest first, at the top', { soft: true }),
    );
    for (const c of CRYSTALS) {
      const on = temp <= c.at;
      parts.push(
        svg('circle', { cx: c.x, cy: c.y, r: 7, fill: on ? c.color : COL.paper, stroke: on ? COL.ink : COL.grid, 'stroke-width': 1.2 }),
        small(c.x + 12, c.y + 4, c.name, { bold: on, soft: !on }),
      );
    }
    // The magma chamber: melt on top, crystals settled at the bottom in the order they formed.
    const bx = 292;
    const by = 40;
    const bw = 92;
    const bh = 158;
    const left = meltLeft(temp);
    const meltH = bh * left;
    parts.push(svg('rect', { x: bx, y: by, width: bw, height: bh, rx: 6, fill: '#efe6d6', stroke: COL.soft }));
    let y = by + bh;
    const formed = [...CRYSTALS].sort((a, b) => b.at - a.at).filter((c) => temp <= c.at);
    const solid = bh - meltH;
    // Each crystal's share of the pile: in proportion to the span it has been growing.
    const spans = formed.map((c) => c.at - Math.max(temp, T_END));
    const sum = spans.reduce((s, v) => s + v, 0) || 1;
    formed.forEach((c, i) => {
      const h = (solid * spans[i]) / sum;
      y -= h;
      parts.push(svg('rect', { x: bx + 1, y, width: bw - 2, height: h, fill: c.color, opacity: 0.95 }));
    });
    const si = meltSilica(temp);
    if (meltH > 0.5) parts.push(svg('rect', { x: bx + 1, y: by + 1, width: bw - 2, height: meltH - 1, rx: 5, fill: si < 60 ? '#d9541f' : si < 68 ? '#e98a3c' : '#f2b766', opacity: 0.9 }));
    parts.push(
      small(bx + bw / 2, by - 8, 'magma chamber', { anchor: 'middle', soft: true }),
      small(bx + bw / 2, by + bh + 14, `melt left: ${Math.round(left * 100)}%`, { anchor: 'middle', bold: true }),
      small(bx + bw / 2, by + bh + 27, left > 0.02 ? `silica in melt: ${Math.round(si)}%` : 'all solid', { anchor: 'middle', soft: true }),
    );
    redraw(g, ...parts);
    const newest = formed[formed.length - 1];
    f.readout.textContent = temp >= T_TOP - 1
      ? 'A basalt melt, all liquid, at 1300 °C. Cool it, and suppose each crystal sinks to the floor of the chamber as it forms.'
      : left <= 0.02
        ? `${temp} °C: all solid. Quartz came last. Run the ladder the other way and heat a rock: quartz, feldspar and mica melt first, so the first melt of any crust is granite-like.`
        : `${temp} °C: ${newest ? `${newest.name} is crystallising` : 'no crystals yet'}. The crystals take out iron and magnesium, so the ${Math.round(left * 100)}% still liquid has ${Math.round(si)}% silica; erupted now, it would make ${lavaName(si)}.`;
    if (temp <= 700 && t.goal === 'quartz') t.done();
  };
  const ts = slider('Temperature', T_END, T_TOP, 10, T_TOP, (v) => `${v} °C`, (v) => { temp = v; paint(); }, 'heat');
  ts.input.style.direction = 'rtl';
  f.controls.append(ts.node);
  paint();
  return f.node;
});
