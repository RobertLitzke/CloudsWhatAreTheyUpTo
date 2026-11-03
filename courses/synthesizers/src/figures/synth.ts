// The live synth in a lesson: PatchMatch's synth (src/audio, src/core) with
// a scope and a few of its knobs, looping a riff while the reader turns them.
// One figure is one old PatchMatch lesson part: the lesson's JSON says which
// knobs, where every knob starts, and the goal.
//
//   { "type": "interactive_diagram", "id": "synth", "goal": "wave-all",
//     "options": { "stage": 1, "knobs": ["wave"], "start": { "wave": 0 } } }
//
// Options: `knobs` (controls, in order), `pad` (two knobs as one square:
// across, then up), `flow` (draw the signal chain), `panel` (the whole panel
// of the stage's modules, as a puzzle shows it, with `also` naming knobs of
// earlier stages left live), `examples` (ready-made settings as buttons),
// `riff` (a riff id; public-domain riffs only, so every build has it),
// `start` (knob positions on the step tables, set as the figure opens) and
// `target` (a sound to make, with a button to hear it; the goal "match" is
// done when the knobs reach it, as in a PatchMatch puzzle), `keys` (a keyboard
// to play notes by hand; a number is its lowest C as a MIDI note) and `strip`
// (lesson 10's signal strip: how far the sound gets).
//
// `stage` is a PatchMatch stage (1-9) or one of the course's later lessons
// (10 on), whose knobs the game never draws.
//
// Knobs move in the same steps as PatchMatch's puzzles. Goals are tested on
// the settings now and on every setting visited since the figure opened.

import { el } from 'didactics/dom';
import { figure, type Options } from 'didactics/figure';
import { LATEST_RULES } from '../core/gen';
import { LAST_STAGE, PARAMS, PARAM_IDS, resolve, valueAt, type ParamId, type Patch } from '../core/params';
import { reach } from '../core/reach';
import { RIFFS, riffById } from '../core/riffs';
import { createFlow, type Flow } from '../game/components/flow';
import type { Knob } from '../game/components/knob';
import { createPad, type Pad } from '../game/components/pad';
import { createKeys } from '../game/components/keys';
import { createControl, createPanel, type Panel } from '../game/components/panel';
import { player } from './player';
import { createStrip, type Strip } from './strip';

type Log = readonly Patch[];
/** How many different positions of a knob the log has been through. */
const tried = (log: Log, id: ParamId) => new Set(log.map((p) => p[id])).size;
const been = (log: Log, id: ParamId, pos: number) => log.some((p) => p[id] === pos);

