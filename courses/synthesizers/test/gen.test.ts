import { describe, expect, it } from 'vitest';
import { driveWasted } from '../src/core/active';
import { generatePuzzle, generateRound, keyProblem, MAX_STAGE, mintKey, type Puzzle } from '../src/core/gen';
import { DEFAULTS, POOL_ALL, STEPS } from '../src/core/gen/v1';
import { PUZZLES_PER_ROUND, type RoundKey, type Tier } from '../src/core/key';
import { CHAIN, PARAM_IDS, PARAMS, resolve } from '../src/core/params';
import { stepsApart } from '../src/core/score';

const TIERS: Tier[] = ['E', 'N', 'H'];
const MAX_TURNS: Record<Tier, number> = { E: 5, N: 8, H: 10 };
const WANTED: Record<Tier, number[]> = {
  E: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3],
  N: [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
  H: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5],
};

/** `expect` costs microseconds; over a million checks that is the whole run. */
function must(ok: boolean, what: string, h: Puzzle): void {
  if (!ok) throw new Error(`${what}: ${JSON.stringify(h)}`);
}

function puzzleOf(key: RoundKey, index: number): Puzzle {
  const result = generatePuzzle(key, index);
  if (!result.ok) throw new Error(`puzzle ${index} of ${JSON.stringify(key)}: ${result.reason}`);
  return result.puzzle;
}

describe('generator v1, over ten thousand seeds', () => {
  // Every seed plays one stage and tier; all twelve puzzles are checked.
  const puzzles: Puzzle[] = [];
  for (let seed = 0; seed < 10_000; seed++) {
    const key: RoundKey = { version: '1', stage: 1 + (seed % MAX_STAGE), tier: TIERS[Math.floor(seed / MAX_STAGE) % 3], seed: seed * 104729 };
    for (let i = 0; i < PUZZLES_PER_ROUND; i++) puzzles.push(puzzleOf(key, i));
  }

  it('keeps every position in range and every locked knob at its default', () => {
    for (const h of puzzles) {
      for (const id of PARAM_IDS) {
        for (const patch of [h.target, h.start]) {
          const p = patch[id];
          must(Number.isInteger(p) && p >= 0 && p < STEPS[id].length, `${id} out of range`, h);
        }
        if (PARAMS[id].stage > h.key.stage) {
          must(h.target[id] === DEFAULTS[id] && h.start[id] === DEFAULTS[id], `${id} moved while locked`, h);
        }
      }
    }
  });

  it('differs on at least one knob, on no more than the tier asks, and only on knobs audible in the target', () => {
    let exact = 0;
    for (const h of puzzles) {
      const differing = PARAM_IDS.filter((id) => h.start[id] !== h.target[id]);
      must(differing.sort().join() === [...h.diffs].sort().join(), 'diffs do not match the patches', h);
      const wanted = WANTED[h.key.tier][h.index];
      must(differing.length >= 1 && differing.length <= wanted, 'wrong number of differences', h);
      if (differing.length === wanted) exact++;
      const heard = resolve(h.target, STEPS);
      must(differing.every((id) => h.rules.active(id, heard)), 'a difference cannot be heard in the target', h);
    }
    // Stage 1 has two knobs, so it cannot always reach the count; the rest should.
    const later = puzzles.filter((h) => h.key.stage >= 3);
    const laterExact = later.filter((h) => h.diffs.length === WANTED[h.key.tier][h.index]).length;
    expect(laterExact / later.length).toBeGreaterThan(0.95);
    expect(exact).toBeGreaterThan(0);
  });

  it('counts turns as the direct route and sets the goal at least one above it', () => {
    let long = 0;
    for (const h of puzzles) {
      const turns = h.diffs.reduce((sum, id) => sum + stepsApart(id, h.start[id], h.target[id]), 0);
      must(h.turns === turns, 'turns is not the direct route', h);
      must(h.goal >= turns + 1, 'goal leaves no slack', h);
      if (turns > MAX_TURNS[h.key.tier]) long++;
    }
    // The direct route is pulled inside the tier's limit wherever a nearer
    // start can still be heard; a few envelope puzzles cannot be.
    expect(long / puzzles.length).toBeLessThan(0.01);
  });

  it('never produces a vetoed target', () => {
    for (const h of puzzles) {
      const s = resolve(h.target, STEPS);
      must(!(s.cutoff <= 160 && s.envAmt === 0), 'closed filter with no envelope', h);
      must(!(s.sustain === 0 && s.decay <= 0.04), 'a click, not a note', h);
      if (s.lfoDepth > 0) {
        must(!(s.lfoDest === 1 && s.wave === 3 && s.fmAmount === 0) && !(s.lfoDest === 2 && s.wave !== 1), 'LFO aimed at nothing', h);
      }
      must(!driveWasted(s), 'a drive ahead of the filter with nothing to reshape', h);
    }
  });

  it('never asks for a difference between two settings that sound the same', () => {
    for (const h of puzzles) {
      const heard = resolve(h.target, STEPS);
      for (const id of h.diffs) must(!h.rules.alike(id, h.start[id], h.target[id], heard), `${id} differs in name only`, h);
    }
  });

  it('marks as gated exactly the differences the start patch cannot reveal', () => {
    let gated = 0;
    for (const h of puzzles) {
      const start = resolve(h.start, STEPS);
      for (const id of h.diffs) {
        must(h.gated.includes(id) === !h.rules.active(id, start), `${id} gating mislabelled`, h);
      }
      gated += h.gated.length;
    }
    expect(gated).toBeGreaterThan(0);
  });

  it('leans targets towards ordinary settings without excluding the extremes', () => {
    const stage4 = puzzles.filter((h) => h.key.stage === 4);
    const share = (pred: (h: Puzzle) => boolean) => stage4.filter(pred).length / stage4.length;
    // Middle four cutoffs: flat would be 0.5.
    expect(share((h) => h.target.cutoff >= 2 && h.target.cutoff <= 5)).toBeGreaterThan(0.7);
    expect(share((h) => h.target.cutoff === 7)).toBeGreaterThan(0.01);
    expect(share((h) => h.target.res <= 2)).toBeGreaterThan(0.75);
    expect(share((h) => h.target.res === 4)).toBeGreaterThan(0.02);
  });

  it('draws only pooled riffs and does not repeat one within a round', () => {
    for (let seed = 0; seed < 200; seed++) {
      const round = generateRound({ version: '1', stage: 2, tier: 'N', seed });
      const ids = round.map((r) => (r.ok ? r.puzzle.riffId : -1));
      expect(new Set(ids).size).toBe(PUZZLES_PER_ROUND);
      for (const id of ids) expect(POOL_ALL).toContain(id);
    }
  });
});

