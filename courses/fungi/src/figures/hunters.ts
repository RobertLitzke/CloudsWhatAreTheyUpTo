// Lesson 13, Fungi that hunt: the three kinds of nematode trap (a still),
// and the height at which an ant killed by Ophiocordyceps gives the fungus
// its best chance to fruit. Everything here is drawn; no photographs.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider, wrapped } from './kit';

const W = 400;

// ---- Traps (still) ---------------------------------------------------------------------------------

const worm = (d: string): SVGElement => svg('path', { d, stroke: '#d9a0a0', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' });

export const trapsStill = () => {
  const s = still(W, 190);
  const parts: SVGElement[] = [];
  const thread = (x1: number, y1: number, x2: number, y2: number) => parts.push(line(x1, y1, x2, y2, COL.hypha, 2.4));
  // Sticky net.
  thread(20, 130, 120, 130);
  for (const [x, y, r] of [[50, 104, 18], [84, 102, 16]] as const) parts.push(svg('circle', { cx: x, cy: y, r, fill: 'none', stroke: COL.hypha, 'stroke-width': 2.4 }));
  parts.push(svg('circle', { cx: 67, cy: 104, r: 34, fill: '#e5c86a', opacity: 0.18 }));
  parts.push(worm('M10,70 Q40,92 62,104 T120,96'));
  // Sticky knobs.
  thread(150, 130, 250, 130);
  for (const x of [170, 200, 230]) parts.push(line(x, 130, x, 112, COL.hypha, 2.4), svg('circle', { cx: x, cy: 106, r: 6, fill: COL.hypha }), svg('circle', { cx: x, cy: 106, r: 9, fill: '#e5c86a', opacity: 0.3 }));
  parts.push(worm('M150,90 Q185,102 200,100 T252,80'));
  // Constricting ring, before and after.
  thread(280, 130, 390, 130);
  parts.push(line(310, 130, 310, 116, COL.hypha, 2.4), svg('circle', { cx: 310, cy: 100, r: 14, fill: 'none', stroke: COL.hypha, 'stroke-width': 5 }));
  parts.push(line(360, 130, 360, 116, COL.hypha, 2.4), svg('circle', { cx: 360, cy: 100, r: 10, fill: 'none', stroke: COL.hypha, 'stroke-width': 9 }));
  parts.push(worm('M342,60 Q356,80 360,100 T372,148'));
  parts.push(small(310, 150, 'open', { anchor: 'middle', soft: true }), small(360, 160, 'shut', { anchor: 'middle', soft: true }));
  parts.push(
    label(70, 24, 'Sticky net', { anchor: 'middle', bold: true }),
    label(200, 24, 'Sticky knobs', { anchor: 'middle', bold: true }),
    label(335, 24, 'Tightening ring', { anchor: 'middle', bold: true }),
    ...wrapped(14, 172, 'Pink: a nematode, about a millimetre long. The ring’s three cells swell inward in a tenth of a second.', 70, { soft: true }, 11),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The ant's last climb ---------------------------------------------------------------------------

/** Air humidity (%) at a height in centimetres above an understorey forest floor. A model. */
export const humidity = (cm: number) => 95 - 0.08 * cm;

/** Chance (0 to 1) that a dead ant at this height is left alone long enough to grow a fruiting stalk. */
export const untouched = (cm: number) => 1 - Math.exp(-cm / 6);

/** Chance that the fungus grows its stalk and sheds spores from an ant at this height. */
export function fruiting(cm: number): number {
  const grow = Math.max(0, Math.min(1, (humidity(cm) - 85) / 9));
  return grow * untouched(cm);
}

export const antFigure = figure(['height'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let cm = 120;
  let sawLow = false;
  let sawHigh = false;
  let sawBest = false;
  const top = 20;
  const ground = 196;
  const Y = (h: number) => ground - (h / 150) * (ground - top);
  const paint = () => {
    const p = fruiting(cm);
    const bands: SVGElement[] = [];
    for (let h = 0; h < 150; h += 10) {
      const hum = humidity(h + 5);
      bands.push(svg('rect', { x: 20, y: Y(h + 10), width: 160, height: Y(h) - Y(h + 10) + 0.5, fill: COL.water, opacity: Math.max(0.04, (hum - 82) / 30) }));
    }
    const ay = Y(cm);
    redraw(g,
      ...bands,
      svg('rect', { x: 20, y: ground, width: 160, height: 12, fill: COL.soil }),
      line(100, ground, 100, top + 4, '#5f7a3a', 3),
      ...[30, 60, 90, 120].map((h) => svg('path', { d: `M100,${Y(h)} q30,-6 52,4 q-26,10 -52,-4`, fill: COL.leaf })),
      // The ant on the underside of a leaf at its height.
      svg('path', { d: `M100,${ay} q34,-4 56,4 q-28,8 -56,-4`, fill: COL.leaf, opacity: 0.85 }),
      svg('ellipse', { cx: 132, cy: ay + 6, rx: 9, ry: 3.4, fill: '#2b211c' }),
      svg('circle', { cx: 122, cy: ay + 5, r: 3, fill: '#2b211c' }),
      ...(p > 0.3 ? [line(134, ay + 6, 140, ay - 14, '#8a6a3a', 2), svg('ellipse', { cx: 140, cy: ay - 10, rx: 3, ry: 2, fill: '#8a6a3a' })] : []),
      small(186, ay + 4, `${cm} cm`, { bold: true }),
      small(20, 14, 'more blue = damper air', { fill: COL.water, bold: true }),
      // The chance bar.
      label(300, 40, 'Chance the fungus fruits', { anchor: 'middle', bold: true }),
      svg('rect', { x: 240, y: 52, width: 120, height: 14, fill: COL.grid, rx: 3 }),
      svg('rect', { x: 240, y: 52, width: 120 * p, height: 14, fill: COL.cap, rx: 3 }),
      small(366, 63, `${Math.round(p * 100)}%`, { bold: true }),
      small(240, 90, `Damp enough to grow: ${Math.round(100 * Math.max(0, Math.min(1, (humidity(cm) - 85) / 9)))}%`),
      small(240, 106, `Left alone by scavengers: ${Math.round(100 * untouched(cm))}%`),
      ...wrapped(240, 134, 'A model of the understorey of a tropical forest, built on the pattern Andersen and Hughes measured in Thailand.', 26, { soft: true }, 11),
    );
    if (!open()) return;
    if (cm <= 5) sawLow = true;
    if (cm >= 80) sawHigh = true;
    if (cm >= 15 && cm <= 35) sawBest = true;
    f.readout.textContent = cm <= 5
      ? 'On the forest floor it is damp, but other ants and scavengers find the body and carry it off before the fungus can fruit.'
      : cm >= 60
        ? 'Up here the air dries out between rains, and the fungus inside the ant dries and fails.'
        : p > 0.75
          ? 'Close to the best height: damp enough to grow, high enough to be left alone. This is where infected ants are found, biting the underside of leaves.'
          : 'In between. Move the ant to find where both chances are high.';
    if (sawLow && sawHigh && sawBest) t.done();
  };
  const hs = slider('Height of the leaf', 0, 150, 1, cm, (v) => `${v} cm`, (v) => { cm = v; paint(); }, 'cap');
  f.controls.append(hs.node);
  const open = guessFirst(t, f, {
    ask: 'An infected ant climbs a plant, bites a leaf and dies there, and the fungus grows out of it. Where does the fungus do best?',
    options: ['A little above the ground', 'On the forest floor', 'As high as possible'],
    answer: 0,
    sliders: [hs],
    after: () => paint(),
  });
  paint();
  return f.node;
});
