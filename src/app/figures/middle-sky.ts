// Figures for the middle sky: the sun through ever thicker cloud, the hand
// trick, self-shadows, and stills of warm air gliding up over cold and a
// cloud layer turning over.

import { angularSize, layerBySize } from '../../core/sky';
import { genus } from '../../core/clouds';
import { svg } from 'lesson-kit/dom';
import { realClouds } from '../clouds/real';
import { DAY, GREY, STORM } from '../clouds/tones';
import { arrow, heading, line, small, still, wavy } from './draw';
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
  // A hand held up at arm's length, palm out, drawn at its true angular size:
  // three fingers about 5°, the thumb about 2°, the little-finger nail about 1°.
  const skin = '#e8bfa2';
  const crease = '#c18d70';
  const finger = (x: number, w: number, tip: number) => svg('rect', { x, y: tip, width: w, height: 190 - tip, rx: w / 2, fill: skin, stroke: crease, 'stroke-width': 1 });
  const fw = (5 / 3) * PX_PER_DEG; // one of three fingers
  const lw = 1.3 * PX_PER_DEG; // the little finger
  const x0 = 292;
  const tips = [100, 90, 98];
  const littleTip = 116;
  const littleX = x0 + 3 * fw;
  const bracket = (xa: number, xb: number, y: number) => svg('path', { d: `M${xa},${y + 4} V${y} H${xb} V${y + 4}`, fill: 'none', stroke: COL.ink, 'stroke-width': 1.2 });
  hand.append(
    // The thumb, sticking out to the side.
    svg('rect', { x: x0 - PX_PER_DEG, y: 146, width: 2 * PX_PER_DEG, height: 84, rx: PX_PER_DEG, fill: skin, stroke: crease, 'stroke-width': 1, transform: `rotate(-32 ${x0} 230)` }),
    ...tips.map((tip, i) => finger(x0 + i * fw, fw, tip)),
    finger(littleX, lw, littleTip),
    svg('rect', { x: x0 - 4, y: 168, width: 3 * fw + lw + 8, height: 100, rx: 16, fill: skin }),
    ...[1, 2, 3].map((i) => line(x0 + i * fw, 160, x0 + i * fw, 172, crease, 1)),
    svg('rect', { x: littleX + (lw - PX_PER_DEG) / 2, y: littleTip + 2, width: PX_PER_DEG, height: 9, rx: 3, fill: '#f6ddcd', stroke: crease, 'stroke-width': 0.8 }),
    bracket(x0, x0 + 3 * fw, 190),
    small(x0 + 1.5 * fw, 204, 'three fingers', { anchor: 'middle' }),
    small(x0 + 1.5 * fw, 216, '≈ 5°', { anchor: 'middle' }),
    small(x0 - 44, 176, 'thumb ≈ 2°', { anchor: 'end', halo: '#fff' }),
    small(littleX + lw + 4, littleTip + 8, 'nail ≈ 1°', { halo: '#fff' }),
  );
  // Seen from below, with the sun high above the layer: light comes down
  // through each piece, so the thin rims glow and the thick middles go grey.
  const clouds = realClouds({ width: W, height: H, sun: [W * 0.6, -300, -80], tones: DAY });
  sky.append(clouds.node);
  const paint = () => {
    // Looking up high in the sky (about 60° up), so the distance is a little more than the height.
    const deg = angularSize(pieceM, layerM / Math.sin((60 * Math.PI) / 180));
    const px = deg * PX_PER_DEG;
    const kind = layerBySize(deg);
    seen.add(kind);
    // High pieces are thin enough to glow; low ones are thick, with grey bellies.
    const look = kind === 'cirrocumulus' ? { density: 0.45, tones: DAY } : kind === 'altocumulus' ? { density: 1, tones: DAY } : { density: 1.6, tones: GREY };
    clouds.draw([{ kind: 'cells', x0: -10, x1: W + 10, top: 4, bottom: 140, size: Math.max(px * 1.5, 6), r: Math.max(px / 2, 1.2), flat: 0.75, density: look.density, seed: 3 }], { tones: look.tones });
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
  // The sun is above and a little behind the pieces, as when you look up at them.
  const clouds = realClouds({ width: W, height: H, sun: [W / 2, -400, 160], tones: DAY });
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#86b8d8' }), clouds.node);
  const paint = (depth: number) => {
    // Thin pieces let the light through; thick ones block it and their undersides go grey.
    const r = 18 + depth / 60;
    const puffs = [0, 1, 2, 3, 4].map((i) => ({ x: 44 + i * 78, y: 80, z: 0, r, flat: 0.7 }));
    clouds.draw([{ kind: 'layer', x0: 20, x1: 380, top: 60, bottom: 100, puffs, density: 0.08 + depth / 550 }], { tones: depth > 900 ? GREY : DAY });
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

export const sunThroughDiagram: FigureFactory = () => {
  const d = still(400, 222);
  const pw = 400 / 3;
  const ground = 150;
  const stages: [string, number, string, string][] = [
    ['Cirrostratus', 0.1, 'sharp sun, a halo,', 'shadows on the ground'],
    ['Altostratus', 0.5, 'sun as if through frosted', 'glass: no halo, no shadows'],
    ['Nimbostratus', 0.9, 'sun gone; steady', 'rain or snow'],
  ];
  // Each sky is one sheet of cloud, thicker from left to right, drawn over the
  // sun: the sheet itself decides how much of the sun gets through.
  const tones = (thick: number) => (thick > 0.8 ? STORM : thick > 0.4 ? GREY : DAY);
  const panel = ([name, thick, a, b]: [string, number, string, string], i: number): SVGElement[] => {
    const ox = i * pw;
    const cx = ox + pw / 2;
    const shadow = Math.max(0, 1 - thick * 3);
    const sheet = realClouds({ width: pw, height: ground, sun: [pw / 2, -100, 300], tones: tones(thick) }, [{
      kind: 'sheet', x0: -40, x1: pw + 40, top: -30, bottom: ground + 10, density: 0.15 + thick * 2.4, detail: 14,
    }]);
    return [
      svg('rect', { x: ox, y: 0, width: pw, height: ground, fill: '#7fb4d6' }),
      // Under nimbostratus the sun is gone altogether.
      thick < 0.8 ? svg('circle', { cx, cy: 54, r: 26, fill: '#fff8e0', opacity: 0.35 }) : null,
      thick < 0.8 ? svg('circle', { cx, cy: 54, r: 12, fill: '#fffbe9' }) : null,
      thick < 0.33 ? svg('circle', { cx, cy: 54, r: 40, fill: 'none', stroke: '#fff', 'stroke-width': 3.5, opacity: 0.6 * (1 - thick * 2) }) : null,
      svg('g', { transform: `translate(${ox} 0)` }, sheet.node),
      // Through altostratus the sun is a smudge of light in the sheet, as through frosted glass.
      thick > 0.33 && thick < 0.8 ? svg('circle', { cx, cy: 54, r: 18, fill: '#fffbe9', opacity: 0.35 }) : null,
      thick > 0.72 ? svg('g', { opacity: Math.min(1, (thick - 0.72) * 5) }, ...Array.from({ length: 10 }, (_, k) => line(ox + 6 + k * 14, 84 + (k % 3) * 8, ox + k * 14, ground, COL.rain, 1.3))) : null,
      svg('rect', { x: ox, y: ground, width: pw, height: 16, fill: '#4d5a3f' }),
      line(cx - 20, ground, cx - 20, ground - 34, '#3b2f28', 3.5),
      svg('polygon', { points: `${cx - 20},${ground + 2} ${cx + 22},${ground + 9} ${cx + 22},${ground + 5}`, fill: '#000', opacity: 0.45 * shadow }),
      heading(cx, 184, name),
      small(cx, 198, a, { anchor: 'middle' }),
      small(cx, 210, b, { anchor: 'middle' }),
    ].filter(Boolean) as SVGElement[];
  };
  d.svg.append(...stages.flatMap(panel), ...[1, 2].map((i) => line(i * pw, 0, i * pw, ground + 16, '#fff', 2)));
  return { node: d.node };
};
