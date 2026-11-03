// The modulation matrix: sources down the side, destinations across the top,
// and in each square how much of that source moves that destination. Tap a
// square to pick it; the one Amount knob below then turns the picked square.
// Each square is also a Knob to its owner, so a panel sets, locks and ghosts
// it like any other control.

import type { Rules } from '../../core/gen';
import { MOD_DESTS, MOD_SOURCES, PARAMS, cellId, valueAt, type ParamId } from '../../core/params';
import { el } from '../dom';
import { createControl } from './panel';
import type { Knob } from './knob';

export interface MatrixOptions {
  rules: Rules;
  /** The squares on show; a source row appears when any of its squares is here. */
  cells: readonly ParamId[];
  continuous: boolean;
  current: (id: ParamId) => number;
  onMove: (id: ParamId, pos: number) => void;
}

export interface Matrix {
  el: HTMLElement;
  /** One Knob per square, for its owner to set, lock and ghost. */
  cells: Map<ParamId, Knob>;
}

/** A square's value, short enough for the grid: "+1 oct" stays, "Off" is a dot. */
function short(id: ParamId, rules: Rules, pos: number): string {
  const v = valueAt(id, rules.steps[id], pos);
  return v === 0 ? '·' : PARAMS[id].format(v);
}

export function createMatrix(opts: MatrixOptions): Matrix {
  const { rules } = opts;
  const rows = MOD_SOURCES.filter((src) => MOD_DESTS.some((d) => opts.cells.includes(cellId(src.id, d.id)!)));
  const cells = new Map<ParamId, Knob>();
  const buttons = new Map<ParamId, HTMLButtonElement>();
  const ghosts = new Map<ParamId, number | null>();
  let picked: ParamId = opts.cells[0];

  const amountSlot = el('div.mx-amount');
  const pickedName = el('div.mx-picked');
  let amount: Knob | null = null;
  let amountLocked = false;
  let amountOff = false;
  const pick = (id: ParamId) => {
    picked = id;
    for (const [cid, b] of buttons) b.classList.toggle('picked', cid === id);
    amount = createControl(id, rules, opts.continuous, () => opts.current(id), (pos) => opts.onMove(id, pos));
    amount.set(opts.current(id));
    amount.setGhost(ghosts.get(id) ?? null);
    amount.setState({ locked: amountLocked, disabled: amountOff });
    amountSlot.replaceChildren(amount.el);
    pickedName.textContent = PARAMS[id].full ?? PARAMS[id].label;
  };

  const head = el('div.mx-row.mx-head', {}, el('span.mx-corner'), MOD_DESTS.map((d) => el('span.mx-dest', {}, d.label)));
  const body = rows.map((src) =>
    el(
      'div.mx-row',
      {},
      el('span.mx-src', {}, src.label),
      MOD_DESTS.map((d) => {
        const id = cellId(src.id, d.id);
        if (!id || !opts.cells.includes(id)) return el('span.mx-none', { 'aria-hidden': 'true' });
        const b = el('button.mx-cell', { type: 'button', 'aria-label': PARAMS[id].full ?? id, onclick: () => pick(id) }) as HTMLButtonElement;
        buttons.set(id, b);
        let locked = false;
        let off = false;
        cells.set(id, {
          el: b,
          set(pos) {
            const v = valueAt(id, rules.steps[id], pos);
            b.textContent = short(id, rules, pos);
            b.classList.toggle('pos', v > 0);
            b.classList.toggle('neg', v < 0);
            if (id === picked) amount?.set(pos);
          },
          setGhost(pos) {
            ghosts.set(id, pos);
            const zero = rules.steps[id].indexOf(0);
            b.classList.toggle('ghost', pos != null && pos !== zero);
            if (id === picked) amount?.setGhost(pos);
          },
          setState(state) {
            if (state.locked != null) locked = state.locked;
            if (state.disabled != null) off = state.disabled;
            b.classList.toggle('locked', locked);
            b.disabled = locked || off;
            if (id === picked) {
              amountLocked = locked;
              amountOff = off;
              amount?.setState({ locked, disabled: off });
            }
          },
        });
        return b;
      }),
    ),
  );

  const root = el('div.matrix', {}, el('div.mx-grid', { role: 'group', 'aria-label': 'Modulation matrix' }, head, body), el('div.mx-side', {}, pickedName, amountSlot));
  pick(picked);
  return { el: root, cells };
}
