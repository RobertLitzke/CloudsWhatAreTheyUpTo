// Lesson 20, The bass line nobody played: a sixteen-step sequencer driving
// the synth. Tap a square to put a note on that step (tap it again for a
// rest); the rows below mark a step as accented (struck harder, so brighter
// and louder through the patch's velocity routes), slid (held into the next
// note, which glides to it without a new pluck) or tied (the note before it
// carries on through it). Swing delays every second step. The pattern plays
// as it is edited, and four of the synth's knobs sit beside it.
//
// Lesson 21 adds two options. `lane` draws a row of bars under the steps: a
// recorded cutoff move, its value on each step in octaves. `dice` adds Spice
// (how often a step is varied) and Dice (a new set of variations): a varied
// step is dropped, jumps an octave, or has its accent flipped.
//
//   { "type": "interactive_diagram", "id": "seq", "goal": "seq-made",
//     "options": { "start": { "cutoff": 1 }, "knobs": ["cutoff", "res"], "lane": true } }

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
  /** A cutoff lane under the steps. */
  lane?: boolean;
  /** Spice and Dice. */
  dice?: boolean;
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
const SPICES = [0, 0.25, 0.5, 1];
/** The lane's range, in octaves either way. */
const LANE_MAX = 2;

interface Step {
  /** A row, or null for a rest. */
  row: number | null;
  accent: boolean;
  slide: boolean;
  tie: boolean;
  /** The cutoff lane's value, in octaves. */
  lane: number;
}

