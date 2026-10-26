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
