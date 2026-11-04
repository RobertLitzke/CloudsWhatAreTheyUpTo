// Lesson 15, The trunk with no tree: Prototaxites to scale beside a person and
// the land plants of its day (a still), and a board of clues that rule out,
// one by one, the things it has been taken for.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, toggles, wrapped } from './kit';

const W = 400;

// ---- To scale (still) ---------------------------------------------------------------------------------

export const scaleStill = () => {
  const s = still(W, 220);
  const ground = 200;
  const m = 21; // px per metre
  const parts: SVGElement[] = [
    line(10, ground, 390, ground, COL.ink, 1.5),
    svg('rect', { x: 10, y: ground, width: 380, height: 14, fill: COL.soil, opacity: 0.5 }),
  ];
  // Prototaxites: a tall smooth column, slightly tapering.
  parts.push(svg('path', { d: `M190,${ground} L194,${ground - 8 * m} Q208,${ground - 8.3 * m} 222,${ground - 8 * m} L226,${ground} Z`, fill: '#9b8a6e' }));
  for (let k = 1; k < 8; k++) parts.push(line(196, ground - k * m, 222, ground - k * m + 3, '#857558', 0.8));
  parts.push(small(234, ground - 8 * m + 8, 'Prototaxites: up to 8 m tall', { bold: true }), small(234, ground - 8 * m + 20, 'and a metre wide', { bold: true }));
  // A person.
  const px = 290;
  const h = 1.7 * m;
  parts.push(
    svg('circle', { cx: px, cy: ground - h + 4, r: 4, fill: COL.ink }),
    line(px, ground - h + 8, px, ground - h * 0.45, COL.ink, 2),
    line(px, ground - h * 0.45, px - 5, ground, COL.ink, 2),
    line(px, ground - h * 0.45, px + 5, ground, COL.ink, 2),
    line(px, ground - h * 0.8, px - 7, ground - h * 0.55, COL.ink, 2),
    line(px, ground - h * 0.8, px + 7, ground - h * 0.55, COL.ink, 2),
    small(px + 12, ground - h + 8, 'a person, for scale'),
  );
  // Early land plants: tiny forked stems.
  for (const x of [30, 46, 60, 74, 340, 356, 370, 384]) {
    parts.push(line(x, ground, x, ground - 0.3 * m, '#5f8f4a', 1.6), line(x, ground - 0.3 * m, x - 3, ground - 0.45 * m, '#5f8f4a', 1.2), line(x, ground - 0.3 * m, x + 3, ground - 0.45 * m, '#5f8f4a', 1.2));
  }
  parts.push(small(14, ground - 0.6 * m - 18, 'the tallest land'), small(14, ground - 0.6 * m - 6, 'plants: ankle-high'));
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The clue board -------------------------------------------------------------------------------------

export const IDEAS = ['A rotted conifer', 'A giant seaweed', 'A fungus', 'A lost lineage'] as const;

/** Each clue, and which of the ideas it rules out (by index). */
export const CLUES = [
  { name: 'Tubes, not wood', text: 'Built of tangled tubes of three widths, with no wood cells', rules: [0] },
  { name: 'Grew on land', text: 'Found standing in old river plains among the first land plants', rules: [1] },
  { name: 'Carbon varies', text: 'Its carbon’s make-up varies from trunk to trunk, as if each fed on different food', rules: [0, 1] },
  { name: 'No chitin traces', text: 'Its chemistry lacks the traces that fungal walls leave in fossils from the same rock', rules: [2] },
] as const;

/** Which ideas are still standing after the clues that are switched on. */
export function standing(on: readonly boolean[]): boolean[] {
  return IDEAS.map((_, i) => !CLUES.some((c, k) => on[k] && (c.rules as readonly number[]).includes(i)));
}

export const cluesFigure = figure(['clues'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let on = CLUES.map(() => false);
  const paint = () => {
    const ok = standing(on);
    const parts: SVGElement[] = [];
    IDEAS.forEach((name, i) => {
      const x = 14 + i * 96;
      const by = CLUES.findIndex((c, k) => on[k] && (c.rules as readonly number[]).includes(i));
      parts.push(
        svg('rect', { x, y: 18, width: 88, height: 64, rx: 6, fill: ok[i] ? COL.paper : '#efe7e2', stroke: ok[i] ? COL.good : COL.bad, 'stroke-width': ok[i] ? 2 : 1 }),
        ...wrapped(x + 8, 38, name, 13, { bold: true, fill: ok[i] ? COL.ink : COL.soft }, 13),
        small(x + 8, 74, ok[i] ? 'still possible' : `ruled out by clue ${by + 1}`, { fill: ok[i] ? COL.good : COL.bad, bold: true }),
      );
      if (!ok[i]) parts.push(line(x + 6, 24, x + 82, 76, COL.bad, 1.5, { opacity: 0.5 }));
    });
    CLUES.forEach((c, k) => {
      parts.push(small(18, 104 + k * 26, `${k + 1}.`, { bold: true, fill: on[k] ? COL.ink : COL.soft }), ...wrapped(34, 104 + k * 26, c.text, 66, { fill: on[k] ? COL.ink : COL.soft }, 11));
    });
    redraw(g, ...parts);
    const n = ok.filter(Boolean).length;
    f.readout.textContent = on.every((x) => !x)
      ? 'Four ideas Prototaxites has been taken for. Turn on the clues one at a time and see which survive.'
      : n === 1 && ok[3]
        ? 'Only the last idea survives every clue: something that is neither plant, seaweed nor fungus, a branch of life with no living members.'
        : n === 1
          ? 'One idea left standing, for now. Is there a clue still off?'
          : `${n} ideas still fit the clues that are on.`;
    if (on.every(Boolean)) t.done();
  };
  const tg = toggles(CLUES.map((c, k) => `${k + 1}. ${c.name}`), on, (v) => { on = v; paint(); });
  f.controls.append(tg.node);
  paint();
  return f.node;
});

