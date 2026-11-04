// Generator version 1: step tables, target bias, goal weights, riff pool.
//
// NOT YET FROZEN. Until a key leaves this machine, anything here may change
// (run `npm run golden` afterwards to re-record test/golden-keys.json). Once a
// key has been shared, this file is frozen for good: every change to what a key
// produces goes into a new v2.ts and a new version character, and this one
// stays in the bundle so old keys keep working. At that point also snapshot
// each pooled riff's `longest`, `gap` and `six` into a table here, because the
// audibility rules below read them and a corrected riff would otherwise shift
// an old key's patch.

import { driveWasted, isActive, lfoDestEffective, soundsAlike } from '../active';
import { CHAIN, WAVE } from '../params';
import { PUZZLES_PER_ROUND, type RoundKey, type Tier } from '../key';
import {
  PARAMS,
  resolve,
  unlockedAt,
  type ParamId,
  type Patch,
  type Sound,
  type StepTable,
} from '../params';
import type { Riff } from '../riffs';
import { Rng, hash2 } from '../rng';
import type { Puzzle, Rules } from './types';

const PITCH_ROUTE = [-12, -7, -2, -1, -0.3, 0, 0.3, 1, 2, 7, 12];
const CUTOFF_ROUTE = [-4, -2, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 2, 4];
const SHARE_ROUTE = [-1, -0.5, -0.25, 0, 0.25, 0.5, 1];
/** The middle of a route's steps: no route. */
const OFF = (steps: readonly number[]) => steps.indexOf(0);

