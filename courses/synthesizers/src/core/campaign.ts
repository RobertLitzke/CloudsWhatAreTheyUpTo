// The stages: modules arrive one at a time, in the order a synth course would
// teach them.

import { parseKey } from './key';
import type { SaveData } from './storage';

export interface Stage {
  n: number;
  title: string;
  unlocks: string;
  teaches: string;
  /** Has a lesson card and practice puzzles. Rounds work at any generated stage. */
  lesson: boolean;
  /** The generator can produce rounds for it. */
  playable: boolean;
}

export const STAGES: readonly Stage[] = [
  { n: 1, title: 'Waveforms', unlocks: 'Wave, pulse width', teaches: 'Harmonics: hollow, buzzy and pure', lesson: true, playable: true },
  { n: 2, title: 'Filter', unlocks: 'Cutoff, resonance', teaches: 'Brightness and the resonant peak', lesson: true, playable: true },
  { n: 3, title: 'Envelopes', unlocks: 'Attack, decay, sustain, release, envelope amount', teaches: 'Pluck against swell; a filter that moves with each note', lesson: true, playable: true },
  { n: 4, title: 'Modulation', unlocks: 'LFO', teaches: 'Vibrato, wah, pulse-width sweep, tremolo', lesson: true, playable: true },
  { n: 5, title: 'Second oscillator', unlocks: 'Oscillator 2: level, detune, interval', teaches: 'Beating, thickness and intervals', lesson: true, playable: true },
  { n: 6, title: 'FM', unlocks: 'FM amount and ratio', teaches: 'Metallic and bell tones', lesson: true, playable: true },
  { n: 7, title: 'Drive', unlocks: 'A drive pedal: drive and tone', teaches: 'Clipping, grit and sustain', lesson: true, playable: true },
  { n: 8, title: 'Echo', unlocks: 'An echo pedal: time, repeats and mix', teaches: 'Repeats in time with the riff', lesson: true, playable: true },
  { n: 9, title: 'Signal chain', unlocks: 'Where the drive sits in the chain', teaches: 'Why the order of filter, drive and echo changes the sound', lesson: true, playable: true },
];

/**
 * A stage opens once any normal or hard round at the stage before it finishes
 * at this score or better. The number is a guess to tune.
 */
export const UNLOCK_AT = 6;

export const PRACTICE_PUZZLES = 4;

/** The best round score at a stage and tier, or null if none was finished. */
export function stageBest(save: SaveData, stage: number, tier: string): { key: string; diff: number } | null {
  let best: { key: string; diff: number } | null = null;
  for (const entry of save.rounds) {
    const parsed = parseKey(entry.key);
    if (!parsed || parsed.key.stage !== stage || parsed.key.tier !== tier) continue;
    if (best == null || entry.best < best.diff) best = { key: entry.key, diff: entry.best };
  }
  return best;
}

/** The highest stage the player's rounds have opened. */
export function stageReached(save: SaveData): number {
  let reached = 1;
  while (reached < STAGES.length) {
    const passed = (['N', 'H'] as const).some((tier) => {
      const record = stageBest(save, reached, tier);
      return record != null && record.diff <= UNLOCK_AT;
    });
    if (!passed) break;
    reached++;
  }
  return reached;
}

export function stageOpen(save: SaveData, stage: number): boolean {
  return save.unlockAll || stage <= stageReached(save);
}
