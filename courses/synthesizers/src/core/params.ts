// The parameter table. One row per knob; the knob component, the generator,
// the scorer, the results screen and the engine all read it.
//
// Two representations of a setting:
//   Patch — a POSITION per parameter along that parameter's step table. In the
//           puzzle positions are whole numbers (detents); in free play they are
//           fractional and the value is interpolated between steps.
//   Sound — the physical value per parameter (Hz, seconds, octaves, ...), which
//           is what the engine plays.
// The step table belongs to a generator version (see gen/), because re-tuning a
// step changes what an old key produces.

export const PARAM_IDS = [
  'wave',
  'pw',
  'cutoff',
  'res',
  'envAmt',
  'attack',
  'decay',
  'sustain',
  'release',
  'lfoRate',
  'lfoDepth',
  'lfoDest',
  // Later stages are appended, never inserted: a patch is written out in this
  // order, and the generator draws its knobs in this order.
  'osc2Level',
  'osc2Detune',
  'osc2Interval',
  'fmAmount',
  'fmRatio',
  // The pedals, and the order they are plugged in.
  'drive',
  'driveTone',
  'echoTime',
  'echoRepeats',
  'echoMix',
  'chain',
  // The course's own knobs, beyond PatchMatch's nine stages (lessons 10 on).
  // The game's generator never draws them; at their defaults the synth sounds
  // exactly as it did before they existed.
  'noise',
  'filterMode',
  'lfoShape',
  'glide',
  'oscLevel',
  'env2Amt',
  'env2Fall',
] as const;

export type ParamId = (typeof PARAM_IDS)[number];
export type Patch = Record<ParamId, number>;
export type Sound = Record<ParamId, number>;
export type StepTable = Record<ParamId, readonly number[]>;

export type ModuleId = 'osc' | 'osc2' | 'fm' | 'mixer' | 'filter' | 'env' | 'env2' | 'lfo' | 'voice' | 'drive' | 'echo' | 'chain';
export type Category = 'tone' | 'brightness' | 'shape' | 'movement' | 'thickness' | 'metal' | 'grit' | 'space' | 'order';

export const WAVE = { saw: 0, pulse: 1, triangle: 2, sine: 3 } as const;
export const LFO_DEST = { pitch: 0, cutoff: 1, pw: 2, level: 3 } as const;
/** The filter's response. Position 0 is the 24 dB low-pass the synth always had. */
export const FILTER_MODE = { lp24: 0, lp12: 1, bp: 2, hp: 3 } as const;
/** The LFO's shape. Position 0 is the sine the synth always had; S&H is a new random level each cycle. */
export const LFO_SHAPE = { sine: 0, triangle: 1, saw: 2, square: 3, sh: 4 } as const;
/** The last stage PatchMatch's game has; knobs past it are the course's own. */
export const GAME_STAGES = 9;
/**
 * Where the drive pedal sits among the three things a note passes through
 * after the oscillators: the filter (with the envelope's level), the drive and
 * the echo. The filter always comes before the echo.
 */
export const CHAIN = { first: 0, middle: 1, last: 2 } as const;
export const CHAIN_NAMES = ['Drive → Filter → Echo', 'Filter → Drive → Echo', 'Filter → Echo → Drive'] as const;

export interface ParamSpec {
  id: ParamId;
  /** On the knob, where the module title says the rest. */
  label: string;
  /** Standing alone, as in the results: "LFO rate". Defaults to the label. */
  full?: string;
  module: ModuleId;
  category: Category;
  kind: 'knob' | 'selector';
  /** Selector labels, one per position. */
  options?: readonly string[];
  /** How free play interpolates between two steps. */
  interp: 'lin' | 'log';
  /** The course stage that unlocks it. */
  stage: number;
  format: (value: number) => string;
  /** Words for a signed error: "2 steps too {low}". */
  low: string;
  high: string;
}

