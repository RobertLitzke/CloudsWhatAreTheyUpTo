// Render a sound playing a loop to samples, with the same Voice the game plays
// through. For the audit page and for checks that need numbers rather than ears.

import type { Sound } from '../core/params';
import { midiToHz } from '../core/riffs/notation';
import type { Loop } from './engine';
import { Voice } from './voice';

export const RENDER_RATE = 44100;

/** One channel of `passes` passes of the loop, starting at time zero. */
export async function renderLoop(sound: Sound, loop: Loop, passes = 1): Promise<Float32Array> {
  const total = loop.duration * passes;
  const ctx = new OfflineAudioContext(1, Math.ceil(total * RENDER_RATE), RENDER_RATE);
  const voice = new Voice(ctx, ctx.destination, sound, 0);
  voice.out.gain.value = 1;
  const { notes, duration } = loop;
  for (let pass = 0; pass < passes; pass++) {
    const start = pass * duration;
    voice.startLoop(start, duration, loop.barSeconds, loop.sixSeconds);
    notes.forEach((n, i) => {
      const last = i + 1 === notes.length;
      const next = start + (last ? duration + notes[0].on : notes[i + 1].on);
      voice.note(start + n.on, Math.min(start + n.off, next), next, midiToHz(n.midi), n.vel, n.press, n.legato);
    });
  }
  return (await ctx.startRendering()).getChannelData(0);
}
