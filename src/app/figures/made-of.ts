// Lesson 1, what soil is made of: a handful by volume, the three grain sizes
// side by side, the jar test, and the texture triangle.

import { el, svg } from 'lesson-kit/dom';
import { label, note, redraw, small, still } from 'lesson-kit/draw';
import { makeRng } from 'lesson-kit/rng';
import { feelOf, HANDFUL, IN_THE_BED, mixOf, sayTime, SETTLED_BY, settled, textureOf, TEXTURES, type Mix, type Texture } from '../../core/soil';
import { drawJar, layerTops, type JarBox } from '../scene/jar';
import { COL, figure, frame, slider, tint, type Slider } from './kit';

const f1 = (n: number) => n.toFixed(1);

// ---- A handful, by volume -----------------------------------------------------

/** A close look at a crumb of loam on the left, and the same handful as one bar on the right. */
export function handfulDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 210;
  const s = still(W, H);
  const rng = makeRng(4);
  const cx = 104;
  const cy = 105;
  const R = 88;
  const clip = svg('clipPath', { id: 'handful-clip' }, svg('circle', { cx, cy, r: R }));
  const inside = svg('g', { 'clip-path': 'url(#handful-clip)' }, svg('rect', { x: cx - R, y: cy - R, width: 2 * R, height: 2 * R, fill: COL.airPale }));
  // Grains on a jittered grid, each wrapped in a film of water, a few dark bits of organic matter between.
  for (let y = cy - R + 8; y < cy + R; y += 25) {
    for (let x = cx - R + 8 + ((y / 25) % 2) * 12; x < cx + R; x += 25) {
      const gx = x + (rng() - 0.5) * 8;
      const gy = y + (rng() - 0.5) * 8;
      const r = 9 + rng() * 3.5;
      inside.append(svg('circle', { cx: f1(gx), cy: f1(gy), r: f1(r + 3.4), fill: tint(COL.water, 0.55) }));
      const n = 7;
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rng();
        const rr = r * (0.8 + rng() * 0.3);
        return `${f1(gx + Math.cos(a) * rr)},${f1(gy + Math.sin(a) * rr)}`;
      }).join(' ');
      inside.append(svg('polygon', { points: pts, fill: COL.mineral, stroke: '#7d6040', 'stroke-width': 0.7, 'stroke-linejoin': 'round' }));
      if (rng() < 0.12) inside.append(svg('ellipse', { cx: f1(gx + 12), cy: f1(gy + 11), rx: 5, ry: 2.6, fill: COL.organic, transform: `rotate(${f1(rng() * 180)} ${f1(gx + 12)} ${f1(gy + 11)})` }));
    }
  }
  s.svg.append(svg('defs', {}, clip), svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), inside, svg('circle', { cx, cy, r: R, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }));
  s.svg.append(small(cx, cy + R + 14, 'a crumb, magnified', { anchor: 'middle', soft: true }));

  // The bar: one handful split by volume.
  const bx = 250;
  const bw = 46;
  const top = 14;
  const bh = 180;
  const colours = { minerals: COL.mineral, 'organic matter': COL.organic, water: COL.water, air: COL.air } as const;
  let y = top;
  for (const { part, share } of HANDFUL) {
    const h = (bh * share) / 100;
    s.svg.append(svg('rect', { x: bx, y: f1(y), width: bw, height: f1(h), fill: colours[part] }));
    s.svg.append(label(bx + bw + 8, y + h / 2 + 4, `${part} ${share}%`, { fill: part === 'air' ? '#3f7f97' : colours[part], bold: true }));
    y += h;
  }
  s.svg.append(svg('rect', { x: bx, y: top, width: bw, height: bh, fill: 'none', stroke: COL.ink, 'stroke-width': 1.5 }));
  // Braces for the two halves.
  const brace = (y0: number, y1: number, text: string) => {
    const x = bx - 8;
    s.svg.append(
      svg('path', { d: `M${x},${y0 + 2} q-5,0 -5,5 v${f1((y1 - y0) / 2 - 9)} l-4,4 l4,4 v${f1((y1 - y0) / 2 - 9)} q0,5 5,5`, fill: 'none', stroke: COL.soft, 'stroke-width': 1.2 }),
      note(x - 14, (y0 + y1) / 2 + 3, text, { anchor: 'end', soft: true }),
    );
  };
  brace(top, top + bh / 2, 'solid');
  brace(top + bh / 2, top + bh, 'pores');
  return { node: s.node };
}