/** Every goal a lesson can set the synth, by name. */
export const SYNTH_GOALS: Readonly<Record<string, (now: Patch, log: Log) => boolean>> = {
  // Stage 1: waveforms
  'wave-all': (_, log) => tried(log, 'wave') >= 4,
  'wave-sine': (now) => now.wave === 3,
  'pw-thin': (now) => now.pw === 4,
  'pw-dark': (now) => now.wave !== 1,
  // Stage 2: the filter
  'cutoff-low': (now) => now.cutoff <= 1,
  'res-top': (now) => now.res === 4,
  'res-sweep': (_, log) => new Set(log.filter((p) => p.res >= 3).map((p) => p.cutoff)).size >= 5,
  'dark-smooth': (now) => now.cutoff <= 2 && now.res === 0,
  // Stage 3: envelopes
  'attack-slow': (now) => now.attack >= 3,
  pluck: (now) => now.sustain === 0 && now.decay <= 1,
  'release-long': (now) => now.release >= 3,
  'env-filter': (now) => now.envAmt >= 2,
  // Stage 4: the LFO
  'lfo-deep': (now) => now.lfoDepth >= 3,
  'lfo-rates': (_, log) => been(log, 'lfoRate', 0) && been(log, 'lfoRate', 4),
  'lfo-dests': (_, log) => tried(log, 'lfoDest') >= 4,
  'lfo-wah': (now) => now.lfoRate >= 3 && now.lfoDepth >= 3,
  // Stage 5: the second oscillator
  'osc2-up': (now) => now.osc2Level >= 3,
  'detune-both': (_, log) => been(log, 'osc2Detune', 0) && been(log, 'osc2Detune', 4),
  'interval-all': (_, log) => tried(log, 'osc2Interval') >= 4,
  'osc2-dark': (now) => now.osc2Level > 0 && now.osc2Detune === 0 && now.osc2Interval === 0,
  // Stage 6: FM
  'fm-up': (now) => now.fmAmount >= 3,
  'fm-ratios': (_, log) => tried(log, 'fmRatio') >= 5,
  'fm-bell': (now) => now.fmRatio >= 3 && now.fmAmount >= 3,
  'fm-saw': (now) => now.wave === 0 && now.fmAmount >= 2,
  // Stage 7: drive
  'drive-up': (now) => now.drive >= 3,
  'drive-sustain': (_, log) => been(log, 'drive', 0) && been(log, 'drive', 4),
  'tone-down': (now) => now.driveTone <= 1,
  'gritty-dark': (now) => now.cutoff >= 5 && now.driveTone <= 1,
  // Stage 8: echo
  'echo-mix': (now) => now.echoMix >= 2,
  'echo-times': (_, log) => tried(log, 'echoTime') >= 4,
  'echo-repeats': (now) => now.echoRepeats === 3,
  'echo-trail': (now) => now.echoMix === 1 && now.echoRepeats === 3,
  // Stage 9: the chain
  'chain-first': (now) => now.chain === 0,
  'chain-cutoff': (_, log) => [0, 1].every((place) => log.some((p) => p.chain === place && p.cutoff <= 1)),
  'chain-last': (_, log) => been(log, 'chain', 1) && been(log, 'chain', 2),
  'chain-dark': (now) => now.drive === 0,
  // Lesson 10: the silent key
  heard: (now) => reach(resolve(now, LATEST_RULES.steps)).fades === null,
  'osc-off-on': (now, log) => been(log, 'oscLevel', 0) && reach(resolve(now, LATEST_RULES.steps)).fades === null,
  // Lesson 11: noise and the filter's modes
  'noise-only': (now) => now.oscLevel === 0 && now.noise >= 3,
  'modes-all': (_, log) => tried(log, 'filterMode') >= 4,
  'bp-whistle': (now) => now.filterMode === 2 && now.res >= 3,
  'hp-thin': (now) => now.filterMode === 3 && now.cutoff >= 4,
  // Lesson 12: envelope 2 on pitch
  'env2-up': (now) => now.env2Amt >= 3,
  'env2-falls': (_, log) => been(log, 'env2Fall', 0) && been(log, 'env2Fall', 4),
  // Lesson 13: LFO shapes and sample and hold
  'shapes-all': (_, log) => tried(log, 'lfoShape') >= 5,
  // Lesson 14: the cycling envelope
  'env2-rise': (now) => now.env2Rise >= 3,
  'env2-modes': (_, log) => tried(log, 'env2Mode') >= 3,
  // Any stage: the reader's patch matches the figure's target on every knob the target sets.
  match: () => false,
};

/** The test for a figure's goal: by name, or for "match" against the figure's own target. */
export function goalFor(name: string, o: SynthOptions): ((now: Patch, log: Log) => boolean) | undefined {
  if (name !== 'match') return SYNTH_GOALS[name];
  const want = Object.entries(o.target?.set ?? {}) as [ParamId, number][];
  return (now) => want.length > 0 && want.every(([id, pos]) => now[id] === pos);
}

export interface SynthOptions extends Options {
  /** The PatchMatch stage it teaches: its knobs are the panel's, and playing it counts the stage's lesson as read in the game. */
  stage: number;
  start?: Partial<Patch>;
  knobs?: ParamId[];
  pad?: [ParamId, ParamId];
  flow?: boolean;
  panel?: boolean;
  also?: ParamId[];
  examples?: { name: string; set: Partial<Patch> }[];
  riff?: number;
  /** The sound to make: a name for its button, and the knob positions it sets on top of `start`. With goal "match", reaching them is the task. */
  target?: { name: string; set: Partial<Patch> };
  /** A keyboard under the knobs; a number is its lowest C (MIDI, 48 is C3). */
  keys?: boolean | number;
  strip?: boolean;
}

const isParam = (id: unknown): id is ParamId => typeof id === 'string' && (PARAM_IDS as readonly string[]).includes(id);

