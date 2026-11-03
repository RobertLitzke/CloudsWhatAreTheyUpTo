import type { RoundKey } from '../key';
import type { ParamId, Patch, Sound, StepTable } from '../params';

/** What a generator version fixes about how its patches are played and scored. */
export interface Rules {
  steps: StepTable;
  /** Positions held by every parameter the stage has not unlocked. */
  defaults: Patch;
  active: (id: ParamId, sound: Sound) => boolean;
  /**
   * Do positions `a` and `b` of a knob give the same sound, with every other
   * knob as in `sound`? Either one then matches the target.
   */
  alike: (id: ParamId, a: number, b: number, sound: Sound) => boolean;
}

export interface Puzzle {
  key: RoundKey;
  /** 0-based. */
  index: number;
  riffId: number;
  target: Patch;
  start: Patch;
  /** Hidden until the puzzle is committed. */
  goal: number;
  /** The fewest moves that reach the target. */
  turns: number;
  /** Parameters that differ between start and target. */
  diffs: ParamId[];
  /** Of those, the ones that cannot be heard until another knob is fixed. */
  gated: ParamId[];
  /** Parameters the stage lets the player turn. */
  unlocked: ParamId[];
  rules: Rules;
}
