// A sound of a figure's own, apart from the synth's riff: a held tone built
// from native nodes on the engine's audio context (one context per page), with
// a play button that takes its turn with every other sound on the page (claim.ts).

import { el } from 'didactics/dom';
import type { FigureContext } from 'didactics/figure';
import { getEngine } from './engine';
import { claim, release } from './claim';

/** What a figure builds when its tone starts: `update` follows the figure's controls, `stop` lets it go. */
export interface Live {
  update(): void;
  stop(): void;
}

export interface Sounder {
  /** The play / stop button. */
  button: HTMLButtonElement;
  /** The controls moved: let the sounding tone follow. */
  update(): void;
  readonly playing: boolean;
}

/** How loud a figure's tone is, before the engine's limiter. */
const LEVEL = 0.18;

/**
 * A play button for a tone that `make` builds into `out`. The tone holds until
 * the button is pressed again, another sound starts, or the lesson closes.
 */
export function sounder(ctx: FigureContext, make: (ac: AudioContext, out: AudioNode) => Live, label = 'Play'): Sounder {
  let live: Live | null = null;
  let out: GainNode | null = null;
  const button = el('button.btn.sound-btn', { type: 'button' }, `▶ ${label}`) as HTMLButtonElement;
  const paint = () => {
    button.textContent = live ? '■ Stop' : `▶ ${label}`;
    button.setAttribute('aria-pressed', String(live != null));
  };
  const stop = () => {
    if (!live || !out) return;
    const ac = out.context;
    const g = out;
    const l = live;
    live = null;
    out = null;
    g.gain.setTargetAtTime(0, ac.currentTime, 0.02);
    setTimeout(() => {
      l.stop();
      g.disconnect();
    }, 150);
    release(stop);
    paint();
  };
  const start = () => {
    const engine = getEngine();
    engine.stop();
    const ac = engine.ctx;
    void ac.resume();
    claim(stop);
    out = ac.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(LEVEL, ac.currentTime, 0.02);
    out.connect(ac.destination);
    live = make(ac, out);
    paint();
  };
  button.addEventListener('click', () => (live ? stop() : start()));
  ctx.closed.addEventListener('abort', stop);
  paint();
  return {
    button,
    update: () => live?.update(),
    get playing() {
      return live != null;
    },
  };
}

/** A tone of these harmonic amplitudes (index 0 is the fundamental) at `hz`, as one oscillator. */
export function harmonicWave(ac: BaseAudioContext, amps: readonly number[]): PeriodicWave {
  const real = new Float32Array(amps.length + 1);
  const imag = new Float32Array(amps.length + 1);
  amps.forEach((a, i) => (imag[i + 1] = a));
  return ac.createPeriodicWave(real, imag, { disableNormalization: false });
}