export const STEPS: StepTable = {
  wave: [0, 1, 2, 3], // saw, pulse, triangle, sine
  pw: [0.5, 0.4, 0.3, 0.2, 0.1],
  cutoff: [160, 285, 500, 900, 1600, 2800, 5000, 9000], // about 5/6 octave a step
  res: [0.7, 2, 4, 8, 14], // Q
  envAmt: [0, 1, 2, 3, 4], // octaves
  attack: [0.002, 0.02, 0.08, 0.25, 0.7],
  decay: [0.04, 0.12, 0.3, 0.7, 1.5],
  sustain: [0, 0.25, 0.5, 0.75, 1],
  release: [0.02, 0.08, 0.25, 0.6, 1.5],
  lfoRate: [1, 2, 4, 8, 16], // cycles per bar
  lfoDepth: [0, 0.15, 0.35, 0.65, 1],
  lfoDest: [0, 1, 2, 3], // pitch, cutoff, pulse width, level
  osc2Level: [0, 0.15, 0.3, 0.55, 1], // about 5 dB a step; even steps of level are too close at the top
  osc2Detune: [0, 5, 10, 20, 40], // cents
  osc2Interval: [0, -1200, 700, 1200], // cents: unison, octave down, fifth up, octave up
  fmAmount: [0, 0.5, 1, 2, 4], // modulation index
  fmRatio: [0.5, 1, 2, 3, 4], // modulator frequency over the note's
  drive: [0, 8, 16, 24, 32], // decibels of gain into the clipper; 0 is the pedal switched off
  driveTone: [700, 1400, 2800, 5600, 11000], // Hz: an octave a step
  echoTime: [1, 2, 3, 4], // sixteenths between repeats
  echoRepeats: [0, 0.35, 0.6, 0.8], // how much of each repeat goes round again
  echoMix: [0, 0.15, 0.35, 0.8], // level of the first repeat against the note: about 7 dB a step
  chain: [0, 1, 2], // the drive first, in the middle, or last
  // The course's knobs. No stage this version generates unlocks them, so they
  // stay at their defaults in every puzzle and are no part of what a key means.
  noise: [0, 0.15, 0.3, 0.55, 1],
  filterMode: [0, 1, 2, 3], // low-pass 24 dB, low-pass 12 dB, band-pass, high-pass
  lfoShape: [0, 1, 2, 3, 4], // sine, triangle, saw, square, sample and hold
  glide: [0, 0.03, 0.08, 0.2, 0.5], // seconds
  oscLevel: [0, 0.25, 0.5, 0.75, 1],
  env2Amt: [0, 7, 12, 24, 36], // semitones above the note that each note starts at
  env2Fall: [0.01, 0.03, 0.08, 0.2, 0.5], // seconds: the time constant of the fall back to the note
  env2Rise: [0, 0.03, 0.1, 0.3, 1], // seconds
  env2Mode: [0, 1, 2], // once a note, looping, running free
  env2Dest: [0, 1], // pitch, cutoff
  legato: [0, 1], // retrigger every note; legato for overlapping notes
  voiceMode: [0, 1, 2], // mono, paraphonic, unison
  chord: [0, 1, 2, 3, 4, 5], // off, octave, fifth, minor, major, sus4 (CHORDS)
  spread: [0, 8, 15, 30, 60], // cents either side, in unison
  arpMode: [0, 1, 2, 3, 4], // off, up, down, order, random
  arpRate: [4, 2, 1, 0.5], // sixteenths per step
  arpOct: [1, 2, 3, 4],
  arpHold: [0, 1],
  // The matrix: each cell's middle position is no route. Pitch in semitones,
  // cutoff in octaves; level and LFO amount as how much of it the source
  // takes over (see the voice).
  mxEnvPitch: PITCH_ROUTE,
  mxEnvCutoff: CUTOFF_ROUTE,
  mxEnvLevel: SHARE_ROUTE,
  mxEnvLfo: SHARE_ROUTE,
  mxEnv2Pitch: PITCH_ROUTE,
  mxEnv2Cutoff: CUTOFF_ROUTE,
  mxEnv2Level: SHARE_ROUTE,
  mxEnv2Lfo: SHARE_ROUTE,
  mxLfoPitch: PITCH_ROUTE,
  mxLfoCutoff: CUTOFF_ROUTE,
  mxLfoLevel: SHARE_ROUTE,
  mxKeyPitch: PITCH_ROUTE,
  mxKeyCutoff: CUTOFF_ROUTE,
  mxKeyLevel: SHARE_ROUTE,
  mxKeyLfo: SHARE_ROUTE,
  mxVelPitch: PITCH_ROUTE,
  mxVelCutoff: CUTOFF_ROUTE,
  mxVelLevel: SHARE_ROUTE,
  mxVelLfo: SHARE_ROUTE,
  mxPressPitch: PITCH_ROUTE,
  mxPressCutoff: CUTOFF_ROUTE,
  mxPressLevel: SHARE_ROUTE,
  mxPressLfo: SHARE_ROUTE,
};