// ---- The three sizes ----------------------------------------------------------

/**
 * A clay plate the size of a pea (7 mm), a silt grain at the same scale (the
 * size of a grapefruit), and a grain of medium sand (a boulder taller than a
 * person, only its edge in the frame): sizes 1, 20 and 500.
 */
export function sizesDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 190;
  const s = still(W, H);
  const base = 150;
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), svg('line', { x1: 0, y1: base, x2: W, y2: base, stroke: COL.grid, 'stroke-width': 1.5 }));
  // Clay: a tiny flat plate.
  const clayX = 44;
  s.svg.append(
    svg('ellipse', { cx: clayX, cy: base - 1.2, rx: 3.5, ry: 1.2, fill: COL.clay }),
    label(clayX, base + 18, 'clay', { anchor: 'middle', bold: true, fill: COL.clay }),
    small(clayX, base + 30, 'a pea', { anchor: 'middle', soft: true }),
  );
  // Silt: twenty times as wide.
  const siltX = 130;
  const siltR = 35;
  s.svg.append(
    svg('circle', { cx: siltX, cy: base - siltR, r: siltR, fill: COL.silt }),
    svg('ellipse', { cx: siltX - 11, cy: base - siltR - 12, rx: 10, ry: 6, fill: '#fff', opacity: 0.2 }),
    label(siltX, base + 18, 'silt', { anchor: 'middle', bold: true, fill: COL.silt }),
    small(siltX, base + 30, 'a grapefruit', { anchor: 'middle', soft: true }),
  );
  // Sand: five hundred times the clay. Only the left side of it fits in the
  // frame, rising out of the ground and curving away up and out of the top.
  const sandR = 875;
  const sandX = 230 + sandR;
  const sandY = base + 300;
  s.svg.append(
    svg('defs', {}, svg('clipPath', { id: 'sizes-ground' }, svg('rect', { x: 0, y: 0, width: W, height: base }))),
    svg('circle', { cx: sandX, cy: sandY, r: sandR, fill: COL.sand, 'clip-path': 'url(#sizes-ground)' }),
    label(318, base + 18, 'sand', { anchor: 'middle', bold: true, fill: COL.sand }),
    small(318, base + 30, 'a boulder taller than a house', { anchor: 'middle', soft: true }),
    small(350, 96, 'its curve runs on', { anchor: 'middle', fill: '#fff' }),
    small(350, 108, 'out of the picture', { anchor: 'middle', fill: '#fff' }),
  );
  return { node: s.node };
}

// ---- The jar test -------------------------------------------------------------

const SAMPLES: { name: string; mix: Mix }[] = [
  { name: 'Garden loam', mix: mixOf(40, 20) },
  { name: 'Sandy bed', mix: mixOf(75, 8) },
  { name: 'Heavy clay', mix: mixOf(20, 50) },
];

/** Seconds after shaking for slider position v (0 to 100): one second up to three days, on a log scale. */
const timeAt = (v: number) => Math.exp((v / 100) * Math.log(3 * 86400));

