// Round keys: `14N-K7QX2M` is version 1, stage 4, normal tier, seed K7QX2M.
// `14N-K7QX2M/07` names puzzle 7 of that round. A key fully determines a round.

export type Tier = 'E' | 'N' | 'H';

export interface RoundKey {
  /** Names a frozen generator and riff pool (see gen/index.ts). */
  version: string;
  stage: number;
  tier: Tier;
  /** 30 bits. */
  seed: number;
}

export const TIER_NAMES: Record<Tier, string> = { E: 'Easy', N: 'Normal', H: 'Hard' };
export const PUZZLES_PER_ROUND = 12;

// Crockford base-32: no I, L, O or U, so a key survives being read aloud.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SEED_CHARS = 6;
export const SEED_MAX = 2 ** 30;

export function encodeSeed(seed: number): string {
  let out = '';
  let n = seed >>> 0;
  for (let i = 0; i < SEED_CHARS; i++) {
    out = ALPHABET[n & 31] + out;
    n >>>= 5;
  }
  return out;
}

export function decodeSeed(text: string): number | null {
  if (text.length !== SEED_CHARS) return null;
  let n = 0;
  for (const raw of text.toUpperCase()) {
    // Crockford's forgiving read: the look-alikes map to the digit they resemble.
    const ch = raw === 'O' ? '0' : raw === 'I' || raw === 'L' ? '1' : raw;
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    n = n * 32 + v;
  }
  return n;
}

export function formatKey(key: RoundKey, puzzle?: number): string {
  const base = `${key.version}${key.stage}${key.tier}-${encodeSeed(key.seed)}`;
  return puzzle == null ? base : `${base}/${String(puzzle).padStart(2, '0')}`;
}

/**
 * Parse a key as typed or pasted. Returns null if it is not shaped like a key;
 * whether its version and stage exist is the generator's question, not this
 * function's.
 */
export function parseKey(text: string): { key: RoundKey; puzzle?: number } | null {
  const m = /^\s*([0-9A-Za-z])([1-9])([ENHenh])-?([0-9A-Za-z]{6})(?:\/(\d{1,2}))?\s*$/.exec(text);
  if (!m) return null;
  const seed = decodeSeed(m[4]);
  if (seed == null) return null;
  const key: RoundKey = {
    version: m[1].toUpperCase(),
    stage: Number(m[2]),
    tier: m[3].toUpperCase() as Tier,
    seed,
  };
  if (m[5] == null) return { key };
  const puzzle = Number(m[5]);
  if (puzzle < 1 || puzzle > PUZZLES_PER_ROUND) return null;
  return { key, puzzle };
}

export function sameKey(a: RoundKey, b: RoundKey): boolean {
  return a.version === b.version && a.stage === b.stage && a.tier === b.tier && a.seed === b.seed;
}