function problems(o: Options | undefined): string[] {
  const s = o as SynthOptions | undefined;
  if (!s) return ['needs options: at least a "stage"'];
  const out: string[] = [];
  if (!Number.isInteger(s.stage) || s.stage < 1 || s.stage > LAST_STAGE) out.push(`stage ${s.stage} is not a stage of the synth (1 to ${LAST_STAGE})`);
  const ids = [...(s.knobs ?? []), ...(s.pad ?? []), ...(s.also ?? []), ...Object.keys(s.start ?? {}), ...(s.examples ?? []).flatMap((e) => Object.keys(e.set)), ...Object.keys(s.target?.set ?? {})];
  for (const id of ids) if (!isParam(id)) out.push(`no knob "${id}"`);
  for (const [id, pos] of Object.entries(s.start ?? {})) {
    if (isParam(id) && (pos < 0 || pos >= LATEST_RULES.steps[id].length)) out.push(`start: ${id} has no position ${pos}`);
  }
  if (!s.knobs?.length && !s.pad && !s.panel) out.push('has nothing to turn: give it "knobs", a "pad" or the "panel"');
  if (s.target) {
    const turnable = new Set<string>([...(s.knobs ?? []), ...(s.pad ?? []), ...(s.panel ? PARAM_IDS.filter((id) => PARAMS[id].stage === s.stage || s.also?.includes(id)) : [])]);
    for (const [id, pos] of Object.entries(s.target.set)) {
      if (!turnable.has(id)) out.push(`target: "${id}" is not one of the figure's controls`);
      if (isParam(id) && (pos < 0 || pos >= LATEST_RULES.steps[id].length)) out.push(`target: ${id} has no position ${pos}`);
    }
    if (Object.entries(s.target.set).every(([id, pos]) => ({ ...LATEST_RULES.defaults, ...s.start })[id as ParamId] === pos)) out.push('target: the figure already starts on it');
  }
  if (s.riff != null && !riffById(s.riff)?.pd) out.push(`riff ${s.riff} is not one of the public-domain riffs every build has`);
  return out;
}

