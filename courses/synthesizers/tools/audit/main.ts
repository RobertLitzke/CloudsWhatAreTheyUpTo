// Audibility audit (dev only): how different does each step of each knob make
// the sound?
//
// A puzzle is only fair if every step it can ask for is audible. This page
// renders each knob at every pair of neighbouring positions, on three riffs,
// through the same Voice the game plays, and measures how far apart the two
// renders are. A small number means a step that a player may not be able to
// hear, and a candidate for a wider step table.
//
// The measure: both renders are cut into 46 ms frames and each frame into
// third-octave bands; the figure is the average difference in band level, in
// decibels, over every band and frame where either render is above the floor.
// That average is small for a change that is large but narrow (a resonant
// peak moves one or two bands and leaves twenty alone), so beside it goes the
// difference in the single band that changed most. It is small in the same way
// for a change that is large but brief (a release tail lives in the short gaps
// between notes), so the third figure is the average over the tenth of the
// frames that differ most.
//
// About 1 dB is the smallest level change an ear notices. A step is marked
// suspect when the average is under 1 dB, no band moves by 3 and no moment
// differs by 3. It is a
// stand-in for listening, not a replacement: it cannot tell a difference that
// is obvious from one that is merely large.

import '../../src/game/styles/app.css';
import { el } from '../../src/game/dom';
import { riffLoop } from '../../src/audio/engine';
import { renderLoop, RENDER_RATE } from '../../src/audio/offline';
import { LATEST_RULES } from '../../src/core/gen';
import { fullName, PARAM_IDS, PARAMS, resolve, type ParamId, type Patch } from '../../src/core/params';
import { riffById } from '../../src/core/riffs';

const { steps: STEPS, defaults: DEFAULTS, active } = LATEST_RULES;

/** Long notes, middling notes, and a jig of short ones. All public domain. */
const RIFF_IDS = [58, 69, 64];