/** An open, organ-like saw: what a locked module sits at. */
export const DEFAULTS: Patch = {
  wave: 0,
  pw: 0,
  cutoff: 7,
  res: 0,
  envAmt: 0,
  attack: 0,
  decay: 2,
  sustain: 4,
  release: 1,
  lfoRate: 2,
  lfoDepth: 0,
  lfoDest: 0,
  // Both extensions sit silent, with the other two knobs of each somewhere
  // that makes a sound as soon as the level or amount comes up.
  osc2Level: 0,
  osc2Detune: 2,
  osc2Interval: 0,
  fmAmount: 0,
  fmRatio: 2,
  // Both pedals are switched off, and the drive sits where a pedal usually
  // does: after the synth and ahead of the echo.
  drive: 0,
  driveTone: 3,
  echoTime: 1,
  echoRepeats: 1,
  echoMix: 0,
  chain: 1,
  noise: 0,
  filterMode: 0,
  lfoShape: 0,
  glide: 0,
  oscLevel: 4,
  env2Amt: 0,
  env2Fall: 2,
  env2Rise: 0,
  env2Mode: 0,
  env2Dest: 0,
  legato: 0,
  voiceMode: 0,
  chord: 0,
  spread: 2,
  arpMode: 0,
  arpRate: 2,
  arpOct: 0,
  arpHold: 0,
  mxEnvPitch: OFF(PITCH_ROUTE),
  mxEnvCutoff: OFF(CUTOFF_ROUTE),
  mxEnvLevel: OFF(SHARE_ROUTE),
  mxEnvLfo: OFF(SHARE_ROUTE),
  mxEnv2Pitch: OFF(PITCH_ROUTE),
  mxEnv2Cutoff: OFF(CUTOFF_ROUTE),
  mxEnv2Level: OFF(SHARE_ROUTE),
  mxEnv2Lfo: OFF(SHARE_ROUTE),
  mxLfoPitch: OFF(PITCH_ROUTE),
  mxLfoCutoff: OFF(CUTOFF_ROUTE),
  mxLfoLevel: OFF(SHARE_ROUTE),
  mxKeyPitch: OFF(PITCH_ROUTE),
  mxKeyCutoff: OFF(CUTOFF_ROUTE),
  mxKeyLevel: OFF(SHARE_ROUTE),
  mxKeyLfo: OFF(SHARE_ROUTE),
  mxVelPitch: OFF(PITCH_ROUTE),
  mxVelCutoff: OFF(CUTOFF_ROUTE),
  mxVelLevel: OFF(SHARE_ROUTE),
  mxVelLfo: OFF(SHARE_ROUTE),
  mxPressPitch: OFF(PITCH_ROUTE),
  mxPressCutoff: OFF(CUTOFF_ROUTE),
  mxPressLevel: OFF(SHARE_ROUTE),
  mxPressLfo: OFF(SHARE_ROUTE),
};

export const RULES: Rules = { steps: STEPS, defaults: DEFAULTS, active: isActive, alike: soundsAlike };

/** Stages this version can generate. */
export const MAX_STAGE = 9;

/**
 * The riffs a version-1 key draws from, by id. Written out rather than derived
 * so that a build without the copyrighted riffs still knows which riff a key
 * meant, and can say it is missing instead of substituting another.
 * A test checks this against the riff list: every riff graded 2 or better.
 */
export const POOL_ALL: readonly number[] = [
  2, 3, 6, 9, 13, 14, 18, 19, 20, 23, 25, 26, 28, 32, 33, 35, 36, 39, 40, 43, 44, 45, 48, 57, 58,
  60, 61, 62, 63, 64, 65, 66, 69, 70, 71, 72,
];
export const POOL_PD: readonly number[] = [57, 58, 60, 61, 62, 63, 64, 65, 66, 69, 70, 71, 72];

// --- difficulty ---------------------------------------------------------------

const KNOBS_BY_PUZZLE: Record<Tier, readonly number[]> = {
  E: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3],
  N: [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
  H: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5],
};

/** The most moves the direct route may need, so no puzzle turns into a slog. */
const MAX_TURNS: Record<Tier, number> = { E: 5, N: 8, H: 10 };

/** How likely each size of difference is, indexed by steps apart. */
const DELTA_WEIGHT: Record<Tier, readonly number[]> = {
  E: [0, 0, 3, 2],
  N: [0, 2, 3, 1],
  H: [0, 4, 1, 0],
};

// --- target bias --------------------------------------------------------------

/** Positions each knob favours. Two draws in three come from these. */
const FAVOURED: Partial<Record<ParamId, readonly number[]>> = {
  pw: [0, 1, 2], // 50 to 30 %
  cutoff: [2, 3, 4, 5], // the middle four
  res: [0, 1, 2],
  envAmt: [0, 1, 2],
  attack: [0, 1, 2],
  sustain: [1, 2, 3],
  release: [0, 1, 2],
  lfoDepth: [0, 1, 2],
  osc2Level: [1, 2, 3],
  osc2Detune: [0, 1, 2, 3],
  fmAmount: [0, 1, 2],
  // Off is a live answer for both pedals, as it is for FM.
  drive: [0, 1, 2, 3],
  driveTone: [2, 3, 4],
  echoRepeats: [0, 1, 2],
  echoMix: [0, 1, 2],
};
/**
 * From stage 2 a sine is rarer: it has nothing for the filter to work on. FM
 * gives it harmonics again, so stage 6 draws the four waves evenly.
 */
