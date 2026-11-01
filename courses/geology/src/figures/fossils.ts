// The fossil lesson (L1): what burial and groundwater chemistry leave of a
// log, a shell and a soft-bodied worm; and wood cells filling with silica,
// then being replaced by it.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { segmented } from 'didactics/ui';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

type Water = 'plain' | 'silica' | 'pyrite' | 'lime';
type Outcome = 'gone' | 'worn' | 'petrified' | 'calcite' | 'pyrite' | 'film' | 'mould' | 'kept';

/** What is left of each body, given burial speed, oxygen at the bottom, and what the groundwater carries. */
export function outcome(body: 'log' | 'shell' | 'worm', fast: boolean, oxygen: boolean, water: Water): Outcome {
  const rots = !fast && oxygen;
  if (body === 'worm') {
    if (!fast || oxygen) return 'gone';
    return water === 'pyrite' ? 'pyrite' : water === 'plain' ? 'film' : 'gone';
  }
  if (body === 'log') {
    if (rots) return 'gone';
    return { plain: 'film', silica: 'petrified', pyrite: 'pyrite', lime: 'calcite' }[water] as Outcome;
  }
  // A shell is hard mineral already; slow burial only wears it.
  if (rots && water !== 'plain') return 'worn';
  return { plain: 'mould', silica: 'petrified', pyrite: 'pyrite', lime: 'kept' }[water] as Outcome;
}

const SAY: Record<Outcome, string> = {
  gone: 'nothing left',
  worn: 'broken, worn shell',
  petrified: 'turned to quartz, every detail kept',
  calcite: 'cells filled with calcite',
  pyrite: 'outlined in pyrite',
  film: 'a thin black film of carbon',
  mould: 'dissolved: a hollow mould',
  kept: 'the shell itself, little changed',
};
const FILL: Record<Outcome, string> = {
  gone: 'none', worn: '#d8cbb1', petrified: '#c9a6c4', calcite: '#e8dcc2', pyrite: '#c8a43c', film: '#2f2a28', mould: 'none', kept: '#efe4cf',
};

