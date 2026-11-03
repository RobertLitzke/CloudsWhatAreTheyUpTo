// Golden keys: a fixed set of keys must keep producing exactly the recorded
// puzzles. This is the test that makes "old keys keep working" true rather than
// hoped for.
//
// While generator v1 is unfrozen (no key has been shared), re-record after an
// intended change with `npm run golden`. Once a key has left the machine, a
// failure here means the change belongs in a new generator version instead.

import { describe, expect, it } from 'vitest';
import { generateRound } from '../src/core/gen';
import { formatKey, parseKey } from '../src/core/key';

const KEYS = [
  '11E-000001',
  '11N-K7QX2M',
  '11H-ZZZZZZ',
  '12E-3M1T0N',
  '12N-PATCH0',
  '12H-0GGGGG',
  '13E-ABCDEF',
  '13N-9S8R7Q',
  '13H-1N2M3K',
  '14E-HEAR1T',
  '14N-K7QX2M',
  '14H-SYNTH5',
  '15E-TW0SC0',
  '15N-BEAT1N',
  '15H-DETVNE',
  '16E-BE11S0',
  '16N-FM0D0N',
  '16H-METAX6',
  'A1N-F0KS0N',
  'A4H-TRAD72',
  'A6N-F0KFM6',
  '17E-FVZZ00',
  '17N-DR1VE7',
  '17H-C1PPED',
  '18E-ECH0ES',
  '18N-REPEAT',
  '18H-TAPE08',
  '19E-CHA1NS',
  '19N-0RDER9',
  '19H-PEDA1S',
  'A9N-F0KPED',
];

describe('golden keys', () => {
  it('produce the recorded rounds', async () => {
    const out: Record<string, unknown[]> = {};
    for (const text of KEYS) {
      const parsed = parseKey(text);
      expect(parsed, text).not.toBeNull();
      expect(formatKey(parsed!.key)).toBe(text);
      out[text] = generateRound(parsed!.key).map((r) => {
        if (!r.ok) throw new Error(`${text}: ${r.reason}`);
        const { riffId, target, start, goal, turns } = r.puzzle;
        return { riffId, goal, turns, target: Object.values(target).join(''), start: Object.values(start).join('') };
      });
    }
    await expect(JSON.stringify(out, null, 1) + '\n').toMatchFileSnapshot('./golden-keys.json');
  });
});
