// A pad: two knobs as one square to drag a finger around. Across is one
// parameter, up is the other, and each cell is one position of each, so the
// steps a puzzle moves in can be felt under the finger.

import { el } from '../dom';

export interface PadAxis {
  label: string;
  /** Number of positions. */
  count: number;
  format: (pos: number) => string;
}

export interface PadOptions {
  x: PadAxis;
  y: PadAxis;
  onPick: (x: number, y: number) => void;
}

export interface Pad {
  el: HTMLElement;
  set(x: number, y: number): void;
}

export function createPad(opts: PadOptions): Pad {
  const { x, y } = opts;
  let at: [number, number] = [0, 0];

  // Row 0 on screen is the top, which is the highest position of `y`.
  const cells: HTMLElement[] = [];
  for (let row = y.count - 1; row >= 0; row--) {
    for (let col = 0; col < x.count; col++) cells.push(el('div.pad-cell', { dataset: { x: String(col), y: String(row) } }));
  }
  const grid = el('div.pad-grid', { tabIndex: 0, role: 'application', 'aria-label': `${x.label} across, ${y.label} up` }, cells);
  grid.style.gridTemplateColumns = `repeat(${x.count}, 1fr)`;
  grid.style.aspectRatio = `${x.count} / ${Math.max(y.count, x.count * 0.55)}`;
  const readout = el('div.pad-readout.num');

  const paint = () => {
    for (const cell of cells) {
      cell.classList.toggle('on', Number(cell.dataset.x) === at[0] && Number(cell.dataset.y) === at[1]);
    }
    readout.textContent = `${x.label} ${x.format(at[0])} · ${y.label} ${y.format(at[1])}`;
  };

  const pick = (px: number, py: number) => {
    const nx = Math.min(x.count - 1, Math.max(0, px));
    const ny = Math.min(y.count - 1, Math.max(0, py));
    if (nx !== at[0] || ny !== at[1]) opts.onPick(nx, ny);
  };
  const fromPoint = (e: PointerEvent) => {
    const box = grid.getBoundingClientRect();
    pick(Math.floor(((e.clientX - box.left) / box.width) * x.count), y.count - 1 - Math.floor(((e.clientY - box.top) / box.height) * y.count));
  };

  let dragging = false;
  grid.addEventListener('pointerdown', (e) => {
    dragging = true;
    grid.setPointerCapture(e.pointerId);
    e.preventDefault();
    fromPoint(e);
    // Focus is for the arrow keys; it must not scroll the square out from under the finger.
    grid.focus({ preventScroll: true });
  });
  grid.addEventListener('pointermove', (e) => {
    if (dragging) fromPoint(e);
  });
  const lift = () => (dragging = false);
  grid.addEventListener('pointerup', lift);
  grid.addEventListener('pointercancel', lift);
  grid.addEventListener('keydown', (e) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowDown: [0, -1], ArrowUp: [0, 1] };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    pick(at[0] + d[0], at[1] + d[1]);
  });

  paint();
  return {
    el: el(
      'div.pad',
      {},
      el('div.pad-y.caps', {}, el('span', {}, y.label)),
      grid,
      el('div.pad-x.caps', {}, x.label),
      readout,
    ),
    set(nx, ny) {
      at = [Math.round(nx), Math.round(ny)];
      paint();
    },
  };
}
