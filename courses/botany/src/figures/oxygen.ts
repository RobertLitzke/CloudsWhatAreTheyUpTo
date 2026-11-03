// Lesson 4, Where the oxygen comes from: heavy oxygen put in the water or in
// the carbon dioxide, and Calvin's lollipop timed in seconds.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, slider } from './kit';

const W = 400;

/** Where each input's oxygen atoms end up: water's in the oxygen gas, carbon dioxide's in the sugar and the new water. */
export const TRACE = {
  water: ['gas'],
  co2: ['sugar', 'newWater'],
} as const;

export const labelFigure = figure(['traced'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let which: keyof typeof TRACE = 'water';
  const tried = new Set<string>();
  const HEAVY = COL.heat;
  const paint = () => {
    const shown = open();
    const hot = (k: string) => shown && (TRACE[which] as readonly string[]).includes(k);
    const box = (x: number, y: number, w: number, title: string, formula: string, heavy: boolean, color: string) => [
      svg('rect', { x, y, width: w, height: 46, rx: 8, fill: heavy ? '#f7d9cf' : '#f3efe0', stroke: heavy ? HEAVY : COL.grid, 'stroke-width': heavy ? 2 : 1 }),
      label(x + w / 2, y + 20, formula, { anchor: 'middle', bold: true, fill: color }),
      small(x + w / 2, y + 36, title, { anchor: 'middle', soft: true }),
    ];
    const inW = which === 'water';
    redraw(g,
      ...box(14, 30, 120, inW ? 'carbon dioxide' : 'carbon dioxide, heavy O', 'CO₂', !inW, COL.co2),
      ...box(14, 110, 120, inW ? 'water, heavy O' : 'water', 'H₂O', inW, COL.water),
      svg('path', { d: 'M140,98 L180,98', stroke: COL.ink, 'stroke-width': 2 }),
      svg('polygon', { points: '180,92 192,98 180,104', fill: COL.ink }),
      small(166, 88, 'light', { anchor: 'middle', fill: COL.light, bold: true }),
      ...box(206, 14, 180, 'oxygen gas given off', 'O₂', hot('gas'), COL.o2),
      ...box(206, 74, 180, 'sugar', 'C₆H₁₂O₆', hot('sugar'), COL.sugar),
      ...box(206, 134, 180, 'new water made', 'H₂O', hot('newWater'), COL.water),
      shown ? small(14, 194, 'Red: where the heavy oxygen turns up.', { fill: HEAVY }) : small(14, 194, 'Where will the heavy oxygen turn up?', { soft: true }),
    );
    if (!shown) return;
    tried.add(which);
    f.readout.textContent = which === 'water'
      ? 'Heavy oxygen in the water comes out as oxygen gas, and nowhere else. The oxygen a plant gives off comes from splitting water.'
      : 'Heavy oxygen in the carbon dioxide ends up in the sugar and in some new water the plant makes, never in the oxygen gas.';
    if (tried.size === 2) t.done();
  };
  const p = pick(['Heavy oxygen in the water', 'Heavy oxygen in the CO₂'], 0, (i) => { which = i ? 'co2' : 'water'; paint(); });
  f.controls.append(p.node);
  const open = guessFirst(t, f, {
    ask: 'Give a plant water whose oxygen atoms are the heavy kind, and ordinary carbon dioxide. Where does the heavy oxygen turn up?',
    options: ['In the oxygen gas', 'In the sugar', 'In both'],
    answer: 0,
    reveal: 'done',
    sliders: [],
    buttons: p.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The lollipop ----------------------------------------------------------------------------------

/** The molecules the radioactive carbon passes through, with where each runs on Calvin's paper. */
export const SPOTS = [
  { id: 'pga', name: 'PGA', x: 300, y: 150, r: 15 },
  { id: 'triose', name: 'triose phosphate', x: 248, y: 118, r: 12 },
  { id: 'hexose', name: 'sugar phosphates', x: 196, y: 88, r: 16 },
  { id: 'rubp', name: 'RuBP', x: 312, y: 96, r: 11 },
  { id: 'sucrose', name: 'sucrose', x: 120, y: 60, r: 14 },
  { id: 'amino', name: 'amino acids', x: 120, y: 150, r: 13 },
] as const;
type Spot = (typeof SPOTS)[number]['id'];

/** Share of the radioactive carbon in each molecule after `seconds` with labelled CO₂, from a chain of steps with these rates (per second). */
export function lollipop(seconds: number): Record<Spot, number> {
  const a: Record<Spot, number> = { pga: 0, triose: 0, hexose: 0, rubp: 0, sucrose: 0, amino: 0 };
  const dt = 0.02;
  for (let s = 0; s < seconds; s += dt) {
    const toTriose = 0.22 * a.pga;
    const toHexose = 0.12 * a.triose;
    const toRubp = 0.25 * a.triose + 0.06 * a.hexose;
    const toSucrose = 0.035 * a.hexose;
    const toAmino = 0.012 * a.pga;
    // Labelled CO₂ is fixed onto RuBP, making PGA; once RuBP itself carries label, that comes back too.
    const fix = 1 + 0.4 * a.rubp;
    a.pga += (fix - toTriose - toAmino) * dt;
    a.triose += (toTriose - toHexose - toRubp) * dt;
    a.hexose += (toHexose - 0.06 * a.hexose - toSucrose) * dt;
    a.rubp += (toRubp - 0.4 * a.rubp) * dt;
    a.sucrose += toSucrose * dt;
    a.amino += toAmino * dt;
  }
  const total = Object.values(a).reduce((x, y) => x + y, 0) || 1;
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v / total])) as Record<Spot, number>;
}

export const lollipopFigure = figure(['first'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let seconds = 60;
  const paint = () => {
    const share = lollipop(seconds);
    redraw(g,
      svg('rect', { x: 60, y: 24, width: 290, height: 156, fill: '#f6f1e2', stroke: COL.grid }),
      svg('circle', { cx: 340, cy: 172, r: 3, fill: COL.ink }),
      small(340, 194, 'start', { anchor: 'middle', soft: true }),
      line(330, 186, 70, 186, COL.soft, 1), small(70, 198, 'solvent 1', { soft: true }),
      line(356, 170, 356, 30, COL.soft, 1), small(352, 22, 'solvent 2', { soft: true }),
      ...SPOTS.flatMap((s) => {
        const v = share[s.id];
        return [
          svg('ellipse', { cx: s.x, cy: s.y, rx: s.r, ry: s.r * 0.75, fill: COL.ink, opacity: Math.min(0.92, 0.04 + v * 1.4) }),
          small(s.x, s.y + s.r + 10, s.name, { anchor: 'middle', fill: v > 0.05 ? COL.ink : COL.soft }),
        ];
      }),
      label(60, 14, `Algae killed after ${seconds} second${seconds === 1 ? '' : 's'}: the paper's dark spots`, { bold: true, size: 'small' }),
    );
    const top = SPOTS.reduce((a, b) => (share[a.id] > share[b.id] ? a : b));
    f.readout.textContent = share.pga > 0.7
      ? `After ${seconds} seconds almost all the radioactive carbon is in one molecule, PGA: the first thing carbon dioxide becomes.`
      : `After ${seconds} seconds the label has spread round the cycle; the most is in ${top.name}${share.sucrose > 0.1 ? ', and sucrose, the sugar the plant ships, has appeared' : ''}.`;
    if (share.pga > 0.7) t.done();
  };
  const steps = [1, 2, 3, 5, 10, 20, 30, 60, 90, 120, 180, 300];
  const s = slider('Seconds before the algae are killed', 0, steps.length - 1, 1, steps.indexOf(seconds), (v) => `${steps[v]} s`, (v) => { seconds = steps[v]; paint(); }, 'heat');
  f.controls.append(s.node);
  paint();
  return f.node;
});
