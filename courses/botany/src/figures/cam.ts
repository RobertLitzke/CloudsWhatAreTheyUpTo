// Lesson 8, Sour in the morning: three ways of photosynthesising through a
// hot day, and the wreath of cells in a C4 leaf.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, player, slider, toggles, wrapped } from './kit';

const W = 400;

export const KINDS = ['C3', 'C4', 'CAM'] as const;
export type Kind = (typeof KINDS)[number];

const sun = (h: number) => Math.max(0, Math.sin((Math.PI * (h - 6)) / 12));
/** How hot and dry the air is through the day: worst in mid-afternoon. */
const heat = (h: number) => 0.25 + 0.75 * Math.max(0, Math.sin((Math.PI * (h - 7)) / 15));

/** Whether a plant's pores are open in a given hour, and how wide (0 to 1). */
export function pores(kind: Kind, h: number): number {
  if (kind === 'CAM') return h < 6 || h >= 20 ? 0.5 : 0;
  const l = sun(h);
  return kind === 'C3' ? l * (1 - 0.45 * heat(h)) : 0.55 * l * (1 - 0.45 * heat(h));
}

/** Water lost and sugar made in each hour of a hot day, with or without rubisco's mistake with oxygen. */
export function hour(kind: Kind, h: number, mistake = true): { water: number; sugar: number } {
  const p = pores(kind, h);
  // Water lost grows with how open the pores are and how hot and dry the air is; nights are cool and damp.
  const water = p * (kind === 'CAM' ? 0.12 : 0.4 + 1.6 * heat(h));
  let sugar: number;
  if (kind === 'C3') sugar = p * 1.75 * sun(h) * (mistake ? 1 - (0.15 + 0.3 * heat(h)) : 1);
  else if (kind === 'C4') sugar = sun(h) * 0.82;
  // CAM: acid stored at night, turned into sugar by day behind shut pores.
  else sugar = sun(h) * 0.25;
  return { water, sugar };
}

/** Totals from midnight to `upto` hours. */
export function day(kind: Kind, upto = 24, mistake = true) {
  let water = 0;
  let sugar = 0;
  for (let h = 0; h < upto; h += 0.25) {
    const r = hour(kind, h, mistake);
    water += r.water * 0.25;
    sugar += r.sugar * 0.25;
  }
  return { water, sugar, perWater: water > 0 ? sugar / water : 0 };
}