/** Settings of the other knobs under which each knob is worth measuring. */
const CONTEXTS: Record<ParamId, { name: string; set: Partial<Patch> }[]> = {
  wave: [{ name: 'open filter', set: {} }, { name: 'cutoff 900 Hz', set: { cutoff: 3 } }],
  pw: [{ name: 'pulse', set: { wave: 1 } }],
  cutoff: [{ name: 'saw', set: {} }, { name: 'saw, Q 4', set: { res: 2 } }, { name: 'triangle', set: { wave: 2 } }],
  res: [{ name: 'cutoff 900 Hz', set: { cutoff: 3 } }, { name: 'cutoff 2.8 kHz', set: { cutoff: 5 } }],
  envAmt: [{ name: 'cutoff 500 Hz, sustain 25 %', set: { cutoff: 2, sustain: 1 } }, { name: 'cutoff 1.6 kHz, sustain 50 %', set: { cutoff: 4, sustain: 2 } }],
  attack: [{ name: 'organ', set: {} }, { name: 'sustain 50 %', set: { sustain: 2 } }],
  decay: [
    { name: 'sustain 0 %', set: { sustain: 0 } },
    { name: 'sustain 25 %', set: { sustain: 1 } },
    { name: 'sustain 50 %', set: { sustain: 2 } },
    { name: 'sustain 75 %', set: { sustain: 3 } },
    { name: 'sustain 50 %, env 2 oct at 900 Hz', set: { sustain: 2, envAmt: 2, cutoff: 3 } },
    { name: 'sustain 75 %, env 2 oct at 900 Hz', set: { sustain: 3, envAmt: 2, cutoff: 3 } },
    { name: 'sustain 75 %, env 1 oct at 900 Hz', set: { sustain: 3, envAmt: 1, cutoff: 3 } },
  ],
  sustain: [{ name: 'decay 300 ms', set: { decay: 2 } }, { name: 'decay 120 ms', set: { decay: 1 } }],
  release: [{ name: 'organ', set: {} }, { name: 'sustain 50 %', set: { sustain: 2 } }, { name: 'pluck, sustain 0 %, decay 700 ms', set: { sustain: 0, decay: 3 } }],
  lfoRate: [{ name: 'to cutoff, depth 35 %', set: { lfoDest: 1, lfoDepth: 2, cutoff: 3 } }, { name: 'to pitch, depth 35 %', set: { lfoDest: 0, lfoDepth: 2 } }],
  lfoDepth: [
    { name: 'to pitch', set: { lfoDest: 0 } },
    { name: 'to cutoff', set: { lfoDest: 1, cutoff: 3 } },
    { name: 'to width', set: { lfoDest: 2, wave: 1 } },
    { name: 'to level', set: { lfoDest: 3 } },
  ],
  lfoDest: [{ name: 'pulse, depth 35 %', set: { wave: 1, cutoff: 3, lfoDepth: 2 } }],
  osc2Level: [{ name: 'detune 10 ct', set: { osc2Detune: 2 } }, { name: 'fifth up', set: { osc2Detune: 0, osc2Interval: 2 } }],
  osc2Detune: [{ name: 'level 55 %', set: { osc2Level: 3 } }, { name: 'level 30 %', set: { osc2Level: 2 } }, { name: 'level 15 %', set: { osc2Level: 1 } }],
  osc2Interval: [{ name: 'level 55 %, in tune', set: { osc2Level: 3, osc2Detune: 0 } }, { name: 'level 15 %', set: { osc2Level: 1 } }],
  fmAmount: [{ name: 'sine, ×2', set: { wave: 3 } }, { name: 'triangle, ×2', set: { wave: 2 } }, { name: 'saw, ×2', set: { wave: 0 } }],
  fmRatio: [{ name: 'sine, amount 1', set: { wave: 3, fmAmount: 2 } }, { name: 'sine, amount 0.5', set: { wave: 3, fmAmount: 1 } }],
  drive: [
    { name: 'saw, open', set: {} },
    { name: 'saw, cutoff 900 Hz', set: { cutoff: 3 } },
    { name: 'sine', set: { wave: 3 } },
    { name: 'pulse, cutoff 900 Hz', set: { wave: 1, cutoff: 3 } },
    { name: 'saw pluck, cutoff 900 Hz', set: { cutoff: 3, sustain: 0, decay: 2 } },
    { name: 'first, saw, cutoff 900 Hz', set: { chain: 0, cutoff: 3 } },
    { name: 'first, saw, open', set: { chain: 0 } },
    { name: 'first, triangle', set: { chain: 0, wave: 2 } },
  ],
  driveTone: [
    { name: 'saw, drive 16 dB', set: { drive: 2 } },
    { name: 'saw at 900 Hz, drive 16 dB', set: { drive: 2, cutoff: 3 } },
    { name: 'saw at 900 Hz, drive 8 dB', set: { drive: 1, cutoff: 3 } },
    { name: 'saw at 285 Hz, drive 8 dB', set: { drive: 1, cutoff: 1 } },
    { name: 'first, saw at 900 Hz, drive 16 dB', set: { chain: 0, drive: 2, cutoff: 3 } },
    { name: 'first, saw at 2.8 kHz, drive 16 dB', set: { chain: 0, drive: 2, cutoff: 5 } },
    { name: 'first, saw, open, drive 16 dB', set: { chain: 0, drive: 2 } },
  ],
  echoTime: [
    { name: 'mix 35 %', set: { echoMix: 2 } },
    { name: 'mix 15 %', set: { echoMix: 1 } },
    { name: 'mix 35 %, pluck', set: { echoMix: 2, sustain: 0, decay: 2 } },
    { name: 'mix 15 %, pluck', set: { echoMix: 1, sustain: 0, decay: 2 } },
  ],
  echoRepeats: [
    { name: 'mix 35 %, 1/8', set: { echoMix: 2 } },
    { name: 'mix 80 %, 1/8', set: { echoMix: 3 } },
    { name: 'mix 35 %, 1/4', set: { echoMix: 2, echoTime: 3 } },
    { name: 'mix 35 %, 1/8, sustain 50 %', set: { echoMix: 2, sustain: 2, decay: 2 } },
    { name: 'mix 35 %, 1/8, sustain 25 %', set: { echoMix: 2, sustain: 1, decay: 2 } },
    { name: 'mix 35 %, 1/8, pluck', set: { echoMix: 2, sustain: 0, decay: 2 } },
    { name: 'mix 35 %, 1/4, pluck', set: { echoMix: 2, echoTime: 3, sustain: 0, decay: 2 } },
    { name: 'mix 35 %, 1/16, pluck', set: { echoMix: 2, echoTime: 0, sustain: 0, decay: 2 } },
    { name: 'mix 15 %, 1/8, pluck', set: { echoMix: 1, sustain: 0, decay: 2 } },
    { name: 'mix 35 %, 1/8, long pluck', set: { echoMix: 2, sustain: 0, decay: 3 } },
  ],
  echoMix: [
    { name: '1/8', set: {} },
    { name: '1/16', set: { echoTime: 0 } },
    { name: '1/8, sustain 50 %', set: { sustain: 2, decay: 2 } },
    { name: '1/8, pluck', set: { sustain: 0, decay: 2 } },
  ],
  chain: [
    { name: 'saw at 900 Hz, drive 16 dB', set: { drive: 2, cutoff: 3 } },
    { name: 'saw at 900 Hz, drive 8 dB', set: { drive: 1, cutoff: 3 } },
    { name: 'saw at 2.8 kHz, drive 16 dB', set: { drive: 2, cutoff: 5 } },
    { name: 'saw, open, drive 16 dB', set: { drive: 2 } },
    { name: 'saw pluck, open, drive 16 dB', set: { drive: 2, sustain: 0, decay: 2 } },
    { name: 'sine, drive 16 dB', set: { drive: 2, wave: 3 } },
    { name: 'saw at 900 Hz, drive 16 dB, echo 35 %', set: { drive: 2, cutoff: 3, echoMix: 2 } },
    { name: 'saw at 900 Hz, drive 8 dB, echo 35 %', set: { drive: 1, cutoff: 3, echoMix: 2 } },
    { name: 'saw at 900 Hz, drive 16 dB, echo 20 %', set: { drive: 2, cutoff: 3, echoMix: 1 } },
    { name: 'saw pluck at 900 Hz, drive 16 dB, echo 35 %', set: { drive: 2, cutoff: 3, echoMix: 2, sustain: 0, decay: 2 } },
  ],
  noise: [{ name: 'saw', set: {} }, { name: 'sine', set: { wave: 3 } }],
  filterMode: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }, { name: 'saw at 900 Hz, Q 4', set: { cutoff: 3, res: 2 } }],
  lfoShape: [{ name: 'cutoff, depth 35 %', set: { lfoDest: 1, lfoDepth: 2, cutoff: 3 } }],
  glide: [{ name: 'saw', set: {} }],
  legato: [{ name: 'saw, glide 80 ms', set: { glide: 2 } }],
  voiceMode: [{ name: 'saw', set: {} }],
  chord: [{ name: 'saw', set: {} }],
  spread: [{ name: 'saw, unison', set: { voiceMode: 2 } }],
  arpMode: [{ name: 'saw', set: {} }],
  arpRate: [{ name: 'saw, arp up', set: { arpMode: 1 } }],
  arpOct: [{ name: 'saw, arp up', set: { arpMode: 1 } }],
  arpHold: [{ name: 'saw, arp up', set: { arpMode: 1 } }],
  oscLevel: [{ name: 'saw', set: {} }],
  env2Amt: [{ name: 'sine pluck', set: { wave: 3, sustain: 0, decay: 2 } }],
  env2Rise: [{ name: 'saw, to cutoff, +24 st', set: { env2Amt: 3, env2Dest: 1, cutoff: 3 } }],
  env2Mode: [{ name: 'saw, to cutoff, +24 st', set: { env2Amt: 3, env2Dest: 1, cutoff: 3, env2Rise: 2, env2Fall: 2 } }],
  env2Dest: [{ name: 'saw, +24 st', set: { env2Amt: 3, cutoff: 3 } }],
  env2Fall: [{ name: 'sine pluck, +24 st', set: { wave: 3, sustain: 0, decay: 2, env2Amt: 3 } }],
  mxEnvPitch: [{ name: 'saw pluck at 900 Hz', set: { cutoff: 3, sustain: 0, decay: 2 } }],
  mxEnvCutoff: [{ name: 'saw pluck at 900 Hz', set: { cutoff: 3, sustain: 0, decay: 2 } }],
  mxEnvLevel: [{ name: 'saw pluck at 900 Hz', set: { cutoff: 3, sustain: 0, decay: 2 } }],
  mxEnvLfo: [{ name: 'saw pluck at 900 Hz', set: { cutoff: 3, sustain: 0, decay: 2 } }],
  mxEnv2Pitch: [{ name: 'saw at 900 Hz, envelope 2 falling 200 ms', set: { cutoff: 3, env2Fall: 3 } }],
  mxEnv2Cutoff: [{ name: 'saw at 900 Hz, envelope 2 falling 200 ms', set: { cutoff: 3, env2Fall: 3 } }],
  mxEnv2Level: [{ name: 'saw at 900 Hz, envelope 2 falling 200 ms', set: { cutoff: 3, env2Fall: 3 } }],
  mxEnv2Lfo: [{ name: 'saw at 900 Hz, envelope 2 falling 200 ms', set: { cutoff: 3, env2Fall: 3 } }],
  mxLfoPitch: [{ name: 'saw at 900 Hz, LFO 4 a bar', set: { cutoff: 3, lfoRate: 2 } }],
  mxLfoCutoff: [{ name: 'saw at 900 Hz, LFO 4 a bar', set: { cutoff: 3, lfoRate: 2 } }],
  mxLfoLevel: [{ name: 'saw at 900 Hz, LFO 4 a bar', set: { cutoff: 3, lfoRate: 2 } }],
  mxKeyPitch: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxKeyCutoff: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxKeyLevel: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxKeyLfo: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxVelPitch: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxVelCutoff: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxVelLevel: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxVelLfo: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxPressPitch: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxPressCutoff: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxPressLevel: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
  mxPressLfo: [{ name: 'saw at 900 Hz', set: { cutoff: 3 } }],
};