const FAVOURED_WAVE_WITH_FILTER: readonly number[] = [0, 1, 2];

function drawPosition(rng: Rng, id: ParamId, stage: number): number {
  const favoured = id === 'wave' ? (stage >= 2 && stage < 6 ? FAVOURED_WAVE_WITH_FILTER : undefined) : FAVOURED[id];
  // Always two draws, so the stream stays aligned whether or not a knob is biased.
  const useFavoured = rng.next() < 2 / 3;
  const r = rng.next();
  if (favoured && useFavoured) return favoured[Math.floor(r * favoured.length)];
  return Math.floor(r * STEPS[id].length);
}

/** Combinations that are unusable rather than merely odd. */
function vetoed(s: Sound, riff: Riff): boolean {
  if (s.cutoff <= STEPS.cutoff[0] && s.envAmt === 0) return true;
  if (s.sustain === 0 && s.decay <= STEPS.decay[0]) return true;
  if (s.attack >= 0.25 && s.attack > 1.5 * riff.longest) return true;
  if (s.lfoDepth > 0 && !lfoDestEffective(s)) return true;
  // A drive ahead of the filter with nothing it can reshape.
  if (driveWasted(s)) return true;
  return false;
}

function drawTarget(rng: Rng, unlocked: readonly ParamId[], stage: number, riff: Riff): Patch {
  let patch = { ...DEFAULTS };
  for (let attempt = 0; attempt < 64; attempt++) {
    patch = { ...DEFAULTS };
    for (const id of unlocked) patch[id] = drawPosition(rng, id, stage);
    if (!vetoed(resolve(patch, STEPS), riff)) break;
  }
  return patch;
}

// --- differences ----------------------------------------------------------------

/**
 * Can this step change be heard, in this target, on this riff? Envelope times
 * only show when a note or a silence is long enough to reveal them. The other
 * rules come from the audit page (audit.html on the dev server), which measures
 * how far apart two renders are: each one rules out a step that read as under
 * a decibel of difference.
 */
