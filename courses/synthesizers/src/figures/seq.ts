// Lesson 20, The bass line nobody played: a sixteen-step sequencer driving
// the synth. Tap a square to put a note on that step (tap it again for a
// rest); the rows below mark a step as accented (struck harder, so brighter
// and louder through the patch's velocity routes), slid (held into the next
// note, which glides to it without a new pluck) or tied (the note before it
// carries on through it). Swing delays every second step. The pattern plays
// as it is edited, and four of the synth's knobs sit beside it.
//
//   { "type": "interactive_diagram", "id": "seq", "goal": "seq-made",
//     "options": { "start": { "cutoff": 1 }, "knobs": ["cutoff", "res"] } }

import { el, svg } from 'didactics/dom';
import { figure, type Options } from 'didactics/figure';
import type { Loop } from '../audio/engine';
import { LATEST_RULES } from '../core/gen';
import { PARAM_IDS, resolve, type ParamId, type Patch } from '../core/params';
import { riffById } from '../core/riffs';
import { midiOf } from '../core/riffs/notation';
import type { Knob } from '../game/components/knob';
import { createControl } from '../game/components/panel';
import { player } from './player';

export interface SeqOptions extends Options {
  /** The patch the pattern plays through, on top of the sequencer's own (legato, glide, accent routes). */
  start?: Partial<Patch>;
  /** Knobs beside the grid. */
  knobs?: ParamId[];
}

const STEPS = 16;
const BPM = 120;
/** The rows, low to high: A minor pentatonic over two octaves, a bass line's notes. */
const ROWS = ['A1', 'C2', 'D2', 'E2', 'G2', 'A2', 'C3', 'D3'].map((n) => midiOf(n)!);
const NAMES = ['A', 'C', 'D', 'E', 'G', 'A', 'C', 'D'];
/** How hard a plain and an accented step are struck. */
const PLAIN = 0.45;
const ACCENT = 1;
const SWINGS = [0, 0.33, 0.5];

interface Step {
  /** A row, or null for a rest. */
  row: number | null;
  accent: boolean;
  slide: boolean;
  tie: boolean;
}

/** The sequencer's own settings: legato so slides glide without a new pluck, and accents through velocity. */
const BASE: Partial<Patch> = { legato: 1, glide: 1, mxVelCutoff: 8, mxVelLevel: 5 };

/** The pattern as notes: ties lengthen the note before, slides hold a note into the next. */
export function seqLoop(steps: readonly Step[], swing: number): Loop {
  const six = 60 / BPM / 4;
  const at = (i: number) => (i + (i % 2 === 1 ? swing : 0)) * six;
  const notes: Loop['notes'][number][] = [];
  let slidIn = false;
  for (let i = 0; i < STEPS; i++) {
    const s = steps[i];
    if (s.row == null || (s.tie && i > 0 && notes.length > 0 && steps[i - 1].row != null)) continue;
    let end = i + 1;
    while (end < STEPS && steps[end].tie && steps[end].row != null) end++;
    const held = s.slide && end < STEPS && steps[end].row != null;
    notes.push({
      on: at(i),
      off: held ? at(end) : at(i) + (at(end) - at(i)) * 0.75,
      midi: ROWS[s.row],
      vel: s.accent ? ACCENT : PLAIN,
      legato: slidIn,
    });
    slidIn = held;
  }
  return { notes, duration: STEPS * six, barSeconds: 16 * six, sixSeconds: six };
}

const START: Step[] = Array.from({ length: STEPS }, (_, i) => ({
  row: [0, null, 0, 5, null, 0, 2, null, 0, null, 0, 3, 4, null, 1, 0][i],
  accent: i === 0 || i === 6 || i === 12,
  slide: i === 3 || i === 11,
  tie: false,
}));