/** A number from 0 to 1 for step `i` of variation set `seed`, and which way it varies. */
function roll(seed: number, i: number): { chance: number; kind: number } {
  let h = (Math.imul(seed + 1, 2654435761) ^ Math.imul(i + 7, 40503)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h ^= h >>> 13;
  return { chance: (h % 1000) / 1000, kind: (h >>> 10) % 3 };
}

/** The sequencer's own settings: legato so slides glide without a new pluck, and accents through velocity. */
const BASE: Partial<Patch> = { legato: 1, glide: 1, mxVelCutoff: 8, mxVelLevel: 5 };

/** The pattern as notes: ties lengthen the note before, slides hold a note into the next. */
export function seqLoop(steps: readonly Step[], swing: number, spice = 0, seed = 0): Loop {
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
    // Spice: some steps are varied, the same way until the dice are rolled again.
    const { chance, kind } = roll(seed, i);
    const varied = chance < spice;
    if (varied && kind === 0) {
      slidIn = false;
      continue;
    }
    const accent = varied && kind === 2 ? !s.accent : s.accent;
    notes.push({
      on: at(i),
      off: held ? at(end) : at(i) + (at(end) - at(i)) * 0.75,
      midi: ROWS[s.row] + (varied && kind === 1 ? 12 : 0),
      vel: accent ? ACCENT : PLAIN,
      legato: slidIn,
      lane: s.lane,
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
  lane: 0,
}));

export const seqFigure = figure<SeqOptions>(['seq-made', 'lane-made', 'lane-rise', 'dice-rolled'], (ctx, t, options) => {
  const o = options ?? {};
  const rules = LATEST_RULES;
  let patch: Patch = { ...rules.defaults, ...BASE, ...o.start };
  const steps: Step[] = START.map((s) => ({ ...s }));
  let swing = 0;
  let edits = 0;
  let spice = 0;
  let seed = 0;
  let rolls = 0;
  const sound = player(ctx.closed, riffById(101)!, 20);
  const loop = () => seqLoop(steps, SWINGS[swing], SPICES[spice], seed);
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
  const LANE_H = o.lane ? 46 : 0;
  const LANE_TOP = GRID_H + 3 * FLAG + 12;
  const H = GRID_H + 3 * FLAG + 10 + (o.lane ? LANE_H + 8 : 0);
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
    const goal = t.goal ?? 'seq-made';
    if (goal === 'seq-made' && edits >= 3 && notes >= 6 && steps.some((s) => s.accent && s.row != null) && steps.some((s) => s.slide && s.row != null)) t.done();
    if (goal === 'lane-made' && steps.filter((s) => s.lane !== 0).length >= 4) t.done();
    if (goal === 'lane-rise' && [0, 4, 8, 12].every((i, k, a) => k === 0 || steps[i].lane > steps[a[k - 1]].lane) && steps[12].lane >= 1) t.done();
    if (goal === 'dice-rolled' && rolls >= 2 && spice > 0) t.done();
  };
  /** A lane bar's value from where it was touched. */
  const laneAt = (y: number) => {
    const v = ((LANE_TOP + LANE_H / 2 - y) / (LANE_H / 2)) * LANE_MAX;
    return Math.max(-LANE_MAX, Math.min(LANE_MAX, Math.round(v * 2) / 2));
  };
  let drawing = false;
  const toSvgY = (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const drawLane = (e: PointerEvent) => {
    const { x, y } = toSvgY(e);
    const i = Math.floor((x - X0) / cw);
    if (i < 0 || i >= STEPS) return;
    const v = laneAt(y);
    if (steps[i].lane !== v) {
      steps[i].lane = v;
      changed();
    }
  };
  if (o.lane) {
    root.addEventListener('pointerdown', (e) => {
      const { y } = toSvgY(e);
      if (y < LANE_TOP - 4) return;
      drawing = true;
      root.setPointerCapture(e.pointerId);
      drawLane(e);
    });
    root.addEventListener('pointermove', (e) => drawing && drawLane(e));
    root.addEventListener('pointerup', () => (drawing = false));
    root.addEventListener('pointercancel', () => (drawing = false));
  }
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
    if (o.lane) {
      const mid = LANE_TOP + LANE_H / 2;
      nodes.push(svg('rect', { x: X0, y: LANE_TOP, width: W - X0, height: LANE_H, class: 'seq-lane-bg' }));
      nodes.push(svg('line', { x1: X0, y1: mid, x2: W, y2: mid, class: 'seq-lane-mid' }));
      nodes.push(label(X0 - 4, mid + 3, 'Cut'));
      for (let i = 0; i < STEPS; i++) {
        const v = steps[i].lane;
        const h = (Math.abs(v) / LANE_MAX) * (LANE_H / 2);
        nodes.push(svg('rect', { x: X0 + i * cw + 2, y: v >= 0 ? mid - h : mid, width: cw - 4, height: Math.max(1, h), class: 'seq-lane-bar' }));
      }
    }
    g.replaceChildren(...nodes);
  };
  paint();

  // --- swing and the knobs -------------------------------------------------------------
  const swingBtns = SWINGS.map((_, i) =>
    el('button.btn.btn-small', { type: 'button', onclick: () => { swing = i; changed(); paintSwing(); } }, ['Straight', 'Swing', 'Heavy swing'][i]) as HTMLButtonElement);
  const paintSwing = () => swingBtns.forEach((b, i) => b.classList.toggle('on', i === swing));
  paintSwing();
  const spiceBtns = SPICES.map((x, i) =>
    el('button.btn.btn-small', { type: 'button', onclick: () => { spice = i; changed(); paintSpice(); } }, x === 0 ? 'None' : `${Math.round(x * 100)} %`) as HTMLButtonElement);
  const paintSpice = () => spiceBtns.forEach((b, i) => b.classList.toggle('on', i === spice));
  paintSpice();
  const dice = el('button.btn.btn-small', { type: 'button', onclick: () => { seed++; rolls++; changed(); } }, '⚂ Dice');
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
    o.dice ? el('div.examples', {}, el('span.caps', {}, 'Spice'), spiceBtns, dice) : null,
    knobs.length ? el('div.part-controls', {}, knobs.map((k) => k.knob.el)) : null,
  );
});
