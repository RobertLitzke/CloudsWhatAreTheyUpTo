// Figures for the middle sky: the sun through thickening cloud, the hand
// trick, self-shadows, and stills of warm air gliding up over cold and a
// cloud layer turning over.

import { angularSize, layerBySize } from '../../core/sky';
import { genus } from '../../core/clouds';
import { svg } from '../dom';
import { arrow, heading, line, redraw, small, still, wavy } from './draw';
import { COL, figure, frame, height, slider, type FigureFactory } from './kit';

// ---- Warm air gliding up over cold ------------------------------------------

export const glideDiagram: FigureFactory = () => {
  const d = still(400, 210);
  const ground = 180;
  // The cold wedge: its top slopes gently up from the front (right) to the left.
  const wedge = `M0,${ground} L0,96 L330,${ground} Z`;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: COL.warmSide }),
    svg('path', { d: wedge, fill: COL.cold, opacity: 0.45 }),
    svg('rect', { x: 0, y: ground, width: 400, height: 30, fill: COL.ground }),
    // Sheets of cloud along the slope, highest and thinnest far ahead.
    svg('rect', { x: 20, y: 40, width: 120, height: 8, rx: 4, fill: '#ffffff', stroke: COL.cloudShade }),
    svg('rect', { x: 110, y: 76, width: 140, height: 16, rx: 6, fill: '#ece9f2', stroke: COL.cloudShade }),
    svg('rect', { x: 210, y: 112, width: 120, height: 30, rx: 8, fill: '#d6d2e2', stroke: COL.cloudShade }),
    arrow(390, 168, 300, 126, COL.parcel, 2.5),
    arrow(290, 120, 170, 66, COL.parcel, 2.5),
    arrow(160, 60, 60, 30, COL.parcel, 2),
    small(396, 98, 'warm, moist air', { anchor: 'end', fill: COL.parcel }),
    small(6, 160, 'cold, heavy air', { fill: COL.coldInk }),
    small(330, ground + 18, 'the front, on the ground', { anchor: 'middle', fill: '#fff' }),
    small(80, 62, 'high, thin', { soft: true, anchor: 'middle' }),
    small(180, 106, 'middle sheets', { soft: true, anchor: 'middle' }),
    small(270, 156, 'thick, low', { soft: true, anchor: 'middle' }),
    heading(200, 18, 'Seen from far ahead, the cloud comes first'),
    small(6, ground + 18, '← hundreds of km ahead', { fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- A cloud layer turning over ---------------------------------------------

export const overturnDiagram: FigureFactory = () => {
  const d = still(400, 230);
  const top = 92;
  const base = 152;
  const cells: SVGElement[] = [];
  for (let i = 0; i < 4; i++) {
    const cx = 50 + i * 100;
    cells.push(
      svg('ellipse', { cx, cy: (top + base) / 2, rx: 44, ry: 34, fill: '#ffffff' }),
      arrow(cx, base - 6, cx, top + 8, COL.parcel, 1.6),
      arrow(cx + 50, top + 10, cx + 50, base - 8, COL.cold, 1.6),
    );
  }
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 230, fill: COL.sky }),
    svg('rect', { x: 0, y: top, width: 400, height: base - top, fill: '#eceaf2' }),
    ...cells,
    ...[60, 160, 260, 360].map((x) => wavy(x, top - 4, 48, COL.warm, 1.6)),
    small(6, 18, 'The top radiates heat to the cold, clear sky', { fill: COL.warmInk }),
    small(6, 32, 'and gets little back: it cools.', { fill: COL.warmInk }),
    small(6, 176, 'The base is kept warm by heat from the ground below.', { fill: COL.warmInk }),
    small(6, 208, 'Chilled air at the top sinks (blue), warmer air rises (orange):'),
    small(6, 222, 'lumps where it rises, thin gaps where it sinks.'),
  );
  return { node: d.node };
};