const ms = (s: number) => (s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(1)} s`);
const hz = (f: number) => (f < 1000 ? `${Math.round(f)} Hz` : `${(f / 1000).toFixed(1)} kHz`);
const pct = (x: number) => `${Math.round(x * 100)} %`;

const ECHO_NAMES: Record<number, string> = { 1: '1/16', 2: '1/8', 3: '1/8 dotted', 4: '1/4' };
const RATE_NAMES: Record<number, string> = { 1: '1 bar', 2: '1/2', 4: '1/4', 8: '1/8', 16: '1/16' };
const INTERVAL_NAMES: Record<number, string> = { 0: 'Unison', [-1200]: 'Octave down', 700: 'Fifth up', 1200: 'Octave up' };

export const PARAMS: Record<ParamId, ParamSpec> = {
  wave: {
    id: 'wave',
    label: 'Wave',
    module: 'osc',
    category: 'tone',
    kind: 'selector',
    options: ['Saw', 'Pulse', 'Tri', 'Sine'],
    interp: 'lin',
    stage: 1,
    format: (v) => ['Saw', 'Pulse', 'Triangle', 'Sine'][Math.round(v)] ?? '?',
    low: 'wrong',
    high: 'wrong',
  },
  pw: {
    id: 'pw',
    label: 'Width',
    module: 'osc',
    category: 'tone',
    kind: 'knob',
    interp: 'lin',
    stage: 1,
    format: pct,
    // Positions run 50 % → 10 %, so a higher position is a thinner pulse.
    low: 'wide',
    high: 'narrow',
  },
  cutoff: {
    id: 'cutoff',
    label: 'Cutoff',
    module: 'filter',
    category: 'brightness',
    kind: 'knob',
    interp: 'log',
    stage: 2,
    format: hz,
    low: 'dark',
    high: 'bright',
  },
  res: {
    id: 'res',
    label: 'Reso',
    module: 'filter',
    category: 'brightness',
    kind: 'knob',
    interp: 'log',
    stage: 2,
    format: (q) => `Q ${q < 10 ? q.toFixed(1) : Math.round(q)}`,
    low: 'flat',
    high: 'peaky',
  },
  envAmt: {
    id: 'envAmt',
    label: 'Env amt',
    module: 'filter',
    category: 'brightness',
    kind: 'knob',
    interp: 'lin',
    stage: 3,
    format: (o) => `${o.toFixed(o % 1 ? 1 : 0)} oct`,
    low: 'little',
    high: 'much',
  },
  attack: {
    id: 'attack',
    label: 'Attack',
    module: 'env',
    category: 'shape',
    kind: 'knob',
    interp: 'log',
    stage: 3,
    format: ms,
    low: 'fast',
    high: 'slow',
  },
  decay: {
    id: 'decay',
    label: 'Decay',
    module: 'env',
    category: 'shape',
    kind: 'knob',
    interp: 'log',
    stage: 3,
    format: ms,
    low: 'short',
    high: 'long',
  },
  sustain: {
    id: 'sustain',
    label: 'Sustain',
    module: 'env',
    category: 'shape',
    kind: 'knob',
    interp: 'lin',
    stage: 3,
    format: pct,
    low: 'low',
    high: 'high',
  },
  release: {
    id: 'release',
    label: 'Release',
    module: 'env',
    category: 'shape',
    kind: 'knob',
    interp: 'log',
    stage: 3,
    format: ms,
    low: 'short',
    high: 'long',
  },
  lfoRate: {
    id: 'lfoRate',
    label: 'Rate',
    full: 'LFO rate',
    module: 'lfo',
    category: 'movement',
    kind: 'knob',
    interp: 'log',
    stage: 4,
    format: (r) => RATE_NAMES[r] ?? `${r.toFixed(1)}/bar`,
    low: 'slow',
    high: 'fast',
  },
  lfoDepth: {
    id: 'lfoDepth',
    label: 'Depth',
    full: 'LFO depth',
    module: 'lfo',
    category: 'movement',
    kind: 'knob',
    interp: 'lin',
    stage: 4,
    format: (d) => (d === 0 ? 'Off' : pct(d)),
    low: 'shallow',
    high: 'deep',
  },
  lfoDest: {
    id: 'lfoDest',
    label: 'Dest',
    full: 'LFO destination',
    module: 'lfo',
    category: 'movement',
    kind: 'selector',
    options: ['Pitch', 'Cutoff', 'Width', 'Level'],
    interp: 'lin',
    stage: 4,
    format: (v) => ['Pitch', 'Cutoff', 'Width', 'Level'][Math.round(v)] ?? '?',
    low: 'wrong',
    high: 'wrong',
  },
  osc2Level: {
    id: 'osc2Level',
    label: 'Level',
    full: 'Osc 2 level',
    module: 'osc2',
    category: 'thickness',
    kind: 'knob',
    interp: 'lin',
    stage: 5,
    format: (x) => (x === 0 ? 'Off' : pct(x)),
    low: 'quiet',
    high: 'loud',
  },
  osc2Detune: {
    id: 'osc2Detune',
    label: 'Detune',
    full: 'Osc 2 detune',
    module: 'osc2',
    category: 'thickness',
    kind: 'knob',
    interp: 'lin',
    stage: 5,
    format: (c) => `${Math.round(c)} ct`,
    low: 'little',
    high: 'much',
  },
  osc2Interval: {
    id: 'osc2Interval',
    label: 'Interval',
    full: 'Osc 2 interval',
    module: 'osc2',
    category: 'thickness',
    kind: 'selector',
    options: ['Unison', '−1 oct', '+5th', '+1 oct'],
    interp: 'lin',
    stage: 5,
    // The value is the interval in cents.
    format: (c) => INTERVAL_NAMES[Math.round(c)] ?? '?',
    low: 'wrong',
    high: 'wrong',
  },
  fmAmount: {
    id: 'fmAmount',
    label: 'Amount',
    full: 'FM amount',
    module: 'fm',
    category: 'metal',
    kind: 'knob',
    interp: 'lin',
    stage: 6,
    // The value is the modulation index.
    format: (x) => (x === 0 ? 'Off' : x.toFixed(x < 1 || x % 1 ? 1 : 0)),
    low: 'little',
    high: 'much',
  },
  fmRatio: {
    id: 'fmRatio',
    label: 'Ratio',
    full: 'FM ratio',
    module: 'fm',
    category: 'metal',
    kind: 'selector',
    options: ['×½', '×1', '×2', '×3', '×4'],
    interp: 'lin',
    stage: 6,
    format: (r) => (r === 0.5 ? '×½' : `×${Math.round(r)}`),
    low: 'wrong',
    high: 'wrong',
  },
  drive: {
    id: 'drive',
    label: 'Drive',
    module: 'drive',
    category: 'grit',
    kind: 'knob',
    interp: 'lin',
    stage: 7,
    // The value is the gain into the clipper, in decibels. Zero is the pedal switched off.
    format: (db) => (db === 0 ? 'Off' : `${Math.round(db)} dB`),
    low: 'clean',
    high: 'dirty',
  },
  driveTone: {
    id: 'driveTone',
    label: 'Tone',
    full: 'Drive tone',
    module: 'drive',
    category: 'grit',
    kind: 'knob',
    interp: 'log',
    stage: 7,
    format: hz,
    low: 'dark',
    high: 'bright',
  },
  echoTime: {
    id: 'echoTime',
    label: 'Time',
    full: 'Echo time',
    module: 'echo',
    category: 'space',
    kind: 'selector',
    options: ['1/16', '1/8', '1/8 ·', '1/4'],
    interp: 'lin',
    stage: 8,
    // The value is the gap between repeats, in sixteenth notes.
    format: (n) => ECHO_NAMES[Math.round(n)] ?? '?',
    low: 'wrong',
    high: 'wrong',
  },
  echoRepeats: {
    id: 'echoRepeats',
    label: 'Repeats',
    full: 'Echo repeats',
    module: 'echo',
    category: 'space',
    kind: 'knob',
    interp: 'lin',
    stage: 8,
    // The value is how much of each repeat is fed back round.
    format: (x) => (x === 0 ? 'One' : pct(x)),
    low: 'few',
    high: 'many',
  },
  echoMix: {
    id: 'echoMix',
    label: 'Mix',
    full: 'Echo mix',
    module: 'echo',
    category: 'space',
    kind: 'knob',
    interp: 'lin',
    stage: 8,
    format: (x) => (x === 0 ? 'Off' : pct(x)),
    low: 'quiet',
    high: 'loud',
  },
  chain: {
    id: 'chain',
    label: 'Drive is',
    full: 'Signal order',
    module: 'chain',
    category: 'order',
    kind: 'selector',
    options: ['First', 'Middle', 'Last'],
    interp: 'lin',
    stage: 9,
    format: (v) => CHAIN_NAMES[Math.round(v)] ?? '?',
    low: 'wrong',
    high: 'wrong',
  },
  noise: {
    id: 'noise',
    label: 'Noise',
    full: 'Noise level',
    module: 'mixer',
    category: 'tone',
    kind: 'knob',
    interp: 'lin',
    stage: 11,
    format: (x) => (x === 0 ? 'Off' : pct(x)),
    low: 'quiet',
    high: 'loud',
  },
  filterMode: {
    id: 'filterMode',
    label: 'Mode',
    full: 'Filter mode',
    module: 'filter',
    category: 'brightness',
    kind: 'selector',
    options: ['LP 24', 'LP 12', 'BP', 'HP'],
    interp: 'lin',
    stage: 11,
    format: (v) => ['Low-pass 24 dB', 'Low-pass 12 dB', 'Band-pass', 'High-pass'][Math.round(v)] ?? '?',
    low: 'wrong',
    high: 'wrong',
  },
  lfoShape: {
    id: 'lfoShape',
    label: 'Shape',
    full: 'LFO shape',
    module: 'lfo',
    category: 'movement',
    kind: 'selector',
    options: ['Sine', 'Tri', 'Saw', 'Square', 'S&H'],
    interp: 'lin',
    stage: 13,
    format: (v) => ['Sine', 'Triangle', 'Saw', 'Square', 'Sample and hold'][Math.round(v)] ?? '?',
    low: 'wrong',
    high: 'wrong',
  },
  glide: {
    id: 'glide',
    label: 'Glide',
    module: 'voice',
    category: 'shape',
    kind: 'knob',
    interp: 'log',
    stage: 17,
    // The value is the time to get most of the way to the new pitch.
    format: (s) => (s === 0 ? 'Off' : ms(s)),
    low: 'quick',
    high: 'slow',
  },
  oscLevel: {
    id: 'oscLevel',
    label: 'Osc',
    full: 'Oscillator level',
    module: 'mixer',
    category: 'tone',
    kind: 'knob',
    interp: 'lin',
    stage: 10,
    format: (x) => (x === 0 ? 'Off' : pct(x)),
    low: 'quiet',
    high: 'loud',
  },
  env2Amt: {
    id: 'env2Amt',
    label: 'Pitch',
    full: 'Envelope 2 to pitch',
    module: 'env2',
    category: 'shape',
    kind: 'knob',
    interp: 'lin',
    stage: 12,
    // The value is how far above the note each note starts, in semitones.
    format: (st) => (st === 0 ? 'Off' : `+${Math.round(st)} st`),
    low: 'little',
    high: 'much',
  },
  env2Fall: {
    id: 'env2Fall',
    label: 'Fall',
    full: 'Envelope 2 fall',
    module: 'env2',
    category: 'shape',
    kind: 'knob',
    interp: 'log',
    stage: 12,
    format: ms,
    low: 'quick',
    high: 'slow',
  },
};

/**
 * In signal order, the pedals last. `stage` is where the module joins the
 * panel: the four base modules are always shown (unlit until their stage), the
 * rest only once the player has reached them. A knob past the game's stages
 * (GAME_STAGES) is left off the panel until the panel's stage reaches it.
 */
export const MODULES: readonly { id: ModuleId; label: string; stage: number; params: readonly ParamId[] }[] = [
  { id: 'osc', label: 'Oscillator', stage: 1, params: ['wave', 'pw'] },
  { id: 'osc2', label: 'Osc 2', stage: 5, params: ['osc2Interval', 'osc2Level', 'osc2Detune'] },
  { id: 'fm', label: 'FM', stage: 6, params: ['fmRatio', 'fmAmount'] },
  { id: 'mixer', label: 'Mixer', stage: 10, params: ['oscLevel', 'noise'] },
  { id: 'filter', label: 'Filter', stage: 1, params: ['filterMode', 'cutoff', 'res', 'envAmt'] },
  { id: 'env', label: 'Envelope', stage: 1, params: ['attack', 'decay', 'sustain', 'release'] },
  { id: 'env2', label: 'Envelope 2', stage: 12, params: ['env2Amt', 'env2Fall'] },
  { id: 'lfo', label: 'LFO', stage: 1, params: ['lfoShape', 'lfoDest', 'lfoRate', 'lfoDepth'] },
  { id: 'voice', label: 'Voice', stage: 17, params: ['glide'] },
  { id: 'drive', label: 'Drive', stage: 7, params: ['drive', 'driveTone'] },
  { id: 'echo', label: 'Echo', stage: 8, params: ['echoTime', 'echoRepeats', 'echoMix'] },
  { id: 'chain', label: 'Chain', stage: 9, params: ['chain'] },
];

export const CATEGORIES: Record<Category, string> = {
  tone: 'tone colour',
  brightness: 'brightness',
  shape: 'onset and shape',
  movement: 'movement',
  thickness: 'thickness',
  metal: 'metallic edge',
  grit: 'grit',
  space: 'echo',
  order: 'signal order',
};

/** A parameter's name where no module title stands beside it. */
export function fullName(id: ParamId): string {
  return PARAMS[id].full ?? PARAMS[id].label;
}

/** The physical value at a (possibly fractional) position along a step table. */
export function valueAt(id: ParamId, steps: readonly number[], pos: number): number {
  const last = steps.length - 1;
  const p = Math.min(last, Math.max(0, pos));
  if (PARAMS[id].kind === 'selector') return steps[Math.round(p)];
  const i = Math.min(last - 1, Math.floor(p));
  const f = p - i;
  if (f === 0 || last === 0) return steps[Math.round(p)];
  const a = steps[i];
  const b = steps[i + 1];
  if (PARAMS[id].interp === 'log' && a > 0 && b > 0) return a * Math.pow(b / a, f);
  return a + (b - a) * f;
}

export function resolve(patch: Patch, steps: StepTable): Sound {
  const out = {} as Sound;
  for (const id of PARAM_IDS) out[id] = valueAt(id, steps[id], patch[id]);
  return out;
}

export function unlockedAt(stage: number): ParamId[] {
  return PARAM_IDS.filter((id) => PARAMS[id].stage <= stage);
}

export function patchesEqual(a: Patch, b: Patch): boolean {
  return PARAM_IDS.every((id) => a[id] === b[id]);
}

/** The stage of the last knob: a panel at this stage shows every knob there is (the Synth lab). */
export const LAST_STAGE = Math.max(...PARAM_IDS.map((id) => PARAMS[id].stage));