// --- the measure ------------------------------------------------------------------

const FRAME = 2048;
const HOP = 1024;
const FLOOR_DB = -60;

/** In-place radix-2 FFT. */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}

const WINDOW = Float32Array.from({ length: FRAME }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME));
/** Third-octave band edges from 45 Hz to 16 kHz, as FFT bin numbers. */
const BANDS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let f = 45; f < 16000; f *= Math.pow(2, 1 / 3)) {
    const lo = Math.max(1, Math.round((f * FRAME) / RENDER_RATE));
    const hi = Math.max(lo + 1, Math.round((f * Math.pow(2, 1 / 3) * FRAME) / RENDER_RATE));
    out.push([lo, hi]);
  }
  return out;
})();

/** Band levels in dB, frame by frame, flattened. */
function bandLevels(x: Float32Array): Float32Array {
  const frames = Math.max(0, Math.floor((x.length - FRAME) / HOP) + 1);
  const out = new Float32Array(frames * BANDS.length);
  const re = new Float32Array(FRAME);
  const im = new Float32Array(FRAME);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < FRAME; i++) {
      re[i] = x[f * HOP + i] * WINDOW[i];
      im[i] = 0;
    }
    fft(re, im);
    BANDS.forEach(([lo, hi], b) => {
      let power = 0;
      for (let k = lo; k < hi; k++) power += re[k] * re[k] + im[k] * im[k];
      // Scaled so a full-scale sine reads about 0 dB.
      out[f * BANDS.length + b] = 10 * Math.log10(power / ((FRAME * FRAME) / 16) + 1e-12);
    });
  }
  return out;
}