function audible(id: ParamId, a: number, b: number, target: Sound, riff: Riff): boolean {
  const v = STEPS[id];
  switch (id) {
    case 'attack':
      return Math.min(v[a], v[b]) <= riff.longest;
    case 'decay':
      return Math.min(v[a], v[b]) <= 2.5 * riff.longest;
    case 'sustain':
      return target.attack + 0.5 * target.decay <= riff.longest;
    case 'release':
      return Math.min(v[a], v[b]) <= 3 * riff.gap;
    case 'cutoff':
      // A triangle has almost nothing up at the top for the filter to take away.
      return !(target.wave === WAVE.triangle && target.fmAmount === 0) || Math.min(v[a], v[b]) <= 2800;
    case 'fmAmount':
      // A saw or a pulse is already full of harmonics, and the first touch of FM is lost among them.
      return target.wave === WAVE.triangle || target.wave === WAVE.sine || Math.max(v[a], v[b]) >= 1;
    case 'osc2Level':
      // In unison the level is only how deep the beating goes: one step of that is not enough.
      return target.osc2Interval !== 0 || Math.abs(a - b) >= 2;
    case 'osc2Detune':
      // A faint second oscillator barely beats at all.
      return target.osc2Level >= 0.3;
    case 'osc2Interval': {
      // An octave up lands on harmonics the first oscillator already has.
      const quietOctave = Math.min(v[a], v[b]) === 0 && Math.max(v[a], v[b]) === 1200;
      return target.osc2Level >= 0.3 || !quietOctave;
    }
    case 'drive':
      // Ahead of the filter a saw or a pulse is most of the way to clipped already, and the first touch of drive barely reshapes it.
      return target.chain !== CHAIN.first || target.wave === WAVE.triangle || target.wave === WAVE.sine || Math.max(v[a], v[b]) >= 16;
    case 'driveTone': {
      const low = Math.min(v[a], v[b]);
      // Ahead of the filter, the tone can only take away what the filter would have let through.
      if (target.chain === CHAIN.first) return low < target.cutoff;
      // After it, the clipper puts back a few octaves above whatever reached it, and more of them the harder it is driven.
      // A sine or a triangle arrives with next to nothing above its first few harmonics, whatever the filter is doing.
      const dull = target.fmAmount === 0 && (target.wave === WAVE.sine || target.wave === WAVE.triangle);
      const reaching = dull ? Math.min(target.cutoff, 600) : target.cutoff;
      return low < reaching * (target.drive >= 24 ? 8 : target.drive >= 16 ? 4 : 2);
    }
    case 'echoTime':
      // A faint echo under held notes is there, but when it lands is hard to say.
      return target.echoMix >= 0.35 || target.sustain === 0;
    case 'echoMix':
      // The faintest echo, a sixteenth behind a held note, hides in the note.
      return target.echoTime > 1 || target.sustain === 0 || Math.max(v[a], v[b]) >= 0.35;
    case 'echoRepeats': {
      // The repeats of a repeat are heard in the silence a note leaves. Where
      // the notes leave none, only a big change in how thick the wash is shows.
      const exposed = target.sustain === 0 && riff.longest >= target.attack + target.decay + 2 * target.echoTime * riff.six;
      return exposed || (target.echoMix >= 0.35 && Math.abs(a - b) >= 2);
    }
    case 'chain': {
      // Just behind the filter or right at the end: with no echo between the two, they are the same place.
      if (a !== CHAIN.first && b !== CHAIN.first) return target.echoMix > 0;
      // A bare sine held at full level gives the filter nothing to do and the clipper nothing to follow.
      return !(target.wave === WAVE.sine && target.fmAmount === 0 && target.sustain === 1);
    }
    default:
      return true;
  }
}

/** Pairs a player mistakes for one another. */
const CONFUSABLE: readonly (readonly [ParamId, ParamId])[] = [
  ['cutoff', 'envAmt'],
  ['decay', 'sustain'],
  // More of either is "more chorus".
  ['osc2Level', 'osc2Detune'],
  // Both add brightness.
  ['cutoff', 'fmAmount'],
  // Both take the top off.
  ['cutoff', 'driveTone'],
  // Both add an edge.
  ['fmAmount', 'drive'],
  // More of either is "more echo".
  ['echoMix', 'echoRepeats'],
];

/** [gate, gated, the gate position that silences the gated knob]. */
const GATES: readonly (readonly [ParamId, ParamId, 'first' | 'last' | 'any'])[] = [
  ['wave', 'pw', 'any'],
  ['sustain', 'decay', 'last'],
  ['lfoDepth', 'lfoRate', 'first'],
  ['lfoDepth', 'lfoDest', 'first'],
  ['osc2Level', 'osc2Detune', 'first'],
  ['osc2Level', 'osc2Interval', 'first'],
  ['fmAmount', 'fmRatio', 'first'],
  ['drive', 'driveTone', 'first'],
  ['drive', 'chain', 'first'],
  ['echoMix', 'echoTime', 'first'],
  ['echoMix', 'echoRepeats', 'first'],
];

function related(a: ParamId, b: ParamId): boolean {
  return (
    CONFUSABLE.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) ||
    GATES.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  );
}