export const seqFigure = figure<SeqOptions>(['seq-made'], (ctx, t, options) => {
  const o = options ?? {};
  const rules = LATEST_RULES;
  let patch: Patch = { ...rules.defaults, ...BASE, ...o.start };
  const steps: Step[] = START.map((s) => ({ ...s }));
  let swing = 0;
  let edits = 0;
  const sound = player(ctx.closed, riffById(101)!, 20);
  const loop = () => seqLoop(steps, SWINGS[swing]);
  sound.setLoop(loop());

  const play = el('button.btn.play.btn-primary', { type: 'button', 'aria-label': 'Play' }, '▶') as HTMLButtonElement;
  const paintPlay = () => {
    play.textContent = sound.playing() ? '■' : '▶';
    play.setAttribute('aria-label', sound.playing() ? 'Stop' : 'Play');
  };
  sound.onChange = paintPlay;
  play.addEventListener('click', () => (sound.playing() ? sound.stop() : sound.play(resolve(patch, rules.steps))));

  // --- the grid ----------------------------------------------------------------------
  const W = 400;
  const X0 = 30;
  const cw = (W - X0) / STEPS;
  const ch = 19;
  const GRID_H = ROWS.length * ch;
  const FLAG = 18;
  const H = GRID_H + 3 * FLAG + 10;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'seq-grid', role: 'group', 'aria-label': 'Step sequencer' });
  const g = svg('g');
  root.append(g);
  const flags = ['accent', 'slide', 'tie'] as const;
  const flagNames = { accent: 'Acc', slide: 'Slide', tie: 'Tie' };

  const changed = () => {
    edits++;
    sound.setLoop(loop());
    paint();
    const notes = steps.filter((s) => s.row != null).length;
    if (edits >= 3 && notes >= 6 && steps.some((s) => s.accent && s.row != null) && steps.some((s) => s.slide && s.row != null)) t.done();
  };
  const paint = () => {
    const nodes: SVGElement[] = [];
    const label = (x: number, y: number, text: string) => {
      const node = svg('text', { x, y, 'text-anchor': 'end', class: 'seq-label' });
      node.textContent = text;
      return node;
    };
    for (let r = 0; r < ROWS.length; r++) nodes.push(label(X0 - 4, GRID_H - r * ch - 4, NAMES[r]));
    for (let i = 0; i < STEPS; i++) {
      const x = X0 + i * cw;
      for (let r = 0; r < ROWS.length; r++) {
        const y = GRID_H - (r + 1) * ch;
        const on = steps[i].row === r;
        const cell = svg('rect', {
          x: x + 0.5, y: y + 0.5, width: cw - 1, height: ch - 1, rx: 2,
          class: `seq-cell${on ? ' on' : ''}${on && steps[i].tie ? ' tied' : ''}${i % 4 === 0 ? ' beat' : ''}`,
        });
        cell.addEventListener('click', () => {
          steps[i].row = steps[i].row === r ? null : r;
          changed();
        });
        nodes.push(cell);
      }
      flags.forEach((flag, k) => {
        const y = GRID_H + 6 + k * FLAG;
        const lit = steps[i][flag];
        const box = svg('rect', { x: x + 2, y, width: cw - 4, height: FLAG - 4, rx: 2, class: `seq-flag ${flag}${lit ? ' on' : ''}` });
        box.addEventListener('click', () => {
          steps[i][flag] = !steps[i][flag];
          changed();
        });
        nodes.push(box);
      });
    }
    flags.forEach((flag, k) => nodes.push(label(X0 - 4, GRID_H + 6 + k * FLAG + 9, flagNames[flag])));
    g.replaceChildren(...nodes);
  };
  paint();

  // --- swing and the knobs -------------------------------------------------------------
  const swingBtns = SWINGS.map((_, i) =>
    el('button.btn.btn-small', { type: 'button', onclick: () => { swing = i; changed(); paintSwing(); } }, ['Straight', 'Swing', 'Heavy swing'][i]) as HTMLButtonElement);
  const paintSwing = () => swingBtns.forEach((b, i) => b.classList.toggle('on', i === swing));
  paintSwing();
  const knobs: { id: ParamId; knob: Knob }[] = (o.knobs ?? []).filter((id) => (PARAM_IDS as readonly string[]).includes(id)).map((id) => {
    const knob = createControl(id, rules, false, () => patch[id], (pos) => {
      patch = { ...patch, [id]: Math.min(rules.steps[id].length - 1, Math.max(0, Math.round(pos))) };
      knob.set(patch[id]);
      if (sound.playing()) sound.update(resolve(patch, rules.steps));
    });
    knob.set(patch[id]);
    return { id, knob };
  });

  return el(
    'div.synth-fig.pm.seq-fig',
    {},
    el('div.synth-head', {}, play, el('p.note', {}, 'Tap a square for a note, again for a rest. The rows below mark accents, slides and ties. It plays as you change it.')),
    sound.scope.el,
    root,
    el('div.examples', {}, el('span.caps', {}, 'Feel'), swingBtns),
    knobs.length ? el('div.part-controls', {}, knobs.map((k) => k.knob.el)) : null,
  );
});