/**
 * Band-level difference in dB where either sound is above the floor: the
 * average over everything, the average within the band that differs most, and
 * the average over the tenth of the frames that differ most.
 */
function distance(a: Float32Array, b: Float32Array): { mean: number; peak: number; moment: number } {
  const sums = new Float64Array(BANDS.length);
  const counts = new Float64Array(BANDS.length);
  const frames: number[] = [];
  let frameSum = 0;
  let frameCount = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] >= FLOOR_DB || b[i] >= FLOOR_DB) {
      const d = Math.abs(Math.max(a[i], FLOOR_DB) - Math.max(b[i], FLOOR_DB));
      sums[i % BANDS.length] += d;
      counts[i % BANDS.length]++;
      frameSum += d;
      frameCount++;
    }
    if (i % BANDS.length === BANDS.length - 1) {
      // A frame with only a band or two above the floor is the very end of a tail.
      if (frameCount >= 3) frames.push(frameSum / frameCount);
      frameSum = 0;
      frameCount = 0;
    }
  }
  frames.sort((x, y) => y - x);
  const top = frames.slice(0, Math.max(1, Math.round(frames.length / 10)));
  const moment = top.length === 0 ? 0 : top.reduce((x, y) => x + y, 0) / top.length;
  let sum = 0;
  let n = 0;
  let peak = 0;
  let most = 0;
  for (let band = 0; band < BANDS.length; band++) {
    sum += sums[band];
    n += counts[band];
    most = Math.max(most, counts[band]);
  }
  // A band that is hardly ever above the floor does not get to be the peak.
  for (let band = 0; band < BANDS.length; band++) {
    if (counts[band] >= most / 4) peak = Math.max(peak, sums[band] / counts[band]);
  }
  return { mean: n === 0 ? 0 : sum / n, peak, moment };
}