function chooseDiffs(
  rng: Rng,
  options: readonly ParamId[],
  wanted: number,
  tier: Tier,
): ParamId[] {
  const chosen: ParamId[] = [];
  const remaining = options.slice();
  while (chosen.length < wanted && remaining.length > 0) {
    const weights = remaining.map((id) => {
      let w = 1;
      const tangled = chosen.some((c) => related(c, id));
      if (tier === 'E') {
        // Spread across modules, and keep clear of pairs that hide each other.
        if (!chosen.some((c) => PARAMS[c].module === PARAMS[id].module)) w *= 4;
        if (tangled) w *= 0.2;
      } else if (tier === 'H') {
        if (tangled) w *= 4;
      }
      return w;
    });
    const i = rng.weighted(weights);
    chosen.push(remaining[i]);
    remaining.splice(i, 1);
  }
  return chosen;
}

function stepsApart(id: ParamId, a: number, b: number): number {
  if (a === b) return 0;
  return PARAMS[id].kind === 'selector' ? 1 : Math.abs(a - b);
}

// --- goal --------------------------------------------------------------------------

/** Moves a competent ear is expected to waste on each knob, in hundredths. */
const GOAL_WEIGHT: Record<ParamId, number> = {
  wave: 10,
  cutoff: 20,
  attack: 30,
  lfoRate: 30,
  lfoDepth: 30,
  pw: 40,
  res: 40,
  lfoDest: 40,
  decay: 60,
  sustain: 60,
  envAmt: 70,
  release: 70,
  osc2Interval: 20,
  fmRatio: 30,
  fmAmount: 30,
  osc2Level: 50,
  osc2Detune: 50,
  drive: 30,
  echoMix: 30,
  echoTime: 40,
  driveTone: 50,
  echoRepeats: 50,
  chain: 60,
  // Never drawn by this version.
  noise: 0,
  filterMode: 0,
  lfoShape: 0,
  glide: 0,
  oscLevel: 0,
  env2Amt: 0,
  env2Fall: 0,
  env2Rise: 0,
  env2Mode: 0,
  env2Dest: 0,
  legato: 0,
  voiceMode: 0,
  chord: 0,
  spread: 0,
  arpMode: 0,
  arpRate: 0,
  arpOct: 0,
  arpHold: 0,
  mxEnvPitch: 0,
  mxEnvCutoff: 0,
  mxEnvLevel: 0,
  mxEnvLfo: 0,
  mxEnv2Pitch: 0,
  mxEnv2Cutoff: 0,
  mxEnv2Level: 0,
  mxEnv2Lfo: 0,
  mxLfoPitch: 0,
  mxLfoCutoff: 0,
  mxLfoLevel: 0,
  mxKeyPitch: 0,
  mxKeyCutoff: 0,
  mxKeyLevel: 0,
  mxKeyLfo: 0,
  mxVelPitch: 0,
  mxVelCutoff: 0,
  mxVelLevel: 0,
  mxVelLfo: 0,
  mxPressPitch: 0,
  mxPressCutoff: 0,
  mxPressLevel: 0,
  mxPressLfo: 0,
};
const GOAL_SUBTLE = 30; // a difference of a single step
const GOAL_CONFUSABLE = 75; // both halves of a confusable pair differ
const GOAL_GATED = 100; // cannot be heard until another knob is fixed

function goalFor(turns: number, target: Patch, start: Patch, diffs: ParamId[], gated: ParamId[]): number {
  // Whole hundredths throughout: 0.1 + 0.2 + 0.7 must not round up to 2.
  let allowance = 0;
  for (const id of diffs) {
    allowance += GOAL_WEIGHT[id];
    if (PARAMS[id].kind === 'knob' && Math.abs(target[id] - start[id]) === 1) allowance += GOAL_SUBTLE;
  }
  for (const [a, b] of CONFUSABLE) {
    if (diffs.includes(a) && diffs.includes(b)) allowance += GOAL_CONFUSABLE;
  }
  allowance += GOAL_GATED * gated.length;
  return turns + Math.ceil(allowance / 100);
}

// --- the generator ------------------------------------------------------------------

/** Which riff a puzzle plays. A round never repeats one while the pool lasts. */
export function riffForPuzzle(seed: number, index: number, pool: readonly number[]): number {
  const order = new Rng(hash2(seed, 0x5eed)).shuffle(pool);
  return order[index % order.length];
}