describe('keys and generation', () => {
  it('the same key gives the same round, and a puzzle on its own matches its place in the round', () => {
    const key: RoundKey = { version: '1', stage: 4, tier: 'H', seed: 424242 };
    const a = generateRound(key);
    const b = generateRound({ ...key });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(generatePuzzle(key, 6))).toBe(JSON.stringify(a[6]));
  });

  it('different seeds give different rounds', () => {
    const a = generateRound({ version: '1', stage: 4, tier: 'N', seed: 1 });
    const b = generateRound({ version: '1', stage: 4, tier: 'N', seed: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('a public-domain key draws public-domain riffs only', () => {
    for (const r of generateRound({ version: 'A', stage: 3, tier: 'E', seed: 99 })) {
      expect(r.ok && r.riff.pd).toBe(true);
    }
  });

  it('explains keys it cannot play', () => {
    expect(keyProblem({ version: '1', stage: 4, tier: 'N', seed: 0 })).toBeNull();
    expect(keyProblem({ version: 'Z', stage: 1, tier: 'N', seed: 0 })).toMatch(/newer version/);
    expect(keyProblem({ version: '1', stage: MAX_STAGE, tier: 'N', seed: 0 })).toBeNull();
    expect(keyProblem({ version: '1', stage: MAX_STAGE + 1, tier: 'N', seed: 0 })).toMatch(/not built/);
    expect(generatePuzzle({ version: 'Z', stage: 1, tier: 'N', seed: 0 }, 0)).toEqual({ ok: false, reason: 'version' });
  });

  it('a practice puzzle differs only on the knobs its stage introduced', () => {
    let seen = 0;
    for (let seed = 0; seed < 900; seed++) {
      const stage = 1 + (seed % MAX_STAGE);
      for (let i = 0; i < 4; i++) {
        const made = generatePuzzle({ version: '1', stage, tier: 'E', seed }, i, stage);
        if (!made.ok) throw new Error(made.reason);
        const { diffs } = made.puzzle;
        expect(diffs.length).toBeGreaterThanOrEqual(1);
        for (const id of diffs) expect(PARAMS[id].stage).toBe(stage);
        seen += diffs.length;
      }
    }
    expect(seen).toBeGreaterThan(3600);
  });

  it('the later stages put their own modules to use', () => {
    const count = (stage: number, pred: (h: Puzzle) => boolean) => {
      let n = 0;
      for (let seed = 0; seed < 300; seed++) {
        for (let i = 0; i < PUZZLES_PER_ROUND; i++) if (pred(puzzleOf({ version: '1', stage, tier: 'N', seed }, i))) n++;
      }
      return n / (300 * PUZZLES_PER_ROUND);
    };
    // Most stage 5 targets have the second oscillator sounding, and a fair share of puzzles turn on it.
    expect(count(5, (h) => h.target.osc2Level > 0)).toBeGreaterThan(0.7);
    expect(count(5, (h) => h.diffs.some((id) => PARAMS[id].stage === 5))).toBeGreaterThan(0.3);
    // Stage 6 leaves FM off in a good part of its targets, so "none" stays a live answer.
    const fmOn = count(6, (h) => h.target.fmAmount > 0);
    expect(fmOn).toBeGreaterThan(0.5);
    expect(fmOn).toBeLessThan(0.85);
    expect(count(6, (h) => h.diffs.some((id) => PARAMS[id].stage === 6))).toBeGreaterThan(0.2);
    // A sine is rare while only the filter can shape it, and ordinary again once FM can.
    expect(count(4, (h) => h.target.wave === 3)).toBeLessThan(0.12);
    expect(count(6, (h) => h.target.wave === 3)).toBeGreaterThan(0.2);
  });

  it('the pedal stages put the pedals to use, and leave them off often enough that off stays an answer', () => {
    const count = (stage: number, pred: (h: Puzzle) => boolean) => {
      let n = 0;
      for (let seed = 0; seed < 300; seed++) {
        for (let i = 0; i < PUZZLES_PER_ROUND; i++) if (pred(puzzleOf({ version: '1', stage, tier: 'N', seed }, i))) n++;
      }
      return n / (300 * PUZZLES_PER_ROUND);
    };
    const driveOn = count(7, (h) => h.target.drive > 0);
    expect(driveOn).toBeGreaterThan(0.6);
    expect(driveOn).toBeLessThan(0.9);
    expect(count(7, (h) => h.diffs.some((id) => PARAMS[id].stage === 7))).toBeGreaterThan(0.2);
    const echoOn = count(8, (h) => h.target.echoMix > 0);
    expect(echoOn).toBeGreaterThan(0.5);
    expect(echoOn).toBeLessThan(0.9);
    expect(count(8, (h) => h.diffs.some((id) => PARAMS[id].stage === 8))).toBeGreaterThan(0.2);
    // Until stage 9 the drive stays where a pedal usually sits.
    expect(count(8, (h) => h.target.chain !== CHAIN.middle || h.start.chain !== CHAIN.middle)).toBe(0);
    expect(count(9, (h) => h.target.chain !== CHAIN.middle)).toBeGreaterThan(0.4);
    expect(count(9, (h) => h.diffs.includes('chain'))).toBeGreaterThan(0.05);
  });

  it('leaving the focus out changes nothing for a keyed round', () => {
    const key: RoundKey = { version: '1', stage: 3, tier: 'N', seed: 777 };
    expect(JSON.stringify(generatePuzzle(key, 5))).toBe(JSON.stringify(generatePuzzle(key, 5, undefined)));
  });

  it('mints keys with a 30-bit seed', () => {
    const key = mintKey(2, 'E', () => 0.999999999);
    expect(key).toMatchObject({ version: '1', stage: 2, tier: 'E' });
    expect(key.seed).toBeLessThan(2 ** 30);
  });
});