export const jarFigure = figure(['read'], (_ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  const box: JarBox = { x: 40, y: 22, w: 120, h: 210 };
  let sample = SAMPLES[0];
  let v = 0;
  const jar = svg('g');
  const marks = svg('g');
  const side = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), jar, marks, side);

  const paint = () => {
    const time = timeAt(v);
    const mix = sample.mix;
    redraw(jar, drawJar(box, mix, time));
    // A pencil mark on the glass at the top of each layer once it is down.
    const tops = layerTops(box, mix, time);
    const m: SVGElement[] = [];
    for (const p of ['sand', 'silt', 'clay'] as const) {
      if (time < SETTLED_BY[p]) continue;
      const y = tops[p];
      m.push(svg('line', { x1: box.x + box.w - 2, y1: y, x2: box.x + box.w + 12, y2: y, stroke: COL[p], 'stroke-width': 2 }));
      m.push(small(box.x + box.w + 15, y + 3, p, { fill: COL[p], bold: true }));
    }
    redraw(marks, ...m);
    // On the right, how much of each size is down.
    const rows: SVGElement[] = [heading(260, 34, `${sayTime(time)} after shaking`)];
    (['sand', 'silt', 'clay'] as const).forEach((p, i) => {
      const y = 70 + i * 50;
      const share = settled(p, time);
      rows.push(
        label(214, y, p, { bold: true, fill: COL[p] }),
        svg('rect', { x: 214, y: y + 8, width: 160, height: 12, rx: 6, fill: tint(COL[p], 0.18) }),
        svg('rect', { x: 214, y: y + 8, width: f1(160 * share), height: 12, rx: 6, fill: COL[p] }),
        small(374, y, share > 0.98 ? 'settled' : share > 0.02 ? `${Math.round(share * 100)}% down` : 'in the water', { anchor: 'end', soft: true }),
      );
    });
    redraw(side, ...rows);
    const sandDone = time >= SETTLED_BY.sand;
    const siltDone = time >= SETTLED_BY.silt;
    const clayDone = time >= SETTLED_BY.clay;
    const texture = textureOf(mix);
    f.readout.textContent = clayDone
      ? `The water is clear. Sand ${mix.sand}%, silt ${mix.silt}%, clay ${mix.clay}%: a ${texture}.`
      : siltDone
        ? 'Sand and silt are down. The water is still cloudy with clay, which can take a day or two.'
        : sandDone
          ? 'The sand is down already. Silt is still settling, over the next few hours.'
          : 'Everything is still swirling. The big sand grains sink first, within a minute.';
    if (clayDone && t.goal === 'read') t.done();
  };

  const time = slider('Time', 0, 100, 1, 0, (x) => sayTime(timeAt(x)), (x) => { v = x; paint(); }, 'water');
  const chips = SAMPLES.map((smp, i) => el('button.chip', { type: 'button', className: i === 0 ? 'chip on' : 'chip', onclick: () => {
    sample = smp;
    chips.forEach((c, k) => c.classList.toggle('on', k === i));
    time.set(0);
  } }, smp.name));
  f.controls.append(el('div.chips', {}, chips), time.node);
  paint();
  return f.node;
});

function heading(x: number, y: number, text: string): SVGElement {
  return label(x, y, text, { bold: true });
}

// ---- The texture triangle -----------------------------------------------------

/** A pale fill for each class, by its group: golds for the sandy ones, greens for loams, terracottas for the clays. */
const FILL: Record<Texture, string> = {
  'sand': '#f3e1b2',
  'loamy sand': '#efd9a0',
  'sandy loam': '#ead08f',
  'loam': '#d9e5b9',
  'silt loam': '#cfdfae',
  'silt': '#e1e8c8',
  'sandy clay loam': '#f1d2b4',
  'clay loam': '#ecc6a7',
  'silty clay loam': '#e9cfb9',
  'sandy clay': '#e6b897',
  'silty clay': '#e3c1a8',
  'clay': '#dca988',
};

/**
 * Each class's region on the triangle, as corners given by (sand, clay): the
 * boundaries textureOf in core/soil.ts tests, drawn as polygons.
 */
export const REGIONS: Record<Texture, [number, number][]> = {
  'sand': [[100, 0], [85, 0], [90, 10]],
  'loamy sand': [[90, 10], [85, 0], [70, 0], [85, 15]],
  'sandy loam': [[85, 15], [70, 0], [50, 0], [43, 7], [52, 7], [52, 20], [80, 20]],
  'loam': [[43, 7], [52, 7], [52, 20], [45, 27], [23, 27]],
  'silt loam': [[50, 0], [20, 0], [8, 12], [0, 12], [0, 27], [23, 27], [43, 7]],
  'silt': [[20, 0], [0, 0], [0, 12], [8, 12]],
  'sandy clay loam': [[80, 20], [52, 20], [45, 27], [45, 35], [65, 35]],
  'clay loam': [[45, 27], [20, 27], [20, 40], [45, 40]],
  'silty clay loam': [[20, 27], [0, 27], [0, 40], [20, 40]],
  'sandy clay': [[65, 35], [45, 35], [45, 55]],
  'silty clay': [[20, 40], [0, 40], [0, 60]],
  'clay': [[45, 40], [20, 40], [0, 60], [0, 100], [45, 55]],
};