// ---- The hand trick ---------------------------------------------------------

export const handFigure = figure(['all'], (ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 2);
  const PX_PER_DEG = 9; // about 44° of sky across the figure
  let pieceM = 250;
  let layerM = 4000;
  const seen = new Set<string>();
  const sky = svg('g');
  const hand = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#7fb4d6' }), sky, hand);
  // The hand at arm's length, drawn at its true angular size: fist about 10°,
  // three fingers about 5°, thumb about 2°, little-finger nail about 1°.
  const fistW = 10 * PX_PER_DEG;
  hand.append(
    svg('rect', { x: 290, y: 140, width: fistW, height: 70, rx: 18, fill: '#e6b89c', opacity: 0.92 }),
    svg('rect', { x: 290 - 2 * PX_PER_DEG, y: 150, width: 2 * PX_PER_DEG, height: 46, rx: 8, fill: '#ddaa8c', opacity: 0.95 }),
    svg('rect', { x: 290 + fistW - 1 * PX_PER_DEG - 2, y: 124, width: PX_PER_DEG, height: 22, rx: 4, fill: '#ddaa8c' }),
    small(290 + fistW / 2, 232, 'fist ≈ 10°', { anchor: 'middle' }),
    small(290 - PX_PER_DEG, 214, 'thumb ≈ 2°', { anchor: 'middle' }),
    small(290 + fistW - 2, 118, 'nail ≈ 1°', { anchor: 'middle' }),
  );
  const paint = () => {
    // Looking up high in the sky (about 60° up), so the distance is a little more than the height.
    const deg = angularSize(pieceM, layerM / Math.sin((60 * Math.PI) / 180));
    const px = deg * PX_PER_DEG;
    const kind = layerBySize(deg);
    seen.add(kind);
    const pieces: SVGElement[] = [];
    const step = Math.max(px * 1.5, 8);
    let row = 0;
    for (let y = 18; y < 130; y += step * 0.8, row++) {
      for (let x = 8 + (row % 2) * step * 0.5; x < W; x += step) {
        pieces.push(svg('ellipse', { cx: x, cy: y, rx: px / 2, ry: px / 2.6, fill: '#fff', opacity: 0.95 }));
        if (kind !== 'cirrocumulus') pieces.push(svg('ellipse', { cx: x + px * 0.05, cy: y + px * 0.18, rx: px / 2.4, ry: px / 5, fill: kind === 'stratocumulus' ? '#8c8aa6' : '#b9bfd3', opacity: 0.8 }));
      }
    }
    redraw(sky, ...pieces);
    f.readout.textContent = `Each piece looks ${deg < 1 ? deg.toFixed(1) : deg.toFixed(0)}° wide: ${deg < 1 ? 'smaller than your little-finger nail' : deg <= 2.5 ? 'about a thumb' : deg <= 5 ? 'between a thumb and three fingers' : 'a fist or more'}. Call it ${genus(kind).name.toLowerCase()}.`;
    if (t.goal === 'all' && seen.size === 3) t.done();
  };
  f.controls.append(
    slider('Layer height', 500, 10000, 100, layerM, (v) => height(v, ctx.save.units), (v) => { layerM = v; paint(); }, 'ink').node,
    slider('Piece size', 50, 800, 10, pieceM, (v) => `${v} m across`, (v) => { pieceM = v; paint(); }, 'ink').node,
  );
  paint();
  return f.node;
});

// ---- Self-shadows -----------------------------------------------------------

