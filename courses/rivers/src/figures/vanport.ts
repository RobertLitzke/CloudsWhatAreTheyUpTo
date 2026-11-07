// C2, The town behind the embankment: Vanport in its bowl of embankments (a
// still plan and section), and a floodplain cross-section where levees closer
// together or taller raise the flood against them (live, guess first).

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still, type P } from 'didactics/draw';
import { COL, big, figure, frame, guessFirst, player, slider, tint, type FigureFactory } from './kit';

const W = 400;
const pts = (p: readonly P[]) => p.map((q) => q.join(',')).join(' ');

// ---- The bowl (still) -----------------------------------------------------------------------------------

export const bowlStill = () => {
  const s = still(W, 300);
  const parts: SVGElement[] = [];
  // Plan, north up. The Columbia along the top, the Slough along the bottom.
  parts.push(
    svg('rect', { x: 0, y: 0, width: W, height: 172, fill: tint(COL.land, 0.18) }),
    svg('path', { d: 'M0,10 C120,4 260,18 400,8 L400,42 C260,50 120,36 0,44 Z', fill: tint(COL.water, 0.6) }),
    label(200, 30, 'Columbia River', { anchor: 'middle', bold: true, fill: COL.salt }),
    arrow(330, 24, 290, 25, COL.flow, 1.4),
    svg('path', { d: 'M0,150 C100,142 200,158 400,146 L400,154 C200,166 100,150 0,158 Z', fill: tint(COL.water, 0.6) }),
    small(330, 168, 'Columbia Slough', { anchor: 'middle', fill: COL.salt }),
    // The flooded lowland west of the town, already water by late May.
    svg('path', { d: 'M0,60 L82,58 L76,140 L0,142 Z', fill: tint(COL.water, 0.35) }),
    small(38, 70, 'flooded', { anchor: 'middle', fill: COL.salt }),
    small(38, 81, 'lowland', { anchor: 'middle', fill: COL.salt }),
  );
  // The town: rows of apartment blocks in the bowl.
  for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
    parts.push(svg('rect', { x: 112 + c * 22, y: 62 + r * 12, width: 15, height: 6, fill: COL.land, opacity: 0.75 }));
  }
  parts.push(
    label(210, 130, 'Vanport', { anchor: 'middle', bold: true }),
    // The embankments: river dike to the north, road fill to the east, railway fill to the west.
    line(84, 52, 330, 52, COL.works, 5),
    small(207, 49 - 1, 'river dike', { anchor: 'middle', fill: COL.works }),
    line(330, 52, 330, 140, COL.works, 5),
    small(338, 98, 'road fill', { fill: COL.works }),
    line(92, 52, 86, 140, COL.works, 5),
    small(6, 126, 'railway', { fill: COL.works, bold: true }),
    small(6, 137, 'embankment', { fill: COL.works, bold: true }),
    line(86, 140, 330, 140, COL.works, 3),
    // The break.
    svg('path', { d: 'M82,100 l12,8 M94,100 l-12,8', stroke: COL.bad, 'stroke-width': 2.4 }),
    small(78, 100, 'broke, 4.17 pm', { anchor: 'end', fill: COL.bad, bold: true }),
    arrow(60, 110, 106, 108, COL.flow, 1.6),
    // North arrow.
    line(380, 120, 380, 96, COL.ink, 1), small(380, 92, 'N', { anchor: 'middle', bold: true }),
    small(200, 186, 'Plan, not to scale: a town on low ground with an embankment on every side.', { anchor: 'middle', soft: true }),
  );
  // Section through the town on 30 May 1948, north to the right.
  const gy = 262; // the town's streets
  parts.push(
    label(8, 206, 'Section, south to north', { bold: true }),
    svg('rect', { x: 0, y: gy, width: W, height: 300 - gy, fill: tint(COL.land, 0.45) }),
    svg('polygon', { points: pts([[248, gy], [268, 214], [282, 214], [302, gy]]), fill: COL.works }),
    small(275, 208, 'dike', { anchor: 'middle', fill: COL.works }),
    svg('polygon', { points: pts([[288, 226], [W, 226], [W, gy + 18], [302, gy + 18], [302, gy]]), fill: tint(COL.water, 0.6) }),
    line(288, 226, W, 226, COL.water, 1.6),
    small(354, 240, 'river in flood', { anchor: 'middle', fill: COL.salt }),
  );
  parts.push(line(30, 226, 288, 226, COL.water, 1, { 'stroke-dasharray': '4 3' }), small(34, 222, 'the river\'s level in flood', { fill: COL.salt }));
  for (let c = 0; c < 4; c++) {
    const x = 40 + c * 34;
    parts.push(svg('rect', { x, y: gy - 16, width: 24, height: 16, fill: COL.paper, stroke: COL.ink, 'stroke-width': 0.8 }), svg('polygon', { points: pts([[x - 2, gy - 16], [x + 12, gy - 24], [x + 26, gy - 16]]), fill: COL.land }));
  }
  parts.push(
    line(238, 226, 238, gy, COL.flow, 1),
    line(234, 226, 242, 226, COL.flow, 1), line(234, gy, 242, gy, COL.flow, 1),
    small(232, 246, 'river above', { anchor: 'end', fill: COL.flow }),
    small(232, 256, 'the streets', { anchor: 'end', fill: COL.flow }),
    small(128, 286, 'apartment blocks, two storeys', { anchor: 'middle', soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- What a levee does to the flood (live) -------------------------------------------------------------

/** The model river: a main channel and its floodplain, with Manning's rule for how fast water runs. */
export const CHANNEL = {
  /** Width of the main channel, m. */
  width: 1000,
  /** Depth of the channel below the floodplain, m. */
  depth: 10,
  /** Roughness of the channel and of the floodplain (Manning's n). */
  nChannel: 0.03,
  nPlain: 0.05,
  /** The water surface's slope. */
  slope: 2e-5,
  /** How far the floodplain runs on each side with no levees, m. */
  open: 4000,
};

/**
 * The discharge (m³/s) the channel carries with its surface `stage` metres
 * above the floodplain, when the floodplain is `plain` metres wide on each
 * side of the channel. Manning: Q = A R^(2/3) √S / n, the channel and each
 * floodplain strip counted apart (a wide strip's R is its depth).
 */
export function carries(stage: number, plain: number): number {
  const c = CHANNEL;
  const s = Math.sqrt(c.slope);
  const d = Math.max(0, c.depth + stage);
  const channel = (c.width * d ** (5 / 3) * s) / c.nChannel;
  const h = Math.max(0, stage);
  const strips = (2 * plain * h ** (5 / 3) * s) / c.nPlain;
  return channel + strips;
}

/** The stage (m above the floodplain) at which `q` m³/s flows with `plain` metres of floodplain each side. */
export function stageFor(q: number, plain: number): number {
  let lo = -CHANNEL.depth;
  let hi = 40;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (carries(mid, plain) < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The flood against levees `spacing` m back from each bank and `height` m tall (0: no levees). */
export function leveeFlood(q: number, spacing: number, height: number): { stage: number; open: number; overtopped: boolean } {
  const open = stageFor(q, CHANNEL.open);
  if (height <= 0) return { stage: open, open, overtopped: false };
  const held = stageFor(q, spacing);
  if (held <= height) return { stage: held, open, overtopped: false };
  // Over the top: the water spills behind the levees and spreads, but it cannot fall below the crest while it pours.
  return { stage: Math.max(height, open), open, overtopped: true };
}

/** The town's streets, metres below the floodplain: Vanport stood on low ground. */
export const TOWN = -2;
/** Peak flow of the 1948 flood and of the 1894 flood, m³/s (rounded). */
export const FLOOD_1948 = 28600;
export const FLOOD_1894 = 35000;

export const leveeFigure = figure(['squeeze'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let q = 8000;
  let spacing = 2000;
  let height = 10;
  let narrow = false;
  let wide = false;
  // Drawing: x across the valley (metres, 0 at the channel's middle), y height (metres).
  const half = 5200;
  const X = (m: number) => 200 + (m / half) * 196;
  const Y = (m: number) => 150 - m * 7;
  const paint = () => {
    const fl = leveeFlood(q, spacing, height);
    const c = CHANNEL;
    const bank = c.width / 2;
    const parts: SVGElement[] = [];
    // Ground: the floodplain at 0, the channel cut 10 m into it, the town's low ground behind the left levee.
    const lx = bank + spacing;
    const ground: P[] = [
      [X(-half), Y(TOWN)], [X(-lx - 300), Y(TOWN)], [X(-lx - 120), Y(0)], [X(-bank), Y(0)], [X(-bank + 120), Y(-c.depth)],
      [X(bank - 120), Y(-c.depth)], [X(bank), Y(0)], [X(half), Y(0)], [X(half), 214], [X(-half), 214],
    ];
    const level = fl.stage;
    // Water: inside the levees up to the stage; behind them too if overtopped (or everywhere with no levees).
    const wetFrom = height <= 0 || fl.overtopped ? -half : -lx;
    const wetTo = height <= 0 || fl.overtopped ? half : lx;
    parts.push(
      svg('rect', { x: X(wetFrom), y: Y(level), width: X(wetTo) - X(wetFrom), height: Math.max(0, 214 - Y(level)), fill: tint(COL.water, 0.55) }),
      svg('polygon', { points: pts(ground), fill: tint(COL.land, 0.9) }),
      line(X(wetFrom), Y(level), X(wetTo), Y(level), COL.water, 1.6),
    );
    // Houses behind the left levee.
    for (let i = 0; i < 4; i++) {
      const x = X(-half + 260 + i * 210);
      parts.push(svg('rect', { x, y: Y(TOWN) - 12, width: 9, height: 12, fill: COL.paper, stroke: COL.ink, 'stroke-width': 0.7 }));
    }
    parts.push(small(X(-half + 120), Y(TOWN) + 14, 'town', { soft: true }));
    // Levees.
    if (height > 0) {
      for (const side of [-1, 1]) {
        const x = side * lx;
        parts.push(svg('polygon', { points: pts([[X(x) - 9, Y(0)], [X(x) - 3, Y(height)], [X(x) + 3, Y(height)], [X(x) + 9, Y(0)]]), fill: COL.works }));
      }
    }
    // The open-floodplain stage for comparison: a dashed line.
    parts.push(
      line(X(-half), Y(fl.open), X(half), Y(fl.open), COL.water, 1, { 'stroke-dasharray': '4 3' }),
      small(X(half) - 2, Y(fl.open) - 3, 'no levees', { anchor: 'end', fill: COL.water }),
      // Scale bar for height.
      line(10, Y(0), 10, Y(10), COL.soft, 1), line(6, Y(0), 14, Y(0), COL.soft, 1), line(6, Y(10), 14, Y(10), COL.soft, 1),
      small(16, Y(5) + 3, '10 m', { soft: true }),
      label(390, 16, `${big(q)} m³/s`, { anchor: 'end', bold: true }),
      small(390, 28, q >= FLOOD_1894 - 500 ? 'about the 1894 flood' : q >= FLOOD_1948 - 500 ? 'about the 1948 flood' : '', { anchor: 'end', soft: true }),
    );
    if (fl.overtopped) parts.push(small(X(-lx), Y(height) - 6, 'over the top', { anchor: 'middle', fill: COL.bad, bold: true }));
    redraw(g, ...parts);
    if (!open()) return;
    const above = level - TOWN;
    f.readout.textContent = height <= 0
      ? `No levees: the flood spreads over the whole floodplain, ${level > 0 ? `${level.toFixed(1)} m deep there and ${above.toFixed(1)} m deep in the town` : 'but stays inside the channel'}.`
      : fl.overtopped
        ? `The river would need to stand ${stageFor(q, spacing).toFixed(1)} m up to pass between these levees: it pours over the ${height} m crests and the town floods ${above.toFixed(1)} m deep.`
        : `The river stands ${Math.max(0, level).toFixed(1)} m up the levees, ${above.toFixed(1)} m above the town's streets, with ${(height - Math.max(0, level)).toFixed(1)} m to spare. With no levees it would stand ${Math.max(0, fl.open).toFixed(1)} m.`;
    if (q >= FLOOD_1948 - 1000 && height > 0) {
      if (spacing <= 300) narrow = true;
      if (spacing >= 2000) wide = true;
    }
    if (narrow && wide) t.done();
  };
  const flow = slider('Flow', 4000, 36000, 200, q, (v) => `${big(v)}`, (v) => { q = v; paint(); }, 'water');
  const play = player(flow, ctx, { seconds: 10 });
  const gap = slider('Levees back from the bank', 100, 3000, 100, spacing, (v) => `${big(v)} m`, (v) => { spacing = v; paint(); }, 'works');
  const tall = slider('Levee height', 0, 16, 1, height, (v) => (v === 0 ? 'none' : `${v} m`), (v) => { height = v; paint(); }, 'works');
  f.controls.append(play.node, flow.node, gap.node, tall.node);
  const open = guessFirst(t, f, {
    ask: 'Two towns build levees against the same flood: one sets them 2 km back from the river, the other right beside the bank. Where does the flood stand higher against the levees?',
    options: ['Beside the bank', 'Set back 2 km', 'The same: the flood is the same size'],
    answer: 0,
    sliders: [flow, gap, tall],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'vanport-bowl': bowlStill,
  'vanport-levee': leveeFigure,
};
