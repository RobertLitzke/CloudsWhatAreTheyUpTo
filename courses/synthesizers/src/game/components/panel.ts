// The synth panel: every module and knob, built from the parameter table.

import { isLive } from '../../core/active';
import type { Rules } from '../../core/gen';
import { GAME_STAGES, MODULES, PARAMS, resolve, valueAt, type ModuleId, type ParamId, type Patch } from '../../core/params';
import { el } from '../dom';
import { createFlow, type Flow } from './flow';
import { createKnob, createSelector, type Knob } from './knob';

export interface PanelOptions {
  rules: Rules;
  patch: Patch;
  /** Parameters in play. The rest are shown unlit and cannot be turned. */
  enabled: readonly ParamId[];
  /**
   * The stage being played. Everything past the four base modules joins the
   * panel at its own stage; before that it is left off, to keep a phone's
   * screen for the knobs that matter.
   */
  stage: number;
  /** Free play: knobs drag through fractional positions. */
  continuous: boolean;
  /** The player asked for `id` to move to `pos`. The owner decides whether it does. */
  onMove: (id: ParamId, pos: number) => void;
}

export interface Panel {
  el: HTMLElement;
  update(patch: Patch): void;
  /** Mark the target's positions on these knobs (or clear with null). */
  setGhosts(target: Patch | null, ids?: readonly ParamId[]): void;
  setDisabled(disabled: boolean): void;
}

/**
 * One parameter's control, a knob or a selector as the table says. `current`
 * gives the position it is at, for a stepped knob asked to move one detent.
 */
export function createControl(
  id: ParamId,
  rules: Rules,
  continuous: boolean,
  current: () => number,
  onMove: (pos: number) => void,
): Knob {
  const spec = PARAMS[id];
  const steps = rules.steps[id];
  if (spec.kind === 'selector') return createSelector({ label: spec.label, options: spec.options!, onPick: onMove });
  return createKnob({
    label: spec.label,
    count: steps.length,
    continuous,
    format: (pos) => spec.format(valueAt(id, steps, pos)),
    onStep: (dir) => onMove(current() + dir),
    // One call per detent crossed, so a jump costs what turning there would.
    onJump: (pos) => {
      const dir = pos > current() ? 1 : -1;
      for (let at = current() + dir; dir > 0 ? at <= pos : at >= pos; at += dir) onMove(at);
    },
    onChange: onMove,
  });
}

/**
 * The rows the modules sit in on a phone held sideways, where the whole panel
 * has to fit the height of the screen: two rows while they will hold it, three
 * once the pedals arrive. Upright and on a desk the modules wrap by themselves
 * and these rows are not drawn.
 */
function sidewaysRows(present: readonly ModuleId[]): ModuleId[][] {
  const has = (id: ModuleId) => present.includes(id);
  const rows: ModuleId[][] =
    has('fm') || has('drive')
      ? [
          ['osc', 'osc2', 'fm', 'noise'],
          ['filter', 'env', 'voice', 'chain'],
          ['lfo', 'drive', 'echo'],
        ]
      : [
          ['osc', 'osc2', 'filter'],
          ['env', 'lfo'],
        ];
  return rows.map((row) => row.filter(has)).filter((row) => row.length > 0);
}

/** A selector's column of names is wider than a knob. */
const SELECTOR_WIDTH = 1.3;

export function createPanel(opts: PanelOptions): Panel {
  const { rules } = opts;
  let patch = opts.patch;
  const knobs = new Map<ParamId, Knob>();

  const shown = MODULES.filter((mod) => mod.stage <= opts.stage);
  /** The game's panel shows its own knobs locked until their stage; the course's knobs only once the panel reaches them. */
  const onPanel = (id: ParamId) => PARAMS[id].stage <= Math.max(opts.stage, GAME_STAGES);
  /** The chain module also draws the order it sets. */
  const flow: Flow | null = shown.some((mod) => mod.id === 'chain') ? createFlow() : null;
  const sections = new Map<ModuleId, HTMLElement>();
  shown.forEach((mod, order) => {
    const controls = mod.params.filter(onPanel).map((id) => {
      const knob = createControl(id, rules, opts.continuous, () => patch[id], (pos) => opts.onMove(id, pos));
      knob.setState({ locked: !opts.enabled.includes(id) });
      knobs.set(id, knob);
      return knob.el;
    });
    const lit = mod.params.some((id) => opts.enabled.includes(id));
    const section = el(
      `section.module.module-${mod.id}${lit ? '' : '.unlit'}`,
      {},
      el('h3.module-title', {}, mod.label),
      el('div.module-controls', {}, controls, mod.id === 'chain' ? flow?.el : null),
    );
    // Rows group the modules for a sideways phone; this keeps them in signal
    // order wherever the rows are not drawn.
    section.style.order = String(order);
    sections.set(mod.id, section);
  });

  const width = (id: ModuleId) =>
    MODULES.find((mod) => mod.id === id)!.params.filter(onPanel).reduce((sum, p) => sum + (PARAMS[p].kind === 'selector' ? SELECTOR_WIDTH : 1), 0);
  const rows = sidewaysRows(shown.map((mod) => mod.id));
  const root = el(
    'div.panel',
    {},
    rows.map((row) => el('div.panel-row', {}, row.map((id) => sections.get(id)!))),
  );
  root.style.setProperty('--rows', String(rows.length));
  root.style.setProperty('--per-row', Math.max(...rows.map((row) => row.reduce((sum, id) => sum + width(id), 0))).toFixed(1));

  const render = () => {
    const sound = resolve(patch, rules.steps);
    for (const [id, knob] of knobs) {
      knob.set(patch[id]);
      // Locked: not in play at this stage, or it changes nothing in the patch as it stands.
      knob.setState({ locked: !opts.enabled.includes(id) || !isLive(id, sound) });
    }
    flow?.set(sound);
  };
  render();

  return {
    el: root,
    update(next) {
      patch = next;
      render();
    },
    setGhosts(target, ids) {
      for (const [id, knob] of knobs) {
        knob.setGhost(target && (!ids || ids.includes(id)) ? target[id] : null);
      }
    },
    setDisabled(disabled) {
      for (const knob of knobs.values()) knob.setState({ disabled });
    },
  };
}