/**
 * @param only practice puzzles pass the knobs of one module here, and every
 *   difference is then drawn from those. A keyed round never passes it.
 */
export function generate(key: RoundKey, index: number, riff: Riff, only?: readonly ParamId[]): Puzzle {
  if (index < 0 || index >= PUZZLES_PER_ROUND) throw new Error(`no puzzle ${index + 1}`);
  const rng = new Rng(hash2(key.seed, index));
  const unlocked = unlockedAt(key.stage);
  let target: Patch = DEFAULTS;
  const feasible = new Map<ParamId, number[]>();
  // One pass for a keyed round: the wave can always differ. A practice puzzle
  // may need another target before its module has something to hear (a sine
  // gives the filter nothing to do).
  for (let attempt = 0; attempt < 32 && feasible.size === 0; attempt++) {
    target = drawTarget(rng, unlocked, key.stage, riff);
    const targetSound = resolve(target, STEPS);
    // A knob can differ only if it can be heard in the target, on this riff.
    for (const id of only ?? unlocked) {
      if (!isActive(id, targetSound)) continue;
      const positions: number[] = [];
      for (let q = 0; q < STEPS[id].length; q++) {
        if (q !== target[id] && audible(id, target[id], q, targetSound, riff)) positions.push(q);
      }
      if (positions.length > 0) feasible.set(id, positions);
    }
  }

  const chosen = chooseDiffs(rng, [...feasible.keys()], KNOBS_BY_PUZZLE[key.tier][index], key.tier);
  const start = { ...target };
  for (const id of chosen) {
    const positions = feasible.get(id)!;
    if (PARAMS[id].kind === 'selector') {
      start[id] = rng.pick(positions);
      continue;
    }
    let weights = positions.map((q) => DELTA_WEIGHT[key.tier][Math.abs(q - target[id])] ?? 0);
    if (weights.every((w) => w === 0)) weights = positions.map((q) => 1 / Math.abs(q - target[id]));
    // Where one chosen knob can silence another, the hard tier leans into it
    // and the easy tier steers away.
    for (const [gate, gatedId, where] of GATES) {
      if (gate !== id || where === 'any' || !chosen.includes(gatedId)) continue;
      const at = positions.indexOf(where === 'first' ? 0 : STEPS[id].length - 1);
      if (at < 0) continue;
      if (key.tier === 'H') weights[at] = weights.reduce((a, b) => a + b, 0) + 1;
      else if (key.tier === 'E' && weights.some((w, i) => i !== at && w > 0)) weights[at] = 0;
    }
    start[id] = positions[rng.weighted(weights)];
  }

  // Pull the largest differences in until the direct route fits the tier.
  const turnsOf = () => chosen.reduce((sum, id) => sum + stepsApart(id, start[id], target[id]), 0);
  while (turnsOf() > MAX_TURNS[key.tier]) {
    let widest: ParamId | null = null;
    for (const id of chosen) {
      if (PARAMS[id].kind !== 'knob') continue;
      const gap = Math.abs(start[id] - target[id]);
      const closer = start[id] + Math.sign(target[id] - start[id]);
      if (gap < 2 || !feasible.get(id)!.includes(closer)) continue;
      if (widest == null || gap > Math.abs(start[widest] - target[widest])) widest = id;
    }
    if (widest == null) break;
    start[widest] += Math.sign(target[widest] - start[widest]);
  }

  const startSound = resolve(start, STEPS);
  const diffs = chosen.filter((id) => start[id] !== target[id]);
  const gated = diffs.filter((id) => !isActive(id, startSound));
  const turns = turnsOf();
  return {
    key,
    index,
    riffId: riff.id,
    target,
    start,
    goal: goalFor(turns, target, start, diffs, gated),
    turns,
    diffs,
    gated,
    unlocked,
    rules: RULES,
  };
}