export const pathwaysFigure = figure(['mistake'], (ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let upto = 0;
  let mistake = true;
  const paint = () => {
    const shown = open();
    const colX = [40, 160, 280];
    const parts: (SVGElement | null)[] = [];
    // A strip of the day for each plant, shaded where its pores are open.
    KINDS.forEach((k, i) => {
      const x = colX[i];
      const tot = day(k, upto, mistake);
      parts.push(label(x + 40, 20, k === 'C3' ? 'C3: wheat' : k === 'C4' ? 'C4: corn' : 'CAM: cactus', { anchor: 'middle', bold: true }));
      for (let h = 0; h < 24; h++) {
        const p = pores(k, h + 0.5);
        parts.push(svg('rect', { x: x + (h / 24) * 80, y: 30, width: 80 / 24 + 0.3, height: 12, fill: p > 0.02 ? COL.leaf : h >= 6 && h < 18 ? '#efe3b8' : '#b9bcc4', opacity: p > 0.02 ? 0.35 + 0.65 * Math.min(1, p / 0.6) : 1 }));
      }
      parts.push(line(x + (upto / 24) * 80, 26, x + (upto / 24) * 80, 46, COL.heat, 1.6), small(x, 54, '0h', { soft: true }), small(x + 40, 54, 'noon', { anchor: 'middle', soft: true }), small(x + 80, 54, '24h', { anchor: 'end', soft: true }));
      // Water and sugar so far, as two bars.
      const wH = Math.min(120, tot.water * 9);
      const sH = Math.min(120, tot.sugar * 9);
      parts.push(
        svg('rect', { x: x + 6, y: 190 - wH, width: 28, height: wH, fill: COL.water }),
        svg('rect', { x: x + 46, y: 190 - sH, width: 28, height: sH, fill: COL.sugar }),
        small(x + 20, 204, 'water', { anchor: 'middle', fill: COL.water }),
        small(x + 60, 204, 'sugar', { anchor: 'middle', fill: COL.sugar }),
        shown && upto >= 24 ? small(x + 40, 224, `${tot.perWater.toFixed(1)} sugar per water`, { anchor: 'middle', bold: true }) : null,
      );
    });
    parts.push(small(40, 74, 'Green: pores open; grey: night. Bars: totals since midnight. A model.', { soft: true }), line(30, 190, 370, 190, COL.ink, 1));
    redraw(g, ...parts);
    if (!shown) return;
    const c3 = day('C3', 24, mistake);
    const c4 = day('C4', 24, mistake);
    f.readout.textContent = upto < 24
      ? `${String(Math.floor(upto)).padStart(2, '0')}:00. ${upto < 6 || upto >= 20 ? 'Night: only the cactus has its pores open, taking in carbon dioxide and storing it as acid.' : 'Day: wheat and corn have their pores open; the cactus keeps its shut and works on its stored acid.'}`
      : !mistake
        ? `Without rubisco's mistake, wheat makes ${c3.sugar > c4.sugar ? 'more sugar than' : 'as much sugar as'} corn: corn's pump only pays off when rubisco is wasting effort on oxygen in the heat.`
        : 'Over the whole hot day, corn makes the most sugar, and the cactus makes by far the most per drop of water, though the least in all.';
    if (!mistake && upto >= 24) t.done();
  };
  const hours = slider('Hour', 0, 24, 0.5, 0, (v) => `${String(Math.floor(v)).padStart(2, '0')}:${v % 1 ? '30' : '00'}`, (v) => { upto = v; paint(); }, 'light');
  const play = player(hours, ctx, { seconds: 10 });
  const sw = toggles(['Take away rubisco’s mistake'], [false], (on) => { mistake = !on[0]; paint(); });
  f.controls.append(play.node, hours.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'Wheat, corn and a cactus side by side through one hot, dry day. Which makes the most sugar for each litre of water it loses?',
    options: ['Wheat', 'Corn', 'The cactus'],
    answer: 2,
    reveal: 'done',
    sliders: [hours],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The wreath ----------------------------------------------------------------------------------

export const kranzStill = () => {
  const s = still(W, 210);
  const leaf = (x0: number, c4: boolean) => {
    const out: SVGElement[] = [
      svg('rect', { x: x0, y: 40, width: 170, height: 110, rx: 10, fill: '#eef4e4', stroke: COL.leaf, 'stroke-width': 1.5 }),
    ];
    for (const vx of [x0 + 45, x0 + 125]) {
      const vy = 95;
      if (c4) {
        // Mesophyll cells in a ring outside, then the dark green bundle sheath, then the vein.
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          out.push(svg('ellipse', { cx: vx + 33 * Math.cos(a), cy: vy + 33 * Math.sin(a), rx: 9, ry: 6, fill: '#c6e0a8', stroke: '#7ea35c', transform: `rotate(${(a * 180) / Math.PI} ${vx + 33 * Math.cos(a)} ${vy + 33 * Math.sin(a)})` }));
        }
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          out.push(svg('circle', { cx: vx + 17 * Math.cos(a), cy: vy + 17 * Math.sin(a), r: 7.5, fill: '#4f8a3c', stroke: '#2f5a24' }));
        }
      } else {
        for (let i = 0; i < 14; i++) {
          const a = (i * Math.PI) / 7;
          const r = 18 + (i % 2) * 14;
          out.push(svg('ellipse', { cx: vx + r * Math.cos(a), cy: vy + r * Math.sin(a), rx: 7, ry: 5, fill: '#c6e0a8', stroke: '#7ea35c' }));
        }
      }
      out.push(svg('circle', { cx: vx, cy: vy, r: 8, fill: '#e6d3a3', stroke: COL.wood }));
    }
    return out;
  };
  s.svg.append(
    svg('rect', { width: W, height: 210, fill: COL.paper }),
    label(105, 28, 'Wheat (C3)', { anchor: 'middle', bold: true }),
    label(295, 28, 'Corn (C4)', { anchor: 'middle', bold: true }),
    ...leaf(20, false),
    ...leaf(210, true),
    ...wrapped(20, 170, 'Pale green cells scattered evenly round each vein.', 32, { soft: true }),
    ...wrapped(210, 170, 'A wreath: dark green sheath cells round each vein, pale cells round them.', 34, { soft: true }),
  );
  return { node: s.node };
};