/** Where each class's name sits, as a mix; read off the USDA triangle. */
const NAME_AT: Record<Texture, [number, number, string?]> = {
  'sand': [92, 2],
  'loamy sand': [82, 5, 'loamy\nsand'],
  'sandy loam': [65, 10, 'sandy\nloam'],
  'loam': [41, 18],
  'silt loam': [20, 14, 'silt loam'],
  'silt': [7, 5],
  'sandy clay loam': [60, 27, 'sandy clay\nloam'],
  'clay loam': [33, 33, 'clay\nloam'],
  'silty clay loam': [10, 33, 'silty clay\nloam'],
  'sandy clay': [52, 42, 'sandy\nclay'],
  'silty clay': [7, 47, 'silty\nclay'],
  'clay': [22, 60],
};

/** Move a slider to `v` without firing it, as when the other one pushes it. */
function quietly(s: Slider, v: number): void {
  s.input.value = String(v);
  s.node.querySelector('output')!.textContent = `${v}%`;
}

export const triangleFigure = figure(['loam', 'clay', 'sand'], (_ctx, t) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 3);
  // Sand 100% at the bottom left, silt at the bottom right, clay at the top.
  const L = 300;
  const x0 = 50;
  const yb = 268;
  const hgt = (L * Math.sqrt(3)) / 2;
  const at = (sand: number, clay: number): [number, number] => {
    const silt = 100 - sand - clay;
    return [x0 + (silt * L + clay * (L / 2)) / 100, yb - (clay * hgt) / 100];
  };
  const regions = svg('g', {}, ...TEXTURES.map((c) => svg('polygon', {
    points: REGIONS[c].map(([sd, cl]) => at(sd, cl).map(f1).join(',')).join(' '),
    fill: FILL[c],
    stroke: '#fff',
    'stroke-width': 0.8,
    'stroke-linejoin': 'round',
  })));
  const names = svg('g', {}, ...TEXTURES.map((c) => {
    const [s, cl, text] = NAME_AT[c];
    const [x, y] = at(s, cl);
    const lines = (text ?? c).split('\n');
    return svg('g', {}, ...lines.map((ln, i) => small(x, y + i * 10 - (lines.length - 1) * 5 + 3, ln, { anchor: 'middle', soft: true })));
  }));
  const [ax, ay] = at(100, 0);
  const [bx, by] = at(0, 0);
  const [cx, cy] = at(0, 100);
  const outline = svg('polygon', { points: `${ax},${ay} ${bx},${by} ${f1(cx)},${f1(cy)}`, fill: 'none', stroke: COL.ink, 'stroke-width': 1.6, 'stroke-linejoin': 'round' });
  // Ticks every 20 on each side, and what each side measures.
  const ticks = svg('g', {});
  for (let v = 20; v < 100; v += 20) {
    const [sx, sy] = at(v, 0);
    ticks.append(small(sx, sy + 12, String(v), { anchor: 'middle', soft: true }));
    const [lx, ly] = at(100 - v, v);
    ticks.append(small(lx - 5, ly + 3, String(v), { anchor: 'end', soft: true }));
    const [rx, ry] = at(0, 100 - v);
    ticks.append(small(rx + 5, ry + 3, String(v), { soft: true }));
  }
  ticks.append(
    note(x0 + L / 2, yb + 26, '← more sand', { anchor: 'middle', fill: COL.sand, bold: true }),
    note(x0 + L * 0.2, yb - hgt * 0.62, 'more clay ↑', { anchor: 'end', fill: COL.clay, bold: true }),
    note(x0 + L * 0.8 + 6, yb - hgt * 0.62, 'more silt ↘', { fill: COL.silt, bold: true }),
  );
  const dot = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), regions, outline, names, ticks, dot);

  let sand = 70;
  let clay = 15;
  const paint = () => {
    const mix = mixOf(sand, clay);
    const texture = textureOf(mix);
    const [x, y] = at(mix.sand, mix.clay);
    redraw(dot,
      svg('circle', { cx: f1(x), cy: f1(y), r: 7, fill: COL.ink, opacity: 0.15 }),
      svg('circle', { cx: f1(x), cy: f1(y), r: 4.5, fill: COL.ink, stroke: '#fff', 'stroke-width': 1.5 }),
    );
    f.readout.textContent = `Sand ${mix.sand}, silt ${mix.silt}, clay ${mix.clay}: ${texture}. ${IN_THE_BED[feelOf(texture)]}`;
    if (t.goal === 'loam' && texture === 'loam') t.done();
    if (t.goal === 'clay' && texture === 'clay') t.done();
    if (t.goal === 'sand' && texture === 'sand') t.done();
  };
  const sandSlider = slider('Sand', 0, 100, 1, sand, (v) => `${v}%`, (v) => {
    sand = v;
    if (sand + clay > 100) clay = 100 - sand;
    quietly(claySlider, clay);
    paint();
  }, 'sand');
  const claySlider = slider('Clay', 0, 100, 1, clay, (v) => `${v}%`, (v) => {
    clay = v;
    if (sand + clay > 100) {
      sand = 100 - clay;
      quietly(sandSlider, sand);
    }
    paint();
  }, 'clay');
  f.controls.append(sandSlider.node, claySlider.node);
  paint();
  return f.node;
});