export const synthFigure = figure<SynthOptions>(
  Object.keys(SYNTH_GOALS),
  (ctx, t, options) => {
    const o = options ?? ({ stage: 1 } as SynthOptions);
    const rules = LATEST_RULES;
    const riff = riffById(o.riff ?? 69) ?? RIFFS[0];
    const goal = t.goal ? goalFor(t.goal, o) : undefined;
    let patch: Patch = { ...rules.defaults, ...o.start };
    const log: Patch[] = [patch];

    const clamp = (id: ParamId, pos: number) => Math.min(rules.steps[id].length - 1, Math.max(0, Math.round(pos)));
    const fmt = (id: ParamId, pos: number) => PARAMS[id].format(valueAt(id, rules.steps[id], pos));

    // --- sound: yours, or the target's -----------------------------------------
    const target = o.target ? { ...patch, ...o.target.set } : null;
    const sound = player(ctx.closed, riff, o.stage);
    let hearing: 'yours' | 'target' = 'yours';
    const play = el('button.btn.play.btn-primary', { type: 'button', 'aria-label': 'Play' }, '▶') as HTMLButtonElement;
    const hear = target
      ? (el('button.btn.btn-small.hear', { type: 'button' }) as HTMLButtonElement)
      : null;
    const paintPlay = () => {
      const on = sound.playing();
      play.textContent = on && hearing === 'yours' ? '■' : '▶';
      play.setAttribute('aria-label', on && hearing === 'yours' ? 'Stop' : 'Play yours');
      if (hear) {
        const onTarget = on && hearing === 'target';
        hear.textContent = onTarget ? `■ ${o.target!.name}` : `▶ ${o.target!.name}`;
        hear.classList.toggle('on', onTarget);
      }
    };
    sound.onChange = paintPlay;
    /** Whether the reader is playing it from the keyboard rather than the loop. */
    let byHand = false;
    const start = () => {
      byHand = false;
      hearing = 'yours';
      sound.play(resolve(patch, rules.steps));
      paintPlay();
    };
    play.addEventListener('click', () => (sound.playing() && hearing === 'yours' ? sound.stop() : start()));
    hear?.addEventListener('click', () => {
      if (sound.playing() && hearing === 'target') return sound.stop();
      hearing = 'target';
      sound.play(resolve(target!, rules.steps));
      paintPlay();
    });
    const scope = sound.scope;

    // --- the controls, all showing the one patch ----------------------------------
    const knobs: { id: ParamId; knob: Knob }[] = [];
    const pads: { x: ParamId; y: ParamId; pad: Pad }[] = [];
    let flow: Flow | null = null;
    const strip: Strip | null = o.strip ? createStrip() : null;
    let panel: Panel | null = null;
    const refresh = () => {
      const sound = resolve(patch, rules.steps);
      for (const { id, knob } of knobs) {
        knob.set(patch[id]);
        knob.setState({ inactive: !rules.active(id, sound) });
      }
      for (const { x, y, pad } of pads) pad.set(patch[x], patch[y]);
      flow?.set(sound);
      strip?.set(sound);
      panel?.update(patch);
    };
    const change = (next: Partial<Patch>) => {
      const moved = { ...patch };
      for (const [id, pos] of Object.entries(next) as [ParamId, number][]) moved[id] = clamp(id, pos);
      patch = moved;
      log.push(patch);
      refresh();
      // Turning something is a request to hear it: through the loop, or on
      // the next key if the reader has been playing the keyboard.
      if (byHand && sound.owns()) sound.update(resolve(patch, rules.steps));
      else start();
      if (goal?.(patch, log)) t.done();
      if (matched) matched.hidden = !goal?.(patch, log);
    };

    const controls: HTMLElement[] = [];
    if (o.flow) {
      flow = createFlow();
      controls.push(flow.el);
    }
    for (const id of o.knobs ?? []) {
      const knob = createControl(id, rules, false, () => patch[id], (pos) => change({ [id]: pos }));
      knobs.push({ id, knob });
      controls.push(knob.el);
    }
    if (o.pad) {
      const [x, y] = o.pad;
      const pad = createPad({
        x: { label: PARAMS[x].label, count: rules.steps[x].length, format: (pos) => fmt(x, pos) },
        y: { label: PARAMS[y].label, count: rules.steps[y].length, format: (pos) => fmt(y, pos) },
        onPick: (px, py) => change({ [x]: px, [y]: py }),
      });
      pads.push({ x, y, pad });
      controls.push(pad.el);
    }
    if (o.panel) {
      panel = createPanel({
        rules,
        patch,
        enabled: PARAM_IDS.filter((id) => PARAMS[id].stage === o.stage || o.also?.includes(id)),
        stage: o.stage,
        continuous: false,
        onMove: (id, pos) => change({ [id]: pos }),
      });
    }
    const examples = o.examples?.length
      ? el('div.examples', {}, el('span.caps', {}, 'Try'), o.examples.map((ex) => el('button.btn.btn-small', { type: 'button', onclick: () => change(ex.set) }, ex.name)))
      : null;

    const keys = o.keys
      ? createKeys({
          base: typeof o.keys === 'number' ? o.keys : 48,
          typing: () => byHand && sound.owns(),
          onNote: (midi) => {
            if (midi != null) {
              byHand = true;
              hearing = 'yours';
            }
            if (byHand) sound.key(resolve(patch, rules.steps), midi);
          },
        })
      : null;
    if (keys) ctx.closed.addEventListener('abort', () => keys.destroy());

    const matched = target && t.goal === 'match' ? (el('p.matched', { hidden: true }, `That's it: ${o.target!.name.toLowerCase()}.`) as HTMLElement) : null;
    refresh();
    paintPlay();
    return el(
      'div.synth-fig.pm',
      {},
      el(
        'div.synth-head',
        {},
        play,
        hear,
        el(
          'p.note',
          {},
          (target ? `▶ plays yours, the other button the sound you're after. ${riff.title} loops on both.` : `${riff.title} loops while you turn the knobs.`) +
            (keys ? ' Or play the keys yourself; once you have, your computer keys play them too.' : ''),
        ),
      ),
      scope.el,
      strip?.el ?? null,
      controls.length ? el('div.part-controls', {}, controls) : null,
      examples,
      panel?.el ?? null,
      keys?.el ?? null,
      matched,
    );
  },
  { options: problems },
);
