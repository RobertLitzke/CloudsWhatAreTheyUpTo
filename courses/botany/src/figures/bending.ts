// Lesson 13, The bending seedling: the Darwins' canary grass under one lamp,
// with caps, collars, cut tips, mica slips and Went's agar block; and a pot
// laid on its side, its shoot turning up and its root down.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, player, slider, toggles, wrapped } from './kit';

const W = 400;

export type Treatment = 'none' | 'cap' | 'collar' | 'cut' | 'micaShade' | 'micaLit' | 'agar';

export const TREATMENTS: { id: Treatment; name: string }[] = [
  { id: 'none', name: 'Nothing' },
  { id: 'cap', name: 'Cap on the tip' },
  { id: 'collar', name: 'Collar below the tip' },
  { id: 'cut', name: 'Tip cut off' },
  { id: 'micaShade', name: 'Mica, shaded side' },
  { id: 'micaLit', name: 'Mica, lit side' },
  { id: 'agar', name: 'Tip on agar, put back' },
];

/**
 * How far a seedling lit from one side bends toward the lamp after a few
 * hours (degrees), and how much auxin reaches its shaded and lit sides
 * below the tip (1 = an unlit seedling's share for that side).
 */
export function bend(t: Treatment): { angle: number; shaded: number; lit: number } {
  switch (t) {
    case 'none':
    case 'collar':
      // The tip sees the light and sends auxin down the shaded side.
      return { angle: 40, shaded: 1.4, lit: 0.6 };
    case 'agar':
      // Auxin passes through the agar, and the tip still sees the light.
      return { angle: 32, shaded: 1.3, lit: 0.6 };
    case 'cap':
      // The tip is dark, so auxin comes down evenly: straight up.
      return { angle: 0, shaded: 1, lit: 1 };
    case 'cut':
      // No tip, no auxin: hardly any growth, no bending.
      return { angle: 0, shaded: 0.1, lit: 0.1 };
    case 'micaShade':
      // Mica blocks the shaded side's path down: no bend.
      return { angle: 0, shaded: 0.15, lit: 0.6 };
    case 'micaLit':
      // Mica on the lit side blocks nothing that matters.
      return { angle: 38, shaded: 1.4, lit: 0.15 };
  }
}

/** The centre line of a seedling standing at (x, y), bent toward +x by `angle` over its upper half. */
function stalk(x: number, y: number, h: number, angle: number): [number, number][] {
  const pts: [number, number][] = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const a = s < 0.4 ? 0 : (((s - 0.4) / 0.6) * angle * Math.PI) / 180;
    if (i === 0) pts.push([x, y]);
    else {
      const [px, py] = pts[i - 1];
      pts.push([px + Math.sin(a) * (h / n), py - Math.cos(a) * (h / n)]);
    }
  }
  return pts;
}

