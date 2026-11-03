// The synth's engine as a figure uses it: one riff looping on one sound, a
// scope showing it, and the page's one-sound-at-a-time rule (audio/claim).
// The live synth and the sound figure both play through this.

import { getEngine, peekEngine } from '../audio/engine';
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
  /** Called whenever it starts or stops, to repaint buttons. */
  onChange: () => void;
}

/** `stage`: playing counts that PatchMatch stage's lesson as read in the game. */
export function player(closed: AbortSignal, riff: Riff, stage?: number): Player {
  const scope = createScope();
  let mine = false;
  const p: Player = {
    scope,
    onChange: () => {},
    playing: () => mine && peekEngine()?.playing === true,
    stop: () => {
      if (!mine) return;
      mine = false;
      scope.stop();
      const engine = peekEngine();
      if (engine) {
        engine.onState = null;
        engine.stop();
      }
      release(p.stop);
      p.onChange();
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
      engine.setRiff(riff);
      engine.setVoices([sound]);
      engine.start();
      scope.start(engine.analyser);
      if (stage) updateSave((s) => (s.lessons.includes(stage) ? s : { ...s, lessons: [...s.lessons, stage] }));
      p.onChange();
    },
  };
  closed.addEventListener('abort', p.stop);
  return p;
}
