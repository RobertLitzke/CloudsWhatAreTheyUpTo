// The synth's engine as a figure uses it: one riff looping on one sound, a
// scope showing it, and the page's one-sound-at-a-time rule (audio/claim).
// The live synth and the sound figure both play through this.

import { getEngine, peekEngine, type Loop } from '../audio/engine';
import { GAME_STAGES } from '../core/params';
import { claim, release } from '../audio/claim';
import type { Sound } from '../core/params';
import type { Riff } from '../core/riffs/types';
import { createScope, type Scope } from '../game/components/scope';
import { updateSave } from '../game/store';

export interface Player {
  scope: Scope;
  /** Play `sound`, or switch to it if this player is already sounding. */
  play(sound: Sound): void;
  stop(): void;
  playing(): boolean;
  /** Play one note from a keyboard (null lifts it). The loop stops; the keyboard has the synth until another figure takes it. */
  key(sound: Sound, midi: number | null, vel?: number): void;
  /** How hard the held key is leaned on. */
  pressure(p: number): void;
  /** Every key held, for a paraphonic voice. */
  hold(held: readonly number[]): void;
  /** Has the synth now, from its loop or its keyboard. */
  owns(): boolean;
  /** Change the sound while it is sounding, from either. */
  update(sound: Sound): void;
  /** Play this loop instead of the riff from now on (a sequencer's notes), switching over in place if playing. */
  setLoop(loop: Loop): void;
  /** Called whenever it starts or stops, to repaint buttons. */
  onChange: () => void;
}

/** `stage`: playing counts that PatchMatch stage's lesson as read in the game (the course's later stages are not the game's). */
export function player(closed: AbortSignal, riff: Riff, stage?: number): Player {
  const scope = createScope();
  let mine = false;
  let custom: Loop | null = null;
  const read = () => {
    if (stage && stage <= GAME_STAGES) updateSave((s) => (s.lessons.includes(stage) ? s : { ...s, lessons: [...s.lessons, stage] }));
  };
  const p: Player = {
    scope,
    onChange: () => {},
    playing: () => mine && peekEngine()?.playing === true,
    owns: () => mine,
    update: (sound) => {
      if (mine) peekEngine()?.setSound(0, sound);
    },
    pressure: (p) => {
      if (mine) peekEngine()?.pressure(p);
    },
    hold: (held) => {
      if (mine) peekEngine()?.hold(held);
    },
    key: (sound, midi, vel) => {
      const engine = getEngine();
      if (!mine) {
        if (midi == null) return;
        claim(p.stop);
        mine = true;
        engine.onState = () => p.onChange();
        engine.setVoices([sound]);
        scope.start(engine.analyser);
        read();
      } else {
        // Playing the loop: the key stops it, and that is not this player stopping.
        engine.onState = () => p.onChange();
      }
      engine.key(midi, riff.six * riff.bar, vel);
      p.onChange();
    },
    stop: () => {
      if (!mine) return;
      mine = false;
      scope.stop();
      const engine = peekEngine();
      if (engine) {
        engine.onState = null;
        engine.stop();
        engine.key(null);
      }
      release(p.stop);
      p.onChange();
    },
    setLoop: (loop) => {
      custom = loop;
      const engine = peekEngine();
      if (mine && engine?.playing) engine.swapLoop(loop);
    },
    play: (sound) => {
      const engine = getEngine();
      if (mine && engine.playing) {
        engine.setSound(0, sound);
        return;
      }
      claim(p.stop);
      mine = true;
      engine.onState = () => {
        if (!engine.playing) p.stop();
        p.onChange();
      };
      if (custom) engine.setLoop(custom);
      else engine.setRiff(riff);
      engine.setVoices([sound]);
      engine.start();
      scope.start(engine.analyser);
      read();
      p.onChange();
    },
  };
  closed.addEventListener('abort', p.stop);
  return p;
}