export const shadowFigure = figure(['shade'], (_ctx, t) => {
  const W = 400;
  const H = 180;
  const f = frame(W, H);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#86b8d8' }), g);
  const paint = (depth: number) => {
    // Light coming from above and behind: thin pieces glow through, thick ones
    // block it and their undersides go grey.
    const dark = Math.min(0.85, depth / 1200);
    const parts: SVGElement[] = [];
    for (let i = 0; i < 5; i++) {
      const x = 44 + i * 78;
      const r = 18 + depth / 60;
      parts.push(
        svg('ellipse', { cx: x, cy: 80, rx: r, ry: r * 0.7, fill: '#fff' }),
        svg('ellipse', { cx: x + 2, cy: 80 + r * 0.32, rx: r * 0.9, ry: r * 0.38, fill: `rgba(70, 64, 100, ${dark})` }),
      );
    }
    redraw(g, ...parts);
    const kind = depth < 200 ? 'cirrocumulus' : depth < 700 ? 'altocumulus' : 'stratocumulus';
    f.readout.textContent = kind === 'cirrocumulus'
      ? 'Thin pieces let the light through: pure white, no shading at all. High cloud never has self-shadows.'
      : kind === 'altocumulus'
        ? 'Thicker pieces block some light: grey shading on their undersides. Altocumulus is usually shaded on part of each piece.'
        : 'Thick pieces block most of the light: dark grey bellies. Low, thick cloud such as stratocumulus has the darkest shading.';
    if (t.goal === 'shade' && depth >= 700) t.done();
  };
  f.controls.append(slider('Thickness', 50, 1400, 10, 100, (v) => `${v} m deep`, paint, 'ink').node);
  paint(100);
  return f.node;
});

// ---- The sun through thickening cloud ---------------------------------------

export const sunThroughFigure = figure(['cirrostratus', 'altostratus', 'nimbostratus'], (_ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H);
  const g = svg('g');
  f.svg.append(g);
  const paint = (thick: number) => {
    const stage = thick < 0.33 ? 'cirrostratus' : thick < 0.72 ? 'altostratus' : 'nimbostratus';
    const skyL = 80 - thick * 45;
    const sky = `hsl(250, ${18 - thick * 10}%, ${skyL}%)`;
    const sunOpacity = Math.max(0, 1 - thick * 1.25);
    const blur = thick * 14;
    const shadow = Math.max(0, 1 - thick * 3);
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: H, fill: sky }),
      svg('circle', { cx: 200, cy: 70, r: 14 + blur, fill: '#fff8e0', opacity: sunOpacity * (blur > 2 ? 0.6 : 1) }),
      svg('circle', { cx: 200, cy: 70, r: 14, fill: '#fffbe9', opacity: sunOpacity * (1 - thick) }),
      stage === 'cirrostratus' ? svg('circle', { cx: 200, cy: 70, r: 52, fill: 'none', stroke: '#fff', 'stroke-width': 4, opacity: 0.6 * (1 - thick * 2) }) : null,
      stage === 'nimbostratus' ? svg('g', { opacity: (thick - 0.72) * 3 }, ...Array.from({ length: 30 }, (_, i) => line(i * 14, 100 + (i % 3) * 10, i * 14 - 8, 196, COL.rain, 1.3))) : null,
      svg('rect', { x: 0, y: 196, width: W, height: 34, fill: '#4d5a3f' }),
      line(140, 196, 140, 150, '#3b2f28', 4),
      svg('polygon', { points: `140,198 ${140 + 60},${206} ${140 + 60},${202}`, fill: '#000', opacity: 0.45 * shadow }),
    );
    const words: Record<string, string> = {
      cirrostratus: 'Cirrostratus: a thin ice veil. The sun is sharp, posts still cast shadows, and there is often a halo.',
      altostratus: 'Altostratus: a thicker sheet of droplets and ice. The sun shows as if through frosted glass: no halo, no shadows.',
      nimbostratus: 'Nimbostratus: the sun is gone and rain or snow is falling steadily.',
    };
    f.readout.textContent = words[stage];
    if (t.goal === stage) t.done();
  };
  f.controls.append(slider('Thickness', 0, 1, 0.01, 0.1, (v) => (v < 0.33 ? 'thin' : v < 0.72 ? 'thick' : 'very thick'), paint, 'ink').node);
  paint(0.1);
  return f.node;
});
