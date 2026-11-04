// Lesson 8, The gap in the coal: a block of wood under white rot or brown rot,
// and a model of how much wood ends up as coal, with and without fungi that
// can break lignin and with more or less swamp.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, slider, toggles, wrapped } from './kit';

const W = 400;

/** Wood as shares of its dry weight. */
export const WOOD = { cellulose: 0.45, hemicellulose: 0.25, lignin: 0.3 } as const;

/** What is left of each part of a block after `months` of white or brown rot (shares of the fresh block). */
export function rotted(kind: 'white' | 'brown', months: number): { cellulose: number; hemicellulose: number; lignin: number } {
  const k = Math.min(1, months / 24);
  return kind === 'white'
    ? { cellulose: WOOD.cellulose * (1 - 0.85 * k), hemicellulose: WOOD.hemicellulose * (1 - 0.9 * k), lignin: WOOD.lignin * (1 - 0.85 * k) }
    : { cellulose: WOOD.cellulose * (1 - 0.95 * k), hemicellulose: WOOD.hemicellulose * (1 - 0.95 * k), lignin: WOOD.lignin * (1 - 0.1 * k) };
}

export const rotsFigure = figure(['cubes'], (_ctx, t) => {
  const f = frame(W, 196, 3);
  const g = svg('g');
  f.svg.append(g);
  let kind: 'white' | 'brown' = 'white';
  let months = 0;
  const paint = () => {
    const r = rotted(kind, months);
    const k = months / 24;
    // The block: fresh wood fading to pale and stringy, or darkening and cracking into cubes.
    const fill = kind === 'white' ? `rgb(${Math.round(176 + 60 * k)}, ${Math.round(140 + 85 * k)}, ${Math.round(96 + 110 * k)})` : `rgb(${Math.round(176 - 70 * k)}, ${Math.round(140 - 80 * k)}, ${Math.round(96 - 60 * k)})`;
    const marks: SVGElement[] = [];
    if (kind === 'brown' && k > 0.3) {
      for (let x = 30; x < 170; x += 22 - 8 * k) marks.push(line(x, 40, x, 160, '#3a2618', 1 + k));
      for (let y = 52; y < 160; y += 22 - 8 * k) marks.push(line(20, y, 180, y, '#3a2618', 1 + k));
    } else {
      for (let y = 46; y < 160; y += 9) marks.push(line(22, y, 178, y + (y % 3), kind === 'white' && k > 0.4 ? '#fffaf0' : COL.lignin, 0.8, { opacity: 0.6 }));
    }
    const bar = (y: number, name: string, now: number, was: number, col: string) => [
      small(214, y, name, { bold: true }),
      svg('rect', { x: 214, y: y + 5, width: 170 * (was / 0.45), height: 11, fill: COL.grid, rx: 2 }),
      svg('rect', { x: 214, y: y + 5, width: 170 * (now / 0.45), height: 11, fill: col, rx: 2 }),
    ];
    redraw(g,
      svg('rect', { x: 20, y: 40, width: 160, height: 120, rx: 4, fill }),
      ...marks,
      label(100, 26, `${kind === 'white' ? 'White' : 'Brown'} rot, month ${months}`, { anchor: 'middle', bold: true }),
      ...bar(40, 'Cellulose', r.cellulose, WOOD.cellulose, COL.food),
      ...bar(78, 'Hemicellulose', r.hemicellulose, WOOD.hemicellulose, '#d9b26a'),
      ...bar(116, 'Lignin', r.lignin, WOOD.lignin, COL.lignin),
      ...wrapped(214, 160, 'Grey: what the fresh block had. A model of a typical hardwood block.', 34, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = months === 0
      ? 'A fresh block of wood: cellulose fibres, hemicellulose between them, and lignin gluing it all together.'
      : kind === 'white'
        ? 'White rot eats all three, lignin included. What is left is pale and stringy or spongy, bleached of the brown lignin.'
        : 'Brown rot takes the cellulose and hemicellulose and leaves the lignin, barely changed. The wood darkens, shrinks and cracks into brown cubes that crumble in the hand.';
    if (kind === 'brown' && months >= 18) t.done();
  };
  const which = pick(['White rot', 'Brown rot'], 0, (i) => { kind = i === 0 ? 'white' : 'brown'; paint(); });
  const ms = slider('Months', 0, 24, 1, months, (v) => `${v}`, (v) => { months = v; paint(); }, 'wood');
  f.controls.append(which.node, ms.node);
  const open = guessFirst(t, f, {
    ask: 'An old log has turned dark brown and breaks into small crumbly cubes. Which part of the wood is mostly left?',
    options: ['Lignin', 'Cellulose', 'Nothing: it is all soil now'],
    answer: 0,
    sliders: [ms],
    buttons: which.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- How much wood becomes coal ---------------------------------------------------------------------

/**
 * Of the wood a forest drops, the share that ends up buried as peat (and
 * later coal). Wood in a waterlogged swamp barely rots, for want of oxygen;
 * wood on dry ground rots, and with no fungus able to break lignin its lignin
 * is left behind to be buried.
 */
export function buried(swamp: number, whiteRot: boolean): number {
  const wet = swamp * 0.6;
  const dry = (1 - swamp) * (whiteRot ? 0.003 : WOOD.lignin * 0.25);
  return wet + dry;
}

export const coalFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, 180, 4);
  const g = svg('g');
  f.svg.append(g);
  let swamp = 0.05;
  let white = true;
  let sawFungi = false;
  let sawSwamp = false;
  const paint = () => {
    const b = buried(swamp, white);
    const ref = buried(0.05, true);
    const ratio = b / ref;
    const h = Math.min(120, 12 * ratio);
    redraw(g,
      // A landscape strip: swamp in blue-green, dry forest in green.
      svg('rect', { x: 20, y: 30, width: 200 * swamp, height: 26, fill: '#5f8f7a' }),
      svg('rect', { x: 20 + 200 * swamp, y: 30, width: 200 * (1 - swamp), height: 26, fill: '#7fa25a' }),
      small(20, 22, `swamp ${Math.round(swamp * 100)}%`, { fill: '#3f6f5a', bold: true }),
      small(220, 22, 'dry ground', { anchor: 'end', fill: '#4f7a2a', bold: true }),
      small(20, 72, white ? 'Fungi that break lignin: present' : 'Fungi that break lignin: none yet', { bold: true, fill: white ? COL.cap : COL.soft }),
      // The pile of buried carbon.
      svg('rect', { x: 290, y: 150 - h, width: 60, height: h, fill: COL.carbon }),
      line(270, 150, 380, 150, COL.ink, 1.5),
      small(320, 166, 'coal formed', { anchor: 'middle', bold: true }),
      small(320, 144 - h, `${ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}×`, { anchor: 'middle', bold: true }),
      ...wrapped(20, 100, '× compared with a world like today’s: a little swamp, and white rot everywhere.', 44, { soft: true }),
    );
    if (!white) sawFungi = true;
    if (white && swamp >= 0.3) sawSwamp = true;
    f.readout.textContent = !white && swamp < 0.15
      ? `With no fungus able to break lignin, the lignin of every log on dry ground is left to be buried, and coal forms ${ratio.toFixed(0)} times as fast even with little swamp. This is Floudas's idea.`
      : white && swamp >= 0.3
        ? `With white rot everywhere, dry-ground wood rots away; but where a third or more of the land is waterlogged swamp, wood is buried before it can rot, and coal still forms ${ratio.toFixed(0)} times as fast. This is Nelsen's answer.`
        : 'Change the swamp and the fungi to see two ways to get a lot of coal: wet ground that stops all rot, or a world where nothing could rot lignin.';
    if (sawFungi && sawSwamp) t.done();
  };
  const sw = slider('Swampy land', 0.02, 0.6, 0.01, swamp, (v) => `${Math.round(v * 100)}%`, (v) => { swamp = v; paint(); }, 'water');
  const wr = toggles(['White rot fungi exist'], [true], (v) => { white = v[0]; paint(); });
  f.controls.append(wr.node, sw.node);
  paint();
  return f.node;
});
