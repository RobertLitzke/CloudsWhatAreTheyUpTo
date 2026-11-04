// The sound a lesson is after, or the puzzle it opens on: a few settings of
// the synth to listen to side by side, nothing to turn yet. Each lesson's
// first part plays one, and its last live synth asks the reader to make it.
//
//   { "type": "diagram", "id": "sound", "options": { "stage": 4, "riff": 58,
//     "start": { "wave": 1 }, "sounds": [{ "name": "Straight", "set": {} },
//     { "name": "Singing", "set": { "lfoDepth": 1, "lfoRate": 4 } }] } }

import { el } from 'didactics/dom';
import type { FigureContext, FigureFactory, FigureHandle, Options } from 'didactics/figure';
import { LATEST_RULES } from '../core/gen';
import { PARAM_IDS, resolve, type ParamId, type Patch } from '../core/params';
import { RIFFS, riffById } from '../core/riffs';
import { riffLoop } from '../audio/engine';
import { player } from './player';

export interface SoundOptions extends Options {
  stage: number;
  riff?: number;
  start?: Partial<Patch>;
  /** Each sound may loop its own riff instead of the figure's. */
  sounds: { name: string; set: Partial<Patch>; riff?: number }[];
}

const isParam = (id: string): id is ParamId => (PARAM_IDS as readonly string[]).includes(id);

function problems(o: Options | undefined): string[] {
  const s = o as SoundOptions | undefined;
  if (!s?.sounds || s.sounds.length < 2) return ['needs two or more "sounds" to compare'];
  const out: string[] = [];
  for (const set of [s.start ?? {}, ...s.sounds.map((x) => x.set)]) {
    for (const [id, pos] of Object.entries(set)) {
      if (!isParam(id)) out.push(`no knob "${id}"`);
      else if (pos < 0 || pos >= LATEST_RULES.steps[id].length) out.push(`${id} has no position ${pos}`);
    }
  }
  for (const r of [s.riff, ...s.sounds.map((x) => x.riff)]) if (r != null && !riffById(r)?.pd) out.push(`riff ${r} is not one of the public-domain riffs every build has`);
  return out;
}

const make = (ctx: FigureContext, _goal?: string, options?: Options): FigureHandle => {
  const o = (options ?? { stage: 1, sounds: [] }) as SoundOptions;
  const rules = LATEST_RULES;
  const riff = riffById(o.riff ?? 69) ?? RIFFS[0];
  const sound = player(ctx.closed, riff, o.stage);
  let on = -1;
  const note = el('p.note', {}, `Press one to hear it. ${riff.title} loops on each.`);
  const buttons = o.sounds.map((s, i) =>
    el('button.btn.btn-small', {
      type: 'button',
      onclick: () => {
        if (sound.playing() && on === i) return sound.stop();
        if (sound.playing() && on !== i && (s.riff ?? riff.id) !== (o.sounds[on]?.riff ?? riff.id)) sound.stop();
        on = i;
        sound.setLoop(riffLoop(riffById(s.riff ?? riff.id) ?? riff));
        sound.play(resolve({ ...rules.defaults, ...o.start, ...s.set }, rules.steps));
        paint();
      },
    }, s.name) as HTMLButtonElement);
  const paint = () => {
    const playing = sound.playing();
    buttons.forEach((b, i) => {
      const lit = playing && on === i;
      b.classList.toggle('on', lit);
      b.textContent = `${lit ? '■' : '▶'} ${o.sounds[i].name}`;
    });
  };
  sound.onChange = paint;
  paint();
  return { node: el('div.fig-body', {}, el('div.synth-fig.pm.sound-fig', {}, el('div.sounds', {}, buttons), sound.scope.el, note)) };
};

/** Each block is its own set of sounds, so a gallery shows them all. */
export const soundFigure: FigureFactory = Object.assign(make, { options: problems, each: true as const });