export const fossilFigure = figure(['petrified'], (_ctx, t) => {
  const f = frame(W, 200, 4);
  const g = svg('g');
  f.svg.append(g);
  let fast = false;
  let oxygen = true;
  let water: Water = 'plain';
  const shape = (body: 'log' | 'shell' | 'worm', x: number, y: number, o: Outcome): SVGElement[] => {
    const fill = FILL[o];
    const dash: Record<string, string> = o === 'gone' || o === 'mould' ? { 'stroke-dasharray': '3 3' } : {};
    const stroke = o === 'gone' ? COL.soft : COL.ink;
    const op = o === 'gone' ? 0.4 : 1;
    if (body === 'log') {
      const out: SVGElement[] = [svg('rect', { x: x - 40, y: y - 12, width: 80, height: 24, rx: 10, fill, stroke, 'stroke-width': 1, opacity: op, ...dash })];
      if (o === 'petrified' || o === 'calcite') for (let k = 1; k < 4; k++) out.push(svg('ellipse', { cx: x + 30, cy: y, rx: 3 + k * 2.5, ry: 3 + k * 2.5, fill: 'none', stroke: '#8a6a86', 'stroke-width': 0.6 }));
      return out;
    }
    if (body === 'shell') {
      const d = `M${x - 26},${y + 10} Q${x},${y - 30} ${x + 26},${y + 10} Z`;
      const out: SVGElement[] = [svg('path', { d, fill: o === 'mould' ? '#cbb994' : fill, stroke, 'stroke-width': 1, opacity: op, ...dash })];
      if (o !== 'gone' && o !== 'mould') for (let k = -2; k <= 2; k++) out.push(svg('line', { x1: x, y1: y + 10, x2: x + k * 10, y2: y - 6 + Math.abs(k) * 4, stroke: COL.ink, 'stroke-width': 0.5, opacity: 0.5 }));
      return out;
    }
    const d = `M${x - 34},${y} q8,-10 17,0 q8,10 17,0 q8,-10 17,0 q8,10 17,0`;
    return [svg('path', { d, fill: 'none', stroke: o === 'gone' ? COL.soft : fill, 'stroke-width': o === 'film' ? 3 : 5, 'stroke-linecap': 'round', opacity: op, ...dash })];
  };
  const paint = () => {
    const bodies = ['log', 'shell', 'worm'] as const;
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 200, fill: COL.paper }),
      svg('rect', { x: 0, y: 0, width: W, height: 40, fill: COL.water, opacity: oxygen ? 0.25 : 0.55 }),
      small(8, 14, oxygen ? 'bottom water with oxygen' : 'bottom water with no oxygen', { bold: true, fill: COL.paper, halo: COL.water }),
      svg('rect', { x: 0, y: 40, width: W, height: 160, fill: water === 'silica' ? '#ddd3dc' : water === 'pyrite' ? '#8f8a80' : water === 'lime' ? '#e9e1cd' : '#cdb98f' }),
      small(8, 192, { plain: 'plain groundwater', silica: 'water with silica from volcanic ash', pyrite: 'sea mud: iron and sulphate', lime: 'water with dissolved lime' }[water], { bold: true }),
    ];
    bodies.forEach((b, i) => {
      const o = outcome(b, fast, oxygen, water);
      const x = 70 + i * 130;
      parts.push(...shape(b, x, 100, o), label(x, 140, b === 'worm' ? 'soft worm' : b, { size: 'note', anchor: 'middle', bold: true }), small(x, 154, SAY[o], { anchor: 'middle' }));
    });
    redraw(g, ...parts);
    const log = outcome('log', fast, oxygen, water);
    f.readout.textContent = !fast && oxygen
      ? 'Left on the bottom with oxygen around it, the wood and the worm are eaten and rot; only a hard shell lasts, battered.'
      : `Buried ${fast ? 'quickly' : 'slowly'}, ${oxygen ? 'with' : 'without'} oxygen. The log is ${SAY[log]}; the shell, ${SAY[outcome('shell', fast, oxygen, water)]}; the worm, ${SAY[outcome('worm', fast, oxygen, water)]}.${log === 'petrified' ? ' This is how the Arizona logs became quartz.' : ''}`;
    if (log === 'petrified' && t.goal === 'petrified') t.done();
  };
  const sBurial = segmented([{ value: 'slow', label: 'Buried slowly' }, { value: 'fast', label: 'Buried fast' }] as const, 'slow', (v) => { fast = v === 'fast'; paint(); });
  const sOxygen = segmented([{ value: 'yes', label: 'Oxygen' }, { value: 'no', label: 'No oxygen' }] as const, 'yes', (v) => { oxygen = v === 'yes'; paint(); });
  const sWater = segmented([{ value: 'plain', label: 'Plain water' }, { value: 'silica', label: 'Silica' }, { value: 'pyrite', label: 'Iron + sulphate' }, { value: 'lime', label: 'Lime' }] as const, 'plain', (v) => { water = v; paint(); });
  f.controls.append(sBurial, sOxygen, sWater);
  paint();
  guessFirst(t, f, {
    ask: 'The Arizona logs are quartz all the way through, with every cell kept. What buried them? Guess first.',
    options: ['River sand', 'Volcanic ash', 'Sea mud'],
    sliders: [],
    hidden: [sBurial, sOxygen, sWater],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['river sand', 'volcanic ash', 'sea mud'][guess]}. Try the burial and the water, and find what turns wood to quartz.`;
    },
  });
  return f.node;
});

// ---- Wood cells filling with silica ---------------------------------------------------------

/** Fraction of the cell spaces filled, and of the walls replaced, after `kyr` thousand years in water carrying `silica` (1 = rich). */
export function petrify(kyr: number, silica: number): { filled: number; replaced: number } {
  const rate = silica * 0.002;
  const filled = Math.min(1, kyr * rate);
  const replaced = Math.max(0, Math.min(1, (kyr * rate - 1) * 0.5));
  return { filled, replaced };
}

export const cellsFigure = figure(['replaced'], (_ctx, t) => {
  const f = frame(W, 190, 3);
  const g = svg('g');
  f.svg.append(g);
  let kyr = 0;
  let silica = 1;
  const COLS = 12;
  const ROWS = 6;
  const paint = () => {
    const { filled, replaced } = petrify(kyr, silica);
    const parts: SVGElement[] = [svg('rect', { width: W, height: 190, fill: COL.paper })];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = 30 + c * 28;
      const y = 14 + r * 26;
      const k = (r * COLS + c) * 0.618 % 1;
      const full = k < filled;
      const swapped = k < replaced;
      parts.push(
        svg('rect', { x, y, width: 26, height: 24, rx: 3, fill: swapped ? '#c9a6c4' : '#8a5a2b' }),
        svg('rect', { x: x + 3, y: y + 3, width: 20, height: 18, rx: 2, fill: full ? '#e4cfe0' : '#f8f1e3' }),
      );
    }
    parts.push(small(30, 180, `brown: wood cell walls; pale purple: quartz${replaced > 0 ? '; purple walls: wood replaced by quartz' : ''}`, { soft: true }));
    redraw(g, ...parts);
    f.readout.textContent = kyr === 0
      ? 'A slice of buried wood: walls of cellulose and lignin around empty cell spaces. Groundwater soaks in.'
      : `${kyr >= 1000 ? `${(kyr / 1000).toFixed(1)} million` : `${Math.round(kyr)} thousand`} years. ${Math.round(filled * 100)}% of the cell spaces are filled with silica${filled < 1 ? ', which is permineralization: the walls are still the wood' : ''}${replaced > 0 ? `, and ${Math.round(replaced * 100)}% of the walls themselves have dissolved and been rebuilt in quartz: replacement` : ''}.`;
    if (replaced >= 0.95 && t.goal === 'replaced') t.done();
  };
  const st = slider('Time buried', 0, 3000, 10, kyr, (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} million years` : `${v} thousand years`), (v) => { kyr = v; paint(); }, 'old');
  const ss = slider('Silica in the water', 0.05, 1, 0.05, silica, (v) => (v > 0.7 ? 'rich (volcanic ash)' : v > 0.3 ? 'some' : 'little'), (v) => { silica = v; paint(); }, 'rose');
  f.controls.append(st.node, ss.node);
  paint();
  return f.node;
});