// ---- Surface ------------------------------------------------------------------

/** Grain width for slider position v (0 to 100): 1 cm down to 0.001 mm, on a log scale. */
const widthAt = (v: number) => 10 * Math.pow(1e-4, v / 100);

/** A width in millimetres, said simply. */
function sayWidth(mm: number): string {
  if (mm >= 1) return `${+mm.toPrecision(2)} mm`;
  if (mm >= 0.01) return `${+mm.toPrecision(2)} mm`;
  return `${+(mm * 1000).toPrecision(2)} µm`;
}

/** A surface in square centimetres, and something of about that size. */
function saySurface(cm2: number): string {
  const things: [number, string][] = [
    [10, 'a postage stamp'], [60, 'a playing card'], [600, 'a page of a book'], [6000, 'a doormat'],
    [60000, 'a big rug'], [600000, 'a living room floor'],
  ];
  let best = things[0];
  for (const t of things) if (Math.abs(Math.log(cm2 / t[0])) < Math.abs(Math.log(cm2 / best[0]))) best = t;
  const area = cm2 >= 10000 ? `${+(cm2 / 10000).toPrecision(2)} m²` : `${Math.round(cm2).toLocaleString('en')} cm²`;
  return `${area}, about ${best[1]}`;
}

/**
 * A sugar-cube's worth (1 cm³) of grains, cut smaller and smaller: the same
 * volume of rock, but the total surface of the grains grows as the grains
 * shrink, 6 cm² for one cube, 60 for millimetre sand, and square metres for clay.
 */