export const darwinFigure = figure(['all'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let which: Treatment = 'cap';
  const tried = new Set<Treatment>();
  const paint = () => {
    const shown = open();
    const r = shown ? bend(which) : { angle: 0, shaded: 1, lit: 1 };
    const x = 130;
    const ground = 196;
    const h = which === 'cut' ? 90 : 120;
    const pts = stalk(x, ground, h, r.angle);
    const top = pts[pts.length - 1];
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const at = (s: number) => pts[Math.round(s * (pts.length - 1))];
    const auxinDots: SVGElement[] = [];
    for (let k = 0; k < 6; k++) {
      const p = at(0.45 + k * 0.08);
      auxinDots.push(svg('circle', { cx: p[0] - 5, cy: p[1], r: 1.6 + 1.6 * r.shaded, fill: COL.hormone, opacity: Math.min(1, 0.2 + r.shaded * 0.6) }));
      auxinDots.push(svg('circle', { cx: p[0] + 5, cy: p[1], r: 1.6 + 1.6 * r.lit, fill: COL.hormone, opacity: Math.min(1, 0.2 + r.lit * 0.6) }));
    }
    const mica = which === 'micaShade' || which === 'micaLit';
    const micaAt = at(0.82);
    redraw(g,
      svg('rect', { x: 0, y: ground, width: 260, height: 34, fill: COL.soil, opacity: 0.35 }),
      // The lamp, to the right.
      svg('circle', { cx: 240, cy: 70, r: 16, fill: COL.light }),
      ...[0, 1, 2].map((k) => line(220, 60 + k * 10, 196, 56 + k * 14, COL.light, 2)),
      small(240, 100, 'lamp', { anchor: 'middle', soft: true }),
      small(20, 40, 'shaded side', { soft: true }),
      svg('path', { d, stroke: '#cfe0a6', 'stroke-width': 14, fill: 'none', 'stroke-linecap': 'round' }),
      svg('path', { d, stroke: '#9fbf6a', 'stroke-width': 1, fill: 'none' }),
      ...auxinDots,
      which === 'cap' ? svg('rect', { x: top[0] - 9, y: top[1] - 6, width: 18, height: 16, rx: 6, fill: COL.ink }) : null,
      which === 'collar' ? svg('rect', { x: at(0.62)[0] - 10, y: at(0.82)[1], width: 20, height: at(0.62)[1] - at(0.82)[1], fill: COL.ink, opacity: 0.85 }) : null,
      which === 'cut' ? small(top[0] + 12, top[1] + 4, 'cut', { fill: COL.bad }) : null,
      which === 'agar' ? svg('rect', { x: at(0.86)[0] - 9, y: at(0.86)[1] - 3, width: 18, height: 6, fill: '#e9e3b8', stroke: COL.soft }) : null,
      mica ? line(micaAt[0] + (which === 'micaShade' ? -6 : 1), micaAt[1] - 18, micaAt[0] + (which === 'micaShade' ? -1 : 6), micaAt[1] + 6, COL.blue, 3) : null,
      label(270, 140, TREATMENTS.find((x) => x.id === which)!.name, { bold: true }),
      small(270, 158, shown ? `bends ${r.angle}° toward the lamp` : 'before', { fill: r.angle > 0 ? COL.leaf : COL.soft }),
      ...wrapped(270, 182, 'Pink: auxin coming down from the tip. A model.', 22, { soft: true }),
    );
    if (!shown) return;
    tried.add(which);
    const says: Record<Treatment, string> = {
      none: 'Left alone, the seedling bends toward the lamp, and the bend is well below the tip.',
      cap: 'With only the tip covered, it grows straight up. The tip is where the light is seen.',
      collar: 'Everything but the tip covered, and it still bends, below the collar. Something travels down from the tip.',
      cut: 'With the tip cut off it hardly grows and doesn’t bend. Whatever comes from the tip makes it grow.',
      micaShade: 'A slip of mica on the shaded side stops the bend. The signal has to come down the shaded side.',
      micaLit: 'Mica on the lit side makes no difference. Nothing needed comes down that side.',
      agar: 'A cut tip set back on a slice of jelly still makes the stump bend: the signal is a chemical that soaks through.',
    };
    f.readout.textContent = says[which];
    if (tried.size >= 5) t.done();
  };
  const choose = pick(TREATMENTS.map((x) => x.name), 1, (i) => { which = TREATMENTS[i].id; paint(); });
  f.controls.append(choose.node);
  const open = guessFirst(t, f, {
    ask: 'The Darwins put a tiny cap over just the tip of a canary grass seedling and lit it from one side. Does it bend toward the lamp?',
    options: ['Yes, as usual', 'No, it grows straight', 'It bends away'],
    answer: 1,
    reveal: 'lock',
    sliders: [],
    buttons: choose.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A pot on its side ---------------------------------------------------------------------------------

/** Degrees the shoot has turned up and the root down, `hours` after the pot is laid on its side. */
export function sideways(hours: number, capOff: boolean): { shoot: number; root: number } {
  const turn = (rate: number) => Math.min(90, 90 * (1 - Math.exp(-hours / rate)));
  return { shoot: turn(5), root: capOff ? 0 : turn(4) };
}

export const gravityFigure = figure(['down'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let hours = 0;
  let capOff = false;
  const paint = () => {
    const s = sideways(hours, capOff);
    const cx = 150;
    const cy = 110;
    // The shoot leaves the seed to the right and turns up; the root leaves to the left and turns down.
    const shoot: [number, number][] = [[cx, cy]];
    const root: [number, number][] = [[cx, cy]];
    const n = 16;
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const a = (k > 0.35 ? ((k - 0.35) / 0.65) : 0) * s.shoot * (Math.PI / 180);
      const [px, py] = shoot[i - 1];
      shoot.push([px + Math.cos(a) * 7, py - Math.sin(a) * 7]);
      const b = (k > 0.6 ? ((k - 0.6) / 0.4) : 0) * s.root * (Math.PI / 180);
      const [qx, qy] = root[i - 1];
      root.push([qx - Math.cos(b) * 5.5, qy + Math.sin(b) * 5.5]);
    }
    const path = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const lower = (pts: [number, number][], from: number) => pts.slice(Math.round(from * n)).map((p) => svg('circle', { cx: p[0], cy: p[1] + 4, r: 2.4, fill: COL.hormone }));
    const tip = root[root.length - 1];
    redraw(g,
      svg('rect', { x: 20, y: 30, width: 260, height: 170, rx: 10, fill: COL.soil, opacity: 0.18 }),
      small(28, 46, 'pot laid on its side', { soft: true }),
      svg('path', { d: path(shoot), stroke: COL.leaf, 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }),
      svg('path', { d: path(root), stroke: '#d9c49a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }),
      svg('ellipse', { cx, cy, rx: 10, ry: 7, fill: '#c9a36a' }),
      ...lower(shoot, 0.35),
      ...lower(root, 0.6),
      capOff ? null : svg('circle', { cx: tip[0], cy: tip[1], r: 3, fill: '#a07d4a' }),
      small(shoot[n][0] + 6, shoot[n][1], 'shoot', { soft: true }),
      small(tip[0] - 6, tip[1] + 14, capOff ? 'root, cap cut off' : 'root', { anchor: 'end', soft: true }),
      label(300, 50, `${hours} hours`, { bold: true }),
      small(300, 74, `shoot up ${Math.round(s.shoot)}°`, { fill: COL.leaf }),
      small(300, 90, `root down ${Math.round(s.root)}°`, { fill: '#a07d4a' }),
      ...wrapped(300, 120, 'Pink: auxin, which collects on the lower side of both. A model.', 18, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = hours === 0
      ? 'A seedling laid flat. Press Play.'
      : capOff
        ? 'With its cap cut off, the root grows on sideways: the cap is where gravity is felt. The shoot still turns up.'
        : 'Auxin collects on the lower side of both. In the shoot it makes those cells stretch more, so the shoot curls up. In the root the same extra auxin slows stretching, so the root curls down.';
    if (!capOff && hours >= 12) t.done();
  };
  const hs = slider('Hours', 0, 20, 1, 0, (v) => `${v}`, (v) => { hours = v; paint(); }, 'hormone');
  const play = player(hs, ctx, { seconds: 6 });
  const cap = toggles(['Cut off the root cap'], [false], (on) => { capOff = on[0]; hs.set(0); });
  f.controls.append(play.node, hs.node, cap.node);
  const open = guessFirst(t, f, {
    ask: 'Lay a seedling on its side, and auxin collects on the lower side of its shoot and its root. The shoot curls up. Which way does the root go?',
    options: ['Down', 'Up, like the shoot', 'Straight on'],
    answer: 0,
    reveal: 'lock',
    sliders: [hs],
    buttons: cap.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
