import { describe, expect, it } from 'vitest';
import { decodeSeed, encodeSeed, formatKey, parseKey, SEED_MAX, type RoundKey } from '../src/core/key';

describe('round keys', () => {
  const key: RoundKey = { version: '1', stage: 4, tier: 'N', seed: 0x2f3a9c41 & (SEED_MAX - 1) };

  it('round-trips through text', () => {
    const text = formatKey(key);
    expect(text).toMatch(/^14N-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(parseKey(text)).toEqual({ key });
  });

  it('round-trips every corner of the seed range', () => {
    for (const seed of [0, 1, 31, 32, SEED_MAX - 1, 123456789]) {
      expect(decodeSeed(encodeSeed(seed))).toBe(seed);
    }
  });

  it('names a single puzzle with a suffix', () => {
    expect(formatKey(key, 7)).toBe(`${formatKey(key)}/07`);
    expect(parseKey(formatKey(key, 7))).toEqual({ key, puzzle: 7 });
    expect(parseKey(`${formatKey(key)}/13`)).toBeNull();
    expect(parseKey(`${formatKey(key)}/0`)).toBeNull();
  });

  it('forgives case, a missing dash and the Crockford look-alikes', () => {
    expect(parseKey('14n-k7qx2m')).toEqual(parseKey('14N-K7QX2M'));
    expect(parseKey('14NK7QX2M')).toEqual(parseKey('14N-K7QX2M'));
    expect(parseKey('14N-OIL000')).toEqual(parseKey('14N-011000'));
  });

  it('rejects what is not a key', () => {
    for (const bad of ['', 'hello', '14X-K7QX2M', '10N-K7QX2M', '14N-K7QX2', '14N-K7QXUM', '14N-K7QX2M/']) {
      expect(parseKey(bad), bad).toBeNull();
    }
  });
});