export const surfaceFigure = figure(['clay'], (_ctx, t) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 3);
  const cube = svg('g');
  const bar = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), cube, bar);
  let v = 0;
  const paint = () => {
    const mm = widthAt(v);
    const n = 10 / mm; // grains along each edge of the centimetre cube
    const surface = 6 / (mm / 10); // cm² for 1 cm³
    const size = mm > 2 ? 'mineral' : mm >= 0.05 ? 'sand' : mm >= 0.002 ? 'silt' : 'clay';
    const what = mm >= 9.9 ? 'One cube of rock, 1 cm on a side' : mm > 2 ? `Pebbles ${sayWidth(mm)} across, gravel` : `Grains ${sayWidth(mm)} across, the size of ${size}`;
    // The front face of the cube, cut into as many squares as there are grains along an edge, up to what can be drawn.
    const x0 = 30;
    const y0 = 30;
    const side = 150;
    const shown = Math.min(64, Math.max(1, Math.round(n)));
    const lines: SVGElement[] = [svg('rect', { x: x0, y: y0, width: side, height: side, fill: tint(COL[size], 0.35), stroke: COL.ink, 'stroke-width': 1.5 })];
    if (shown > 1) {
      let d = '';
      for (let i = 1; i < shown; i++) {
        const p = f1(x0 + (side * i) / shown);
        const q = f1(y0 + (side * i) / shown);
        d += `M${p},${y0}V${y0 + side}M${x0},${q}H${x0 + side}`;
      }
      lines.push(svg('path', { d, stroke: COL[size], 'stroke-width': shown > 32 ? 0.4 : 0.8, fill: 'none' }));
    }
    lines.push(
      small(x0 + side / 2, y0 + side + 16, '1 cm', { anchor: 'middle', soft: true }),
      small(x0 + side / 2, y0 - 8, n > 64 ? `${Math.round(n).toLocaleString('en')} grains along each edge (too many to draw)` : `${Math.round(n)} grain${Math.round(n) === 1 ? '' : 's'} along each edge`, { anchor: 'middle', soft: true }),
    );
    redraw(cube, ...lines);
    // The surface on a log scale from 6 cm² to 60,000 cm².
    const bx = 220;
    const bw = 30;
    const by = 30;
    const bh = 160;
    const frac = Math.log10(surface / 6) / 4;
    const marks: SVGElement[] = [
      svg('rect', { x: bx, y: by, width: bw, height: bh, fill: tint(COL.water, 0.12), stroke: COL.grid }),
      svg('rect', { x: bx, y: f1(by + bh * (1 - frac)), width: bw, height: f1(bh * frac), fill: COL.water }),
    ];
    for (const [s, name] of [[6, 'one cube'], [60, 'sand'], [3000, 'silt'], [60000, 'clay']] as const) {
      const y = by + bh * (1 - Math.log10(s / 6) / 4);
      marks.push(svg('line', { x1: bx + bw, y1: f1(y), x2: bx + bw + 6, y2: f1(y), stroke: COL.soft }), small(bx + bw + 10, y + 3, name, { soft: true }));
    }
    marks.push(label(bx + bw / 2, by + bh + 16, 'surface', { anchor: 'middle', bold: true, fill: COL.water }));
    redraw(bar, ...marks);
    f.readout.textContent = `${what}. ${mm >= 9.9 ? 'It has' : 'The same 1 cm³ of rock now has'} ${saySurface(surface)} of surface for water to cling to.`;
    if (size === 'clay' && t.goal === 'clay') t.done();
  };
  f.controls.append(slider('Grain size', 0, 100, 1, 0, (x) => sayWidth(widthAt(x)), (x) => { v = x; paint(); }, 'clay').node);
  paint();
  return f.node;
});

// ---- Texture by feel ----------------------------------------------------------

/** The texture by feel key (after Thien, 1979): a few questions about a wet ball of soil. */
interface FeelStep {
  ask: string;
  answers: { say: string; next: string | Texture }[];
}

const FEEL: Record<string, FeelStep> = {
  ball: { ask: 'Wet a walnut-sized lump and squeeze it. Does it stay in a ball?', answers: [
    { say: 'No, it falls apart', next: 'sand' },
    { say: 'Yes', next: 'ribbon' },
  ] },
  ribbon: { ask: 'Push it out between thumb and finger into a flat ribbon. Does a ribbon form?', answers: [
    { say: 'No', next: 'loamy sand' },
    { say: 'Yes', next: 'length' },
  ] },
  length: { ask: 'How long does the ribbon get before it breaks?', answers: [
    { say: 'Under 2.5 cm (1 in)', next: 'weak' },
    { say: '2.5 to 5 cm', next: 'medium' },
    { say: 'Over 5 cm (2 in)', next: 'strong' },
  ] },
  weak: { ask: 'Rub a wet pinch in your palm. How does it feel?', answers: [
    { say: 'Very gritty', next: 'sandy loam' },
    { say: 'Very smooth', next: 'silt loam' },
    { say: 'Neither', next: 'loam' },
  ] },
  medium: { ask: 'Rub a wet pinch in your palm. How does it feel?', answers: [
    { say: 'Very gritty', next: 'sandy clay loam' },
    { say: 'Very smooth', next: 'silty clay loam' },
    { say: 'Neither', next: 'clay loam' },
  ] },
  strong: { ask: 'Rub a wet pinch in your palm. How does it feel?', answers: [
    { say: 'Very gritty', next: 'sandy clay' },
    { say: 'Very smooth', next: 'silty clay' },
    { say: 'Neither', next: 'clay' },
  ] },
};

const isTexture = (s: string): s is Texture => (TEXTURES as readonly string[]).includes(s);