// --- the run -------------------------------------------------------------------------

export interface AuditRow {
  id: ParamId;
  context: string;
  /** Positions compared. */
  from: number;
  to: number;
  label: string;
  /** One figure per riff, in the order of RIFF_IDS: the average difference. */
  db: number[];
  /** The same, for the band that differs most. */
  peak: number[];
  /** The same, for the tenth of the loop that differs most. */
  moment: number[];
  /** The knob is dark in this context at one end of the step, so the step would not be asked for. */
  dark: boolean;
}

const cache = new Map<string, Promise<Float32Array>>();
function levelsOf(patch: Patch, riffId: number): Promise<Float32Array> {
  const key = `${riffId}:${PARAM_IDS.map((id) => patch[id]).join(',')}`;
  let made = cache.get(key);
  if (!made) {
    made = renderLoop(resolve(patch, STEPS), riffLoop(riffById(riffId)!), 1).then(bandLevels);
    cache.set(key, made);
  }
  return made;
}

/** Any two patches, each given as changes from the defaults, on each riff. */
export async function compare(a: Partial<Patch>, b: Partial<Patch>): Promise<{ mean: number; peak: number; moment: number }[]> {
  const out = [];
  for (const riffId of RIFF_IDS) {
    out.push(distance(await levelsOf({ ...DEFAULTS, ...a }, riffId), await levelsOf({ ...DEFAULTS, ...b }, riffId)));
  }
  return out;
}

export async function runAudit(only?: readonly ParamId[], onProgress?: (done: number, total: number) => void): Promise<AuditRow[]> {
  const jobs: { id: ParamId; context: string; base: Patch; from: number; to: number }[] = [];
  for (const id of only ?? PARAM_IDS) {
    for (const ctx of CONTEXTS[id]) {
      const base = { ...DEFAULTS, ...ctx.set };
      const last = STEPS[id].length - 1;
      if (PARAMS[id].kind === 'selector') {
        for (let a = 0; a <= last; a++) for (let b = a + 1; b <= last; b++) jobs.push({ id, context: ctx.name, base, from: a, to: b });
      } else {
        for (let a = 0; a < last; a++) jobs.push({ id, context: ctx.name, base, from: a, to: a + 1 });
      }
    }
  }
  const rows: AuditRow[] = [];
  for (const [n, job] of jobs.entries()) {
    const a = { ...job.base, [job.id]: job.from };
    const b = { ...job.base, [job.id]: job.to };
    const db: number[] = [];
    const peak: number[] = [];
    const moment: number[] = [];
    for (const riffId of RIFF_IDS) {
      const d = distance(await levelsOf(a, riffId), await levelsOf(b, riffId));
      db.push(d.mean);
      peak.push(d.peak);
      moment.push(d.moment);
    }
    const fmt = (pos: number) => PARAMS[job.id].format(STEPS[job.id][pos]);
    rows.push({
      id: job.id,
      context: job.context,
      from: job.from,
      to: job.to,
      label: `${fmt(job.from)} → ${fmt(job.to)}`,
      db,
      peak,
      moment,
      dark: !active(job.id, resolve(a, STEPS)) || !active(job.id, resolve(b, STEPS)),
    });
    onProgress?.(n + 1, jobs.length);
  }
  return rows;
}

