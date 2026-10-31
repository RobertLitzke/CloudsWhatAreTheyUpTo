// An oscilloscope: a screen that draws a voltage against time, left to right,
// over a fixed window. Each trace is a run of samples taken evenly across the
// window, recorded from a simulation (`capture`) or worked out directly. A
// bright dot, the beam, runs along the first trace at whatever pace the
// figure sets, so the screen can keep time with a schematic slowed down
// beside it.

import { svg } from 'didactics/dom';
import { line, small } from 'didactics/draw';
import type { Part } from 'circuit-kit/parts';
import { simulate } from 'circuit-kit/sim';
import type { Solution } from 'circuit-kit/solve';
import { si } from '../circuit/units';
import { COL } from './kit';

export interface Trace {
  /** Volts, sampled evenly from the left edge to the right. */
  volts: number[];
  colour: string;
  /** Drawn thin and dashed: a target to match, or an input to compare with. */
  ghost?: boolean;
  /** Written at the trace's right-hand end. */
  label?: string;
  /** How much of the screen's width the samples run across, from the left: less than 1 for a trace still being drawn. */
  span?: number;
}

export interface ScopeOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** The volts at the bottom and top of the screen. */
  vmin: number;
  vmax: number;
  /** Seconds across the screen. */
  window: number;
}

export interface Scope {
  node: SVGGElement;
  draw(traces: Trace[]): void;
  /** Change the screen's range, redrawing the grid; traces are redrawn on the next `draw`. */
  range(vmin: number, vmax: number): void;
  /** Put the beam at a fraction of the way across, on the first trace; NaN hides it. */
  beam(fraction: number): void;
  /** Cover the screen with a note, such as "Guess first", or uncover it with null. */
  hide(note: string | null): void;
}

const DIVS_X = 10;
const DIVS_Y = 8;
const SCREEN = '#16201c';
const GRID = 'rgba(190, 220, 200, 0.16)';

export function scope(o: ScopeOptions): Scope {
  const { x, y, w, h } = o;
  let { vmin, vmax } = o;
  const grid = svg('g');
  const traces = svg('g', { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  const dot = svg('circle', { r: 3.5, fill: '#fff6d8', stroke: COL.current, 'stroke-width': 1.5, display: 'none' });
  const cover = svg('g', { display: 'none' });
  const scale = svg('g');
  const node = svg('g', { class: 'scope' },
    svg('rect', { x: x - 4, y: y - 4, width: w + 8, height: h + 8, rx: 6, fill: '#3a4146' }),
    svg('rect', { x, y, width: w, height: h, rx: 2, fill: SCREEN }),
    grid, traces, dot, cover, scale,
  ) as SVGGElement;
  let first: number[] = [];

  const py = (v: number) => y + h - ((Math.min(vmax, Math.max(vmin, v)) - vmin) / (vmax - vmin)) * h;

  const drawGrid = () => {
    const lines: SVGElement[] = [];
    for (let k = 1; k < DIVS_X; k++) lines.push(line(x + (w * k) / DIVS_X, y, x + (w * k) / DIVS_X, y + h, GRID, 1));
    for (let k = 1; k < DIVS_Y; k++) lines.push(line(x, y + (h * k) / DIVS_Y, x + w, y + (h * k) / DIVS_Y, GRID, 1));
    // Zero volts, if it is on the screen, gets a brighter line and a marker.
    if (vmin < 0 && vmax > 0) lines.push(line(x, py(0), x + w, py(0), 'rgba(190, 220, 200, 0.4)', 1));
    grid.replaceChildren(...lines);
    const perDiv = (vmax - vmin) / DIVS_Y;
    scale.replaceChildren(
      small(x + 4, y + 11, `${si(vmax, 'V')}`, { fill: '#bcd8c4' }),
      small(x + 4, y + h - 4, `${si(vmin, 'V')}`, { fill: '#bcd8c4' }),
      small(x + w - 4, y + h - 4, `${si(perDiv, 'V')}/div  ${si(o.window / DIVS_X, 's')}/div`, { anchor: 'end', fill: '#bcd8c4' }),
      ...(vmin < 0 && vmax > 0 ? [small(x - 7, py(0) + 3, '0', { anchor: 'end', soft: true })] : []),
    );
  };
  drawGrid();

  return {
    node,
    draw(list) {
      first = list[0]?.volts ?? [];
      traces.replaceChildren(...list.map((tr) => {
        const n = tr.volts.length;
        const across = w * (tr.span ?? 1);
        const pts = tr.volts.map((v, k) => `${(x + (across * k) / Math.max(1, n - 1)).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
        const g = svg('g', {},
          svg('polyline', { points: pts, stroke: tr.colour, 'stroke-width': tr.ghost ? 1.4 : 2.2, ...(tr.ghost ? { 'stroke-dasharray': '4 3', opacity: 0.8 } : {}) }));
        if (tr.label && n) g.append(small(x + across - 4, py(tr.volts[n - 1]) - 5, tr.label, { anchor: 'end', fill: tr.colour, bold: true }));
        return g;
      }));
    },
    range(lo, hi) {
      vmin = lo;
      vmax = hi;
      drawGrid();
    },
    beam(fraction) {
      if (!Number.isFinite(fraction) || !first.length) {
        dot.setAttribute('display', 'none');
        return;
      }
      const k = Math.min(first.length - 1, Math.round(fraction * (first.length - 1)));
      dot.removeAttribute('display');
      dot.setAttribute('cx', (x + w * fraction).toFixed(1));
      dot.setAttribute('cy', py(first[k]).toFixed(1));
    },
    hide(note) {
      if (note === null) {
        cover.setAttribute('display', 'none');
        traces.removeAttribute('display');
        return;
      }
      traces.setAttribute('display', 'none');
      cover.removeAttribute('display');
      cover.replaceChildren(small(x + w / 2, y + h / 2 + 3, note, { anchor: 'middle', fill: '#bcd8c4', bold: true }));
    },
  };
}

/** Sample `read` at `n` evenly spaced times across `window` seconds, starting at `from`. */
export function sample(read: (t: number) => number, window: number, n = 300, from = 0): number[] {
  return Array.from({ length: n }, (_, k) => read(from + (window * k) / (n - 1)));
}

/**
 * Run `parts` through time and record what each of `reads` gives, `n` times
 * across `window` seconds, after first letting it run for `settle` seconds so
 * the capacitors have charged to where they will stay. Starting `settled`, from
 * the circuit's steady state, needs a much shorter settle than from rest.
 */
export function capture(parts: readonly Part[], reads: ((s: Solution) => number)[], o: { window: number; settle?: number; n?: number; celsius?: number; settled?: boolean }): number[][] {
  const n = o.n ?? 300;
  const dt = o.window / (n - 1);
  const sim = simulate(parts, { celsius: o.celsius, settled: o.settled });
  if (o.settle) sim.step(o.settle, Math.min(4000, Math.max(1, Math.ceil(o.settle / dt))));
  const out = reads.map(() => [] as number[]);
  let s = sim.now;
  for (let k = 0; k < n; k++) {
    if (k) s = sim.step(dt);
    reads.forEach((r, j) => out[j].push(r(s)));
  }
  return out;
}