/** The texture triangle drawn small, with one class picked out. */
function miniTriangle(g: SVGElement, pick: Texture | null): void {
  const L = 170;
  const x0 = 210;
  const yb = 190;
  const hgt = (L * Math.sqrt(3)) / 2;
  const at = (sand: number, clay: number): string => {
    const silt = 100 - sand - clay;
    return `${f1(x0 + (silt * L + clay * (L / 2)) / 100)},${f1(yb - (clay * hgt) / 100)}`;
  };
  redraw(g, ...TEXTURES.map((c) => svg('polygon', {
    points: REGIONS[c].map(([s, cl]) => at(s, cl)).join(' '),
    fill: c === pick ? COL.ink : FILL[c],
    stroke: '#fff',
    'stroke-width': 0.8,
  })), small(x0, yb + 14, 'sand', { fill: COL.sand, bold: true }), small(x0 + L, yb + 14, 'silt', { anchor: 'end', fill: COL.silt, bold: true }), small(x0 + L / 2, yb - hgt - 6, 'clay', { anchor: 'middle', fill: COL.clay, bold: true }));
}

export const feelFigure = figure(['name'], (_ctx, t) => {
  const W = 400;
  const H = 210;
  const f = frame(W, H, 3);
  const tri = svg('g');
  const hand = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), hand, tri);
  const row = el('div.chips');
  const again = el('button.btn.btn-small.btn-ghost', { type: 'button' }, 'Start again') as HTMLButtonElement;
  f.controls.append(row, again);

  /** The lump on a ruler: a ball, crumbs if it fell apart, or a ribbon pushed out to `ribbon` (0 to 3: none, short, medium, long). */
  const drawHand = (ribbon: number, ball: boolean) => {
    const x0 = 24;
    const y = 120;
    const cm = 26;
    const parts: SVGElement[] = [svg('rect', { x: x0, y: y + 14, width: cm * 6.5, height: 18, rx: 2, fill: '#efe2c0', stroke: COL.soft })];
    for (let i = 0; i <= 6; i++) {
      parts.push(svg('line', { x1: x0 + 6 + i * cm, y1: y + 14, x2: x0 + 6 + i * cm, y2: y + 22, stroke: COL.soft }));
      parts.push(small(x0 + 6 + i * cm, y + 30, String(i), { anchor: 'middle', soft: true }));
    }
    parts.push(small(x0 + cm * 6.5, y + 44, 'cm', { anchor: 'end', soft: true }));
    if (!ball && ribbon === 0) {
      for (let i = 0; i < 12; i++) parts.push(svg('circle', { cx: x0 + 14 + (i % 6) * 9, cy: y + 4 - Math.floor(i / 6) * 7, r: 3.5, fill: COL.sand }));
    } else if (ribbon === 0) {
      parts.push(svg('circle', { cx: x0 + 26, cy: y - 8, r: 20, fill: COL.soil }));
    } else {
      const len = [0, 1.8, 3.8, 6][ribbon] * cm;
      parts.push(svg('circle', { cx: x0 + 14, cy: y - 6, r: 14, fill: COL.soil }));
      parts.push(svg('path', { d: `M${x0 + 20},${y - 2} h${f1(len)} l-2,8 h${f1(-len + 2)} z`, fill: COL.soil }));
      parts.push(small(x0 + 26 + len / 2, y - 16, ['', 'weak ribbon', 'medium ribbon', 'strong ribbon'][ribbon], { anchor: 'middle', soft: true }));
    }
    redraw(hand, ...parts);
  };

  const go = (at: string) => {
    if (isTexture(at)) {
      miniTriangle(tri, at);
      f.readout.textContent = `It is a ${at}. ${IN_THE_BED[feelOf(at)]} A jar test will tell you the mix more exactly.`;
      row.replaceChildren();
      if (t.goal === 'name') t.done();
      return;
    }
    const step = FEEL[at];
    f.readout.textContent = step.ask;
    drawHand(at === 'ball' ? 0 : at === 'ribbon' ? 0 : at === 'length' ? 1 : at === 'weak' ? 1 : at === 'medium' ? 2 : 3, at !== 'ball');
    row.replaceChildren(...step.answers.map((a) => el('button.chip', { type: 'button', onclick: () => {
      if (a.next === 'sand') drawHand(0, false);
      go(a.next);
    } }, a.say)));
  };
  again.addEventListener('click', () => {
    miniTriangle(tri, null);
    go('ball');
  });
  miniTriangle(tri, null);
  go('ball');
  return f.node;
});
