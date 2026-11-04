// Lesson 19, One hand, many notes: what an arpeggiator does with a held chord,
// drawn as a piano roll. The chord (C, E, G, played in the order G, C, E) is
// held for a bar; each step lights one note. Mode orders them, octaves repeat
// the pattern higher, rate sets how many steps fit in the bar.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { arpPick, arpSequence } from '../core/arp';
import { ARP_MODE } from '../core/params';
import { COL, figure, frame, slider } from './kit';

const W = 400;
const H = 230;
const X0 = 58;
const X1 = 390;
const TOP = 14;
const BOT = 196;
/** Semitones above C3, in the order the keys went down. */
const PLAYED = [7, 0, 4];
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MODES = [
  { id: ARP_MODE.up, name: 'Up' },
  { id: ARP_MODE.down, name: 'Down' },
  { id: ARP_MODE.order, name: 'Order' },
  { id: ARP_MODE.random, name: 'Random' },
];
const RATES = [
  { steps: 4, name: '1/4' },
  { steps: 8, name: '1/8' },
  { steps: 16, name: '1/16' },
];

export const rollFigure = figure(['roll-done'], (_ctx, t) => {
  const f = frame(W, H, 1.75);
  const g = svg('g');
  f.svg.append(g);
  let mode = 0;
  let octaves = 1;
  let rate = 1;
  const modesSeen = new Set<number>();

  const paint = () => {
    const m = MODES[mode].id;
    const seq = arpSequence(PLAYED, m, octaves);
    const steps = RATES[rate].steps;
    const span = 12 * octaves + 1;
    const row = (BOT - TOP) / span;
    const y = (semi: number) => BOT - (semi + 1) * row;
    const w = (X1 - X0) / steps;
    const lit = Array.from({ length: steps }, (_, i) => arpPick(seq, m, i, 3));
    const rows: SVGElement[] = [];
    for (let k = 0; k < octaves; k++) {
      for (const p of PLAYED) {
        const semi = p + 12 * k;
        rows.push(svg('rect', { x: X0, y: y(semi), width: X1 - X0, height: row, fill: COL.soft, opacity: 0.12 }));
        rows.push(small(X0 - 6, y(semi) + row / 2 + 4, `${NAMES[semi % 12]}${3 + Math.floor(semi / 12)}`, { anchor: 'end', soft: k > 0 }));
      }
    }
    redraw(g,
      ...rows,
      ...Array.from({ length: steps + 1 }, (_, i) => svg('line', { x1: X0 + i * w, y1: TOP, x2: X0 + i * w, y2: BOT, stroke: COL.grid, opacity: i % (steps / 4) === 0 ? 0.9 : 0.35 })),
      ...lit.map((semi, i) => svg('rect', { x: X0 + i * w + 1, y: y(semi) + 1, width: Math.max(2, w / 2 - 1), height: Math.max(2, row - 2), fill: COL.filter, rx: 1.5 })),
      small(X0, BOT + 18, `one bar, ${steps} steps`, { soft: true }),
      small(X1, BOT + 18, 'keys held: G, then C, then E', { anchor: 'end', soft: true }),
    );
    const names = seq.slice(0, 6).map((s) => NAMES[s % 12]).join(' ');
    f.readout.textContent =
      m === ARP_MODE.random
        ? `Random: each step picks any held note${octaves > 1 ? ' in any of the octaves' : ''}, so the pattern never settles.`
        : `${MODES[mode].name}: ${names}${seq.length > 6 ? ' …' : ''}, then round again${octaves > 1 ? `, across ${octaves} octaves` : ''}.`;
    modesSeen.add(mode);
    if (modesSeen.size >= 3 && octaves >= 2) t.done();
  };
  const sm = slider('Mode', 0, MODES.length - 1, 1, mode, (v) => MODES[v].name, (v) => { mode = v; paint(); }, 'filter');
  const so = slider('Octaves', 1, 3, 1, octaves, (v) => String(v), (v) => { octaves = v; paint(); }, 'filter');
  const sr = slider('Rate', 0, RATES.length - 1, 1, rate, (v) => RATES[v].name, (v) => { rate = v; paint(); }, 'filter');
  f.controls.append(sm.node, so.node, sr.node);
  paint();
  return f.node;
});
