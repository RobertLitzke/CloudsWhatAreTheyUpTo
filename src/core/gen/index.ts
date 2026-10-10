// Dispatch by key version. A version names a frozen generator and the riff pool
// it draws from; old versions stay here so old keys keep working.
//
//   1   generator v1, every riff
//   A   generator v1, public-domain riffs only (what a public-domain build mints)

import { PUZZLES_PER_ROUND, SEED_MAX, type RoundKey, type Tier } from '../key';
import { PARAM_IDS, PARAMS, type ParamId } from '../params';
import { PD_ONLY, riffById, type Riff } from '../riffs';
import type { Puzzle, Rules } from './types';
import * as v1 from './v1';

export type { Puzzle, Rules } from './types';

interface Version {
  maxStage: number;
  pool: readonly number[];
  rules: Rules;
  riffForPuzzle: (seed: number, index: number, pool: readonly number[]) => number;
  generate: (key: RoundKey, index: number, riff: Riff, only?: readonly ParamId[]) => Puzzle;
}

const VERSIONS: Record<string, Version> = {
  '1': { maxStage: v1.MAX_STAGE, pool: v1.POOL_ALL, rules: v1.RULES, riffForPuzzle: v1.riffForPuzzle, generate: v1.generate },
  A: { maxStage: v1.MAX_STAGE, pool: v1.POOL_PD, rules: v1.RULES, riffForPuzzle: v1.riffForPuzzle, generate: v1.generate },
};

/** The version new rounds are minted with in this build. */
export const MINT_VERSION = PD_ONLY ? 'A' : '1';

/** Rules for free play and lessons: the newest tables. */
export const LATEST_RULES: Rules = v1.RULES;
export const MAX_STAGE = v1.MAX_STAGE;

export type PuzzleResult =
  | { ok: true; puzzle: Puzzle; riff: Riff }
  | { ok: false; reason: 'version' | 'stage' }
  /** The key is fine but this copy of the app does not carry the riff. */
  | { ok: false; reason: 'riff'; riffId: number };

/** Why a well-formed key cannot be played here, or null if it can. */
export function keyProblem(key: RoundKey): string | null {
  const version = VERSIONS[key.version];
  if (!version) return `This key was made by a newer version of PatchMatch (version "${key.version}").`;
  if (key.stage > version.maxStage) return `Stage ${key.stage} is not built yet.`;
  return null;
}

/**
 * @param focus a practice puzzle: every difference comes from the module this
 *   stage introduced. Leave it out for a round, which a key must fully determine.
 */
export function generatePuzzle(key: RoundKey, index: number, focus?: number): PuzzleResult {
  const version = VERSIONS[key.version];
  if (!version) return { ok: false, reason: 'version' };
  if (key.stage < 1 || key.stage > version.maxStage) return { ok: false, reason: 'stage' };
  const riffId = version.riffForPuzzle(key.seed, index, version.pool);
  const riff = riffById(riffId);
  if (!riff) return { ok: false, reason: 'riff', riffId };
  const only = focus == null ? undefined : PARAM_IDS.filter((id) => PARAMS[id].stage === focus);
  return { ok: true, puzzle: version.generate(key, index, riff, only), riff };
}

export function generateRound(key: RoundKey): PuzzleResult[] {
  return Array.from({ length: PUZZLES_PER_ROUND }, (_, i) => generatePuzzle(key, i));
}

/** A fresh key. `random` is injected so the core stays free of platform calls. */
export function mintKey(stage: number, tier: Tier, random: () => number): RoundKey {
  return { version: MINT_VERSION, stage, tier, seed: Math.floor(random() * SEED_MAX) };
}