// --- the page --------------------------------------------------------------------------

const SUSPECT = 1;
const SUBTLE = 2;
const NARROW = 3;

/** Too small to trust: little change overall, no one band that moves much, and no moment that does. */
export function suspect(r: AuditRow): boolean {
  return r.db.some((db, i) => db < SUSPECT && r.peak[i] < NARROW && r.moment[i] < NARROW);
}

function render(rows: AuditRow[]): HTMLElement {
  const cell = (db: number) => el(`td.num${db < SUSPECT ? '.over' : db < SUBTLE ? '' : '.under'}`, {}, db.toFixed(1));
  return el(
    'table.list',
    {},
    el(
      'thead',
      {},
      el('tr', {}, el('th', {}, 'Knob'), el('th', {}, 'With'), el('th', {}, 'Step'), ...RIFF_IDS.map((id) => el('th.num', {}, riffById(id)?.title ?? String(id))), el('th.num', {}, 'Least'), el('th.num', {}, 'One band'), el('th.num', {}, 'One moment')),
    ),
    el(
      'tbody',
      {},
      rows.map((r) => {
        const least = Math.min(...r.db);
        return el(
          'tr',
          {},
          el('td', {}, fullName(r.id)),
          el('td.muted', {}, r.context),
          el('td.num', {}, r.label, r.dark ? el('span.muted', {}, ' (dark)') : null),
          ...r.db.map(cell),
          cell(least),
          el(`td.num${suspect(r) && !r.dark ? '.over' : ''}`, {}, Math.min(...r.peak).toFixed(1)),
          el(`td.num${suspect(r) && !r.dark ? '.over' : ''}`, {}, Math.min(...r.moment).toFixed(1)),
        );
      }),
    ),
  );
}

const out = el('div');
const status = el('p.note', { role: 'status' }, 'Not run yet. A full run renders about 500 loops and takes a minute or so.');
const run = async () => {
  status.textContent = 'Rendering…';
  const rows = await runAudit(undefined, (done, total) => {
    status.textContent = `Rendering… ${done} of ${total} steps`;
  });
  const worst = rows.filter((r) => !r.dark && suspect(r)).length;
  status.textContent = `${rows.length} steps measured. ${worst} may be too small to hear on at least one riff: under ${SUSPECT} dB on average, with no band and no moment differing by ${NARROW} dB.`;
  out.replaceChildren(render(rows));
};

document.getElementById('app')!.replaceChildren(
  el(
    'div.page',
    {},
    el('h1', {}, 'Audibility audit'),
    el(
      'p.muted',
      {},
      'How far apart two neighbouring positions of each knob sound, as an average difference in third-octave band level (dB) across the loop. Orange is under 1 dB, green is 2 dB or more. "One band" is the difference in the band that changes most, which is what counts for a narrow change such as resonance. "One moment" is the difference over the tenth of the loop that changes most, which is what counts for a brief one such as a release tail. Both turn orange when the step is small on all three counts. A step marked dark would never be asked for in that setting.',
    ),
    el('div.row', {}, el('button.btn.btn-primary', { type: 'button', onclick: () => void run() }, 'Run the audit')),
    status,
    out,
  ),
);

// For reading the numbers from a console or a script.
Object.assign(window, { runAudit, compare });
